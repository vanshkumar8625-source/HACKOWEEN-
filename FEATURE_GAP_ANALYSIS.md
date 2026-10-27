# FEATURE GAP ANALYSIS: Dynamic Emergency Resource Coordination

**Project:** Student Hackathon — Dynamic Emergency Resource Coordination  
**Repositories Audited:**  
1. `adracs/` — `/Users/vanshkumar/Autonomous-Disaster-Response-And-Coordination-System`  
2. `resqnet-source/` — `/Users/vanshkumar/ResQNet`  
**Audit Date:** October 28, 2026  
**Status:** Audit Only — Zero edits, deletions, dependency installations, or commits made to source repositories.

---

## 1. Executive Summary

Both repositories contain valuable building blocks, but neither repository alone satisfies the full hackathon requirement:
* **ADRACS** provides a rich, functionally grounded disaster management domain model (shelters, inventory quantities, rescue team tracking, sensor simulation, scikit-learn risk prediction, OpenCV satellite analysis, and NDMA guideline fallbacks). However, it relies on a traditional server-rendered Flask/Jinja2 architecture, lacks a reactive real-time UI, and lacks an autonomous multi-agent orchestration pipeline.
* **ResQNet** provides an impressive NASA-inspired Command Center UI (React 19, MapLibre GL, TailwindCSS, Socket.io client, Three.js) and an asynchronous 12-agent orchestration pipeline querying real-world open APIs (Open-Meteo, OSRM, UN ReliefWeb, ntfy.sh). However, much of its operations logic is stubbed out or hardcoded (e.g., hardcoded "Priority Action List", offline stubs for Shelter and Medical grids, simulated map clicks that only trigger Hurricane landfall, no inventory tracking, and missing backend tests).
* **Synergy Opportunity:** By extracting the rich data models, IoT telemetry simulation loop, route hazard tracking, inventory allocation logic, and scikit-learn risk predictor from ADRACS and integrating them into ResQNet's FastAPI backend and React command center, we create a premier, real-time autonomous simulation system.

---

## 2. Main Requirement Mapping Matrix

