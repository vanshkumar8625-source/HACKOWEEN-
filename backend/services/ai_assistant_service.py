import re
import logging
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session
from backend.database.models import Incident, RescueTeam

logger = logging.getLogger(__name__)

# Known regional coordinates map for quick fallback geolocating in Pune / Western Maharashtra
KNOWN_LOCATIONS = {
    "pune riverside": (18.5204, 73.8567),
    "pune": (18.5204, 73.8567),
    "shivaji nagar": (18.5308, 73.8475),
    "deccan": (18.5173, 73.8415),
    "kothrud": (18.5074, 73.8077),
    "hadapsar": (18.5089, 73.9260),
    "hinjewadi": (18.5913, 73.7389),
    "katraj": (18.4575, 73.8677),
    "mumbai harbor": (18.9500, 72.8200),
    "mumbai": (19.0760, 72.8777),
    "kolhapur": (16.7050, 74.2433),
    "panchganga": (16.7050, 74.2433),
    "mahabaleshwar": (17.9237, 73.6586)
}

HINDI_NUMBERS = {
    "ek": 1, "do": 2, "teen": 3, "char": 4, "chaar": 4, "paanch": 5, "panch": 5,
    "che": 6, "chheh": 6, "saat": 7, "aath": 8, "nau": 9, "das": 10,
    "gyarah": 11, "barah": 12, "pandrah": 15, "bees": 20
}

def extract_incident_entities(text: str) -> Dict[str, Any]:
    """
    Extracts disaster type, location, affected count, injuries, and skill requirements
    from voice transcript or text in English and Hindi/Hinglish.
    """
    text_lower = text.lower()
    
    # 1. Disaster Type
    disaster_type = "flood"  # Default in flood context
    if any(k in text_lower for k in ["earthquake", "bhukamp", "bhookamp", "building gir", "malba", "debris"]):
        disaster_type = "earthquake"
    elif any(k in text_lower for k in ["fire", "aag", "smoke", "dhuwan", "cylinder blast", "explosion"]):
        disaster_type = "wildfire"
    elif any(k in text_lower for k in ["cyclone", "toofan", "storm", "hawa"]):
        disaster_type = "cyclone"
    elif any(k in text_lower for k in ["landslide", "pahar khisak", "soil collapse", "mudslide"]):
        disaster_type = "landslide"
    elif any(k in text_lower for k in ["flood", "baadh", "paani", "water", "dub", "doob", "river"]):
        disaster_type = "flood"

    # 2. People Affected & Casualties
    people_affected = 1
    # Check digits
    digit_match = re.search(r'(\d+)\s*(people|persons|log|victims|members)?', text_lower)
    if digit_match:
        try:
            val = int(digit_match.group(1))
            if 0 < val <= 500:
                people_affected = val
        except ValueError:
            pass
    else:
        # Check Hindi number words
        for word, num in HINDI_NUMBERS.items():
            if re.search(rf'\b{word}\s*(log|vyakti|members)?\b', text_lower):
                people_affected = num
                break

    # Casualties / Injured
    has_injuries = any(k in text_lower for k in ["injury", "injured", "ghayal", "chot", "khoon", "bleeding", "unconscious", "behosh", "medical"])
    casualties_count = max(1 if has_injuries else 0, round(people_affected * 0.5) if has_injuries and people_affected > 2 else (1 if has_injuries else 0))

    # 3. Severity Determination
    severity = "Medium"
    if any(k in text_lower for k in ["drowning", "doob rahe", "immediate", "urgent", "critical", "mar rahe", "behosh", "unconscious", "fire spreading", "fast rising"]):
        severity = "Critical"
    elif people_affected >= 5 or has_injuries or "phansa" in text_lower or "trapped" in text_lower:
        severity = "High"
    elif "help" in text_lower or "madad" in text_lower:
        severity = "Medium"

    # 4. Location Name & Coords
    matched_loc = "Pune Central"
    lat, lng = 18.5204, 73.8567

    for loc_key, coords in KNOWN_LOCATIONS.items():
        if loc_key in text_lower:
            matched_loc = loc_key.title()
            lat, lng = coords
            break
    else:
        # Try finding location phrase after 'location' / 'jagah' / 'near'
        loc_match = re.search(r'(?:location|jagah|near|at|mein|pass)\s+([a-zA-Z\s]{3,25})', text_lower)
        if loc_match:
            candidate = loc_match.group(1).strip().title()
            if len(candidate) > 2 and candidate.lower() not in ["mein", "hai", "pe", "hu", "hoon"]:
                matched_loc = candidate

    # 5. Required Skill
    if has_injuries:
        required_skill = "Medical"
    elif disaster_type == "flood":
        required_skill = "Flood Rescue"
    elif disaster_type in ["earthquake", "landslide"]:
        required_skill = "Search & Rescue"
    elif disaster_type == "wildfire":
        required_skill = "Hazmat / Fire Control"
    else:
        required_skill = "General Rescue"

    # Generate brief descriptive title
    title = f"{disaster_type.title()} Emergency: {people_affected} person(s) at {matched_loc}"

    return {
        "title": title,
        "disaster_type": disaster_type,
        "severity": severity,
        "location_name": matched_loc,
        "latitude": lat,
        "longitude": lng,
        "people_affected": people_affected,
        "casualties_count": casualties_count,
        "has_injuries": has_injuries,
        "required_skill": required_skill,
        "raw_text": text
    }

