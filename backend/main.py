import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from backend.database.db import engine, Base, SessionLocal
from backend.database.models import User
from backend.seed import seed_database
from backend.api import (
    incidents, resources, teams, shelters, routes_evac, sensors, audit_logs, simulation
)
from backend.socket_server.server import socket_app

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("emergency_coordinator")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)
    
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
    title="Dynamic Emergency Resource Coordination API",
    description="Unified Autonomous Disaster Management, Simulation, and Multi-Team Coordination Engine",
    version="2.0.0",
    lifespan=lifespan
)

# Open CORS for local hackathon demo and testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(incidents.router, prefix="/api/incidents", tags=["Incidents & Priority"])
app.include_router(resources.router, prefix="/api/resources", tags=["Supplies & Resources"])
app.include_router(teams.router, prefix="/api/teams", tags=["Rescue Teams"])
app.include_router(shelters.router, prefix="/api/shelters", tags=["Shelters"])
app.include_router(routes_evac.router, prefix="/api/routes", tags=["Evacuation Routes"])
app.include_router(sensors.router, prefix="/api/sensors", tags=["IoT Sensors & Telemetry"])
app.include_router(audit_logs.router, prefix="/api/audit-logs", tags=["Audit & Event History"])
app.include_router(simulation.router, prefix="/api/simulation", tags=["Disaster Simulation"])

# Mount Socket.IO
app.mount("/socket.io", socket_app)

@app.get("/")
def root():
    return {
        "system": "Dynamic Emergency Resource Coordination Command API",
        "status": "Operational",
        "version": "2.0.0",
        "mode": "Simulation / Live Command Hybrid"
    }

@app.get("/health")
def health():
    return {"status": "healthy"}
