import React from 'react';

interface ResQGridLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  className?: string;
}

export const ResQGridLogo: React.FC<ResQGridLogoProps> = ({
  size = 'md',
  showTagline = false,
  className = ''
}) => {
  const iconSizes = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base'
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-3xl'
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* ResQGrid Radar Shield Logo */}
      <div className={`relative ${iconSizes[size]} rounded-xl bg-gradient-to-br from-teal-500 via-emerald-600 to-indigo-700 p-0.5 shadow-[0_0_15px_rgba(20,184,166,0.4)] flex items-center justify-center shrink-0`}>
        <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center relative overflow-hidden">
          {/* Grid lines inside emblem */}
          <div className="absolute inset-0 opacity-30 bg-[linear-gradient(to_right,#14b8a6_1px,transparent_1px),linear-gradient(to_bottom,#14b8a6_1px,transparent_1px)] bg-[size:6px_6px]" />
          
          {/* Emblem Icon (Hex / Pulse) */}
          <svg
            className="w-3/5 h-3/5 text-teal-400 relative z-10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" />
            <path d="M12 8v8" />
            <path d="M8 12h8" />
          </svg>
        </div>
      </div>

      <div className="flex flex-col">
        <div className={`font-display font-black tracking-tight text-white flex items-center gap-1.5 ${textSizes[size]}`}>
          <span>ResQ</span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400 font-extrabold">
            Grid
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
        </div>
        {showTagline && (
          <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium tracking-wide">
            Predict Early. Respond Faster. Save Lives.
          </span>
        )}
      </div>
    </div>
  );
};