| Main Requirement | ADRACS Implementation Status & File Path | ResQNet Implementation Status & File Path | Implementation Gap & Required Task |
| :--- | :--- | :--- | :--- |
| **Continuous Incoming Reports** | **Partially Implemented:** Incidents can be submitted via web form in [`routes/incident_routes.py`](file:///Users/vanshkumar/Autonomous-Disaster-Response-And-Coordination-System/routes/incident_routes.py#L9-L48). Background IoT simulator [`utils/sensor_simulator.py`](file:///Users/vanshkumar/Autonomous-Disaster-Response-And-Coordination-System/utils/sensor_simulator.py#L13-L57) automatically logs Critical Alerts into the DB. | **Partially Implemented:** Map clicks send POST to `/api/incidents/` in [`api/incidents.py`](file:///Users/vanshkumar/ResQNet/backend/api/incidents.py#L22-L44). Hardcoded to "Category 5 Hurricane" in [`frontend/src/pages/Dashboard.tsx`](file:///Users/vanshkumar/ResQNet/frontend/src/pages/Dashboard.tsx#L190-L215). | **Task 1 (New):** Implement a background Disaster Scenario Engine that generates continuous, realistic flood and hazard reports (water level rises, trapped civilians, bridge collapses) emitting live updates over Socket.io. |
| **Continuously Changing Road Conditions** | **Implemented (Static/Manual):** `EvacuationRoute` model in [`models/route.py`](file:///Users/vanshkumar/Autonomous-Disaster-Response-And-Coordination-System/models/route.py#L3-L28) tracks status (`Safe`, `Congested`, `Blocked`) and `hazard_info`. OSRM client in [`utils/routing.py`](file:///Users/vanshkumar/Autonomous-Disaster-Response-And-Coordination-System/utils/routing.py#L6-L50). | **Stubbed:** `RoadAgent` in [`backend/google_agent_adk.py`](file:///Users/vanshkumar/ResQNet/backend/google_agent_adk.py#L50-L53) calls OSRM tool in [`backend/mcp_tools.py`](file:///Users/vanshkumar/ResQNet/backend/mcp_tools.py#L9-L33), but road status is not modeled or saved in the database. | **Task 2 (New):** Port `EvacuationRoute` model to FastAPI. Add dynamic route degradation (e.g. rising flood levels dynamically mark intersecting routes as `Blocked`), visualized with colored geoJSON polylines on the MapLibre map. |
| **Continuously Changing Shelter Capacity & Supplies** | **Implemented (Database & Manual CRUD):** `Shelter` model in [`models/shelter.py`](file:///Users/vanshkumar/Autonomous-Disaster-Response-And-Coordination-System/models/shelter.py#L3-L31) tracks capacity, occupancy, food, water, medical stock. `Resource` model in [`models/resource.py`](file:///Users/vanshkumar/Autonomous-Disaster-Response-And-Coordination-System/models/resource.py#L3-L27) tracks stock quantities. | **Incomplete/Offline Stubs:** `Resource` model in [`backend/database/models.py`](file:///Users/vanshkumar/ResQNet/backend/database/models.py#L28-L36) has basic capacity/current_load. In frontend [`frontend/src/pages/Dashboard.tsx`](file:///Users/vanshkumar/ResQNet/frontend/src/pages/Dashboard.tsx#L285-L300), "Medical Units" and "Evac Shelters" views are offline stubs. | **Task 3 (New):** Implement real-time shelter occupancy and stock decrementing logic in the simulation loop. Replace React frontend offline stubs with live interactive Shelter and Medical capacity monitors. |
| **Prioritizing Competing Needs** | **Partially Implemented:** AI Random Forest predictor in [`utils/ai_engine.py`](file:///Users/vanshkumar/Autonomous-Disaster-Response-And-Coordination-System/utils/ai_engine.py#L23-L65) classifies hazard severity. Incidents store severity (`Low`, `Medium`, `High`, `Critical`). Lacks dynamic ranking algorithm. | **Hardcoded Placeholder:** `DecisionIntelligenceAgent` in [`backend/google_agent_adk.py`](file:///Users/vanshkumar/ResQNet/backend/google_agent_adk.py#L125-L135) provides narrative summary. "Priority Action List" in [`frontend/src/pages/Dashboard.tsx`](file:///Users/vanshkumar/ResQNet/frontend/src/pages/Dashboard.tsx#L254-L275) is 100% hardcoded static text. | **Task 4 (New):** Build a Priority Decision Engine that calculates a live Priority Score: $\text{Score} = w_1 \times \text{Severity} + w_2 \times \text{Casualties} + w_3 \times \text{ResourceDeficit} - w_4 \times \text{TimeToDeplete}$, dynamically updating the React Priority List. |
| **Allocating Limited Resources** | **Implemented (Manual):** Route `/api/resources/allocate` in [`routes/resource_routes.py`](file:///Users/vanshkumar/Autonomous-Disaster-Response-And-Coordination-System/routes/resource_routes.py#L29-L50) verifies `qty <= resource.available_qty` and updates allocation. | **Stubbed:** `SupplyChainAgent` in [`backend/google_agent_adk.py`](file:///Users/vanshkumar/ResQNet/backend/google_agent_adk.py) suggests logistics in prose, but never commits or updates inventory tables. | **Task 5 (New):** Create an automated resource dispatch and allocation service that assigns supplies (boats, rations, medical packs) from nearest depots to high-priority incidents and updates DB quantities. |
| **Coordinating Multiple Response Teams** | **Implemented (Database & Manual Dispatch):** `RescueTeam` model in [`models/team.py`](file:///Users/vanshkumar/Autonomous-Disaster-Response-And-Coordination-System/models/team.py#L3-L33) tracks specialization, size, coordinates, status (`Available`, `Dispatched`, `Off-Duty`). Route dispatch in [`routes/incident_routes.py`](file:///Users/vanshkumar/Autonomous-Disaster-Response-And-Coordination-System/routes/incident_routes.py). | **Stubbed:** `Mission` model in [`backend/database/models.py`](file:///Users/vanshkumar/ResQNet/backend/database/models.py#L38-L48) stores `assigned_agents` as JSON string, but no physical rescue teams exist in the schema. | **Task 6 (New):** Port `RescueTeam` model to unified backend. Add team coordinates to the MapLibre map. Simulate team transit along OSRM routes toward assigned incident locations. |
| **Revising Plans when Routes/Resources Become Unavailable** | **Unimplemented:** Neither codebase implements automatic dynamic replanning upon route blockage or resource exhaustion. | **Unimplemented:** Swarm runs once on incident creation. No mechanism exists to re-evaluate plans when downstream failures occur. | **Task 7 (New):** Build a Dynamic Replanning Trigger: when a route becomes `Blocked` or a shelter reaches 100% capacity, the system triggers re-routing via OSRM, reassigns evacuees to secondary shelters, and emits a reroute alert. |

---

## 3. Tech Stack Audit & Discrepancies

### ADRACS (Autonomous Disaster Response And Coordination System)
* **Backend:** Python 3.9+ / Flask 3.0.0, Flask-Login 0.6.3, Flask-Bcrypt 1.0.1, Flask-SQLAlchemy 3.1.1, Flask-Cors 4.0.0.
* **Database:** SQLite (default `sqlite:///database.db` via [`config.py`](file:///Users/vanshkumar/Autonomous-Disaster-Response-And-Coordination-System/config.py#L11)) or in-memory SQLite for testing.
* **AI / ML / Data:**
  * Scikit-learn 1.3.2 Random Forest Classifier (`disaster_risk_model.pkl` and `disaster_risk_scaler.pkl`) in [`models/`](file:///Users/vanshkumar/Autonomous-Disaster-Response-And-Coordination-System/models/disaster_risk_model.pkl).
  * OpenCV Headless 4.8.1 for satellite flood water segmentation (`utils/ai_engine.py#L70-L100`).
  * ChromaDB 0.4.22 + sentence-transformers 2.2.2 (bundled local model `models/all-MiniLM-L6-v2/`).
  * TF-IDF Cosine Similarity offline fallback for NDMA disaster guidelines in [`utils/chatbot.py`](file:///Users/vanshkumar/Autonomous-Disaster-Response-And-Coordination-System/utils/chatbot.py#L125-L150).
  * Optional Ollama connection (`http://localhost:11434`) for LLM inference.
* **Frontend:** Server-side rendered Jinja2 templates (`templates/*.html`), Leaflet.js 1.9.4 (`static/js/map.js`), Chart.js, Bootstrap-styled custom CSS.
* **Entry Point:** [`app.py`](file:///Users/vanshkumar/Autonomous-Disaster-Response-And-Coordination-System/app.py#L53-L60) (`create_app('dev')` running on port 5000 with background `sensor_simulator` thread).

### ResQNet
* **Backend:** Python 3.11 / FastAPI 0.104.1, Uvicorn 0.23.2, SQLAlchemy 2.0.23, Pydantic v2, Python-Jose 3.3.0, Passlib 1.7.4, Python-SocketIO 5.10.0, SlowAPI 0.1.8.
* **Database:** PostgreSQL configured via `DATABASE_URL` in [`backend/database/db.py`](file:///Users/vanshkumar/ResQNet/backend/database/db.py#L7) (hardcodes default to `postgresql://resqnet:resqnetpassword@localhost:5432/resqnet`). Fails immediately if local PostgreSQL is not running.
* **AI / Swarm:**
  * **Code vs Claim Discrepancy:** README badges claim "Google Gemini 2.5 Flash" and "Google ADK", but [`backend/google_agent_adk.py`](file:///Users/vanshkumar/ResQNet/backend/google_agent_adk.py#L3) actually imports `from groq import Groq` and calls Groq's API with `llama-3.3-70b-versatile`!
  * Real external tool integrations in [`backend/mcp_tools.py`](file:///Users/vanshkumar/ResQNet/backend/mcp_tools.py): Open-Meteo Weather, Open-Meteo Elevation, OSRM Driving Routes, UN ReliefWeb API, and ntfy.sh alerts.
* **Frontend:** React 19.2.7 + TypeScript + Vite 8.1.1 + TailwindCSS v4 + MapLibre GL 5.24.0 / React-Map-GL 8.1.1 + Framer Motion 12.42.2 + Three.js / React Three Fiber + Lucide React + Socket.io-client.
* **Entry Point:** Backend: [`backend/main.py`](file:///Users/vanshkumar/ResQNet/backend/main.py#L17) (Uvicorn on port 8000). Frontend: [`frontend/src/main.tsx`](file:///Users/vanshkumar/ResQNet/frontend/src/main.tsx) (Vite on port 5173).

---

## 4. Critical Codebase Findings & Bugs

1. **Groq vs. Gemini Tech Stack Mismatch (ResQNet):**  
   [`backend/google_agent_adk.py`](file:///Users/vanshkumar/ResQNet/backend/google_agent_adk.py#L14) requires `GROQ_API_KEY`. If not supplied, it immediately halts with `"GROQ_API_KEY not configured"`. It does not support offline execution or local fallbacks.
2. **Socket.IO Room Broadcasting Mismatch (ResQNet):**  
   In [`backend/socket_server/server.py#L27`](file:///Users/vanshkumar/ResQNet/backend/socket_server/server.py#L27), `broadcast_agent_update` emits to `room=f"incident_{incident_id}"`. However, in [`frontend/src/components/AgentChat.tsx`](file:///Users/vanshkumar/ResQNet/frontend/src/components/AgentChat.tsx#L21), the client never emits `join_incident_room`! Consequently, agent updates are dropped and never rendered in the chat window during normal operation.
3. **Hardcoded UI Stubs (ResQNet):**  
   * Priority Action List in [`frontend/src/pages/Dashboard.tsx#L254-L275`](file:///Users/vanshkumar/ResQNet/frontend/src/pages/Dashboard.tsx#L254-L275) is hardcoded HTML.
   * "Medical Units" and "Evac Shelters" sidebar views render static "Grid Offline" placeholder screens (`Dashboard.tsx#L285-L300`).
   * "Flood Risk" and "Wildfire Zones" toggles change local booleans but do not render any geo-layers on MapLibre.
4. **PostgreSQL Tight Coupling (ResQNet):**  
   [`backend/database/db.py#L7`](file:///Users/vanshkumar/ResQNet/backend/database/db.py#L7) hardcodes a PostgreSQL connection string. In a hackathon or evaluation setting without Docker/PostgreSQL running, the server crashes at startup. Needs SQLite fallback.
5. **Missing Tests in ResQNet:**  
   [`backend/tests/`](file:///Users/vanshkumar/ResQNet/backend/tests/) contains only `conftest.py` with zero actual test cases. The frontend package has no test script.
6. **Robust Test Suite in ADRACS:**  
   [`tests/test_auth.py`](file:///Users/vanshkumar/Autonomous-Disaster-Response-And-Coordination-System/tests/test_auth.py), [`tests/test_ai.py`](file:///Users/vanshkumar/Autonomous-Disaster-Response-And-Coordination-System/tests/test_ai.py), and [`tests/test_api.py`](file:///Users/vanshkumar/Autonomous-Disaster-Response-And-Coordination-System/tests/test_api.py) contain 8 comprehensive test cases testing auth, ML risk predictor, copilot fallback, and sensor spikes.

---

## 5. Licences, IP & Attribution Constraints

* **ResQNet:** Licensed under the standard **MIT License** (Copyright 2024 ResQNet Contributors, [`ResQNet/LICENSE`](file:///Users/vanshkumar/ResQNet/LICENSE)). Permits modification, merging, and commercial/academic reuse provided the copyright and permission notice are retained.
* **ADRACS:** **No LICENSE file** exists in [`/Users/vanshkumar/Autonomous-Disaster-Response-And-Coordination-System`](file:///Users/vanshkumar/Autonomous-Disaster-Response-And-Coordination-System). Under copyright law, all rights are reserved by the original student/author. In a hackathon merge, code reused from ADRACS must preserve original authorship headers and docstrings, and an explicit attribution disclaimer should be maintained.

---

## 6. Recommended Architecture Summary

* **Backend:** Adopt **FastAPI** from ResQNet for asynchronous execution, WebSockets, background task workers, and OpenAPI specs. Enhance `db.py` to support automatic SQLite fallback when PostgreSQL is unavailable.
* **Shared Data Model:** Unified SQLAlchemy 2.0 schema integrating ADRACS models (`User`, `Incident`, `Sensor`, `Alert`, `RescueTeam`, `Shelter`, `Resource`, `EvacuationRoute`, `HistoricalDisaster`) with ResQNet's `Mission` and `Log`.
* **Frontend:** Adopt **React 19 + MapLibre GL** from ResQNet. Connect all MapLibre layers to the unified FastAPI endpoints, replace all hardcoded stubs with live dynamic components (Priority Queue, Shelters Table, Teams Tracker, Route Polylines), and fix the Socket.io room subscription bug.
* **AI / Multi-Agent Layer:** Combine ResQNet's 12-agent swarm with ADRACS's local Scikit-Learn risk predictor and OpenCV image analyzer. Add a multi-tiered LLM fallback: Google Gemini API / Groq API $\rightarrow$ local Ollama $\rightarrow$ ADRACS NDMA rule-based decision heuristics.
