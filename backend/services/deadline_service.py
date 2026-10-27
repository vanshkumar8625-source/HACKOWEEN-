import math
from datetime import datetime, timedelta
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from backend.database.models import Incident, RescueTeam, PlanAuditLog
from backend.services.audit_service import log_event
from backend.services.notification_service import create_notification
from backend.socket_server.server import broadcast_event

BASE_LAT = 18.5204
BASE_LNG = 73.8567

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

def compute_initial_deadline_and_eta(
    severity: str,
    incident_lat: float,
    incident_lng: float,
    team_lat: Optional[float] = None,
    team_lng: Optional[float] = None,
    created_at: Optional[datetime] = None
) -> Tuple[datetime, datetime, float]:
    """
    Requirement 1: Assigns response deadline based on severity and incident location.
    Returns: (deadline_at, estimated_arrival_at, eta_minutes)
    """
    base_time = created_at or datetime.utcnow()
    
    # Severity base time limits
    severity_minutes = {
        "Critical": 45,
        "High": 90,
        "Medium": 180,
        "Low": 360
    }.get(severity, 90)

    # Calculate distance to base or assigned team
    origin_lat = team_lat if team_lat is not None else BASE_LAT
    origin_lng = team_lng if team_lng is not None else BASE_LNG
    dist_km = haversine_km(origin_lat, origin_lng, incident_lat, incident_lng)

    # Average emergency response vehicle speed ~ 35 km/h in rough terrain / rain
    travel_minutes = max(10.0, round((dist_km / 35.0) * 60.0, 1))

    # Deadline = Severity baseline + location travel buffer
    deadline_at = base_time + timedelta(minutes=severity_minutes + travel_minutes)
    estimated_arrival_at = base_time + timedelta(minutes=travel_minutes)

    return deadline_at, estimated_arrival_at, travel_minutes

async def check_and_flag_delayed_incidents(db: Session):
    """
    Requirement 1 & 3: Scans active incidents, flags missed deadlines as Delayed,
    notifies administrator, and prepares accountability tracking.
    """
    now = datetime.utcnow()
    active_incidents = db.query(Incident).filter(
        Incident.status.in_(["Active", "In Progress"]),
        Incident.deadline_at.isnot(None),
        Incident.actual_arrival_at.is_(None)
    ).all()

    for inc in active_incidents:
        if inc.deadline_at and now > inc.deadline_at:
            if inc.deadline_status != "Delayed":
                inc.deadline_status = "Delayed"
                db.commit()

                log_event(
                    db=db,
                    entity_type="Incident",
                    entity_id=inc.id,
                    action="DeadlineMissed",
                    reason=f"Incident #{inc.id} '{inc.title}' passed response deadline of {inc.deadline_at.strftime('%H:%M:%S')}. Auto-flagged as Delayed.",
                    details={"deadline_at": inc.deadline_at.isoformat(), "now": now.isoformat()},
                    triggered_by="DeadlineMonitor"
                )

                await create_notification(
                    db=db,
                    title=f"🚨 Deadline Missed: Incident #{inc.id}",
                    message=f"Team failed to arrive before deadline for '{inc.title}' ({inc.severity}). Awaiting delay explanation.",
                    category="MissedDeadline",
                    severity="Critical",
                    incident_id=inc.id,
                    team_id=inc.assigned_team_id
                )

                await broadcast_event("incident_delayed", {
                    "incident_id": inc.id,
                    "title": inc.title,
                    "deadline_at": inc.deadline_at.isoformat(),
                    "assigned_team_id": inc.assigned_team_id
                })

async def adjust_incident_deadline(
    db: Session,
    incident_id: int,
    new_deadline: datetime,
    reason: str,
    adjusted_by: str = "Administrator"
) -> Incident:
    """
    Allows authorized administrators to adjust deadlines when conditions change,
    recording the mandatory reason for every change in the audit log.
    """
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise ValueError(f"Incident #{incident_id} not found.")

    old_deadline = incident.deadline_at
    incident.deadline_at = new_deadline
    incident.deadline_status = "Extended"
    incident.deadline_extended_reason = f"[{adjusted_by}] {reason}"
    db.commit()
    db.refresh(incident)

    log_event(
        db=db,
        entity_type="Incident",
        entity_id=incident.id,
        action="DeadlineAdjusted",
        reason=f"Administrator adjusted deadline from {old_deadline} to {new_deadline}. Reason: {reason}",
        details={"old_deadline": old_deadline.isoformat() if old_deadline else None, "new_deadline": new_deadline.isoformat(), "reason": reason},
        triggered_by=adjusted_by
    )

    await create_notification(
        db=db,
        title=f"⏱️ Deadline Extended: Incident #{incident.id}",
        message=f"Deadline updated to {new_deadline.strftime('%H:%M:%S')}. Reason: {reason}",
        category="UpcomingDeadline",
        severity="Info",
        incident_id=incident.id,
        team_id=incident.assigned_team_id
    )

    await broadcast_event("deadline_updated", {
        "incident_id": incident.id,
        "new_deadline": new_deadline.isoformat(),
        "reason": reason
    })

    return incident
