import React from 'react';
import { Vehicle, Role } from '../types';
import { PlateTag } from './PlateTag';
import { StatusPill } from './StatusPill';
import { useRenderPerformance } from '../hooks/useRenderPerformance';
import { Plus } from 'lucide-react';

interface VehicleListProps {
  vehicles: Vehicle[];
  mapCategoryFilter: string;
  setMapCategoryFilter: (cat: any) => void;
  mapDistrictFilter: string;
  setMapDistrictFilter: (dist: string) => void;
  UGANDA_DISTRICTS: string[];
  selectedVehicleId?: string;
  onSelectVehicle: (veh: Vehicle) => void;
  onEnroll: () => void;
}

export const VehicleList: React.FC<VehicleListProps> = ({
  vehicles,
  mapCategoryFilter,
  setMapCategoryFilter,
  mapDistrictFilter,
  setMapDistrictFilter,
  UGANDA_DISTRICTS,
  selectedVehicleId,
  onSelectVehicle,
  onEnroll,
}) => {
  useRenderPerformance('VehicleList');

  return (
    <div className="w-full lg:w-[360px] border-r border-gray-200 dark:border-[#2B313D] bg-white dark:bg-[#181C25] flex flex-col shrink-0 z-20 shadow-md">
      <div className="p-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <div>
          <span className="font-heading font-bold text-xs uppercase tracking-wider text-gray-700 dark:text-gray-300">
            Uganda Fleet Trackers ({vehicles.length})
          </span>
          <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
            ● 100% ONLINE GT06
          </div>
        </div>
        <button
          onClick={onEnroll}
          className="px-2.5 py-1 rounded-lg bg-[#B3261E] hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
          title="Enroll New Vehicle"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Enroll</span>
        </button>
      </div>

      <div className="px-2.5 py-1.5 border-b border-gray-100 dark:border-gray-800/80 bg-gray-50/50 dark:bg-[#13161D] flex flex-col gap-1.5 text-[11px]">
        <div className="flex items-center gap-1 overflow-x-auto">
          {[
            { id: 'all', label: 'All' },
            { id: 'private', label: 'Private' },
            { id: 'commercial', label: 'Commercial' },
            { id: 'public', label: 'Public' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setMapCategoryFilter(cat.id)}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                mapCategoryFilter === cat.id
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-bold uppercase text-gray-400 font-mono">Dist:</span>
          <select
            value={mapDistrictFilter}
            onChange={(e) => setMapDistrictFilter(e.target.value)}
            className="px-2 py-0.5 rounded-md text-[10px] bg-white dark:bg-gray-800 border-none cursor-pointer"
          >
            <option value="all">All</option>
            {UGANDA_DISTRICTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800/60">
        {vehicles.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-500 space-y-2">
            <p>No vehicles found matching current filter.</p>
            <button
              onClick={onEnroll}
              className="px-3 py-1.5 rounded-lg bg-[#B3261E] text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              + Enroll Vehicle
            </button>
          </div>
        ) : (
          vehicles.map((veh) => {
            const isSelected = selectedVehicleId === veh.id;
            return (
              <div
                key={veh.id}
                onClick={() => onSelectVehicle(veh)}
                className={`p-3 cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-red-50/70 dark:bg-red-950/30 border-l-4 border-[#B3261E]'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <PlateTag plate={veh.plate} size="sm" />
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-mono">
                      {veh.category || 'private'}
                    </span>
                    <StatusPill status={veh.status} size="sm" />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {veh.make} {veh.model}
                  </span>
                  <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                    {veh.lastPosition?.speedKph} km/h
                  </span>
                </div>

                <div className="text-[11px] text-gray-500 truncate mt-0.5 font-mono">
                  {veh.lastPosition?.address}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
