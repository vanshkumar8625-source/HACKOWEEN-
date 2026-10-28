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
    casualties_count = Column(Integer, default=0, nullable=False)
    people_affected = Column(Integer, default=1, nullable=False)
    voice_transcript = Column(Text, nullable=True)
    
    # Assignments & Timelines (Requirement 1)
    assigned_team_id = Column(Integer, ForeignKey("rescue_teams.id"), nullable=True)
    backup_team_id = Column(Integer, ForeignKey("rescue_teams.id"), nullable=True)
    assigned_shelter_id = Column(Integer, ForeignKey("shelters.id"), nullable=True)
    
    # Deadline & Arrival Tracking
    deadline_at = Column(DateTime, nullable=True)                  # Computed response deadline
    estimated_arrival_at = Column(DateTime, nullable=True)         # Calculated ETA
    actual_arrival_at = Column(DateTime, nullable=True)            # Actual arrival event timestamp
    resolved_at = Column(DateTime, nullable=True)                  # Separate rescue completion timestamp
    deadline_status = Column(String(30), default="Pending", nullable=False)  # Pending, On-Time, Approaching, Delayed, Extended
    deadline_extended_reason = Column(Text, nullable=True)         # Admin recorded reason for deadline adjustment
    
    # Backup & Handover Status (Requirement 4)
    backup_requested = Column(Boolean, default=False, nullable=False)
    
    # Delay Accountability (Requirement 3)
    delay_reason = Column(Text, nullable=True)                     # Field responder explanation
    delay_category = Column(String(80), nullable=True)             # e.g., Road Blocked, Severe Weather
    delay_reviewed = Column(Boolean, default=False, nullable=False)
    
    # Visual Evidence & Telemetry (Photos / Videos)
    media_url = Column(Text, nullable=True)                        # Data URL or URL of incident photo/video
    media_type = Column(String(20), nullable=True)                 # 'image' or 'video'
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    assigned_team = relationship("RescueTeam", foreign_keys=[assigned_team_id], back_populates="assigned_incidents")
    backup_team = relationship("RescueTeam", foreign_keys=[backup_team_id])
    assigned_shelter = relationship("Shelter", foreign_keys=[assigned_shelter_id])
    ratings = relationship("TeamRating", back_populates="incident", cascade="all, delete-orphan")
    backup_requests = relationship("BackupRequest", back_populates="incident", cascade="all, delete-orphan")
    delay_reviews = relationship("DelayReview", back_populates="incident", cascade="all, delete-orphan")

class Resource(Base):
    __tablename__ = "resources"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    resource_type = Column(String(50), nullable=False)  # Medical, Food, Water, Vehicle, Shelter Tent, Boat, Helicopter, Fire Brigade, Comms
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
    
    # Requirement 2: Performance Rating & Statistics
    average_rating = Column(Float, default=5.0, nullable=False)      # 1.0 - 5.0 stars
    total_ratings = Column(Integer, default=0, nullable=False)
    completed_rescues = Column(Integer, default=0, nullable=False)
    on_time_rescues = Column(Integer, default=0, nullable=False)
    delayed_rescues = Column(Integer, default=0, nullable=False)
    
    # Requirement 3: Delay Consequences & Accountability
    is_restricted = Column(Boolean, default=False, nullable=False)   # Temporary restriction from assignment
    restriction_reason = Column(String(250), nullable=True)
    
    assigned_incidents = relationship("Incident", foreign_keys="[Incident.assigned_team_id]", back_populates="assigned_team")
    ratings = relationship("TeamRating", back_populates="team", cascade="all, delete-orphan")

    @property
    def on_time_percentage(self) -> float:
        total = self.on_time_rescues + self.delayed_rescues
        if total == 0:
            return 100.0
        return round((self.on_time_rescues / total) * 100.0, 1)

