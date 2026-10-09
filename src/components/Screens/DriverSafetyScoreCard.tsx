import React, { useState, useMemo } from 'react';
import { Vehicle, Alert } from '../../types';
import {
  ShieldCheck,
  ShieldAlert,
  Gauge,
  AlertTriangle,
  Moon,
  Clock,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  MapPin,
  Flame,
  Zap,
  Info,
} from 'lucide-react';

interface DriverSafetyScoreCardProps {
  vehicle: Vehicle;
  alerts: Alert[];
  onTriggerSimulatedAlert?: (kind: 'speed' | 'harsh_braking' | 'curfew') => void;
}

export interface SafetyScoreDetails {
  score: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  tierLabel: string;
  tierColor: string;
  tierBg: string;
  tierBorder: string;
  speedViolations: Alert[];
  harshBrakingEvents: Alert[];
  curfewBreaches: Alert[];
  totalViolations: number;
  speedDeduction: number;
  harshBrakingDeduction: number;
  curfewDeduction: number;
  fleetDelta: number;
  coachingRecommendation: string;
}

export function calculateDriverSafetyScore(vehicle: Vehicle, alerts: Alert[]): SafetyScoreDetails {
  // Filter alerts specifically for this vehicle
  const vehicleAlerts = alerts.filter((a) => a.vehicleId === vehicle.id);

  // 1. Speeding violations
  const speedViolations = vehicleAlerts.filter(
    (a) =>
      a.kind === 'speed' ||
      (a.payload?.details && a.payload.details.toLowerCase().includes('speed violation'))
  );

  // 2. Harsh braking events
  const harshBrakingEvents = vehicleAlerts.filter(
    (a) =>
      a.kind === 'harsh_braking' ||
      (a.payload?.details &&
        (a.payload.details.toLowerCase().includes('harsh braking') ||
          a.payload.details.toLowerCase().includes('rapid deceleration') ||
          a.payload.details.toLowerCase().includes('sudden stop')))
  );

  // 3. Curfew breaches
  const curfewBreaches = vehicleAlerts.filter(
    (a) =>
      a.kind === 'curfew' ||
      (a.payload?.details && a.payload.details.toLowerCase().includes('curfew'))
  );

  // Penalty weights:
  // Speeding: 7 points per incident
  // Harsh Braking: 8 points per incident
  // Curfew: 12 points per breach (critical regulatory non-compliance)
  const speedDeduction = speedViolations.length * 7;
  const harshBrakingDeduction = harshBrakingEvents.length * 8;
  const curfewDeduction = curfewBreaches.length * 12;

  const rawScore = 100 - (speedDeduction + harshBrakingDeduction + curfewDeduction);
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  // Grading tiers
  let grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' = 'A';
  let tierLabel = 'Excellent Safety';
  let tierColor = 'text-emerald-500';
  let tierBg = 'bg-emerald-500/10';
  let tierBorder = 'border-emerald-500/30';

  if (score >= 95) {
    grade = 'A+';
    tierLabel = 'Exemplary Compliance';
    tierColor = 'text-emerald-500';
    tierBg = 'bg-emerald-500/10';
    tierBorder = 'border-emerald-500/40';
  } else if (score >= 88) {
    grade = 'A';
    tierLabel = 'Low Risk Operation';
    tierColor = 'text-emerald-500';
    tierBg = 'bg-emerald-500/10';
    tierBorder = 'border-emerald-500/30';
  } else if (score >= 75) {
    grade = 'B';
    tierLabel = 'Good / Moderate Standard';
    tierColor = 'text-blue-500';
    tierBg = 'bg-blue-500/10';
    tierBorder = 'border-blue-500/30';
  } else if (score >= 60) {
    grade = 'C';
    tierLabel = 'Advisory Warning Required';
    tierColor = 'text-amber-500';
    tierBg = 'bg-amber-500/10';
    tierBorder = 'border-amber-500/40';
  } else if (score >= 45) {
    grade = 'D';
    tierLabel = 'High Safety Risk';
    tierColor = 'text-orange-500';
    tierBg = 'bg-orange-500/10';
    tierBorder = 'border-orange-500/40';
  } else {
    grade = 'F';
    tierLabel = 'Critical Non-Compliance';
    tierColor = 'text-red-500';
    tierBg = 'bg-red-500/10';
    tierBorder = 'border-red-500/40';
  }

  // Comparison against Kampala metropolitan fleet benchmark (82 pts)
  const fleetAverage = 82;
  const fleetDelta = score - fleetAverage;

  // Contextual recommendation
  let coachingRecommendation = 'Driver demonstrates consistent adherence to urban limits and safety corridors.';
  if (curfewBreaches.length > 0) {
    coachingRecommendation = `Night curfew breach logged (${curfewBreaches.length}x). Review Kampala 22:00 - 05:30 EAT operational permit authorization.`;
  } else if (speedViolations.length >= 2) {
    coachingRecommendation = `Excessive speed recorded (${speedViolations.length}x). Driver exceeds statutory urban 50 km/h and arterial corridor limits.`;
  } else if (harshBrakingEvents.length >= 2) {
    coachingRecommendation = `Frequent high-G deceleration detected (${harshBrakingEvents.length}x). Check mechanical brake lining and advise driver on stopping distances.`;
  } else if (speedViolations.length === 1) {
    coachingRecommendation = 'Isolated speed warning on record. Monitor corridor telemetry for repeat infractions.';
  } else if (harshBrakingEvents.length === 1) {
    coachingRecommendation = 'Single harsh braking event detected. Likely emergency evasion or junction deceleration.';
  }

  return {
    score,
    grade,
    tierLabel,
    tierColor,
    tierBg,
    tierBorder,
    speedViolations,
    harshBrakingEvents,
    curfewBreaches,
    totalViolations: speedViolations.length + harshBrakingEvents.length + curfewBreaches.length,
    speedDeduction,
    harshBrakingDeduction,
    curfewDeduction,
    fleetDelta,
    coachingRecommendation,
  };
}

