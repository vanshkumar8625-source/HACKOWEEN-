import json
from datetime import datetime
from typing import Tuple

SEVERITY_WEIGHTS = {
    "Critical": 40.0,
    "High": 30.0,
    "Medium": 20.0,
    "Low": 10.0
}

DISASTER_BASE_IMPACT = {
    "flood": 25.0,
    "earthquake": 25.0,
    "wildfire": 20.0,
    "cyclone": 20.0,
    "landslide": 15.0
}

def calculate_priority_score(
    disaster_type: str,
    severity: str,
    description: str = "",
    created_at: datetime = None,
    water_level_m: float = 0.0,
    rainfall_mm: float = 0.0
) -> Tuple[float, str]:
    """
    Computes a deterministic, explainable priority score (0.0 to 100.0)
    and returns (score, breakdown_json).
    """
    # 1. Severity Component (max 40)
    sev_score = SEVERITY_WEIGHTS.get(severity, 15.0)

    # 2. Disaster Hazard Base Impact (max 25)
    clean_type = disaster_type.lower().strip()
    hazard_score = DISASTER_BASE_IMPACT.get(clean_type, 15.0)

    # 3. Environmental Amplification (max 15)
    # Heavy rain or high water levels escalate flood priority
    env_score = 0.0
    if clean_type == "flood":
        if water_level_m >= 5.0 or rainfall_mm >= 150.0:
            env_score = 15.0
        elif water_level_m >= 3.0 or rainfall_mm >= 75.0:
            env_score = 10.0
        elif water_level_m > 1.5:
            env_score = 5.0
    elif clean_type in ["wildfire", "cyclone"]:
        env_score = 5.0

    # 4. Vulnerability / Keyword Indicator (max 10)
    vuln_score = 0.0
    desc_lower = (description or "").lower()
    urgent_keywords = ["trapped", "hospital", "children", "elderly", "collapsed", "evacuate", "critical", "rising water"]
    matched_keywords = [kw for kw in urgent_keywords if kw in desc_lower]
    if len(matched_keywords) >= 3:
        vuln_score = 10.0
    elif len(matched_keywords) >= 1:
        vuln_score = 5.0

    # 5. Elapsed Waiting Time Boost (max 10)
    time_score = 0.0
    if created_at:
        elapsed_minutes = (datetime.utcnow() - created_at).total_seconds() / 60.0
        time_score = min(10.0, round(elapsed_minutes * 0.5, 1))

    total_score = min(100.0, round(sev_score + hazard_score + env_score + vuln_score + time_score, 1))

    breakdown = {
        "total_score": total_score,
        "components": {
            "severity_weight": sev_score,
            "disaster_hazard": hazard_score,
            "environmental_risk": env_score,
            "vulnerability_factors": vuln_score,
            "waiting_time_boost": time_score
        },
        "matched_indicators": matched_keywords,
        "explanation": (
            f"Severity={severity} ({sev_score}pts), "
            f"Hazard={disaster_type} ({hazard_score}pts), "
            f"Environment=({env_score}pts), "
            f"Vulnerability={matched_keywords} ({vuln_score}pts), "
            f"WaitBoost=({time_score}pts)."
        )
    }

    return total_score, json.dumps(breakdown)
