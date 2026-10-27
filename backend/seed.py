from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from backend.database.models import (
    Base, User, Sensor, RescueTeam, Shelter, Resource, EvacuationRoute,
    Incident, Alert, PlanAuditLog, TeamRating, DelayReview, BackupRequest, Notification
)

def seed_database(db: Session):
    """
    Seeds database with clean, repeatable realistic disaster coordination data
    centered around Maharashtra river basins (Pune, Mumbai, Kolhapur) with full
    deadline tracking, team ratings, and backup request demonstrations.
    """
    from backend.database.db import Base, engine, auto_migrate_sqlite
    Base.metadata.create_all(bind=engine)
    auto_migrate_sqlite(engine)

    # 1. Clean existing records in dependency order
    db.query(PlanAuditLog).delete()
    db.query(Notification).delete()
    db.query(BackupRequest).delete()
    db.query(DelayReview).delete()
    db.query(TeamRating).delete()
    db.query(Alert).delete()
    db.query(Incident).delete()
    db.query(RescueTeam).delete()
    db.query(Shelter).delete()
    db.query(Resource).delete()
    db.query(EvacuationRoute).delete()
    db.query(Sensor).delete()
    db.query(User).delete()
    db.commit()
    db.expire_all()

    # 2. Seed Users
    users = [
        User(username="admin", email="admin@disaster.gov", password_hash="dummy_hash_admin", role="admin"),
        User(username="commander", email="commander@disaster.gov", password_hash="dummy_hash_responder", role="responder"),
        User(username="citizen_sos", email="citizen@sos.org", password_hash="dummy_hash_public", role="citizen")
    ]
    db.add_all(users)

    # 3. Seed IoT Telemetry Sensors
    sensors = [
        Sensor(
            name="Mula-Mutha River Basin Sensor 1",
            sensor_type="Water Level",
            location_name="Pune Riverside",
            latitude=18.5204,
            longitude=73.8567,
            current_value=2.4,
            unit="meters",
            warning_threshold=3.5,
            critical_threshold=5.0,
            status="Normal"
        ),
        Sensor(
            name="Panchganga River Flood Gauge",
            sensor_type="Water Level",
            location_name="Kolhapur Basin",
            latitude=16.7050,
            longitude=74.2433,
            current_value=3.8,  # Near warning
            unit="meters",
            warning_threshold=4.0,
            critical_threshold=6.0,
            status="Warning"
        ),
        Sensor(
            name="Mumbai Coastal Storm Surge Monitor",
            sensor_type="Water Level",
            location_name="Mumbai Harbor",
            latitude=18.9500,
            longitude=72.8200,
            current_value=1.5,
            unit="meters",
            warning_threshold=3.0,
            critical_threshold=4.5,
            status="Normal"
        ),
        Sensor(
            name="Western Ghats Rain Gauge",
            sensor_type="Rainfall",
            location_name="Mahabaleshwar Catchment",
            latitude=17.9237,
            longitude=73.6586,
            current_value=45.0,
            unit="mm/h",
            warning_threshold=60.0,
            critical_threshold=100.0,
            status="Normal"
        )
    ]
    db.add_all(sensors)

    # 4. Seed Rescue Teams (with performance ratings and accountability stats)
    teams = [
        RescueTeam(
            name="NDRF Team Alpha (Boats & Divers)",
            specialization="Flood Rescue",
            members_count=20,
            status="Available",
            latitude=18.5250,
            longitude=73.8500,
            contact_number="+91-9876543201",
            average_rating=4.9,
            total_ratings=14,
            completed_rescues=14,
            on_time_rescues=13,
            delayed_rescues=1,
            is_restricted=False
        ),
        RescueTeam(
            name="SDRF Quick Response Unit 2",
            specialization="Search & Rescue",
            members_count=15,
            status="Available",
            latitude=18.5400,
            longitude=73.8700,
            contact_number="+91-9876543202",
            average_rating=4.6,
            total_ratings=8,
            completed_rescues=8,
            on_time_rescues=7,
            delayed_rescues=1,
            is_restricted=False
        ),
        RescueTeam(
            name="Kolhapur Tactical Flood Unit",
            specialization="Flood Rescue",
            members_count=25,
            status="Available",
            latitude=16.7100,
            longitude=74.2400,
            contact_number="+91-9876543203",
            average_rating=4.8,
            total_ratings=10,
            completed_rescues=10,
            on_time_rescues=10,
            delayed_rescues=0,
            is_restricted=False
        ),
        RescueTeam(
            name="State Emergency Medical Corps",
            specialization="Medical",
            members_count=12,
            status="Available",
            latitude=18.5100,
            longitude=73.8400,
            contact_number="+91-9876543204",
            average_rating=5.0,
            total_ratings=18,
            completed_rescues=18,
            on_time_rescues=18,
            delayed_rescues=0,
            is_restricted=False
        )
    ]
    db.add_all(teams)
    db.flush()

    # 5. Seed Shelters
    shelters = [
        Shelter(
            name="Pune Municipal Community Relief Camp",
            location_name="Pune Central",
            latitude=18.5350,
            longitude=73.8650,
            capacity=300,
            occupancy=45,
            food_stock_days=7.0,
            water_stock_days=7.0,
            medical_stock_level="Good",
            is_accessible=True
        ),
        Shelter(
            name="Deccan Indoor Sports Complex Shelter",
            location_name="Pune Deccan",
            latitude=18.5150,
            longitude=73.8420,
            capacity=500,
            occupancy=80,
            food_stock_days=8.5,
            water_stock_days=8.0,
            medical_stock_level="Good",
            is_accessible=True
        ),
        Shelter(
            name="Kolhapur Temple Relief Hall",
            location_name="Kolhapur",
            latitude=16.7150,
            longitude=74.2500,
            capacity=400,
            occupancy=320,  # High occupancy
            food_stock_days=3.0,
            water_stock_days=2.5,
            medical_stock_level="Moderate",
            is_accessible=True
        )
    ]
    db.add_all(shelters)

    # 6. Seed Physical Supplies & Resources (including Helicopters, Ambulances, and Boats)
    resources = [
        Resource(
            name="Inflatable Motorized Rescue Boats",
            resource_type="Boat",
            total_qty=25,
            allocated_qty=4,
            reserved_qty=0,
            unit="boats",
            location_name="Pune River Depot",
            latitude=18.5200,
            longitude=73.8500
        ),
        Resource(
            name="Air Support / Rescue Helicopter (Dhruv)",
            resource_type="Vehicle",
            total_qty=3,
            allocated_qty=1,
            reserved_qty=0,
            unit="aircraft",
            location_name="Pune Air Base Heliport",
            latitude=18.5800,
            longitude=73.9100
        ),
        Resource(
            name="Advanced Life Support (ALS) Ambulance",
            resource_type="Vehicle",
            total_qty=12,
            allocated_qty=3,
            reserved_qty=1,
            unit="ambulances",
            location_name="Central Trauma Response Center",
            latitude=18.5250,
            longitude=73.8550
        ),
        Resource(
            name="Heavy Rescue Fire Tender Rig",
            resource_type="Vehicle",
            total_qty=6,
            allocated_qty=1,
            reserved_qty=0,
            unit="vehicles",
            location_name="Central Fire Station",
            latitude=18.5180,
            longitude=73.8520
        ),
        Resource(
            name="Emergency Food Rations (1000-pack)",
            resource_type="Food",
            total_qty=150,
            allocated_qty=30,
            reserved_qty=10,
            unit="boxes",
            location_name="State Civil Supplies Warehouse",
            latitude=18.5300,
            longitude=73.8600
        ),
        Resource(
            name="Purified Drinking Water Tanks (500L)",
            resource_type="Water",
            total_qty=80,
            allocated_qty=15,
            reserved_qty=5,
            unit="tanks",
            location_name="Central Water Depot",
            latitude=18.5100,
            longitude=73.8400
        ),
        Resource(
            name="Advanced Trauma & First-Aid Packs",
            resource_type="Medical",
            total_qty=200,
            allocated_qty=40,
            reserved_qty=10,
            unit="kits",
            location_name="General Hospital Depot",
            latitude=18.5250,
            longitude=73.8550
        ),
        Resource(
            name="Satellite Emergency Radio Terminals",
            resource_type="Comms",
            total_qty=15,
            allocated_qty=2,
            reserved_qty=0,
            unit="units",
            location_name="State Command Center Depot",
            latitude=18.5204,
            longitude=73.8567
        )
    ]
    db.add_all(resources)

    # 7. Seed Evacuation Routes
    routes = [
        EvacuationRoute(
            name="Mula-Mutha Causeway Route",
            source_lat=18.5204,
            source_lng=73.8567,
            dest_lat=18.5350,
            dest_lng=73.8650,
            distance_km=2.4,
            duration_min=6.5,
            status="Safe",
            hazard_info=None
        ),
        EvacuationRoute(
            name="Panchganga River Highway Bridge",
            source_lat=16.7050,
            source_lng=74.2433,
            dest_lat=16.7150,
            dest_lng=74.2500,
            distance_km=1.8,
            duration_min=5.0,
            status="Safe",
            hazard_info=None
        ),
        EvacuationRoute(
            name="Deccan High-Ground Evacuation Corridor",
            source_lat=18.5150,
            source_lng=73.8420,
            dest_lat=18.5350,
            dest_lng=73.8650,
            distance_km=3.2,
            duration_min=8.0,
            status="Safe",
            hazard_info=None
        )
    ]
    db.add_all(routes)

    # 8. Seed Baseline Active Incidents with Response Deadlines
    now = datetime.utcnow()
    incidents = [
        Incident(
            title="Mula River Water Level Alert",
            disaster_type="flood",
            severity="Medium",
            priority_score=62.5,
            location_name="Pune Riverside Ghats",
            latitude=18.5204,
            longitude=73.8567,
            description="Dam outflow has elevated river level to 2.4 meters. Monitoring low-lying settlements.",
            status="Active",
            reported_by="Mula-Mutha Basin Sensor 1",
            required_skill="Flood Rescue",
            people_affected=12,
            casualties_count=0,
            deadline_at=now + timedelta(minutes=150),
            estimated_arrival_at=now + timedelta(minutes=25),
            deadline_status="Pending",
            created_at=now - timedelta(minutes=30)
        ),
        Incident(
            title="Old Bridge Structural Crack & Flooding",
            disaster_type="flood",
            severity="Critical",
            priority_score=88.0,
            location_name="Sangam Bridge Low-Lying Area",
            latitude=18.5310,
            longitude=73.8590,
            description="Rapidly rising floodwaters cut off access for 4 stranded families. Immediate boat evacuation required.",
            status="In Progress",
            reported_by="Citizen SOS Helpline",
            required_skill="Flood Rescue",
            assigned_team_id=teams[0].id,
            people_affected=16,
            casualties_count=2,
            deadline_at=now + timedelta(minutes=40),
            estimated_arrival_at=now + timedelta(minutes=12),
            deadline_status="Pending",
            created_at=now - timedelta(minutes=20)
        )
    ]
    db.add_all(incidents)
    db.flush()

    # 9. Seed Sample Backup Request (Requirement 4 demonstration)
    backup_req = BackupRequest(
        incident_id=incidents[1].id,
        requesting_team_id=teams[0].id,
        location_name="Sangam Bridge Low-Lying Area",
        latitude=18.5310,
        longitude=73.8590,
        reason="Flood current velocity exceeding 3 m/s; primary boat team requires secondary winch team and medical trauma support.",
        assistance_type="Medical Evacuation",
        required_resources_json='["Inflatable Motorized Rescue Boats", "Advanced Life Support (ALS) Ambulance"]',
        personnel_needed=4,
        urgency="Critical",
        status="Pending",
        handover_type="Partial",
        created_at=now - timedelta(minutes=10)
    )
    db.add(backup_req)

    # 10. Seed Sample Notifications (Requirement 7 demonstration)
    notifications = [
        Notification(
            title="🚨 Critical Incident: Sangam Bridge",
            message="Critical flood evacuation assigned to NDRF Team Alpha. Response deadline: 40 mins remaining.",
            category="CriticalIncident",
            severity="Critical",
            incident_id=incidents[1].id,
            team_id=teams[0].id,
            is_read=False,
            created_at=now - timedelta(minutes=15)
        ),
        Notification(
            title="🆘 Backup Request Submitted",
            message="NDRF Team Alpha requested Medical Evacuation backup at Sangam Bridge. Coordinator review needed.",
            category="BackupRequest",
            severity="Warning",
            incident_id=incidents[1].id,
            team_id=teams[0].id,
            is_read=False,
            created_at=now - timedelta(minutes=8)
        )
    ]
    db.add_all(notifications)

    # 11. Initial Audit Log
    db.add(PlanAuditLog(
        entity_type="System",
        action="SystemSeeded",
        reason="Baseline simulation dataset initialized for disaster coordination with deadline tracking, team rating, and backup requests.",
        triggered_by="SystemInit"
    ))

    db.commit()
