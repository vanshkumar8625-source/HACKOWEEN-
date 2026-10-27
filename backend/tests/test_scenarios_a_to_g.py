import json
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.database.models import (
    Base, Incident, Resource, RescueTeam, Shelter, EvacuationRoute, Alert, PlanAuditLog
)
from backend.services.resource_service import (
    allocate_resource, InsufficientResourceError
)
from backend.services.team_service import (
    assign_team_to_incident, find_best_team
)
from backend.services.shelter_service import (
    allocate_shelter_capacity, ShelterOvercapacityError, ShelterInaccessibleError
)
from backend.services.routing_service import (
    plan_road_closure_aware_route
)
from backend.services.replanning_service import (
    handle_road_closure_event, handle_shelter_saturation_event, handle_team_unavailable_event
)
from backend.services.priority_service import (
    calculate_priority_score
)

@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()

# -------------------------------------------------------------
# Scenario A: Two incidents compete for one rescue boat.
# Constraint: No double-booking, no negative inventory.
# -------------------------------------------------------------
def test_scenario_a_competing_incidents_for_single_boat(db):
    # Only 1 boat exists in stock
    boat = Resource(
        name="Zodiac Inflatable Rescue Boat",
        resource_type="Boat",
        total_qty=1,
        allocated_qty=0,
        reserved_qty=0,
        unit="boats",
        location_name="Kolhapur Wharf"
    )
    inc1 = Incident(
        title="Submerged Colony Rescue",
        disaster_type="flood",
        severity="Critical",
        location_name="Lowland Ward 1",
        latitude=16.70,
        longitude=74.24
    )
    inc2 = Incident(
        title="Isolated Rooftop Family",
        disaster_type="flood",
        severity="High",
        location_name="Lowland Ward 2",
        latitude=16.71,
        longitude=74.25
    )
    db.add_all([boat, inc1, inc2])
    db.commit()

    # Incident 1 claims the 1 boat
    allocated_res = allocate_resource(db, boat.id, qty=1, incident_id=inc1.id, reason="Ward 1 critical flood rescue")
    assert allocated_res.allocated_qty == 1
    assert allocated_res.available_qty == 0

    # Incident 2 attempts to claim a boat
    with pytest.raises(InsufficientResourceError):
        allocate_resource(db, boat.id, qty=1, incident_id=inc2.id, reason="Ward 2 rooftop rescue")

    # Verify integrity: inventory must NOT be negative, boat must NOT be double-booked
    db.refresh(boat)
    assert boat.allocated_qty == 1
    assert boat.available_qty == 0
    assert boat.total_qty == 1

    # Verify audit trail logs the rejection explaining why
    failed_log = db.query(PlanAuditLog).filter(
        PlanAuditLog.action == "AllocationFailed",
        PlanAuditLog.entity_id == boat.id
    ).first()
    assert failed_log is not None
    assert "Insufficient inventory" in failed_log.reason or "only 0 available" in failed_log.reason

# -------------------------------------------------------------
# Scenario B: A bridge/road becomes blocked after a team is assigned.
# Constraint: No route through a simulated closed road; replanning
# history shows triggering event and old/new plan.
# -------------------------------------------------------------
def test_scenario_b_road_blocked_after_team_assigned(db):
    bridge = EvacuationRoute(
        name="Riverside Bridge Corridor",
        source_lat=18.5200,
        source_lng=73.8500,
        dest_lat=18.5300,
        dest_lng=73.8600,
        distance_km=1.5,
        status="Safe"
    )
    team = RescueTeam(
        name="NDRF Rescue Unit 1",
        specialization="Flood Rescue",
        members_count=10,
        status="Available",
        latitude=18.5200,
        longitude=73.8500,
        contact_number="9999"
    )
    incident = Incident(
        title="Riverside Encampment Rescue",
        disaster_type="flood",
        severity="Critical",
        location_name="North Riverside",
        latitude=18.5300,
        longitude=73.8600,
        status="Active"
    )
    db.add_all([bridge, team, incident])
    db.commit()

    # Assign team
    assign_team_to_incident(db, team.id, incident.id)
    assert team.status == "Dispatched"

    # Bridge becomes blocked by flood surge
    replan_result = handle_road_closure_event(
        db,
        route_id=bridge.id,
        hazard_info="Submerged under 2.8m violent flood water",
        triggered_by="SensorTrigger"
    )
    assert bridge.status == "Blocked"
    assert replan_result["replanned_count"] >= 1

    # Verify route avoidance: plan must NOT route through the closed bridge
    detour_plan = plan_road_closure_aware_route(
        db, bridge.source_lat, bridge.source_lng, bridge.dest_lat, bridge.dest_lng
    )
    assert detour_plan["status"] == "Rerouted"
    assert detour_plan["is_rerouted"] is True
    assert detour_plan["blocked_segment_avoided"]["name"] == "Riverside Bridge Corridor"

    # Confirm replanning history shows triggering event, old plan, and new plan
    replan_log = db.query(PlanAuditLog).filter(
        PlanAuditLog.action == "Replanned",
        PlanAuditLog.entity_id == incident.id
    ).first()
    assert replan_log is not None
    details = json.loads(replan_log.details_json)
    assert "triggering_event" in details
    assert "RoadClosure" in details["triggering_event"]
    assert "old_plan" in details
    assert "new_plan" in details

