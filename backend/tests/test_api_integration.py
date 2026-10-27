import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.database.db import SessionLocal
from backend.seed import seed_database

@pytest.fixture(scope="module")
def client():
    # Setup test database state
    db = SessionLocal()
    seed_database(db)
    db.close()
    
    with TestClient(app) as c:
        yield c

def test_health_and_root(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

    root_res = client.get("/")
    assert root_res.status_code == 200
    assert "Dynamic Emergency" in root_res.json()["system"]

def test_incident_intake_and_priority_scoring(client):
    payload = {
        "title": "Riverside Hospital Cutoff Flooding",
        "disaster_type": "flood",
        "severity": "Critical",
        "location_name": "Pune Riverside",
        "latitude": 18.5204,
        "longitude": 73.8567,
        "description": "Rising water entering hospital ground floor. 30 patients trapped.",
        "reported_by": "Hospital Staff",
        "required_skill": "Flood Rescue"
    }
    res = client.post("/api/incidents/", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["id"] is not None
    assert data["severity"] == "Critical"
    assert data["priority_score"] >= 75.0
    assert "priority_breakdown" in data

    # Test auto-assign team
    assign_res = client.post(f"/api/incidents/{data['id']}/auto-assign-team")
    assert assign_res.status_code == 200
    assert "Flood" in assign_res.json()["explanation"]

def test_shared_resource_allocation(client):
    # Fetch resources
    res_list = client.get("/api/resources/")
    assert res_list.status_code == 200
    resources = res_list.json()
    assert len(resources) > 0

    boat_res = next(r for r in resources if r["resource_type"] == "Boat")
    prev_avail = boat_res["available_qty"]

    # Allocate 2 boats
    alloc_res = client.post("/api/resources/allocate", json={
        "resource_id": boat_res["id"],
        "qty": 2,
        "reason": "Test mission allocation"
    })
    assert alloc_res.status_code == 200
    assert alloc_res.json()["available_qty"] == prev_avail - 2

    # Over-allocation must return 400
    fail_res = client.post("/api/resources/allocate", json={
        "resource_id": boat_res["id"],
        "qty": 9999,
        "reason": "Excessive allocation"
    })
    assert fail_res.status_code == 400

def test_shelter_capacity_checks(client):
    shelters = client.get("/api/shelters/").json()
    shelter = shelters[0]

    # Valid evacuation
    evac_res = client.post("/api/shelters/evacuate", json={
        "shelter_id": shelter["id"],
        "evacuee_count": 10
    })
    assert evac_res.status_code == 200
    assert evac_res.json()["occupancy"] == shelter["occupancy"] + 10

    # Overcapacity evacuation
    fail_evac = client.post("/api/shelters/evacuate", json={
        "shelter_id": shelter["id"],
        "evacuee_count": 99999
    })
    assert fail_evac.status_code == 400

def test_route_closure_and_replanning(client):
    routes = client.get("/api/routes/").json()
    causeway = next(r for r in routes if "Causeway" in r["name"])

    # Mark blocked
    block_res = client.post(f"/api/routes/{causeway['id']}/status", json={
        "status": "Blocked",
        "hazard_info": "Submerged by 2.5m flash flood water"
    })
    assert block_res.status_code == 200
    assert block_res.json()["status"] == "Blocked"
    assert "replanning_result" in block_res.json()

def test_simulation_controls(client):
    # Step simulation
    step_res = client.post("/api/simulation/control", json={"action": "step"})
    assert step_res.status_code == 200
    assert step_res.json()["step_result"]["tick"] >= 1

    # Status
    status_res = client.get("/api/simulation/status")
    assert status_res.status_code == 200
    assert status_res.json()["flood_level_m"] > 0.0

    # Reset
    reset_res = client.post("/api/simulation/control", json={"action": "reset"})
    assert reset_res.status_code == 200
    assert reset_res.json()["tick"] == 0

def test_audit_logs_contain_records(client):
    # Perform an action that logs an event
    client.post("/api/resources/allocate", json={
        "resource_id": 1,
        "qty": 1,
        "reason": "Audit verification allocation"
    })

    logs_res = client.get("/api/audit-logs/")
    assert logs_res.status_code == 200
    logs = logs_res.json()
    assert len(logs) >= 2
    # Check each log has explanation
    for l in logs:
        assert l["reason"] is not None
