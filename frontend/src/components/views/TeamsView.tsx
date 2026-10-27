import React, { useState } from 'react';
import { Users, Phone, MapPin, ShieldCheck } from 'lucide-react';

interface RescueTeam {
  id: number;
  name: string;
  specialization: string;
  members_count: number;
  status: string;
  latitude: number;
  longitude: number;
  contact_number: string;
}

interface TeamsViewProps {
  teams: RescueTeam[];
  onUpdateStatus: (id: number, status: string) => Promise<void>;
}

export const TeamsView: React.FC<TeamsViewProps> = ({ teams, onUpdateStatus }) => {
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const handleStatusChange = async (id: number, newStatus: string) => {
    setUpdatingId(id);
    try {
      await onUpdateStatus(id, newStatus);
    } finally {
      setUpdatingId(null);
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

  return (
    <div className="flex-1 p-6 bg-zinc-950 overflow-y-auto custom-scrollbar">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-400" />
            Response Teams & Tactical Deployment
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real-time status, skill specializations, and GPS dispatch coordinates
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs">
          <span className="px-2.5 py-1 bg-zinc-800 text-zinc-300 rounded font-mono">
            Total Teams: {teams.length}
          </span>
          <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 rounded font-mono">
            Available: {teams.filter(t => t.status === 'Available').length}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {teams.map(team => (
          <div
            key={team.id}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition shadow-sm space-y-4"
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-sm text-zinc-100">{team.name}</h3>
                <span className="text-xs text-teal-400 font-medium">{team.specialization}</span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getStatusBadge(team.status)}`}>
                {team.status}
              </span>
            </div>

            {/* Details */}
            <div className="space-y-2 text-xs text-zinc-400">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-zinc-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" /> Unit Personnel:
                </span>
                <span className="font-mono text-zinc-200 font-bold">{team.members_count} Responders</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-zinc-400">
                  <MapPin className="w-3.5 h-3.5 text-zinc-500" /> GPS Coordinates:
                </span>
                <span className="font-mono text-zinc-300 text-[11px]">
                  {team.latitude.toFixed(4)}, {team.longitude.toFixed(4)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-zinc-400">
                  <Phone className="w-3.5 h-3.5 text-zinc-500" /> Radio / Contact:
                </span>
                <span className="font-mono text-zinc-300">{team.contact_number}</span>
              </div>
            </div>

            {/* Status Change Controls */}
            <div className="pt-3 border-t border-zinc-800 flex items-center justify-between gap-2">
              <span className="text-[10px] text-zinc-400">Update Status:</span>
              <div className="flex items-center space-x-1.5">
                {team.status !== 'Available' && (
                  <button
                    disabled={updatingId === team.id}
                    onClick={() => handleStatusChange(team.id, 'Available')}
                    className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded text-[10px] font-semibold transition"
                  >
                    Set Available
                  </button>
                )}
                {team.status === 'Available' && (
                  <button
                    disabled={updatingId === team.id}
                    onClick={() => handleStatusChange(team.id, 'En Route')}
                    className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded text-[10px] font-semibold transition"
                  >
                    Set En Route
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
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
