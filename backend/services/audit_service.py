import json
from datetime import datetime
from sqlalchemy.orm import Session
from backend.database.models import PlanAuditLog

def log_event(
    db: Session,
    entity_type: str,
    action: str,
    reason: str,
    entity_id: int = None,
    details: dict = None,
    triggered_by: str = "System"
) -> PlanAuditLog:
    """
    Appends an immutable audit event explaining why an assignment, allocation, or plan changed.
    """
    details_str = json.dumps(details or {}, default=str)
    audit = PlanAuditLog(
        timestamp=datetime.utcnow(),
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        reason=reason,
        details_json=details_str,
        triggered_by=triggered_by
    )
    db.add(audit)
    db.commit()
    db.refresh(audit)
    return audit
