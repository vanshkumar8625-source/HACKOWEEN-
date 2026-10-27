from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend.database.db import get_db
from backend.database.models import Resource
from backend.schemas import ResourceCreate, ResourceAllocationRequest, ResourceResponse
from backend.services.resource_service import (
    allocate_resource, reserve_resource, release_reservation, InsufficientResourceError
)
from backend.socket_server.server import broadcast_event

router = APIRouter()

@router.get("/", response_model=List[ResourceResponse])
def get_resources(db: Session = Depends(get_db)):
    """
    Module 3: View shared resource inventory, allocated, reserved, and available quantities.
    """
    return db.query(Resource).all()

@router.post("/allocate")
async def allocate_supplies(
    payload: ResourceAllocationRequest,
    db: Session = Depends(get_db)
):
    """
    Module 3: Deterministically allocates resources to an incident or depot.
    """
    try:
        res = allocate_resource(
            db=db,
            resource_id=payload.resource_id,
            qty=payload.qty,
            incident_id=payload.incident_id,
            reason=payload.reason or "Command center allocation"
        )
        await broadcast_event("resource_updated", {
            "resource_id": res.id,
            "name": res.name,
            "available_qty": res.available_qty,
            "allocated_qty": res.allocated_qty
        })
        return {
            "message": f"Successfully allocated {payload.qty} {res.unit} of {res.name}.",
            "resource_id": res.id,
            "available_qty": res.available_qty
        }
    except InsufficientResourceError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/reserve")
async def reserve_supplies(
    payload: ResourceAllocationRequest,
    db: Session = Depends(get_db)
):
    try:
        res = reserve_resource(
            db=db,
            resource_id=payload.resource_id,
            qty=payload.qty,
            incident_id=payload.incident_id,
            reason=payload.reason or "Mission staging reservation"
        )
        return {
            "message": f"Reserved {payload.qty} {res.unit} of {res.name}.",
            "resource_id": res.id,
            "reserved_qty": res.reserved_qty,
            "available_qty": res.available_qty
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
