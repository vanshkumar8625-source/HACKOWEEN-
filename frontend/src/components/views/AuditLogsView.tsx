import React from 'react';
import { History } from 'lucide-react';

interface AuditLog {
  id: number;
  timestamp: string;
  entity_type: string;
  entity_id?: number;
  action: string;
  reason: string;
  details_json?: string;
  triggered_by: string;
}

interface AuditLogsViewProps {
  logs: AuditLog[];
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ logs }) => {
  return (
    <div className="flex-1 p-6 bg-zinc-950 overflow-y-auto custom-scrollbar">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <History className="w-5 h-5 text-teal-400" />
            Decision Audit Trail & Event Timeline
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Immutable log recording why assignments, priorities, routes, or resource allocations changed
          </p>
        </div>
        <span className="px-2.5 py-1 bg-zinc-800 text-zinc-300 rounded font-mono text-xs">
          Recorded Events: {logs.length}
        </span>
      </div>

      <div className="space-y-3">
        {logs.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 text-xs">
            No audit events recorded yet.
          </div>
        ) : (
          logs.map(log => {
            const isAlert = log.action.includes('Blocked') || log.action.includes('Failed') || log.action.includes('Saturated');
            const isReplan = log.action.includes('Replan') || log.action.includes('Divert');

            return (
              <div
                key={log.id}
                className={`p-4 rounded-xl border transition shadow-sm space-y-2 text-xs ${
                  isAlert
                    ? 'bg-red-950/20 border-red-900/50'
                    : isReplan
                    ? 'bg-amber-950/20 border-amber-800/50'
                    : 'bg-zinc-900 border-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        isAlert
                          ? 'bg-red-500/20 text-red-400'
                          : isReplan
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-teal-500/20 text-teal-400'
                      }`}
                    >
                      {log.action}
                    </span>
                    <span className="text-zinc-400 font-mono text-[11px]">[{log.entity_type} #{log.entity_id || 'N/A'}]</span>
                  </div>
                  <div className="flex items-center space-x-2 text-[11px] text-zinc-400">
                    <span>Triggered by: <strong className="text-zinc-300">{log.triggered_by}</strong></span>
                    <span>•</span>
                    <span className="font-mono text-zinc-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>

                <p className="text-zinc-200 text-xs leading-relaxed font-sans pl-1">
                  {log.reason}
                </p>

                {log.details_json && log.details_json !== '{}' && (
                  <div className="bg-zinc-950/80 p-2 rounded border border-zinc-800/80 font-mono text-[10px] text-zinc-400 overflow-x-auto">
                    {log.details_json}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
