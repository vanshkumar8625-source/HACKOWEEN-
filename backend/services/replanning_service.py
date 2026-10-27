from typing import List, Dict, Any
from sqlalchemy.orm import Session
from backend.database.models import Incident, EvacuationRoute, Shelter, RescueTeam, Alert
from backend.services.routing_service import plan_road_closure_aware_route
from backend.services.shelter_service import find_nearest_available_shelter
from backend.services.audit_service import log_event

def handle_road_closure_event(
    db: Session,
    route_id: int,
    hazard_info: str = "Severe flooding",
    triggered_by: str = "SensorMonitor"
) -> Dict[str, Any]:
    """
    Module 7 Event Trigger: Road closure detected.
    Marks route as Blocked and automatically replans active missions traversing that sector.
    """
    route = db.query(EvacuationRoute).filter(EvacuationRoute.id == route_id).first()
    if not route:
        raise ValueError(f"EvacuationRoute #{route_id} not found.")

    prev_status = route.status
    route.status = "Blocked"
    route.hazard_info = hazard_info
    db.commit()

    # Log initial closure event
    log_event(
        db=db,
        entity_type="Route",
        entity_id=route.id,
        action="RoadClosure",
        reason=f"Evacuation corridor '{route.name}' marked BLOCKED. Hazard: {hazard_info}",
        details={"previous_status": prev_status, "hazard_info": hazard_info},
        triggered_by=triggered_by
    )

    # Create system alert
    alert = Alert(
        message=f"CRITICAL ROAD CLOSURE: {route.name} is BLOCKED due to {hazard_info}.",
        severity="Critical",
        alert_type="Road Blocked",
        location_name=route.name,
        is_active=True
    )
    db.add(alert)
    db.commit()

    # Find affected active incidents
    affected_incidents = db.query(Incident).filter(
        Incident.status.in_(["Active", "In Progress"])
    ).all()

    replanned_incidents = []
    for inc in affected_incidents:
        # Check if route to assigned shelter or team passes near blocked route
        new_plan = plan_road_closure_aware_route(
            db=db,
            source_lat=route.source_lat,
            source_lng=route.source_lng,
            dest_lat=inc.latitude,
            dest_lng=inc.longitude
        )

        if new_plan["is_rerouted"]:
            log_event(
                db=db,
                entity_type="Incident",
                entity_id=inc.id,
                action="Replanned",
                reason=f"Dynamic replan executed for Incident #{inc.id} ({inc.title}): Detour around '{route.name}'.",
                details={
                    "triggering_event": f"RoadClosure ({route.name} blocked due to {hazard_info})",
                    "old_plan": f"Primary direct route across {route.name}",
                    "new_plan": f"Perimeter detour ({new_plan['distance_km']} km, {new_plan['duration_min']} min) avoiding {route.name}",
                    "new_distance_km": new_plan["distance_km"],
                    "hazard_avoided": hazard_info
                },
                triggered_by=triggered_by
            )
            replanned_incidents.append({
                "incident_id": inc.id,
                "title": inc.title,
                "detour_plan": new_plan
            })

    return {
        "closed_route": route.name,
        "hazard_info": hazard_info,
        "replanned_count": len(replanned_incidents),
        "replanned_incidents": replanned_incidents
    }

def handle_shelter_saturation_event(
    db: Session,
    shelter_id: int,
    triggered_by: str = "ShelterMonitor"
) -> Dict[str, Any]:
    """
    Module 7 Event Trigger: Shelter reaches capacity saturation (vacancy <= 0).
    Re-routes incoming evacuations to the nearest alternative accessible shelter.
    """
    shelter = db.query(Shelter).filter(Shelter.id == shelter_id).first()
    if not shelter:
        raise ValueError(f"Shelter #{shelter_id} not found.")

    log_event(
        db=db,
        entity_type="Shelter",
        entity_id=shelter.id,
        action="CapacitySaturated",
        reason=f"Shelter '{shelter.name}' reached 100% capacity ({shelter.occupancy}/{shelter.capacity}).",
        details={
            "triggering_event": f"ShelterSaturation ({shelter.name} at {shelter.occupancy}/{shelter.capacity})",
            "capacity": shelter.capacity,
            "occupancy": shelter.occupancy
        },
        triggered_by=triggered_by
    )

    # Find nearest alternate shelter with vacancy
    alt_shelter, dist, explanation = find_nearest_available_shelter(
        db=db,
        lat=shelter.latitude,
        lng=shelter.longitude,
        needed_vacancy=10
    )

    # Reassign pending incidents assigned to this shelter
    diverted_incidents = []
    if alt_shelter:
        pending_incidents = db.query(Incident).filter(
            Incident.assigned_shelter_id == shelter.id,
            Incident.status.in_(["Active", "In Progress"])
        ).all()

        for inc in pending_incidents:
            old_shelter_name = shelter.name
            inc.assigned_shelter_id = alt_shelter.id
            log_event(
                db=db,
                entity_type="Incident",
                entity_id=inc.id,
                action="Diverted",
                reason=f"Evacuation destination diverted from full shelter '{old_shelter_name}' to '{alt_shelter.name}' ({dist} km).",
                details={
                    "triggering_event": f"ShelterSaturation ({old_shelter_name} reached 100% capacity)",
                    "old_plan": f"Evacuation to {old_shelter_name}",
                    "new_plan": f"Diverted evacuation to {alt_shelter.name} ({dist} km)",
                    "original_shelter": old_shelter_name,
                    "diverted_shelter": alt_shelter.name,
                    "distance_km": dist
                },
                triggered_by=triggered_by
            )
            diverted_incidents.append(inc.id)

        db.commit()

    return {
        "saturated_shelter": shelter.name,
        "alternate_shelter": alt_shelter.name if alt_shelter else None,
        "diverted_incidents_count": len(diverted_incidents),
        "explanation": explanation
    }

