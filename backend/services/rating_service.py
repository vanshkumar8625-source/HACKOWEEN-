import logging
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from backend.database.models import RescueTeam, Incident, TeamRating, PlanAuditLog
from backend.services.audit_service import log_event
from backend.services.notification_service import create_notification
from backend.socket_server.server import broadcast_event

logger = logging.getLogger(__name__)

def calculate_score(
    arrived_on_time: bool,
    rescue_successful: bool,
    is_disaster_exception: bool = False,
    resource_efficiency: float = 5.0,
    supervisor_bonus: float = 0.0
) -> Tuple[float, str]:
    """
    Requirement 2: Computes a transparent 5-star rating for an incident operation.
    Rules:
    - Early/on-time arrival: positive baseline (4.5).
    - Late without justified exception: penalize to 2.0 - 2.5.
    - Disaster exception (unavoidable barrier like collapsed bridge): NO penalty; protected baseline (4.2 - 5.0).
    - Successful rescue: +0.5 bonus.
    - Final score clamped to [1.0, 5.0].
    """
    if is_disaster_exception:
        # A team must not receive a poor rating solely because a disaster made rescue impossible
        base = 4.2
        rationale = "Disaster exception approved: terrain/severe hazard rendered standard arrival impossible; team acted safely without penalty."
    elif arrived_on_time:
        base = 4.5
        rationale = "Arrived on scene within assigned response deadline."
    else:
        base = 2.2
        rationale = "Arrival delayed beyond assigned deadline without an approved disaster exception."

    if rescue_successful:
        base += 0.5
        rationale += " Rescue operation completed with victim safety secured."
    else:
        base -= 0.5
        rationale += " Rescue incomplete or victim outcome compromised."

    # Resource usage & efficiency adjustment (+/- 0.3)
    if resource_efficiency >= 4.0:
        base += 0.2
    elif resource_efficiency < 2.5:
        base -= 0.3

    base += supervisor_bonus

    # Clamp between 1.0 and 5.0 stars
    final_score = round(max(1.0, min(5.0, base)), 2)
    return final_score, rationale

async def record_incident_team_rating(
    db: Session,
    team_id: int,
    incident_id: int,
    arrived_on_time: bool,
    rescue_successful: bool,
    outcome_notes: Optional[str] = None,
    resource_efficiency_score: float = 5.0,
    is_disaster_exception: bool = False,
    rated_by: str = "Supervisor",
    override_rating: Optional[float] = None
) -> TeamRating:
    """
    Records an immutable team rating and updates aggregate team performance statistics.
    Teams are forbidden from rating themselves.
    """
    team = db.query(RescueTeam).filter(RescueTeam.id == team_id).first()
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not team or not incident:
        raise ValueError("Invalid team_id or incident_id.")

    if override_rating is not None:
        computed_rating = max(1.0, min(5.0, round(override_rating, 2)))
        rationale = f"Evaluated directly by {rated_by}."
    else:
        computed_rating, rationale = calculate_score(
            arrived_on_time=arrived_on_time,
            rescue_successful=rescue_successful,
            is_disaster_exception=is_disaster_exception,
            resource_efficiency=resource_efficiency_score
        )

    rating_entry = TeamRating(
        team_id=team.id,
        incident_id=incident.id,
        rating=computed_rating,
        arrived_on_time=arrived_on_time,
        rescue_successful=rescue_successful,
        outcome_notes=outcome_notes or rationale,
        resource_efficiency_score=resource_efficiency_score,
        is_disaster_exception=is_disaster_exception,
        dispute_status="None",
        rated_by=rated_by
    )
    db.add(rating_entry)
    db.commit()
    db.refresh(rating_entry)

    # Update Team Aggregate Metrics
    ratings = db.query(TeamRating).filter(TeamRating.team_id == team.id).all()
    team.total_ratings = len(ratings)
    team.average_rating = round(sum(r.rating for r in ratings) / max(1, len(ratings)), 2)

    if rescue_successful:
        team.completed_rescues += 1

    if arrived_on_time or is_disaster_exception:
        team.on_time_rescues += 1
    else:
        team.delayed_rescues += 1

    db.commit()
    db.refresh(team)

    log_event(
        db=db,
        entity_type="Rating",
        entity_id=rating_entry.id,
        action="RatingRecorded",
        reason=f"Rated {team.name} {computed_rating}★ for Incident #{incident.id}. On-time: {arrived_on_time}, Exception: {is_disaster_exception}.",
        details={"team_id": team.id, "rating": computed_rating, "rationale": rationale},
        triggered_by=rated_by
    )

    await broadcast_event("rating_updated", {
        "team_id": team.id,
        "team_name": team.name,
        "rating": computed_rating,
        "average_rating": team.average_rating,
        "completed_rescues": team.completed_rescues,
        "on_time_percentage": team.on_time_percentage
    })

    return rating_entry

async def dispute_team_rating(
    db: Session,
    rating_id: int,
    dispute_reason: str,
    disputed_by: str = "RescueTeam"
) -> TeamRating:
    """
    Submits a rating dispute for supervisory review.
    """
    rating = db.query(TeamRating).filter(TeamRating.id == rating_id).first()
    if not rating:
        raise ValueError(f"Rating #{rating_id} not found.")

    rating.dispute_status = "Disputed"
    rating.dispute_reason = dispute_reason
    db.commit()
    db.refresh(rating)

    log_event(
        db=db,
        entity_type="Rating",
        entity_id=rating.id,
        action="DisputeSubmitted",
        reason=f"Team requested supervisory review for Rating #{rating.id}. Reason: {dispute_reason}",
        triggered_by=disputed_by
    )

    await create_notification(
        db=db,
        title=f"⚖️ Rating Disputed: Team #{rating.team_id}",
        message=f"Team disputed {rating.rating}★ rating for Incident #{rating.incident_id}. Supervisor review required.",
        category="StatusChange",
        severity="Warning",
        incident_id=rating.incident_id,
        team_id=rating.team_id
    )

    return rating

async def review_disputed_rating(
    db: Session,
    rating_id: int,
    dispute_status: str,
    supervisor_notes: str,
    adjusted_rating: Optional[float] = None,
    reviewed_by: str = "AuthorizedSupervisor"
) -> TeamRating:
    """
    Authorized supervisor reviews and updates a disputed rating.
    """
    rating = db.query(TeamRating).filter(TeamRating.id == rating_id).first()
    if not rating:
        raise ValueError(f"Rating #{rating_id} not found.")

    prev_rating = rating.rating
    rating.dispute_status = dispute_status
    rating.supervisor_notes = supervisor_notes
    if adjusted_rating is not None:
        rating.rating = max(1.0, min(5.0, round(adjusted_rating, 2)))

    db.commit()
    db.refresh(rating)

    # Recalculate team averages
    team = db.query(RescueTeam).filter(RescueTeam.id == rating.team_id).first()
    if team:
        all_ratings = db.query(TeamRating).filter(TeamRating.team_id == team.id).all()
        team.average_rating = round(sum(r.rating for r in all_ratings) / max(1, len(all_ratings)), 2)
        db.commit()

    log_event(
        db=db,
        entity_type="Rating",
        entity_id=rating.id,
        action="DisputeReviewed",
        reason=f"Supervisor reviewed dispute. Status: {dispute_status}. Rating changed from {prev_rating} to {rating.rating}. Notes: {supervisor_notes}",
        triggered_by=reviewed_by
    )

    return rating
