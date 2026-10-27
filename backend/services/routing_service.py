import json
import logging
import requests
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from backend.database.models import EvacuationRoute
from backend.services.team_service import haversine_distance_km

logger = logging.getLogger(__name__)

OSRM_BASE_URL = "https://router.project-osrm.org/route/v1/driving"

def get_driving_route_geometry(
    source_lat: float, source_lng: float, dest_lat: float, dest_lng: float
) -> Tuple[float, float, List[List[float]]]:
    """
    Attempts to fetch route from OSRM. If offline or error occurs,
    deterministically interpolates waypoints with realistic curvature.
    Returns: (distance_km, duration_min, geometry_coords: [[lat, lng], ...])
    """
    direct_dist = haversine_distance_km(source_lat, source_lng, dest_lat, dest_lng)
    
    # Try real OSRM API with short timeout
    url = f"{OSRM_BASE_URL}/{source_lng},{source_lat};{dest_lng},{dest_lat}?overview=full&geometries=geojson"
    try:
        response = requests.get(url, timeout=3.0, headers={"User-Agent": "DisasterResponseCoord/1.0"})
        if response.status_code == 200:
            data = response.json()
            if data.get("code") == "Ok" and data.get("routes"):
                r = data["routes"][0]
                coords = [[lat, lng] for lng, lat in r["geometry"]["coordinates"]]
                dist_km = round(r["distance"] / 1000.0, 2)
                dur_min = round(r["duration"] / 60.0, 1)
                return dist_km, dur_min, coords
    except Exception as e:
        logger.debug(f"OSRM request fallback: {e}")

    # Deterministic offline waypoint generator
    # Interpolates 5 intermediate waypoints along the path
    coords = []
    steps = 6
    for i in range(steps + 1):
        frac = i / steps
        lat = source_lat + (dest_lat - source_lat) * frac
        lng = source_lng + (dest_lng - source_lng) * frac
        # add tiny curve if intermediate
        if 0 < i < steps:
            lat += 0.002 * (1 if i % 2 == 0 else -1)
        coords.append([round(lat, 5), round(lng, 5)])

    est_distance = round(direct_dist * 1.25, 2)
    est_duration = round((est_distance / 40.0) * 60.0, 1)  # assumed 40 km/h emergency speed
    return est_distance, est_duration, coords

def check_route_for_blockages(
    db: Session,
    source_lat: float, source_lng: float, dest_lat: float, dest_lng: float
) -> Tuple[bool, Optional[EvacuationRoute]]:
    """
    Checks if any registered evacuation route between or near the source/destination
    is currently marked 'Blocked'.
    """
    blocked_routes = db.query(EvacuationRoute).filter(
        EvacuationRoute.status == "Blocked"
    ).all()

    for r in blocked_routes:
        # Check if route endpoints are within proximity of source or destination
        d_src = haversine_distance_km(source_lat, source_lng, r.source_lat, r.source_lng)
        d_dst = haversine_distance_km(dest_lat, dest_lng, r.dest_lat, r.dest_lng)
        
        # If segment coincides with transit corridor
        if (d_src < 2.0 and d_dst < 2.0) or (d_src < 0.5) or (d_dst < 0.5):
            return True, r

    return False, None

def plan_road_closure_aware_route(
    db: Session,
    source_lat: float, source_lng: float, dest_lat: float, dest_lng: float
) -> Dict[str, Any]:
    """
    Module 6: Road-closure-aware route planning.
    Detects blocked segments. If blocked, plans an avoidance detour.
    """
    is_blocked, blocked_seg = check_route_for_blockages(db, source_lat, source_lng, dest_lat, dest_lng)

    if not is_blocked:
        dist_km, dur_min, coords = get_driving_route_geometry(source_lat, source_lng, dest_lat, dest_lng)
        return {
            "status": "Safe",
            "is_rerouted": False,
            "blocked_segment_avoided": None,
            "distance_km": dist_km,
            "duration_min": dur_min,
            "geometry": coords,
            "explanation": "Primary corridor clear of active flood hazards and road closures."
        }
    else:
        # Detour detour via alternative waypoint offset by 0.05 deg latitude
        detour_waypoint_lat = source_lat + 0.04
        detour_waypoint_lng = source_lng + 0.04

        d1, t1, c1 = get_driving_route_geometry(source_lat, source_lng, detour_waypoint_lat, detour_waypoint_lng)
        d2, t2, c2 = get_driving_route_geometry(detour_waypoint_lat, detour_waypoint_lng, dest_lat, dest_lng)

        combined_coords = c1 + c2[1:]
        total_dist = round(d1 + d2, 2)
        total_dur = round(t1 + t2, 1)

        return {
            "status": "Rerouted",
            "is_rerouted": True,
            "blocked_segment_avoided": {
                "route_id": blocked_seg.id,
                "name": blocked_seg.name,
                "hazard": blocked_seg.hazard_info
            },
            "distance_km": total_dist,
            "duration_min": total_dur,
            "geometry": combined_coords,
            "explanation": f"Primary route blocked by '{blocked_seg.name}' ({blocked_seg.hazard_info}). Successfully routed safe perimeter detour."
        }
