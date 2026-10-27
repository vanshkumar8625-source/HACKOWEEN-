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
    casualties_count: Optional[int] = 0
    people_affected: Optional[int] = 1
    voice_transcript: Optional[str] = None

class IncidentUpdate(BaseModel):
    title: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None
    assigned_team_id: Optional[int] = None
    assigned_shelter_id: Optional[int] = None
    backup_team_id: Optional[int] = None
    deadline_status: Optional[str] = None

class IncidentDeadlineAdjustRequest(BaseModel):
    new_deadline: datetime
    reason: str = Field(..., min_length=5, description="Administrative justification for deadline extension")
    adjusted_by: Optional[str] = "Administrator"

class IncidentArrivalRequest(BaseModel):
    actual_arrival_at: Optional[datetime] = None
    notes: Optional[str] = "Team arrived on scene"

class IncidentResolveRequest(BaseModel):
    resolved_at: Optional[datetime] = None
    outcome_notes: Optional[str] = "Rescue operation successfully completed"
    casualties_saved: Optional[int] = None
    rating: Optional[float] = 5.0
    feedback: Optional[str] = "Mission completed successfully"
    is_disaster_exception: Optional[bool] = False

class DelayExplanationRequest(BaseModel):
    reason_category: str = Field(..., description="Road Blocked, Severe Weather, Equipment Failure, Responder Safety, Access/Traffic, Other")
    explanation: str = Field(..., min_length=10)
    team_id: Optional[int] = None

class DelayReviewDecisionRequest(BaseModel):
    admin_decision: str = Field(..., description="Justified - No Action, Warning, Mandatory Review, Additional Training, Temporary Restriction")
    admin_notes: Optional[str] = None
    reviewed_by: Optional[str] = "Admin Commander"

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
    casualties_count: int = 0
    people_affected: int = 1
    voice_transcript: Optional[str] = None
    assigned_team_id: Optional[int] = None
    backup_team_id: Optional[int] = None
    assigned_shelter_id: Optional[int] = None
    
    # Deadlines & Timelines
    deadline_at: Optional[datetime] = None
    estimated_arrival_at: Optional[datetime] = None
    actual_arrival_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    deadline_status: str = "Pending"
    deadline_extended_reason: Optional[str] = None
    backup_requested: bool = False
    delay_reason: Optional[str] = None
    delay_category: Optional[str] = None
    delay_reviewed: bool = False
    
    created_at: datetime
    updated_at: datetime

# --- Delay Review ---
class DelayReviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    incident_id: int
    team_id: int
    delay_minutes: float
    reason_category: str
    explanation: str
    admin_decision: str
    admin_notes: Optional[str] = None
    reviewed_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

# --- Team Ratings ---
class TeamRatingCreate(BaseModel):
    team_id: int
    incident_id: int
    rating: float = Field(..., ge=1.0, le=5.0)
    arrived_on_time: bool = True
    rescue_successful: bool = True
    outcome_notes: Optional[str] = None
    resource_efficiency_score: Optional[float] = 5.0
    is_disaster_exception: Optional[bool] = False
    rated_by: Optional[str] = "Supervisor"

class RatingDisputeRequest(BaseModel):
    dispute_reason: str = Field(..., min_length=10)

class RatingReviewRequest(BaseModel):
    dispute_status: str = Field(..., description="Reviewed, Upheld, Dismissed")
    supervisor_notes: str = Field(..., min_length=5)
    adjusted_rating: Optional[float] = Field(None, ge=1.0, le=5.0)

class TeamRatingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    team_id: int
    incident_id: int
    rating: float
    arrived_on_time: bool
    rescue_successful: bool
    outcome_notes: Optional[str] = None
    resource_efficiency_score: Optional[float] = 5.0
    is_disaster_exception: bool = False
    dispute_status: str = "None"
    dispute_reason: Optional[str] = None
    supervisor_notes: Optional[str] = None
    rated_by: str = "Supervisor"
    created_at: datetime

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

