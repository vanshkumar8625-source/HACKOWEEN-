from typing import Optional, Tuple, List
from sqlalchemy.orm import Session
from backend.database.models import Shelter, Incident
from backend.services.team_service import haversine_distance_km
from backend.services.audit_service import log_event

class ShelterOvercapacityError(Exception):
    pass

class ShelterInaccessibleError(Exception):
    pass

def allocate_shelter_capacity(
    db: Session,
    shelter_id: int,
    evacuee_count: int,
    incident_id: int = None,
    triggered_by: str = "Coordinator"
) -> Shelter:
    """
    Enforces deterministic safety constraints on shelter capacity.
    Rejects allocation if evacuee count exceeds remaining vacancy or if shelter is cut off.
    """
    if evacuee_count <= 0:
        raise ValueError("Evacuee count must be greater than zero.")

    shelter = db.query(Shelter).filter(Shelter.id == shelter_id).first()
    if not shelter:
        raise ValueError(f"Shelter with ID {shelter_id} not found.")

    if not shelter.is_accessible:
        log_event(
            db=db,
            entity_type="Shelter",
            entity_id=shelter_id,
            action="EvacuationRejected",
            reason=f"Shelter {shelter.name} is marked as INACCESSIBLE due to flooding/debris.",
            details={"evacuee_count": evacuee_count, "incident_id": incident_id},
            triggered_by=triggered_by
        )
        raise ShelterInaccessibleError(f"Shelter {shelter.name} is currently inaccessible.")

    vacancy = shelter.vacancy
    if evacuee_count > vacancy:
        log_event(
            db=db,
            entity_type="Shelter",
            entity_id=shelter_id,
            action="OvercapacityRejected",
            reason=(
                f"Shelter {shelter.name} cannot accommodate {evacuee_count} evacuees. "
                f"Capacity: {shelter.capacity}, Current Occupancy: {shelter.occupancy}, Vacancy: {vacancy}."
            ),
            details={"requested_evacuees": evacuee_count, "capacity": shelter.capacity, "vacancy": vacancy, "incident_id": incident_id},
            triggered_by=triggered_by
        )
        raise ShelterOvercapacityError(
            f"Shelter {shelter.name} overcapacity: requested {evacuee_count}, vacancy {vacancy}."
        )

    # Perform deterministic allocation
    shelter.occupancy += evacuee_count
    
    # Accelerated food/water consumption estimate (more occupants = faster consumption)
    consumption_factor = evacuee_count / max(1, shelter.capacity)
    shelter.food_stock_days = max(0.5, round(shelter.food_stock_days - (0.1 * consumption_factor), 1))
    shelter.water_stock_days = max(0.5, round(shelter.water_stock_days - (0.15 * consumption_factor), 1))

    if shelter.food_stock_days <= 2.0 or shelter.water_stock_days <= 2.0:
        shelter.medical_stock_level = "Critical"

    if incident_id:
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if incident:
            incident.assigned_shelter_id = shelter.id

    db.commit()
    db.refresh(shelter)

    log_event(
        db=db,
        entity_type="Shelter",
        entity_id=shelter.id,
        action="EvacueesAdmitted",
        reason=f"Admitted {evacuee_count} evacuees to {shelter.name}. New occupancy: {shelter.occupancy}/{shelter.capacity} ({shelter.occupancy_rate}%).",
        details={
            "admitted_count": evacuee_count,
            "new_occupancy": shelter.occupancy,
            "remaining_vacancy": shelter.vacancy,
            "food_stock_days": shelter.food_stock_days,
            "water_stock_days": shelter.water_stock_days,
            "incident_id": incident_id
        },
        triggered_by=triggered_by
    )

    return shelter

def find_nearest_available_shelter(
    db: Session,
    lat: float,
    lng: float,
    needed_vacancy: int = 1
) -> Tuple[Optional[Shelter], float, str]:
    """
    Finds the nearest accessible shelter with at least `needed_vacancy` capacity.
    """
    candidates = db.query(Shelter).filter(
        Shelter.is_accessible == True,
        (Shelter.capacity - Shelter.occupancy) >= needed_vacancy
    ).all()

    if not candidates:
        return None, 0.0, "All regional shelters are at full capacity or inaccessible."

    scored = []
    for s in candidates:
        dist = haversine_distance_km(lat, lng, s.latitude, s.longitude)
        scored.append((dist, s))

    scored.sort(key=lambda x: x[0])
    best_dist, best_shelter = scored[0]
    explanation = f"Found {best_shelter.name} at {best_dist} km with {best_shelter.vacancy} vacancies."

    return best_shelter, best_dist, explanation
