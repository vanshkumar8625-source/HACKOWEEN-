import logging
from typing import Optional
from sqlalchemy.orm import Session
from backend.database.models import Notification
from backend.socket_server.server import broadcast_event

logger = logging.getLogger(__name__)

async def create_notification(
    db: Session,
    title: str,
    message: str,
    category: str,
    severity: str = "Info",
    incident_id: Optional[int] = None,
    team_id: Optional[int] = None
) -> Notification:
    """
    Creates an immutable notification record and broadcasts via real-time WebSocket.
    """
    notif = Notification(
        title=title,
        message=message,
        category=category,
        severity=severity,
        incident_id=incident_id,
        team_id=team_id,
        is_read=False
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)

    # Broadcast event
    await broadcast_event("notification_created", {
        "id": notif.id,
        "title": notif.title,
        "message": notif.message,
        "category": notif.category,
        "severity": notif.severity,
        "incident_id": notif.incident_id,
        "team_id": notif.team_id,
        "created_at": notif.created_at.isoformat()
    })

    return notif
