import React from 'react';
import { VehicleStatus } from '../types';

interface StatusPillProps {
  status: VehicleStatus | 'offline' | 'low_battery';
  size?: 'sm' | 'md';
}

export const StatusPill: React.FC<StatusPillProps> = ({ status, size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-semibold';

  switch (status) {
    case 'stolen':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full font-bold bg-[#B3261E] text-white animate-pulse shadow-sm ${sizeClasses}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
          STOLEN
        </span>
      );
    case 'active':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 ${sizeClasses}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400"></span>
          Active
        </span>
      );
    case 'recovered':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800 ${sizeClasses}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
          Recovered
        </span>
      );
    case 'offline':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-300 dark:border-gray-700 ${sizeClasses}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
          Offline
        </span>
      );
    case 'low_battery':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 ${sizeClasses}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          Low Battery
        </span>
      );
    default:
      return null;
  }
};
