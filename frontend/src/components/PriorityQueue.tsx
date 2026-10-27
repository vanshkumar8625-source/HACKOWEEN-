import React, { useState } from 'react';
import { ListOrdered, ChevronDown, ChevronUp, UserCheck, ShieldAlert, CheckCircle2 } from 'lucide-react';

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
  assigned_team_id?: number;
  latitude: number;
  longitude: number;
}

interface PriorityQueueProps {
  incidents: Incident[];
  onAutoAssignTeam: (incidentId: number) => Promise<void>;
  onSelectIncident?: (incident: Incident) => void;
}

export const PriorityQueue: React.FC<PriorityQueueProps> = ({
  incidents,
  onAutoAssignTeam,
  onSelectIncident
}) => {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [assigningId, setAssigningId] = useState<number | null>(null);

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

  // Sort by priority score descending
  const sorted = [...incidents].sort((a, b) => b.priority_score - a.priority_score);

  return (
    <div className="flex flex-col h-full bg-zinc-900 border-l border-zinc-800 text-xs">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/40">
        <div className="flex items-center space-x-2">
          <ListOrdered className="w-4 h-4 text-teal-400" />
          <h2 className="font-bold text-zinc-100 uppercase tracking-wider text-[11px]">
            Priority Action Queue
          </h2>
        </div>
        <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px]">
          {sorted.length} Active
        </span>
      </div>

      {/* Incident List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
        {sorted.length === 0 ? (
          <div className="text-center py-10 text-zinc-500">
            No active emergency incidents reported.
          </div>
        ) : (
          sorted.map((inc, index) => {
            const isExpanded = expandedId === inc.id;
            let breakdownData: any = null;
            try {
              if (inc.priority_breakdown) {
                breakdownData = JSON.parse(inc.priority_breakdown);
              }
            } catch (e) {
              // ignore parse errors
            }

            const isCritical = inc.severity === 'Critical';

            return (
              <div
                key={inc.id}
                onClick={() => onSelectIncident && onSelectIncident(inc)}
                className={`p-3 rounded-lg border transition-all cursor-pointer ${
                  isCritical
                    ? 'bg-red-950/20 border-red-800/60 hover:border-red-600'
                    : 'bg-zinc-800/50 border-zinc-700/60 hover:border-zinc-500'
                }`}
              >
                {/* Title & Priority Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <span className="font-mono text-zinc-400 font-bold text-[10px]">#{index + 1}</span>
                    <span className="font-semibold text-zinc-200 truncate">{inc.title}</span>
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
                      Score: {inc.priority_score.toFixed(1)}
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

                {/* Subtitle / Status */}
                <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-1.5">
                  <span>{inc.location_name}</span>
                  <span className="capitalize px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-800 text-[10px]">
                    {inc.status}
                  </span>
                </div>

                {/* Action Row */}
                <div className="mt-2.5 pt-2 border-t border-zinc-700/40 flex items-center justify-between">
                  <span className="text-[10px] text-zinc-400">
                    Req: <span className="text-zinc-300 font-medium">{inc.required_skill}</span>
                  </span>

                  {inc.assigned_team_id ? (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3 h-3" /> Team Assigned
                    </span>
                  ) : (
                    <button
                      onClick={(e) => handleAssign(e, inc.id)}
                      disabled={assigningId === inc.id}
                      className="flex items-center gap-1 px-2 py-1 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 rounded font-semibold text-[10px] transition disabled:opacity-50"
                    >
                      <UserCheck className="w-3 h-3" />
                      {assigningId === inc.id ? 'Assigning...' : 'Auto-Assign Team'}
                    </button>
                  )}
                </div>

                {/* Expandable Explainability Breakdown Accordion */}
                {isExpanded && breakdownData && (
                  <div className="mt-2.5 p-2.5 bg-zinc-950/80 rounded border border-zinc-800 text-[10px] space-y-1.5">
                    <div className="font-bold text-zinc-300 text-[10px] uppercase tracking-wider flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3 text-amber-400" /> Explainable Priority Breakdown
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-zinc-400 font-mono">
                      <div>Severity Weight: <span className="text-zinc-200">{breakdownData.components?.severity_weight} pts</span></div>
                      <div>Hazard Impact: <span className="text-zinc-200">{breakdownData.components?.disaster_hazard} pts</span></div>
                      <div>Environmental: <span className="text-zinc-200">{breakdownData.components?.environmental_risk} pts</span></div>
                      <div>Vulnerability: <span className="text-zinc-200">{breakdownData.components?.vulnerability_factors} pts</span></div>
                      <div className="col-span-2">Wait Time Boost: <span className="text-zinc-200">{breakdownData.components?.waiting_time_boost} pts</span></div>
                    </div>
                    {breakdownData.explanation && (
                      <div className="text-zinc-400 pt-1 border-t border-zinc-800 leading-relaxed font-sans">
                        {breakdownData.explanation}
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