def get_safety_advice(disaster_type: str, has_injuries: bool) -> List[str]:
    """
    Returns immediate, life-saving, safe action guidance.
    """
    advice = []
    if disaster_type == "flood":
        advice.append("Move to the highest stable structure or upper floor immediately.")
        advice.append("Do NOT attempt to walk or drive through moving flood waters.")
        advice.append("Turn off main electrical switches if safe to reach.")
    elif disaster_type == "earthquake":
        advice.append("Drop, Cover, and Hold on under sturdy furniture; stay away from windows.")
        advice.append("If outdoors, move to open ground away from power lines and collapsing walls.")
    elif disaster_type == "wildfire":
        advice.append("Crawl low under smoke where air is clearer; cover mouth with a damp cloth.")
        advice.append("Evacuate immediately along safe, non-blocked corridors.")
    else:
        advice.append("Stay calm, keep your phone battery conserved, and remain in a visible location.")

    if has_injuries:
        advice.append("Apply firm, sterile pressure to any bleeding wounds using clean cloth.")
        advice.append("Keep injured individuals warm and avoid moving persons with suspected spinal trauma.")

    return advice

def handle_assistant_interaction(
    db: Session,
    message: str,
    language: str = "en",
    context_incident_id: Optional[int] = None
) -> Dict[str, Any]:
    """
    Processes a conversational or voice-transcribed prompt,
    handles status inquiries, and guides emergency intake.
    """
    clean_msg = message.strip()
    clean_lower = clean_msg.lower()

    # Case A: Status Inquiry for an Incident (e.g. "Status of incident #2", "Check INC-2", "kahan pahuncha")
    id_match = re.search(r'(?:incident|case|ticket|report|#)?\s*#?(\d+)', clean_lower)
    if any(q in clean_lower for q in ["status", "kahan", "track", "check", "update", "kab aayega", "eta"]) and id_match:
        inc_id = int(id_match.group(1))
        inc = db.query(Incident).filter(Incident.id == inc_id).first()
        if inc:
            team_info = f"Assigned to {inc.assigned_team.name}" if inc.assigned_team else "Awaiting Team Dispatch"
            arrival_info = f"Arrived at {inc.actual_arrival_at.strftime('%H:%M:%S')}" if inc.actual_arrival_at else (
                f"Estimated Arrival (ETA): {inc.estimated_arrival_at.strftime('%H:%M:%S')}" if inc.estimated_arrival_at else "Calculating ETA..."
            )
            deadline_info = f"Response Deadline: {inc.deadline_at.strftime('%H:%M:%S')}" if inc.deadline_at else "Standard Triage"

            reply_en = (
                f"Incident #{inc.id} ({inc.title}): Status is '{inc.status}'. {team_info}. {arrival_info}. {deadline_info}. "
                f"Note: Help will arrive as coordinated by Control Room. Stay in a safe position."
            )
            reply_hi = (
                f"Incident #{inc.id} ({inc.title}) ki sthiti '{inc.status}' hai. {team_info}. {arrival_info}. {deadline_info}. "
                f"Kripya surakshit sthan par bane rahein."
            )
            return {
                "reply": reply_en if language == "en" else reply_hi,
                "reply_hi": reply_hi,
                "extracted_data": None,
                "missing_fields": [],
                "can_submit": False,
                "safety_tips": get_safety_advice(inc.disaster_type, inc.casualties_count > 0),
                "created_incident_id": inc.id,
                "incident_reference": f"INC-{inc.id:04d}"
            }
        else:
            return {
                "reply": f"Incident #{inc_id} not found in active records. Please check the reference number.",
                "reply_hi": f"Incident #{inc_id} database mein nahi mila. Kripya reference number check karein.",
                "extracted_data": None,
                "missing_fields": [],
                "can_submit": False,
                "safety_tips": []
            }

    # Case B: Emergency Report Intake
    extracted = extract_incident_entities(clean_msg)

    # Check missing essential fields
    missing = []
    # If location is default and not mentioned in text
    if not any(k in clean_lower for k in list(KNOWN_LOCATIONS.keys()) + ["near", "road", "colony", "nagar", "bridge", "hospital", "chowk"]):
        missing.append("Specific Location / Landmark")

    # In urgent situations, can_submit is True even with minimal info
    can_submit = len(clean_msg) >= 10

    safety_tips = get_safety_advice(extracted["disaster_type"], extracted["has_injuries"])

    reply_en = (
        f"Understood. Identified a {extracted['severity']} {extracted['disaster_type']} emergency at "
        f"{extracted['location_name']} affecting approximately {extracted['people_affected']} person(s). "
        f"Required skill: {extracted['required_skill']}. "
        f"{'Please provide your nearest landmark to pinpoint rescue teams.' if missing else 'All key details extracted. You can review and confirm submission below.'}"
    )

    reply_hi = (
        f"Aapki emergency report praapt hui. {extracted['location_name']} par {extracted['disaster_type']} ki sthiti "
        f"hai jisme lagbhag {extracted['people_affected']} log prabhavit hain. "
        f"{'Kripya apna nazdeeki landmark batayein taaki team jaldi pahunch sake.' if missing else 'Sabhi mukhya jaankari mil gayi hai. Aap niche verify karke submit kar sakte hain.'}"
    )

    return {
        "reply": reply_en if language == "en" else reply_hi,
        "reply_hi": reply_hi,
        "extracted_data": extracted,
        "missing_fields": missing,
        "can_submit": can_submit,
        "safety_tips": safety_tips,
        "created_incident_id": None,
        "incident_reference": None
    }
