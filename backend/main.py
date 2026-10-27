import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from backend.database.db import engine, Base, SessionLocal, init_db
from backend.database.models import User
from backend.seed import seed_database
from backend.api import (
    incidents, resources, teams, shelters, routes_evac, sensors, audit_logs, simulation,
    backup_requests, notifications, ai_assistant
)
from backend.socket_server.server import socket_app

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("emergency_coordinator")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables & auto-migrate columns
    logger.info("Initializing database schema & auto-migrations...")
    init_db()
    
    # Check if DB needs initial seeding
    db = SessionLocal()
    try:
        user_count = db.query(User).count()
        if user_count == 0:
            logger.info("Database is empty. Populating baseline disaster simulation data...")
            seed_database(db)
    finally:
        db.close()
        
    yield
    logger.info("Shutting down emergency coordination system...")

app = FastAPI(
    title="ResQGrid — AI-Powered Disaster Intelligence & Response Platform",
    description="Predict Early. Respond Faster. Save Lives. Unified Time-Bound Rescue Deadline Tracking, Team Rating, Handover, and Voice-AI Emergency Coordination Engine",
    version="2.5.0",
    lifespan=lifespan
)

# Open CORS for local demo and testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(incidents.router, prefix="/api/incidents", tags=["Incidents & Deadlines"])
app.include_router(resources.router, prefix="/api/resources", tags=["Supplies & Resources"])
app.include_router(teams.router, prefix="/api/teams", tags=["Rescue Teams & Performance Ratings"])
app.include_router(shelters.router, prefix="/api/shelters", tags=["Shelters"])
app.include_router(routes_evac.router, prefix="/api/routes", tags=["Evacuation Routes"])
app.include_router(sensors.router, prefix="/api/sensors", tags=["IoT Sensors & Telemetry"])
app.include_router(audit_logs.router, prefix="/api/audit-logs", tags=["Audit & Event History"])
app.include_router(simulation.router, prefix="/api/simulation", tags=["Disaster Simulation"])
app.include_router(backup_requests.router, prefix="/api/backup-requests", tags=["Emergency Backup & Handover"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Unified Notifications"])
app.include_router(ai_assistant.router, prefix="/api/ai-assistant", tags=["AI Voice Emergency Assistant"])

# Mount Socket.IO
app.mount("/socket.io", socket_app)

@app.get("/")
def root():
    return {
        "system": "ResQGrid — Dynamic Emergency Resource Coordination & AI Disaster Intelligence Platform",
        "tagline": "Predict Early. Respond Faster. Save Lives.",
        "status": "Operational",
        "version": "2.5.0",
        "features": [
            "Emergency Rescue Deadline and Tracking",
            "Rescue Team 5-Star Performance Rating",
            "Delay Consequences & Accountability",
            "Emergency Backup and Team Handover",
            "AI Voice Emergency Assistant (Meesho-Style)",
            "Grounded Resource Recommendation",
            "Unified Notification Center",
            "AI Satellite/Photo Damage Assessment"
        ]
    }

@app.get("/health")
def health():
    return {"status": "healthy"}
