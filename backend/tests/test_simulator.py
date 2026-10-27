import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.database.models import (
    Base, Sensor, Incident, EvacuationRoute, Shelter, Alert, PlanAuditLog
)
from backend.services.simulation_engine import DisasterSimulator
from backend.seed import seed_database

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

def test_simulation_lifecycle_and_events(db_session):
    sim = DisasterSimulator()
    sim.reset(db_session)
    assert sim.tick_count == 0
    assert sim.flood_level_m == 2.4

    # Verify seed data
    sensors = db_session.query(Sensor).all()
    assert len(sensors) >= 4
    initial_incidents = db_session.query(Incident).count()
    assert initial_incidents >= 1

    # Step 1
    res1 = sim.step(db_session)
    assert res1["tick"] == 1
    assert res1["flood_level_m"] > 2.4

    # Step 2
    res2 = sim.step(db_session)
    assert res2["tick"] == 2

    # Step 3 - Flood level >= 4.5m triggers critical incident
    res3 = sim.step(db_session)
    assert res3["tick"] == 3
    crit_inc = db_session.query(Incident).filter(Incident.title.like("%Inundation%")).first()
    assert crit_inc is not None
    assert crit_inc.severity == "Critical"
    assert crit_inc.priority_score >= 70.0

    # Step ticks further until flood level >= 5.0m triggers road closure
    res4 = sim.step(db_session)
    res5 = sim.step(db_session)
    res6 = sim.step(db_session)
    res7 = sim.step(db_session)
    res8 = sim.step(db_session)

    blocked_routes = db_session.query(EvacuationRoute).filter(EvacuationRoute.status == "Blocked").all()
    assert len(blocked_routes) >= 1
    assert "Causeway" in blocked_routes[0].name

    # Check shelter stock reduction and occupancy growth
    shelters = db_session.query(Shelter).all()
    for s in shelters:
        assert s.food_stock_days < 7.0 or s.occupancy > 45

    # Check audit log trail exists
    audit_logs = db_session.query(PlanAuditLog).all()
    assert len(audit_logs) >= 3

    # Reset
    sim.reset(db_session)
    assert sim.tick_count == 0
    assert sim.flood_level_m == 2.4
    causeway = db_session.query(EvacuationRoute).filter(EvacuationRoute.name.like("%Causeway%")).first()
    assert causeway.status == "Safe"
