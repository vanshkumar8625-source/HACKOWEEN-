from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.database.db import get_db
from backend.database.models import Notification
from backend.schemas import NotificationResponse

router = APIRouter()

@router.get("/", response_model=List[NotificationResponse])
def get_notifications(
    unread_only: bool = False,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """
    Requirement 7: Unified notification feed for critical incidents, deadlines,
    backup requests, and rescue completions.
    """
    query = db.query(Notification)
    if unread_only:
        query = query.filter(Notification.is_read.is_(False))
    return query.order_by(Notification.created_at.desc()).limit(limit).all()

@router.post("/{id}/read")
def mark_notification_read(id: int, db: Session = Depends(get_db)):
    notif = db.query(Notification).filter(Notification.id == id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    return {"message": "Notification marked as read", "id": id}

@router.post("/mark-all-read")
def mark_all_read(db: Session = Depends(get_db)):
    db.query(Notification).filter(Notification.is_read.is_(False)).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}
