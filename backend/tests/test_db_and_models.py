import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.database.models import (
    Base, User, Incident, Resource, RescueTeam, Shelter, EvacuationRoute, Sensor, Alert, PlanAuditLog
)

@pytest.fixture
def db_session():
    # Use SQLite in-memory for testing
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()

def test_models_creation_and_properties(db_session):
    # 1. Test Resource available_qty calculation
    res = Resource(
        name="Emergency Drinking Water",
        resource_type="Water",
        total_qty=1000,
        allocated_qty=200,
        reserved_qty=100,
        unit="liters",
        location_name="Central Depot",
        latitude=18.52,
        longitude=73.85
    )
    db_session.add(res)
    db_session.commit()
    db_session.refresh(res)
    assert res.available_qty == 700

    # 2. Test Shelter vacancy & occupancy_rate calculation
    shelter = Shelter(
        name="Pune Community Stadium",
        location_name="Pune",
        latitude=18.53,
        longitude=73.86,
        capacity=500,
        occupancy=150,
        food_stock_days=6.5,
        water_stock_days=5.0,
        medical_stock_level="Good",
        is_accessible=True
    )
    db_session.add(shelter)
    db_session.commit()
    db_session.refresh(shelter)
    assert shelter.vacancy == 350
    assert shelter.occupancy_rate == 30.0

    # 3. Test RescueTeam and Incident assignment relationship
    team = RescueTeam(
        name="NDRF Alpha 1",
        specialization="Flood Rescue",
        members_count=15,
        status="Available",
        latitude=18.52,
        longitude=73.85,
        contact_number="+91-9876543210"
    )
    db_session.add(team)
    db_session.commit()

    incident = Incident(
        title="Riverside Flash Flood Evacuation",
        disaster_type="flood",
        severity="Critical",
        priority_score=88.5,
        priority_breakdown='{"urgency": 90, "severity": 95, "vulnerability": 80}',
        location_name="Pune Riverside",
        latitude=18.52,
        longitude=73.85,
        status="In Progress",
        reported_by="IoT Water Sensor 4",
        required_skill="Flood Rescue",
        assigned_team_id=team.id,
        assigned_shelter_id=shelter.id
    )
    db_session.add(incident)
    db_session.commit()
    db_session.refresh(incident)

    assert incident.assigned_team.name == "NDRF Alpha 1"
    assert incident.assigned_shelter.name == "Pune Community Stadium"
    assert len(team.assigned_incidents) == 1

    # 4. Test PlanAuditLog creation
    audit = PlanAuditLog(
        entity_type="Incident",
        entity_id=incident.id,
        action="Assigned",
        reason="Assigned NDRF Alpha 1 based on specialization and proximity",
        triggered_by="Coordinator"
    )
    db_session.add(audit)
    db_session.commit()
    assert audit.id is not None
