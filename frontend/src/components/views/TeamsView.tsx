import React, { useState } from 'react';
import {
  Users, Phone, MapPin, ShieldCheck, Star, Clock,
  AlertTriangle, HelpCircle, ShieldAlert, Award, FileText, CheckCircle2, X
} from 'lucide-react';

interface RescueTeam {
  id: number;
  name: string;
  specialization: string;
  members_count: number;
  status: string;
  latitude: number;
  longitude: number;
  contact_number: string;
  average_rating: number;
  total_ratings: number;
  completed_rescues: number;
  on_time_rescues: number;
  delayed_rescues: number;
  on_time_percentage: number;
  is_restricted: boolean;
  restriction_reason?: string | null;
}

interface TeamsViewProps {
  teams: RescueTeam[];
  userRole?: 'admin' | 'responder' | 'citizen';
  onUpdateStatus: (id: number, status: string) => Promise<void>;
  onToggleRestriction?: (id: number, isRestricted: boolean, reason?: string) => Promise<void>;
  onRequestBackup?: (teamId: number) => void;
  apiUrl?: string;
}

export const TeamsView: React.FC<TeamsViewProps> = ({
  teams,
  userRole = 'admin',
  onUpdateStatus,
  onToggleRestriction,
  onRequestBackup,
  apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
}) => {
  const safeTeams = Array.isArray(teams) ? teams : [];

  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [historyModalTeam, setHistoryModalTeam] = useState<RescueTeam | null>(null);
  const [teamRatings, setTeamRatings] = useState<any[]>([]);
  const [loadingRatings, setLoadingRatings] = useState(false);
  const [disputeId, setDisputeId] = useState<number | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [supervisorNotes, setSupervisorNotes] = useState('');
  const [adjustedRating, setAdjustedRating] = useState('4.5');

  const handleStatusChange = async (id: number, newStatus: string) => {
    setUpdatingId(id);
    try {
      await onUpdateStatus(id, newStatus);
    } finally {
      setUpdatingId(null);
    }
  };

  const openRatingHistory = async (team: RescueTeam) => {
    setHistoryModalTeam(team);
    setLoadingRatings(true);
    try {
      const res = await fetch(`${apiUrl}/api/teams/${team.id}/ratings`);
      const data = await res.json();
      setTeamRatings(data || []);
    } catch (err) {
      console.error("Failed fetching team ratings:", err);
    } finally {
      setLoadingRatings(false);
    }
  };

  const handleDisputeSubmit = async (ratingId: number) => {
    if (!disputeReason.trim()) return;
    try {
      await fetch(`${apiUrl}/api/teams/ratings/${ratingId}/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dispute_reason: disputeReason })
      });
      alert("Rating dispute submitted for supervisory review.");
      setDisputeId(null);
      setDisputeReason('');
      if (historyModalTeam) openRatingHistory(historyModalTeam);
    } catch (err: any) {
      alert("Failed submitting dispute: " + err.message);
    }
  };

  const handleSupervisorReview = async (ratingId: number, status: string) => {
    try {
      await fetch(`${apiUrl}/api/teams/ratings/${ratingId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dispute_status: status,
          supervisor_notes: supervisorNotes || 'Supervisory audit completed.',
          adjusted_rating: parseFloat(adjustedRating)
        })
      });
      alert(`Dispute ${status}. Rating updated.`);
      setDisputeId(null);
      if (historyModalTeam) openRatingHistory(historyModalTeam);
    } catch (err: any) {
      alert("Failed reviewing dispute: " + err.message);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Available':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'Dispatched':
      case 'En Route':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'On Scene':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-zinc-700/50 text-zinc-400 border-zinc-600';
    }
  };

  const renderStars = (rating: number) => {
    const full = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    return (
      <div className="flex items-center space-x-0.5 text-amber-400">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-3.5 h-3.5 ${
              i < full || (i === full && hasHalf) ? 'fill-amber-400 text-amber-400' : 'text-zinc-600'
            }`}
          />
        ))}
        <span className="font-mono font-bold text-xs ml-1 text-white">{rating.toFixed(1)}</span>
      </div>
    );
  };

  return (
    <div className="flex-1 p-6 bg-zinc-950 overflow-y-auto custom-scrollbar font-sans text-xs">
      {/* View Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-400" />
            Response Teams & 5-Star Performance Ratings
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real-time status, transparent performance scores, on-time response rates, and tactical backup requests
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-1 bg-zinc-800 text-zinc-300 rounded font-mono">
            Total Teams: {safeTeams.length}
          </span>
          <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 rounded font-mono">
            Available: {safeTeams.filter(t => t.status === 'Available').length}
          </span>
          <span className="px-2.5 py-1 bg-amber-500/20 text-amber-400 rounded font-mono">
            Restricted: {safeTeams.filter(t => t.is_restricted).length}
          </span>
        </div>
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {safeTeams.map(team => {
          const isRestricted = team.is_restricted;

          return (
            <div
              key={team.id}
              className={`bg-zinc-900 border rounded-xl p-5 transition shadow-sm space-y-4 ${
                isRestricted
                  ? 'border-red-600/70 bg-red-950/10'
                  : 'border-zinc-800 hover:border-zinc-700'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-1.5">
                    {team.name}
                  </h3>
                  <span className="text-xs text-teal-400 font-medium">{team.specialization}</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getStatusBadge(team.status)}`}>
                  {team.status}
                </span>
              </div>

              {/* Restriction Warning Banner */}
              {isRestricted && (
                <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-[11px] text-red-300 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 animate-pulse" />
                  <div>
                    <strong>Temporary Assignment Restriction:</strong> {team.restriction_reason || "Safety compliance review in progress."}
                  </div>
                </div>
              )}

              {/* Performance Rating Card */}
              <div className="bg-zinc-950/80 p-3 rounded-lg border border-zinc-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-amber-400" /> Performance Rating
                  </span>
                  <button
                    onClick={() => openRatingHistory(team)}
                    className="text-[10px] text-teal-400 hover:text-teal-300 font-semibold"
                  >
                    View History & Audits
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  {renderStars(team.average_rating || 5.0)}
                  <span className="text-[10px] text-zinc-400">
                    ({team.total_ratings || 0} reviews)
                  </span>
                </div>

                {/* Score breakdown metrics */}
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-zinc-800 text-center text-[10px]">
                  <div>
                    <span className="text-zinc-500 block">Rescues</span>
                    <span className="font-mono font-bold text-zinc-200">{team.completed_rescues || 0}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">On-Time %</span>
                    <span className="font-mono font-bold text-emerald-400">{team.on_time_percentage || 100}%</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Delayed</span>
                    <span className="font-mono font-bold text-red-400">{team.delayed_rescues || 0}</span>
                  </div>
                </div>
              </div>

              {/* Team Details */}
              <div className="space-y-1.5 text-xs text-zinc-400">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-zinc-400">
                    <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" /> Unit Personnel:
                  </span>
                  <span className="font-mono text-zinc-200 font-bold">{team.members_count} Responders</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-zinc-400">
                    <MapPin className="w-3.5 h-3.5 text-zinc-500" /> Base GPS:
                  </span>
                  <span className="font-mono text-zinc-300 text-[11px]">
                    {team.latitude.toFixed(4)}, {team.longitude.toFixed(4)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-zinc-400">
                    <Phone className="w-3.5 h-3.5 text-zinc-500" /> Dispatch Radio:
                  </span>
                  <span className="font-mono text-zinc-300">{team.contact_number}</span>
                </div>
              </div>

              {/* Actions & Backup Button */}
              <div className="pt-3 border-t border-zinc-800 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center space-x-1.5">
                  {/* Status Buttons */}
                  {team.status !== 'Available' && (
                    <button
                      disabled={updatingId === team.id || isRestricted}
                      onClick={() => handleStatusChange(team.id, 'Available')}
                      className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded text-[10px] font-semibold transition disabled:opacity-50"
                    >
                      Available
                    </button>
                  )}
                  {team.status === 'Available' && (
                    <button
                      disabled={updatingId === team.id || isRestricted}
                      onClick={() => handleStatusChange(team.id, 'En Route')}
                      className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded text-[10px] font-semibold transition disabled:opacity-50"
                    >
                      En Route
                    </button>
                  )}
                  {team.status !== 'On Scene' && (
                    <button
                      disabled={updatingId === team.id}
                      onClick={() => handleStatusChange(team.id, 'On Scene')}
                      className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded text-[10px] font-semibold transition"
                    >
                      On Scene
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-1.5">
                  {/* Request Backup Button (Requirement 4) */}
                  {onRequestBackup && (
                    <button
                      onClick={() => onRequestBackup(team.id)}
                      className="px-2.5 py-1 bg-red-600/90 hover:bg-red-500 text-white rounded text-[10px] font-bold shadow transition flex items-center gap-1"
                      title="Request tactical backup / handover"
                    >
                      <HelpCircle className="w-3 h-3" />
                      Request Backup
                    </button>
                  )}

                  {/* Admin Restriction Toggle */}
                  {userRole === 'admin' && onToggleRestriction && (
                    <button
                      onClick={() => onToggleRestriction(team.id, !isRestricted, isRestricted ? undefined : "Administrative safety review")}
                      className={`px-2 py-1 rounded text-[10px] font-semibold transition ${
                        isRestricted
                          ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                          : 'bg-zinc-800 text-zinc-400 hover:text-red-300'
                      }`}
                    >
                      {isRestricted ? 'Lift Restriction' : 'Restrict'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rating History & Supervisory Audit Modal */}
      {historyModalTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950">
              <div className="flex items-center space-x-2">
                <Award className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Performance Rating History & Audit</h3>
                  <p className="text-[11px] text-zinc-400">{historyModalTeam.name}</p>
                </div>
              </div>
              <button
                onClick={() => setHistoryModalTeam(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase block">Cumulative Score</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    {renderStars(historyModalTeam.average_rating || 5.0)}
                    <span className="text-zinc-400 text-xs font-mono">
                      ({historyModalTeam.completed_rescues} completed)
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-zinc-500 uppercase block">On-Time Performance</span>
                  <span className="font-mono text-emerald-400 font-bold text-sm">
                    {historyModalTeam.on_time_percentage}%
                  </span>
                </div>
              </div>

              {loadingRatings ? (
                <div className="py-8 text-center text-zinc-500">Loading audit records...</div>
              ) : teamRatings.length === 0 ? (
                <div className="py-8 text-center text-zinc-500">
                  No verified rating audits recorded yet for this team.
                </div>
              ) : (
                <div className="space-y-3">
                  {teamRatings.map(r => (
                    <div
                      key={r.id}
                      className="p-3.5 bg-zinc-950/70 border border-zinc-800 rounded-xl space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-amber-400 font-mono text-xs">{r.rating}★</span>
                          <span className="text-zinc-500">•</span>
                          <span className="text-zinc-300 font-semibold">Incident #{r.incident_id}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {r.is_disaster_exception && (
                            <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[9px] font-bold">
                              Disaster Exception
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            r.arrived_on_time ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {r.arrived_on_time ? 'On-Time' : 'Delayed'}
                          </span>
                        </div>
                      </div>

                      <p className="text-zinc-400 text-[11px] leading-relaxed">
                        "{r.outcome_notes || 'Operation completed safely.'}"
                      </p>

                      <div className="flex items-center justify-between pt-1 border-t border-zinc-800 text-[10px] text-zinc-500">
                        <span>Rated by: {r.rated_by}</span>
                        <span>{new Date(r.created_at).toLocaleDateString()}</span>
                      </div>

                      {/* Dispute Status / Action */}
                      {r.dispute_status !== 'None' ? (
                        <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded text-[10px] text-amber-300">
                          <strong>Dispute Status: {r.dispute_status}</strong>
                          {r.dispute_reason && <div>Reason: {r.dispute_reason}</div>}
                          {r.supervisor_notes && <div>Supervisor: {r.supervisor_notes}</div>}
                        </div>
                      ) : (
                        <div className="flex justify-end pt-1">
                          <button
                            onClick={() => setDisputeId(r.id)}
                            className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold"
                          >
                            Dispute Rating
                          </button>
                        </div>
                      )}

                      {/* Dispute Input Box */}
                      {disputeId === r.id && (
                        <div className="p-3 bg-zinc-900 border border-amber-500/40 rounded-lg space-y-2 mt-2">
                          <span className="text-[11px] font-bold text-amber-300 block">
                            File Supervisory Rating Dispute
                          </span>
                          <textarea
                            rows={2}
                            value={disputeReason}
                            onChange={e => setDisputeReason(e.target.value)}
                            placeholder="Explain why delay or outcome was caused by extreme physical hazard..."
                            className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-white text-xs"
                          />
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => setDisputeId(null)}
                              className="px-2.5 py-1 bg-zinc-800 text-zinc-400 rounded"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleDisputeSubmit(r.id)}
                              className="px-3 py-1 bg-amber-500 text-zinc-950 font-bold rounded"
                            >
                              Submit Dispute
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
