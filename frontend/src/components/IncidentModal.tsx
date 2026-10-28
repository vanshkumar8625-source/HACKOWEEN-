import React, { useState, useRef } from 'react';
import { X, AlertCircle, Camera, Video, UploadCloud, Trash2, Sparkles, Image as ImageIcon } from 'lucide-react';

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
  const [peopleAffected, setPeopleAffected] = useState('2');
  const [casualtiesCount, setCasualtiesCount] = useState('0');
  
  // Photo & Video state
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [mediaName, setMediaName] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isImage && !isVideo) {
      setError('Please select an image (JPG, PNG, WEBP) or video (MP4, WEBM).');
      return;
    }

    setMediaName(file.name);
    setMediaType(isVideo ? 'video' : 'image');

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setMediaUrl(event.target.result as string);
        setError(null);
      }
    };
    reader.onerror = () => {
      setError('Failed reading media file.');
    };
    reader.readAsDataURL(file);
  };

  const handleApplyPreset = (type: 'bridge' | 'flood' | 'drone_video') => {
    if (type === 'bridge') {
      setMediaType('image');
      setMediaName('structural_bridge_crack.jpg');
      setMediaUrl('https://images.unsplash.com/photo-1541888946425-d0fbb18615f8?auto=format&fit=crop&w=800&q=80');
      if (!title) setTitle('Bridge Structural Fracture at River Crossing');
      if (disasterType !== 'earthquake') setDisasterType('earthquake');
      setSeverity('High');
      setRequiredSkill('Search & Rescue (Structural / Debris)');
    } else if (type === 'flood') {
      setMediaType('image');
      setMediaName('flash_flood_submergence.jpg');
      setMediaUrl('https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80');
      if (!title) setTitle('Low-Lying Settlement Inundation');
      setDisasterType('flood');
      setSeverity('Critical');
      setRequiredSkill('Flood Rescue');
    } else if (type === 'drone_video') {
      setMediaType('video');
      setMediaName('aerial_recon_telemetry.mp4');
      setMediaUrl('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4');
      if (!title) setTitle('Aerial Drone Survey of Inundated Basin');
      setSeverity('High');
    }
  };

  const handleRemoveMedia = () => {
    setMediaUrl(null);
    setMediaType(null);
    setMediaName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

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
        latitude: parseFloat(latitude) || 18.5204,
        longitude: parseFloat(longitude) || 73.8567,
        description,
        required_skill: requiredSkill,
        people_affected: parseInt(peopleAffected) || 1,
        casualties_count: parseInt(casualtiesCount) || 0,
        media_url: mediaUrl,
        media_type: mediaType
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to report incident.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            Report Emergency Incident (Intake & Telemetry)
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs overflow-y-auto custom-scrollbar flex-1">
          {/* Incident Title */}
          <div>
            <label className="block text-zinc-300 mb-1 font-semibold">Incident Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Breakage of steel bridge with trapped citizens"
              className="w-full bg-zinc-800/90 border border-zinc-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-red-500 transition"
            />
          </div>

          {/* Disaster Type & Severity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-300 mb-1 font-semibold">Disaster Type *</label>
              <select
                value={disasterType}
                onChange={e => setDisasterType(e.target.value)}
                className="w-full bg-zinc-800/90 border border-zinc-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-red-500"
              >
                <option value="flood">Flood (Riverine / Flash)</option>
                <option value="earthquake">Earthquake (Structural Collapse)</option>
                <option value="wildfire">Wildfire / Urban Fire</option>
                <option value="cyclone">Cyclone / Severe Gale</option>
                <option value="landslide">Landslide / Mudflow</option>
              </select>
            </div>

            <div>
              <label className="block text-zinc-300 mb-1 font-semibold">Severity Priority *</label>
              <select
                value={severity}
                onChange={e => setSeverity(e.target.value)}
                className="w-full bg-zinc-800/90 border border-zinc-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-red-500 font-bold"
              >
                <option value="Critical" className="text-red-400">Critical (Immediate Rescue - 45m SLA)</option>
                <option value="High" className="text-amber-400">High (90m SLA)</option>
                <option value="Medium" className="text-blue-400">Medium (180m SLA)</option>
                <option value="Low" className="text-emerald-400">Low (360m SLA)</option>
              </select>
            </div>
          </div>

          {/* Location & GPS */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-zinc-300 mb-1 font-semibold">Location Landmark *</label>
              <input
                type="text"
                required
                value={locationName}
                onChange={e => setLocationName(e.target.value)}
                className="w-full bg-zinc-800/90 border border-zinc-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-zinc-300 mb-1 font-semibold">Latitude</label>
              <input
                type="number"
                step="0.0001"
                required
                value={latitude}
                onChange={e => setLatitude(e.target.value)}
                className="w-full bg-zinc-800/90 border border-zinc-700 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-zinc-300 mb-1 font-semibold">Longitude</label>
              <input
                type="number"
                step="0.0001"
                required
                value={longitude}
                onChange={e => setLongitude(e.target.value)}
                className="w-full bg-zinc-800/90 border border-zinc-700 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          {/* People Impact & Skill */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-zinc-300 mb-1 font-semibold">Required Rescue Skill</label>
              <select
                value={requiredSkill}
                onChange={e => setRequiredSkill(e.target.value)}
                className="w-full bg-zinc-800/90 border border-zinc-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-red-500 text-[11px]"
              >
                <option value="Flood Rescue">Flood Rescue (Boats / Water)</option>
                <option value="Search & Rescue">Search & Rescue (Structural)</option>
                <option value="Medical">Medical Assistance / Trauma</option>
                <option value="Hazmat / Fire Control">Hazmat / Fire Control</option>
              </select>
            </div>
            <div>
              <label className="block text-zinc-300 mb-1 font-semibold">People Impacted</label>
              <input
                type="number"
                min="0"
                value={peopleAffected}
                onChange={e => setPeopleAffected(e.target.value)}
                className="w-full bg-zinc-800/90 border border-zinc-700 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-zinc-300 mb-1 font-semibold">Casualties Count</label>
              <input
                type="number"
                min="0"
                value={casualtiesCount}
                onChange={e => setCasualtiesCount(e.target.value)}
                className="w-full bg-zinc-800/90 border border-zinc-700 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          {/* PHOTO & VIDEO ATTACHMENT SECTION */}
          <div className="p-3.5 bg-zinc-950/80 border border-zinc-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-200 flex items-center gap-1.5 text-xs">
                <Camera className="w-4 h-4 text-rose-400" />
                <span>Attach Disaster Photo or Ground Video</span>
              </span>
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Visual Evidence</span>
            </div>

            {/* Hidden native inputs */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*,video/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <input
              type="file"
              ref={cameraInputRef}
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* If media attached: show rich preview */}
            {mediaUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-zinc-700 bg-black/60 p-2 space-y-2 animate-fadeIn">
                <div className="flex items-center justify-between text-[11px] px-1 text-zinc-300">
                  <div className="flex items-center gap-1.5 truncate">
                    {mediaType === 'video' ? <Video className="w-3.5 h-3.5 text-teal-400" /> : <ImageIcon className="w-3.5 h-3.5 text-rose-400" />}
                    <span className="font-semibold truncate">{mediaName || 'Attached Evidence'}</span>
                    <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-[9px] uppercase font-bold text-zinc-400">
                      {mediaType}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveMedia}
                    className="p-1 rounded hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition"
                    title="Remove media"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {mediaType === 'video' ? (
                  <video
                    src={mediaUrl}
                    controls
                    className="w-full max-h-48 rounded-lg bg-black object-cover"
                  />
                ) : (
                  <img
                    src={mediaUrl}
                    alt="Disaster preview"
                    className="w-full max-h-48 rounded-lg object-cover border border-zinc-800"
                  />
                )}
              </div>
            ) : (
              /* If no media: show interactive upload options */
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/80 hover:border-zinc-500 rounded-xl flex flex-col items-center justify-center gap-1.5 text-zinc-200 transition group cursor-pointer"
                  >
                    <UploadCloud className="w-4 h-4 text-teal-400 group-hover:scale-110 transition" />
                    <span className="text-[11px] font-semibold">Upload Photo/Video</span>
                    <span className="text-[9px] text-zinc-500">From Device</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="p-3 bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/80 hover:border-zinc-500 rounded-xl flex flex-col items-center justify-center gap-1.5 text-zinc-200 transition group cursor-pointer"
                  >
                    <Camera className="w-4 h-4 text-rose-400 group-hover:scale-110 transition" />
                    <span className="text-[11px] font-semibold">Capture Live Photo</span>
                    <span className="text-[9px] text-zinc-500">Camera</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyPreset('drone_video')}
                    className="col-span-2 sm:col-span-1 p-3 bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/80 hover:border-zinc-500 rounded-xl flex flex-col items-center justify-center gap-1.5 text-zinc-200 transition group cursor-pointer"
                  >
                    <Video className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition" />
                    <span className="text-[11px] font-semibold">Drone Video Clip</span>
                    <span className="text-[9px] text-zinc-500">Recon Telemetry</span>
                  </button>
                </div>

                {/* 1-Click Disaster Photo Presets */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[10px]">
                  <span className="text-zinc-500 font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" /> Quick Presets:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('bridge')}
                    className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 border border-zinc-700 transition"
                  >
                    🌉 Bridge Crack Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('flood')}
                    className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 border border-zinc-700 transition"
                  >
                    🌊 Flood Rescue Photo
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-zinc-300 mb-1 font-semibold">Description & Context</label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Provide casualty estimates, stranded persons, access restrictions, or ground observations..."
              className="w-full bg-zinc-800/90 border border-zinc-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-red-500 transition"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 rounded-xl font-medium transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl font-bold transition shadow-lg shadow-red-900/40 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {loading ? 'Submitting...' : 'Submit Incident'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
