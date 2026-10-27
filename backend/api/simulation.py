from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database.db import get_db
from backend.database.models import EvacuationRoute, Shelter, PlanAuditLog
from backend.schemas import SimulationControlRequest, SimulationStatusResponse
from backend.services.simulation_engine import simulator
from backend.socket_server.server import broadcast_event

router = APIRouter()

@router.get("/status", response_model=SimulationStatusResponse)
def get_simulation_status(db: Session = Depends(get_db)):
    """
    Module 8: Current simulator status, tick, water level, rainfall, and summary stats.
    """
    blocked_count = db.query(EvacuationRoute).filter(EvacuationRoute.status == "Blocked").count()
    shelters = db.query(Shelter).all()
    occupancy_total = sum(s.occupancy for s in shelters)
    audit_count = db.query(PlanAuditLog).count()

    return SimulationStatusResponse(
        is_running=simulator.is_running,
        current_tick=simulator.tick_count,
        active_disaster=simulator.active_disaster,
        flood_level_m=simulator.flood_level_m,
        rainfall_mm=simulator.rainfall_mm,
        blocked_routes_count=blocked_count,
        shelter_occupancy_total=occupancy_total,
        audit_events_count=audit_count
    )

@router.post("/control")
async def control_simulation(
    payload: SimulationControlRequest,
    db: Session = Depends(get_db)
):
    """
    Module 8: Start, pause, step, or reset the disaster simulation.
    """
    action = payload.action.lower()
    if action == "start":
        simulator.speed_multiplier = payload.speed_multiplier or 1.0
        simulator.start()
        await broadcast_event("simulation_started", {"status": "running"})
        return {"message": "Simulation started", "is_running": True}
    elif action == "pause":
        simulator.pause()
        await broadcast_event("simulation_paused", {"status": "paused"})
        return {"message": "Simulation paused", "is_running": False}
    elif action == "step":
        step_result = simulator.step(db)
        await broadcast_event("simulation_stepped", step_result)
        return {"message": f"Simulation stepped to tick {step_result['tick']}", "step_result": step_result}
    elif action == "reset":
        simulator.reset(db)
        await broadcast_event("simulation_reset", {"status": "reset", "tick": 0})
        return {"message": "Simulation reset back to tick 0 baseline", "tick": 0}
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Must be 'start', 'pause', 'step', or 'reset'.")
