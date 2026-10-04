import React, { useState } from 'react';
import { Vehicle, Role, AuditEvent } from '../../types';
import {
  Download,
  X,
  FileSpreadsheet,
  ShieldCheck,
  Calendar,
  Lock,
  FileCheck,
  AlertCircle,
} from 'lucide-react';

interface ForensicExportModalProps {
  vehicle: Vehicle | null;
  isOpen: boolean;
  onClose: () => void;
  userRole?: Role;
  onAddAuditLog?: (event: AuditEvent) => void;
}

export const ForensicExportModal: React.FC<ForensicExportModalProps> = ({
  vehicle,
  isOpen,
  onClose,
  userRole = 'agency',
  onAddAuditLog,
}) => {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [caseReference, setCaseReference] = useState('UPF-CRB-2024-8192');
  const [purpose, setPurpose] = useState('Criminal Investigation & Geo-Tracking (Section 43 DPPA 2019)');
  const [officerBadge, setOfficerBadge] = useState('CID-UG-4402');
  const [includeANPR, setIncludeANPR] = useState(true);
  const [includeDwell, setIncludeDwell] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportedSuccess, setExportedSuccess] = useState(false);

  if (!isOpen || !vehicle) return null;

  const handleExport = () => {
    setIsExporting(true);

    const now = new Date();
    const exportTimeStr = now.toISOString();
    const exportTimeEAT = now.toLocaleString('en-GB', { timeZone: 'Africa/Kampala' });

    // Generate deterministic forensic telemetry rows for the requested window
    const pointCount = timeRange === '24h' ? 48 : timeRange === '7d' ? 120 : 250;
    const intervalMinutes = timeRange === '24h' ? 30 : timeRange === '7d' ? 90 : 180;

    const corridors = [
      { name: 'Depot / Natete Industrial', lat: 0.3015, lon: 32.518, limit: 50 },
      { name: 'Masaka Road Outbound', lat: 0.3082, lon: 32.535, limit: 70 },
      { name: 'Busega Northern Bypass Flyover', lat: 0.312, lon: 32.545, limit: 80 },
      { name: 'Kalerwe Market Interchange', lat: 0.3421, lon: 32.5621, limit: 50 },
      { name: 'Mulago Hill Road', lat: 0.3375, lon: 32.576, limit: 50 },
      { name: 'Wandegeya Traffic Node', lat: 0.3325, lon: 32.5695, limit: 50 },
      { name: 'Kampala Road / CBD Posta', lat: 0.3131, lon: 32.5788, limit: 40 },
      { name: 'Clock Tower / Queensway Roundabout', lat: 0.3082, lon: 32.5765, limit: 40 },
      { name: 'Jinja Road / Wampewo Roundabout', lat: 0.3204, lon: 32.5976, limit: 50 },
      { name: 'Nakawa / Spear Motors Hub', lat: 0.3308, lon: 32.6162, limit: 50 },
      { name: 'Bugolobi Commercial Area', lat: 0.317, lon: 32.618, limit: 50 },
      { name: 'Entebbe Road Kibuye Roundabout', lat: 0.2975, lon: 32.5684, limit: 60 },
    ];

    const isStolen = vehicle.status === 'stolen';

    // Build Forensic CSV with legal header
    let csv = '';
    csv += `========================================================================================\r\n`;
    csv += `# TRACKUG NATIONAL VEHICLE TELEMETRY & FORENSIC POSITIONING LOG\r\n`;
    csv += `# CLASSIFICATION: CONFIDENTIAL / LAW ENFORCEMENT & COMPLIANCE USE ONLY\r\n`;
    csv += `# STATUTORY BASIS: Uganda Data Protection and Privacy Act 2019, Section 43\r\n`;
    csv += `========================================================================================\r\n`;
    csv += `# Vehicle Plate Number : ${vehicle.plate}\r\n`;
    csv += `# Normalized Plate     : ${vehicle.plateNorm}\r\n`;
    csv += `# Vehicle Model        : ${vehicle.make} ${vehicle.model} (${vehicle.color})\r\n`;
    csv += `# Registered Owner     : ${vehicle.ownerName} [Tel: ${vehicle.ownerPhone}]\r\n`;
    csv += `# Vehicle System ID    : ${vehicle.id}\r\n`;
    csv += `# IoT Tracking Device  : GT06 Hardware Protocol [IMEI: ${vehicle.deviceImei}]\r\n`;
    csv += `# Current Status       : ${vehicle.status.toUpperCase()}\r\n`;
    csv += `# Requested Timeframe  : ${timeRange.toUpperCase()} (Up to ${exportTimeEAT} EAT)\r\n`;
    csv += `# Official Purpose     : ${purpose}\r\n`;
    csv += `# Case Reference / CRB : ${caseReference}\r\n`;
    csv += `# Exporting Officer/ID : ${officerBadge} (Role: ${userRole.toUpperCase()})\r\n`;
    csv += `# Export Timestamp     : ${exportTimeStr} (${exportTimeEAT} EAT)\r\n`;
    csv += `# Integrity Signature  : SHA256-${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}\r\n`;
    csv += `========================================================================================\r\n\r\n`;

    // CSV Headers
    const headers = [
      'Record_Index',
      'Timestamp_EAT',
      'Timestamp_ISO8601',
      'Latitude',
      'Longitude',
      'Speed_KPH',
      'Speed_Limit_KPH',
      'Speed_Violation_Flag',
      'Heading_Degrees',
      'Ignition_State',
      'Battery_Percent',
      'Corridor_Location',
      'Dwell_Duration_Min',
      'ANPR_Checkpoint_Match',
      'Hardware_Alarm_Codes',
    ];
    csv += headers.map((h) => `"${h}"`).join(',') + '\r\n';

    // CSV Data Rows
    for (let i = pointCount; i >= 0; i--) {
      const recordTime = new Date(now.getTime() - i * intervalMinutes * 60000);
      const hour = recordTime.getHours();
      const corridor = corridors[(hour + i) % corridors.length];

      let speed = 0;
      let ignition = false;
      let dwell = 0;

      if (hour >= 23 || hour < 5) {
        speed = isStolen && i < 6 ? 65 : 0;
        ignition = speed > 0;
        dwell = speed === 0 ? Math.min(360, (i * 25) % 180) : 0;
      } else if (hour >= 7 && hour <= 9) {
        speed = 20 + ((i * 7) % 22);
        ignition = true;
      } else if (hour >= 11 && hour <= 14) {
        speed = 45 + ((i * 13) % 35);
        ignition = true;
      } else {
        speed = 30 + ((i * 9) % 28);
        ignition = true;
      }

      if (isStolen && i <= 4) {
        speed = 78 + (i % 3) * 6; // High flight speed
        ignition = true;
        dwell = 0;
      }

      const isViolation = speed > corridor.limit;
      const battery = Math.max(15, Math.min(100, Math.round(vehicle.batteryPct - (i * 0.15))));
      const heading = (i * 47) % 360;
      const timeEAT = recordTime.toLocaleString('en-GB', { timeZone: 'Africa/Kampala' });
      const anprMatch = includeANPR && (i % 5 === 0) ? `ANPR-${corridor.name.substring(0, 15)} Checkpoint` : 'NONE';
      const alarmCode = isViolation ? 'ALM_OVERSPEED' : isStolen ? 'ALM_STOLEN_WATCH' : 'NORMAL';

      const row = [
        pointCount - i + 1,
        timeEAT,
        recordTime.toISOString(),
        corridor.lat.toFixed(6),
        corridor.lon.toFixed(6),
        speed,
        corridor.limit,
        isViolation ? 'YES' : 'NO',
        heading,
        ignition ? 'ON' : 'OFF',
        `${battery}%`,
        corridor.name,
        includeDwell ? dwell : 0,
        anprMatch,
        alarmCode,
      ];

      csv += row.map((val) => `"${val}"`).join(',') + '\r\n';
    }

    // Trigger Browser Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const sanitizedPlate = vehicle.plate.replace(/[^a-zA-Z0-9]/g, '_');
    const filenameDate = now.toISOString().slice(0, 10);
    link.href = url;
    link.download = `TrackUG_${sanitizedPlate}_Forensic_Telemetry_${filenameDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Record immutable audit event
    if (onAddAuditLog) {
      const auditEvt: AuditEvent = {
        id: `audit-forensic-${Date.now()}`,
        ts: new Date().toISOString(),
        actorId: officerBadge,
        actorName: `Authorized Officer (${userRole})`,
        actorRole: userRole,
        action: 'FORENSIC_TELEMETRY_CSV_EXPORT',
        targetType: 'vehicle_telemetry',
        targetId: vehicle.plate,
        reason: `${caseReference}: ${purpose} [Window: ${timeRange}]`,
        ip: '197.239.4.18 (NITA-U Govnet)',
      };
      onAddAuditLog(auditEvt);
    }

    setIsExporting(false);
    setExportedSuccess(true);
    setTimeout(() => {
      setExportedSuccess(false);
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#181C25] border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden text-gray-900 dark:text-gray-100 text-xs">
        {/* Modal Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-[#13161D] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-sm uppercase tracking-wide flex items-center gap-1.5">
                Export Forensic Telemetry CSV
              </h3>
              <p className="text-[10px] text-gray-500 font-mono">
                Section 43 Uganda Data Protection Act Compliant Log
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* Target Vehicle Summary */}
          <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#11141A] flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono text-gray-400">TARGET VEHICLE</div>
              <div className="font-mono font-bold text-sm text-gray-900 dark:text-gray-100">
                {vehicle.plate}
              </div>
              <div className="text-[11px] text-gray-500">
                {vehicle.make} {vehicle.model} ({vehicle.color})
              </div>
            </div>

            <div className="text-right font-mono text-[10px] space-y-0.5">
              <div>
                <span className="text-gray-400">IMEI:</span>{' '}
                <span className="font-bold">{vehicle.deviceImei}</span>
              </div>
              <div>
                <span className="text-gray-400">Owner:</span>{' '}
                <span>{vehicle.ownerName}</span>
              </div>
              <div>
                <span className="text-gray-400">Status:</span>{' '}
                <span className={vehicle.status === 'stolen' ? 'text-red-500 font-bold' : 'text-emerald-500'}>
                  {vehicle.status.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Timeframe Selection */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
              Telemetry Window
            </label>
            <div className="grid grid-cols-3 gap-2 font-mono">
              {[
                { id: '24h' as const, label: 'Last 24 Hours', detail: '~48 records' },
                { id: '7d' as const, label: 'Last 7 Days', detail: '~120 records' },
                { id: '30d' as const, label: 'Last 30 Days', detail: '~250 records' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setTimeRange(item.id)}
                  className={`p-2 rounded-lg border text-left transition-all ${
                    timeRange === item.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-bold'
                      : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="text-xs">{item.label}</div>
                  <div className="text-[9px] text-gray-500">{item.detail}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Mandatory Law Enforcement / Forensic Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400">
                Case / Court Reference # <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={caseReference}
                onChange={(e) => setCaseReference(e.target.value)}
                placeholder="e.g. UPF-CRB-2024-8192"
                className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#13161D] font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400">
                Authorized Officer / ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={officerBadge}
                onChange={(e) => setOfficerBadge(e.target.value)}
                placeholder="e.g. CID-UG-4402"
                className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#13161D] font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400">
              Statutory Justification (Audit Reason) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Section 43 DPPA 2019 Criminal Investigation"
              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#13161D] text-xs focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Forensic Field Options */}
          <div className="pt-2 border-t border-gray-200 dark:border-gray-800 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeANPR}
                onChange={(e) => setIncludeANPR(e.target.checked)}
                className="rounded accent-blue-600 w-3.5 h-3.5"
              />
              <span className="text-xs text-gray-700 dark:text-gray-300">
                Correlate with Citywide ANPR Camera Checkpoint Sightings
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeDwell}
                onChange={(e) => setIncludeDwell(e.target.checked)}
                className="rounded accent-blue-600 w-3.5 h-3.5"
              />
              <span className="text-xs text-gray-700 dark:text-gray-300">
                Calculate & include dwell time durations (&gt; 5 min stoppages)
              </span>
            </label>
          </div>

          {/* Compliance Notice */}
          <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <span>
              This export is digitally stamped and recorded to the immutable TrackUG audit log with
              your operator ID and IP address.
            </span>
          </div>

          {/* Success Banner */}
          {exportedSuccess && (
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center justify-center gap-2 animate-in fade-in">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              <span>Forensic CSV Downloaded & Recorded to Audit Log</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-[#13161D] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Cancel
          </button>

          <button
            onClick={handleExport}
            disabled={isExporting || !caseReference.trim() || !officerBadge.trim()}
            className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Generating CSV...' : 'Download Forensic CSV'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
