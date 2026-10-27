import math
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from backend.database.models import RescueTeam, Incident
from backend.services.audit_service import log_event

class NoEligibleTeamError(Exception):
    pass

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Computes great circle distance between two points in kilometers.
    """
    R = 6371.0  # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

def find_best_team(
    db: Session,
    incident_lat: float,
    incident_lng: float,
    required_skill: str = "General Rescue"
) -> Tuple[Optional[RescueTeam], float, str]:
    """
    Evaluates available teams deterministically based on:
    1. Availability status (Available or Returning)
    2. Skill compatibility
    3. Geographical proximity (Haversine distance)
    Returns: (best_team, distance_km, explanation)
    """
    eligible_teams = db.query(RescueTeam).filter(
        RescueTeam.status.in_(["Available", "Returning"])
    ).all()

    if not eligible_teams:
        return None, 0.0, "No teams currently available in region."

    scored_candidates = []
    for team in eligible_teams:
        dist = haversine_distance_km(incident_lat, incident_lng, team.latitude, team.longitude)
        
        # Skill compatibility bonus/penalty
        clean_req = (required_skill or "General").lower()
        clean_spec = team.specialization.lower()
        
        exact_match = clean_req in clean_spec or clean_spec in clean_req
        # Primary sort key: is_exact_match (True first), Secondary: distance_km
        scored_candidates.append((not exact_match, dist, team))

    scored_candidates.sort(key=lambda x: (x[0], x[1]))
    best_mismatch, best_dist, best_team = scored_candidates[0]

    match_desc = "Exact specialization match" if not best_mismatch else "Secondary general rescue compatibility"
    explanation = f"Selected {best_team.name} ({best_team.specialization}) at {best_dist} km. Rationale: {match_desc}."

    return best_team, best_dist, explanation

def assign_team_to_incident(
    db: Session,
    team_id: int,
    incident_id: int,
    triggered_by: str = "Coordinator"
) -> RescueTeam:
    """
    Deterministically assigns a team to an incident and records audit history.
    """
    team = db.query(RescueTeam).filter(RescueTeam.id == team_id).first()
    incident = db.query(Incident).filter(Incident.id == incident_id).first()

    if not team or not incident:
        raise ValueError("Invalid team_id or incident_id.")

    if team.status not in ["Available", "Returning"]:
        log_event(
            db=db,
            entity_type="Team",
            entity_id=team_id,
            action="AssignmentRejected",
            reason=f"Cannot assign {team.name}: current status is '{team.status}'.",
            details={"current_status": team.status, "incident_id": incident_id},
            triggered_by=triggered_by
        )
        raise ValueError(f"Team {team.name} is not available (status: {team.status}).")

    prev_status = team.status
    team.status = "Dispatched"
    incident.assigned_team_id = team.id
    if incident.status == "Active":
        incident.status = "In Progress"

    db.commit()
    db.refresh(team)
    db.refresh(incident)

    dist = haversine_distance_km(incident.latitude, incident.longitude, team.latitude, team.longitude)
    log_event(
        db=db,
        entity_type="Team",
        entity_id=team.id,
        action="Dispatched",
        reason=f"Dispatched {team.name} to Incident #{incident.id} ({incident.title}). Distance: {dist} km.",
        details={"incident_id": incident.id, "previous_status": prev_status, "distance_km": dist},
        triggered_by=triggered_by
    )

    return team
