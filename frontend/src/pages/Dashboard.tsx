import { useState, useEffect, useRef } from 'react';
import Map, { Marker, NavigationControl, Source, Layer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { io, Socket } from 'socket.io-client';
import {
  Activity, Users, Home, Package, History,
  ShieldAlert, Droplets, Truck, Layers
} from 'lucide-react';

import { SimulationHeader } from '../components/SimulationHeader';
import { IncidentModal } from '../components/IncidentModal';
import { PriorityQueue, type Incident } from '../components/PriorityQueue';
import { TeamsView } from '../components/views/TeamsView';
import { SheltersView } from '../components/views/SheltersView';
import { ResourcesView } from '../components/views/ResourcesView';
import { AuditLogsView } from '../components/views/AuditLogsView';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'map' | 'teams' | 'shelters' | 'resources' | 'audit'>('map');
  
  // Data state
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [shelters, setShelters] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [sensors, setSensors] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  
  // Simulation state
  const [simStatus, setSimStatus] = useState({
    is_running: false,
    current_tick: 0,
    flood_level_m: 2.4,
    rainfall_mm: 45.0,
    blocked_routes_count: 0,
    shelter_occupancy_total: 0
  });

  // Modal & selection
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [, setSelectedIncident] = useState<Incident | null>(null);
  const [viewState, setViewState] = useState({
    latitude: 18.5204,
    longitude: 73.8567,
    zoom: 12
  });

  const socketRef = useRef<Socket | null>(null);

  // Fetch all domain data
  const refreshData = async () => {
    try {
      const [incRes, teamRes, shelterRes, resRes, routeRes, sensorRes, auditRes, simRes] = await Promise.all([
        fetch(`${API_URL}/api/incidents/`).then(r => r.json()),
        fetch(`${API_URL}/api/teams/`).then(r => r.json()),
        fetch(`${API_URL}/api/shelters/`).then(r => r.json()),
        fetch(`${API_URL}/api/resources/`).then(r => r.json()),
        fetch(`${API_URL}/api/routes/`).then(r => r.json()),
        fetch(`${API_URL}/api/sensors/`).then(r => r.json()),
        fetch(`${API_URL}/api/audit-logs/`).then(r => r.json()),
        fetch(`${API_URL}/api/simulation/status`).then(r => r.json())
      ]);

      setIncidents(incRes || []);
      setTeams(teamRes || []);
      setShelters(shelterRes || []);
      setResources(resRes || []);
      setRoutes(routeRes || []);
      setSensors(sensorRes || []);
      setAuditLogs(auditRes || []);
      if (simRes) setSimStatus(simRes);
    } catch (err) {
      console.error("Failed refreshing dashboard data:", err);
    }
  };

  useEffect(() => {
    refreshData();

    // Setup Socket.IO real-time connection
    socketRef.current = io(API_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling']
    });

    socketRef.current.on('connect', () => {
      console.log("Connected to Real-time Coordination Engine.");
    });

    // Real-time event handlers
    socketRef.current.on('incident_created', () => refreshData());
    socketRef.current.on('team_dispatched', () => refreshData());
    socketRef.current.on('team_status_changed', () => refreshData());
    socketRef.current.on('shelter_updated', () => refreshData());
    socketRef.current.on('resource_updated', () => refreshData());
    socketRef.current.on('route_closure_event', () => refreshData());
    socketRef.current.on('route_status_changed', () => refreshData());
    socketRef.current.on('simulation_stepped', () => refreshData());
    socketRef.current.on('simulation_reset', () => refreshData());

    // Fallback polling every 5s
    const interval = setInterval(refreshData, 5000);

    return () => {
      clearInterval(interval);
      socketRef.current?.disconnect();
    };
  }, []);

  // Simulator controls
  const handleSimulationControl = async (action: 'start' | 'pause' | 'step' | 'reset') => {
    try {
      await fetch(`${API_URL}/api/simulation/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      refreshData();
    } catch (err) {
      console.error("Error executing simulator command:", err);
    }
  };

  // Incident reporting
  const handleCreateIncident = async (payload: any) => {
    const res = await fetch(`${API_URL}/api/incidents/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed reporting incident');
    }
    refreshData();
  };

  // Auto-assign team
  const handleAutoAssignTeam = async (incidentId: number) => {
    const res = await fetch(`${API_URL}/api/incidents/${incidentId}/auto-assign-team`, {
      method: 'POST'
    });
    if (!res.ok) {
      const err = await res.json();
      alert(`Assignment failed: ${err.detail}`);
    } else {
      refreshData();
    }
  };

  // Team status update
  const handleUpdateTeamStatus = async (id: number, status: string) => {
    await fetch(`${API_URL}/api/teams/${id}/status?status=${encodeURIComponent(status)}`, {
      method: 'POST'
    });
    refreshData();
  };

  // Shelter toggle accessibility
  const handleToggleShelterAccessibility = async (id: number) => {
    await fetch(`${API_URL}/api/shelters/${id}/toggle-accessibility`, {
      method: 'POST'
    });
    refreshData();
  };

  // Shelter admit
  const handleAdmitEvacuees = async (shelterId: number, count: number) => {
    const res = await fetch(`${API_URL}/api/shelters/evacuate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shelter_id: shelterId, evacuee_count: count })
    });
    if (!res.ok) {
      const err = await res.json();
      alert(`Admission rejected: ${err.detail}`);
    } else {
      refreshData();
    }
  };

  // Resource allocate
  const handleAllocateResource = async (resId: number, qty: number, reason: string) => {
    const res = await fetch(`${API_URL}/api/resources/allocate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resource_id: resId, qty, reason })
    });
    if (!res.ok) {
      const err = await res.json();
      alert(`Allocation rejected: ${err.detail}`);
    } else {
      refreshData();
    }
  };

  // Build GeoJSON features for Evacuation Routes
  const routesGeoJSON: any = {
    type: 'FeatureCollection',
    features: routes.map(r => {
      let coords: [number, number][] = [];
      try {
        if (r.geometry_json) {
          coords = JSON.parse(r.geometry_json).map((pt: [number, number]) => [pt[1], pt[0]]);
        }
      } catch (e) {
        coords = [[r.source_lng, r.source_lat], [r.dest_lng, r.dest_lat]];
      }
      return {
        type: 'Feature',
        properties: {
          id: r.id,
          name: r.name,
          status: r.status,
          isBlocked: r.status === 'Blocked'
        },
        geometry: {
          type: 'LineString',
          coordinates: coords
        }
      };
    })
  };

  return (
    <div className="h-screen w-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans flex flex-col">
      {/* Top Header */}
      <SimulationHeader
        simulationStatus={simStatus}
        onControl={handleSimulationControl}
        onOpenReportModal={() => setIsReportModalOpen(true)}
      />

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar Nav */}
        <aside className="w-16 lg:w-56 border-r border-zinc-800 bg-zinc-900/60 flex flex-col py-4 shrink-0">
          <div className="px-5 mb-4 hidden lg:block text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            Command Views
          </div>
          <div className="space-y-1 px-2 flex-1">
            <button
              onClick={() => setActiveTab('map')}
              className={`w-full flex items-center p-2.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'map' ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' : 'text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              <Activity className="w-4 h-4 shrink-0" />
              <span className="ml-3 hidden lg:block">Operations Map</span>
            </button>

            <button
              onClick={() => setActiveTab('teams')}
              className={`w-full flex items-center p-2.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'teams' ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' : 'text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span className="ml-3 hidden lg:block">Rescue Teams</span>
            </button>

            <button
              onClick={() => setActiveTab('shelters')}
              className={`w-full flex items-center p-2.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'shelters' ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' : 'text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              <Home className="w-4 h-4 shrink-0" />
              <span className="ml-3 hidden lg:block">Evac Shelters</span>
            </button>

            <button
              onClick={() => setActiveTab('resources')}
              className={`w-full flex items-center p-2.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'resources' ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' : 'text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              <Package className="w-4 h-4 shrink-0" />
              <span className="ml-3 hidden lg:block">Supply Inventory</span>
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`w-full flex items-center p-2.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'audit' ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' : 'text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              <History className="w-4 h-4 shrink-0" />
              <span className="ml-3 hidden lg:block">Decision Audit Trail</span>
            </button>
          </div>

          <div className="px-4 py-2 text-[10px] text-zinc-500 hidden lg:block border-t border-zinc-800">
            <div>Region: Pune Basin</div>
            <div>Coords: 18.52° N, 73.85° E</div>
          </div>
        </aside>

        {/* Center Panel */}
        <main className="flex-1 flex overflow-hidden relative">
          {activeTab === 'map' && (
            <div className="flex-1 relative flex">
              <Map
                {...viewState}
                onMove={evt => setViewState(evt.viewState)}
                style={{ width: '100%', height: '100%' }}
                mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
              >
                <NavigationControl position="bottom-right" />

                {/* Evacuation Route Polylines */}
                <Source id="routes-source" type="geojson" data={routesGeoJSON}>
                  {/* Safe Routes */}
                  <Layer
                    id="routes-safe"
                    type="line"
                    filter={['!=', 'status', 'Blocked']}
                    paint={{
                      'line-color': '#14b8a6',
                      'line-width': 4,
                      'line-opacity': 0.8
                    }}
                  />
                  {/* Blocked Routes */}
                  <Layer
                    id="routes-blocked"
                    type="line"
                    filter={['==', 'status', 'Blocked']}
                    paint={{
                      'line-color': '#ef4444',
                      'line-width': 5,
                      'line-dasharray': [2, 2],
                      'line-opacity': 0.9
                    }}
                  />
                </Source>

                {/* Incident Markers */}
                {incidents.map(inc => {
                  const isCritical = inc.severity === 'Critical';
                  return (
                    <Marker
                      key={`inc-${inc.id}`}
                      latitude={inc.latitude}
                      longitude={inc.longitude}
                      onClick={e => {
                        e.originalEvent.stopPropagation();
                        setSelectedIncident(inc);
                      }}
                    >
                      <div className="relative flex items-center justify-center cursor-pointer group">
                        <span className={`animate-ping absolute inline-flex h-6 w-6 rounded-full opacity-75 ${isCritical ? 'bg-red-500' : 'bg-amber-500'}`} />
                        <div className={`relative flex items-center justify-center w-7 h-7 rounded-full text-white shadow-lg border-2 border-zinc-950 ${isCritical ? 'bg-red-600' : 'bg-amber-600'}`}>
                          <ShieldAlert className="w-3.5 h-3.5" />
                        </div>
                        {/* Hover Tooltip */}
                        <div className="absolute bottom-8 bg-zinc-900 border border-zinc-700 text-zinc-100 text-[10px] px-2 py-1 rounded shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-50">
                          <strong>{inc.title}</strong> ({inc.severity})
                        </div>
                      </div>
                    </Marker>
                  );
                })}

                {/* Team Markers */}
                {teams.map(team => (
                  <Marker
                    key={`team-${team.id}`}
                    latitude={team.latitude}
                    longitude={team.longitude}
                  >
                    <div className="relative flex items-center justify-center cursor-pointer group">
                      <div className="flex items-center justify-center w-6 h-6 rounded-md bg-indigo-600 text-white shadow border border-zinc-950">
                        <Truck className="w-3.5 h-3.5" />
                      </div>
                      <div className="absolute bottom-7 bg-zinc-900 border border-zinc-700 text-[10px] px-2 py-0.5 rounded shadow whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-50">
                        {team.name} ({team.status})
                      </div>
                    </div>
                  </Marker>
                ))}

                {/* Shelter Markers */}
                {shelters.map(shelter => (
                  <Marker
                    key={`shelter-${shelter.id}`}
                    latitude={shelter.latitude}
                    longitude={shelter.longitude}
                  >
                    <div className="relative flex items-center justify-center cursor-pointer group">
                      <div className={`flex items-center justify-center w-6 h-6 rounded-md text-white shadow border border-zinc-950 ${shelter.is_accessible ? 'bg-emerald-600' : 'bg-red-700'}`}>
                        <Home className="w-3.5 h-3.5" />
                      </div>
                      <div className="absolute bottom-7 bg-zinc-900 border border-zinc-700 text-[10px] px-2 py-0.5 rounded shadow whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-50">
                        {shelter.name}: {shelter.occupancy}/{shelter.capacity} ({shelter.vacancy} beds)
                      </div>
                    </div>
                  </Marker>
                ))}

                {/* Sensor Markers */}
                {sensors.map(sensor => (
                  <Marker
                    key={`sensor-${sensor.id}`}
                    latitude={sensor.latitude}
                    longitude={sensor.longitude}
                  >
                    <div className="relative flex items-center justify-center cursor-pointer group">
                      <div className={`flex items-center justify-center w-5 h-5 rounded-full text-white shadow border border-zinc-950 ${sensor.status === 'Critical' ? 'bg-red-500 animate-pulse' : 'bg-teal-500'}`}>
                        <Droplets className="w-3 h-3" />
                      </div>
                      <div className="absolute bottom-6 bg-zinc-900 border border-zinc-700 text-[10px] px-2 py-0.5 rounded shadow whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-50">
                        {sensor.name}: {sensor.current_value.toFixed(1)} {sensor.unit}
                      </div>
                    </div>
                  </Marker>
                ))}
              </Map>

              {/* Map Floating Legend */}
              <div className="absolute top-4 left-4 z-20 bg-zinc-900/90 border border-zinc-800 p-3 rounded-lg text-[11px] shadow-lg backdrop-blur-sm space-y-1.5 pointer-events-auto">
                <div className="font-bold text-zinc-300 uppercase tracking-wider text-[10px] mb-1 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-teal-400" /> Map Legend
                </div>
                <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Critical Incidents</div>
                <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-md bg-indigo-500" /> Rescue Teams</div>
                <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-md bg-emerald-500" /> Accessible Shelters</div>
                <div className="flex items-center gap-2"><span className="w-3 h-0.5 bg-teal-400" /> Clear Evacuation Route</div>
                <div className="flex items-center gap-2"><span className="w-3 h-0.5 bg-red-500 border-dashed" /> Blocked Road (Flooded)</div>
              </div>
            </div>
          )}

          {activeTab === 'teams' && (
            <TeamsView teams={teams} onUpdateStatus={handleUpdateTeamStatus} />
          )}

          {activeTab === 'shelters' && (
            <SheltersView
              shelters={shelters}
              onToggleAccessibility={handleToggleShelterAccessibility}
              onAdmitEvacuees={handleAdmitEvacuees}
            />
          )}

          {activeTab === 'resources' && (
            <ResourcesView resources={resources} onAllocate={handleAllocateResource} />
          )}

          {activeTab === 'audit' && (
            <AuditLogsView logs={auditLogs} />
          )}

          {/* Right Triage & Priority Action Queue (visible in Map mode) */}
          {activeTab === 'map' && (
            <div className="w-80 lg:w-96 border-l border-zinc-800 hidden md:block shrink-0 h-full">
              <PriorityQueue
                incidents={incidents}
                onAutoAssignTeam={handleAutoAssignTeam}
                onSelectIncident={inc => {
                  setViewState({
                    latitude: inc.latitude,
                    longitude: inc.longitude,
                    zoom: 14
                  });
                }}
              />
            </div>
          )}
        </main>
      </div>

      {/* Incident Intake Modal */}
      <IncidentModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSubmit={handleCreateIncident}
      />
    </div>
  );
}
