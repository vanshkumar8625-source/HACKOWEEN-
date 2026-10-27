import React from 'react';
import {
  Bell, X, CheckCircle2, AlertTriangle, ShieldAlert,
  Clock, CheckCheck, Truck, HelpCircle
} from 'lucide-react';

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  category: string;
  severity: string;
  incident_id?: number | null;
  team_id?: number | null;
  is_read: boolean;
  created_at: string;
}

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkRead: (id: number) => Promise<void>;
  onMarkAllRead: () => Promise<void>;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkRead,
  onMarkAllRead
}) => {
  if (!isOpen) return null;

  const safeNotifs = Array.isArray(notifications) ? notifications : [];
  const unreadCount = safeNotifs.filter(n => !n.is_read).length;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'MissedDeadline':
        return <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />;
      case 'CriticalIncident':
      case 'NewReport':
        return <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'BackupRequest':
        return <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0" />;
      case 'TeamAssignment':
        return <Truck className="w-4 h-4 text-teal-400 shrink-0" />;
      case 'RescueCompleted':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
      default:
        return <Bell className="w-4 h-4 text-zinc-400 shrink-0" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-md bg-zinc-900 border-l border-zinc-800 h-full shadow-2xl flex flex-col font-sans">
        
        {/* Header */}
        <div className="p-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-teal-400" />
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Operational Dispatch Notifications
                {unreadCount > 0 && (
                  <span className="px-2 py-0.2 rounded-full bg-red-600 text-white font-mono text-[10px]">
                    {unreadCount} New
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-zinc-400">Real-time alerts, deadline warnings & backup calls</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar */}
        <div className="px-4 py-2 bg-zinc-900/60 border-b border-zinc-800 flex items-center justify-between text-xs">
          <span className="text-zinc-400 font-mono text-[11px]">
            {safeNotifs.length} Total Alerts
          </span>
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1 transition"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all as read
            </button>
          )}
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
          {safeNotifs.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-xs">
              No recent notifications in dispatch log.
            </div>
          ) : (
            safeNotifs.map(notif => (
              <div
                key={notif.id}
                onClick={() => !notif.is_read && onMarkRead(notif.id)}
                className={`p-3.5 rounded-xl border transition cursor-pointer space-y-1.5 ${
                  notif.is_read
                    ? 'bg-zinc-950/40 border-zinc-800/80 opacity-75'
                    : notif.severity === 'Critical'
                    ? 'bg-red-950/20 border-red-800/60 shadow-[0_0_15px_rgba(239,68,68,0.1)]'
                    : 'bg-zinc-800/60 border-zinc-700/80'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    {getCategoryIcon(notif.category)}
                    <h3 className="font-bold text-xs text-zinc-200">{notif.title}</h3>
                  </div>
                  {!notif.is_read && (
                    <span className="w-2 h-2 rounded-full bg-teal-400 shrink-0 animate-ping" />
                  )}
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed pl-6">
                  {notif.message}
                </p>

                <div className="flex items-center justify-between text-[10px] text-zinc-500 pl-6 pt-1">
                  <span>{new Date(notif.created_at).toLocaleTimeString()}</span>
                  {notif.incident_id && (
                    <span className="font-mono text-zinc-400">Incident #{notif.incident_id}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
};
