import React, { useState } from 'react';
import { Vehicle } from '../../types';
import { PlateTag } from '../PlateTag';
import { StatusPill } from '../StatusPill';
import { Car, Search, Battery, Zap, MapPin, Eye, ShieldAlert, Plus } from 'lucide-react';

interface VehiclesScreenProps {
  vehicles: Vehicle[];
  onSelectVehicle: (vehicle: Vehicle) => void;
  onReportStolen: (plate: string) => void;
  searchQuery?: string;
}

export const VehiclesScreen: React.FC<VehiclesScreenProps> = ({
  vehicles,
  onSelectVehicle,
  onReportStolen,
  searchQuery = '',
}) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'stolen' | 'offline'>('all');
  const [search, setSearch] = useState(searchQuery);

  React.useEffect(() => {
    if (searchQuery) setSearch(searchQuery);
  }, [searchQuery]);

  const filtered = vehicles.filter((v) => {
    if (filter === 'active' && v.status !== 'active') return false;
    if (filter === 'stolen' && v.status !== 'stolen') return false;
    if (filter === 'offline' && v.deviceStatus !== 'offline') return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        v.plate.toLowerCase().includes(q) ||
        v.make.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        v.ownerName.toLowerCase().includes(q) ||
        v.deviceImei.includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50 dark:bg-[#0F1218] text-gray-900 dark:text-gray-100 select-none">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-800 gap-2">
          <div>
            <h1 className="text-2xl font-bold font-heading uppercase tracking-wide flex items-center gap-2">
              <Car className="w-6 h-6 text-blue-600" />
              Fleet &amp; Enrolled Vehicles
            </h1>
            <p className="text-xs text-gray-500 font-mono">
              PostgreSQL vehicles table synchronized with Redis lastpos cache
            </p>
          </div>
        </div>

        {/* Filters and search */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#181C25] p-3 rounded-xl border border-gray-200 dark:border-gray-800 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {(['all', 'active', 'stolen', 'offline'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilter(mode)}
                className={`px-3 py-1.5 rounded-lg capitalize font-semibold transition-colors ${
                  filter === mode
                    ? 'bg-[#B3261E] text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search plate, make, IMEI..."
              className="w-full pl-8 pr-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#0F1218] text-xs font-mono"
            />
          </div>
        </div>

        {/* Vehicles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((veh) => {
            const isStolen = veh.status === 'stolen';
            return (
              <div
                key={veh.id}
                className={`p-4 rounded-xl border bg-white dark:bg-[#181C25] shadow-xs space-y-3 transition-all ${
                  isStolen
                    ? 'border-red-500 ring-2 ring-red-500/20'
                    : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <PlateTag plate={veh.plate} size="md" />
                  <StatusPill status={veh.status} />
                </div>

                <div>
                  <div className="font-bold text-sm text-gray-900 dark:text-gray-100">
                    {veh.make} {veh.model}
                  </div>
                  <div className="text-xs text-gray-500 font-mono">
                    Owner: {veh.ownerName} • {veh.color}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-gray-50 dark:bg-[#13161D] p-2.5 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <Battery className="w-3.5 h-3.5 text-emerald-500" /> {veh.batteryPct}%
                  </div>
                  <div className="flex items-center gap-1">
                    <Zap className={`w-3.5 h-3.5 ${veh.ignition ? 'text-amber-500' : 'text-gray-400'}`} />
                    {veh.ignition ? 'Ignition ON' : 'Ignition OFF'}
                  </div>
                  <div className="col-span-2 flex items-center gap-1 truncate text-gray-500">
                    <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                    <span className="truncate">{veh.lastPosition?.address}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => onSelectVehicle(veh)}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Inspect Telemetry
                  </button>

                  {veh.status !== 'stolen' && (
                    <button
                      onClick={() => onReportStolen(veh.plate)}
                      className="py-1.5 px-3 rounded-lg bg-[#B3261E] hover:bg-red-700 text-xs font-bold text-white flex items-center gap-1 transition-colors"
                      title="Report Stolen"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
