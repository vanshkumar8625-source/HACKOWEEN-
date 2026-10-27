import React, { useState } from 'react';
import {
  HelpCircle, ShieldAlert, CheckCircle2, Truck, Clock,
  ArrowRight, UserCheck, AlertTriangle, Package, X
} from 'lucide-react';

interface BackupRequest {
  id: number;
  incident_id: number;
  requesting_team_id: number;
  assigned_backup_team_id?: number | null;
  location_name: string;
  latitude: number;
  longitude: number;
  reason: string;
  assistance_type: string;
  required_resources_json: string;
  personnel_needed: number;
  urgency: string;
  notes?: string | null;
  status: string;
  handover_type: string;
  eta_minutes?: number | null;
  created_at: string;
}

interface BackupRequestsViewProps {
  backupRequests: BackupRequest[];
  teams: any[];
  onAssignBackup: (requestId: number, teamId: number, handoverType: string, eta: number) => Promise<void>;
  onUpdateStatus: (requestId: number, status: string) => Promise<void>;
}

export const BackupRequestsView: React.FC<BackupRequestsViewProps> = ({
  backupRequests,
  teams,
  onAssignBackup,
  onUpdateStatus
}) => {
  const safeRequests = Array.isArray(backupRequests) ? backupRequests : [];
  const safeTeams = Array.isArray(teams) ? teams : [];

  const [selectedReqId, setSelectedReqId] = useState<number | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [handoverType, setHandoverType] = useState('Partial');
  const [etaMinutes, setEtaMinutes] = useState(15);
  const [assigning, setAssigning] = useState(false);

  const availableBackupTeams = safeTeams.filter(t => t.status === 'Available' && !t.is_restricted);

  const handleAssign = async (reqId: number) => {
    if (!selectedTeamId) {
      alert("Please select an available rescue team to assign as backup.");
      return;
    }
    setAssigning(true);
    try {
      await onAssignBackup(reqId, selectedTeamId, handoverType, etaMinutes);
      setSelectedReqId(null);
    } finally {
      setAssigning(false);
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'Critical':
        return 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse';
      case 'High':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default:
        return 'bg-teal-500/20 text-teal-400 border-teal-500/30';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'Assigned':
      case 'En Route':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'On Scene':
        return 'bg-teal-500/20 text-teal-400 border-teal-500/30';
      case 'Completed':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-zinc-800 text-zinc-400';
    }
  };

  return (
    <div className="flex-1 p-6 bg-zinc-950 overflow-y-auto custom-scrollbar font-sans text-xs">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-indigo-400" />
            Tactical Backup Requests & Team Handover
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Central coordination for secondary reinforcements, specialized heavy equipment, and command transfer
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-1 bg-zinc-800 text-zinc-300 rounded font-mono">
            {safeRequests.length} Total Requests
          </span>
          <span className="px-2.5 py-1 bg-red-500/20 text-red-400 rounded font-mono font-bold">
            {safeRequests.filter(r => r.status === 'Pending').length} Pending Assistance
          </span>
        </div>
      </div>

      {safeRequests.length === 0 ? (
        <div className="p-12 text-center bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-500">
          No tactical backup requests currently submitted from the field.
        </div>
      ) : (
        <div className="space-y-4">
          {safeRequests.map(req => {
            let requiredResources: string[] = [];
            try {
              if (req.required_resources_json) {
                requiredResources = JSON.parse(req.required_resources_json);
              }
            } catch (e) {}

            const requestingTeam = safeTeams.find(t => t.id === req.requesting_team_id);
            const assignedBackupTeam = safeTeams.find(t => t.id === req.assigned_backup_team_id);
            const isAssigningThis = selectedReqId === req.id;

            return (
              <div
                key={req.id}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition shadow-sm space-y-4"
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-zinc-400 font-bold">Request #{req.id}</span>
                      <span className="text-zinc-600">•</span>
                      <span className="text-zinc-200 font-bold">Incident #{req.incident_id}</span>
                      <span className="text-zinc-600">•</span>
                      <span className="text-teal-400 font-medium">{req.location_name}</span>
                    </div>
                    <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
                      {req.assistance_type}
                      <span className="text-[11px] font-normal text-zinc-400">
                        (Requested by: <strong className="text-zinc-200">{requestingTeam?.name || `Team #${req.requesting_team_id}`}</strong>)
                      </span>
                    </h3>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold border ${getUrgencyBadge(req.urgency)}`}>
                      {req.urgency} Urgency
                    </span>
                    <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold border ${getStatusBadge(req.status)}`}>
                      {req.status}
                    </span>
                  </div>
                </div>

                {/* Reason & Narrative */}
                <div className="bg-zinc-950 p-3.5 rounded-lg border border-zinc-800/80 text-zinc-300 leading-relaxed">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase block mb-0.5">
                    Field Problem / Reason:
                  </span>
                  "{req.reason}"
                </div>

                {/* Specifications Bar */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-zinc-400">
                  <div className="bg-zinc-950/60 p-2.5 rounded border border-zinc-800">
                    <span className="text-[10px] text-zinc-500 uppercase block">Personnel Needed</span>
                    <span className="font-mono text-white font-bold">{req.personnel_needed} Responders</span>
                  </div>
                  <div className="bg-zinc-950/60 p-2.5 rounded border border-zinc-800">
                    <span className="text-[10px] text-zinc-500 uppercase block">Handover Mode</span>
                    <span className="font-bold text-indigo-300">{req.handover_type} Handover</span>
                  </div>
                  <div className="bg-zinc-950/60 p-2.5 rounded border border-zinc-800">
                    <span className="text-[10px] text-zinc-500 uppercase block">Backup Team</span>
                    <span className="font-semibold text-zinc-200 truncate block">
                      {assignedBackupTeam ? assignedBackupTeam.name : 'Awaiting Assignment'}
                    </span>
                  </div>
                  <div className="bg-zinc-950/60 p-2.5 rounded border border-zinc-800">
                    <span className="text-[10px] text-zinc-500 uppercase block">Expected ETA</span>
                    <span className="font-mono font-bold text-teal-400">
                      {req.eta_minutes ? `~${req.eta_minutes} mins` : 'Pending'}
                    </span>
                  </div>
                </div>

                {/* Requested Resources Badges */}
                {requiredResources.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold mr-1 flex items-center gap-1">
                      <Package className="w-3.5 h-3.5 text-zinc-400" /> Requested:
                    </span>
                    {requiredResources.map((res, i) => (
                      <span key={i} className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded text-[10px] font-medium">
                        {res}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions / Assignment Panel */}
                <div className="pt-3 border-t border-zinc-800 flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-[11px] text-zinc-500">
                    Requested at: {new Date(req.created_at).toLocaleTimeString()}
                  </div>

                  <div className="flex items-center space-x-2">
                    {req.status === 'Pending' && !isAssigningThis && (
                      <button
                        onClick={() => {
                          setSelectedReqId(req.id);
                          if (availableBackupTeams.length > 0) {
                            setSelectedTeamId(availableBackupTeams[0].id);
                          }
                        }}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition flex items-center gap-1.5"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        Assign Backup Team
                      </button>
                    )}

                    {req.status === 'Assigned' && (
                      <button
                        onClick={() => onUpdateStatus(req.id, 'En Route')}
                        className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg font-semibold transition"
                      >
                        Mark Backup En Route
                      </button>
                    )}

                    {req.status === 'En Route' && (
                      <button
                        onClick={() => onUpdateStatus(req.id, 'On Scene')}
                        className="px-3 py-1.5 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 rounded-lg font-semibold transition"
                      >
                        Mark Backup On Scene
                      </button>
                    )}

                    {req.status === 'On Scene' && (
                      <button
                        onClick={() => onUpdateStatus(req.id, 'Completed')}
                        className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg font-semibold transition"
                      >
                        Mark Backup Mission Completed
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline Assignment Modal/Box */}
                {isAssigningThis && (
                  <div className="mt-4 p-4 bg-zinc-950 border border-indigo-500/40 rounded-xl space-y-3 animate-slideUp">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-indigo-300 text-xs">
                        Dispatch Backup Reinforcement
                      </span>
                      <button
                        onClick={() => setSelectedReqId(null)}
                        className="text-zinc-500 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-zinc-400 mb-1 font-semibold text-[11px]">
                          Select Available Team
                        </label>
                        <select
                          value={selectedTeamId || ''}
                          onChange={e => setSelectedTeamId(parseInt(e.target.value))}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white text-xs"
                        >
                          {availableBackupTeams.length === 0 ? (
                            <option value="">No Available Teams</option>
                          ) : (
                            availableBackupTeams.map(t => (
                              <option key={t.id} value={t.id}>
                                {t.name} ({t.specialization}) - {t.average_rating}★
                              </option>
                            ))
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="block text-zinc-400 mb-1 font-semibold text-[11px]">
                          Handover Mode
                        </label>
                        <select
                          value={handoverType}
                          onChange={e => setHandoverType(e.target.value)}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white text-xs"
                        >
                          <option value="Partial">Partial (Joint Reinforcement)</option>
                          <option value="Complete">Complete (Full Incident Transfer)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-zinc-400 mb-1 font-semibold text-[11px]">
                          Expected ETA (Minutes)
                        </label>
                        <input
                          type="number"
                          min={5}
                          max={120}
                          value={etaMinutes}
                          onChange={e => setEtaMinutes(parseInt(e.target.value))}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white font-mono text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setSelectedReqId(null)}
                        className="px-3 py-1.5 bg-zinc-800 text-zinc-400 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={assigning || !selectedTeamId}
                        onClick={() => handleAssign(req.id)}
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold shadow transition disabled:opacity-50"
                      >
                        {assigning ? 'Dispatching...' : 'Confirm Dispatch & Alert Field'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
