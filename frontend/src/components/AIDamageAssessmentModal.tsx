import React, { useState } from 'react';
import {
  X, Sparkles, AlertTriangle, ShieldCheck, Camera,
  CheckCircle2, ArrowRight, Gauge, Cpu, Eye, FileText
} from 'lucide-react';

interface AIDamageAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAutoCreateIncident?: (prefill: any) => void;
  apiUrl?: string;
}

const SAMPLE_PRESETS = [
  {
    id: 'bridge_collapse',
    name: 'Sangam Bridge Overwash & Pillar Shear',
    disaster: 'Flood / Structural',
    location: 'Sangam Bridge, Pune',
    badge: 'Critical Hazard'
  },
  {
    id: 'residential_inundation',
    name: 'Low-Lying Residential Submersion',
    disaster: 'Flash Flood',
    location: 'Deccan Riverside Sector',
    badge: 'High Current'
  },
  {
    id: 'roadway_debris',
    name: 'Arterial Causeway Debris Blockage',
    disaster: 'Flood Debris',
    location: 'Karve Road Underpass',
    badge: 'Access Severed'
  }
];

export const AIDamageAssessmentModal: React.FC<AIDamageAssessmentModalProps> = ({
  isOpen,
  onClose,
  onAutoCreateIncident,
  apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
}) => {
  const [selectedPreset, setSelectedPreset] = useState(SAMPLE_PRESETS[0]);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRunAnalysis = async (preset = selectedPreset) => {
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/api/ai-assistant/analyze-damage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preset_name: preset.id,
          location_name: preset.location,
          reported_disaster: preset.disaster
        })
      });
      if (!res.ok) throw new Error('Analysis failed');
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed running AI damage assessment');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-6 font-sans">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-5 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Eye className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-display font-bold text-white flex items-center gap-2">
                ResQGrid AI Damage Assessment
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30 font-bold uppercase">
                  Computer Vision
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Drone & Field Imagery Feature Extraction & Structural Severity Scoring
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Preset Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Select Field Aerial Imagery Preset
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {SAMPLE_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setSelectedPreset(preset);
                    handleRunAnalysis(preset);
                  }}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                    selectedPreset.id === preset.id
                      ? 'bg-teal-950/40 border-teal-500 text-white shadow-[0_0_15px_rgba(20,184,166,0.2)]'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold leading-tight text-slate-200">{preset.name}</div>
                  <div className="mt-2 text-[10px] text-teal-400 font-mono flex items-center justify-between">
                    <span>{preset.disaster}</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                      {preset.badge}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Action Button */}
          {!result && (
            <button
              onClick={() => handleRunAnalysis()}
              disabled={analyzing}
              className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-extrabold rounded-xl text-sm shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {analyzing ? (
                <>
                  <Cpu className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Processing Computer Vision Telemetry...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  <span>Execute Neural Damage Analysis</span>
                </>
              )}
            </button>
          )}

          {error && (
            <div className="p-3 bg-red-950/40 border border-red-800/80 rounded-xl text-xs text-red-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Analysis Results Display */}
          {result && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4 animate-slideUp">
              
              {/* Classification and Confidence Score */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Damage Classification
                  </span>
                  <div className="text-base font-bold text-white mt-0.5">
                    {result.damage_classification}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Model Confidence
                    </span>
                    <div className="text-base font-mono font-extrabold text-teal-400">
                      {(result.confidence_score * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${
                    result.severity_level === 'Critical'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    {result.severity_level}
                  </div>
                </div>
              </div>

              {/* Structural Integrity Bar */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400 font-medium">Estimated Structural Integrity</span>
                  <span className="font-mono font-bold text-slate-200">{result.structural_integrity_percent}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      result.structural_integrity_percent < 30
                        ? 'bg-red-500'
                        : result.structural_integrity_percent < 60
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${result.structural_integrity_percent}%` }}
                  />
                </div>
              </div>

              {/* Detected Hazards */}
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Detected Ground Hazards
                </span>
                <ul className="space-y-1">
                  {result.detected_hazards.map((h: string, idx: number) => (
                    <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Tactical Guidance */}
              <div className="p-3 bg-amber-950/20 border border-amber-800/40 rounded-xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block mb-1">
                  Tactical Operational Advisory
                </span>
                <p className="text-xs text-amber-200/90 leading-relaxed font-sans">
                  {result.tactical_guidance}
                </p>
              </div>

              {/* Recommended Resources */}
              <div className="pt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">Recommended Dispatch:</span>
                {result.recommended_resources.map((r: string, i: number) => (
                  <span key={i} className="text-[11px] px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-teal-300">
                    {r}
                  </span>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => handleRunAnalysis()}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                >
                  Re-evaluate Frame
                </button>

                {onAutoCreateIncident && (
                  <button
                    type="button"
                    onClick={() => {
                      onAutoCreateIncident(result.prefill_incident);
                      onClose();
                    }}
                    className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow"
                  >
                    <span>Log Incident from Analysis</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 text-[10px] text-slate-500 text-center font-mono">
          Model: ResQGrid CV-HazardNet v2.5 | Confidence threshold: 0.85 | Live validation enabled
        </div>

      </div>
    </div>
  );
};
