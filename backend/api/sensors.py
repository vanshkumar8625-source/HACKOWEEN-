from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from backend.database.db import get_db
from backend.database.models import Sensor, Alert
from backend.schemas import SensorResponse, AlertResponse
from backend.services.audit_service import log_event
from backend.socket_server.server import broadcast_event

router = APIRouter()

@router.get("/", response_model=List[SensorResponse])
def get_sensors(db: Session = Depends(get_db)):
    """
    Returns all real-time IoT sensors and telemetry values.
    """
    return db.query(Sensor).all()

@router.get("/alerts", response_model=List[AlertResponse])
def get_alerts(limit: int = Query(50, ge=1, le=200), db: Session = Depends(get_db)):
    return db.query(Alert).order_by(Alert.timestamp.desc()).limit(limit).all()

@router.post("/{id}/trigger-spike")
async def trigger_sensor_spike(
    id: int,
    spike_value: float = Query(...),
    db: Session = Depends(get_db)
):
    sensor = db.query(Sensor).filter(Sensor.id == id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor not found")

    sensor.current_value = spike_value
    if spike_value >= sensor.critical_threshold:
        sensor.status = "Critical"
    elif spike_value >= sensor.warning_threshold:
        sensor.status = "Warning"
    else:
        sensor.status = "Normal"

    db.commit()

    log_event(
        db=db,
        entity_type="Sensor",
        entity_id=sensor.id,
        action="SensorSpikeTriggered",
        reason=f"Sensor '{sensor.name}' spiked to {spike_value} {sensor.unit} (Status: {sensor.status}).",
        triggered_by="SimulationOperator"
    )

    await broadcast_event("sensor_spiked", {
        "sensor_id": sensor.id,
        "name": sensor.name,
        "current_value": sensor.current_value,
        "status": sensor.status
    })

    return {"sensor_id": sensor.id, "current_value": sensor.current_value, "status": sensor.status}
