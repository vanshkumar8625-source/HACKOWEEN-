import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';

interface IncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}

export const IncidentModal: React.FC<IncidentModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [title, setTitle] = useState('');
  const [disasterType, setDisasterType] = useState('flood');
  const [severity, setSeverity] = useState('High');
  const [locationName, setLocationName] = useState('Pune Riverside');
  const [latitude, setLatitude] = useState('18.5204');
  const [longitude, setLongitude] = useState('73.8567');
  const [description, setDescription] = useState('');
  const [requiredSkill, setRequiredSkill] = useState('Flood Rescue');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        title,
        disaster_type: disasterType,
        severity,
        location_name: locationName,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        description,
        required_skill: requiredSkill
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to report incident.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Report Emergency Incident (Intake)
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded bg-red-950/60 border border-red-800 text-xs text-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block text-zinc-400 mb-1 font-semibold">Incident Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Flash Inundation at Bridge Crossing"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 mb-1 font-semibold">Disaster Type</label>
              <select
                value={disasterType}
                onChange={e => setDisasterType(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white"
              >
                <option value="flood">Flood</option>
                <option value="earthquake">Earthquake</option>
                <option value="wildfire">Wildfire</option>
                <option value="cyclone">Cyclone</option>
                <option value="landslide">Landslide</option>
              </select>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-semibold">Severity</label>
              <select
                value={severity}
                onChange={e => setSeverity(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white"
              >
                <option value="Critical">Critical (Immediate Rescue)</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-zinc-400 mb-1 font-semibold">Location Name</label>
              <input
                type="text"
                required
                value={locationName}
                onChange={e => setLocationName(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white"
              />
            </div>
            <div>
              <label className="block text-zinc-400 mb-1 font-semibold">Latitude</label>
              <input
                type="number"
                step="0.0001"
                required
                value={latitude}
                onChange={e => setLatitude(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-zinc-400 mb-1 font-semibold">Longitude</label>
              <input
                type="number"
                step="0.0001"
                required
                value={longitude}
                onChange={e => setLongitude(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-zinc-400 mb-1 font-semibold">Required Rescue Skill</label>
            <select
              value={requiredSkill}
              onChange={e => setRequiredSkill(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white"
            >
              <option value="Flood Rescue">Flood Rescue (Boats / Water)</option>
              <option value="Search & Rescue">Search & Rescue (Structural / Debris)</option>
              <option value="Medical">Medical Assistance / Trauma</option>
              <option value="Hazmat / Fire Control">Hazmat / Fire Control</option>
            </select>
          </div>

          <div>
            <label className="block text-zinc-400 mb-1 font-semibold">Description & Context</label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Provide casualty estimates, stranded persons, access restrictions..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-teal-500"
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
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Incident'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
