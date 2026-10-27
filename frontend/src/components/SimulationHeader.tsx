import React from 'react';
import { Play, Pause, FastForward, RotateCcw, Plus, Droplets, CloudRain, AlertTriangle, ShieldCheck } from 'lucide-react';

interface SimulationHeaderProps {
  simulationStatus: {
    is_running: boolean;
    current_tick: number;
    flood_level_m: number;
    rainfall_mm: number;
    blocked_routes_count: number;
    shelter_occupancy_total: number;
  };
  onControl: (action: 'start' | 'pause' | 'step' | 'reset') => void;
  onOpenReportModal: () => void;
}

export const SimulationHeader: React.FC<SimulationHeaderProps> = ({
  simulationStatus,
  onControl,
  onOpenReportModal
}) => {
  return (
    <nav className="h-16 border-b border-zinc-800 bg-zinc-900/95 backdrop-blur-md flex items-center justify-between px-6 z-50 shrink-0 shadow-sm">
      {/* Brand & Simulation Badge */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 font-bold text-sm">
            H2
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wide text-zinc-100 flex items-center gap-2">
              Dynamic Emergency Coordination
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                SIMULATED DATA
              </span>
            </h1>
            <p className="text-[11px] text-zinc-400">Autonomous Flood & Resource Response Command</p>
          </div>
        </div>
      </div>

      {/* Live Telemetry Ticker */}
      <div className="hidden xl:flex items-center space-x-6 text-xs bg-zinc-950/60 px-4 py-1.5 rounded-lg border border-zinc-800">
        <div className="flex items-center space-x-1.5 text-zinc-300">
          <Droplets className="w-3.5 h-3.5 text-teal-400" />
          <span className="text-zinc-500">Water Level:</span>
          <span className={`font-mono font-bold ${simulationStatus.flood_level_m >= 4.5 ? 'text-red-400 animate-pulse' : 'text-teal-400'}`}>
            {simulationStatus.flood_level_m.toFixed(2)}m
          </span>
        </div>

        <div className="flex items-center space-x-1.5 text-zinc-300">
          <CloudRain className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-zinc-500">Rainfall:</span>
          <span className="font-mono font-bold text-indigo-400">
            {simulationStatus.rainfall_mm.toFixed(1)} mm/h
          </span>
        </div>

        <div className="flex items-center space-x-1.5 text-zinc-300">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-zinc-500">Closed Roads:</span>
          <span className={`font-mono font-bold ${simulationStatus.blocked_routes_count > 0 ? 'text-red-400' : 'text-zinc-300'}`}>
            {simulationStatus.blocked_routes_count}
          </span>
        </div>

        <div className="flex items-center space-x-1.5 text-zinc-300">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-zinc-500">Evacuees Sheltered:</span>
          <span className="font-mono font-bold text-emerald-400">
            {simulationStatus.shelter_occupancy_total}
          </span>
        </div>

        <div className="flex items-center space-x-1.5 text-zinc-300 border-l border-zinc-800 pl-4">
          <span className="text-zinc-500">Tick:</span>
          <span className="font-mono font-bold text-amber-400">#{simulationStatus.current_tick}</span>
        </div>
      </div>

      {/* Simulator Controls & Actions */}
      <div className="flex items-center space-x-2">
        <div className="flex items-center bg-zinc-800/80 rounded-lg p-1 border border-zinc-700/60">
          {simulationStatus.is_running ? (
            <button
              onClick={() => onControl('pause')}
              className="flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 rounded transition"
              title="Pause Simulation"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Pause</span>
            </button>
          ) : (
            <button
              onClick={() => onControl('start')}
              className="flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 rounded transition"
              title="Start Simulation"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Start</span>
            </button>
          )}

          <button
            onClick={() => onControl('step')}
            className="flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-700 rounded transition ml-1"
            title="Step One Simulation Tick"
          >
            <FastForward className="w-3.5 h-3.5" />
            <span>Step</span>
          </button>

          <button
            onClick={() => onControl('reset')}
            className="flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-zinc-400 hover:text-red-300 hover:bg-red-500/10 rounded transition ml-1"
            title="Reset Simulation Scenario"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>

        <button
          onClick={onOpenReportModal}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-600/90 hover:bg-red-500 text-white text-xs font-bold rounded-lg shadow-sm transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Report Incident</span>
        </button>
      </div>
    </nav>
  );
};