def handle_team_unavailable_event(
    db: Session,
    team_id: int,
    reason: str = "Vehicle breakdown / Emergency disabled",
    triggered_by: str = "FieldReport"
) -> Dict[str, Any]:
    """
    Scenario E & F: A response team becomes unavailable during an active response.
    Marks team Off-Duty and automatically attempts to reassign affected active incidents
    to alternative eligible teams. If no alternative exists, records NoFeasiblePlan event.
    """
    from backend.services.team_service import find_best_team, assign_team_to_incident

    team = db.query(RescueTeam).filter(RescueTeam.id == team_id).first()
    if not team:
        raise ValueError(f"RescueTeam #{team_id} not found.")

    prev_status = team.status
    team.status = "Off-Duty"
    db.commit()

    log_event(
        db=db,
        entity_type="Team",
        entity_id=team.id,
        action="TeamDisabled",
        reason=f"Team '{team.name}' marked Off-Duty: {reason}.",
        details={
            "triggering_event": f"TeamUnavailable ({team.name}: {reason})",
            "previous_status": prev_status
        },
        triggered_by=triggered_by
    )

    # Find active incidents assigned to this team
    affected_incidents = db.query(Incident).filter(
        Incident.assigned_team_id == team.id,
        Incident.status.in_(["Active", "In Progress"])
    ).all()

    reassigned = []
    unassigned_no_team = []

    for inc in affected_incidents:
        old_plan_desc = f"Assigned to {team.name} ({team.specialization})"
        # Look for replacement team
        alt_team, dist, expl = find_best_team(db, inc.latitude, inc.longitude, inc.required_skill)
        if alt_team:
            assign_team_to_incident(db, alt_team.id, inc.id, triggered_by=triggered_by)
            log_event(
                db=db,
                entity_type="Incident",
                entity_id=inc.id,
                action="Replanned_TeamReassigned",
                reason=f"Incident #{inc.id} ({inc.title}) reassigned to '{alt_team.name}' after '{team.name}' became unavailable.",
                details={
                    "triggering_event": f"TeamUnavailable ({team.name}: {reason})",
                    "old_plan": old_plan_desc,
                    "new_plan": f"Reassigned to {alt_team.name} ({dist} km, {expl})"
                },
                triggered_by=triggered_by
            )
            reassigned.append({"incident_id": inc.id, "new_team": alt_team.name})
        else:
            # Scenario F: No feasible plan exists
            inc.assigned_team_id = None
            inc.status = "Active"
            db.commit()
            log_event(
                db=db,
                entity_type="Incident",
                entity_id=inc.id,
                action="NoFeasiblePlan_TeamUnavailable",
                reason=f"Team '{team.name}' disabled ({reason}). No alternative eligible teams available in region.",
                details={
                    "triggering_event": f"TeamUnavailable ({team.name}: {reason})",
                    "old_plan": old_plan_desc,
                    "new_plan": "No feasible plan: incident unassigned and placed on standby queue"
                },
                triggered_by=triggered_by
            )
            # Add alert
            alert = Alert(
                message=f"CRITICAL: Incident #{inc.id} ({inc.title}) has NO AVAILABLE RESPONSE TEAMS after {team.name} became disabled.",
                severity="Critical",
                alert_type="Plan Failure",
                location_name=inc.location_name
            )
            db.add(alert)
            db.commit()
            unassigned_no_team.append(inc.id)

    return {
        "disabled_team": team.name,
        "reason": reason,
        "reassigned_count": len(reassigned),
        "reassigned": reassigned,
        "unassigned_no_feasible_plan": unassigned_no_team
    }
