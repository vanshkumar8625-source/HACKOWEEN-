from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

# --- Incidents ---
class IncidentCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=150)
    disaster_type: str = Field(..., description="flood, earthquake, wildfire, cyclone, landslide")
    severity: str = Field(..., description="Low, Medium, High, Critical")
    location_name: str
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    description: Optional[str] = None
    reported_by: Optional[str] = "Citizen"
    required_skill: Optional[str] = "General Rescue"
    required_supplies: Optional[Dict[str, int]] = Field(default_factory=dict)

class IncidentUpdate(BaseModel):
    title: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None
    assigned_team_id: Optional[int] = None
    assigned_shelter_id: Optional[int] = None

class IncidentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    disaster_type: str
    severity: str
    priority_score: float
    priority_breakdown: Optional[str] = None
    location_name: str
    latitude: float
    longitude: float
    description: Optional[str] = None
    status: str
    reported_by: str
    required_skill: str
    required_supplies_json: Optional[str] = None
    assigned_team_id: Optional[int] = None
    assigned_shelter_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

# --- Resources ---
class ResourceCreate(BaseModel):
    name: str
    resource_type: str
    total_qty: int = Field(..., ge=0)
    unit: Optional[str] = "units"
    location_name: str
    latitude: Optional[float] = 0.0
    longitude: Optional[float] = 0.0

class ResourceAllocationRequest(BaseModel):
    resource_id: int
    qty: int = Field(..., gt=0)
    incident_id: Optional[int] = None
    reason: Optional[str] = "Incident dispatch"

class ResourceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    resource_type: str
    total_qty: int
    allocated_qty: int
    reserved_qty: int
    available_qty: int
    unit: str
    location_name: str
    latitude: float
    longitude: float

# --- Rescue Teams ---
class RescueTeamCreate(BaseModel):
    name: str
    specialization: str
    members_count: int = Field(..., gt=0)
    latitude: float
    longitude: float
    contact_number: str

class TeamAssignmentRequest(BaseModel):
    team_id: int
    incident_id: int
    reason: Optional[str] = "Manual commander dispatch"

class RescueTeamResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    specialization: str
    members_count: int
    status: str
    latitude: float
    longitude: float
    contact_number: str

# --- Shelters ---
class ShelterCreate(BaseModel):
    name: str
    location_name: str
    latitude: float
    longitude: float
    capacity: int = Field(..., gt=0)
    occupancy: Optional[int] = 0
    food_stock_days: Optional[float] = 7.0
    water_stock_days: Optional[float] = 7.0
    medical_stock_level: Optional[str] = "Good"
    is_accessible: Optional[bool] = True

class ShelterEvacuateRequest(BaseModel):
    shelter_id: int
    evacuee_count: int = Field(..., gt=0)
    incident_id: Optional[int] = None

class ShelterResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    location_name: str
    latitude: float
    longitude: float
    capacity: int
    occupancy: int
    vacancy: int
    occupancy_rate: float
    food_stock_days: float
    water_stock_days: float
    medical_stock_level: str
    is_accessible: bool

# --- Evacuation Routes ---
class EvacuationRouteCreate(BaseModel):
    name: str
    source_lat: float
    source_lng: float
    dest_lat: float
    dest_lng: float
    status: Optional[str] = "Safe"
    hazard_info: Optional[str] = None

class RouteStatusUpdateRequest(BaseModel):
    status: str = Field(..., description="Safe, Congested, Blocked")
    hazard_info: Optional[str] = None
    reason: Optional[str] = "Manual update or sensor trigger"

class EvacuationRouteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    source_lat: float
    source_lng: float
    dest_lat: float
    dest_lng: float
    distance_km: float
    duration_min: float
    status: str
    hazard_info: Optional[str] = None
    geometry_json: Optional[str] = None

# --- Sensors & Alerts ---
class SensorCreate(BaseModel):
    name: str
    sensor_type: str
    location_name: str
    latitude: float
    longitude: float
    current_value: float
    unit: str
    warning_threshold: float
    critical_threshold: float

class SensorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    sensor_type: str
    location_name: str
    latitude: float
    longitude: float
    current_value: float
    unit: str
    warning_threshold: float
    critical_threshold: float
    status: str
    last_updated: datetime

class AlertResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    message: str
    severity: str
    alert_type: str
    location_name: str
    timestamp: datetime
    is_active: bool

# --- Audit Logs ---
class PlanAuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    timestamp: datetime
    entity_type: str
    entity_id: Optional[int] = None
    action: str
    reason: str
    details_json: Optional[str] = None
    triggered_by: str

# --- Simulator & Coordination ---
class SimulationControlRequest(BaseModel):
    action: str = Field(..., description="start, pause, step, reset")
    speed_multiplier: Optional[float] = 1.0

class SimulationStatusResponse(BaseModel):
    is_running: bool
    current_tick: int
    active_disaster: str
    flood_level_m: float
    rainfall_mm: float
    blocked_routes_count: int
    shelter_occupancy_total: int
    audit_events_count: int
