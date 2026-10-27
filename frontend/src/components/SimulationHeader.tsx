import React from 'react';
import {
  Play, Pause, FastForward, RotateCcw, Plus, Droplets, CloudRain,
  AlertTriangle, ShieldCheck, Bell, Sparkles, Mic, UserCheck
} from 'lucide-react';

interface SimulationHeaderProps {
  simulationStatus: {
    is_running: boolean;
    current_tick: number;
    flood_level_m: number;
    rainfall_mm: number;
    blocked_routes_count: number;
    shelter_occupancy_total: number;
  };
  userRole: 'admin' | 'responder' | 'citizen';
  onRoleChange: (role: 'admin' | 'responder' | 'citizen') => void;
  unreadNotificationsCount?: number;
  onOpenNotifications: () => void;
  onOpenAIAssistant: () => void;
  onControl: (action: 'start' | 'pause' | 'step' | 'reset') => void;
  onOpenReportModal: () => void;
}

export const SimulationHeader: React.FC<SimulationHeaderProps> = ({
  simulationStatus,
  userRole,
  onRoleChange,
  unreadNotificationsCount = 0,
  onOpenNotifications,
  onOpenAIAssistant,
  onControl,
  onOpenReportModal
}) => {
  return (
    <nav className="h-16 border-b border-zinc-800 bg-zinc-900/95 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 z-50 shrink-0 shadow-sm font-sans">
      
      {/* Brand & Simulation Badge */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 font-extrabold text-sm shadow">
            AD
          </div>
          <div>
            <h1 className="text-xs sm:text-sm font-bold tracking-wide text-zinc-100 flex items-center gap-1.5 sm:gap-2">
              ADRACS Command
              <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.2 rounded font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/30 hidden md:flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                SIMULATED DATA
              </span>
            </h1>
            <p className="text-[10px] sm:text-[11px] text-zinc-400">Time-Bound Rescue & Coordination System</p>
          </div>
        </div>
      </div>

      {/* Role Switcher (Student / Teacher Demo Control) */}
      <div className="hidden lg:flex items-center bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-[11px]">
        <span className="text-zinc-500 px-2 font-bold uppercase text-[9px]">Demo Role:</span>
        <button
          onClick={() => onRoleChange('admin')}
          className={`px-2.5 py-1 rounded-md font-semibold transition ${
            userRole === 'admin' ? 'bg-teal-500 text-zinc-950 font-bold shadow' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Administrator
        </button>
        <button
          onClick={() => onRoleChange('responder')}
          className={`px-2.5 py-1 rounded-md font-semibold transition ${
            userRole === 'responder' ? 'bg-teal-500 text-zinc-950 font-bold shadow' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Field Responder
        </button>
        <button
          onClick={() => onRoleChange('citizen')}
          className={`px-2.5 py-1 rounded-md font-semibold transition ${
            userRole === 'citizen' ? 'bg-teal-500 text-zinc-950 font-bold shadow' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Citizen
        </button>
      </div>

      {/* Live Telemetry Ticker */}
      <div className="hidden 2xl:flex items-center space-x-6 text-xs bg-zinc-950/60 px-4 py-1.5 rounded-lg border border-zinc-800">
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
          <span className="text-zinc-500">Evacuees:</span>
          <span className="font-mono font-bold text-emerald-400">
            {simulationStatus.shelter_occupancy_total}
          </span>
        </div>
      </div>

      {/* Controls & Assistant Shortcuts */}
      <div className="flex items-center space-x-2">
        
        {/* Simulator Controls */}
        <div className="hidden sm:flex items-center bg-zinc-800/80 rounded-lg p-1 border border-zinc-700/60">
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
            className="flex items-center space-x-1 px-2 py-1 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-700 rounded transition ml-1"
            title="Step One Simulation Tick"
          >
            <FastForward className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onControl('reset')}
            className="flex items-center space-x-1 px-2 py-1 text-xs font-semibold text-zinc-400 hover:text-red-300 hover:bg-red-500/10 rounded transition ml-1"
            title="Reset Simulation Scenario"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* AI Voice Assistant Button (Glowing Action) */}
        <button
          onClick={onOpenAIAssistant}
          className="relative flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-zinc-950 font-extrabold text-xs rounded-lg shadow-[0_0_15px_rgba(20,184,166,0.3)] transition group"
          title="Open AI Voice Emergency Assistant"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-950 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-zinc-950"></span>
          </span>
          <Mic className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
          <span className="hidden sm:inline">Voice SOS</span>
        </button>

        {/* Notification Bell */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg border border-zinc-700 transition"
          title="Dispatch Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white font-mono text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
              {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
            </span>
          )}
        </button>

        {/* Manual Report Modal */}
        <button
          onClick={onOpenReportModal}
          className="flex items-center space-x-1 px-2.5 sm:px-3 py-1.5 bg-red-600/90 hover:bg-red-500 text-white text-xs font-bold rounded-lg shadow-sm transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Report</span>
        </button>
      </div>
    </nav>
  );
};