class TeamRestrictionUpdateRequest(BaseModel):
    is_restricted: bool
    restriction_reason: Optional[str] = None

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
    average_rating: float = 5.0
    total_ratings: int = 0
    completed_rescues: int = 0
    on_time_rescues: int = 0
    delayed_rescues: int = 0
    on_time_percentage: float = 100.0
    is_restricted: bool = False
    restriction_reason: Optional[str] = None

# --- Backup Requests ---
class BackupRequestCreate(BaseModel):
    incident_id: int
    requesting_team_id: int
    location_name: str
    latitude: float
    longitude: float
    reason: str = Field(..., min_length=5)
    assistance_type: str = Field(..., description="Specialized Extraction, Medical Evacuation, Perimeter Containment, Full Handover, Supply Drop")
    required_resources: List[str] = Field(default_factory=list)
    personnel_needed: int = Field(default=2, ge=1)
    urgency: str = Field(default="High", description="Low, Medium, High, Critical")
    notes: Optional[str] = None
    photo_url: Optional[str] = None
    handover_type: Optional[str] = "Partial"

class BackupRequestAssign(BaseModel):
    assigned_backup_team_id: Optional[int] = None
    handover_type: Optional[str] = "Partial"
    eta_minutes: Optional[float] = 15.0
    allocated_resources: Optional[List[Dict[str, Any]]] = None

class BackupRequestStatusUpdate(BaseModel):
    status: str = Field(..., description="Assigned, En Route, On Scene, Completed, Cancelled")

class BackupRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    incident_id: int
    requesting_team_id: int
    assigned_backup_team_id: Optional[int] = None
    location_name: str
    latitude: float
    longitude: float
    reason: str
    assistance_type: str
    required_resources_json: str
    personnel_needed: int
    urgency: str
    notes: Optional[str] = None
    photo_url: Optional[str] = None
    status: str
    handover_type: str
    eta_minutes: Optional[float] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None

# --- Notifications ---
class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    message: str
    category: str
    severity: str
    incident_id: Optional[int] = None
    team_id: Optional[int] = None
    is_read: bool
    created_at: datetime

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

# --- AI Emergency Assistant ---
class AIAssistantChatRequest(BaseModel):
    message: str
    language: Optional[str] = "en"  # "en" or "hi"
    audio_transcript: Optional[str] = None
    is_voice: Optional[bool] = False
    context_incident_id: Optional[int] = None

class AIAssistantChatResponse(BaseModel):
    reply: str
    reply_hi: Optional[str] = None
    extracted_data: Optional[Dict[str, Any]] = None
    missing_fields: List[str] = Field(default_factory=list)
    can_submit: bool = False
    safety_tips: List[str] = Field(default_factory=list)
    created_incident_id: Optional[int] = None
    incident_reference: Optional[str] = None

# --- Resource Recommendations ---
class ResourceRecommendationItem(BaseModel):
    resource_type: str
    name: str
    recommended_qty: int
    available_qty: int
    unit: str
    is_available: bool
    rationale: str

class ResourceRecommendationResponse(BaseModel):
    incident_id: int
    severity: str
    recommendations: List[ResourceRecommendationItem]

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

# --- AI Damage Assessment ---
class DamageAnalysisRequest(BaseModel):
    image_url: Optional[str] = None
    preset_name: Optional[str] = None
    location_name: Optional[str] = "Pune Riverbank Basin"
    reported_disaster: Optional[str] = "Flood"

class DamageAnalysisResponse(BaseModel):
    damage_classification: str
    confidence_score: float
    severity_level: str
    detected_hazards: List[str]
    estimated_casualties_risk: str
    recommended_skills: List[str]
    recommended_resources: List[str]
    structural_integrity_percent: int
    tactical_guidance: str
    prefill_incident: Dict[str, Any]


