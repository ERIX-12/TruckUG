import React from 'react';
import { Vehicle } from '../types';
import { PlateTag } from './PlateTag';
import { StatusPill } from './StatusPill';
import { useRenderPerformance } from '../hooks/useRenderPerformance';
import { Plus, CheckSquare, Square, Layers, X, ExternalLink, Volume2, Mic, Building2, BarChart3 } from 'lucide-react';
import { speakVehicleLocation } from '../utils/voiceNavigator';
import { isVehicleInUganda } from '../utils/geoRules';

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
  onOpenRegisterStationModal?: () => void;
  // Multi-select comparison props
  multiSelectMode?: boolean;
  onToggleMultiSelectMode?: () => void;
  comparisonVehicleIds?: string[];
  onToggleComparisonVehicle?: (vehicleId: string) => void;
  onLaunchComparison?: () => void;
  onClearComparison?: () => void;
  // Voice locate
  onLocateVehicle?: (veh: Vehicle) => void;
  onOpenVoiceCommandModal?: () => void;
  onOpenAlertsSummaryModal?: () => void;
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
  onOpenRegisterStationModal,
  multiSelectMode = false,
  onToggleMultiSelectMode,
  comparisonVehicleIds = [],
  onToggleComparisonVehicle,
  onLaunchComparison,
  onClearComparison,
  onLocateVehicle,
  onOpenVoiceCommandModal,
  onOpenAlertsSummaryModal,
}) => {
  useRenderPerformance('VehicleList');

  const maxSelectedReached = comparisonVehicleIds.length >= 5;

  const handleCardClick = (veh: Vehicle) => {
    if (multiSelectMode && onToggleComparisonVehicle) {
      onToggleComparisonVehicle(veh.id);
    } else {
      onSelectVehicle(veh);
    }
  };

  return (
    <div className="w-full lg:w-[360px] border-r border-gray-200 dark:border-[#2B313D] bg-white dark:bg-[#181C25] flex flex-col shrink-0 z-20 shadow-md">
      {/* Top Header */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <div>
          <span className="font-heading font-bold text-xs uppercase tracking-wider text-gray-700 dark:text-gray-300">
            Uganda Fleet Trackers ({vehicles.length})
          </span>
          <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
            <span>●</span>
            <span>UGANDA BOUNDS ENFORCED</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {onOpenVoiceCommandModal && (
            <button
              onClick={onOpenVoiceCommandModal}
              className="p-1.5 rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50/80 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-all cursor-pointer"
              title="Voice Dispatch Command: Say 'Locate vehicle'"
            >
              <Mic className="w-3.5 h-3.5" />
            </button>
          )}

          {onToggleMultiSelectMode && (
            <button
              onClick={onToggleMultiSelectMode}
              className={`px-2 py-1 rounded-lg font-bold text-xs flex items-center gap-1 transition-all cursor-pointer ${
                multiSelectMode
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              title={multiSelectMode ? 'Exit multi-select mode' : 'Enable multi-select telemetry comparison'}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{multiSelectMode ? 'Compare Mode' : 'Multi-Select'}</span>
            </button>
          )}

          {onOpenAlertsSummaryModal && (
            <button
              onClick={onOpenAlertsSummaryModal}
              className="px-2 py-1 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
              title="24-Hour Telematics Alerts Summary (Speeding, Curfew, Harsh Braking)"
            >
              <BarChart3 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span className="hidden sm:inline">24h Alerts</span>
            </button>
          )}

          {onOpenRegisterStationModal && (
            <button
              onClick={onOpenRegisterStationModal}
              className="px-2 py-1 rounded-lg border border-blue-300 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
              title="Register Mock Police Station or Interceptor Unit"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Station</span>
            </button>
          )}

          <button
            onClick={onEnroll}
            className="px-2 py-1 rounded-lg bg-[#B3261E] hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
            title="Enroll New Vehicle"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Enroll</span>
          </button>
        </div>
      </div>

      {/* Multi-Select Status Banner */}
      {multiSelectMode && (
        <div className="px-3 py-2 bg-blue-50 dark:bg-blue-950/40 border-b border-blue-200 dark:border-blue-900/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-blue-900 dark:text-blue-200 font-semibold">
            <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>
              Selected: <strong className="font-mono">{comparisonVehicleIds.length}</strong> / 5
            </span>
            {maxSelectedReached && (
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">(Max 5)</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {comparisonVehicleIds.length > 0 && onClearComparison && (
              <button
                onClick={onClearComparison}
                className="text-[11px] text-gray-500 hover:text-red-500 cursor-pointer font-medium"
              >
                Clear
              </button>
            )}
            {comparisonVehicleIds.length >= 1 && onLaunchComparison && (
              <button
                onClick={onLaunchComparison}
                className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] shadow-2xs cursor-pointer flex items-center gap-1 animate-pulse"
              >
                <span>Compare ({comparisonVehicleIds.length})</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Category Quick Filter Bar */}
      <div className="px-2.5 py-1.5 border-b border-gray-100 dark:border-gray-800/80 bg-gray-50/50 dark:bg-[#13161D] flex flex-col gap-1.5 text-[11px]">
        <div className="flex items-center gap-1 overflow-x-auto">
          {[
            { id: 'all', label: 'All' },
            { id: 'private', label: 'Private' },
            { id: 'commercial', label: 'Commercial' },
            { id: 'public', label: 'Public' },
            { id: 'police', label: 'Police' },
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
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Scrollable Vehicle list */}
      <div className="flex-1 overflow-y-auto pb-24 lg:pb-4 divide-y divide-gray-100 dark:divide-gray-800/60">
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
            const isSingleSelected = selectedVehicleId === veh.id;
            const isMultiSelected = comparisonVehicleIds.includes(veh.id);

            return (
              <div
                key={veh.id}
                onClick={() => handleCardClick(veh)}
                className={`p-3 cursor-pointer transition-all flex items-start gap-2.5 ${
                  multiSelectMode && isMultiSelected
                    ? 'bg-blue-50/80 dark:bg-blue-950/40 border-l-4 border-blue-600'
                    : isSingleSelected && !multiSelectMode
                    ? 'bg-red-50/70 dark:bg-red-950/30 border-l-4 border-[#B3261E]'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'
                }`}
              >
                {/* Multi-select checkbox */}
                {multiSelectMode && (
                  <div className="pt-0.5 text-blue-600 dark:text-blue-400 shrink-0">
                    {isMultiSelected ? (
                      <CheckSquare className="w-4 h-4 fill-blue-600 text-white dark:fill-blue-500" />
                    ) : (
                      <Square
                        className={`w-4 h-4 text-gray-300 dark:text-gray-600 ${
                          maxSelectedReached ? 'opacity-30' : 'hover:text-blue-500'
                        }`}
                      />
                    )}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <PlateTag plate={veh.plate} size="sm" />
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onLocateVehicle) {
                            onLocateVehicle(veh);
                          } else {
                            speakVehicleLocation(veh);
                          }
                        }}
                        className="p-1 rounded-md bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 cursor-pointer transition-colors shadow-2xs"
                        title="Locate vehicle: Read out location loudly on map"
                      >
                        <Volume2 className="w-3 h-3" />
                      </button>
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-mono">
                        {veh.category || 'private'}
                      </span>
                      {isVehicleInUganda(veh) && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded font-mono bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300/80 dark:border-emerald-800/80" title="Located strictly within Republic of Uganda boundaries">
                          UG
                        </span>
                      )}
                      <StatusPill status={veh.status} size="sm" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-800 dark:text-gray-200 truncate pr-2">
                      {veh.make} {veh.model}
                    </span>
                    <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                      {veh.lastPosition?.speedKph} km/h
                    </span>
                  </div>

                  <div className="text-[11px] text-gray-500 truncate mt-0.5 font-mono">
                    {veh.lastPosition?.address}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Sticky Bottom Comparison Trigger when items are selected */}
      {multiSelectMode && comparisonVehicleIds.length > 0 && onLaunchComparison && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#13161F] flex items-center gap-2 shadow-lg">
          <button
            onClick={onLaunchComparison}
            className="flex-1 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all"
          >
            <Layers className="w-4 h-4" />
            <span>Launch Comparison ({comparisonVehicleIds.length} / 5)</span>
          </button>
        </div>
      )}
    </div>
  );
};
