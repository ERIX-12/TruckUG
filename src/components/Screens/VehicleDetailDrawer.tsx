import React, { useState, useEffect } from 'react';
import { Vehicle, Role, AuditEvent, Alert } from '../../types';
import { PlateTag } from '../PlateTag';
import { StatusPill } from '../StatusPill';
import { HistoricalSpeedChart } from './HistoricalSpeedChart';
import { ForensicExportModal } from '../Modals/ForensicExportModal';
import { GeofenceBreachHistory } from './GeofenceBreachHistory';
import { DispatchInterceptModal } from '../Modals/DispatchInterceptModal';
import { speakVehicleLocation } from '../../utils/voiceNavigator';
import {
  findNearestInterceptUnits,
  speakInterceptDispatch,
  InterceptCandidate,
  ActiveInterceptState,
} from '../../utils/interceptNavigator';
import {
  X,
  Battery,
  Radio,
  Zap,
  Play,
  Pause,
  RotateCcw,
  Clock,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  Activity,
  Layers,
  ChevronRight,
  Share2,
  Download,
  FileSpreadsheet,
  Volume2,
  Siren,
  CheckCircle,
} from 'lucide-react';
import { DriverSafetyScoreCard, calculateDriverSafetyScore } from './DriverSafetyScoreCard';
import { isVehicleInUganda } from '../../utils/geoRules';

interface VehicleDetailDrawerProps {
  vehicle: Vehicle | null;
  onClose: () => void;
  onReportStolen: (plate: string) => void;
  onOpenShareModal: (vehicle: Vehicle) => void;
  userRole?: Role;
  onAddAuditLog?: (event: AuditEvent) => void;
  alerts?: Alert[];
  onLocateVehicle?: (vehicle: Vehicle) => void;
  allVehicles?: Vehicle[];
  onDispatchIntercept?: (
    targetVehicle: Vehicle,
    patrolVehicle: Vehicle,
    candidate: InterceptCandidate,
    reason: string
  ) => void;
  onRegisterPoliceStation?: (stationVehicle: Vehicle) => void;
  onBatchRegisterStations?: (stationVehicles: Vehicle[]) => void;
  activeIntercept?: ActiveInterceptState | null;
  onCancelIntercept?: () => void;
  onCompleteIntercept?: () => void;
  onTriggerSimulatedAlert?: (kind: 'speed' | 'harsh_braking' | 'curfew') => void;
}

