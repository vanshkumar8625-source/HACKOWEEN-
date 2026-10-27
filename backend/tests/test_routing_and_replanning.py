import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.database.models import (
    Base, EvacuationRoute, Shelter, Incident, PlanAuditLog, Alert
)
from backend.services.routing_service import (
    plan_road_closure_aware_route, check_route_for_blockages
)
from backend.services.replanning_service import (
    handle_road_closure_event, handle_shelter_saturation_event
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

def test_road_closure_aware_routing(db_session):
    # Setup a route that will become blocked
    route = EvacuationRoute(
        name="Riverside Causeway",
        source_lat=18.5204,
        source_lng=73.8567,
        dest_lat=18.5300,
        dest_lng=73.8600,
        distance_km=1.5,
        status="Safe",
        hazard_info=None
    )
    db_session.add(route)
    db_session.commit()

    # 1. Clear route returns Safe
    plan_clear = plan_road_closure_aware_route(
        db_session,
        source_lat=18.5204,
        source_lng=73.8567,
        dest_lat=18.5300,
        dest_lng=73.8600
    )
    assert plan_clear["status"] == "Safe"
    assert not plan_clear["is_rerouted"]
    assert len(plan_clear["geometry"]) > 0

    # 2. Mark route blocked
    route.status = "Blocked"
    route.hazard_info = "3 meters water overflow"
    db_session.commit()

    # 3. Blocked route returns Rerouted with detour
    plan_detour = plan_road_closure_aware_route(
        db_session,
        source_lat=18.5204,
        source_lng=73.8567,
        dest_lat=18.5300,
        dest_lng=73.8600
    )
    assert plan_detour["status"] == "Rerouted"
    assert plan_detour["is_rerouted"]
    assert plan_detour["blocked_segment_avoided"]["name"] == "Riverside Causeway"
    assert "perimeter detour" in plan_detour["explanation"]

def test_event_triggered_road_closure_replanning(db_session):
    route = EvacuationRoute(
        name="Main Arterial Bridge",
        source_lat=18.5200,
        source_lng=73.8500,
        dest_lat=18.5400,
        dest_lng=73.8700,
        distance_km=3.0,
        status="Safe"
    )
    incident = Incident(
        title="Stranded Citizens Near Bridge",
        disaster_type="flood",
        severity="Critical",
        priority_score=90.0,
        location_name="Bridge Approach",
        latitude=18.5250,
        longitude=73.8550,
        status="In Progress"
    )
    db_session.add_all([route, incident])
    db_session.commit()

    # Trigger road closure event
    result = handle_road_closure_event(
        db_session,
        route_id=route.id,
        hazard_info="Bridge structural failure under flood currents"
    )

    assert result["closed_route"] == "Main Arterial Bridge"
    assert route.status == "Blocked"

    # Verify Alert was generated
    alert = db_session.query(Alert).filter(Alert.alert_type == "Road Blocked").first()
    assert alert is not None
    assert "Main Arterial Bridge" in alert.message

    # Verify Audit log was recorded
    audit_logs = db_session.query(PlanAuditLog).filter(PlanAuditLog.entity_type == "Route").all()
    assert len(audit_logs) >= 1
    assert "RoadClosure" in audit_logs[0].action

def test_event_triggered_shelter_saturation_replanning(db_session):
    shelter_a = Shelter(
        name="Shelter Alpha",
        location_name="Zone A",
        latitude=18.52,
        longitude=73.85,
        capacity=100,
        occupancy=100,  # 100% full
        is_accessible=True
    )
    shelter_b = Shelter(
        name="Shelter Beta",
        location_name="Zone B",
        latitude=18.56,
        longitude=73.89,
        capacity=200,
        occupancy=50,  # 150 vacancy
        is_accessible=True
    )
    db_session.add_all([shelter_a, shelter_b])
    db_session.commit()

    incident = Incident(
        title="Sector 4 Evacuation",
        disaster_type="flood",
        severity="High",
        priority_score=80.0,
        location_name="Sector 4",
        latitude=18.53,
        longitude=73.86,
        status="Active",
        assigned_shelter_id=shelter_a.id
    )
    db_session.add(incident)
    db_session.commit()

    # Trigger saturation event
    sat_result = handle_shelter_saturation_event(db_session, shelter_id=shelter_a.id)

    assert sat_result["saturated_shelter"] == "Shelter Alpha"
    assert sat_result["alternate_shelter"] == "Shelter Beta"
    assert sat_result["diverted_incidents_count"] == 1

    # Verify incident was automatically updated to point to Shelter Beta
    db_session.refresh(incident)
    assert incident.assigned_shelter_id == shelter_b.id

    # Verify audit log was recorded
    divert_log = db_session.query(PlanAuditLog).filter(PlanAuditLog.action == "Diverted").first()
    assert divert_log is not None
    assert "Shelter Beta" in divert_log.reason
