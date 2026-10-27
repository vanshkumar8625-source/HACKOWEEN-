import React from 'react';
import {
  BarChart3, Activity, ShieldAlert, Users, CheckCircle2,
  AlertTriangle, Clock, ArrowUpRight, Droplets, CloudRain,
  PieChart, TrendingUp, Layers, History
} from 'lucide-react';

interface AnalyticsViewProps {
  incidents: any[];
  teams: any[];
  sensors: any[];
  shelters: any[];
  auditLogs: any[];
  simStatus: any;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  incidents,
  teams,
  sensors,
  shelters,
  auditLogs,
  simStatus
}) => {
  const safeIncidents = Array.isArray(incidents) ? incidents : [];
  const safeTeams = Array.isArray(teams) ? teams : [];
  const safeSensors = Array.isArray(sensors) ? sensors : [];
  const safeShelters = Array.isArray(shelters) ? shelters : [];
  const safeLogs = Array.isArray(auditLogs) ? auditLogs : [];

  // Metrics
  const totalReported = safeIncidents.length;
  const activeEmergencies = safeIncidents.filter(i => i.status !== 'Resolved').length;
  const criticalCount = safeIncidents.filter(i => i.severity === 'Critical' && i.status !== 'Resolved').length;
  const highCount = safeIncidents.filter(i => i.severity === 'High' && i.status !== 'Resolved').length;
  const resolvedCount = safeIncidents.filter(i => i.status === 'Resolved').length;
  const totalAffected = safeIncidents.reduce((sum, i) => sum + (i.people_affected || 1) + (i.casualties_count || 0), 0);
  const availableTeams = safeTeams.filter(t => t.status === 'Available' && !t.is_restricted).length;

  // Breakdown by disaster type
  const disasterTypes: { [key: string]: number } = {};
  safeIncidents.forEach(inc => {
    const type = (inc.disaster_type || 'other').toLowerCase();
    disasterTypes[type] = (disasterTypes[type] || 0) + 1;
  });

  // Calculate resolution rate
  const resolutionRate = totalReported > 0 ? Math.round((resolvedCount / totalReported) * 100) : 0;

  // Average team on-time rate
  const avgOnTime = safeTeams.length > 0
    ? Math.round(safeTeams.reduce((sum, t) => sum + (t.on_time_percentage || 100), 0) / safeTeams.length)
    : 100;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-950 font-sans custom-scrollbar text-slate-100">
      
      {/* Title & System Status Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-display font-extrabold text-white flex items-center gap-2.5">
            <BarChart3 className="w-5 h-5 text-teal-400" />
            ResQGrid Situational Intelligence & Incident Analytics
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time telemetry, casualty statistics, resource utilization rates, and immutable audit logs
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live Feed Operational
          </span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Active Emergencies */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Incidents</span>
            <div className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-display font-black text-white">{activeEmergencies}</span>
            <span className="text-xs text-slate-400 font-medium">of {totalReported} total</span>
          </div>
          <div className="mt-2 text-[11px] text-red-400 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            {criticalCount} Critical | {highCount} High Priority
          </div>
        </div>

        {/* Card 2: Affected Population */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Population Impacted</span>
            <div className="w-7 h-7 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-display font-black text-white">{totalAffected.toLocaleString()}</span>
            <span className="text-xs text-slate-400 font-medium">citizens</span>
          </div>
          <div className="mt-2 text-[11px] text-teal-400 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Verified Ground Reports
          </div>
        </div>

        {/* Card 3: Ready Units */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Rescue Units Ready</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-display font-black text-white">{availableTeams}</span>
            <span className="text-xs text-slate-400 font-medium">of {safeTeams.length} teams</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-400 font-medium flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            {avgOnTime}% Average On-Time Rate
          </div>
        </div>

        {/* Card 4: Resolution Ratio */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Resolution Rate</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-display font-black text-white">{resolutionRate}%</span>
            <span className="text-xs text-slate-400 font-medium">({resolvedCount} closed)</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 font-medium">
            Separate Arrival & Resolution Tracking
          </div>
        </div>
      </div>

      {/* Mid Section: Disaster Risk Indicators & Incident Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Disaster Risk Gauge & Hydrology Sensors */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-display font-bold text-white flex items-center gap-2">
            <Droplets className="w-4 h-4 text-cyan-400" />
            Telemetry & Hazard Risk Gauge
          </h3>
          <p className="text-xs text-slate-400">
            Real-time IoT sensor telemetry compared against critical flood and surge thresholds.
          </p>

          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-semibold">Simulated River Basin Level</span>
              <span className="font-mono font-bold text-cyan-400">
                {simStatus?.flood_level_m?.toFixed(2) || '2.40'} m
              </span>
            </div>
            
            {/* Risk Gauge Bar */}
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  (simStatus?.flood_level_m || 2.4) >= 3.4
                    ? 'bg-red-500'
                    : (simStatus?.flood_level_m || 2.4) >= 2.8
                    ? 'bg-amber-500'
                    : 'bg-teal-400'
                }`}
                style={{ width: `${Math.min(100, ((simStatus?.flood_level_m || 2.4) / 4.0) * 100)}%` }}
              />
            </div>

            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>Baseline: 2.0m</span>
              <span>Warning: 3.0m</span>
              <span className="text-red-400">Critical: 3.4m</span>
            </div>
          </div>

          {/* Active Sensor Readings */}
          <div className="space-y-2 pt-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Active Sensor Node Telemetry
            </span>
            {safeSensors.slice(0, 3).map(sensor => (
              <div key={sensor.id} className="p-2.5 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-200">{sensor.name}</div>
                  <div className="text-[10px] text-slate-400">{sensor.location_name}</div>
                </div>
                <div className="text-right">
                  <div className={`font-mono font-bold ${
                    sensor.status === 'Critical' ? 'text-red-400' : 'text-teal-400'
                  }`}>
                    {sensor.current_value.toFixed(1)} {sensor.unit}
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                    sensor.status === 'Critical' ? 'bg-red-500/20 text-red-300' : 'bg-teal-500/20 text-teal-300'
                  }`}>
                    {sensor.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Incident Type & Severity Distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-display font-bold text-white flex items-center gap-2">
            <PieChart className="w-4 h-4 text-teal-400" />
            Disaster Category Breakdown
          </h3>
          <p className="text-xs text-slate-400">
            Distribution of reported incidents across hazard classifications.
          </p>

          <div className="space-y-3 pt-2">
            {Object.keys(disasterTypes).length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">No categorized incidents logged.</div>
            ) : (
              Object.entries(disasterTypes).map(([type, count]) => {
                const percent = Math.round((count / Math.max(1, totalReported)) * 100);
                return (
                  <div key={type} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="capitalize font-semibold text-slate-300">{type}</span>
                      <span className="font-mono text-slate-400">{count} ({percent}%)</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-teal-400 h-full rounded-full transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Severity Badges Summary */}
          <div className="pt-4 border-t border-slate-800 flex flex-wrap gap-2">
            <div className="px-2.5 py-1.5 rounded-lg bg-red-950/40 border border-red-800/60 text-xs text-red-300 font-bold flex-1 text-center">
              Critical: {criticalCount}
            </div>
            <div className="px-2.5 py-1.5 rounded-lg bg-amber-950/40 border border-amber-800/60 text-xs text-amber-300 font-bold flex-1 text-center">
              High: {highCount}
            </div>
            <div className="px-2.5 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 font-bold flex-1 text-center">
              Resolved: {resolvedCount}
            </div>
          </div>
        </div>

        {/* Live Decision Audit Trail Feed */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-display font-bold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-400" />
            Decision Audit Trail Feed
          </h3>
          <p className="text-xs text-slate-400">
            Immutable log of automated replanning, deadline adjustments, and dispatch orders.
          </p>

          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
            {safeLogs.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">No events logged in audit trail yet.</div>
            ) : (
              safeLogs.slice(0, 6).map(log => (
                <div key={log.id} className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold uppercase text-teal-400 font-mono">
                      {log.action}
                    </span>
                    <span className="text-slate-500 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium leading-tight">
                    {log.reason}
                  </p>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Entity: {log.entity_type} #{log.entity_id || 'Global'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
