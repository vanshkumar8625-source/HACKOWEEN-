from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend.database.db import get_db
from backend.database.models import RescueTeam, TeamRating, Incident
from backend.schemas import (
    RescueTeamResponse, TeamAssignmentRequest, TeamRatingResponse,
    RatingDisputeRequest, RatingReviewRequest, TeamRestrictionUpdateRequest, IncidentResponse
)
from backend.services.team_service import assign_team_to_incident
from backend.services.rating_service import dispute_team_rating, review_disputed_rating
from backend.services.audit_service import log_event
from backend.socket_server.server import broadcast_event

router = APIRouter()

@router.get("/", response_model=List[RescueTeamResponse])
def get_teams(db: Session = Depends(get_db)):
    """
    List response teams with status, location, specialization, average rating,
    completed rescues, on-time percentage, and restriction status.
    """
    return db.query(RescueTeam).all()

@router.get("/{id}", response_model=RescueTeamResponse)
def get_team(id: int, db: Session = Depends(get_db)):
    team = db.query(RescueTeam).filter(RescueTeam.id == id).first()
    if not team:
        raise HTTPException(status_code=404, detail="RescueTeam not found")
    return team

@router.get("/{id}/ratings", response_model=List[TeamRatingResponse])
def get_team_ratings(id: int, db: Session = Depends(get_db)):
    """
    Returns full rating history and supervisory audits for a specific rescue team.
    """
    return db.query(TeamRating).filter(TeamRating.team_id == id).order_by(TeamRating.created_at.desc()).all()

@router.get("/{id}/assignments", response_model=List[IncidentResponse])
def get_team_assignments(id: int, db: Session = Depends(get_db)):
    """
    Returns incidents assigned to a specific team (primary or backup).
    """
    return db.query(Incident).filter(
        (Incident.assigned_team_id == id) | (Incident.backup_team_id == id)
    ).order_by(Incident.created_at.desc()).all()

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

@router.post("/{id}/restriction")
async def update_team_restriction(
    id: int,
    payload: TeamRestrictionUpdateRequest,
    db: Session = Depends(get_db)
):
    """
    Requirement 3: Sets or lifts temporary restrictions on rescue teams.
    """
    team = db.query(RescueTeam).filter(RescueTeam.id == id).first()
    if not team:
        raise HTTPException(status_code=404, detail="RescueTeam not found")

    team.is_restricted = payload.is_restricted
    team.restriction_reason = payload.restriction_reason if payload.is_restricted else None
    db.commit()
    db.refresh(team)

    action = "Restricted" if payload.is_restricted else "RestrictionLifted"
    log_event(
        db=db,
        entity_type="Team",
        entity_id=team.id,
        action=action,
        reason=f"Team assignment status modified: Restricted={payload.is_restricted}. Reason: {payload.restriction_reason}",
        triggered_by="Administrator"
    )

    return {
        "team_id": team.id,
        "is_restricted": team.is_restricted,
        "restriction_reason": team.restriction_reason
    }

@router.post("/ratings/{rating_id}/dispute")
async def dispute_rating(
    rating_id: int,
    payload: RatingDisputeRequest,
    db: Session = Depends(get_db)
):
    """
    Requirement 2: Rescue team requests supervisory review for a disputed rating.
    """
    try:
        updated = await dispute_team_rating(
            db=db,
            rating_id=rating_id,
            dispute_reason=payload.dispute_reason
        )
        return {
            "message": "Rating dispute submitted for supervisory review.",
            "rating_id": updated.id,
            "dispute_status": updated.dispute_status
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/ratings/{rating_id}/review")
async def review_dispute(
    rating_id: int,
    payload: RatingReviewRequest,
    db: Session = Depends(get_db)
):
    """
    Requirement 2: Authorized supervisor reviews dispute and updates outcome.
    """
    try:
        updated = await review_disputed_rating(
            db=db,
            rating_id=rating_id,
            dispute_status=payload.dispute_status,
            supervisor_notes=payload.supervisor_notes,
            adjusted_rating=payload.adjusted_rating
        )
        return {
            "message": f"Dispute resolution recorded ({updated.dispute_status}).",
            "rating_id": updated.id,
            "final_rating": updated.rating,
            "dispute_status": updated.dispute_status
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
