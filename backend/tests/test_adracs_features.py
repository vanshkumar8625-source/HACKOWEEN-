import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from backend.main import app
from backend.database.db import get_db, SessionLocal
from backend.database.models import Incident, RescueTeam, TeamRating, DelayReview, BackupRequest, Notification, Resource
from backend.services.deadline_service import compute_initial_deadline_and_eta
from backend.services.rating_service import calculate_score
from backend.services.recommendation_service import generate_resource_recommendations
from backend.services.ai_assistant_service import handle_assistant_interaction, extract_incident_entities

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

def test_feature_1_deadline_and_eta_calculation():
    """
    Feature 1: Verify deadline & ETA are assigned based on severity and location.
    """
    now = datetime.utcnow()
    # Critical incident at 18.5204, 73.8567
    deadline, eta, travel_min = compute_initial_deadline_and_eta(
        severity="Critical",
        incident_lat=18.5500,
        incident_lng=73.8500,
        created_at=now
    )
    # Critical has 45 mins base + travel buffer
    assert deadline > now + timedelta(minutes=45)
    assert eta > now
    assert travel_min > 0

def test_feature_1_arrival_and_resolution_tracking(client, db):
    """
    Feature 1: Separate tracking of arrival and resolution events.
    """
    # Create test incident
    payload = {
        "title": "Submerged Crossing Rescue",
        "disaster_type": "flood",
        "severity": "High",
        "location_name": "Riverside Crossing",
        "latitude": 18.5204,
        "longitude": 73.8567,
        "description": "Stranded driver on roof of car",
        "people_affected": 1
    }
    create_res = client.post("/api/incidents/", json=payload)
    assert create_res.status_code == 200
    inc_id = create_res.json()["id"]

    # Auto assign team
    assign_res = client.post(f"/api/incidents/{inc_id}/auto-assign-team")
    assert assign_res.status_code == 200

    # 1. Mark Arrival on scene (distinct event)
    arr_res = client.post(f"/api/incidents/{inc_id}/mark-arrival", json={})
    assert arr_res.status_code == 200
    data = arr_res.json()
    assert data["deadline_status"] in ["On-Time", "Delayed"]
    assert data["actual_arrival_at"] is not None

    # Check database state: incident is NOT yet resolved
    inc = db.query(Incident).filter(Incident.id == inc_id).first()
    assert inc.actual_arrival_at is not None
    assert inc.resolved_at is None
    assert inc.status != "Resolved"

    # 2. Mark Rescue Completed (distinct event)
    res_res = client.post(f"/api/incidents/{inc_id}/resolve", json={
        "outcome_notes": "Driver extracted safely via boat.",
        "rating": 5.0
    })
    assert res_res.status_code == 200
    assert res_res.json()["resolved_at"] is not None

    db.refresh(inc)
    assert inc.status == "Resolved"
    assert inc.resolved_at is not None

def test_feature_1_admin_deadline_adjustment(client, db):
    """
    Feature 1: Admin adjusts deadline with recorded justification in audit log.
    """
    inc = db.query(Incident).first()
    new_deadline = (datetime.utcnow() + timedelta(hours=3)).isoformat()
    reason = "Bridge collapsed on primary route; detour required via secondary highway."

    res = client.post(f"/api/incidents/{inc.id}/adjust-deadline", json={
        "new_deadline": new_deadline,
        "reason": reason,
        "adjusted_by": "Chief Commander"
    })
    assert res.status_code == 200
    assert "successfully adjusted" in res.json()["message"]

    db.refresh(inc)
    assert inc.deadline_status == "Extended"
    assert reason in inc.deadline_extended_reason

