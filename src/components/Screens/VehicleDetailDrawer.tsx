import React, { useState, useEffect } from 'react';
import { Vehicle, Role, AuditEvent } from '../../types';
import { PlateTag } from '../PlateTag';
import { StatusPill } from '../StatusPill';
import { HistoricalSpeedChart } from './HistoricalSpeedChart';
import { ForensicExportModal } from '../Modals/ForensicExportModal';
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
  Calendar,
  AlertTriangle,
  Activity,
  Layers,
  ChevronRight,
  Share2,
  Download,
  FileSpreadsheet,
} from 'lucide-react';

interface VehicleDetailDrawerProps {
  vehicle: Vehicle | null;
  onClose: () => void;
  onReportStolen: (plate: string) => void;
  onOpenShareModal: (vehicle: Vehicle) => void;
  userRole?: Role;
  onAddAuditLog?: (event: AuditEvent) => void;
}

export const VehicleDetailDrawer: React.FC<VehicleDetailDrawerProps> = ({
  vehicle,
  onClose,
  onReportStolen,
  onOpenShareModal,
  userRole = 'agency',
  onAddAuditLog,
}) => {
  const [activeTab, setActiveTab] = useState<'live' | 'history' | 'geofences' | 'details'>('live');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [showExportModal, setShowExportModal] = useState(false);

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

  return (
    <div className="w-full lg:w-[420px] bg-white dark:bg-[#181C25] border-l border-gray-200 dark:border-[#2B313D] flex flex-col h-full shadow-2xl z-30 select-none overflow-hidden text-gray-900 dark:text-gray-100">
      {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-[#2B313D] flex items-center justify-between bg-gray-50/70 dark:bg-[#13161D]">
        <div className="flex items-center gap-2">
          <PlateTag plate={vehicle.plate} size="lg" />
          <StatusPill status={vehicle.status} />
          {vehicle.category && (
            <span
              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                vehicle.category === 'commercial'
                  ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                  : vehicle.category === 'public'
                  ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                  : 'bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
              }`}
            >
              {vehicle.category}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white dark:bg-[#181C25] border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 text-[11px] font-semibold transition-colors shadow-2xs cursor-pointer"
            title="Export Forensic Telemetry & Positioning CSV Log"
          >
            <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
          <button
            onClick={() => onOpenShareModal(vehicle)}
            className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
            title="Create Temporary Public Share Link"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Quick Specs Subheader */}
      <div className="px-4 py-2 bg-gray-100/60 dark:bg-[#0F1218] border-b border-gray-200 dark:border-gray-800 flex items-center justify-between text-xs font-mono text-gray-600 dark:text-gray-400">
        <div>
          <span className="font-semibold text-gray-900 dark:text-gray-200">
            {vehicle.make} {vehicle.model}
          </span>{' '}
          ({vehicle.color})
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1" title="Battery Level">
            <Battery className="w-3.5 h-3.5 text-emerald-500" /> {vehicle.batteryPct}%
          </span>
          <span className="flex items-center gap-1" title="Ignition Status">
            <Zap className={`w-3.5 h-3.5 ${vehicle.ignition ? 'text-amber-500' : 'text-gray-400'}`} />
            {vehicle.ignition ? 'ON' : 'OFF'}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 text-xs font-semibold">
        {(['live', 'history', 'geofences', 'details'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-center capitalize transition-colors border-b-2 ${
              activeTab === tab
                ? 'border-[#B3261E] text-[#B3261E] font-bold dark:border-red-500 dark:text-red-400'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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

              <button
                onClick={() => setActiveTab('history')}
                className="w-full mt-2 py-1.5 px-2.5 rounded bg-white dark:bg-[#181C25] border border-gray-200 dark:border-gray-800 hover:border-blue-400 text-blue-600 dark:text-blue-400 text-[11px] font-semibold flex items-center justify-between transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" />
                  Analyze 24h Speed Telemetry Chart
                </span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

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
          <div className="space-y-3 text-xs">
            <p className="text-gray-600 dark:text-gray-400">
              Active virtual perimeters linked to this vehicle:
            </p>
            <div className="p-3 rounded-lg border bg-gray-50 dark:bg-[#13161D] border-gray-200 dark:border-gray-800 space-y-1">
              <div className="flex justify-between items-center font-bold">
                <span>Kampala CBD Security Zone</span>
                <span className="text-emerald-500 font-mono text-[10px]">INSIDE</span>
              </div>
              <p className="text-[11px] text-gray-500">Speed restricted to 40 km/h. Automated speeding alerts.</p>
            </div>

            <div className="p-3 rounded-lg border bg-gray-50 dark:bg-[#13161D] border-gray-200 dark:border-gray-800 space-y-1">
              <div className="flex justify-between items-center font-bold">
                <span>Industrial Area Night Curfew</span>
                <span className="text-gray-400 font-mono text-[10px]">OUTSIDE</span>
              </div>
              <p className="text-[11px] text-gray-500">Curfew: 22:00 to 05:30 EAT. Movement trigger.</p>
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
    </div>
  );
};
