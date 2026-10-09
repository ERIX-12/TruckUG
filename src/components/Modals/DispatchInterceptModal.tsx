import React, { useState, useMemo } from 'react';
import { Vehicle } from '../../types';
import { PlateTag } from '../PlateTag';
import { StatusPill } from '../StatusPill';
import {
  findNearestInterceptUnits,
  InterceptCandidate,
} from '../../utils/interceptNavigator';
import { MOCK_POLICE_STATIONS } from '../../data/mockPoliceStations';
import { RegisterPoliceStationModal } from './RegisterPoliceStationModal';
import {
  Siren,
  ShieldAlert,
  Radio,
  Clock,
  MapPin,
  Navigation,
  X,
  CheckCircle,
  Zap,
  Gauge,
  User,
  Shield,
  ChevronRight,
  AlertTriangle,
  Building2,
  Plus,
  Layers,
} from 'lucide-react';

interface DispatchInterceptModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetVehicle: Vehicle;
  allVehicles: Vehicle[];
  onConfirmDispatch: (
    targetVehicle: Vehicle,
    patrolVehicle: Vehicle,
    candidate: InterceptCandidate,
    reason: string
  ) => void;
  onRegisterStation?: (stationVehicle: Vehicle) => void;
  onBatchRegisterStations?: (stationVehicles: Vehicle[]) => void;
}