def test_feature_2_transparent_performance_rating():
    """
    Feature 2: Performance rating formula tests.
    """
    # 1. On-time, successful rescue: High score (5.0)
    score1, r1 = calculate_score(arrived_on_time=True, rescue_successful=True)
    assert score1 >= 4.8

    # 2. Late arrival without exception: Lower score (penalty applied)
    score2, r2 = calculate_score(arrived_on_time=False, rescue_successful=True, is_disaster_exception=False)
    assert score2 <= 3.0

    # 3. Late arrival due to unavoidable disaster exception: Protected score (no unfair penalty)
    score3, r3 = calculate_score(arrived_on_time=False, rescue_successful=True, is_disaster_exception=True)
    assert score3 >= 4.2
    assert "Disaster exception approved" in r3

def test_feature_2_dispute_and_supervisor_review(client, db):
    """
    Feature 2: Team disputes rating and supervisor reviews it.
    """
    team = db.query(RescueTeam).first()
    inc = db.query(Incident).first()
    
    # Create rating directly via database
    rating = TeamRating(
        team_id=team.id,
        incident_id=inc.id,
        rating=2.5,
        arrived_on_time=False,
        rescue_successful=True,
        dispute_status="None"
    )
    db.add(rating)
    db.commit()
    db.refresh(rating)

    # Team files dispute
    disp_res = client.post(f"/api/teams/ratings/{rating.id}/dispute", json={
        "dispute_reason": "Flash flood breached the bypass road; delay was beyond team control."
    })
    assert disp_res.status_code == 200
    assert disp_res.json()["dispute_status"] == "Disputed"

    # Supervisor reviews dispute and adjusts rating
    rev_res = client.post(f"/api/teams/ratings/{rating.id}/review", json={
        "dispute_status": "Reviewed",
        "supervisor_notes": "Hazard confirmed via IoT water sensor; disaster exception approved.",
        "adjusted_rating": 4.5
    })
    assert rev_res.status_code == 200
    assert rev_res.json()["final_rating"] == 4.5

def test_feature_3_delay_accountability_and_restriction(client, db):
    """
    Feature 3: Delayed team submits explanation, admin reviews and applies corrective action.
    """
    team = db.query(RescueTeam).first()
    inc = db.query(Incident).first()

    # Team submits explanation
    exp_res = client.post(f"/api/incidents/{inc.id}/explain-delay", json={
        "reason_category": "Road Blocked",
        "explanation": "Uprooted trees and fallen transmission cables blocked transit for 25 minutes.",
        "team_id": team.id
    })
    assert exp_res.status_code == 200

    # Admin reviews delay and issues corrective action
    rev_res = client.post(f"/api/incidents/{inc.id}/review-delay", json={
        "admin_decision": "Warning",
        "admin_notes": "Advised to utilize advance drone scouting on storm routes.",
        "reviewed_by": "Control Room Lead"
    })
    assert rev_res.status_code == 200
    assert rev_res.json()["admin_decision"] == "Warning"

    # Test Temporary Restriction enforcement
    restrict_res = client.post(f"/api/teams/{team.id}/restriction", json={
        "is_restricted": True,
        "restriction_reason": "Mandatory safety drill required."
    })
    assert restrict_res.status_code == 200
    assert restrict_res.json()["is_restricted"] is True

    # Unrestrict team
    unrestrict_res = client.post(f"/api/teams/{team.id}/restriction", json={
        "is_restricted": False
    })
    assert unrestrict_res.status_code == 200
    assert unrestrict_res.json()["is_restricted"] is False

