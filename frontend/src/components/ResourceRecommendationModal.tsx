import React, { useState, useEffect } from 'react';
import { X, Sparkles, CheckCircle2, AlertTriangle, Package, Truck, ArrowRight } from 'lucide-react';

interface ResourceRecommendationModalProps {
  isOpen: boolean;
  onClose: () => void;
  incidentId: number;
  incidentTitle: string;
  apiUrl?: string;
  onAllocate?: (resId: number, qty: number, reason: string) => Promise<void>;
}

export const ResourceRecommendationModal: React.FC<ResourceRecommendationModalProps> = ({
  isOpen,
  onClose,
  incidentId,
  incidentTitle,
  apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000',
  onAllocate
}) => {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [allocatingName, setAllocatingName] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !incidentId) return;

    setLoading(true);
    fetch(`${apiUrl}/api/incidents/${incidentId}/recommendations`)
      .then(res => res.json())
      .then(data => {
        setRecommendations(data.recommendations || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed fetching recommendations:", err);
        setLoading(false);
      });
  }, [isOpen, incidentId, apiUrl]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-8 font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Grounded AI Resource Recommendations
              </h2>
              <p className="text-[11px] text-zinc-400">Incident #{incidentId}: {incidentTitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          <p className="text-zinc-400">
            Recommendations are evaluated from terrain, casualties, and flood conditions, and cross-referenced with
            <strong className="text-zinc-200"> verified regional stock levels</strong>. Availability is confirmed prior to dispatch claims.
          </p>

          {loading ? (
            <div className="py-12 text-center text-zinc-500">
              Analyzing incident vectors & inventory telemetry...
            </div>
          ) : recommendations.length === 0 ? (
            <div className="py-8 text-center text-zinc-500">
              No specialized resource recommendations for this incident.
            </div>
          ) : (
            <div className="space-y-3">
              {recommendations.map((rec, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-xl border space-y-2 transition ${
                    rec.is_available
                      ? 'bg-zinc-950/70 border-zinc-800'
                      : 'bg-red-950/20 border-red-800/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-zinc-200 text-xs flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-teal-400" />
                        {rec.name}
                      </h4>
                      <span className="text-[10px] text-zinc-500 uppercase font-mono">
                        Type: {rec.resource_type}
                      </span>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${
                      rec.is_available
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-red-500/20 text-red-400 border-red-500/30'
                    }`}>
                      {rec.is_available ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                      {rec.is_available ? 'Confirmed In Stock' : 'Depot Shortage'}
                    </span>
                  </div>

                  <p className="text-zinc-300 text-[11px] leading-relaxed">
                    {rec.rationale}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 text-[11px]">
                    <div className="text-zinc-400">
                      Recommended: <span className="font-mono font-bold text-white">{rec.recommended_qty} {rec.unit}</span>
                      <span className="mx-2 text-zinc-600">|</span>
                      Available: <span className={`font-mono font-bold ${rec.is_available ? 'text-teal-400' : 'text-red-400'}`}>{rec.available_qty} {rec.unit}</span>
                    </div>

                    {rec.is_available && (
                      <span className="text-[10px] text-emerald-400 font-semibold">
                        Ready for Coordinator Dispatch
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold transition"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