# -------------------------------------------------------------
# Scenario C: The assigned shelter becomes full.
# Constraint: No over-capacity shelter assignment; replanning history
# shows triggering event, old plan, and new plan.
# -------------------------------------------------------------
def test_scenario_c_assigned_shelter_becomes_full(db):
    shelter_a = Shelter(
        name="Shelter Community Hall",
        location_name="Zone A",
        latitude=18.52,
        longitude=73.85,
        capacity=50,
        occupancy=50,  # 100% full
        is_accessible=True
    )
    shelter_b = Shelter(
        name="Secondary Regional Gymnasium",
        location_name="Zone B",
        latitude=18.55,
        longitude=73.88,
        capacity=200,
        occupancy=20,  # 180 vacancy
        is_accessible=True
    )
    db.add_all([shelter_a, shelter_b])
    db.commit()

    incident = Incident(
        title="Neighborhood Evacuation Batch 1",
        disaster_type="flood",
        severity="High",
        location_name="Zone A Outskirts",
        latitude=18.525,
        longitude=73.855,
        status="Active",
        assigned_shelter_id=shelter_a.id
    )
    db.add(incident)
    db.commit()

    # Attempting to allocate more to full shelter must fail (No overcapacity)
    with pytest.raises(ShelterOvercapacityError):
        allocate_shelter_capacity(db, shelter_a.id, evacuee_count=5)

    assert shelter_a.occupancy == 50  # Enforced cap

    # Trigger saturation event
    sat_res = handle_shelter_saturation_event(db, shelter_a.id)
    assert sat_res["alternate_shelter"] == "Secondary Regional Gymnasium"

    # Confirm incident was diverted to shelter B
    db.refresh(incident)
    assert incident.assigned_shelter_id == shelter_b.id

    # Confirm replanning history shows triggering event, old plan, and new plan
    divert_log = db.query(PlanAuditLog).filter(
        PlanAuditLog.action == "Diverted",
        PlanAuditLog.entity_id == incident.id
    ).first()
    assert divert_log is not None
    details = json.loads(divert_log.details_json)
    assert "triggering_event" in details
    assert "ShelterSaturation" in details["triggering_event"]
    assert "old_plan" in details
    assert "new_plan" in details
    assert "Shelter Community Hall" in details["old_plan"]
    assert "Secondary Regional Gymnasium" in details["new_plan"]

# -------------------------------------------------------------
# Scenario D: Supply inventory drops below the requested quantity.
# Constraint: No negative inventory.
# -------------------------------------------------------------
def test_scenario_d_supply_inventory_drops_below_requested(db):
    med_kits = Resource(
        name="Field Trauma Medical Kits",
        resource_type="Medical",
        total_qty=5,
        allocated_qty=0,
        reserved_qty=0,
        unit="kits",
        location_name="Disaster Clinic Depot"
    )
    db.add(med_kits)
    db.commit()

    # Requested quantity 10 exceeds available 5
    with pytest.raises(InsufficientResourceError):
        allocate_resource(db, med_kits.id, qty=10, reason="Mass casualty dispatch")

    db.refresh(med_kits)
    assert med_kits.allocated_qty == 0
    assert med_kits.available_qty == 5
    assert med_kits.available_qty >= 0  # Zero negative inventory

# -------------------------------------------------------------
# Scenario E: A team becomes unavailable during a response.
# Constraint: Team marked off-duty, incident dynamically reassigned
# to next eligible team; replanning history shows old/new plan.
# -------------------------------------------------------------
def test_scenario_e_team_becomes_unavailable_during_response(db):
    team_disabled = RescueTeam(
        name="SDRF Unit Alpha",
        specialization="Flood Rescue",
        members_count=12,
        status="Available",
        latitude=18.52,
        longitude=73.85,
        contact_number="1111"
    )
    team_standby = RescueTeam(
        name="SDRF Unit Beta (Backup)",
        specialization="Flood Rescue",
        members_count=10,
        status="Available",
        latitude=18.53,
        longitude=73.86,
        contact_number="2222"
    )
    db.add_all([team_disabled, team_standby])
    db.commit()

    incident = Incident(
        title="Stranded Fishermen Rescue",
        disaster_type="flood",
        severity="High",
        location_name="Basin Sector 3",
        latitude=18.525,
        longitude=73.855,
        status="Active",
        required_skill="Flood Rescue"
    )
    db.add(incident)
    db.commit()

    # Assign Unit Alpha
    assign_team_to_incident(db, team_disabled.id, incident.id)
    assert team_disabled.status == "Dispatched"
    assert incident.assigned_team_id == team_disabled.id

    # Unit Alpha suffers engine failure / breakdown
    event_res = handle_team_unavailable_event(
        db,
        team_id=team_disabled.id,
        reason="Boat propeller seized by submerged debris"
    )

    # Unit Alpha is marked Off-Duty
    db.refresh(team_disabled)
    assert team_disabled.status == "Off-Duty"
    assert event_res["reassigned_count"] == 1

    # Incident is reassigned to Unit Beta
    db.refresh(incident)
    assert incident.assigned_team_id == team_standby.id
    db.refresh(team_standby)
    assert team_standby.status == "Dispatched"

    # Confirm replanning history shows triggering event, old plan, and new plan
    replan_log = db.query(PlanAuditLog).filter(
        PlanAuditLog.action == "Replanned_TeamReassigned",
        PlanAuditLog.entity_id == incident.id
    ).first()
    assert replan_log is not None
    details = json.loads(replan_log.details_json)
    assert "triggering_event" in details
    assert "TeamUnavailable" in details["triggering_event"]
    assert "SDRF Unit Alpha" in details["old_plan"]
    assert "SDRF Unit Beta" in details["new_plan"]

