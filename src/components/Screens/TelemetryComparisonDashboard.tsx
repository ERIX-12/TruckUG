import React from 'react';
import { Vehicle } from '../../types';
import { PlateTag } from '../PlateTag';
import { StatusPill } from '../StatusPill';
import { isVehicleInUganda } from '../../utils/geoRules';
import {
  X,
  Gauge,
  Zap,
  Battery,
  MapPin,
  Compass,
  Radio,
  User,
  Shield,
  ExternalLink,
  Trash2,
  Activity,
  Layers,
} from 'lucide-react';

interface TelemetryComparisonDashboardProps {
  vehicles: Vehicle[];
  onClose: () => void;
  onRemoveVehicle: (vehicleId: string) => void;
  onSelectForMap: (vehicle: Vehicle) => void;
  onClearAll: () => void;
}

export const TelemetryComparisonDashboard: React.FC<TelemetryComparisonDashboardProps> = ({
  vehicles,
  onClose,
  onRemoveVehicle,
  onSelectForMap,
  onClearAll,
}) => {
  if (vehicles.length === 0) return null;

  const avgSpeed = Math.round(
    vehicles.reduce((acc, v) => acc + (v.lastPosition?.speedKph || 0), 0) / vehicles.length
  );
  const activeIgnitionCount = vehicles.filter((v) => v.ignition).length;
  const stolenCount = vehicles.filter((v) => v.status === 'stolen').length;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex flex-col p-2 sm:p-4 md:p-6 select-none animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#181C25] border border-gray-200 dark:border-[#2B313D] rounded-2xl shadow-2xl flex-1 flex flex-col overflow-hidden text-gray-900 dark:text-gray-100 max-w-7xl mx-auto w-full">
        {/* Header Bar */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3 bg-gray-50/80 dark:bg-[#12151D]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-heading font-bold uppercase tracking-wide">
                  Live Fleet Telemetry Comparison
                </h2>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                  {vehicles.length} / 5 Vehicles Active
                </span>
              </div>
              <p className="text-xs text-gray-500 font-mono flex items-center gap-2">
                <span>● Real-time GT06 telemetry sync</span>
                <span>•</span>
                <span>Side-by-side parametric analysis</span>
              </p>
            </div>
          </div>

          {/* Quick Fleet Aggregates */}
          <div className="flex items-center gap-2 sm:gap-4 font-mono text-xs">
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-[#181C25] border border-gray-200 dark:border-gray-800 shadow-2xs">
              <Gauge className="w-4 h-4 text-emerald-500" />
              <span className="text-gray-500">Avg Speed:</span>
              <span className="font-bold text-gray-900 dark:text-gray-100">{avgSpeed} km/h</span>
            </div>
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-[#181C25] border border-gray-200 dark:border-gray-800 shadow-2xs">
              <Zap className="w-4 h-4 text-amber-500" />
              <span className="text-gray-500">Ignition ON:</span>
              <span className="font-bold text-gray-900 dark:text-gray-100">
                {activeIgnitionCount}/{vehicles.length}
              </span>
            </div>
            {stolenCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-950/80 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 font-bold">
                <Shield className="w-4 h-4 text-red-600" />
                <span>{stolenCount} Stolen Watch</span>
              </div>
            )}

            <button
              onClick={onClearAll}
              className="px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              title="Clear all selected comparison vehicles"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Side-by-side Telemetry Grid */}
        <div className="flex-1 overflow-x-auto overflow-y-auto p-4 sm:p-6 bg-gray-50/50 dark:bg-[#0F1218]">
          <div
            className={`grid gap-4 min-w-[280px] h-full ${
              vehicles.length === 1
                ? 'grid-cols-1 max-w-md mx-auto'
                : vehicles.length === 2
                ? 'grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto'
                : vehicles.length === 3
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                : vehicles.length === 4
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'
            }`}
          >
            {vehicles.map((v) => {
              const speed = v.lastPosition?.speedKph || 0;
              const isOverSpeed = speed > 60;

              return (
                <div
                  key={v.id}
                  className={`rounded-xl border flex flex-col bg-white dark:bg-[#181C25] shadow-md transition-all ${
                    v.status === 'stolen'
                      ? 'border-red-500/80 ring-2 ring-red-500/20'
                      : 'border-gray-200 dark:border-gray-800 hover:border-blue-400/60'
                  }`}
                >
                  {/* Card Header */}
                  <div className="p-3.5 border-b border-gray-100 dark:border-gray-800/80 bg-gray-50/60 dark:bg-[#13161F] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PlateTag plate={v.plate} size="sm" />
                      <StatusPill status={v.status} size="sm" />
                    </div>
                    <button
                      onClick={() => onRemoveVehicle(v.id)}
                      className="p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                      title="Remove from comparison"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-3.5 flex-1 text-xs">
                    {/* Make & Model */}
                    <div>
                      <div className="font-heading font-bold text-sm text-gray-900 dark:text-gray-100">
                        {v.make} {v.model}
                      </div>
                      <div className="text-[11px] text-gray-500 flex items-center gap-2 font-mono">
                        <span>{v.color}</span>
                        <span>•</span>
                        <span className="uppercase font-semibold">{v.category || 'private'}</span>
                        <span>•</span>
                        <span className="text-gray-600 dark:text-gray-300 font-bold">{v.district}</span>
                      </div>
                    </div>

                    {/* Speedometer Gauge Visual */}
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#12151D] border border-gray-200 dark:border-gray-800/80 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-gray-500">
                        <span className="flex items-center gap-1">
                          <Gauge className="w-3.5 h-3.5 text-blue-500" /> Live Velocity
                        </span>
                        <span
                          className={`font-mono font-bold text-sm ${
                            isOverSpeed
                              ? 'text-red-600 dark:text-red-400 animate-pulse'
                              : speed > 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-gray-400'
                          }`}
                        >
                          {speed} km/h
                        </span>
                      </div>
                      {/* Gauge Bar */}
                      <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${
                            isOverSpeed
                              ? 'bg-red-500'
                              : speed > 30
                              ? 'bg-emerald-500'
                              : speed > 0
                              ? 'bg-blue-500'
                              : 'bg-gray-400'
                          }`}
                          style={{ width: `${Math.min(100, (speed / 100) * 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] text-gray-400 font-mono">
                        <span>0</span>
                        <span>Limit: 50 km/h</span>
                        <span>100+</span>
                      </div>
                    </div>

                    {/* Hardware & Power Matrix */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                      <div className="p-2 rounded-lg bg-gray-50 dark:bg-[#12151D] border border-gray-100 dark:border-gray-800/60">
                        <div className="text-[10px] text-gray-400 flex items-center gap-1 mb-0.5">
                          <Zap className="w-3 h-3 text-amber-500" /> Ignition
                        </div>
                        <div
                          className={`font-bold uppercase ${
                            v.ignition ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'
                          }`}
                        >
                          {v.ignition ? 'Engaged (ON)' : 'Parked (OFF)'}
                        </div>
                      </div>

                      <div className="p-2 rounded-lg bg-gray-50 dark:bg-[#12151D] border border-gray-100 dark:border-gray-800/60">
                        <div className="text-[10px] text-gray-400 flex items-center gap-1 mb-0.5">
                          <Battery className="w-3 h-3 text-emerald-500" /> Battery
                        </div>
                        <div
                          className={`font-bold ${
                            v.batteryPct < 25
                              ? 'text-red-500'
                              : v.batteryPct < 60
                              ? 'text-amber-500'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {v.batteryPct}% Level
                        </div>
                      </div>
                    </div>

                    {/* Positioning & Waypoint */}
                    <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-[#12151D] border border-gray-100 dark:border-gray-800/60 space-y-1">
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                        <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                        <span className="truncate">{v.lastPosition?.address || 'Uganda Arterial Corridor'}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[10px] font-mono text-gray-500">
                        <div>Lat: {v.lastPosition?.lat.toFixed(4)}</div>
                        <div>Lon: {v.lastPosition?.lon.toFixed(4)}</div>
                        <div className="flex items-center gap-1">
                          <Compass className="w-3 h-3 text-blue-400" />
                          <span>Heading: {v.lastPosition?.heading || 0}°</span>
                        </div>
                        <div>Status: {v.deviceStatus}</div>
                        <div className="col-span-2 pt-1 border-t border-gray-200/60 dark:border-gray-800/60 flex items-center justify-between">
                          <span>Jurisdiction:</span>
                          <span className={`font-semibold ${isVehicleInUganda(v) ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                            {isVehicleInUganda(v) ? 'Uganda In-Bounds' : 'Out-of-Bounds'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Owner & Tracker Details */}
                    <div className="space-y-1 text-[11px] font-mono text-gray-500 pt-1 border-t border-gray-100 dark:border-gray-800">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Driver / Owner:</span>
                        <span className="font-semibold text-gray-800 dark:text-gray-200 truncate max-w-[130px]">
                          {v.ownerName}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Phone:</span>
                        <span className="text-gray-700 dark:text-gray-300">{v.ownerPhone}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">IMEI:</span>
                        <span className="text-gray-600 dark:text-gray-400 font-mono text-[10px]">{v.deviceImei}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="p-3 border-t border-gray-100 dark:border-gray-800/80 bg-gray-50/60 dark:bg-[#13161F] flex items-center gap-2">
                    <button
                      onClick={() => onSelectForMap(v)}
                      className="flex-1 py-1.5 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Inspect On Map</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dashboard Footer info */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#181C25] flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500 font-mono">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
            <span>Telemetry streams refreshed continuously via GT06 binary parser &amp; corridor simulation</span>
          </div>
          <div>
            Press <strong className="text-gray-800 dark:text-gray-200">ESC</strong> or close to return to main view
          </div>
        </div>
      </div>
    </div>
  );
};
