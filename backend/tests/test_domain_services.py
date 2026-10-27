import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.database.models import (
    Base, Incident, Resource, RescueTeam, Shelter, PlanAuditLog
)
from backend.services.priority_service import calculate_priority_score
from backend.services.resource_service import (
    allocate_resource, reserve_resource, release_reservation, InsufficientResourceError
)
from backend.services.team_service import (
    find_best_team, assign_team_to_incident
)
from backend.services.shelter_service import (
    allocate_shelter_capacity, find_nearest_available_shelter, ShelterOvercapacityError, ShelterInaccessibleError
)

@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()

# --- Module 2: Priority Scoring ---
def test_priority_scoring_explainability():
    score_critical, json_crit = calculate_priority_score(
        disaster_type="flood",
        severity="Critical",
        description="Trapped elderly residents near rising water and hospital cutoff",
        water_level_m=5.5,
        rainfall_mm=180.0
    )
    assert score_critical >= 80.0
    assert "Critical" in json_crit
    assert "rising water" in json_crit

    score_low, json_low = calculate_priority_score(
        disaster_type="landslide",
        severity="Low",
        description="Small rock slide on unused trail"
    )
    assert score_low < 40.0
    assert score_critical > score_low

# --- Module 3: Resource Inventory & Reservation ---
def test_resource_allocation_and_reservation(db_session):
    res = Resource(
        name="Inflatable Rescue Boats",
        resource_type="Boat",
        total_qty=10,
        allocated_qty=0,
        reserved_qty=0,
        unit="boats",
        location_name="Kolhapur Depot"
    )
    db_session.add(res)
    db_session.commit()

    # 1. Successful allocation
    allocate_resource(db_session, res.id, qty=4, incident_id=1, reason="Flash flood response")
    assert res.allocated_qty == 4
    assert res.available_qty == 6

    # 2. Reservation
    reserve_resource(db_session, res.id, qty=3, incident_id=2, reason="Standby team")
    assert res.reserved_qty == 3
    assert res.available_qty == 3

    # 3. Attempting to allocate more than unreserved available must fail
    with pytest.raises(InsufficientResourceError):
        allocate_resource(db_session, res.id, qty=4, incident_id=3)

    # 4. Release reservation
    release_reservation(db_session, res.id, qty=3, incident_id=2)
    assert res.reserved_qty == 0
    assert res.available_qty == 6

    # 5. Check audit logs were created
    logs = db_session.query(PlanAuditLog).filter(PlanAuditLog.entity_type == "Resource").all()
    assert len(logs) >= 3

# --- Module 4: Team Assignment ---
def test_team_assignment_and_skill_matching(db_session):
    team_flood = RescueTeam(
        name="NDRF Flood Specialists",
        specialization="Flood Rescue",
        members_count=20,
        status="Available",
        latitude=18.52,
        longitude=73.85,
        contact_number="12345"
    )
    team_fire = RescueTeam(
        name="Pune Fire Hazmat",
        specialization="Hazmat / Fire Control",
        members_count=12,
        status="Available",
        latitude=18.51,  # slightly closer
        longitude=73.84,
        contact_number="67890"
    )
    db_session.add_all([team_flood, team_fire])
    db_session.commit()

    incident = Incident(
        title="Submerged Bridge Rescue",
        disaster_type="flood",
        severity="High",
        priority_score=75.0,
        location_name="Pune East",
        latitude=18.53,
        longitude=73.86,
        status="Active",
        required_skill="Flood Rescue"
    )
    db_session.add(incident)
    db_session.commit()

    best_team, dist, explanation = find_best_team(
        db_session, incident.latitude, incident.longitude, required_skill="Flood Rescue"
    )
    # Even though fire team is slightly closer, Flood Rescue exact match takes precedence
    assert best_team.id == team_flood.id
    assert "Exact specialization match" in explanation

    assigned = assign_team_to_incident(db_session, best_team.id, incident.id)
    assert assigned.status == "Dispatched"
    assert incident.assigned_team_id == team_flood.id
    assert incident.status == "In Progress"

    # Attempting to assign already dispatched team must fail
    with pytest.raises(ValueError):
        assign_team_to_incident(db_session, best_team.id, incident.id)

# --- Module 5: Shelter Capacity & Safety Constraints ---
def test_shelter_capacity_and_overflow(db_session):
    shelter_small = Shelter(
        name="Primary Relief Camp",
        location_name="Pune Camp",
        latitude=18.52,
        longitude=73.85,
        capacity=50,
        occupancy=40,  # 10 vacancy
        food_stock_days=5.0,
        water_stock_days=5.0,
        medical_stock_level="Good",
        is_accessible=True
    )
    shelter_large = Shelter(
        name="Secondary Regional Center",
        location_name="Pune Outskirts",
        latitude=18.55,
        longitude=73.88,
        capacity=200,
        occupancy=20,  # 180 vacancy
        food_stock_days=8.0,
        water_stock_days=8.0,
        medical_stock_level="Good",
        is_accessible=True
    )
    db_session.add_all([shelter_small, shelter_large])
    db_session.commit()

    # 1. Allocating 8 evacuees fits in small shelter
    allocate_shelter_capacity(db_session, shelter_small.id, evacuee_count=8)
    assert shelter_small.occupancy == 48
    assert shelter_small.vacancy == 2

    # 2. Allocating 10 evacuees to small shelter must raise OvercapacityError
    with pytest.raises(ShelterOvercapacityError):
        allocate_shelter_capacity(db_session, shelter_small.id, evacuee_count=10)

    # 3. Find alternate shelter with needed vacancy
    alt_shelter, dist, expl = find_nearest_available_shelter(
        db_session, lat=18.52, lng=73.85, needed_vacancy=10
    )
    assert alt_shelter.id == shelter_large.id
    assert alt_shelter.vacancy >= 10

    # 4. Inaccessible shelter rejection
    shelter_large.is_accessible = False
    db_session.commit()
    with pytest.raises(ShelterInaccessibleError):
        allocate_shelter_capacity(db_session, shelter_large.id, evacuee_count=10)
