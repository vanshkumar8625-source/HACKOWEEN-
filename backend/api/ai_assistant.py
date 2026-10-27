import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from backend.database.db import get_db
from backend.database.models import Incident
from backend.schemas import (
    AIAssistantChatRequest, AIAssistantChatResponse, IncidentCreate, IncidentResponse
)
from backend.services.ai_assistant_service import handle_assistant_interaction
from backend.services.priority_service import calculate_priority_score
from backend.services.deadline_service import compute_initial_deadline_and_eta
from backend.services.notification_service import create_notification
from backend.services.audit_service import log_event
from backend.socket_server.server import broadcast_event

router = APIRouter()

@router.post("/chat", response_model=AIAssistantChatResponse)
def assistant_chat(
    payload: AIAssistantChatRequest,
    db: Session = Depends(get_db)
):
    """
    Requirement 5: Conversational AI Emergency Assistant with voice & text reporting.
    Extracts disaster type, location, affected count, injuries, and needed skills in English & Hindi.
    """
    result = handle_assistant_interaction(
        db=db,
        message=payload.message,
        language=payload.language or "en",
        context_incident_id=payload.context_incident_id
    )
    return result

@router.post("/submit-voice-report", response_model=IncidentResponse)
async def submit_voice_report(
    payload: IncidentCreate,
    db: Session = Depends(get_db)
):
    """
    Requirement 5: Confirms and submits the extracted emergency report into the active backend.
    Returns reference number, priority score, and response deadline.
    """
    score, breakdown = calculate_priority_score(
        disaster_type=payload.disaster_type,
        severity=payload.severity,
        description=payload.description or payload.voice_transcript or ""
    )

    now = datetime.utcnow()
    deadline_at, eta_at, travel_min = compute_initial_deadline_and_eta(
        severity=payload.severity,
        incident_lat=payload.latitude,
        incident_lng=payload.longitude,
        created_at=now
    )

    incident = Incident(
        title=payload.title,
        disaster_type=payload.disaster_type,
        severity=payload.severity,
        priority_score=score,
        priority_breakdown=breakdown,
        location_name=payload.location_name,
        latitude=payload.latitude,
        longitude=payload.longitude,
        description=payload.description or f"Voice report: {payload.voice_transcript or ''}",
        status="Active",
        reported_by=payload.reported_by or "Citizen Voice SOS",
        required_skill=payload.required_skill or "General Rescue",
        required_supplies_json=json.dumps(payload.required_supplies or {}),
        casualties_count=payload.casualties_count or 0,
        people_affected=payload.people_affected or 1,
        voice_transcript=payload.voice_transcript,
        deadline_at=deadline_at,
        estimated_arrival_at=eta_at,
        deadline_status="Pending",
        created_at=now
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)

    log_event(
        db=db,
        entity_type="Incident",
        entity_id=incident.id,
        action="VoiceReportSubmitted",
        reason=f"Citizen Voice SOS generated Incident #{incident.id} '{incident.title}'. Priority: {score}/100. Response deadline: {deadline_at.strftime('%H:%M:%S')}.",
        details={"voice_transcript": payload.voice_transcript, "severity": incident.severity},
        triggered_by="CitizenVoiceAssistant"
    )

    await create_notification(
        db=db,
        title=f"🗣️ Voice SOS: Incident #{incident.id}",
        message=f"{incident.severity} {incident.disaster_type} reported via voice at {incident.location_name}. {incident.people_affected} person(s).",
        category="NewReport",
        severity="Critical" if incident.severity == "Critical" else "Warning",
        incident_id=incident.id
    )

    await broadcast_event("incident_created", {
        "id": incident.id,
        "title": incident.title,
        "disaster_type": incident.disaster_type,
        "severity": incident.severity,
        "priority_score": incident.priority_score,
        "latitude": incident.latitude,
        "longitude": incident.longitude,
        "status": incident.status,
        "deadline_at": incident.deadline_at.isoformat()
    })

    return incident

@router.get("/status/{ref}")
def check_status_by_ref(
    ref: str,
    db: Session = Depends(get_db)
):
    """
    Requirement 5: Public status check by ID or reference code (e.g. INC-0001 or 1).
    Guarantees no false dispatch claims.
    """
    clean = ref.replace("INC-", "").replace("inc-", "").replace("#", "").strip()
    try:
        inc_id = int(clean)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid reference code format. Use e.g. INC-0001 or #1.")

    inc = db.query(Incident).filter(Incident.id == inc_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found.")

    return {
        "incident_id": inc.id,
        "reference": f"INC-{inc.id:04d}",
        "title": inc.title,
        "status": inc.status,
        "severity": inc.severity,
        "location_name": inc.location_name,
        "assigned_team": inc.assigned_team.name if inc.assigned_team else "Pending Dispatch",
        "team_status": inc.assigned_team.status if inc.assigned_team else None,
        "estimated_arrival": inc.estimated_arrival_at.strftime("%H:%M:%S") if inc.estimated_arrival_at else "Calculating...",
        "response_deadline": inc.deadline_at.strftime("%H:%M:%S") if inc.deadline_at else "Standard Triage",
        "deadline_status": inc.deadline_status,
        "actual_arrival_at": inc.actual_arrival_at.strftime("%H:%M:%S") if inc.actual_arrival_at else None,
        "resolved_at": inc.resolved_at.strftime("%H:%M:%S") if inc.resolved_at else None
    }
