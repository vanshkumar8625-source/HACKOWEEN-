from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.database.db import get_db
from backend.database.models import EvacuationRoute
from backend.schemas import EvacuationRouteResponse, RouteStatusUpdateRequest
from backend.services.routing_service import plan_road_closure_aware_route, get_driving_route_geometry
from backend.services.replanning_service import handle_road_closure_event
from backend.socket_server.server import broadcast_event

router = APIRouter()

@router.get("/", response_model=List[EvacuationRouteResponse])
def get_routes(db: Session = Depends(get_db)):
    """
    Module 6: Returns all registered evacuation routes, status (Safe/Congested/Blocked), and geometry.
    """
    routes = db.query(EvacuationRoute).all()
    # Ensure geometry_json is populated for frontend MapLibre polyline visualization
    for r in routes:
        if not r.geometry_json:
            _, _, coords = get_driving_route_geometry(r.source_lat, r.source_lng, r.dest_lat, r.dest_lng)
            import json
            r.geometry_json = json.dumps(coords)
            db.commit()
    return routes

@router.post("/{id}/status")
async def update_route_status(
    id: int,
    payload: RouteStatusUpdateRequest,
    db: Session = Depends(get_db)
):
    """
    Module 7: Road condition change. If Blocked, executes automated event-triggered replanning.
    """
    route = db.query(EvacuationRoute).filter(EvacuationRoute.id == id).first()
    if not route:
        raise HTTPException(status_code=404, detail="EvacuationRoute not found")

    if payload.status == "Blocked":
        result = handle_road_closure_event(
            db=db,
            route_id=route.id,
            hazard_info=payload.hazard_info or "Flooding hazard reported",
            triggered_by=payload.reason or "ManualRouteUpdate"
        )
        await broadcast_event("route_closure_event", result)
        return {
            "message": f"Route '{route.name}' marked BLOCKED. Triggered replanning for {result['replanned_count']} missions.",
            "route_id": route.id,
            "status": "Blocked",
            "replanning_result": result
        }
    else:
        route.status = payload.status
        route.hazard_info = payload.hazard_info
        db.commit()
        await broadcast_event("route_status_changed", {
            "route_id": route.id,
            "status": route.status
        })
        return {"route_id": route.id, "status": route.status}

@router.get("/plan-path")
def calculate_closure_aware_path(
    source_lat: float = Query(...),
    source_lng: float = Query(...),
    dest_lat: float = Query(...),
    dest_lng: float = Query(...),
    db: Session = Depends(get_db)
):
    """
    Module 6: Computes a path between coordinates, dynamically avoiding blocked routes.
    """
    plan = plan_road_closure_aware_route(db, source_lat, source_lng, dest_lat, dest_lng)
    return plan
