import time
import threading
import logging
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from backend.database.db import SessionLocal
from backend.database.models import (
    Sensor, Incident, EvacuationRoute, Shelter, Alert
)
from backend.services.priority_service import calculate_priority_score
from backend.services.replanning_service import (
    handle_road_closure_event, handle_shelter_saturation_event
)
from backend.services.audit_service import log_event
from backend.seed import seed_database

logger = logging.getLogger(__name__)

class DisasterSimulator:
    """
    Module 8: Repeatable flood/disaster simulator with start, pause, step and reset.
    Simulates changing road conditions, shelter capacity, and telemetry streams.
    """
    def __init__(self):
        self.is_running = False
        self.tick_count = 0
        self.active_disaster = "Monsoon Riverine Flood"
        self.flood_level_m = 2.4
        self.rainfall_mm = 45.0
        self.speed_multiplier = 1.0
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()

    def step(self, db: Session) -> Dict[str, Any]:
        """
        Executes one discrete, deterministic simulation step.
        """
        self.tick_count += 1

        # 1. Simulate rising water levels and continuous rainfall
        self.rainfall_mm = round(self.rainfall_mm + 8.5, 1)
        self.flood_level_m = round(self.flood_level_m + 0.35, 2)

        # 2. Update Sensors
        water_sensor = db.query(Sensor).filter(Sensor.sensor_type == "Water Level").first()
        if water_sensor:
            water_sensor.current_value = self.flood_level_m
            if self.flood_level_m >= water_sensor.critical_threshold:
                water_sensor.status = "Critical"
            elif self.flood_level_m >= water_sensor.warning_threshold:
                water_sensor.status = "Warning"
            else:
                water_sensor.status = "Normal"

        rain_sensor = db.query(Sensor).filter(Sensor.sensor_type == "Rainfall").first()
        if rain_sensor:
            rain_sensor.current_value = self.rainfall_mm
            if self.rainfall_mm >= rain_sensor.critical_threshold:
                rain_sensor.status = "Critical"
            elif self.rainfall_mm >= rain_sensor.warning_threshold:
                rain_sensor.status = "Warning"

        # 3. Dynamic Incident Generation upon critical threshold
        new_incidents_created = 0
        if self.flood_level_m >= 3.4 and not db.query(Incident).filter(Incident.title.like("%Inundation%")).first():
            score, breakdown = calculate_priority_score(
                disaster_type="flood",
                severity="Critical",
                description="Severe river overflow inundating low-lying slum clusters. Families trapped on rooftops.",
                water_level_m=self.flood_level_m,
                rainfall_mm=self.rainfall_mm
            )
            crit_inc = Incident(
                title="Flash Inundation - Low-Lying Riverfront",
                disaster_type="flood",
                severity="Critical",
                priority_score=score,
                priority_breakdown=breakdown,
                location_name="Pune Riverside Ghats",
                latitude=18.5210,
                longitude=73.8580,
                status="Active",
                reported_by="Simulator Sensor Trigger",
                required_skill="Flood Rescue"
            )
            db.add(crit_inc)
            db.commit()
            new_incidents_created += 1

            log_event(
                db=db,
                entity_type="Incident",
                entity_id=crit_inc.id,
                action="IncidentTriggered",
                reason=f"Water level exceeded critical threshold ({self.flood_level_m}m). Urgent rescue needed.",
                triggered_by="SimulationEngine"
            )

        # 4. Road Closure & Replanning Trigger
        road_closure_triggered = False
        if self.flood_level_m >= 5.0:
            open_route = db.query(EvacuationRoute).filter(
                EvacuationRoute.status != "Blocked",
                EvacuationRoute.name.like("%Causeway%")
            ).first()
            if open_route:
                handle_road_closure_event(
                    db=db,
                    route_id=open_route.id,
                    hazard_info=f"Submerged under {self.flood_level_m}m flood water",
                    triggered_by="SimulationEngine"
                )
                road_closure_triggered = True

        # 5. Shelter Occupancy & Ration Consumption
        shelters = db.query(Shelter).filter(Shelter.is_accessible == True).all()
        shelter_events = []
        for sh in shelters:
            # Evacuees continue arriving
            if sh.vacancy > 0:
                intake = min(sh.vacancy, 15)
                sh.occupancy += intake
            
            # Stock depletion
            sh.food_stock_days = max(0.5, round(sh.food_stock_days - 0.2, 1))
            sh.water_stock_days = max(0.5, round(sh.water_stock_days - 0.25, 1))

            # Saturation check
            if sh.occupancy >= sh.capacity:
                sat_res = handle_shelter_saturation_event(db=db, shelter_id=sh.id, triggered_by="SimulationEngine")
                shelter_events.append(sat_res)

        # 6. Recompute Priority Scores for active incidents
        active_incidents = db.query(Incident).filter(Incident.status.in_(["Active", "In Progress"])).all()
        for inc in active_incidents:
            new_score, new_breakdown = calculate_priority_score(
                disaster_type=inc.disaster_type,
                severity=inc.severity,
                description=inc.description,
                created_at=inc.created_at,
                water_level_m=self.flood_level_m,
                rainfall_mm=self.rainfall_mm
            )
            inc.priority_score = new_score
            inc.priority_breakdown = new_breakdown

        db.commit()

        return {
            "tick": self.tick_count,
            "flood_level_m": self.flood_level_m,
            "rainfall_mm": self.rainfall_mm,
            "new_incidents_created": new_incidents_created,
            "road_closure_triggered": road_closure_triggered,
            "shelter_events": shelter_events
        }

    def start(self):
        """Starts periodic simulation loop in background thread."""
        if self.is_running:
            return
        self.is_running = True
        self._stop_event.clear()

        def _run_loop():
            while not self._stop_event.is_set():
                try:
                    db = SessionLocal()
                    self.step(db)
                    db.close()
                except Exception as e:
                    logger.error(f"Simulator error in loop: {e}")
                time.sleep(max(0.5, 2.5 / self.speed_multiplier))

        self._thread = threading.Thread(target=_run_loop, daemon=True)
        self._thread.start()

    def pause(self):
        """Pauses simulation."""
        self.is_running = False
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=1.0)
            self._thread = None

    def reset(self, db: Session):
        """Resets simulation back to tick 0 and re-seeds clean database."""
        self.pause()
        self.tick_count = 0
        self.flood_level_m = 2.4
        self.rainfall_mm = 45.0
        seed_database(db)

# Global simulator instance
simulator = DisasterSimulator()
