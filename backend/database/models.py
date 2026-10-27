from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from .db import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(80), unique=True, index=True, nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    password_hash = Column(String(256), nullable=False)
    role = Column(String(30), default="responder", nullable=False)  # admin, responder, citizen
    created_at = Column(DateTime, default=datetime.utcnow)

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(150), nullable=False)
    disaster_type = Column(String(50), nullable=False)  # flood, earthquake, wildfire, cyclone, landslide
    severity = Column(String(20), nullable=False)      # Low, Medium, High, Critical
    priority_score = Column(Float, default=0.0)        # Calculated deterministic priority score 0-100
    priority_breakdown = Column(Text, nullable=True)   # JSON string explaining score components
    location_name = Column(String(150), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(30), default="Active", nullable=False)  # Active, In Progress, Under Control, Resolved
    reported_by = Column(String(100), default="System", nullable=False)
    
    # Needs & Resource Requirements
    required_skill = Column(String(100), default="General Rescue")  # Flood Rescue, Hazmat, Medical, Search & Rescue
    required_supplies_json = Column(Text, default="{}")             # JSON: {"Medical": 10, "Food": 20, "Boats": 2}
    
    # Assignments
    assigned_team_id = Column(Integer, ForeignKey("rescue_teams.id"), nullable=True)
    assigned_shelter_id = Column(Integer, ForeignKey("shelters.id"), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    assigned_team = relationship("RescueTeam", foreign_keys=[assigned_team_id], back_populates="assigned_incidents")
    assigned_shelter = relationship("Shelter", foreign_keys=[assigned_shelter_id])

class Resource(Base):
    __tablename__ = "resources"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    resource_type = Column(String(50), nullable=False)  # Medical, Food, Water, Vehicle, Shelter Tent, Boat
    total_qty = Column(Integer, default=0, nullable=False)
    allocated_qty = Column(Integer, default=0, nullable=False)
    reserved_qty = Column(Integer, default=0, nullable=False)
    unit = Column(String(30), default="units", nullable=False)
    location_name = Column(String(100), nullable=False)
    latitude = Column(Float, default=0.0)
    longitude = Column(Float, default=0.0)

    @property
    def available_qty(self) -> int:
        return max(0, self.total_qty - self.allocated_qty - self.reserved_qty)

class RescueTeam(Base):
    __tablename__ = "rescue_teams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    specialization = Column(String(100), nullable=False)  # Flood Rescue, Hazmat, Medical, Search & Rescue
    members_count = Column(Integer, default=5, nullable=False)
    status = Column(String(30), default="Available", nullable=False)  # Available, Dispatched, En Route, On Scene, Returning, Off-Duty
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    contact_number = Column(String(30), nullable=False)
    
    assigned_incidents = relationship("Incident", foreign_keys="[Incident.assigned_team_id]", back_populates="assigned_team")

class Shelter(Base):
    __tablename__ = "shelters"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    location_name = Column(String(100), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    capacity = Column(Integer, nullable=False)
    occupancy = Column(Integer, default=0, nullable=False)
    food_stock_days = Column(Float, default=7.0, nullable=False)
    water_stock_days = Column(Float, default=7.0, nullable=False)
    medical_stock_level = Column(String(20), default="Good", nullable=False)  # Good, Moderate, Low, Critical
    is_accessible = Column(Boolean, default=True, nullable=False)

    @property
    def vacancy(self) -> int:
        return max(0, self.capacity - self.occupancy)

    @property
    def occupancy_rate(self) -> float:
        return round((self.occupancy / max(1, self.capacity)) * 100, 1)

class EvacuationRoute(Base):
    __tablename__ = "evacuation_routes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    source_lat = Column(Float, nullable=False)
    source_lng = Column(Float, nullable=False)
    dest_lat = Column(Float, nullable=False)
    dest_lng = Column(Float, nullable=False)
    distance_km = Column(Float, default=0.0)
    duration_min = Column(Float, default=0.0)
    status = Column(String(30), default="Safe", nullable=False)  # Safe, Congested, Blocked
    hazard_info = Column(String(200), nullable=True)
    geometry_json = Column(Text, nullable=True)  # JSON array of [lat, lng] points

class Sensor(Base):
    __tablename__ = "sensors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    sensor_type = Column(String(50), nullable=False)  # Water Level, Rainfall, Seismic, Temperature, Wind Speed
    location_name = Column(String(100), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    current_value = Column(Float, default=0.0)
    unit = Column(String(20), nullable=False)
    warning_threshold = Column(Float, nullable=False)
    critical_threshold = Column(Float, nullable=False)
    status = Column(String(20), default="Normal", nullable=False)  # Normal, Warning, Critical
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    message = Column(String(250), nullable=False)
    severity = Column(String(20), nullable=False)  # Info, Warning, Critical
    alert_type = Column(String(30), default="System")  # Sensor Spike, Road Blocked, Shelter Full, Plan Revision
    location_name = Column(String(100), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)

class PlanAuditLog(Base):
    """
    Immutable audit trail recording why assignments, plans, priorities, or allocations changed.
    """
    __tablename__ = "plan_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    entity_type = Column(String(50), nullable=False)  # Incident, Team, Route, Shelter, Resource, System
    entity_id = Column(Integer, nullable=True)
    action = Column(String(80), nullable=False)       # Assigned, Rerouted, Depleted, StatusChanged, Replanned
    reason = Column(Text, nullable=False)             # Human-readable explanation of why action occurred
    details_json = Column(Text, nullable=True)        # Structured payload of previous vs new state
    triggered_by = Column(String(80), default="System", nullable=False)
