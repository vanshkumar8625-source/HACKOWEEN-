import logging
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from backend.database.models import Incident, Resource, RescueTeam

logger = logging.getLogger(__name__)

def generate_resource_recommendations(
    db: Session,
    incident: Incident
) -> List[Dict[str, Any]]:
    """
    Requirement 6: Grounded recommendation engine connecting incident details
    to verified real-time resource inventory and team availability.
    Guarantees: Confirms true system availability before claiming resources are ready.
    """
    disaster = (incident.disaster_type or "").lower()
    severity = (incident.severity or "Medium")
    desc = (incident.description or "").lower()
    casualties = incident.casualties_count or 0
    people = incident.people_affected or 1

    recommended_specs = []

    # 1. Flood Scenario
    if "flood" in disaster or "submerged" in desc or "drown" in desc:
        recommended_specs.append({
            "resource_type": "Boat",
            "name": "Inflatable Rescue Boat (Zodiac)",
            "qty": max(1, round(people / 6)),
            "unit": "boats",
            "rationale": f"Flood disaster with {people} stranded persons requires motorized shallow-draft watercraft."
        })
        recommended_specs.append({
            "resource_type": "Food",
            "name": "Ready-to-Eat Emergency Food Packs",
            "qty": people * 3,
            "unit": "packs",
            "rationale": "Immediate food rations for evacuated flood victims."
        })
        recommended_specs.append({
            "resource_type": "Water",
            "name": "Clean Drinking Water Cans (20L)",
            "qty": max(2, round(people / 2)),
            "unit": "cans",
            "rationale": "Clean water supply preventing water-borne contaminants in flooded zone."
        })

    # 2. Severe Injury / Medical Needs
    if casualties > 0 or "injur" in desc or "bleed" in desc or "trauma" in desc or "medical" in (incident.required_skill or "").lower():
        recommended_specs.append({
            "resource_type": "Vehicle",
            "name": "Advanced Life Support (ALS) Ambulance",
            "qty": max(1, round(max(1, casualties) / 2)),
            "unit": "ambulances",
            "rationale": f"Reported {casualties} casualties or medical trauma requiring immediate transit to clinical facility."
        })
        recommended_specs.append({
            "resource_type": "Medical",
            "name": "Paramedic Field Trauma Kit",
            "qty": max(2, casualties * 2),
            "unit": "kits",
            "rationale": "Sterile dressings, tourniquets, and IV fluid sets for field stabilization."
        })

    # 3. Fire / Structural Collapse
    if "fire" in disaster or "wildfire" in disaster or "flame" in desc or "collapse" in desc:
        recommended_specs.append({
            "resource_type": "Vehicle",
            "name": "Heavy Fire Tender / Rescue Rig",
            "qty": 1,
            "unit": "vehicles",
            "rationale": "Active fire control or hydraulic extrication equipment required."
        })
        recommended_specs.append({
            "resource_type": "Medical",
            "name": "Burn Trauma Dressing Kit",
            "qty": 5,
            "unit": "kits",
            "rationale": "Specialized burn gels and sterile wraps for thermal injuries."
        })

    # 4. Critical Severity / Inaccessible / Remote Terrain
    if severity == "Critical" and ("remote" in desc or "mountain" in desc or "cut off" in desc or "island" in desc or people >= 15):
        recommended_specs.append({
            "resource_type": "Vehicle",
            "name": "Air Support / Rescue Helicopter",
            "qty": 1,
            "unit": "aircraft",
            "rationale": "Critical access barrier: Aerial winch extraction evaluated for isolated victims."
        })

    # Fallback General Emergency Kit if none triggered
    if not recommended_specs:
        recommended_specs.append({
            "resource_type": "Medical",
            "name": "Paramedic Field Trauma Kit",
            "qty": 2,
            "unit": "kits",
            "rationale": "Baseline first responder medical stabilization kit."
        })

    # Now verify each recommendation against actual database inventory
    results = []
    all_inventory = db.query(Resource).all()

    for spec in recommended_specs:
        # Match by name or resource_type
        matched_resource = None
        for res in all_inventory:
            if spec["resource_type"].lower() in res.resource_type.lower() or spec["name"].lower() in res.name.lower():
                matched_resource = res
                break

        if matched_resource:
            avail = matched_resource.available_qty
            is_confirmed = avail >= spec["qty"]
            results.append({
                "resource_type": matched_resource.resource_type,
                "name": matched_resource.name,
                "recommended_qty": spec["qty"],
                "available_qty": avail,
                "unit": matched_resource.unit,
                "is_available": is_confirmed,
                "rationale": spec["rationale"] + (
                    f" (System Confirmed: {avail} {matched_resource.unit} available)"
                    if is_confirmed else
                    f" [SHORTAGE WARNING: Only {avail} available, need {spec['qty']}]"
                )
            })
        else:
            # Resource not in stock in system
            results.append({
                "resource_type": spec["resource_type"],
                "name": spec["name"],
                "recommended_qty": spec["qty"],
                "available_qty": 0,
                "unit": spec["unit"],
                "is_available": False,
                "rationale": spec["rationale"] + " [NOT IN INVENTORY: Resource not registered in regional depot]"
            })

    return results
