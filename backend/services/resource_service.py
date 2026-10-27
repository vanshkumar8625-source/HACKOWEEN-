from sqlalchemy.orm import Session
from backend.database.models import Resource
from backend.services.audit_service import log_event

class InsufficientResourceError(Exception):
    pass

class ResourceNotFoundError(Exception):
    pass

def allocate_resource(
    db: Session,
    resource_id: int,
    qty: int,
    incident_id: int = None,
    reason: str = "Mission allocation",
    triggered_by: str = "Coordinator"
) -> Resource:
    """
    Deterministically allocates physical resources from inventory.
    Enforces that requested quantity does not exceed available unreserved stock.
    """
    if qty <= 0:
        raise ValueError("Allocated quantity must be greater than zero.")

    res = db.query(Resource).filter(Resource.id == resource_id).first()
    if not res:
        raise ResourceNotFoundError(f"Resource with ID {resource_id} not found.")

    available = res.available_qty
    if qty > available:
        log_event(
            db=db,
            entity_type="Resource",
            entity_id=resource_id,
            action="AllocationFailed",
            reason=f"Failed allocation: requested {qty} {res.unit} of {res.name}, but only {available} available.",
            details={"requested_qty": qty, "available_qty": available, "incident_id": incident_id},
            triggered_by=triggered_by
        )
        raise InsufficientResourceError(
            f"Insufficient inventory for {res.name}. Requested: {qty}, Available: {available}"
        )

    res.allocated_qty += qty
    db.commit()
    db.refresh(res)

    log_event(
        db=db,
        entity_type="Resource",
        entity_id=resource_id,
        action="Allocated",
        reason=f"Allocated {qty} {res.unit} of {res.name}. Remaining available: {res.available_qty}.",
        details={"allocated_qty": qty, "remaining_available": res.available_qty, "incident_id": incident_id, "notes": reason},
        triggered_by=triggered_by
    )

    return res

def reserve_resource(
    db: Session,
    resource_id: int,
    qty: int,
    incident_id: int = None,
    reason: str = "Route mission reservation",
    triggered_by: str = "Coordinator"
) -> Resource:
    """
    Reserves physical inventory during planning. Prevents concurrent missions from double-allocating.
    """
    if qty <= 0:
        raise ValueError("Reserved quantity must be greater than zero.")

    res = db.query(Resource).filter(Resource.id == resource_id).first()
    if not res:
        raise ResourceNotFoundError(f"Resource with ID {resource_id} not found.")

    available = res.available_qty
    if qty > available:
        log_event(
            db=db,
            entity_type="Resource",
            entity_id=resource_id,
            action="ReservationFailed",
            reason=f"Failed reservation: requested {qty} {res.unit} of {res.name}, but only {available} available.",
            details={"requested_qty": qty, "available_qty": available, "incident_id": incident_id},
            triggered_by=triggered_by
        )
        raise InsufficientResourceError(
            f"Insufficient inventory to reserve {res.name}. Requested: {qty}, Available: {available}"
        )

    res.reserved_qty += qty
    db.commit()
    db.refresh(res)

    log_event(
        db=db,
        entity_type="Resource",
        entity_id=resource_id,
        action="Reserved",
        reason=f"Reserved {qty} {res.unit} of {res.name} for incident #{incident_id}.",
        details={"reserved_qty": qty, "remaining_available": res.available_qty, "incident_id": incident_id, "notes": reason},
        triggered_by=triggered_by
    )

    return res

def release_reservation(
    db: Session,
    resource_id: int,
    qty: int,
    incident_id: int = None,
    reason: str = "Reservation released or cancelled",
    triggered_by: str = "Coordinator"
) -> Resource:
    """
    Releases previously reserved inventory back to available stock.
    """
    res = db.query(Resource).filter(Resource.id == resource_id).first()
    if not res:
        raise ResourceNotFoundError(f"Resource with ID {resource_id} not found.")

    actual_release = min(res.reserved_qty, qty)
    res.reserved_qty -= actual_release
    db.commit()
    db.refresh(res)

    log_event(
        db=db,
        entity_type="Resource",
        entity_id=resource_id,
        action="ReservationReleased",
        reason=f"Released {actual_release} {res.unit} of {res.name} back to available stock.",
        details={"released_qty": actual_release, "remaining_available": res.available_qty, "incident_id": incident_id, "notes": reason},
        triggered_by=triggered_by
    )

    return res