export const VehicleDetailDrawer: React.FC<VehicleDetailDrawerProps> = ({
  vehicle,
  onClose,
  onReportStolen,
  onOpenShareModal,
  userRole = 'agency',
  onAddAuditLog,
  alerts = [],
  onLocateVehicle,
  allVehicles = [],
  onDispatchIntercept,
  onRegisterPoliceStation,
  onBatchRegisterStations,
  activeIntercept = null,
  onCancelIntercept,
  onCompleteIntercept,
  onTriggerSimulatedAlert,
}) => {
  const [activeTab, setActiveTab] = useState<'live' | 'history' | 'geofences' | 'details'>('live');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showInterceptModal, setShowInterceptModal] = useState(false);
  const [dispatchSuccessNotice, setDispatchSuccessNotice] = useState<string | null>(null);

  const driverSafetyMetrics = React.useMemo(() => {
    if (!vehicle) return null;
    return calculateDriverSafetyScore(vehicle, alerts);
  }, [vehicle, alerts]);

  const nearestCandidate = React.useMemo(() => {
    if (!vehicle || !allVehicles || allVehicles.length === 0) return null;
    const candidates = findNearestInterceptUnits(vehicle, allVehicles);
    return candidates[0] || null;
  }, [vehicle, allVehicles]);

  const handleConfirmIntercept = async (
    targetVeh: Vehicle,
    patrolVeh: Vehicle,
    candidate: InterceptCandidate,
    reason: string
  ) => {
    await speakInterceptDispatch(targetVeh, patrolVeh, candidate.etaMinutes);

    if (onAddAuditLog) {
      onAddAuditLog({
        id: `aud-intercept-${Date.now()}`,
        ts: new Date().toISOString(),
        actorId: 'usr-dispatch-cmd',
        actorName: 'Emergency Police Dispatch',
        actorRole: userRole,
        action: 'DISPATCH_INTERCEPT_ORDER',
        targetType: 'vehicle',
        targetId: targetVeh.plate,
        reason: `Dispatched patrol unit ${patrolVeh.callsign} (${patrolVeh.plate}) to target ${targetVeh.plate}. ETA: ${candidate.formattedEta} (${candidate.distanceKm} km). Reason: ${reason}`,
        ip: '10.0.99.1',
      });
    }

    if (onDispatchIntercept) {
      onDispatchIntercept(targetVeh, patrolVeh, candidate, reason);
    }

    setDispatchSuccessNotice(
      `Tactical Intercept Dispatched: Unit ${patrolVeh.callsign} en route! Shortest ETA: ~${candidate.formattedEta}.`
    );

    setTimeout(() => {
      setDispatchSuccessNotice(null);
    }, 6000);
  };

  if (!vehicle) return null;

  // Mock historical breadcrumbs for playback
  const historyPoints = [
    { time: '08:00', speed: 0, lat: 0.3015, lon: 32.518, dwell: 15, note: 'Depot Start' },
    { time: '08:15', speed: 38, lat: 0.3082, lon: 32.535, dwell: 0 },
    { time: '08:30', speed: 55, lat: 0.3204, lon: 32.562, dwell: 0 },
    { time: '08:45', speed: 12, lat: 0.3136, lon: 32.581, dwell: 8, note: 'Traffic Stop (8 min)' },
    { time: '09:00', speed: 45, lat: 0.325, lon: 32.597, dwell: 0 },
    { time: '09:15', speed: 62, lat: 0.342, lon: 32.615, dwell: 0 },
    { time: '09:30', speed: 0, lat: 0.3375, lon: 32.576, dwell: 25, note: 'Parking Dwell (25 min)' },
  ];

  // Playback timer
  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      timer = setInterval(() => {
        setPlaybackIndex((prev) => {
          if (prev >= historyPoints.length - 1) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1500 / playbackSpeed);
    }
    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, historyPoints.length]);

  const vehicleBreachesCount = alerts.filter(
    (a) => a.vehicleId === vehicle.id && (a.kind === 'speed' || a.kind === 'curfew' || a.kind === 'geofence_exit')
  ).length;

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      <div
        onClick={onClose}
        className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        aria-hidden="true"
      />

      <div className="fixed inset-x-0 bottom-0 top-14 lg:top-0 lg:bottom-auto lg:relative lg:inset-auto w-full lg:w-[420px] bg-white dark:bg-[#181C25] border-l border-gray-200 dark:border-[#2B313D] flex flex-col h-[calc(100vh-56px)] lg:h-full shadow-2xl z-50 select-none overflow-hidden text-gray-900 dark:text-gray-100 animate-in slide-in-from-bottom lg:slide-in-from-right duration-200">
        {/* Mobile drag handle hint */}
        <div className="lg:hidden w-12 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto my-1.5 shrink-0" />

        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-[#2B313D] bg-gray-50/70 dark:bg-[#13161D] space-y-2">
          {/* Top row: Plate, Status, Category, Close button */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
              <PlateTag plate={vehicle.plate} size="md" />
              <StatusPill status={vehicle.status} size="sm" />
              {vehicle.category && (
                <span
                  className={`text-[9px] sm:text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                    vehicle.category === 'commercial'
                      ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                      : vehicle.category === 'public'
                      ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                      : vehicle.category === 'police'
                      ? 'bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border border-gray-300 dark:border-gray-700'
                  }`}
                >
                  {vehicle.category}
                </span>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 -mr-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors cursor-pointer shrink-0"
              aria-label="Close vehicle details"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Action Toolbar Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Dispatch Nearest Intercept Button */}
            <button
              onClick={() => setShowInterceptModal(true)}
              className="flex-1 min-w-[100px] flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
              title={`Dispatch Nearest Intercept Unit ${nearestCandidate ? `(${nearestCandidate.vehicle.callsign} • ETA ${nearestCandidate.formattedEta})` : ''}`}
            >
              <Siren className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>Intercept</span>
            </button>

            {/* Spoken Locate Voice Button */}
            <button
              onClick={() => {
                if (onLocateVehicle) {
                  onLocateVehicle(vehicle);
                } else {
                  speakVehicleLocation(vehicle);
                }
              }}
              className="flex-1 min-w-[85px] flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
              title="Locate Vehicle: Speaks exact location loudly"
            >
              <Volume2 className="w-3.5 h-3.5 animate-pulse" />
              <span>Locate</span>
            </button>

            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#181C25] border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              title="Export Forensic Dossier CSV"
            >
              <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span className="hidden sm:inline">Export</span>
            </button>

            <button
              onClick={() => onOpenShareModal(vehicle)}
              className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#181C25] hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 cursor-pointer"
              title="Create Temporary Public Share Link"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

      {/* Quick Specs Subheader with Nearest Intercept ETA */}
      <div className="px-4 py-2 bg-gray-100/60 dark:bg-[#0F1218] border-b border-gray-200 dark:border-gray-800 flex items-center justify-between text-xs font-mono text-gray-600 dark:text-gray-400">
        <div>
          <span className="font-semibold text-gray-900 dark:text-gray-200">
            {vehicle.make} {vehicle.model}
          </span>{' '}
          ({vehicle.color})
        </div>
        <div className="flex items-center gap-2">
          {driverSafetyMetrics && (
            <span
              className={`flex items-center gap-1 text-[11px] font-bold ${driverSafetyMetrics.tierColor}`}
              title={`Driver Safety Score: ${driverSafetyMetrics.score}/100 (Grade ${driverSafetyMetrics.grade} • ${driverSafetyMetrics.tierLabel})`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{driverSafetyMetrics.score}/100</span>
            </span>
          )}
          {nearestCandidate && (
            <span className="hidden sm:flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mr-1">
              <Siren className="w-3 h-3 text-emerald-500 animate-pulse" />
              <span>ETA ~{nearestCandidate.formattedEta}</span>
            </span>
          )}
          <span className="flex items-center gap-1" title="Battery Level">
            <Battery className="w-3.5 h-3.5 text-emerald-500" /> {vehicle.batteryPct}%
          </span>
          <span className="flex items-center gap-1" title="Ignition Status">
            <Zap className={`w-3.5 h-3.5 ${vehicle.ignition ? 'text-amber-500' : 'text-gray-400'}`} />
            {vehicle.ignition ? 'ON' : 'OFF'}
          </span>
        </div>
      </div>

      {/* Dispatch Success Notice Banner */}
      {dispatchSuccessNotice && (
        <div className="mx-3 mt-2 p-2.5 rounded-lg bg-emerald-600 text-white text-xs font-mono font-bold flex items-center justify-between shadow-lg animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-amber-300 shrink-0" />
            <span>{dispatchSuccessNotice}</span>
          </div>
          <button onClick={() => setDispatchSuccessNotice(null)} className="p-0.5 hover:text-emerald-200 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 text-xs font-semibold">
        {(['live', 'history', 'geofences', 'details'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-center capitalize transition-colors border-b-2 cursor-pointer flex items-center justify-center gap-1 ${
              activeTab === tab
                ? 'border-[#B3261E] text-[#B3261E] font-bold dark:border-red-500 dark:text-red-400'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <span>{tab}</span>
            {tab === 'geofences' && vehicleBreachesCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-red-600 text-white font-mono">
                {vehicleBreachesCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-24 lg:pb-4 space-y-4">
        {activeTab === 'live' && (
          <div className="space-y-4 text-xs">
            {/* Last Position Card */}
            <div className="p-3.5 rounded-lg border bg-gray-50 dark:bg-[#13161D] border-gray-200 dark:border-gray-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-red-500" /> Last Known Telemetry
                </span>
                <span className="font-mono text-[10px] text-gray-500">
                  {new Date(vehicle.lastPosition?.ts || '').toLocaleTimeString('en-GB', {
                    timeZone: 'Africa/Kampala',
                  })}{' '}
                  EAT
                </span>
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {vehicle.lastPosition?.address || 'Kampala Metropolitan Route'}
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px] text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-800">
                <div>
                  Lat: <span className="font-bold text-gray-800 dark:text-gray-200">{vehicle.lastPosition?.lat.toFixed(5)}</span>
                </div>
                <div>
                  Lon: <span className="font-bold text-gray-800 dark:text-gray-200">{vehicle.lastPosition?.lon.toFixed(5)}</span>
                </div>
                <div>
                  Speed:{' '}
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {vehicle.lastPosition?.speedKph} km/h
                  </span>
                </div>
                <div>
                  Heading:{' '}
                  <span className="font-bold text-gray-800 dark:text-gray-200">{vehicle.lastPosition?.heading}°</span>
                </div>
              </div>

              {/* Uganda Territorial Jurisdiction Status */}
              <div className="flex items-center justify-between pt-1.5 px-0.5 text-[11px] font-mono border-t border-gray-200 dark:border-gray-800">
                <span className="text-gray-500">Uganda Jurisdiction:</span>
                {isVehicleInUganda(vehicle) ? (
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> In-Bounds (National Grid)
                  </span>
                ) : (
                  <span className="font-semibold text-red-600 dark:text-red-400 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5" /> Outside Uganda Territory
                  </span>
                )}
              </div>

              {/* Active Real-time Tactical Intercept Tracking Card */}
              {activeIntercept && activeIntercept.targetVehicle.id === vehicle.id && (
                <div className="mt-2 p-3 rounded-lg border-2 border-emerald-500/80 bg-linear-to-r from-emerald-950/70 to-blue-950/60 text-white space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <span className="flex h-2.5 w-2.5 relative">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${activeIntercept.status === 'intercepted' ? 'bg-emerald-400' : 'bg-cyan-400'} opacity-75`}></span>
                        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${activeIntercept.status === 'intercepted' ? 'bg-emerald-500' : 'bg-cyan-500'}`}></span>
                      </span>
                      <span className={activeIntercept.status === 'intercepted' ? 'text-emerald-300' : 'text-amber-300'}>
                        {activeIntercept.status === 'intercepted' ? 'INTERCEPT COMPLETED' : 'ACTIVE TACTICAL INTERCEPT'}
                      </span>
                    </div>
                    {activeIntercept.status === 'en_route' && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-900/80 text-blue-300 border border-blue-400/50 animate-pulse">
                        ● AUTO-REFRESH
                      </span>
                    )}
                  </div>

                  <div className="text-xs space-y-1 font-mono">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Assigned Unit:</span>
                      <span className="font-bold text-blue-300">{activeIntercept.patrolVehicle.callsign} ({activeIntercept.patrolVehicle.plate})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Live Recalculated ETA:</span>
                      <span className="font-black text-emerald-400 text-sm">{activeIntercept.candidate.formattedEta}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Distance to Target:</span>
                      <span className="font-bold text-gray-200">{activeIntercept.candidate.distanceKm} km</span>
                    </div>
                  </div>

                  {activeIntercept.reassignedFromCallsign && activeIntercept.status === 'en_route' && (
                    <div className="text-[10px] text-amber-300 bg-amber-950/60 p-1.5 rounded border border-amber-600/40">
                      ⚡ Automatically re-routed to closer patrol unit {activeIntercept.patrolVehicle.callsign} as target moved.
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    {activeIntercept.status === 'en_route' && onCompleteIntercept && (
                      <button
                        onClick={onCompleteIntercept}
                        className="flex-1 py-1.5 px-2 rounded-md bg-emerald-600 hover:bg-emerald-700 font-bold text-xs text-white transition-colors cursor-pointer"
                      >
                        Complete Intercept
                      </button>
                    )}
                    {activeIntercept.status === 'en_route' && onCancelIntercept && (
                      <button
                        onClick={onCancelIntercept}
                        className="flex-1 py-1.5 px-2 rounded-md bg-red-950/80 hover:bg-red-900 border border-red-600/60 font-bold text-xs text-red-200 transition-colors cursor-pointer"
                      >
                        Cancel Intercept
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Dispatch Nearest Intercept Button */}
              <button
                onClick={() => setShowInterceptModal(true)}
                className="w-full mt-2 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                title="Filter registered police patrol vehicles to dispatch the unit with shortest ETA"
              >
                <Siren className="w-4 h-4 text-amber-300 animate-pulse" />
                <span>
                  🚨 Dispatch Nearest Intercept {nearestCandidate ? `(${nearestCandidate.vehicle.callsign} • ETA ~${nearestCandidate.formattedEta})` : 'Unit'}
                </span>
              </button>

              {/* Spoken Locate Voice Dispatch Trigger */}
              <button
                onClick={() => {
                  if (onLocateVehicle) {
                    onLocateVehicle(vehicle);
                  } else {
                    speakVehicleLocation(vehicle);
                  }
                }}
                className="w-full mt-2 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                title="Speak vehicle location aloud and pinpoint on map"
              >
                <Volume2 className="w-4 h-4 animate-pulse" />
                <span>🔊 Locate Vehicle (Spoken Readout)</span>
              </button>

              <button
                onClick={() => setActiveTab('history')}
                className="w-full mt-1.5 py-1.5 px-2.5 rounded bg-white dark:bg-[#181C25] border border-gray-200 dark:border-gray-800 hover:border-blue-400 text-blue-600 dark:text-blue-400 text-[11px] font-semibold flex items-center justify-between transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" />
                  Analyze 24h Speed Telemetry Chart
                </span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Driver Safety Score Card (Speed, Harsh Braking, Curfew telematics audit) */}
            <DriverSafetyScoreCard
              vehicle={vehicle}
              alerts={alerts}
              onTriggerSimulatedAlert={onTriggerSimulatedAlert}
            />

            {/* IoT Tracker Metadata */}
            <div className="p-3 rounded-lg border bg-gray-50 dark:bg-[#13161D] border-gray-200 dark:border-gray-800 space-y-2">
              <div className="font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1">
                <Radio className="w-3.5 h-3.5 text-blue-500" /> GT06 Tracker Hardware
              </div>
              <div className="space-y-1 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-gray-500">IMEI:</span>
                  <span className="font-bold">{vehicle.deviceImei}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Protocol:</span>
                  <span className="font-bold uppercase">GT06 Binary (Port 5023)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Heartbeat Status:</span>
                  <span className="text-emerald-500 font-bold uppercase">{vehicle.deviceStatus}</span>
                </div>
              </div>
            </div>

            {/* Danger Zone: Report Stolen */}
            <div className="pt-3 border-t border-red-200 dark:border-red-950/80">
              {vehicle.status === 'stolen' ? (
                <div className="p-3 rounded-lg bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-900 text-red-800 dark:text-red-200 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
                  <div>
                    <strong>Stolen Case Active:</strong> Monitored across all 4 ANPR roadside checkpoints.
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => onReportStolen(vehicle.plate)}
                  className="w-full py-2.5 px-4 rounded-lg bg-[#B3261E] hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-98"
                >
                  <ShieldAlert className="w-4 h-4" />
                  Report Vehicle Stolen
                </button>
              )}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4 text-xs">
            {/* Forensic Export Banner */}
            <div className="p-2.5 rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/30 flex items-center justify-between">
              <div>
                <span className="font-bold text-blue-900 dark:text-blue-200 block text-xs">
                  Forensic Telemetry Archive
                </span>
                <span className="text-[10px] text-gray-500 font-mono">
                  Download GPS pings, speed, battery & ANPR correlations
                </span>
              </div>
              <button
                onClick={() => setShowExportModal(true)}
                className="px-2.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>

            {/* Playback Controls */}
            <div className="p-3 rounded-lg border bg-gray-50 dark:bg-[#13161D] border-gray-200 dark:border-gray-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-500" /> Route Playback
                </span>
                <span className="font-mono text-xs font-bold text-blue-600">
                  {historyPoints[playbackIndex].time} EAT
                </span>
              </div>

              {/* Slider */}
              <input
                type="range"
                min="0"
                max={historyPoints.length - 1}
                value={playbackIndex}
                onChange={(e) => setPlaybackIndex(Number(e.target.value))}
                className="w-full accent-red-600 cursor-pointer"
              />

              {/* Play / Speed buttons */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="p-1.5 rounded-full bg-red-600 text-white hover:bg-red-700"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setPlaybackIndex(0)}
                    className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                    title="Rewind"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-mono">
                  <span>Speed:</span>
                  {[1, 2, 4].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => setPlaybackSpeed(spd)}
                      className={`px-1.5 py-0.5 rounded border ${
                        playbackSpeed === spd
                          ? 'bg-blue-600 text-white font-bold'
                          : 'border-gray-300 dark:border-gray-700'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 24-Hour Historical Speed Telemetry Chart using Recharts */}
            <HistoricalSpeedChart
              vehicle={vehicle}
              playbackIndex={playbackIndex}
              onSelectTimePoint={(idx) => setPlaybackIndex(idx)}
            />

            {/* Significant Stoppages / Dwell Markers */}
            <div className="space-y-1.5">
              <span className="font-bold text-[11px] uppercase tracking-wider text-gray-600 dark:text-gray-400">
                Dwell Times (&gt; 5 minutes)
              </span>
              {historyPoints
                .filter((p) => p.dwell > 0)
                .map((stop, i) => (
                  <div
                    key={i}
                    className="p-2 rounded border bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-amber-900 dark:text-amber-200">{stop.note}</span>
                      <div className="text-[10px] text-gray-500 font-mono">{stop.time} EAT</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200 font-bold text-[10px]">
                      {stop.dwell} min stop
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {activeTab === 'geofences' && (
          <div className="space-y-5 text-xs">
            {/* Geofence Breach History Component */}
            <GeofenceBreachHistory vehicle={vehicle} alerts={alerts} />

            {/* Active virtual perimeters linked to this vehicle */}
            <div className="space-y-2 pt-3 border-t border-gray-200 dark:border-gray-800">
              <h5 className="font-heading font-bold text-xs uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Active Monitored Perimeters
              </h5>
              <p className="text-[11px] text-gray-500">
                Virtual geofences actively enforced against this vehicle's GT06 stream:
              </p>
              <div className="p-3 rounded-lg border bg-gray-50 dark:bg-[#13161D] border-gray-200 dark:border-gray-800 space-y-1">
                <div className="flex justify-between items-center font-bold">
                  <span>Kampala CBD Security Zone</span>
                  <span className="text-emerald-500 font-mono text-[10px]">ACTIVE / ENFORCED</span>
                </div>
                <p className="text-[11px] text-gray-500">Speed restricted to 40 km/h. Automated speeding alerts.</p>
              </div>

              <div className="p-3 rounded-lg border bg-gray-50 dark:bg-[#13161D] border-gray-200 dark:border-gray-800 space-y-1">
                <div className="flex justify-between items-center font-bold">
                  <span>Industrial Area Night Curfew</span>
                  <span className="text-amber-500 font-mono text-[10px]">NIGHT CURFEW (22:00 - 05:30)</span>
                </div>
                <p className="text-[11px] text-gray-500">Curfew hours movement trigger with immediate police dispatch.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'details' && (
          <div className="space-y-3 text-xs font-mono">
            <div className="p-3 rounded-lg border bg-gray-50 dark:bg-[#13161D] border-gray-200 dark:border-gray-800 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Category:</span>
                <span className="font-bold uppercase text-blue-600 dark:text-blue-400">
                  {vehicle.category || 'private'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Owner Name:</span>
                <span className="font-bold">{vehicle.ownerName}</span>
              </div>
              {vehicle.orgId && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Organization:</span>
                  <span className="font-semibold uppercase">{vehicle.orgId}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Contact:</span>
                <span>{vehicle.ownerPhone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tracker IMEI:</span>
                <span>{vehicle.deviceImei}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Registered:</span>
                <span>{new Date(vehicle.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Vehicle ID:</span>
                <span className="text-[10px]">{vehicle.id}</span>
              </div>
            </div>

            <button
              onClick={() => setShowExportModal(true)}
              className="w-full py-2.5 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#13161D] hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Export Full Forensic Dossier (CSV)</span>
            </button>
          </div>
        )}
      </div>

      {/* Forensic CSV Export Modal */}
      <ForensicExportModal
        vehicle={vehicle}
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        userRole={userRole}
        onAddAuditLog={onAddAuditLog}
      />

      {/* Dispatch Nearest Intercept Modal */}
      {showInterceptModal && (
        <DispatchInterceptModal
          isOpen={showInterceptModal}
          onClose={() => setShowInterceptModal(false)}
          targetVehicle={vehicle}
          allVehicles={allVehicles || []}
          onConfirmDispatch={handleConfirmIntercept}
          onRegisterStation={onRegisterPoliceStation}
          onBatchRegisterStations={onBatchRegisterStations}
        />
      )}
    </div>
    </>
  );
};
