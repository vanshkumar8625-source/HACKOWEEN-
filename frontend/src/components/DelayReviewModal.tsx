import React, { useState } from 'react';
import { X, AlertTriangle, ShieldCheck, FileText, CheckCircle2, AlertOctagon } from 'lucide-react';

interface DelayReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  incident: any;
  userRole: 'admin' | 'responder' | 'citizen';
  onSubmitExplanation: (incidentId: number, category: string, reason: string) => Promise<void>;
  onSubmitDecision: (incidentId: number, decision: string, notes: string) => Promise<void>;
}

const DELAY_CATEGORIES = [
  "Road Blocked",
  "Severe Weather",
  "Equipment Failure",
  "Responder Safety",
  "Traffic/Access",
  "Other"
];

const ADMIN_DECISIONS = [
  { value: "Justified - No Action", label: "Justified - No Action (Approved Hazard Exception)", desc: "Genuine hazard (blocked bridge/submersion) excused with no penalty." },
  { value: "Warning", label: "Formal Warning", desc: "Notice given to improve tactical routing and response times." },
  { value: "Mandatory Review", label: "Mandatory Operational Review", desc: "Supervisory review required with team unit leader." },
  { value: "Additional Training", label: "Additional Field Training", desc: "Assign team to specialized water/night operations module." },
  { value: "Temporary Restriction", label: "Temporary Assignment Restriction", desc: "Temporarily pause new dispatches until safety compliance review completes." }
];

export const DelayReviewModal: React.FC<DelayReviewModalProps> = ({
  isOpen,
  onClose,
  incident,
  userRole,
  onSubmitExplanation,
  onSubmitDecision
}) => {
  const [category, setCategory] = useState('Road Blocked');
  const [explanation, setExplanation] = useState(incident?.delay_reason || '');
  const [adminDecision, setAdminDecision] = useState('Justified - No Action');
  const [adminNotes, setAdminNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !incident) return null;

  const hasExistingExplanation = Boolean(incident.delay_reason);

  const handleExplanationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!explanation.trim() || explanation.trim().length < 10) {
      setError("Please provide a thorough operational explanation (minimum 10 characters).");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSubmitExplanation(incident.id, category, explanation);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to submit explanation.");
    } finally {
      setLoading(false);
    }
  };

  const handleDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onSubmitDecision(incident.id, adminDecision, adminNotes);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to record decision.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-8 font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Delay Accountability & Supervisory Review
              </h2>
              <p className="text-[11px] text-zinc-400">Incident #{incident.id}: {incident.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-red-950/60 border border-red-800 text-xs text-red-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Existing Field Explanation Card */}
        {hasExistingExplanation && (
          <div className="m-6 mb-0 p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-teal-400 flex items-center gap-1.5">
                <FileText className="w-4 h-4" /> Team Field Explanation
              </span>
              <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px]">
                {incident.delay_category || "Operational Barrier"}
              </span>
            </div>
            <p className="text-zinc-300 leading-relaxed bg-zinc-900/60 p-2.5 rounded border border-zinc-850">
              "{incident.delay_reason}"
            </p>
          </div>
        )}

        {/* Admin Decision Form (if user is admin or reviewing) */}
        {userRole === 'admin' ? (
          <form onSubmit={handleDecisionSubmit} className="p-6 space-y-4 text-xs">
            <div>
              <label className="block text-zinc-400 mb-1.5 font-semibold">
                Supervisory Corrective Action / Ruling
              </label>
              <div className="space-y-2">
                {ADMIN_DECISIONS.map(d => (
                  <label
                    key={d.value}
                    className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition ${
                      adminDecision === d.value
                        ? 'bg-teal-500/10 border-teal-500/40 text-teal-300'
                        : 'bg-zinc-800/40 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name="decision"
                      value={d.value}
                      checked={adminDecision === d.value}
                      onChange={e => setAdminDecision(e.target.value)}
                      className="mt-0.5 text-teal-500 focus:ring-0"
                    />
                    <div>
                      <span className="font-semibold block text-zinc-200 text-xs">{d.label}</span>
                      <span className="text-[10px] text-zinc-500">{d.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-semibold">Administrator Notes & Rationale</label>
              <textarea
                rows={2}
                value={adminNotes}
                onChange={e => setAdminNotes(e.target.value)}
                placeholder="Document verification of weather telemetry, detour validity, or training requirement..."
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
                className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-bold shadow transition disabled:opacity-50"
              >
                {loading ? 'Recording...' : 'Authorize Ruling & Log Audit'}
              </button>
            </div>
          </form>
        ) : (
          /* Responder Form: Submit Delay Explanation */
          <form onSubmit={handleExplanationSubmit} className="p-6 space-y-4 text-xs">
            <div>
              <label className="block text-zinc-400 mb-1 font-semibold">Primary Reason Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white"
              >
                {DELAY_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-semibold">
                Detailed Field Explanation & Physical Obstacles
              </label>
              <textarea
                required
                rows={3}
                value={explanation}
                onChange={e => setExplanation(e.target.value)}
                placeholder="e.g. Flash flood submerged bridge crossing by 1.8 meters. Team engaged OSRM perimeter detour via elevated bypass..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-teal-500"
              />
              <p className="text-[10px] text-zinc-500 mt-1">
                A fair review will evaluate sensor telemetry, route status, and safety exceptions without unfair penalty.
              </p>
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
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold shadow transition disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit Delay Explanation'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