# -------------------------------------------------------------
# Scenario F: No feasible plan exists.
# Constraint: System gracefully records unfeasible state and alerts;
# no invalid assignments or crashes.
# -------------------------------------------------------------
def test_scenario_f_no_feasible_plan_exists(db):
    # Only 1 team exists, and it becomes disabled
    lonely_team = RescueTeam(
        name="Sole Regional Hazmat Unit",
        specialization="Hazmat / Fire Control",
        members_count=8,
        status="Available",
        latitude=18.52,
        longitude=73.85,
        contact_number="3333"
    )
    db.add(lonely_team)
    db.commit()

    incident = Incident(
        title="Chlorine Tanker Leak in Floodwaters",
        disaster_type="flood",
        severity="Critical",
        location_name="Industrial Ward",
        latitude=18.52,
        longitude=73.85,
        status="Active",
        required_skill="Hazmat / Fire Control"
    )
    db.add(incident)
    db.commit()

    assign_team_to_incident(db, lonely_team.id, incident.id)

    # Team breaks down and NO backup hazmat team exists in the entire region
    event_res = handle_team_unavailable_event(
        db,
        team_id=lonely_team.id,
        reason="Respirator gear contaminated"
    )

    assert event_res["reassigned_count"] == 0
    assert len(event_res["unassigned_no_feasible_plan"]) == 1

    # Incident returns to Active (queued), assigned_team_id is None
    db.refresh(incident)
    assert incident.assigned_team_id is None
    assert incident.status == "Active"

    # High-priority alert is generated
    alert = db.query(Alert).filter(Alert.alert_type == "Plan Failure").first()
    assert alert is not None
    assert "NO AVAILABLE RESPONSE TEAMS" in alert.message

    # Replan log records NoFeasiblePlan
    no_plan_log = db.query(PlanAuditLog).filter(
        PlanAuditLog.action == "NoFeasiblePlan_TeamUnavailable",
        PlanAuditLog.entity_id == incident.id
    ).first()
    assert no_plan_log is not None
    details = json.loads(no_plan_log.details_json)
    assert "No feasible plan" in details["new_plan"]

# -------------------------------------------------------------
# Scenario G: A new urgent report changes priorities.
# Constraint: Urgent report dynamically leapfrogs lower priority
# incidents in triage queue and claims available assets first.
# -------------------------------------------------------------
def test_scenario_g_urgent_report_changes_priorities(db):
    # Existing standard incident
    score_routine, _ = calculate_priority_score(
        disaster_type="flood",
        severity="Medium",
        description="Waterlogging on minor access lane",
        water_level_m=1.8,
        rainfall_mm=30.0
    )
    inc_routine = Incident(
        title="Minor Street Inundation",
        disaster_type="flood",
        severity="Medium",
        priority_score=score_routine,
        location_name="North Pune",
        latitude=18.54,
        longitude=73.86
    )
    db.add(inc_routine)
    db.commit()

    # New critical urgent report arrives
    score_urgent, _ = calculate_priority_score(
        disaster_type="flood",
        severity="Critical",
        description="Massive levee breach! Trapped pediatric hospital and elderly center, rising water rapid",
        water_level_m=5.8,
        rainfall_mm=190.0
    )
    inc_urgent = Incident(
        title="Critical Levee Breach & Hospital Inundation",
        disaster_type="flood",
        severity="Critical",
        priority_score=score_urgent,
        location_name="Hospital District",
        latitude=18.51,
        longitude=73.84
    )
    db.add(inc_urgent)
    db.commit()

    # Verify urgent incident priority score significantly exceeds routine
    assert inc_urgent.priority_score > inc_routine.priority_score
    assert inc_urgent.priority_score >= 80.0

    # Query incidents ordered by priority_score descending
    ranked_incidents = db.query(Incident).order_by(Incident.priority_score.desc()).all()
    assert ranked_incidents[0].id == inc_urgent.id
    assert ranked_incidents[1].id == inc_routine.id