def test_feature_4_backup_request_and_assignment(client, db):
    """
    Feature 4: Request backup assistance, resource allocation, and team handover.
    """
    teams = db.query(RescueTeam).all()
    primary_team = teams[0]
    backup_team = teams[1]
    inc = db.query(Incident).first()

    # 1. Primary team requests backup
    req_res = client.post("/api/backup-requests/", json={
        "incident_id": inc.id,
        "requesting_team_id": primary_team.id,
        "location_name": inc.location_name,
        "latitude": inc.latitude,
        "longitude": inc.longitude,
        "reason": "Water currents too rapid for single boat; need second winch boat.",
        "assistance_type": "Specialized Extraction",
        "required_resources": ["Inflatable Motorized Rescue Boats"],
        "personnel_needed": 3,
        "urgency": "High",
        "handover_type": "Partial"
    })
    assert req_res.status_code == 200
    req_id = req_res.json()["id"]

    # 2. Coordinator assigns backup team
    assign_res = client.post(f"/api/backup-requests/{req_id}/assign", json={
        "assigned_backup_team_id": backup_team.id,
        "handover_type": "Partial",
        "eta_minutes": 14.0
    })
    assert assign_res.status_code == 200
    assert assign_res.json()["assigned_backup_team"] == backup_team.name

    # 3. Update backup status
    status_res = client.post(f"/api/backup-requests/{req_id}/status?status=On%20Scene")
    assert status_res.status_code == 200
    assert status_res.json()["status"] == "On Scene"

def test_feature_5_ai_emergency_assistant(client, db):
    """
    Feature 5: Conversational AI and Voice Reporting in English & Hindi.
    """
    # 1. Hindi voice report extraction test
    hindi_voice_text = "Main flood mein phansa hua hoon. Mere paas teen log hain. Humein medical help chahiye. Hamari location Shivaji Nagar."
    chat_res = client.post("/api/ai-assistant/chat", json={
        "message": hindi_voice_text,
        "language": "hi",
        "is_voice": True
    })
    assert chat_res.status_code == 200
    data = chat_res.json()
    assert data["can_submit"] is True
    assert data["extracted_data"]["disaster_type"] == "flood"
    assert data["extracted_data"]["people_affected"] == 3
    assert data["extracted_data"]["has_injuries"] is True
    assert "Shivaji Nagar" in data["extracted_data"]["location_name"]

    # 2. Direct intake submission from AI assistant
    submit_res = client.post("/api/ai-assistant/submit-voice-report", json={
        "title": data["extracted_data"]["title"],
        "disaster_type": data["extracted_data"]["disaster_type"],
        "severity": data["extracted_data"]["severity"],
        "location_name": data["extracted_data"]["location_name"],
        "latitude": data["extracted_data"]["latitude"],
        "longitude": data["extracted_data"]["longitude"],
        "description": "Voice SOS transcript confirmed by citizen",
        "people_affected": data["extracted_data"]["people_affected"],
        "casualties_count": data["extracted_data"]["casualties_count"],
        "voice_transcript": hindi_voice_text,
        "reported_by": "Citizen Voice SOS"
    })
    assert submit_res.status_code == 200
    created_id = submit_res.json()["id"]
    assert submit_res.json()["deadline_at"] is not None

    # 3. Status lookup for existing incident
    status_res = client.get(f"/api/ai-assistant/status/INC-{created_id:04d}")
    assert status_res.status_code == 200
    assert status_res.json()["incident_id"] == created_id
    assert status_res.json()["status"] == "Active"

def test_feature_6_grounded_resource_recommendations(client, db):
    """
    Feature 6: Recommendations grounded in database stock with confirmed availability.
    """
    inc = db.query(Incident).filter(Incident.disaster_type == "flood").first()
    res = client.get(f"/api/incidents/{inc.id}/recommendations")
    assert res.status_code == 200
    recs = res.json()["recommendations"]
    assert len(recs) > 0
    # Must specify whether resource is available in stock or not
    for r in recs:
        assert "is_available" in r
        assert "available_qty" in r
        assert "recommended_qty" in r

def test_feature_7_unified_notifications(client, db):
    """
    Feature 7: Real-time notification feed and mark-read operations.
    """
    notifs_res = client.get("/api/notifications/")
    assert notifs_res.status_code == 200
    notifs = notifs_res.json()
    assert len(notifs) > 0

    first_id = notifs[0]["id"]
    read_res = client.post(f"/api/notifications/{first_id}/read")
    assert read_res.status_code == 200
    assert read_res.json()["id"] == first_id
