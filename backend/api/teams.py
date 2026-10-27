from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend.database.db import get_db
from backend.database.models import RescueTeam
from backend.schemas import RescueTeamResponse, TeamAssignmentRequest
from backend.services.team_service import assign_team_to_incident
from backend.services.audit_service import log_event
from backend.socket_server.server import broadcast_event

router = APIRouter()

@router.get("/", response_model=List[RescueTeamResponse])
def get_teams(db: Session = Depends(get_db)):
    """
    Module 4: List response teams with status, location, and specialization.
    """
    return db.query(RescueTeam).all()

@router.post("/assign")
async def assign_team(
    payload: TeamAssignmentRequest,
    db: Session = Depends(get_db)
):
    try:
        team = assign_team_to_incident(
            db=db,
            team_id=payload.team_id,
            incident_id=payload.incident_id,
            triggered_by="CommanderManual"
        )
        await broadcast_event("team_dispatched", {
            "team_id": team.id,
            "incident_id": payload.incident_id,
            "status": team.status
        })
        return {
            "message": f"Assigned {team.name} to Incident #{payload.incident_id}",
            "team_id": team.id,
            "status": team.status
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{id}/status")
async def update_team_status(
    id: int,
    status: str,
    db: Session = Depends(get_db)
):
    valid_statuses = ["Available", "Dispatched", "En Route", "On Scene", "Returning", "Off-Duty"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {valid_statuses}")

    team = db.query(RescueTeam).filter(RescueTeam.id == id).first()
    if not team:
        raise HTTPException(status_code=404, detail="RescueTeam not found")

    prev = team.status
    if status == "Off-Duty":
        from backend.services.replanning_service import handle_team_unavailable_event
        replan_res = handle_team_unavailable_event(db, team.id, reason="Marked Off-Duty via command")
        await broadcast_event("team_status_changed", {
            "team_id": team.id,
            "name": team.name,
            "status": "Off-Duty",
            "replanned": replan_res
        })
        return {"team_id": team.id, "status": "Off-Duty", "replanning_result": replan_res}

    team.status = status
    db.commit()

    log_event(
        db=db,
        entity_type="Team",
        entity_id=team.id,
        action="StatusChange",
        reason=f"Team {team.name} status updated from '{prev}' to '{status}'.",
        triggered_by="FieldReport"
    )

    await broadcast_event("team_status_changed", {
        "team_id": team.id,
        "name": team.name,
        "status": team.status
    })

    return {"team_id": team.id, "status": team.status}
