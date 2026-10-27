import React from 'react';
import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface GlassPanelProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}

export const GlassPanel: React.FC<GlassPanelProps> = ({ children, className, glow = false, ...props }) => {
  return (
    <motion.div
      className={cn(
        'card-border p-6 relative overflow-hidden transition-colors',
        glow && 'border-teal-500/30 shadow-[0_0_15px_rgba(20,184,166,0.15)]',
        className
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      {...props}
    >
      {/* Subtle top reflection for depth, less aggressive than glass */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-warm-white/10 to-transparent" />
      {children}
    </motion.div>
  );
};
