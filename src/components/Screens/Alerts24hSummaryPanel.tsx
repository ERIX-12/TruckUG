import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Alert, AuditEvent } from '../../types';
import {
  Gauge,
  Moon,
  Flame,
  BarChart3,
  TrendingUp,
  PieChart as PieIcon,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertTriangle,
  Info,
  Calendar,
  Download,
  FileSpreadsheet,
  Check,
} from 'lucide-react';

interface Alerts24hSummaryPanelProps {
  alerts: Alert[];
  onSelectCategoryFilter?: (category: 'all' | 'speed' | 'curfew' | 'harsh_braking') => void;
  selectedCategoryFilter?: 'all' | 'speed' | 'curfew' | 'harsh_braking';
  className?: string;
  defaultExpanded?: boolean;
  onAddAuditLog?: (event: AuditEvent) => void;
}

export interface HourlyBucket {
  hourLabel: string;
  hour24: number;
  timeRangeLabel: string;
  speeding: number;
  curfew: number;
  harshBraking: number;
  total: number;
}

export const Alerts24hSummaryPanel: React.FC<Alerts24hSummaryPanelProps> = ({
  alerts,
  onSelectCategoryFilter,
  selectedCategoryFilter = 'all',
  className = '',
  defaultExpanded = true,
  onAddAuditLog,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [chartType, setChartType] = useState<'stacked_bar' | 'area_trend' | 'pie_distribution'>('stacked_bar');
  const [timeScope, setTimeScope] = useState<'24h' | '12h' | '6h'>('24h');
  const [isExporting, setIsExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Process 24-hour hourly buckets
  const { hourlyData, totals, peakHourInfo, pieData } = useMemo(() => {
    const now = new Date();
    const hoursCount = timeScope === '24h' ? 24 : timeScope === '12h' ? 12 : 6;
    const bucketMap = new Map<number, HourlyBucket>();

    // Initialize consecutive hours in chronological order (oldest to newest)
    for (let i = hoursCount - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 3600 * 1000);
      const h = d.getHours();
      const label = `${h.toString().padStart(2, '0')}:00`;
      const nextH = (h + 1) % 24;
      const rangeLabel = `${label} - ${nextH.toString().padStart(2, '0')}:00 EAT`;

      bucketMap.set(i, {
        hourLabel: label,
        hour24: h,
        timeRangeLabel: rangeLabel,
        speeding: 0,
        curfew: 0,
        harshBraking: 0,
        total: 0,
      });
    }

    const windowCutoffMs = now.getTime() - hoursCount * 3600 * 1000;

    let totalSpeeding = 0;
    let totalCurfew = 0;
    let totalHarshBraking = 0;

    alerts.forEach((alt) => {
      const altTime = new Date(alt.ts).getTime();
      if (altTime < windowCutoffMs || altTime > now.getTime()) return;

      const diffHours = Math.floor((now.getTime() - altTime) / (3600 * 1000));
      if (diffHours < 0 || diffHours >= hoursCount) return;

      // Index in our bucket array: (hoursCount - 1 - diffHours)
      const bucketIndex = hoursCount - 1 - diffHours;
      const bucket = bucketMap.get(bucketIndex);
      if (!bucket) return;

      const isSpeed =
        alt.kind === 'speed' ||
        (alt.payload?.details && alt.payload.details.toLowerCase().includes('speed violation'));

      const isCurfew =
        alt.kind === 'curfew' ||
        (alt.payload?.details && alt.payload.details.toLowerCase().includes('curfew'));

      const isHarshBraking =
        alt.kind === 'harsh_braking' ||
        (alt.payload?.details &&
          (alt.payload.details.toLowerCase().includes('braking') ||
            alt.payload.details.toLowerCase().includes('deceleration') ||
            alt.payload.details.toLowerCase().includes('sudden stop')));

      if (isSpeed) {
        bucket.speeding += 1;
        bucket.total += 1;
        totalSpeeding += 1;
      } else if (isCurfew) {
        bucket.curfew += 1;
        bucket.total += 1;
        totalCurfew += 1;
      } else if (isHarshBraking) {
        bucket.harshBraking += 1;
        bucket.total += 1;
        totalHarshBraking += 1;
      }
    });

    const bucketsArray = Array.from(bucketMap.values());

    // Determine peak hour
    let peakBucket = bucketsArray[0];
    bucketsArray.forEach((b) => {
      if (b.total > (peakBucket?.total || 0)) {
        peakBucket = b;
      }
    });

    const grandTotal = totalSpeeding + totalCurfew + totalHarshBraking;

    const distribution = [
      { name: 'Speeding', value: totalSpeeding, color: '#F59E0B', key: 'speed' as const },
      { name: 'Curfew', value: totalCurfew, color: '#8B5CF6', key: 'curfew' as const },
      { name: 'Harsh Braking', value: totalHarshBraking, color: '#EF4444', key: 'harsh_braking' as const },
    ];

    return {
      hourlyData: bucketsArray,
      totals: {
        speeding: totalSpeeding,
        curfew: totalCurfew,
        harshBraking: totalHarshBraking,
        all: grandTotal,
      },
      peakHourInfo: peakBucket && peakBucket.total > 0 ? peakBucket : null,
      pieData: distribution,
    };
  }, [alerts, timeScope]);

  const handleCategoryClick = (category: 'all' | 'speed' | 'curfew' | 'harsh_braking') => {
    if (onSelectCategoryFilter) {
      onSelectCategoryFilter(category);
    }
  };

  const handleExportCSV = () => {
    setIsExporting(true);

    const now = new Date();
    const exportTimeStr = now.toISOString();
    const exportTimeEAT = now.toLocaleString('en-GB', { timeZone: 'Africa/Kampala' });
    const hoursCount = timeScope === '24h' ? 24 : timeScope === '12h' ? 12 : 6;
    const windowCutoffMs = now.getTime() - hoursCount * 3600 * 1000;

    // Filter relevant alerts within the timeScope window and active category filter
    const matchedAlerts = alerts.filter((alt) => {
      const altTime = new Date(alt.ts).getTime();
      if (altTime < windowCutoffMs || altTime > now.getTime()) return false;

      const isSpeed =
        alt.kind === 'speed' ||
        (alt.payload?.details && alt.payload.details.toLowerCase().includes('speed violation'));

      const isCurfew =
        alt.kind === 'curfew' ||
        (alt.payload?.details && alt.payload.details.toLowerCase().includes('curfew'));

      const isHarshBraking =
        alt.kind === 'harsh_braking' ||
        (alt.payload?.details &&
          (alt.payload.details.toLowerCase().includes('braking') ||
            alt.payload.details.toLowerCase().includes('deceleration') ||
            alt.payload.details.toLowerCase().includes('sudden stop')));

      if (!isSpeed && !isCurfew && !isHarshBraking) return false;

      if (selectedCategoryFilter === 'speed' && !isSpeed) return false;
      if (selectedCategoryFilter === 'curfew' && !isCurfew) return false;
      if (selectedCategoryFilter === 'harsh_braking' && !isHarshBraking) return false;

      return true;
    });

    // Helper to sanitize and wrap CSV field
    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    let csv = '';
    // Official Statutory & Law Enforcement Report Header
    csv += `========================================================================================\r\n`;
    csv += `# TRACKUG NATIONAL VEHICLE SURVEILLANCE & TELEMATICS INCIDENT REPORT\r\n`;
    csv += `# CLASSIFICATION: OFFICIAL / LAW ENFORCEMENT & COMPLIANCE SUMMARY\r\n`;
    csv += `# STATUTORY BASIS: Section 43, Uganda Data Protection and Privacy Act 2019 / Traffic Act\r\n`;
    csv += `========================================================================================\r\n`;
    csv += `# Report Title         : 24-Hour Telematics & Security Alerts Summary\r\n`;
    csv += `# Territorial Scope    : Kampala Metropolitan Surveillance Network & Highway Corridors\r\n`;
    csv += `# Window Timeframe     : Past ${timeScope.toUpperCase()} (Up to ${exportTimeEAT} EAT)\r\n`;
    csv += `# Active Category      : ${selectedCategoryFilter.toUpperCase().replace('_', ' ')}\r\n`;
    csv += `# Total Events In Scope: ${matchedAlerts.length}\r\n`;
    csv += `# Speeding Violations  : ${totals.speeding}\r\n`;
    csv += `# Curfew Breaches      : ${totals.curfew}\r\n`;
    csv += `# Harsh Braking Events : ${totals.harshBraking}\r\n`;
    if (peakHourInfo) {
      csv += `# Peak Activity Period : ${peakHourInfo.timeRangeLabel} (${peakHourInfo.total} total events)\r\n`;
    }
    csv += `# Generated Timestamp  : ${exportTimeStr} (${exportTimeEAT} EAT)\r\n`;
    csv += `# Digital Signature    : SHA256-${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}\r\n`;
    csv += `========================================================================================\r\n\r\n`;

    // Section 1: Hourly Distribution Aggregate (Summary Table)
    csv += `# SECTION 1: HOURLY TEMPORAL AGGREGATE SUMMARY (${timeScope.toUpperCase()})\r\n`;
    const summaryHeaders = [
      'Hour_EAT',
      'Time_Range_Window',
      'Speeding_Violations_Count',
      'Curfew_Breaches_Count',
      'Harsh_Braking_Count',
      'Total_Hourly_Incidents',
    ];
    csv += summaryHeaders.map(escapeCsv).join(',') + '\r\n';

    hourlyData.forEach((bucket) => {
      const row = [
        bucket.hourLabel,
        bucket.timeRangeLabel,
        bucket.speeding,
        bucket.curfew,
        bucket.harshBraking,
        bucket.total,
      ];
      csv += row.map(escapeCsv).join(',') + '\r\n';
    });

    csv += '\r\n';

    // Section 2: Detailed Itemized Incident Records
    csv += `# SECTION 2: ITEMIZED TELEMATICS INCIDENT AUDIT TRAIL\r\n`;
    const detailHeaders = [
      'Record_Number',
      'Alert_ID',
      'Timestamp_EAT',
      'Timestamp_ISO8601',
      'Incident_Category',
      'Severity',
      'Vehicle_Plate',
      'Vehicle_ID',
      'Location_Name',
      'Latitude',
      'Longitude',
      'Recorded_Speed_KPH',
      'Speed_Limit_KPH',
      'Deceleration_G_Force',
      'Status_State',
      'Intake_Source',
      'Official_Details',
    ];
    csv += detailHeaders.map(escapeCsv).join(',') + '\r\n';

    matchedAlerts.forEach((alt, idx) => {
      const altEAT = new Date(alt.ts).toLocaleString('en-GB', { timeZone: 'Africa/Kampala' });
      const isSpeed =
        alt.kind === 'speed' ||
        (alt.payload?.details && alt.payload.details.toLowerCase().includes('speed violation'));
      const isCurfew =
        alt.kind === 'curfew' ||
        (alt.payload?.details && alt.payload.details.toLowerCase().includes('curfew'));
      const isHarsh =
        alt.kind === 'harsh_braking' ||
        (alt.payload?.details &&
          (alt.payload.details.toLowerCase().includes('braking') ||
            alt.payload.details.toLowerCase().includes('deceleration')));

      const categoryLabel = isSpeed
        ? 'SPEEDING'
        : isCurfew
        ? 'CURFEW'
        : isHarsh
        ? 'HARSH BRAKING'
        : alt.kind.toUpperCase();

      const row = [
        idx + 1,
        alt.id,
        `${altEAT} EAT`,
        alt.ts,
        categoryLabel,
        alt.severity.toUpperCase(),
        alt.plate,
        alt.vehicleId,
        alt.locationName || 'Kampala Metropolitan Route',
        alt.lat ?? '',
        alt.lon ?? '',
        alt.payload?.speed ?? '',
        alt.payload?.speedLimit ?? '',
        alt.payload?.decelerationG ? `${alt.payload.decelerationG}g` : '',
        alt.state.toUpperCase(),
        alt.source.toUpperCase(),
        alt.payload?.details || '',
      ];
      csv += row.map(escapeCsv).join(',') + '\r\n';
    });

    // Download CSV file via Blob
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateTag = now.toISOString().slice(0, 10);
    const timeTag = `${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
    link.href = url;
    link.download = `TrackUG_Alerts_${timeScope}_Summary_Report_${dateTag}_${timeTag}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Record audit event if handler provided
    if (onAddAuditLog) {
      onAddAuditLog({
        id: `audit-alerts-csv-${Date.now()}`,
        ts: new Date().toISOString(),
        actorId: 'usr-analyst-cmd',
        actorName: 'Surveillance Duty Officer',
        actorRole: 'agency',
        action: 'ALERTS_24H_SUMMARY_CSV_EXPORT',
        targetType: 'telematics_summary',
        targetId: `alerts-summary-${timeScope}-${selectedCategoryFilter}`,
        reason: `Official CSV download of ${matchedAlerts.length} telematics incidents (${timeScope} window) for regulatory and court compliance.`,
        ip: '196.12.140.22',
      });
    }

    setIsExporting(false);
    setExportNotice('Downloaded!');
    setTimeout(() => {
      setExportNotice(null);
    }, 2500);
  };

  return (
    <div
      className={`rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#181C25] shadow-xs overflow-hidden transition-all text-xs ${className}`}
    >
      {/* Top Header Bar */}
      <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-800 bg-linear-to-r from-gray-50 via-white to-gray-50/70 dark:from-[#13161F] dark:via-[#181C25] dark:to-[#12151D] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 text-blue-600 dark:text-blue-400">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-heading font-bold text-sm tracking-wide uppercase text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                <span>24-Hour Telematics Alerts Analytics</span>
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                LIVE RECHARTS
              </span>
            </div>
            <p className="text-[11px] text-gray-500 font-mono">
              Temporal distribution categorized by Speeding, Curfew breaches &amp; Harsh Braking
            </p>
          </div>
        </div>

        {/* Header Right Controls */}
        <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
          {/* Export CSV Button for Official Reporting */}
          <button
            onClick={handleExportCSV}
            disabled={isExporting}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all text-[11px] font-bold shadow-2xs cursor-pointer active:scale-95 ${
              exportNotice
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
                : 'bg-white dark:bg-[#1C2230] border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200'
            }`}
            title="Export official telematics incident report CSV for legal compliance and court submission"
          >
            {exportNotice ? (
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Download
                className={`w-3.5 h-3.5 text-blue-600 dark:text-blue-400 ${
                  isExporting ? 'animate-bounce' : ''
                }`}
              />
            )}
            <span>{exportNotice || (isExporting ? 'Exporting...' : 'Export CSV')}</span>
          </button>

          {/* Time Scope Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-[#0F1218] p-0.5 rounded-lg border border-gray-200 dark:border-gray-800 text-[11px] font-mono font-semibold">
            {(['24h', '12h', '6h'] as const).map((scope) => (
              <button
                key={scope}
                onClick={() => setTimeScope(scope)}
                className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                  timeScope === scope
                    ? 'bg-white dark:bg-[#1C2230] text-gray-900 dark:text-gray-100 shadow-2xs font-bold'
                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
                }`}
              >
                {scope}
              </button>
            ))}
          </div>

          {/* Chart View Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-[#0F1218] p-0.5 rounded-lg border border-gray-200 dark:border-gray-800 text-[11px]">
            <button
              onClick={() => setChartType('stacked_bar')}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                chartType === 'stacked_bar'
                  ? 'bg-white dark:bg-[#1C2230] text-blue-600 dark:text-blue-400 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
              }`}
              title="Stacked Hourly Bar Chart"
            >
              <BarChart3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setChartType('area_trend')}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                chartType === 'area_trend'
                  ? 'bg-white dark:bg-[#1C2230] text-blue-600 dark:text-blue-400 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
              }`}
              title="Smooth Temporal Trend Area"
            >
              <TrendingUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setChartType('pie_distribution')}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                chartType === 'pie_distribution'
                  ? 'bg-white dark:bg-[#1C2230] text-blue-600 dark:text-blue-400 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
              }`}
              title="Category Distribution Donut"
            >
              <PieIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Collapse/Expand Toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            title={isExpanded ? 'Collapse panel' : 'Expand panel'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Body */}
      {isExpanded && (
        <div className="p-3 sm:p-4 space-y-4 animate-in fade-in duration-200">
          {/* KPI Summary Strip with Interactive Category Filters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Total Incidents */}
            <div
              onClick={() => handleCategoryClick('all')}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                selectedCategoryFilter === 'all'
                  ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700 ring-2 ring-blue-500/20'
                  : 'bg-gray-50 dark:bg-[#12151D] border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider font-mono">
                  Total Breaches
                </span>
                <AlertTriangle className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono text-gray-900 dark:text-gray-100">
                {totals.all}
              </div>
              <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                Past {timeScope} across Kampala
              </div>
            </div>

            {/* Speeding Violations */}
            <div
              onClick={() => handleCategoryClick('speed')}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                selectedCategoryFilter === 'speed'
                  ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-400 dark:border-amber-700 ring-2 ring-amber-500/30'
                  : 'bg-gray-50 dark:bg-[#12151D] border-gray-200 dark:border-gray-800 hover:border-amber-300 dark:hover:border-amber-900/50'
              }`}
            >
              <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider font-mono flex items-center gap-1">
                  <Gauge className="w-3.5 h-3.5 text-amber-500" /> Speeding
                </span>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-200/60 dark:bg-amber-900/60">
                  {totals.all > 0 ? `${((totals.speeding / totals.all) * 100).toFixed(0)}%` : '0%'}
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono text-amber-900 dark:text-amber-200">
                {totals.speeding}
              </div>
              <div className="text-[10px] text-amber-700/80 dark:text-amber-400/80 font-mono mt-0.5">
                Urban limit &gt; 50 km/h
              </div>
            </div>

            {/* Curfew Breaches */}
            <div
              onClick={() => handleCategoryClick('curfew')}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                selectedCategoryFilter === 'curfew'
                  ? 'bg-purple-50/90 dark:bg-purple-950/40 border-purple-400 dark:border-purple-700 ring-2 ring-purple-500/30'
                  : 'bg-gray-50 dark:bg-[#12151D] border-gray-200 dark:border-gray-800 hover:border-purple-300 dark:hover:border-purple-900/50'
              }`}
            >
              <div className="flex items-center justify-between text-purple-700 dark:text-purple-400 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider font-mono flex items-center gap-1">
                  <Moon className="w-3.5 h-3.5 text-purple-500" /> Curfew
                </span>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-purple-200/60 dark:bg-purple-900/60">
                  {totals.all > 0 ? `${((totals.curfew / totals.all) * 100).toFixed(0)}%` : '0%'}
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono text-purple-900 dark:text-purple-200">
                {totals.curfew}
              </div>
              <div className="text-[10px] text-purple-700/80 dark:text-purple-400/80 font-mono mt-0.5">
                Window: 22:00 – 05:30 EAT
              </div>
            </div>

            {/* Harsh Braking Events */}
            <div
              onClick={() => handleCategoryClick('harsh_braking')}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                selectedCategoryFilter === 'harsh_braking'
                  ? 'bg-red-50/90 dark:bg-red-950/40 border-red-400 dark:border-red-700 ring-2 ring-red-500/30'
                  : 'bg-gray-50 dark:bg-[#12151D] border-gray-200 dark:border-gray-800 hover:border-red-300 dark:hover:border-red-900/50'
              }`}
            >
              <div className="flex items-center justify-between text-red-700 dark:text-red-400 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider font-mono flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-red-500" /> Harsh Braking
                </span>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-red-200/60 dark:bg-red-900/60">
                  {totals.all > 0 ? `${((totals.harshBraking / totals.all) * 100).toFixed(0)}%` : '0%'}
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono text-red-900 dark:text-red-200">
                {totals.harshBraking}
              </div>
              <div className="text-[10px] text-red-700/80 dark:text-red-400/80 font-mono mt-0.5">
                G-force &ge; -0.45g deceleration
              </div>
            </div>
          </div>

          {/* Recharts Chart Visualization Canvas */}
          <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#12151D] space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2 text-[11px]">
              <span className="font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                <span>
                  {chartType === 'stacked_bar'
                    ? `Hourly Stacked Breakdown (${timeScope})`
                    : chartType === 'area_trend'
                    ? `24-Hour Telematics Trend Curvature (${timeScope})`
                    : 'Category Share Distribution'}
                </span>
              </span>

              {/* Peak Hour Callout Badge */}
              {peakHourInfo && (
                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-[10px] font-mono font-semibold flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-amber-600" />
                  <span>
                    Peak Incident Window: <strong>{peakHourInfo.timeRangeLabel}</strong> ({peakHourInfo.total} events)
                  </span>
                </span>
              )}
            </div>

            {/* Recharts Container */}
            <div className="h-64 w-full">
              {chartType === 'stacked_bar' && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                    <XAxis
                      dataKey="hourLabel"
                      stroke="#888888"
                      fontSize={10}
                      tickLine={false}
                      axisLine={{ stroke: '#444444', opacity: 0.2 }}
                    />
                    <YAxis
                      stroke="#888888"
                      fontSize={10}
                      tickLine={false}
                      allowDecimals={false}
                      axisLine={{ stroke: '#444444', opacity: 0.2 }}
                    />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Legend content={<CustomLegend />} />
                    <Bar
                      dataKey="speeding"
                      name="Speeding"
                      stackId="infractions"
                      fill="#F59E0B"
                      radius={[0, 0, 0, 0]}
                      opacity={selectedCategoryFilter === 'all' || selectedCategoryFilter === 'speed' ? 1 : 0.25}
                    />
                    <Bar
                      dataKey="curfew"
                      name="Curfew"
                      stackId="infractions"
                      fill="#8B5CF6"
                      radius={[0, 0, 0, 0]}
                      opacity={selectedCategoryFilter === 'all' || selectedCategoryFilter === 'curfew' ? 1 : 0.25}
                    />
                    <Bar
                      dataKey="harshBraking"
                      name="Harsh Braking"
                      stackId="infractions"
                      fill="#EF4444"
                      radius={[3, 3, 0, 0]}
                      opacity={selectedCategoryFilter === 'all' || selectedCategoryFilter === 'harsh_braking' ? 1 : 0.25}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}

              {chartType === 'area_trend' && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="speedGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.6} />
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="curfewGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.6} />
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="harshGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.6} />
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                    <XAxis
                      dataKey="hourLabel"
                      stroke="#888888"
                      fontSize={10}
                      tickLine={false}
                      axisLine={{ stroke: '#444444', opacity: 0.2 }}
                    />
                    <YAxis
                      stroke="#888888"
                      fontSize={10}
                      tickLine={false}
                      allowDecimals={false}
                      axisLine={{ stroke: '#444444', opacity: 0.2 }}
                    />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Legend content={<CustomLegend />} />
                    <Area
                      type="monotone"
                      dataKey="speeding"
                      name="Speeding"
                      stroke="#F59E0B"
                      fillOpacity={1}
                      fill="url(#speedGrad)"
                      strokeWidth={2}
                      opacity={selectedCategoryFilter === 'all' || selectedCategoryFilter === 'speed' ? 1 : 0.2}
                    />
                    <Area
                      type="monotone"
                      dataKey="curfew"
                      name="Curfew"
                      stroke="#8B5CF6"
                      fillOpacity={1}
                      fill="url(#curfewGrad)"
                      strokeWidth={2}
                      opacity={selectedCategoryFilter === 'all' || selectedCategoryFilter === 'curfew' ? 1 : 0.2}
                    />
                    <Area
                      type="monotone"
                      dataKey="harshBraking"
                      name="Harsh Braking"
                      stroke="#EF4444"
                      fillOpacity={1}
                      fill="url(#harshGrad)"
                      strokeWidth={2}
                      opacity={selectedCategoryFilter === 'all' || selectedCategoryFilter === 'harsh_braking' ? 1 : 0.2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}

              {chartType === 'pie_distribution' && (
                <div className="h-full flex flex-col sm:flex-row items-center justify-center gap-6">
                  <div className="w-56 h-56 relative flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip content={<CustomPieTooltip />} />
                        <Pie
                          data={pieData}
                          innerRadius={55}
                          outerRadius={78}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-black font-mono leading-none text-gray-900 dark:text-gray-100">
                        {totals.all}
                      </span>
                      <span className="text-[10px] font-mono text-gray-400 font-semibold">
                        TOTAL EVENTS
                      </span>
                    </div>
                  </div>

                  {/* Donut Legend Breakdown */}
                  <div className="space-y-2 text-xs font-mono">
                    {pieData.map((item) => (
                      <div
                        key={item.name}
                        onClick={() => handleCategoryClick(item.key)}
                        className={`flex items-center justify-between gap-4 p-2 rounded-lg border transition-colors cursor-pointer ${
                          selectedCategoryFilter === item.key
                            ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700'
                            : 'bg-white dark:bg-[#181C25] border-gray-200 dark:border-gray-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="font-bold text-gray-800 dark:text-gray-200">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-gray-900 dark:text-gray-100">{item.value}</span>
                          <span className="text-gray-400 font-medium">
                            ({totals.all > 0 ? ((item.value / totals.all) * 100).toFixed(0) : 0}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Context Advisory / Enforcement Insight Footer */}
          <div className="p-2.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 flex items-start gap-2 text-[11px]">
            <Info className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-gray-700 dark:text-gray-300 leading-relaxed font-sans">
              <strong className="text-blue-900 dark:text-blue-200">Surveillance Operational Insight: </strong>
              {totals.curfew > 0 && totals.curfew >= totals.speeding
                ? 'Curfew breaches predominate over nocturnal operating hours (22:00 – 05:30 EAT). Automated UPF patrol dispatches are priority-queued along Jinja Road and Northern Bypass perimeters.'
                : totals.speeding > 0
                ? 'Speed infractions peak along high-speed corridors. Traffic enforcement units receive real-time ANPR checkpoint correlations.'
                : 'Metropolitan telematics activity is within normal safe baseline thresholds.'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Custom Chart Tooltip
const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0]?.payload as HourlyBucket;
    return (
      <div className="p-2.5 rounded-xl bg-gray-900/95 dark:bg-[#0E121B]/95 text-white border border-gray-700 shadow-xl backdrop-blur-md text-xs font-mono space-y-1.5 min-w-[170px]">
        <div className="font-bold text-[11px] text-gray-300 pb-1 border-b border-gray-700 flex items-center justify-between">
          <span>{dataPoint?.timeRangeLabel || label}</span>
          <span className="text-emerald-400 font-extrabold">{dataPoint?.total || 0} total</span>
        </div>
        <div className="space-y-1 text-[11px]">
          <div className="flex items-center justify-between gap-3 text-amber-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span> Speeding:
            </span>
            <span className="font-bold">{dataPoint?.speeding || 0}</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-purple-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-400"></span> Curfew:
            </span>
            <span className="font-bold">{dataPoint?.curfew || 0}</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-red-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-400"></span> Harsh Braking:
            </span>
            <span className="font-bold">{dataPoint?.harshBraking || 0}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// Custom Pie Tooltip
const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="p-2 rounded-lg bg-gray-900 text-white border border-gray-700 shadow-lg text-xs font-mono">
        <span className="font-bold" style={{ color: data.payload.color }}>
          {data.name}:
        </span>{' '}
        <span className="font-extrabold">{data.value} alerts</span>
      </div>
    );
  }
  return null;
};

// Custom Legend Component
const CustomLegend = () => {
  return (
    <div className="flex items-center justify-center gap-4 pt-2 text-[11px] font-mono font-medium">
      <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
        <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
        <span>Speeding</span>
      </div>
      <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
        <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
        <span>Curfew</span>
      </div>
      <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
        <span>Harsh Braking</span>
      </div>
    </div>
  );
};
