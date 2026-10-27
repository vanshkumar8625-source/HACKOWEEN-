import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface DeadlineCountdownProps {
  deadlineAt?: string | null;
  status?: string;
  actualArrivalAt?: string | null;
  deadlineStatus?: string;
  isResolved?: boolean;
}

export const DeadlineCountdown: React.FC<DeadlineCountdownProps> = ({
  deadlineAt,
  status,
  actualArrivalAt,
  deadlineStatus,
  isResolved
}) => {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    isOverdue: boolean;
    totalSeconds: number;
  }>({
    hours: 0,
    minutes: 0,
    seconds: 0,
    isOverdue: false,
    totalSeconds: 0
  });

  useEffect(() => {
    if (!deadlineAt) return;

    const calculateTime = () => {
      const target = new Date(deadlineAt).getTime();
      const now = new Date().getTime();
      const diffMs = target - now;

      const isOverdue = diffMs < 0;
      const absDiff = Math.abs(diffMs);

      const hours = Math.floor(absDiff / (1000 * 60 * 60));
      const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((absDiff % (1000 * 60)) / 1000);

      setTimeLeft({
        hours,
        minutes,
        seconds,
        isOverdue,
        totalSeconds: Math.floor(absDiff / 1000)
      });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [deadlineAt]);

  if (!deadlineAt) {
    return (
      <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
        <Clock className="w-3 h-3" /> No deadline set
      </span>
    );
  }

  if (status === 'Resolved' || isResolved) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
        <CheckCircle2 className="w-3 h-3" /> Rescue Resolved
      </span>
    );
  }

  if (actualArrivalAt) {
    const isOnTime = deadlineStatus === 'On-Time';
    return (
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${
        isOnTime
          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
          : 'bg-red-500/20 text-red-300 border-red-500/30'
      }`}>
        <CheckCircle2 className="w-3 h-3" />
        {isOnTime ? 'Arrived On-Time' : 'Arrived Delayed'}
      </span>
    );
  }

  const { hours, minutes, seconds, isOverdue } = timeLeft;
  const formattedTime = `${hours > 0 ? `${hours}h ` : ''}${minutes}m ${seconds}s`;

  if (isOverdue || deadlineStatus === 'Delayed') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-600/20 text-red-400 border border-red-500/40 text-[10px] font-mono font-bold animate-pulse">
        <AlertTriangle className="w-3 h-3 text-red-400" />
        OVERDUE: -{formattedTime}
      </span>
    );
  }

  const isUrgent = hours === 0 && minutes < 20;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${
      isUrgent
        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
        : 'bg-teal-500/15 text-teal-300 border-teal-500/30'
    }`}>
      <Clock className="w-3 h-3" />
      {formattedTime} remaining
    </span>
  );
};
