import React, { useState } from 'react';
import { Alert, AlertSeverity, AlertState, AuditEvent } from '../../types';
import { PlateTag } from '../PlateTag';
import { Alerts24hSummaryPanel } from './Alerts24hSummaryPanel';
import {
  AlertTriangle,
  ShieldAlert,
  Camera,
  Radio,
  CheckCircle2,
  XCircle,
  Volume2,
  VolumeX,
  MapPin,
  Clock,
  Filter,
  X,
} from 'lucide-react';

interface AlertsInboxScreenProps {
  alerts: Alert[];
  onAcknowledge: (id: string) => void;
  onCloseAlert: (id: string) => void;
  onSelectAlertVehicle: (vehicleId: string) => void;
  searchQuery?: string;
  onAddAuditLog?: (event: AuditEvent) => void;
}

export const AlertsInboxScreen: React.FC<AlertsInboxScreenProps> = ({
  alerts,
  onAcknowledge,
  onCloseAlert,
  onSelectAlertVehicle,
  searchQuery = '',
  onAddAuditLog,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterState, setFilterState] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'speed' | 'curfew' | 'harsh_braking'>('all');
  const [soundEnabled, setSoundEnabled] = useState(true);

  const filteredAlerts = alerts.filter((alt) => {
    if (filterSeverity !== 'all' && alt.severity !== filterSeverity) return false;
    if (filterState !== 'all' && alt.state !== filterState) return false;
    if (categoryFilter === 'speed' && alt.kind !== 'speed') return false;
    if (categoryFilter === 'curfew' && alt.kind !== 'curfew') return false;
    if (categoryFilter === 'harsh_braking' && alt.kind !== 'harsh_braking') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const match =
        alt.plate.toLowerCase().includes(q) ||
        alt.kind.toLowerCase().includes(q) ||
        (alt.locationName && alt.locationName.toLowerCase().includes(q)) ||
        (alt.payload?.details && alt.payload.details.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 sm:pb-6 bg-gray-50 dark:bg-[#0F1218] text-gray-900 dark:text-gray-100 select-none">
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Header and Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h1 className="text-2xl font-bold font-heading uppercase tracking-wide flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              Real-Time Security &amp; Camera Alerts
            </h1>
            <p className="text-xs text-gray-500 font-mono">
              Direct Redis Stream intake: stream:alerts with consumer group ws-fanout
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-semibold ${
                soundEnabled
                  ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                  : 'text-gray-500 border-gray-300 dark:border-gray-700'
              }`}
              title="Toggle Alert Audio Chime"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span>{soundEnabled ? 'Audio Alerts: ON' : 'Muted'}</span>
            </button>
          </div>
        </div>

        {/* 24-Hour Telematics Summary Panel (Speeding, Curfew, Harsh Braking) */}
        <Alerts24hSummaryPanel
          alerts={alerts}
          selectedCategoryFilter={categoryFilter}
          onSelectCategoryFilter={(cat) => setCategoryFilter(cat)}
          onAddAuditLog={onAddAuditLog}
        />

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-[#181C25] p-3 rounded-lg border border-gray-200 dark:border-gray-800 text-xs">
          <div className="flex items-center gap-1 text-gray-500 font-medium">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>

          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="px-2.5 py-1 rounded border border-gray-300 dark:border-gray-700 bg-transparent text-gray-800 dark:text-gray-200 font-semibold cursor-pointer"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical (Stolen / High Threat)</option>
            <option value="warn">Warnings (Speed / Battery)</option>
            <option value="info">Informational</option>
          </select>

          <select
            value={filterState}
            onChange={(e) => setFilterState(e.target.value)}
            className="px-2.5 py-1 rounded border border-gray-300 dark:border-gray-700 bg-transparent text-gray-800 dark:text-gray-200 font-semibold cursor-pointer"
          >
            <option value="all">All States</option>
            <option value="new">New (Unacknowledged)</option>
            <option value="ack">Acknowledged</option>
            <option value="closed">Closed / Handled</option>
          </select>

          {/* Active 24h category filter pill if set */}
          {categoryFilter !== 'all' && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold font-mono bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
              <span>Category: {categoryFilter.replace('_', ' ').toUpperCase()}</span>
              <button
                onClick={() => setCategoryFilter('all')}
                className="hover:text-red-500 cursor-pointer ml-1"
                title="Clear category filter"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          <span className="ml-auto font-mono text-[11px] text-gray-500">
            Showing {(filteredAlerts || []).length} of {(alerts || []).length} events
          </span>
        </div>

        {/* Alerts List */}
        {(filteredAlerts || []).length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-[#181C25] rounded-xl border border-gray-200 dark:border-gray-800 text-gray-500 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h4 className="font-bold text-base text-gray-800 dark:text-gray-200">No active alerts</h4>
            <p className="text-xs">All vehicle alerts for the selected criteria have been handled.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredAlerts.map((alt) => {
              const isCritical = alt.severity === 'critical';
              return (
                <div
                  key={alt.id}
                  className={`p-4 rounded-xl border transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isCritical
                      ? 'bg-red-50/80 dark:bg-red-950/20 border-red-300 dark:border-red-900/60'
                      : 'bg-white dark:bg-[#181C25] border-gray-200 dark:border-gray-800'
                  }`}
                >
                  {/* Left: Icon & Details */}
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2.5 rounded-lg shrink-0 ${
                        isCritical
                          ? 'bg-red-600 text-white'
                          : alt.severity === 'warn'
                          ? 'bg-amber-500 text-white'
                          : 'bg-blue-600 text-white'
                      }`}
                    >
                      {alt.source === 'camera' ? (
                        <Camera className="w-5 h-5" />
                      ) : alt.source === 'device' ? (
                        <Radio className="w-5 h-5" />
                      ) : (
                        <AlertTriangle className="w-5 h-5" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <PlateTag plate={alt.plate} size="sm" />
                        <span className="font-heading font-bold text-sm tracking-wide uppercase text-gray-900 dark:text-gray-100">
                          {alt.kind.replace(/_/g, ' ')}
                        </span>
                        <span
                          className={`px-2 py-0.2 rounded-full text-[10px] font-mono font-bold uppercase ${
                            alt.state === 'new'
                              ? 'bg-red-200 dark:bg-red-900/80 text-red-900 dark:text-red-200'
                              : alt.state === 'ack'
                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {alt.state}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400 flex-wrap">
                        <span className="flex items-center gap-1 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-red-500" />
                          {alt.locationName || 'Kampala Corridor'}
                        </span>
                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          {new Date(alt.ts).toLocaleTimeString('en-GB', { timeZone: 'Africa/Kampala' })} EAT
                        </span>
                        {alt.payload?.confidence && (
                          <span className="font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            ANPR Conf: {(alt.payload.confidence * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>

                      {alt.payload?.details && (
                        <p className="text-xs text-gray-700 dark:text-gray-300 font-mono mt-0.5">
                          {alt.payload.details}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => onSelectAlertVehicle(alt.vehicleId)}
                      className="px-3 py-1.5 rounded-md text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                      title="Locate vehicle on live map with spoken dispatch"
                    >
                      <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                      <span>Locate</span>
                    </button>
                    {alt.state === 'new' && (
                      <button
                        onClick={() => onAcknowledge(alt.id)}
                        className="px-3 py-1.5 rounded-md text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs"
                      >
                        Acknowledge
                      </button>
                    )}
                    {alt.state !== 'closed' && (
                      <button
                        onClick={() => onCloseAlert(alt.id)}
                        className="px-3 py-1.5 rounded-md text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
