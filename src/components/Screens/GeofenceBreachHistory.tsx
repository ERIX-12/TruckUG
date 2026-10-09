import React, { useState } from 'react';
import { Vehicle, Alert } from '../../types';
import {
  ShieldAlert,
  AlertTriangle,
  Clock,
  Gauge,
  MapPin,
  CheckCircle,
  Filter,
  Calendar,
  Activity,
  ChevronDown,
} from 'lucide-react';

interface GeofenceBreachHistoryProps {
  vehicle: Vehicle;
  alerts: Alert[];
}

interface HistoricalBreach {
  id: string;
  ts: string;
  kind: 'speed' | 'curfew' | 'geofence_exit';
  severity: 'critical' | 'warn';
  zoneName: string;
  roadName: string;
  lat: number;
  lon: number;
  speed: number;
  speedLimit?: number;
  curfewHours?: string;
  details: string;
  state: 'new' | 'ack' | 'resolved';
}

export const GeofenceBreachHistory: React.FC<GeofenceBreachHistoryProps> = ({ vehicle, alerts }) => {
  const [filterType, setFilterType] = useState<'all' | 'speed' | 'curfew'>('all');

  // Filter alerts matching this vehicle that represent a breach
  const liveBreaches = alerts
    .filter(
      (a) =>
        a.vehicleId === vehicle.id &&
        (a.kind === 'speed' || a.kind === 'curfew' || a.kind === 'geofence_exit' || a.kind === 'geofence_enter')
    )
    .map((a): HistoricalBreach => {
      const isCurfew = a.kind === 'curfew';
      return {
        id: a.id,
        ts: a.ts,
        kind: isCurfew ? 'curfew' : 'speed',
        severity: a.severity === 'critical' ? 'critical' : 'warn',
        zoneName: a.payload?.geofenceName || 'Kampala Metropolitan Perimeter',
        roadName: a.locationName || 'Kampala Road Network',
        lat: a.lat || vehicle.lastPosition?.lat || 0.314,
        lon: a.lon || vehicle.lastPosition?.lon || 32.582,
        speed: a.payload?.speed || (isCurfew ? 45 : 68),
        speedLimit: a.payload?.speedLimit || 50,
        curfewHours: isCurfew ? '22:00 - 05:30 EAT' : undefined,
        details: a.payload?.details || `${a.kind.toUpperCase()} violation detected by active telemetry rules.`,
        state: a.state === 'new' ? 'new' : a.state === 'ack' ? 'ack' : 'resolved',
      };
    });

  // Default baseline historical breaches for demonstration if no live alerts yet for this vehicle
  const fallbackBreaches: HistoricalBreach[] = [
    {
      id: `hb-${vehicle.id}-1`,
      ts: new Date(Date.now() - 3600000 * 2.5).toISOString(),
      kind: 'speed',
      severity: 'warn',
      zoneName: 'Northern Bypass Corridor',
      roadName: 'Northern Bypass (Busega to Kalerwe)',
      lat: 0.3421,
      lon: 32.5621,
      speed: 71,
      speedLimit: 50,
      details: 'Automated GPS geofence speed trip: 71 km/h in designated 50 km/h commercial transit zone.',
      state: 'ack',
    },
    {
      id: `hb-${vehicle.id}-2`,
      ts: new Date(Date.now() - 3600000 * 18).toISOString(),
      kind: 'curfew',
      severity: 'critical',
      zoneName: 'Industrial Area Night Curfew',
      roadName: '7th Street / Mukwano Access',
      lat: 0.3155,
      lon: 32.598,
      speed: 38,
      curfewHours: '22:00 - 05:30 EAT',
      details: 'Curfew restriction breach: Engine active and vehicle moving during mandatory municipal quiet hours.',
      state: 'resolved',
    },
  ];

  // Merge live and fallback ensuring uniqueness and strict chronological sorting
  const allBreaches: HistoricalBreach[] = [
    ...liveBreaches,
    ...(vehicle.status === 'stolen' || vehicle.id === 'veh-1' || vehicle.id === 'veh-2'
      ? fallbackBreaches.filter((fb) => !liveBreaches.some((lb) => lb.id === fb.id))
      : []),
  ].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

  const filteredBreaches = allBreaches.filter((b) => {
    if (filterType === 'speed') return b.kind === 'speed';
    if (filterType === 'curfew') return b.kind === 'curfew';
    return true;
  });

  const speedViolationsCount = allBreaches.filter((b) => b.kind === 'speed').length;
  const curfewViolationsCount = allBreaches.filter((b) => b.kind === 'curfew').length;
  const maxRecordedSpeed = allBreaches.reduce((max, b) => Math.max(max, b.speed || 0), 0);

  return (
    <div className="space-y-4">
      {/* Header and Filter */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-800">
        <div>
          <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400" />
            Geofence Breach &amp; Curfew History
          </h4>
          <p className="text-[11px] text-gray-500 font-mono">
            Chronological audit of perimeter infractions &amp; excessive speed events
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg text-[10px] font-semibold">
          <button
            onClick={() => setFilterType('all')}
            className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
              filterType === 'all'
                ? 'bg-white dark:bg-[#181C25] text-gray-900 dark:text-gray-100 shadow-2xs'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            All ({allBreaches.length})
          </button>
          <button
            onClick={() => setFilterType('speed')}
            className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
              filterType === 'speed'
                ? 'bg-white dark:bg-[#181C25] text-amber-600 dark:text-amber-400 shadow-2xs font-bold'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            Speed ({speedViolationsCount})
          </button>
          <button
            onClick={() => setFilterType('curfew')}
            className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
              filterType === 'curfew'
                ? 'bg-white dark:bg-[#181C25] text-red-600 dark:text-red-400 shadow-2xs font-bold'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            Curfew ({curfewViolationsCount})
          </button>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-3 gap-2 text-center font-mono">
        <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50">
          <div className="text-[10px] text-red-600 dark:text-red-400 font-semibold uppercase">Total Infractions</div>
          <div className="text-base font-bold text-red-700 dark:text-red-300">{allBreaches.length}</div>
        </div>
        <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
          <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold uppercase">Speed Breaches</div>
          <div className="text-base font-bold text-amber-700 dark:text-amber-300">{speedViolationsCount}</div>
        </div>
        <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50">
          <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold uppercase">Peak Velocity</div>
          <div className="text-base font-bold text-blue-700 dark:text-blue-300">
            {maxRecordedSpeed > 0 ? `${maxRecordedSpeed} km/h` : 'Normal'}
          </div>
        </div>
      </div>

      {/* Chronological Breach Feed */}
      <div className="space-y-2.5">
        {filteredBreaches.length === 0 ? (
          <div className="text-center py-8 p-4 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 text-gray-500 space-y-2">
            <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
            <div className="font-bold text-xs text-gray-800 dark:text-gray-200">Zero Breaches Detected</div>
            <p className="text-[11px] max-w-xs mx-auto leading-relaxed">
              This vehicle is currently fully compliant with municipal speed ordinances and active virtual geofences.
            </p>
          </div>
        ) : (
          filteredBreaches.map((breach) => {
            const dateObj = new Date(breach.ts);
            const timeString = isNaN(dateObj.getTime())
              ? 'Recent'
              : dateObj.toLocaleTimeString('en-GB', {
                  timeZone: 'Africa/Kampala',
                  hour: '2-digit',
                  minute: '2-digit',
                }) + ' EAT';

            const dateString = isNaN(dateObj.getTime())
              ? 'Recent'
              : dateObj.toLocaleDateString('en-GB', {
                  timeZone: 'Africa/Kampala',
                  month: 'short',
                  day: 'numeric',
                });

            return (
              <div
                key={breach.id}
                className={`p-3 rounded-xl border transition-all text-xs space-y-2 ${
                  breach.severity === 'critical'
                    ? 'bg-red-50/80 dark:bg-red-950/25 border-red-200 dark:border-red-900/60'
                    : 'bg-amber-50/80 dark:bg-amber-950/25 border-amber-200 dark:border-amber-900/60'
                }`}
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {breach.kind === 'curfew' ? (
                      <div className="p-1 rounded-md bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300">
                        <Clock className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <div className="p-1 rounded-md bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-300">
                        <Gauge className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <div>
                      <div className="font-bold text-gray-900 dark:text-gray-100">
                        {breach.kind === 'curfew' ? 'Prohibited Night Curfew Breach' : 'Excess Speed Violation'}
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono">
                        Zone: <strong className="text-gray-700 dark:text-gray-300">{breach.zoneName}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-mono text-[10px] shrink-0">
                    <span
                      className={`inline-block px-1.5 py-0.2 rounded-full font-bold uppercase mb-0.5 ${
                        breach.severity === 'critical'
                          ? 'bg-red-600 text-white'
                          : 'bg-amber-500 text-white'
                      }`}
                    >
                      {breach.severity}
                    </span>
                    <div className="text-gray-500">
                      {dateString} • {timeString}
                    </div>
                  </div>
                </div>

                {/* Details Narrative */}
                <p className="text-[11px] text-gray-700 dark:text-gray-300 leading-relaxed font-sans bg-white/60 dark:bg-[#12151D]/60 p-2 rounded-md border border-black/5 dark:border-white/5">
                  {breach.details}
                </p>

                {/* Parameter Details Matrix */}
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-gray-600 dark:text-gray-400 pt-1 border-t border-black/5 dark:border-white/5">
                  <div className="flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                    <span className="truncate">{breach.roadName}</span>
                  </div>

                  {breach.kind === 'speed' && breach.speedLimit && (
                    <div className="flex items-center justify-end gap-1 text-right">
                      <span className="font-bold text-amber-700 dark:text-amber-400">
                        {breach.speed} km/h
                      </span>{' '}
                      / Limit {breach.speedLimit} km/h
                    </div>
                  )}

                  {breach.kind === 'curfew' && breach.curfewHours && (
                    <div className="flex items-center justify-end gap-1 text-right text-red-600 dark:text-red-400 font-bold">
                      Window: {breach.curfewHours}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
