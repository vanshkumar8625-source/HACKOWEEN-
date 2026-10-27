import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.database.db import get_db
from backend.database.models import BackupRequest, Incident, RescueTeam, Resource
from backend.schemas import (
    BackupRequestCreate, BackupRequestAssign, BackupRequestResponse, BackupRequestStatusUpdate
)
from backend.services.audit_service import log_event
from backend.services.notification_service import create_notification
from backend.socket_server.server import broadcast_event

router = APIRouter()

@router.post("/", response_model=BackupRequestResponse)
async def create_backup_request(
    payload: BackupRequestCreate,
    db: Session = Depends(get_db)
):
    """
    Requirement 4: Primary rescue team requests backup assistance / handover from field.
    Notifies control room and logs immutable audit trail.
    """
    inc = db.query(Incident).filter(Incident.id == payload.incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    req_team = db.query(RescueTeam).filter(RescueTeam.id == payload.requesting_team_id).first()
    if not req_team:
        raise HTTPException(status_code=404, detail="Requesting RescueTeam not found")

    backup_req = BackupRequest(
        incident_id=payload.incident_id,
        requesting_team_id=payload.requesting_team_id,
        location_name=payload.location_name,
        latitude=payload.latitude,
        longitude=payload.longitude,
        reason=payload.reason,
        assistance_type=payload.assistance_type,
        required_resources_json=json.dumps(payload.required_resources),
        personnel_needed=payload.personnel_needed,
        urgency=payload.urgency,
        notes=payload.notes,
        photo_url=payload.photo_url,
        status="Pending",
        handover_type=payload.handover_type or "Partial"
    )
    db.add(backup_req)
    inc.backup_requested = True
    db.commit()
    db.refresh(backup_req)

    log_event(
        db=db,
        entity_type="Backup",
        entity_id=backup_req.id,
        action="BackupRequested",
        reason=f"Team {req_team.name} requested backup for Incident #{inc.id}. Urgency: {payload.urgency}. Type: {payload.assistance_type}. Reason: {payload.reason}",
        details={"incident_id": inc.id, "urgency": payload.urgency, "resources": payload.required_resources},
        triggered_by=req_team.name
    )

    await create_notification(
        db=db,
        title=f"🆘 Backup Requested: {req_team.name}",
        message=f"Need {payload.assistance_type} at {payload.location_name} ({payload.urgency} Urgency). Reason: {payload.reason[:80]}",
        category="BackupRequest",
        severity="Critical" if payload.urgency in ["High", "Critical"] else "Warning",
        incident_id=inc.id,
        team_id=req_team.id
    )

    await broadcast_event("backup_requested", {
        "id": backup_req.id,
        "incident_id": inc.id,
        "requesting_team_id": req_team.id,
        "requesting_team_name": req_team.name,
        "urgency": backup_req.urgency,
        "assistance_type": backup_req.assistance_type,
        "location_name": backup_req.location_name
    })

    return backup_req

@router.get("/", response_model=List[BackupRequestResponse])
def list_backup_requests(
    status: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    query = db.query(BackupRequest)
    if status:
        query = query.filter(BackupRequest.status == status)
    return query.order_by(BackupRequest.created_at.desc()).limit(limit).all()

@router.get("/{id}", response_model=BackupRequestResponse)
def get_backup_request(id: int, db: Session = Depends(get_db)):
    req = db.query(BackupRequest).filter(BackupRequest.id == id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Backup request not found")
    return req

@router.post("/{id}/assign")
async def assign_backup_support(
    id: int,
    payload: BackupRequestAssign,
    db: Session = Depends(get_db)
):
    """
    Requirement 4: Coordinator assigns suitable backup team and allocates confirmed resources.
    Supports partial assistance or complete handover while preserving a single master incident record.
    """
    req = db.query(BackupRequest).filter(BackupRequest.id == id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Backup request not found")

    inc = db.query(Incident).filter(Incident.id == req.incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Parent Incident not found")

    backup_team = None
    if payload.assigned_backup_team_id:
        backup_team = db.query(RescueTeam).filter(RescueTeam.id == payload.assigned_backup_team_id).first()
        if not backup_team:
            raise HTTPException(status_code=404, detail="Assigned backup team not found")
        if backup_team.is_restricted:
            raise HTTPException(status_code=400, detail=f"Team {backup_team.name} is under restriction ({backup_team.restriction_reason}).")

    req.assigned_backup_team_id = payload.assigned_backup_team_id
    req.handover_type = payload.handover_type or req.handover_type
    req.eta_minutes = payload.eta_minutes or 15.0
    req.status = "Assigned"

    if backup_team:
        backup_team.status = "Dispatched"
        if req.handover_type == "Complete":
            # Transfer main command to backup team
            prev_primary = inc.assigned_team_id
            inc.assigned_team_id = backup_team.id
            inc.backup_team_id = prev_primary
        else:
            # Joint assistance
            inc.backup_team_id = backup_team.id

    db.commit()
    db.refresh(req)

    log_event(
        db=db,
        entity_type="Backup",
        entity_id=req.id,
        action="BackupAssigned",
        reason=f"Assigned {backup_team.name if backup_team else 'Depot Resources'} to Backup Request #{req.id}. Handover: {req.handover_type}. ETA: ~{req.eta_minutes}m.",
        details={"backup_team_id": backup_team.id if backup_team else None, "handover_type": req.handover_type, "eta": req.eta_minutes},
        triggered_by="Coordinator"
    )

    await create_notification(
        db=db,
        title=f"🚒 Backup Dispatched: Incident #{inc.id}",
        message=f"{backup_team.name if backup_team else 'Support unit'} dispatched to assist team {req.requesting_team.name}. ETA: ~{req.eta_minutes}m.",
        category="TeamAssignment",
        severity="Info",
        incident_id=inc.id,
        team_id=backup_team.id if backup_team else None
    )

    await broadcast_event("backup_assigned", {
        "backup_request_id": req.id,
        "incident_id": inc.id,
        "backup_team_id": backup_team.id if backup_team else None,
        "backup_team_name": backup_team.name if backup_team else "Depot Support",
        "handover_type": req.handover_type,
        "eta_minutes": req.eta_minutes
    })

    return {
        "message": "Backup assistance assigned and notified.",
        "backup_request_id": req.id,
        "assigned_backup_team": backup_team.name if backup_team else "None",
        "handover_type": req.handover_type,
        "eta_minutes": req.eta_minutes
    }

@router.post("/{id}/status")
async def update_backup_status(
    id: int,
    status: str = Query(..., description="Assigned, En Route, On Scene, Completed, Cancelled"),
    db: Session = Depends(get_db)
):
    valid_statuses = ["Assigned", "En Route", "On Scene", "Completed", "Cancelled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {valid_statuses}")

    req = db.query(BackupRequest).filter(BackupRequest.id == id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Backup request not found")

    req.status = status
    if status == "Completed":
        req.resolved_at = datetime.utcnow()
        if req.incident:
            req.incident.backup_requested = False

    db.commit()

    log_event(
        db=db,
        entity_type="Backup",
        entity_id=req.id,
        action="BackupStatusChanged",
        reason=f"Backup Request #{req.id} status updated to '{status}'.",
        triggered_by="FieldReport"
    )

    await broadcast_event("backup_status_changed", {
        "backup_request_id": req.id,
        "status": status
    })

    return {"backup_request_id": req.id, "status": status}
