from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend.database.db import get_db
from backend.database.models import Shelter
from backend.schemas import ShelterResponse, ShelterEvacuateRequest
from backend.services.shelter_service import allocate_shelter_capacity
from backend.services.audit_service import log_event
from backend.socket_server.server import broadcast_event

router = APIRouter()

@router.get("/", response_model=List[ShelterResponse])
def get_shelters(db: Session = Depends(get_db)):
    """
    Module 5: Returns all shelters with live vacancy, food/water stock days, and accessibility status.
    """
    return db.query(Shelter).all()

@router.post("/evacuate")
async def evacuate_to_shelter(
    payload: ShelterEvacuateRequest,
    db: Session = Depends(get_db)
):
    try:
        shelter = allocate_shelter_capacity(
            db=db,
            shelter_id=payload.shelter_id,
            evacuee_count=payload.evacuee_count,
            incident_id=payload.incident_id,
            triggered_by="Coordinator"
        )
        await broadcast_event("shelter_updated", {
            "shelter_id": shelter.id,
            "occupancy": shelter.occupancy,
            "vacancy": shelter.vacancy
        })
        return {
            "message": f"Admitted {payload.evacuee_count} evacuees to {shelter.name}.",
            "shelter_id": shelter.id,
            "occupancy": shelter.occupancy,
            "vacancy": shelter.vacancy
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{id}/toggle-accessibility")
async def toggle_shelter_accessibility(id: int, db: Session = Depends(get_db)):
    shelter = db.query(Shelter).filter(Shelter.id == id).first()
    if not shelter:
        raise HTTPException(status_code=404, detail="Shelter not found")

    shelter.is_accessible = not shelter.is_accessible
    db.commit()

    log_event(
        db=db,
        entity_type="Shelter",
        entity_id=shelter.id,
        action="AccessibilityToggled",
        reason=f"Shelter '{shelter.name}' accessibility updated to: {shelter.is_accessible}",
        triggered_by="InfrastructureMonitor"
    )

    await broadcast_event("shelter_updated", {
        "shelter_id": shelter.id,
        "is_accessible": shelter.is_accessible
    })

    return {"shelter_id": shelter.id, "is_accessible": shelter.is_accessible}
