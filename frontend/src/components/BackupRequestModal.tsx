import React, { useState } from 'react';
import { X, ShieldAlert, AlertCircle, Send, CheckSquare, Square } from 'lucide-react';

interface BackupRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  incidentId?: number;
  requestingTeamId?: number;
  initialLocation?: string;
  initialLat?: number;
  initialLng?: number;
}

const RESOURCE_OPTIONS = [
  "Helicopter",
  "Rescue boat",
  "Ambulance",
  "Medical team",
  "Fire brigade",
  "Additional rescue personnel",
  "Food and drinking water",
  "Medical kits",
  "Communication equipment",
  "Other resources"
];

export const BackupRequestModal: React.FC<BackupRequestModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  incidentId = 1,
  requestingTeamId = 1,
  initialLocation = "Pune Riverbank",
  initialLat = 18.5204,
  initialLng = 73.8567
}) => {
  const [incId, setIncId] = useState(incidentId);
  const [teamId, setTeamId] = useState(requestingTeamId);
  const [locationName, setLocationName] = useState(initialLocation);
  const [latitude, setLatitude] = useState(initialLat.toString());
  const [longitude, setLongitude] = useState(initialLng.toString());
  const [reason, setReason] = useState('');
  const [assistanceType, setAssistanceType] = useState('Medical Evacuation');
  const [selectedResources, setSelectedResources] = useState<string[]>(["Rescue boat"]);
  const [personnelNeeded, setPersonnelNeeded] = useState(3);
  const [urgency, setUrgency] = useState('High');
  const [handoverType, setHandoverType] = useState('Partial');
  const [notes, setNotes] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleResource = (item: string) => {
    setSelectedResources(prev =>
      prev.includes(item) ? prev.filter(r => r !== item) : [...prev, item]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Please provide an operational reason for requesting backup assistance.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      await onSubmit({
        incident_id: incId,
        requesting_team_id: teamId,
        location_name: locationName,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        reason,
        assistance_type: assistanceType,
        required_resources: selectedResources,
        personnel_needed: personnelNeeded,
        urgency,
        handover_type: handoverType,
        notes,
        photo_url: photoUrl || undefined
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to submit backup request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-red-600/20 border border-red-500/30 text-red-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Emergency Backup & Handover Request
              </h2>
              <p className="text-[11px] text-zinc-400">
                Call for tactical backup, heavy resources, or complete mission handover
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-red-950/60 border border-red-800 text-xs text-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 mb-1 font-semibold">Incident ID</label>
              <input
                type="number"
                required
                value={incId}
                onChange={e => setIncId(parseInt(e.target.value))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-zinc-400 mb-1 font-semibold">Requesting Team ID</label>
              <input
                type="number"
                required
                value={teamId}
                onChange={e => setTeamId(parseInt(e.target.value))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 mb-1 font-semibold">Assistance Type</label>
              <select
                value={assistanceType}
                onChange={e => setAssistanceType(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white"
              >
                <option value="Medical Evacuation">Medical Evacuation</option>
                <option value="Specialized Extraction">Specialized Extraction (Water/Winch)</option>
                <option value="Perimeter Containment">Perimeter Containment</option>
                <option value="Supply Drop">Supply Drop (Food/Water/Kits)</option>
                <option value="Full Handover">Full Incident Handover</option>
              </select>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-semibold">Urgency Level</label>
              <select
                value={urgency}
                onChange={e => setUrgency(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white"
              >
                <option value="Critical">Critical (Immediate Hazard to Life)</option>
                <option value="High">High (Urgent Support)</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-zinc-400 mb-1 font-semibold">Current Location / Landmark</label>
            <input
              type="text"
              required
              value={locationName}
              onChange={e => setLocationName(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white"
            />
          </div>

          {/* Handover & Personnel */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 mb-1 font-semibold">Handover Mode</label>
              <select
                value={handoverType}
                onChange={e => setHandoverType(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white"
              >
                <option value="Partial">Partial (Joint Operation / Reinforcement)</option>
                <option value="Complete">Complete (Transfer Command to Backup Unit)</option>
              </select>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-semibold">Additional Personnel Needed</label>
              <input
                type="number"
                min={1}
                max={50}
                value={personnelNeeded}
                onChange={e => setPersonnelNeeded(parseInt(e.target.value))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white font-mono"
              />
            </div>
          </div>

          {/* Resource Checkboxes */}
          <div>
            <label className="block text-zinc-400 mb-1.5 font-semibold">Required Tactical Resources</label>
            <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 bg-zinc-950/60 rounded-lg border border-zinc-800 custom-scrollbar">
              {RESOURCE_OPTIONS.map(resName => {
                const isSelected = selectedResources.includes(resName);
                return (
                  <button
                    key={resName}
                    type="button"
                    onClick={() => toggleResource(resName)}
                    className={`flex items-center space-x-2 p-2 rounded text-left transition ${
                      isSelected ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    {isSelected ? <CheckSquare className="w-4 h-4 text-teal-400 shrink-0" /> : <Square className="w-4 h-4 text-zinc-600 shrink-0" />}
                    <span className="truncate">{resName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Operational Reason */}
          <div>
            <label className="block text-zinc-400 mb-1 font-semibold">Operational Reason / Problem</label>
            <textarea
              required
              rows={2}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Current water speed exceeds 3m/s; primary boat winch compromised; 2 victims need immediate trauma IV..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-zinc-400 mb-1 font-semibold">Optional Photo / Recon URL or Field Note</label>
            <input
              type="text"
              value={photoUrl}
              onChange={e => setPhotoUrl(e.target.value)}
              placeholder="e.g. https://... or drone camera feed ID"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 rounded-lg font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold shadow-lg transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {loading ? 'Submitting Request...' : 'Transmit Backup Request'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