export const DispatchInterceptModal: React.FC<DispatchInterceptModalProps> = ({
  isOpen,
  onClose,
  targetVehicle,
  allVehicles,
  onConfirmDispatch,
  onRegisterStation,
  onBatchRegisterStations,
}) => {
  const [showRegisterStationModal, setShowRegisterStationModal] = useState(false);

  const candidates = useMemo(
    () => findNearestInterceptUnits(targetVehicle, allVehicles),
    [targetVehicle, allVehicles]
  );

  const [selectedPatrolId, setSelectedPatrolId] = useState<string>(
    candidates[0]?.vehicle.id || ''
  );
  const [dispatchReason, setDispatchReason] = useState<string>(
    `Immediate tactical intercept of target vehicle ${targetVehicle.plate} (${targetVehicle.make} ${targetVehicle.model}) on ${targetVehicle.lastPosition?.address || 'Kampala arterial corridor'}.`
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync default selected patrol when candidates change
  React.useEffect(() => {
    if (candidates.length > 0 && (!selectedPatrolId || !candidates.some((c) => c.vehicle.id === selectedPatrolId))) {
      setSelectedPatrolId(candidates[0].vehicle.id);
    }
  }, [candidates, selectedPatrolId]);

  if (!isOpen) return null;

  const activeCandidate =
    candidates.find((c) => c.vehicle.id === selectedPatrolId) || candidates[0];
  const shortestCandidate = candidates[0];

  const handleTransmit = () => {
    if (!activeCandidate) return;
    setIsSubmitting(true);
    setTimeout(() => {
      onConfirmDispatch(
        targetVehicle,
        activeCandidate.vehicle,
        activeCandidate,
        dispatchReason
      );
      setIsSubmitting(false);
      onClose();
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150 select-none">
      <div className="relative w-full max-w-2xl max-h-[calc(100vh-32px)] flex flex-col rounded-2xl bg-white dark:bg-[#131722] border border-blue-500/50 shadow-2xl text-gray-900 dark:text-gray-100 overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-gray-800 bg-linear-to-r from-blue-900 via-blue-950 to-gray-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600/40 border border-blue-400/40 text-blue-300">
              <Siren className="w-6 h-6 animate-pulse text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300">
                  UPF JOINT TACTICAL INTERCEPT COMMAND
                </span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-red-600 text-white">
                  PRIORITY 1
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold font-heading uppercase tracking-wide">
                Dispatch Nearest Intercept Unit
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {/* Target Vehicle Summary Card */}
          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#181C26] border border-gray-200 dark:border-gray-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 text-[10px] flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-red-500" /> TARGET VEHICLE FOR INTERCEPTION
              </span>
              <StatusPill status={targetVehicle.status} size="sm" />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <PlateTag plate={targetVehicle.plate} size="md" />
                <span className="font-bold text-sm text-gray-900 dark:text-gray-100">
                  {targetVehicle.make} {targetVehicle.model} ({targetVehicle.color})
                </span>
              </div>
              <div className="flex items-center gap-3 font-mono text-[11px] text-gray-600 dark:text-gray-400">
                <span>Speed: <strong className="text-emerald-500">{targetVehicle.lastPosition?.speedKph ?? 0} km/h</strong></span>
                <span>Heading: <strong className="text-gray-700 dark:text-gray-200">{targetVehicle.lastPosition?.heading}°</strong></span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300 font-mono text-[11px]">
              <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <span className="truncate">
                Current Position: <strong>{targetVehicle.lastPosition?.address || 'Kampala Metro'}</strong> ({targetVehicle.district} District)
              </span>
            </div>
          </div>

          {/* Shortest ETA Highlight Banner */}
          {shortestCandidate && (
            <div className="p-4 rounded-xl bg-linear-to-r from-emerald-950/70 via-blue-950/60 to-gray-900 border-2 border-emerald-500/80 shadow-lg text-white space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" /> RECOMMENDED PATROL UNIT (SHORTEST ETA)
                  </span>
                </div>
                <div className="px-2.5 py-1 rounded-full bg-emerald-500 text-gray-950 font-black text-xs font-mono flex items-center gap-1 shadow-sm">
                  <Clock className="w-3.5 h-3.5" />
                  <span>ETA: {shortestCandidate.formattedEta} (~{shortestCandidate.distanceKm} km)</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <PlateTag plate={shortestCandidate.vehicle.plate} size="sm" />
                    <span className="font-bold text-emerald-300 font-mono">
                      {shortestCandidate.vehicle.callsign}
                    </span>
                  </div>
                  <div className="text-gray-300 text-xs font-semibold">
                    {shortestCandidate.vehicle.make} {shortestCandidate.vehicle.model}
                  </div>
                  <div className="text-gray-400 text-[11px] font-mono mt-0.5">
                    {shortestCandidate.vehicle.assignedDivision}
                  </div>
                </div>

                <div className="space-y-1 font-mono text-[11px] bg-black/30 p-2.5 rounded-lg border border-white/10">
                  <div className="flex justify-between text-gray-300">
                    <span className="text-gray-400">Commander:</span>
                    <span className="font-semibold text-white">{shortestCandidate.vehicle.officerInCharge}</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span className="text-gray-400">Patrol Speed:</span>
                    <span className="font-semibold text-emerald-400">{shortestCandidate.vehicle.lastPosition?.speedKph} km/h (Emergency: 65kph)</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span className="text-gray-400">Current Unit Location:</span>
                    <span className="font-semibold text-amber-300 truncate max-w-[150px]">{shortestCandidate.vehicle.lastPosition?.address}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* All Ranked Police Patrol Units Selection List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 text-[11px] flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-blue-500" /> REGISTERED POLICE PATROL UNITS &amp; STATIONS RANKED BY ETA ({candidates.length})
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-gray-500 hidden sm:inline">
                  Sorted by shortest arrival time
                </span>
                <button
                  type="button"
                  onClick={() => setShowRegisterStationModal(true)}
                  className="px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-300 dark:border-blue-800 text-blue-600 dark:text-blue-400 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                  title="Register a new police station or quick response unit"
                >
                  <Plus className="w-3 h-3" />
                  <span>Register Station</span>
                </button>
              </div>
            </div>

            {candidates.length === 0 ? (
              <div className="p-4 sm:p-5 rounded-xl border border-dashed border-blue-400/60 dark:border-blue-800/80 bg-blue-50/40 dark:bg-blue-950/20 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="font-bold text-xs text-gray-800 dark:text-gray-200">
                    No active police patrol units detected within metropolitan dispatch radius.
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                    Register an official Uganda Police Force metropolitan station (CPS Kampala, Kira Rd, Kabalagala, etc.) to immediately enable shortest-ETA tactical intercept calculations and path routing.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowRegisterStationModal(true)}
                    className="w-full sm:w-auto px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Register Mock Police Station</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onBatchRegisterStations) {
                        onBatchRegisterStations(MOCK_POLICE_STATIONS);
                      } else if (onRegisterStation) {
                        MOCK_POLICE_STATIONS.forEach((s) => onRegisterStation(s));
                      }
                    }}
                    className="w-full sm:w-auto px-3.5 py-2 rounded-lg border border-blue-300 dark:border-blue-800 bg-white dark:bg-[#161B26] hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>Quick-Deploy UPF Stations ({MOCK_POLICE_STATIONS.length})</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {candidates.map((cand, idx) => {
                  const isSelected = selectedPatrolId === cand.vehicle.id;
                  const isBest = idx === 0;
                  const isStation = cand.isStation || cand.vehicle.isPoliceStation;

                  return (
                    <div
                      key={cand.vehicle.id}
                      onClick={() => setSelectedPatrolId(cand.vehicle.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 ring-2 ring-blue-500/40'
                          : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161A24] hover:border-gray-300 dark:hover:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Radio selection indicator */}
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'border-blue-600 bg-blue-600 text-white'
                              : 'border-gray-400 dark:border-gray-600'
                          }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <PlateTag plate={cand.vehicle.plate} size="sm" />
                            <span className="font-bold font-mono text-xs text-blue-600 dark:text-blue-400">
                              {cand.vehicle.callsign}
                            </span>
                            {isStation && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-400/40 flex items-center gap-1">
                                <Building2 className="w-2.5 h-2.5" /> POLICE STATION
                              </span>
                            )}
                            {isBest && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40">
                                SHORTEST ETA
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-600 dark:text-gray-400 truncate mt-0.5">
                            {cand.vehicle.stationName || cand.vehicle.officerInCharge} • {cand.vehicle.assignedDivision || cand.vehicle.make}
                          </div>
                          <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                            {cand.corridorNotes}
                          </div>
                        </div>
                      </div>

                      {/* Distance & ETA Badge */}
                      <div className="text-right shrink-0 font-mono">
                        <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          ETA {cand.formattedEta}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          {cand.distanceKm} km route
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Operational Justification Order Text */}
          <div className="space-y-1">
            <label className="font-semibold text-gray-700 dark:text-gray-300 text-[11px] uppercase tracking-wide">
              Tactical Intercept Dispatch Order / Reason
            </label>
            <textarea
              rows={2}
              value={dispatchReason}
              onChange={(e) => setDispatchReason(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#181C26] text-xs font-mono text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              placeholder="Enter operational reason for dispatch..."
            />
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-3.5 sm:p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-[#10131B] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] font-mono text-gray-500 flex items-center gap-1.5 self-start sm:self-center">
            <Shield className="w-3.5 h-3.5 text-blue-500" />
            <span>Audited under Uganda Police Force Operational Directives</span>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 font-semibold text-xs transition-colors cursor-pointer text-center"
            >
              Cancel
            </button>
            <button
              disabled={!activeCandidate || isSubmitting}
              onClick={() => {
                if (!activeCandidate) return;
                onConfirmDispatch(
                  targetVehicle,
                  activeCandidate.vehicle,
                  activeCandidate,
                  dispatchReason
                );
                onClose();
              }}
              className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-98 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
              title="Project calculated ETA route path overlay on LiveMap"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Project on Map</span>
            </button>
            <button
              disabled={!activeCandidate || isSubmitting}
              onClick={handleTransmit}
              className="px-4 py-2.5 sm:py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-98 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Siren className="w-4 h-4 animate-pulse" />
              <span>
                {isSubmitting
                  ? 'Transmitting Order...'
                  : `Transmit & Dispatch ${activeCandidate?.vehicle.callsign || 'Patrol Unit'}`}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Embedded Register Police Station Modal */}
      {showRegisterStationModal && (
        <RegisterPoliceStationModal
          isOpen={showRegisterStationModal}
          onClose={() => setShowRegisterStationModal(false)}
          existingStationIds={allVehicles.map((v) => v.id)}
          onRegisterStation={(stn) => {
            if (onRegisterStation) {
              onRegisterStation(stn);
            }
          }}
          onBatchRegisterStations={(stns) => {
            if (onBatchRegisterStations) {
              onBatchRegisterStations(stns);
            } else if (onRegisterStation) {
              stns.forEach((s) => onRegisterStation(s));
            }
          }}
        />
      )}
    </div>
  );
};
