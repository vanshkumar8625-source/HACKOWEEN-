import React, { useState } from 'react';
import { Home, Users, Utensils, Droplet, HeartPulse } from 'lucide-react';

interface Shelter {
  id: number;
  name: string;
  location_name: string;
  latitude: number;
  longitude: number;
  capacity: number;
  occupancy: number;
  vacancy: number;
  occupancy_rate: number;
  food_stock_days: number;
  water_stock_days: number;
  medical_stock_level: string;
  is_accessible: boolean;
}

interface SheltersViewProps {
  shelters: Shelter[];
  onToggleAccessibility: (id: number) => Promise<void>;
  onAdmitEvacuees: (shelterId: number, count: number) => Promise<void>;
}

export const SheltersView: React.FC<SheltersViewProps> = ({
  shelters,
  onToggleAccessibility,
  onAdmitEvacuees
}) => {
  const [admitCount, setAdmitCount] = useState<{ [key: number]: number }>({});
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const handleAdmit = async (shelterId: number) => {
    const count = admitCount[shelterId] || 10;
    setLoadingId(shelterId);
    try {
      await onAdmitEvacuees(shelterId, count);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="flex-1 p-6 bg-zinc-950 overflow-y-auto custom-scrollbar">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Home className="w-5 h-5 text-teal-400" />
            Evacuation Shelters & Capacity Management
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Live occupancy tracking, food & water supply days, and perimeter road accessibility
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs">
          <span className="px-2.5 py-1 bg-zinc-800 text-zinc-300 rounded font-mono">
            Shelters: {shelters.length}
          </span>
          <span className="px-2.5 py-1 bg-teal-500/20 text-teal-400 rounded font-mono">
            Total Capacity: {shelters.reduce((acc, s) => acc + s.capacity, 0)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
        {shelters.map(shelter => {
          const isFull = shelter.vacancy <= 0;
          const isWarning = shelter.occupancy_rate >= 80;

          return (
            <div
              key={shelter.id}
              className={`bg-zinc-900 border rounded-xl p-5 shadow-sm space-y-4 transition ${
                !shelter.is_accessible
                  ? 'border-red-900/60 opacity-85'
                  : isFull
                  ? 'border-amber-700/60'
                  : 'border-zinc-800 hover:border-zinc-700'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-sm text-zinc-100">{shelter.name}</h3>
                  <span className="text-xs text-zinc-400">{shelter.location_name}</span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      shelter.is_accessible
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-red-500/10 text-red-400 border-red-500/30'
                    }`}
                  >
                    {shelter.is_accessible ? 'ACCESSIBLE' : 'INACCESSIBLE (CUT OFF)'}
                  </span>
                </div>
              </div>

              {/* Occupancy Meter */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-zinc-400" /> Occupancy:
                  </span>
                  <span className="font-mono font-bold text-zinc-200">
                    {shelter.occupancy} / {shelter.capacity} ({shelter.occupancy_rate}%)
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isFull
                        ? 'bg-red-500'
                        : isWarning
                        ? 'bg-amber-500'
                        : 'bg-teal-500'
                    }`}
                    style={{ width: `${Math.min(100, shelter.occupancy_rate)}%` }}
                  />
                </div>
                <div className="text-[11px] text-zinc-400 flex justify-between">
                  <span>Vacancy: <strong className="text-zinc-200">{shelter.vacancy}</strong> beds</span>
                  {isFull && <span className="text-red-400 font-semibold">100% Saturation</span>}
                </div>
              </div>

              {/* Stock Levels */}
              <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800 text-[11px]">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-zinc-400 mb-0.5">
                    <Utensils className="w-3 h-3 text-amber-400" /> Food
                  </div>
                  <span className={`font-mono font-bold ${shelter.food_stock_days <= 2 ? 'text-red-400' : 'text-zinc-200'}`}>
                    {shelter.food_stock_days} days
                  </span>
                </div>

                <div className="text-center border-x border-zinc-800">
                  <div className="flex items-center justify-center gap-1 text-zinc-400 mb-0.5">
                    <Droplet className="w-3 h-3 text-teal-400" /> Water
                  </div>
                  <span className={`font-mono font-bold ${shelter.water_stock_days <= 2 ? 'text-red-400' : 'text-zinc-200'}`}>
                    {shelter.water_stock_days} days
                  </span>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-zinc-400 mb-0.5">
                    <HeartPulse className="w-3 h-3 text-red-400" /> Meds
                  </div>
                  <span className={`font-bold ${shelter.medical_stock_level === 'Critical' ? 'text-red-400' : 'text-emerald-400'}`}>
                    {shelter.medical_stock_level}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-3 text-xs">
                <button
                  onClick={() => onToggleAccessibility(shelter.id)}
                  className={`px-2 py-1 rounded text-[10px] font-semibold transition border ${
                    shelter.is_accessible
                      ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                      : 'border-emerald-700 text-emerald-400 hover:bg-emerald-950'
                  }`}
                >
                  {shelter.is_accessible ? 'Mark Blocked' : 'Mark Open'}
                </button>

                <div className="flex items-center space-x-1.5">
                  <input
                    type="number"
                    min="1"
                    max={shelter.vacancy || 1}
                    value={admitCount[shelter.id] || 15}
                    onChange={e => setAdmitCount({ ...admitCount, [shelter.id]: parseInt(e.target.value) || 1 })}
                    className="w-14 bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-center text-white font-mono text-xs"
                  />
                  <button
                    disabled={isFull || !shelter.is_accessible || loadingId === shelter.id}
                    onClick={() => handleAdmit(shelter.id)}
                    className="px-2.5 py-1 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/30 rounded font-semibold text-[10px] transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Admit Evacuees
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