class TeamRating(Base):
    """
    Requirement 2: Transparent 5-star scoring with dispute review and disaster exception tracking.
    """
    __tablename__ = "team_ratings"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("rescue_teams.id"), nullable=False)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=False)
    rating = Column(Float, nullable=False)                         # 1.0 - 5.0
    arrived_on_time = Column(Boolean, default=True, nullable=False)
    rescue_successful = Column(Boolean, default=True, nullable=False)
    outcome_notes = Column(Text, nullable=True)
    resource_efficiency_score = Column(Float, default=5.0)
    is_disaster_exception = Column(Boolean, default=False, nullable=False) # Excludes unfair penalty if disaster made rescue impossible
    dispute_status = Column(String(30), default="None", nullable=False)    # None, Disputed, Reviewed, Upheld
    dispute_reason = Column(Text, nullable=True)
    supervisor_notes = Column(Text, nullable=True)
    rated_by = Column(String(80), default="Supervisor", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    team = relationship("RescueTeam", back_populates="ratings")
    incident = relationship("Incident", back_populates="ratings")

class DelayReview(Base):
    """
    Requirement 3: Delay accountability records and administrator corrective actions.
    """
    __tablename__ = "delay_reviews"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=False)
    team_id = Column(Integer, ForeignKey("rescue_teams.id"), nullable=False)
    delay_minutes = Column(Float, default=0.0)
    reason_category = Column(String(100), nullable=False)  # Road Blocked, Severe Weather, Equipment Failure, Responder Safety, Traffic/Access, Other
    explanation = Column(Text, nullable=False)
    admin_decision = Column(String(80), default="Pending", nullable=False)  # Pending, Justified - No Action, Warning, Mandatory Review, Additional Training, Temporary Restriction
    admin_notes = Column(Text, nullable=True)
    reviewed_by = Column(String(80), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    incident = relationship("Incident", back_populates="delay_reviews")
    team = relationship("RescueTeam")

class BackupRequest(Base):
    """
    Requirement 4: Emergency Assistance and Team Handover.
    """
    __tablename__ = "backup_requests"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=False)
    requesting_team_id = Column(Integer, ForeignKey("rescue_teams.id"), nullable=False)
    assigned_backup_team_id = Column(Integer, ForeignKey("rescue_teams.id"), nullable=True)
    location_name = Column(String(150), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    reason = Column(Text, nullable=False)
    assistance_type = Column(String(80), nullable=False)            # Specialized Extraction, Medical Evacuation, Perimeter Containment, Full Handover, Supply Drop
    required_resources_json = Column(Text, default="[]")           # JSON array of resource names needed
    personnel_needed = Column(Integer, default=2)
    urgency = Column(String(20), default="High", nullable=False)   # Low, Medium, High, Critical
    notes = Column(Text, nullable=True)
    photo_url = Column(String(255), nullable=True)
    status = Column(String(30), default="Pending", nullable=False) # Pending, Assigned, En Route, On Scene, Completed, Cancelled
    handover_type = Column(String(30), default="Partial", nullable=False) # Partial (joint operation) or Complete (full transfer)
    eta_minutes = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    incident = relationship("Incident", back_populates="backup_requests")
    requesting_team = relationship("RescueTeam", foreign_keys=[requesting_team_id])
    assigned_backup_team = relationship("RescueTeam", foreign_keys=[assigned_backup_team_id])

class Notification(Base):
    """
    Requirement 7: Unified notification record.
    """
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    category = Column(String(50), nullable=False)  # NewReport, CriticalIncident, UpcomingDeadline, MissedDeadline, BackupRequest, TeamAssignment, ResourceShortage, StatusChange, RescueCompleted
    severity = Column(String(20), default="Info", nullable=False)  # Info, Warning, Critical
    incident_id = Column(Integer, nullable=True)
    team_id = Column(Integer, nullable=True)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

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
    entity_type = Column(String(50), nullable=False)  # Incident, Team, Route, Shelter, Resource, System, Rating, Backup
    entity_id = Column(Integer, nullable=True)
    action = Column(String(80), nullable=False)       # Assigned, Rerouted, Depleted, StatusChanged, Replanned, DeadlineAdjusted, DelayReviewed, BackupAssigned
    reason = Column(Text, nullable=False)             # Human-readable explanation of why action occurred
    details_json = Column(Text, nullable=True)        # Structured payload of previous vs new state
    triggered_by = Column(String(80), default="System", nullable=False)
