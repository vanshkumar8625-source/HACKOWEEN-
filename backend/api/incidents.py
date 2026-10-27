import json
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.database.db import get_db
from backend.database.models import Incident, RescueTeam, Shelter
from backend.schemas import IncidentCreate, IncidentUpdate, IncidentResponse
from backend.services.priority_service import calculate_priority_score
from backend.services.team_service import find_best_team, assign_team_to_incident
from backend.services.shelter_service import find_nearest_available_shelter, allocate_shelter_capacity
from backend.services.audit_service import log_event
from backend.socket_server.server import broadcast_event

router = APIRouter()

@router.post("/", response_model=IncidentResponse)
async def create_incident(
    payload: IncidentCreate,
    db: Session = Depends(get_db)
):
    """
    Module 1 & 2: Incident intake, strict Pydantic validation, and explainable priority scoring.
    """
    score, breakdown = calculate_priority_score(
        disaster_type=payload.disaster_type,
        severity=payload.severity,
        description=payload.description or ""
    )

    incident = Incident(
        title=payload.title,
        disaster_type=payload.disaster_type,
        severity=payload.severity,
        priority_score=score,
        priority_breakdown=breakdown,
        location_name=payload.location_name,
        latitude=payload.latitude,
        longitude=payload.longitude,
        description=payload.description,
        status="Active",
        reported_by=payload.reported_by or "Citizen",
        required_skill=payload.required_skill or "General Rescue",
        required_supplies_json=json.dumps(payload.required_supplies or {})
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)

    log_event(
        db=db,
        entity_type="Incident",
        entity_id=incident.id,
        action="IncidentReported",
        reason=f"New incident '{incident.title}' reported. Computed priority score: {score}/100.",
        details={"severity": incident.severity, "priority_score": score, "location": incident.location_name},
        triggered_by=incident.reported_by
    )

    await broadcast_event("incident_created", {
        "id": incident.id,
        "title": incident.title,
        "disaster_type": incident.disaster_type,
        "severity": incident.severity,
        "priority_score": incident.priority_score,
        "latitude": incident.latitude,
        "longitude": incident.longitude,
        "status": incident.status
    })

    return incident

@router.get("/", response_model=List[IncidentResponse])
def list_incidents(
    status: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    query = db.query(Incident)
    if status:
        query = query.filter(Incident.status == status)
    # Order by priority score descending (highest priority first)
    return query.order_by(Incident.priority_score.desc(), Incident.created_at.desc()).limit(limit).all()

@router.get("/{id}", response_model=IncidentResponse)
def get_incident(id: int, db: Session = Depends(get_db)):
    inc = db.query(Incident).filter(Incident.id == id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    return inc

@router.post("/{id}/auto-assign-team")
async def auto_assign_team(id: int, db: Session = Depends(get_db)):
    """
    Module 4: Automatically selects and dispatches the optimal team matching skill and location.
    """
    inc = db.query(Incident).filter(Incident.id == id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    team, dist, explanation = find_best_team(
        db, inc.latitude, inc.longitude, required_skill=inc.required_skill
    )
    if not team:
        raise HTTPException(status_code=400, detail="No eligible rescue teams available.")

    assigned_team = assign_team_to_incident(db, team.id, inc.id)
    await broadcast_event("team_dispatched", {
        "incident_id": inc.id,
        "team_id": assigned_team.id,
        "team_name": assigned_team.name,
        "distance_km": dist
    })

    return {
        "message": f"Assigned {assigned_team.name} to {inc.title}",
        "team_id": assigned_team.id,
        "distance_km": dist,
        "explanation": explanation
    }

@router.post("/{id}/evacuate-to-shelter")
async def evacuate_incident_victims(
    id: int,
    evacuee_count: int = Query(..., gt=0),
    shelter_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Module 5: Enforces deterministic shelter capacity and accessibility constraints.
    """
    inc = db.query(Incident).filter(Incident.id == id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    if shelter_id:
        target_shelter = db.query(Shelter).filter(Shelter.id == shelter_id).first()
    else:
        target_shelter, dist, expl = find_nearest_available_shelter(db, inc.latitude, inc.longitude, evacuee_count)

    if not target_shelter:
        raise HTTPException(status_code=400, detail="No accessible shelter with required capacity found.")

    try:
        updated_shelter = allocate_shelter_capacity(db, target_shelter.id, evacuee_count, incident_id=inc.id)
        await broadcast_event("shelter_updated", {
            "shelter_id": updated_shelter.id,
            "occupancy": updated_shelter.occupancy,
            "vacancy": updated_shelter.vacancy
        })
        return {
            "message": f"Allocated {evacuee_count} evacuees to {updated_shelter.name}.",
            "shelter_id": updated_shelter.id,
            "current_occupancy": updated_shelter.occupancy,
            "vacancy": updated_shelter.vacancy
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
