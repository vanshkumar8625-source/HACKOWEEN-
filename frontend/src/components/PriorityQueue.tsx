import React, { useState } from 'react';
import {
  ListOrdered, ChevronDown, ChevronUp, UserCheck, ShieldAlert, CheckCircle2,
  Clock, HelpCircle, Sparkles, AlertTriangle, MapPin, Check, Flag
} from 'lucide-react';
import { DeadlineCountdown } from './DeadlineCountdown';

export interface Incident {
  id: number;
  title: string;
  disaster_type: string;
  severity: string;
  priority_score: number;
  priority_breakdown?: string;
  location_name: string;
  status: string;
  required_skill: string;
  assigned_team_id?: number | null;
  backup_team_id?: number | null;
  latitude: number;
  longitude: number;
  deadline_at?: string | null;
  estimated_arrival_at?: string | null;
  actual_arrival_at?: string | null;
  resolved_at?: string | null;
  deadline_status?: string;
  deadline_extended_reason?: string | null;
  backup_requested?: boolean;
  delay_reason?: string | null;
  delay_category?: string | null;
  delay_reviewed?: boolean;
  people_affected?: number;
  casualties_count?: number;
  description?: string;
  reported_by?: string;
  created_at?: string;
  media_url?: string | null;
  media_type?: string | null;
}

interface PriorityQueueProps {
  incidents: Incident[];
  userRole?: 'admin' | 'responder' | 'citizen';
  onAutoAssignTeam: (incidentId: number) => Promise<void>;
  onMarkArrival?: (incidentId: number) => Promise<void>;
  onResolveRescue?: (incidentId: number) => Promise<void>;
  onOpenAdjustDeadline?: (incident: Incident) => void;
  onOpenBackupRequest?: (incident: Incident) => void;
  onOpenDelayReview?: (incident: Incident) => void;
  onOpenRecommendations?: (incident: Incident) => void;
  onSelectIncident?: (incident: Incident) => void;
}

