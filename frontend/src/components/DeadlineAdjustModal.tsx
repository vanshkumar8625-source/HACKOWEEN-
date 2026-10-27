import React, { useState } from 'react';
import { X, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';

interface DeadlineAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newDeadline: string, reason: string) => Promise<void>;
  incidentId: number;
  currentDeadline?: string | null;
}

export const DeadlineAdjustModal: React.FC<DeadlineAdjustModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  incidentId,
  currentDeadline
}) => {
  // Default to 1 hour from now
  const defaultTime = new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16);
  const [newDeadline, setNewDeadline] = useState(defaultTime);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 5) {
      setError("Please provide a valid operational reason explaining this deadline adjustment.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      await onSubmit(new Date(newDeadline).toISOString(), reason);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to adjust deadline.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden font-sans">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Adjust Response Deadline</h2>
              <p className="text-[11px] text-zinc-400">Incident #{incidentId}</p>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {currentDeadline && (
            <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 text-zinc-400">
              <span className="block text-[10px] uppercase text-zinc-500">Current Target Deadline</span>
              <span className="font-mono text-zinc-200 font-bold">{new Date(currentDeadline).toLocaleString()}</span>
            </div>
          )}

          <div>
            <label className="block text-zinc-400 mb-1 font-semibold">New Response Deadline</label>
            <input
              type="datetime-local"
              required
              value={newDeadline}
              onChange={e => setNewDeadline(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-zinc-400 mb-1 font-semibold">
              Mandatory Administrative Reason & Context
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Inundated highway bridge forced 8km detour; weather alert extended operational window..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-teal-500"
            />
            <p className="text-[10px] text-zinc-500 mt-1">
              Recorded in the immutable PlanAuditLog for transparent oversight.
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
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-lg font-bold shadow transition disabled:opacity-50"
            >
              {loading ? 'Recording...' : 'Authorize Extension'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
