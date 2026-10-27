import React, { useState } from 'react';
import { Package } from 'lucide-react';

interface Resource {
  id: number;
  name: string;
  resource_type: string;
  total_qty: number;
  allocated_qty: number;
  reserved_qty: number;
  available_qty: number;
  unit: string;
  location_name: string;
}

interface ResourcesViewProps {
  resources: Resource[];
  onAllocate: (resourceId: number, qty: number, reason: string) => Promise<void>;
}

export const ResourcesView: React.FC<ResourcesViewProps> = ({ resources, onAllocate }) => {
  const [selectedResId, setSelectedResId] = useState<number | null>(null);
  const [allocateQty, setAllocateQty] = useState(1);
  const [reason, setReason] = useState('Field team dispatch');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleOpenAllocate = (resId: number) => {
    setSelectedResId(resId);
    setAllocateQty(1);
    setIsModalOpen(true);
  };

  const handleConfirmAllocate = async () => {
    if (!selectedResId) return;
    setLoading(true);
    try {
      await onAllocate(selectedResId, allocateQty, reason);
      setIsModalOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const selectedRes = resources.find(r => r.id === selectedResId);

  return (
    <div className="flex-1 p-6 bg-zinc-950 overflow-y-auto custom-scrollbar">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Package className="w-5 h-5 text-teal-400" />
            Shared Emergency Resource & Supply Inventory
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Deterministic stock validation, reservation holds, and field allocation tracking
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs">
          <span className="px-2.5 py-1 bg-zinc-800 text-zinc-300 rounded font-mono">
            Catalog Items: {resources.length}
          </span>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-950/80 text-zinc-400 font-semibold border-b border-zinc-800 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="p-4">Item Name</th>
              <th className="p-4">Category</th>
              <th className="p-4">Depot Location</th>
              <th className="p-4 text-center">Total Stock</th>
              <th className="p-4 text-center">Allocated</th>
              <th className="p-4 text-center">Reserved</th>
              <th className="p-4 text-center">Available Stock</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
            {resources.map(res => (
              <tr key={res.id} className="hover:bg-zinc-800/30 transition">
                <td className="p-4 font-semibold text-zinc-100">{res.name}</td>
                <td className="p-4">
                  <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px] font-medium">
                    {res.resource_type}
                  </span>
                </td>
                <td className="p-4 text-zinc-400">{res.location_name}</td>
                <td className="p-4 text-center font-mono">{res.total_qty} {res.unit}</td>
                <td className="p-4 text-center font-mono text-amber-400 font-semibold">{res.allocated_qty}</td>
                <td className="p-4 text-center font-mono text-indigo-400 font-semibold">{res.reserved_qty}</td>
                <td className="p-4 text-center font-mono">
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      res.available_qty === 0
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}
                  >
                    {res.available_qty} {res.unit}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button
                    disabled={res.available_qty === 0}
                    onClick={() => handleOpenAllocate(res.id)}
                    className="px-3 py-1 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 rounded font-semibold text-[11px] transition disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Allocate Units
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Allocation Modal */}
      {isModalOpen && selectedRes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-md shadow-2xl p-6 space-y-4 text-xs">
            <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
              <Package className="w-4 h-4 text-teal-400" />
              Allocate {selectedRes.name}
            </h3>

            <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 text-zinc-400 space-y-1">
              <div>Depot: <span className="text-zinc-200">{selectedRes.location_name}</span></div>
              <div>Available Unallocated: <strong className="text-emerald-400">{selectedRes.available_qty} {selectedRes.unit}</strong></div>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-semibold">Quantity to Allocate</label>
              <input
                type="number"
                min="1"
                max={selectedRes.available_qty}
                value={allocateQty}
                onChange={e => setAllocateQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-semibold">Dispatch Reason / Incident Notes</label>
              <input
                type="text"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="e.g. Flash flood boat team deployment"
                className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-white"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded font-semibold"
              >
                Cancel
              </button>
              <button
                disabled={loading || allocateQty > selectedRes.available_qty}
                onClick={handleConfirmAllocate}
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded font-bold disabled:opacity-40"
              >
                {loading ? 'Allocating...' : 'Confirm Allocation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