export const PriorityQueue: React.FC<PriorityQueueProps> = ({
  incidents,
  userRole = 'admin',
  onAutoAssignTeam,
  onMarkArrival,
  onResolveRescue,
  onOpenAdjustDeadline,
  onOpenBackupRequest,
  onOpenDelayReview,
  onOpenRecommendations,
  onSelectIncident
}) => {
  const [filter, setFilter] = useState<'all' | 'critical' | 'approaching' | 'delayed' | 'resolved'>('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [assigningId, setAssigningId] = useState<number | null>(null);
  const [actioningId, setActioningId] = useState<number | null>(null);

  const toggleExpand = (id: number) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const handleAssign = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setAssigningId(id);
    try {
      await onAutoAssignTeam(id);
    } finally {
      setAssigningId(null);
    }
  };

  const handleArrival = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!onMarkArrival) return;
    setActioningId(id);
    try {
      await onMarkArrival(id);
    } finally {
      setActioningId(null);
    }
  };

  const handleResolve = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!onResolveRescue) return;
    setActioningId(id);
    try {
      await onResolveRescue(id);
    } finally {
      setActioningId(null);
    }
  };

  const safeIncidents = Array.isArray(incidents) ? incidents : [];

  // Filter incidents
  const filtered = safeIncidents.filter(inc => {
    if (filter === 'critical') return inc.severity === 'Critical';
    if (filter === 'delayed') return inc.deadline_status === 'Delayed';
    if (filter === 'approaching') return inc.status !== 'Resolved' && inc.deadline_status !== 'Delayed';
    if (filter === 'resolved') return inc.status === 'Resolved';
    return true;
  });

  // Sort: Active higher score first, resolved at bottom
  const sorted = [...filtered].sort((a, b) => {
    if (a.status === 'Resolved' && b.status !== 'Resolved') return 1;
    if (a.status !== 'Resolved' && b.status === 'Resolved') return -1;
    return b.priority_score - a.priority_score;
  });

  return (
    <div className="flex flex-col h-full bg-zinc-900 border-l border-zinc-800 text-xs font-sans">
      
      {/* Header */}
      <div className="p-3.5 border-b border-zinc-800 bg-zinc-950/60 shrink-0 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ListOrdered className="w-4 h-4 text-teal-400" />
            <h2 className="font-bold text-zinc-100 uppercase tracking-wider text-[11px]">
              Triage & Response Queue
            </h2>
          </div>
          <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px]">
            {sorted.length} Shown
          </span>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto custom-scrollbar pb-0.5 text-[10px]">
          <button
            onClick={() => setFilter('all')}
            className={`px-2 py-0.5 rounded font-semibold transition ${
              filter === 'all' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            All ({safeIncidents.length})
          </button>
          <button
            onClick={() => setFilter('critical')}
            className={`px-2 py-0.5 rounded font-semibold transition ${
              filter === 'critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Critical
          </button>
          <button
            onClick={() => setFilter('approaching')}
            className={`px-2 py-0.5 rounded font-semibold transition ${
              filter === 'approaching' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Active Timers
          </button>
          <button
            onClick={() => setFilter('delayed')}
            className={`px-2 py-0.5 rounded font-semibold transition ${
              filter === 'delayed' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Delayed ({safeIncidents.filter(i => i.deadline_status === 'Delayed').length})
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`px-2 py-0.5 rounded font-semibold transition ${
              filter === 'resolved' ? 'bg-emerald-500/20 text-emerald-300' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Resolved
          </button>
        </div>
      </div>

      {/* Incident List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
        {sorted.length === 0 ? (
          <div className="text-center py-10 text-zinc-500">
            No emergency incidents match current filter.
          </div>
        ) : (
          sorted.map((inc, index) => {
            const isExpanded = expandedId === inc.id;
            let breakdownData: any = null;
            try {
              if (inc.priority_breakdown) {
                breakdownData = JSON.parse(inc.priority_breakdown);
              }
            } catch (e) {}

            const isCritical = inc.severity === 'Critical';
            const isDelayed = inc.deadline_status === 'Delayed';
            const isResolved = inc.status === 'Resolved';
            const hasArrived = Boolean(inc.actual_arrival_at);

            return (
              <div
                key={inc.id}
                onClick={() => onSelectIncident && onSelectIncident(inc)}
                className={`p-3 rounded-xl border transition-all cursor-pointer space-y-2 ${
                  isResolved
                    ? 'bg-zinc-950/40 border-zinc-800 opacity-80'
                    : isDelayed
                    ? 'bg-red-950/20 border-red-700/80 shadow-[0_0_12px_rgba(239,68,68,0.15)]'
                    : isCritical
                    ? 'bg-zinc-900 border-red-800/60 hover:border-red-600'
                    : 'bg-zinc-900/90 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {/* Title & Priority Row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <span className="font-mono text-zinc-400 font-bold text-[10px]">#{inc.id}</span>
                    <span className="font-semibold text-zinc-200 truncate text-xs">{inc.title}</span>
                  </div>
                  
                  <div className="flex items-center gap-1 shrink-0">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                        inc.priority_score >= 80
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : inc.priority_score >= 60
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-teal-500/20 text-teal-400'
                      }`}
                    >
                      {inc.priority_score.toFixed(1)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(inc.id);
                      }}
                      className="text-zinc-400 hover:text-zinc-200 p-0.5"
                    >
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Location & Status Subtitle */}
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span className="truncate flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-zinc-500 shrink-0" />
                    {inc.location_name}
                  </span>
                  <span className="capitalize px-1.5 py-0.2 rounded bg-zinc-950 border border-zinc-800 text-[10px] font-medium text-zinc-300">
                    {inc.status}
                  </span>
                </div>

                {/* Requirement 1: Live Response Countdown Timer */}
                <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80">
                  <DeadlineCountdown
                    deadlineAt={inc.deadline_at}
                    status={inc.status}
                    actualArrivalAt={inc.actual_arrival_at}
                    deadlineStatus={inc.deadline_status}
                  />

                  {inc.backup_requested && (
                    <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[9px] font-bold animate-pulse">
                      Backup Call Active
                    </span>
                  )}
                </div>

                {/* Visual Evidence (Photo or Video) */}
                {inc.media_url && (
                  <div className="rounded-lg overflow-hidden border border-zinc-800 bg-black/60 my-1">
                    <div className="flex items-center justify-between px-2 py-0.5 bg-zinc-950/80 text-[10px] text-zinc-400">
                      <span className="flex items-center gap-1 font-semibold text-rose-400">
                        {inc.media_type === 'video' ? '🎥 Ground Video' : '📸 Disaster Photo'}
                      </span>
                      <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono">Evidence</span>
                    </div>
                    {inc.media_type === 'video' ? (
                      <video
                        src={inc.media_url}
                        controls
                        className="w-full max-h-36 object-cover bg-black"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <img
                        src={inc.media_url}
                        alt={inc.title}
                        className="w-full max-h-36 object-cover hover:scale-105 transition duration-300"
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                  </div>
                )}

                {/* Contextual Action Buttons */}
                {!isResolved && (
                  <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-1.5 flex-wrap">
                    
                    {/* Team Assignment or Arrival */}
                    {!inc.assigned_team_id ? (
                      <button
                        onClick={(e) => handleAssign(e, inc.id)}
                        disabled={assigningId === inc.id}
                        className="flex items-center gap-1 px-2.5 py-1 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 rounded font-semibold text-[10px] transition disabled:opacity-50"
                      >
                        <UserCheck className="w-3 h-3" />
                        {assigningId === inc.id ? 'Assigning...' : 'Auto-Assign'}
                      </button>
                    ) : !hasArrived ? (
                      <button
                        onClick={(e) => handleArrival(e, inc.id)}
                        disabled={actioningId === inc.id}
                        className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded font-bold text-[10px] transition"
                        title="Confirm rescue team arrival on scene"
                      >
                        <Check className="w-3 h-3" />
                        Mark Arrived
                      </button>
                    ) : (
                      <button
                        onClick={(e) => handleResolve(e, inc.id)}
                        disabled={actioningId === inc.id}
                        className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded font-bold text-[10px] transition"
                        title="Mark rescue completed and rate team"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Resolve Rescue
                      </button>
                    )}

                    <div className="flex items-center space-x-1">
                      {/* AI Resource Recommendations */}
                      {onOpenRecommendations && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenRecommendations(inc);
                          }}
                          className="p-1 text-zinc-400 hover:text-teal-300 hover:bg-zinc-800 rounded transition"
                          title="View Grounded AI Resource Recommendations"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Request Backup Button (Requirement 4) */}
                      {onOpenBackupRequest && inc.assigned_team_id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenBackupRequest(inc);
                          }}
                          className="p-1 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded transition"
                          title="Request Emergency Backup Assistance"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Admin Adjust Deadline (Requirement 1) */}
                      {userRole === 'admin' && onOpenAdjustDeadline && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenAdjustDeadline(inc);
                          }}
                          className="p-1 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 rounded transition"
                          title="Adjust Response Deadline (Admin)"
                        >
                          <Clock className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Delay Explanation / Review (Requirement 3) */}
                      {isDelayed && onOpenDelayReview && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenDelayReview(inc);
                          }}
                          className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition"
                          title="Submit or Review Delay Reason"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Explainable Breakdown Accordion */}
                {isExpanded && breakdownData && (
                  <div className="mt-2 p-2.5 bg-zinc-950 rounded-lg border border-zinc-800 text-[10px] space-y-1.5">
                    <div className="font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3 text-amber-400" /> Explainable Priority Breakdown
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-zinc-400 font-mono">
                      <div>Severity Weight: <span className="text-zinc-200">{breakdownData.components?.severity_weight} pts</span></div>
                      <div>Hazard Impact: <span className="text-zinc-200">{breakdownData.components?.disaster_hazard} pts</span></div>
                      <div>Environmental: <span className="text-zinc-200">{breakdownData.components?.environmental_risk} pts</span></div>
                      <div>Vulnerability: <span className="text-zinc-200">{breakdownData.components?.vulnerability_factors} pts</span></div>
                      <div className="col-span-2">Wait Time Boost: <span className="text-zinc-200">{breakdownData.components?.waiting_time_boost} pts</span></div>
                    </div>
                    {inc.deadline_extended_reason && (
                      <div className="pt-1.5 border-t border-zinc-800 text-amber-400">
                        <strong>Deadline Extension Note:</strong> {inc.deadline_extended_reason}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
