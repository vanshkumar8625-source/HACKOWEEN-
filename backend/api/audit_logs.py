from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List
from backend.database.db import get_db
from backend.database.models import PlanAuditLog
from backend.schemas import PlanAuditLogResponse

router = APIRouter()

@router.get("/", response_model=List[PlanAuditLogResponse])
def get_audit_logs(
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """
    Module 9: Audit/event history that explains why assignments and plans changed.
    """
    return db.query(PlanAuditLog).order_by(PlanAuditLog.timestamp.desc()).limit(limit).all()
