import React, { useState } from 'react';
import Map, { Marker, NavigationControl, Source, Layer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  ShieldAlert, Truck, CheckCircle2, AlertTriangle, Clock,
  MapPin, PhoneCall, Radio, Navigation, HelpCircle,
  Home, RefreshCw, Star, Layers, Activity
} from 'lucide-react';
import { DeadlineCountdown } from '../DeadlineCountdown';
import type { Incident } from '../PriorityQueue';

interface ResponderDashboardProps {
  incidents: Incident[];
  teams: any[];
  shelters: any[];
  routes: any[];
  simStatus: any;
  onMarkArrival: (incidentId: number) => void;
  onResolveRescue: (incidentId: number) => void;
  onOpenExplainDelay: (incident: Incident) => void;
  onOpenBackupRequest: (incident: Incident, teamId: number) => void;
  onAcceptDispatch?: (incidentId: number, teamId: number) => void;
  onRefresh: () => void;
  apiUrl: string;
}

export const ResponderDashboard: React.FC<ResponderDashboardProps> = ({
  incidents,
  teams,
  shelters,
  routes,
  simStatus,
  onMarkArrival,
  onResolveRescue,
  onOpenExplainDelay,
  onOpenBackupRequest,
  onAcceptDispatch,
  onRefresh
}) => {
  // Let the user select which team unit they are operating as (default to Team 1)
  const [selectedTeamId, setSelectedTeamId] = useState<number>(teams[0]?.id || 1);

  const currentTeam = teams.find(t => t.id === selectedTeamId) || teams[0] || {
    id: 1,
    name: "Pune Central NDRF Unit 1",
    specialization: "Flood Rescue",
    status: "Available",
    average_rating: 4.9,
    latitude: 18.5204,
    longitude: 73.8567
  };

  // Find incidents assigned to this team
  const assignedIncidents = incidents.filter(
    i => i.assigned_team_id === currentTeam.id && i.status !== 'Resolved'
  );

  // Unassigned active citizen emergencies in sector
  const unassignedIncidents = incidents.filter(
    i => (!i.assigned_team_id || i.assigned_team_id === null) && i.status !== 'Resolved'
  );

  // Active mission: priority to assigned, fallback to first available unassigned citizen SOS if responder is awaiting dispatch
  const activeIncident = assignedIncidents[0] || (currentTeam.status === 'Available' ? unassignedIncidents[0] : null) || null;
  const isDirectlyAssigned = !!assignedIncidents.find(i => i.id === activeIncident?.id);

  // Completed missions by this team
  const completedIncidents = incidents.filter(
    i => i.assigned_team_id === currentTeam.id && i.status === 'Resolved'
  );

  // Map viewstate focused on active incident or team
  const initialLat = activeIncident ? activeIncident.latitude : currentTeam.latitude || 18.5204;
  const initialLng = activeIncident ? activeIncident.longitude : currentTeam.longitude || 73.8567;

  const [viewState, setViewState] = useState({
    latitude: initialLat,
    longitude: initialLng,
    zoom: 13
  });

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
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      
      {/* Top Field Responder Header Bar */}
      <div className="px-6 py-3.5 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-slate-950 font-black shadow-lg">
            <Truck className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-wide">
                Tactical Field Responder Terminal
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Radio className="w-3 h-3 text-amber-400 animate-pulse" />
                Field Unit View
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Live Response Deadlines • Transit Routing • Punctuality Tracking • Backup Requests
            </p>
          </div>
        </div>

        {/* Team Unit Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-500 font-semibold text-[11px]">Active Unit:</span>
            <select
              value={selectedTeamId}
              onChange={e => setSelectedTeamId(Number(e.target.value))}
              className="bg-transparent text-amber-300 font-bold focus:outline-none cursor-pointer text-xs"
            >
              {teams.map(t => (
                <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                  {t.name} ({t.specialization}) - {t.average_rating ? t.average_rating.toFixed(1) : '5.0'}★
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={onRefresh}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
            title="Refresh Terminal Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Responder Content Layout: Left Mission Details & Right Tactical Map */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Column: Mission Control & Unit Status */}
        <div className="w-full lg:w-[480px] border-r border-slate-800 bg-slate-900/60 flex flex-col overflow-y-auto custom-scrollbar p-4 space-y-4 shrink-0">
          
          {/* Unit Telemetry Card */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Assigned Unit</span>
                <h3 className="text-sm font-bold text-white">{currentTeam.name}</h3>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                currentTeam.status === 'Available' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                currentTeam.status === 'Dispatched' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse' :
                'bg-blue-500/20 text-blue-300 border border-blue-500/30'
              }`}>
                {currentTeam.status}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase">Rating</span>
                <span className="text-amber-400 font-extrabold flex items-center justify-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  {currentTeam.average_rating ? currentTeam.average_rating.toFixed(1) : '5.0'}
                </span>
              </div>
              <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase">Completed</span>
                <span className="text-teal-300 font-bold font-mono">
                  {currentTeam.total_rescues_completed || completedIncidents.length}
                </span>
              </div>
              <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase">Specialization</span>
                <span className="text-slate-300 font-semibold text-[11px] truncate block">
                  {currentTeam.specialization}
                </span>
              </div>
            </div>

            {currentTeam.is_restricted && (
              <div className="p-2.5 bg-red-950/80 border border-red-800 text-red-200 rounded-lg text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>Unit under temporary supervisory assignment review. Contact Control Dispatch.</span>
              </div>
            )}
          </div>

          {/* ACTIVE ASSIGNED MISSION CARD */}
          {activeIncident ? (
            <div className={`p-4 bg-slate-900 border-2 ${isDirectlyAssigned ? 'border-amber-500/50' : 'border-red-500/80 ring-2 ring-red-500/20'} rounded-xl space-y-4 shadow-xl relative overflow-hidden`}>
              <div className={`absolute top-0 right-0 px-3 py-1 ${isDirectlyAssigned ? 'bg-amber-500 text-slate-950' : 'bg-red-600 text-white animate-pulse'} text-[10px] font-black uppercase tracking-wider rounded-bl-lg flex items-center gap-1`}>
                <Activity className="w-3 h-3 animate-pulse" />
                {isDirectlyAssigned ? `Active Incident #${activeIncident.id}` : `🚨 Citizen SOS Awaiting Dispatch`}
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-mono block">INCIDENT TICKET #RESQ-{activeIncident.id.toString().padStart(4, '0')}</span>
                <h3 className="text-base font-bold text-white mt-0.5">{activeIncident.title}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                    activeIncident.severity === 'Critical' ? 'bg-red-500 text-white animate-pulse' : 'bg-amber-500 text-slate-950'
                  }`}>
                    {activeIncident.severity} Severity
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-teal-400" />
                    {activeIncident.location_name}
                  </span>
                </div>
              </div>

              {/* Attached Visual Evidence (Photo / Video) */}
              {activeIncident.media_url && (
                <div className="rounded-xl overflow-hidden border border-slate-800 bg-black/80 space-y-1">
                  <div className="flex items-center justify-between px-3 py-1.5 bg-slate-950 text-xs border-b border-slate-800/80">
                    <span className="font-bold text-rose-400 flex items-center gap-1.5">
                      {activeIncident.media_type === 'video' ? '🎥 Ground Recon Video' : '📸 Disaster Scene Photo'}
                    </span>
                    <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono">Field Intel</span>
                  </div>
                  {activeIncident.media_type === 'video' ? (
                    <video
                      src={activeIncident.media_url}
                      controls
                      className="w-full max-h-52 object-cover bg-black"
                    />
                  ) : (
                    <img
                      src={activeIncident.media_url}
                      alt={activeIncident.title}
                      className="w-full max-h-52 object-cover"
                    />
                  )}
                </div>
              )}

              {/* Ticking Response Deadline Countdown */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px] uppercase font-bold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    Mandatory Response Deadline
                  </span>
                  {activeIncident.deadline_status && (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      activeIncident.deadline_status === 'On Time' ? 'bg-emerald-500/20 text-emerald-400' :
                      activeIncident.deadline_status === 'Delayed' ? 'bg-red-500/20 text-red-400 animate-pulse' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {activeIncident.deadline_status}
                    </span>
                  )}
                </div>

                {activeIncident.deadline_at && (
                  <DeadlineCountdown
                    deadlineAt={activeIncident.deadline_at}
                    status={activeIncident.status}
                    actualArrivalAt={activeIncident.actual_arrival_at}
                    deadlineStatus={activeIncident.deadline_status}
                    isResolved={activeIncident.status === 'Resolved'}
                  />
                )}

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                  <span>Victims Impacted: <strong className="text-white">{activeIncident.people_affected}</strong></span>
                  <span>Casualties: <strong className="text-amber-400">{activeIncident.casualties_count}</strong></span>
                </div>
              </div>

              {/* Tactical Actions for Responder */}
              <div className="space-y-2 pt-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Field Actions:</span>
                
                {/* 0. Accept Mission Claim (for incoming unassigned citizen emergencies) */}
                {!isDirectlyAssigned && onAcceptDispatch && (
                  <button
                    onClick={() => onAcceptDispatch(activeIncident.id, currentTeam.id)}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-500 hover:to-rose-500 text-white font-black rounded-xl text-xs transition shadow-lg shadow-red-950/50 flex items-center justify-center gap-2 animate-pulse cursor-pointer"
                  >
                    <Radio className="w-4 h-4 animate-spin" />
                    ⚡ ACCEPT CITIZEN SOS & DISPATCH {currentTeam.name}
                  </button>
                )}

                {/* 1. Arrival Button */}
                {!activeIncident.actual_arrival_at ? (
                  <button
                    onClick={() => onMarkArrival(activeIncident.id)}
                    className="w-full py-2.5 px-4 bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold rounded-xl text-xs transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    MARK ARRIVED ON SCENE (LOCK ETA)
                  </button>
                ) : (
                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Arrival Confirmed at {new Date(activeIncident.actual_arrival_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({activeIncident.deadline_status})</span>
                  </div>
                )}

                {/* 2. Secondary Tactical Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onOpenExplainDelay(activeIncident)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    Report Delay Reason
                  </button>

                  <button
                    onClick={() => onOpenBackupRequest(activeIncident, currentTeam.id)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                    Request Backup
                  </button>
                </div>

                {/* 3. Resolve Rescue Mission */}
                <button
                  onClick={() => onResolveRescue(activeIncident.id)}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-xs transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShieldAlert className="w-4 h-4" />
                  COMPLETE & RESOLVE RESCUE MISSION
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-xl text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white">Unit on Standby</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                No active emergencies currently assigned to {currentTeam.name}. Stand by for dispatch alert from Central Command.
              </p>
            </div>
          )}

          {/* Incoming Citizen Sector Emergencies Queue */}
          {unassignedIncidents.length > 0 && (
            <div className="p-4 bg-slate-900 border border-red-500/40 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 animate-pulse" />
                  Incoming Citizen Requests ({unassignedIncidents.length})
                </span>
                <span className="text-[10px] bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded font-mono font-bold">
                  Sector Radar
                </span>
              </div>
              <div className="space-y-2">
                {unassignedIncidents.map(uInc => (
                  <div key={uInc.id} className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-xs flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white truncate block">{uInc.title}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-red-500/20 text-red-300 shrink-0 uppercase">
                          {uInc.severity}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 truncate block mt-0.5">{uInc.location_name}</span>
                    </div>
                    {onAcceptDispatch && (
                      <button
                        onClick={() => onAcceptDispatch(uInc.id, currentTeam.id)}
                        className="px-2.5 py-1.5 bg-red-600 hover:bg-red-500 text-white font-extrabold text-[10px] rounded-lg shrink-0 transition cursor-pointer"
                      >
                        Claim
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Accessible Shelters & Evac Points (Field Support) */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Home className="w-3.5 h-3.5 text-teal-400" />
                Nearest Evacuation Shelters
              </span>
              <span className="text-[10px] text-slate-500">For Victim Transport</span>
            </div>

            <div className="space-y-2">
              {shelters.slice(0, 3).map(sh => (
                <div key={sh.id} className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-xs flex items-center justify-between">
                  <div>
                    <h5 className="font-semibold text-white">{sh.name}</h5>
                    <span className="text-[10px] text-slate-400">{sh.location_name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-emerald-400">{sh.vacancy} beds</span>
                    <span className="text-[10px] text-slate-500 block">{sh.occupancy}/{sh.capacity} full</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Tactical Mission Map */}
        <div className="flex-1 relative h-[450px] lg:h-full">
          <Map
            {...viewState}
            onMove={evt => setViewState(evt.viewState)}
            style={{ width: '100%', height: '100%' }}
            mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
          >
            <NavigationControl position="bottom-right" />

            {/* Routes */}
            <Source id="responder-routes" type="geojson" data={routesGeoJSON}>
              <Layer
                id="r-safe"
                type="line"
                filter={['!=', 'status', 'Blocked']}
                paint={{ 'line-color': '#14b8a6', 'line-width': 4, 'line-opacity': 0.8 }}
              />
              <Layer
                id="r-blocked"
                type="line"
                filter={['==', 'status', 'Blocked']}
                paint={{ 'line-color': '#ef4444', 'line-width': 5, 'line-dasharray': [2, 2], 'line-opacity': 0.9 }}
              />
            </Source>

            {/* Responder Unit Marker */}
            <Marker latitude={currentTeam.latitude} longitude={currentTeam.longitude}>
              <div className="relative flex items-center justify-center cursor-pointer group">
                <span className="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-amber-400 opacity-75" />
                <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-amber-500 text-slate-950 font-black shadow-2xl border-2 border-white">
                  <Truck className="w-4 h-4" />
                </div>
                <div className="absolute bottom-9 bg-slate-900 border border-slate-700 text-white text-[10px] px-2 py-0.5 rounded shadow whitespace-nowrap z-50">
                  {currentTeam.name} (My Unit)
                </div>
              </div>
            </Marker>

            {/* Active Incident Marker */}
            {activeIncident && (
              <Marker latitude={activeIncident.latitude} longitude={activeIncident.longitude}>
                <div className="relative flex items-center justify-center cursor-pointer group">
                  <span className="animate-ping absolute inline-flex h-10 w-10 rounded-full bg-red-500 opacity-75" />
                  <div className="relative flex items-center justify-center w-9 h-9 rounded-full bg-red-600 text-white font-black shadow-2xl border-2 border-white">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div className="absolute bottom-10 bg-slate-900 border border-red-500 text-white text-xs px-2.5 py-1 rounded shadow-xl whitespace-nowrap z-50">
                    <strong>{activeIncident.title}</strong>
                    <div className="text-[10px] text-amber-400">Response Target: {activeIncident.people_affected} victims</div>
                  </div>
                </div>
              </Marker>
            )}

            {/* Unassigned Citizen Emergency Markers */}
            {unassignedIncidents.filter(u => u.id !== activeIncident?.id).map(uInc => (
              <Marker key={`u-${uInc.id}`} latitude={uInc.latitude} longitude={uInc.longitude}>
                <div 
                  onClick={() => onAcceptDispatch && onAcceptDispatch(uInc.id, currentTeam.id)}
                  className="relative flex items-center justify-center cursor-pointer group"
                >
                  <span className="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-rose-500 opacity-60" />
                  <div className="relative flex items-center justify-center w-7 h-7 rounded-full bg-rose-600 text-white font-bold shadow-xl border-2 border-white text-[10px]">
                    SOS
                  </div>
                  <div className="absolute bottom-8 bg-slate-900 border border-rose-500 text-white text-[10px] px-2 py-0.5 rounded shadow whitespace-nowrap z-50">
                    <strong>{uInc.title}</strong>
                    <div className="text-[9px] text-rose-300">Click to Claim Dispatch</div>
                  </div>
                </div>
              </Marker>
            ))}

            {/* Shelter Markers */}
            {shelters.map(sh => (
              <Marker key={sh.id} latitude={sh.latitude} longitude={sh.longitude}>
                <div className="flex items-center justify-center w-6 h-6 rounded-md bg-emerald-600 text-white shadow border border-slate-950">
                  <Home className="w-3.5 h-3.5" />
                </div>
              </Marker>
            ))}
          </Map>

          {/* Tactical Floating Overlay HUD */}
          <div className="absolute top-4 left-4 z-20 bg-slate-900/90 border border-slate-700/80 p-3 rounded-xl text-xs shadow-2xl backdrop-blur-md space-y-1.5">
            <div className="font-bold text-amber-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-amber-400" />
              Tactical Navigation Mode
            </div>
            <div className="text-[11px] text-slate-300">
              Flood Height: <strong className="text-cyan-400 font-mono">{simStatus.flood_level_m.toFixed(1)}m</strong>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <span className="w-3 h-0.5 bg-teal-400" /> Clear Corridor
              <span className="w-3 h-0.5 bg-red-500 border-dashed ml-2" /> Blocked Road
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