export const DriverSafetyScoreCard: React.FC<DriverSafetyScoreCardProps> = ({
  vehicle,
  alerts,
  onTriggerSimulatedAlert,
}) => {
  const [showIncidentLog, setShowIncidentLog] = useState(false);

  const metrics = useMemo(() => {
    return calculateDriverSafetyScore(vehicle, alerts);
  }, [vehicle, alerts]);

  // SVG Radial Gauge Calculations
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (metrics.score / 100) * circumference;

  // Combine and sort all score-impacting incidents chronologically
  const allIncidents = useMemo(() => {
    const list = [
      ...metrics.speedViolations.map((a) => ({ alert: a, type: 'speed' as const, penalty: 7 })),
      ...metrics.harshBrakingEvents.map((a) => ({ alert: a, type: 'harsh_braking' as const, penalty: 8 })),
      ...metrics.curfewBreaches.map((a) => ({ alert: a, type: 'curfew' as const, penalty: 12 })),
    ];
    return list.sort((a, b) => new Date(b.alert.ts).getTime() - new Date(a.alert.ts).getTime());
  }, [metrics]);

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#13161D] shadow-xs overflow-hidden transition-all text-xs">
      {/* Top Header */}
      <div className="p-3.5 border-b border-gray-100 dark:border-gray-800/80 bg-linear-to-r from-gray-50/90 to-gray-100/40 dark:from-[#181C25] dark:to-[#12151D] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${metrics.tierBg} ${metrics.tierBorder} border`}>
            {metrics.score >= 75 ? (
              <ShieldCheck className={`w-4 h-4 ${metrics.tierColor}`} />
            ) : (
              <ShieldAlert className={`w-4 h-4 ${metrics.tierColor}`} />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold uppercase tracking-wider text-gray-900 dark:text-gray-100 font-heading">
                Driver Safety Score
              </span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                GT06 TELEMATICS
              </span>
            </div>
            <div className="text-[10px] text-gray-500 font-mono">
              30-day algorithmic driver profiling
            </div>
          </div>
        </div>

        {/* Grade Badge */}
        <div
          className={`px-2 py-0.5 rounded-md font-mono font-extrabold text-sm border ${metrics.tierBg} ${metrics.tierBorder} ${metrics.tierColor}`}
        >
          {metrics.grade}
        </div>
      </div>

      {/* Main Score & Radial Gauge Body */}
      <div className="p-3.5 space-y-3.5">
        <div className="flex items-center justify-between gap-3">
          {/* Circular Score Dial */}
          <div className="relative flex items-center justify-center shrink-0">
            <svg className="w-24 h-24 transform -rotate-90">
              {/* Background Track */}
              <circle
                cx="48"
                cy="48"
                r={radius}
                stroke="currentColor"
                strokeWidth="7"
                className="text-gray-200 dark:text-gray-800"
                fill="transparent"
              />
              {/* Dynamic Value Arc */}
              <circle
                cx="48"
                cy="48"
                r={radius}
                stroke="currentColor"
                strokeWidth="7"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className={`${metrics.tierColor} transition-all duration-700 ease-out`}
                fill="transparent"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black font-mono leading-none tracking-tight text-gray-900 dark:text-gray-100">
                {metrics.score}
              </span>
              <span className="text-[10px] font-mono text-gray-400 font-semibold leading-tight">
                / 100
              </span>
            </div>
          </div>

          {/* Score Assessment & Delta */}
          <div className="flex-1 space-y-1.5 min-w-0">
            <div>
              <div className="flex items-center gap-1.5">
                <span className={`font-bold font-heading text-sm ${metrics.tierColor}`}>
                  {metrics.tierLabel}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug line-clamp-2">
                {metrics.totalViolations === 0
                  ? 'Zero safety infractions recorded. Pristine compliance.'
                  : `${metrics.totalViolations} safety violation${metrics.totalViolations > 1 ? 's' : ''} deducted ${100 - metrics.score} pts.`}
              </p>
            </div>

            {/* Fleet Comparison Metric */}
            <div className="flex items-center gap-1 text-[11px] font-mono">
              <span className="text-gray-500">Fleet Avg (82):</span>
              <span
                className={`font-bold flex items-center gap-0.5 ${
                  metrics.fleetDelta >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {metrics.fleetDelta >= 0 ? (
                  <>
                    <TrendingUp className="w-3 h-3" /> +{metrics.fleetDelta} pts
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-3 h-3" /> {metrics.fleetDelta} pts
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* 3 Core Metric Breakdown Cards */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {/* Speeding Violations */}
          <div
            className={`p-2 rounded-lg border transition-all ${
              metrics.speedViolations.length > 0
                ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50'
                : 'bg-gray-50 dark:bg-[#181C25] border-gray-200 dark:border-gray-800'
            }`}
          >
            <div className="flex items-center justify-center gap-1 text-gray-500 dark:text-gray-400 mb-0.5">
              <Gauge className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Speeding</span>
            </div>
            <div className="text-base font-black font-mono text-gray-900 dark:text-gray-100">
              {metrics.speedViolations.length}
            </div>
            <div className="text-[10px] font-mono text-amber-700 dark:text-amber-400 font-semibold">
              {metrics.speedDeduction > 0 ? `-${metrics.speedDeduction} pts` : '0 pts'}
            </div>
          </div>

          {/* Harsh Braking Events */}
          <div
            className={`p-2 rounded-lg border transition-all ${
              metrics.harshBrakingEvents.length > 0
                ? 'bg-red-50/70 dark:bg-red-950/20 border-red-200 dark:border-red-900/50'
                : 'bg-gray-50 dark:bg-[#181C25] border-gray-200 dark:border-gray-800'
            }`}
          >
            <div className="flex items-center justify-center gap-1 text-gray-500 dark:text-gray-400 mb-0.5">
              <Flame className="w-3.5 h-3.5 text-red-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Braking</span>
            </div>
            <div className="text-base font-black font-mono text-gray-900 dark:text-gray-100">
              {metrics.harshBrakingEvents.length}
            </div>
            <div className="text-[10px] font-mono text-red-700 dark:text-red-400 font-semibold">
              {metrics.harshBrakingDeduction > 0 ? `-${metrics.harshBrakingDeduction} pts` : '0 pts'}
            </div>
          </div>

          {/* Curfew Breaches */}
          <div
            className={`p-2 rounded-lg border transition-all ${
              metrics.curfewBreaches.length > 0
                ? 'bg-purple-50/70 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900/50'
                : 'bg-gray-50 dark:bg-[#181C25] border-gray-200 dark:border-gray-800'
            }`}
          >
            <div className="flex items-center justify-center gap-1 text-gray-500 dark:text-gray-400 mb-0.5">
              <Moon className="w-3.5 h-3.5 text-purple-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Curfew</span>
            </div>
            <div className="text-base font-black font-mono text-gray-900 dark:text-gray-100">
              {metrics.curfewBreaches.length}
            </div>
            <div className="text-[10px] font-mono text-purple-700 dark:text-purple-400 font-semibold">
              {metrics.curfewDeduction > 0 ? `-${metrics.curfewDeduction} pts` : '0 pts'}
            </div>
          </div>
        </div>

        {/* Actionable Coaching Advisory */}
        <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-[#181C25] border border-gray-200 dark:border-gray-800/80 flex items-start gap-2 text-[11px]">
          <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
          <div className="flex-1 text-gray-700 dark:text-gray-300 leading-relaxed">
            <span className="font-bold text-gray-900 dark:text-gray-100">Driver Advisory: </span>
            {metrics.coachingRecommendation}
          </div>
        </div>

        {/* Collapsible Incident History Drawer */}
        {allIncidents.length > 0 && (
          <div className="space-y-2 pt-1 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={() => setShowIncidentLog(!showIncidentLog)}
              className="w-full flex items-center justify-between py-1 px-1.5 rounded text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-semibold cursor-pointer"
            >
              <span className="flex items-center gap-1.5 text-[11px]">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <span>Audited Breach History ({allIncidents.length} events)</span>
              </span>
              <span className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400">
                <span>{showIncidentLog ? 'Hide details' : 'View events'}</span>
                {showIncidentLog ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </span>
            </button>

            {showIncidentLog && (
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 animate-in fade-in duration-150">
                {allIncidents.map(({ alert, type, penalty }, idx) => (
                  <div
                    key={alert.id || idx}
                    className="p-2 rounded-lg border bg-gray-50/70 dark:bg-[#161922] border-gray-200 dark:border-gray-800 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                            type === 'speed'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : type === 'harsh_braking'
                              ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                              : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                          }`}
                        >
                          {type.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">
                          {new Date(alert.ts).toLocaleTimeString('en-GB', {
                            timeZone: 'Africa/Kampala',
                          })}{' '}
                          EAT
                        </span>
                      </div>
                      <span className="font-mono font-bold text-[10px] text-red-600 dark:text-red-400">
                        -{penalty} pts
                      </span>
                    </div>

                    <div className="text-[11px] text-gray-800 dark:text-gray-200 font-medium">
                      {alert.locationName || alert.payload?.geofenceName || 'Kampala Route'}
                    </div>

                    {alert.payload?.details && (
                      <div className="text-[10px] text-gray-500 font-mono">
                        {alert.payload.details}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quick Testing Trigger Buttons (if callback provided) */}
        {onTriggerSimulatedAlert && (
          <div className="pt-2 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between text-[10px]">
            <span className="text-gray-400 font-mono">Simulate Telemetry:</span>
            <div className="flex gap-1">
              <button
                onClick={() => onTriggerSimulatedAlert('speed')}
                className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 hover:bg-amber-100 hover:text-amber-800 dark:hover:bg-amber-950 dark:hover:text-amber-300 text-gray-600 dark:text-gray-300 font-mono transition-colors cursor-pointer"
                title="Simulate Speeding Incident"
              >
                +Speed
              </button>
              <button
                onClick={() => onTriggerSimulatedAlert('harsh_braking')}
                className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 hover:bg-red-100 hover:text-red-800 dark:hover:bg-red-950 dark:hover:text-red-300 text-gray-600 dark:text-gray-300 font-mono transition-colors cursor-pointer"
                title="Simulate Harsh Braking Deceleration"
              >
                +Brake
              </button>
              <button
                onClick={() => onTriggerSimulatedAlert('curfew')}
                className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 hover:bg-purple-100 hover:text-purple-800 dark:hover:bg-purple-950 dark:hover:text-purple-300 text-gray-600 dark:text-gray-300 font-mono transition-colors cursor-pointer"
                title="Simulate Night Curfew Breach"
              >
                +Curfew
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
