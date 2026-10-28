import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from backend.database.db import get_db
from backend.database.models import Incident, RescueTeam, Shelter, DelayReview
from backend.schemas import (
    IncidentCreate, IncidentUpdate, IncidentResponse,
    IncidentDeadlineAdjustRequest, IncidentArrivalRequest, IncidentResolveRequest,
    DelayExplanationRequest, DelayReviewDecisionRequest, DelayReviewResponse,
    ResourceRecommendationResponse
)
from backend.services.priority_service import calculate_priority_score
from backend.services.team_service import find_best_team, assign_team_to_incident
from backend.services.shelter_service import find_nearest_available_shelter, allocate_shelter_capacity
from backend.services.deadline_service import (
    compute_initial_deadline_and_eta, check_and_flag_delayed_incidents, adjust_incident_deadline
)
from backend.services.rating_service import record_incident_team_rating
from backend.services.recommendation_service import generate_resource_recommendations
from backend.services.notification_service import create_notification
from backend.services.audit_service import log_event
from backend.socket_server.server import broadcast_event

router = APIRouter()

@router.post("/", response_model=IncidentResponse)
async def create_incident(
    payload: IncidentCreate,
    db: Session = Depends(get_db)
):
    """
    Intake, strict Pydantic validation, explainable priority scoring,
    and automatic assignment of response deadline based on severity & location.
    """
    score, breakdown = calculate_priority_score(
        disaster_type=payload.disaster_type,
        severity=payload.severity,
        description=payload.description or ""
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
        description=payload.description,
        status="Active",
        reported_by=payload.reported_by or "Citizen",
        required_skill=payload.required_skill or "General Rescue",
        required_supplies_json=json.dumps(payload.required_supplies or {}),
        casualties_count=payload.casualties_count or 0,
        people_affected=payload.people_affected or 1,
        voice_transcript=payload.voice_transcript,
        media_url=payload.media_url,
        media_type=payload.media_type,
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
        action="IncidentReported",
        reason=f"New incident '{incident.title}' reported. Score: {score}/100. Response deadline set to {deadline_at.strftime('%H:%M:%S')} (travel buffer: ~{travel_min}m).",
        details={"severity": incident.severity, "priority_score": score, "deadline_at": deadline_at.isoformat()},
        triggered_by=incident.reported_by
    )

    # Control room notification
    await create_notification(
        db=db,
        title=f"🚨 New Incident #{incident.id}: {incident.title}",
        message=f"{incident.severity} severity {incident.disaster_type} at {incident.location_name}. Response deadline: {deadline_at.strftime('%H:%M:%S')}.",
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

@router.get("/", response_model=List[IncidentResponse])
async def list_incidents(
    status: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    # Dynamically verify if any active incident passed deadline
    await check_and_flag_delayed_incidents(db)

    query = db.query(Incident)
    if status:
        query = query.filter(Incident.status == status)
    # Order by priority score descending (highest priority first)
    return query.order_by(Incident.priority_score.desc(), Incident.created_at.desc()).limit(limit).all()

@router.get("/{id}", response_model=IncidentResponse)
async def get_incident(id: int, db: Session = Depends(get_db)):
    await check_and_flag_delayed_incidents(db)
    inc = db.query(Incident).filter(Incident.id == id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    return inc

@router.get("/{id}/recommendations")
def get_incident_recommendations(id: int, db: Session = Depends(get_db)):
    """
    Requirement 6: Returns grounded resource recommendations connecting incident details
    to verified real-time database stock.
    """
    inc = db.query(Incident).filter(Incident.id == id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    recommendations = generate_resource_recommendations(db, inc)
    return {
        "incident_id": inc.id,
        "severity": inc.severity,
        "recommendations": recommendations
    }

@router.post("/{id}/mark-arrival")
async def mark_team_arrival(
    id: int,
    payload: IncidentArrivalRequest,
    db: Session = Depends(get_db)
):
    """
    Requirement 1: Records actual team arrival time as a distinct event from rescue completion.
    Marks response as on-time or delayed against deadline.
    """
    inc = db.query(Incident).filter(Incident.id == id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    arrival_time = payload.actual_arrival_at or datetime.utcnow()
    inc.actual_arrival_at = arrival_time

    # Evaluate on-time status
    if inc.deadline_at:
        if arrival_time <= inc.deadline_at:
            inc.deadline_status = "On-Time"
        else:
            inc.deadline_status = "Delayed"
    else:
        inc.deadline_status = "On-Time"

    # Update assigned team status to On Scene
    if inc.assigned_team:
        inc.assigned_team.status = "On Scene"

    db.commit()
    db.refresh(inc)

    log_event(
        db=db,
        entity_type="Incident",
        entity_id=inc.id,
        action="TeamArrived",
        reason=f"Team arrived at Incident #{inc.id} at {arrival_time.strftime('%H:%M:%S')}. Response classified as: {inc.deadline_status}.",
        details={"actual_arrival_at": arrival_time.isoformat(), "deadline_status": inc.deadline_status},
        triggered_by="FieldResponder"
    )

    await create_notification(
        db=db,
        title=f"📍 Team On Scene: Incident #{inc.id}",
        message=f"Rescue team reached '{inc.title}' ({inc.deadline_status}). Commencing extraction.",
        category="StatusChange",
        severity="Info",
        incident_id=inc.id,
        team_id=inc.assigned_team_id
    )

    await broadcast_event("team_arrived", {
        "incident_id": inc.id,
        "arrival_time": arrival_time.isoformat(),
        "deadline_status": inc.deadline_status
    })

    return {
        "message": f"Arrival recorded. Response status: {inc.deadline_status}",
        "actual_arrival_at": arrival_time,
        "deadline_status": inc.deadline_status
    }

@router.post("/{id}/resolve")
async def resolve_incident(
    id: int,
    payload: IncidentResolveRequest,
    db: Session = Depends(get_db)
):
    """
    Requirement 1 & 2: Marks rescue work completed as a separate event from arrival.
    Calculates and awards transparent 5-star performance rating to rescue team.
    """
    inc = db.query(Incident).filter(Incident.id == id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    resolve_time = payload.resolved_at or datetime.utcnow()
    inc.resolved_at = resolve_time
    inc.status = "Resolved"

    # Check if arrived on time
    arrived_on_time = (inc.deadline_status == "On-Time" or (inc.deadline_at and inc.actual_arrival_at and inc.actual_arrival_at <= inc.deadline_at))

    # Evaluate team rating
    rating_record = None
    if inc.assigned_team_id:
        rating_record = await record_incident_team_rating(
            db=db,
            team_id=inc.assigned_team_id,
            incident_id=inc.id,
            arrived_on_time=arrived_on_time,
            rescue_successful=True,
            outcome_notes=payload.outcome_notes,
            is_disaster_exception=payload.is_disaster_exception or False,
            rated_by="System & Field Supervisor"
        )
        # Release team back to Available
        inc.assigned_team.status = "Available"

    db.commit()
    db.refresh(inc)

    log_event(
        db=db,
        entity_type="Incident",
        entity_id=inc.id,
        action="RescueCompleted",
        reason=f"Incident #{inc.id} '{inc.title}' resolved successfully at {resolve_time.strftime('%H:%M:%S')}. Team awarded {rating_record.rating if rating_record else 5.0}★.",
        details={"resolved_at": resolve_time.isoformat(), "rating": rating_record.rating if rating_record else 5.0},
        triggered_by="Supervisor"
    )

    await create_notification(
        db=db,
        title=f"✅ Rescue Completed: Incident #{inc.id}",
        message=f"Victims secured for '{inc.title}'. Team scored {rating_record.rating if rating_record else 5.0}★.",
        category="RescueCompleted",
        severity="Info",
        incident_id=inc.id,
        team_id=inc.assigned_team_id
    )

    await broadcast_event("incident_resolved", {
        "incident_id": inc.id,
        "resolved_at": resolve_time.isoformat(),
        "rating": rating_record.rating if rating_record else 5.0
    })

    return {
        "message": f"Incident #{inc.id} successfully resolved.",
        "resolved_at": resolve_time,
        "team_rating": rating_record.rating if rating_record else 5.0
    }

@router.post("/{id}/adjust-deadline")
async def adjust_deadline(
    id: int,
    payload: IncidentDeadlineAdjustRequest,
    db: Session = Depends(get_db)
):
    """
    Requirement 1: Authorized administrators can adjust deadlines when conditions change,
    recording the mandatory justification in audit logs.
    """
    try:
        updated = await adjust_incident_deadline(
            db=db,
            incident_id=id,
            new_deadline=payload.new_deadline,
            reason=payload.reason,
            adjusted_by=payload.adjusted_by or "Administrator"
        )
        return {
            "message": "Deadline successfully adjusted.",
            "incident_id": updated.id,
            "new_deadline": updated.deadline_at,
            "reason": updated.deadline_extended_reason
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{id}/explain-delay")
async def explain_delay(
    id: int,
    payload: DelayExplanationRequest,
    db: Session = Depends(get_db)
):
    """
    Requirement 3: When a deadline is missed, the assigned team submits their operational reason
    (e.g., blocked roads, severe weather, equipment failure).
    """
    inc = db.query(Incident).filter(Incident.id == id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    team_id = payload.team_id or inc.assigned_team_id
    if not team_id:
        raise HTTPException(status_code=400, detail="No team assigned to this incident.")

    delay_mins = 0.0
    if inc.deadline_at:
        now = datetime.utcnow()
        delay_mins = max(1.0, round((now - inc.deadline_at).total_seconds() / 60.0, 1))

    review_entry = DelayReview(
        incident_id=inc.id,
        team_id=team_id,
        delay_minutes=delay_mins,
        reason_category=payload.reason_category,
        explanation=payload.explanation,
        admin_decision="Pending"
    )
    db.add(review_entry)

    inc.delay_reason = payload.explanation
    inc.delay_category = payload.reason_category
    inc.delay_reviewed = False
    db.commit()
    db.refresh(review_entry)

    log_event(
        db=db,
        entity_type="Incident",
        entity_id=inc.id,
        action="DelayExplanationSubmitted",
        reason=f"Team submitted delay explanation for Incident #{inc.id}. Category: {payload.reason_category}. Reason: {payload.explanation}",
        triggered_by=f"Team-{team_id}"
    )

    await create_notification(
        db=db,
        title=f"📋 Delay Explanation: Incident #{inc.id}",
        message=f"Team reported delay reason '{payload.reason_category}': {payload.explanation[:80]}... Review required.",
        category="MissedDeadline",
        severity="Warning",
        incident_id=inc.id,
        team_id=team_id
    )

    return {
        "message": "Delay explanation logged. Awaiting control room review.",
        "review_id": review_entry.id,
        "delay_minutes": delay_mins
    }

@router.post("/{id}/review-delay")
async def review_delay(
    id: int,
    payload: DelayReviewDecisionRequest,
    db: Session = Depends(get_db)
):
    """
    Requirement 3: Administrator reviews the team's delay explanation and records
    the final decision and any corrective action (Warning, Training, Temporary Restriction).
    """
    inc = db.query(Incident).filter(Incident.id == id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    review_entry = db.query(DelayReview).filter(
        DelayReview.incident_id == inc.id
    ).order_by(DelayReview.created_at.desc()).first()

    if not review_entry:
        raise HTTPException(status_code=400, detail="No pending delay review found for this incident.")

    review_entry.admin_decision = payload.admin_decision
    review_entry.admin_notes = payload.admin_notes
    review_entry.reviewed_by = payload.reviewed_by or "Admin Commander"
    review_entry.updated_at = datetime.utcnow()

    inc.delay_reviewed = True

    # If temporary restriction approved, restrict team from new dispatches
    team = db.query(RescueTeam).filter(RescueTeam.id == review_entry.team_id).first()
    if team and payload.admin_decision == "Temporary Restriction":
        team.is_restricted = True
        team.restriction_reason = f"Restricted post Incident #{inc.id}: {payload.admin_notes or 'Unjustified delay failure'}"

    db.commit()

    log_event(
        db=db,
        entity_type="Incident",
        entity_id=inc.id,
        action="DelayDecisionRecorded",
        reason=f"Admin completed delay review for Incident #{inc.id}. Decision: '{payload.admin_decision}'. Notes: {payload.admin_notes}",
        triggered_by=review_entry.reviewed_by
    )

    await create_notification(
        db=db,
        title=f"⚖️ Delay Review Completed: Team #{review_entry.team_id}",
        message=f"Admin decision for Incident #{inc.id}: {payload.admin_decision}.",
        category="StatusChange",
        severity="Info",
        incident_id=inc.id,
        team_id=review_entry.team_id
    )

    return {
        "message": f"Decision '{payload.admin_decision}' recorded.",
        "incident_id": inc.id,
        "admin_decision": payload.admin_decision
    }

@router.post("/{id}/auto-assign-team")
async def auto_assign_team(id: int, db: Session = Depends(get_db)):
    """
    Module 4 & Requirement 1: Selects optimal team, enforces restriction checks,
    and updates incident ETA and timeline.
    """
    inc = db.query(Incident).filter(Incident.id == id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    team, dist, explanation = find_best_team(
        db, inc.latitude, inc.longitude, required_skill=inc.required_skill
    )
    if not team:
        raise HTTPException(status_code=400, detail="No eligible rescue teams available (all deployed or restricted).")

    assigned_team = assign_team_to_incident(db, team.id, inc.id)

    await create_notification(
        db=db,
        title=f"🚒 Team Dispatched: {assigned_team.name}",
        message=f"Dispatched to '{inc.title}' at {inc.location_name}. Distance: {dist} km.",
        category="TeamAssignment",
        severity="Info",
        incident_id=inc.id,
        team_id=assigned_team.id
    )

    await broadcast_event("team_dispatched", {
        "incident_id": inc.id,
        "team_id": assigned_team.id,
        "team_name": assigned_team.name,
        "distance_km": dist,
        "estimated_arrival_at": inc.estimated_arrival_at.isoformat() if inc.estimated_arrival_at else None
    })

    return {
        "message": f"Assigned {assigned_team.name} to {inc.title}",
        "team_id": assigned_team.id,
        "distance_km": dist,
        "estimated_arrival_at": inc.estimated_arrival_at,
        "explanation": explanation
    }

@router.post("/{id}/evacuate-to-shelter")
async def evacuate_incident_victims(
    id: int,
    evacuee_count: int = Query(..., gt=0),
    shelter_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Enforces deterministic shelter capacity and accessibility constraints.
    """
    inc = db.query(Incident).filter(Incident.id == id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    if shelter_id:
        target_shelter = db.query(Shelter).filter(Shelter.id == shelter_id).first()
    else:
        target_shelter, dist, expl = find_nearest_available_shelter(db, inc.latitude, inc.longitude, evacuee_count)

    if not target_shelter:
        raise HTTPException(status_code=400, detail="No accessible shelter with required capacity found.")

    try:
        updated_shelter = allocate_shelter_capacity(db, target_shelter.id, evacuee_count, incident_id=inc.id)
        await broadcast_event("shelter_updated", {
            "shelter_id": updated_shelter.id,
            "occupancy": updated_shelter.occupancy,
            "vacancy": updated_shelter.vacancy
        })
        return {
            "message": f"Allocated {evacuee_count} evacuees to {updated_shelter.name}.",
            "shelter_id": updated_shelter.id,
            "current_occupancy": updated_shelter.occupancy,
            "vacancy": updated_shelter.vacancy
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
