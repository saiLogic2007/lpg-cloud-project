import React from 'react';
import { motion } from 'motion/react';

/**
 * Animated circular Gauge component to render live PPM concentrations
 */
export const Gauge = ({ value, max, label, color }) => {
  const percentage = Math.min(100, (value / max) * 100);
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center justify-center p-4">
      <svg className="w-48 h-48 transform -rotate-90">
        {/* Background track */}
        <circle
          cx="96"
          cy="96"
          r={radius}
          stroke="currentColor"
          strokeWidth="12"
          fill="transparent"
          className="text-gray-200"
        />
        {/* Animated progressive progress bar */}
        <motion.circle
          cx="96"
          cy="96"
          r={radius}
          stroke={color}
          strokeWidth="12"
          fill="transparent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center mt-[-10px]">
        <span className="text-4xl font-bold tracking-tighter" id="gauge-value">
          {Math.round(value)}
        </span>
        <span className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
          {label}
        </span>
      </div>
    </div>
  );
};
