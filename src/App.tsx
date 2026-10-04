/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Vehicle,
  Alert,
  Case,
  PlateSighting,
  Geofence,
  Device,
  Camera,
  AuditEvent,
  Role,
} from './types';
import {
  INITIAL_VEHICLES,
  INITIAL_ALERTS,
  INITIAL_CASES,
  INITIAL_SIGHTINGS,
  INITIAL_GEOFENCES,
  INITIAL_CAMERAS,
  INITIAL_DEVICES,
  INITIAL_AUDIT_LOGS,
} from './data/mockData';
import { loadStoredData, saveStoredData, clearAllStoredData } from './utils/storage';
import { createChainedAuditEvent, ChainedAuditEvent } from './utils/cryptoAudit';
import { isPointInPolygon, isCurfewActive, KAMPALA_CORRIDORS } from './utils/geoRules';
import { filterVehiclesByRole, filterCasesByRole } from './utils/rbac';

import { Navbar } from './components/Navbar';
import { LiveMap } from './components/Map/LiveMap';
import { VehicleDetailDrawer } from './components/Screens/VehicleDetailDrawer';
import { AlertsInboxScreen } from './components/Screens/AlertsInboxScreen';
import { CasesScreen } from './components/Screens/CasesScreen';
import { PlateReviewScreen } from './components/Screens/PlateReviewScreen';
import { GeofencesScreen } from './components/Screens/GeofencesScreen';
import { DevicesCamerasScreen } from './components/Screens/DevicesCamerasScreen';
import { OwnerHomeScreen } from './components/Screens/OwnerHomeScreen';
import { AuditLogScreen } from './components/Screens/AuditLogScreen';
import { SettingsScreen } from './components/Screens/SettingsScreen';
import { VehiclesScreen } from './components/Screens/VehiclesScreen';
import { ConfirmStolenModal } from './components/ConfirmStolenModal';
import { AccessReasonModal } from './components/AccessReasonModal';
import { PublicShareModal } from './components/Screens/PublicShareScreen';
import { PlateTag } from './components/PlateTag';
import { StatusPill } from './components/StatusPill';

export default function App() {
  // Persistent App State
  const [vehicles, setVehicles] = useState<Vehicle[]>(() =>
    loadStoredData('vehicles', INITIAL_VEHICLES)
  );
  const [alerts, setAlerts] = useState<Alert[]>(() =>
    loadStoredData('alerts', INITIAL_ALERTS)
  );
  const [cases, setCases] = useState<Case[]>(() =>
    loadStoredData('cases', INITIAL_CASES)
  );
  const [sightings, setSightings] = useState<PlateSighting[]>(() =>
    loadStoredData('sightings', INITIAL_SIGHTINGS)
  );
  const [geofences, setGeofences] = useState<Geofence[]>(() =>
    loadStoredData('geofences', INITIAL_GEOFENCES)
  );
  const [devices, setDevices] = useState<Device[]>(() =>
    loadStoredData('devices', INITIAL_DEVICES)
  );
  const [cameras, setCameras] = useState<Camera[]>(() =>
    loadStoredData('cameras', INITIAL_CAMERAS)
  );
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>(() =>
    loadStoredData('auditLogs', INITIAL_AUDIT_LOGS)
  );

  // Navigation & Role
  const [currentRole, setCurrentRole] = useState<Role>(() =>
    loadStoredData('currentRole', 'agency' as Role)
  );
  const [activeScreen, setActiveScreen] = useState<string>('map');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDark, setIsDark] = useState<boolean>(() =>
    loadStoredData('isDark', false)
  );

  // Statutory Reason-Gated Access Tracking (Section 43 DPPA 2019)
  const [unlockedPlates, setUnlockedPlates] = useState<Set<string>>(() =>
    new Set(loadStoredData('unlockedPlates', ['UBG 123A', 'UAX 892K']))
  );
  const [accessReasonData, setAccessReasonData] = useState<{ plate: string; caseId: string } | null>(null);
  const [hasAccessPermission, setHasAccessPermission] = useState(false);

  // Modals
  const [stolenConfirmPlate, setStolenConfirmPlate] = useState<string | null>(null);
  const [shareVehicle, setShareVehicle] = useState<Vehicle | null>(null);

  // Corridor progression indices per vehicle
  const corridorPositionsRef = useRef<Record<string, { corridor: string; index: number }>>({
    'veh-1': { corridor: 'jinja_road', index: 1 },
    'veh-2': { corridor: 'northern_bypass', index: 2 },
    'veh-3': { corridor: 'cbd_loop', index: 0 },
    'veh-4': { corridor: 'entebbe_road', index: 1 },
  });

  // State Persistence Effects
  useEffect(() => saveStoredData('vehicles', vehicles), [vehicles]);
  useEffect(() => saveStoredData('alerts', alerts), [alerts]);
  useEffect(() => saveStoredData('cases', cases), [cases]);
  useEffect(() => saveStoredData('sightings', sightings), [sightings]);
  useEffect(() => saveStoredData('geofences', geofences), [geofences]);
  useEffect(() => saveStoredData('devices', devices), [devices]);
  useEffect(() => saveStoredData('cameras', cameras), [cameras]);
  useEffect(() => saveStoredData('auditLogs', auditLogs), [auditLogs]);
  useEffect(() => saveStoredData('currentRole', currentRole), [currentRole]);
  useEffect(() => saveStoredData('isDark', isDark), [isDark]);
  useEffect(() => saveStoredData('unlockedPlates', Array.from(unlockedPlates)), [unlockedPlates]);

  // Audio chime using Web Audio API
  const playAlertChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {
      // Audio autoplay policy fallback
    }
  };

  // Reset to default seed data
  const handleResetData = () => {
    clearAllStoredData();
    setVehicles(INITIAL_VEHICLES);
    setAlerts(INITIAL_ALERTS);
    setCases(INITIAL_CASES);
    setSightings(INITIAL_SIGHTINGS);
    setGeofences(INITIAL_GEOFENCES);
    setDevices(INITIAL_DEVICES);
    setCameras(INITIAL_CAMERAS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setUnlockedPlates(new Set(['UBG 123A', 'UAX 892K']));
    setSelectedVehicle(INITIAL_VEHICLES[0]);
  };

  // Theme toggle effect
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Auto select initial vehicle matching role
  useEffect(() => {
    const roleVehicles = filterVehiclesByRole(vehicles, currentRole);
    if (roleVehicles.length > 0 && (!selectedVehicle || !roleVehicles.some((v) => v.id === selectedVehicle.id))) {
      setSelectedVehicle(roleVehicles[0]);
    }
  }, [currentRole]);

  // Corridor Telemetry & Rule Engine
  useEffect(() => {
    const interval = setInterval(() => {
      setVehicles((prevVehicles) => {
        return prevVehicles.map((veh) => {
          if (!veh.lastPosition || !veh.ignition) return veh;

          // Corridor waypoint movement
          let cData = corridorPositionsRef.current[veh.id];
          if (!cData) {
            cData = { corridor: 'northern_bypass', index: 0 };
            corridorPositionsRef.current[veh.id] = cData;
          }

          const waypoints = KAMPALA_CORRIDORS[cData.corridor] || KAMPALA_CORRIDORS.northern_bypass;
          const nextIndex = (cData.index + 1) % waypoints.length;
          cData.index = nextIndex;
          const targetWaypoint = waypoints[nextIndex];

          const isStolen = veh.status === 'stolen';
          const speed = isStolen ? 72 : targetWaypoint.speedLimit - 5 + Math.round(Math.random() * 8);

          // Geofence & Curfew Rule Evaluation
          geofences.forEach((geo) => {
            if (!geo.active) return;
            const inside = isPointInPolygon([targetWaypoint.lat, targetWaypoint.lon], geo.coordinates);

            if (inside) {
              // 1. Zone Speed Limit Check
              if (geo.params.speedLimit && speed > geo.params.speedLimit) {
                const speedAlertId = `speed-${veh.id}-${Date.now().toString().slice(-4)}`;
                setAlerts((curr) => {
                  if (curr.some((a) => a.vehicleId === veh.id && a.kind === 'speed' && a.state === 'new')) return curr;
                  return [
                    {
                      id: speedAlertId,
                      ts: new Date().toISOString(),
                      kind: 'speed',
                      severity: 'warn',
                      vehicleId: veh.id,
                      plate: veh.plate,
                      source: 'device',
                      lat: targetWaypoint.lat,
                      lon: targetWaypoint.lon,
                      locationName: `${targetWaypoint.roadName} (${geo.name})`,
                      state: 'new',
                      payload: {
                        details: `SPEED VIOLATION: Recorded at ${speed} km/h (statutory limit ${geo.params.speedLimit} km/h).`,
                      },
                    },
                    ...curr,
                  ];
                });
              }

              // 2. Curfew Hours Check
              if (geo.rule === 'curfew' || geo.params.curfewStart) {
                const curfewViolation = isCurfewActive(geo.params.curfewStart, geo.params.curfewEnd);
                if (curfewViolation) {
                  const curfewAlertId = `curfew-${veh.id}-${Date.now().toString().slice(-4)}`;
                  setAlerts((curr) => {
                    if (curr.some((a) => a.vehicleId === veh.id && a.kind === 'curfew' && a.state === 'new')) return curr;
                    return [
                      {
                        id: curfewAlertId,
                        ts: new Date().toISOString(),
                        kind: 'curfew',
                        severity: 'critical',
                        vehicleId: veh.id,
                        plate: veh.plate,
                        source: 'device',
                        lat: targetWaypoint.lat,
                        lon: targetWaypoint.lon,
                        locationName: `${targetWaypoint.roadName} (${geo.name})`,
                        state: 'new',
                        payload: {
                          details: `CURFEW BREACH: Vehicle moving in restricted zone during prohibited hours (${geo.params.curfewStart} - ${geo.params.curfewEnd} EAT).`,
                        },
                      },
                      ...curr,
                    ];
                  });
                }
              }
            }
          });

          return {
            ...veh,
            lastPosition: {
              ...veh.lastPosition,
              lat: targetWaypoint.lat,
              lon: targetWaypoint.lon,
              heading: targetWaypoint.heading,
              speedKph: speed,
              address: targetWaypoint.roadName,
              ts: new Date().toISOString(),
            },
          };
        });
      });
    }, 3800);

    return () => clearInterval(interval);
  }, [geofences]);

  // Reason-gated selection handler
  const handleSelectVehicleWithGate = (veh: Vehicle) => {
    if ((currentRole === 'agency' || currentRole === 'admin') && !unlockedPlates.has(veh.plate)) {
      setAccessReasonData({ plate: veh.plate, caseId: 'POLICE-INTELLIGENCE' });
      return;
    }
    setSelectedVehicle(veh);
  };

  const handleAccessReasonSubmit = async (reason: string) => {
    if (!accessReasonData) return;
    const plate = accessReasonData.plate;

    // Create append-only chained audit event
    const audit = await createChainedAuditEvent(
      {
        actorId: 'usr-officer-44',
        actorName: 'Authorized CID Inspector',
        actorRole: currentRole,
        action: 'VIEW_STOLEN_CASE_LOCATION',
        targetType: 'vehicle_telemetry',
        targetId: plate,
        reason,
      },
      auditLogs as ChainedAuditEvent[]
    );
    setAuditLogs((prev) => [audit, ...prev]);

    setUnlockedPlates((prev) => new Set([...prev, plate]));
    setHasAccessPermission(true);
    setAccessReasonData(null);

    const targetVeh = vehicles.find((v) => v.plate === plate);
    if (targetVeh) setSelectedVehicle(targetVeh);
  };

  const handleReportStolen = (plate: string) => {
    setStolenConfirmPlate(plate);
  };

  const handleConfirmStolen = async () => {
    if (!stolenConfirmPlate) return;
    const plate = stolenConfirmPlate;

    setVehicles((prev) =>
      prev.map((v) => (v.plate === plate ? { ...v, status: 'stolen' } : v))
    );

    const targetVeh = vehicles.find((v) => v.plate === plate);

    const newCase: Case = {
      id: `case-${Date.now().toString().slice(-4)}`,
      vehicleId: targetVeh?.id || 'veh-1',
      plate,
      makeModel: `${targetVeh?.make || 'Vehicle'} ${targetVeh?.model || ''}`,
      ownerName: targetVeh?.ownerName || 'Mugisha Dennis',
      ownerPhone: targetVeh?.ownerPhone || '+256 772 123456',
      reportedBy: `${targetVeh?.ownerName || 'Owner'} (Emergency SOS)`,
      policeRef: `UPF/CPS/KLA/CRB/${Math.floor(1000 + Math.random() * 9000)}/2026`,
      state: 'open',
      openedAt: new Date().toISOString(),
      assignedOfficers: ['Flying Squad Rapid Intercept Team 4'],
    };
    setCases((prev) => [newCase, ...prev]);

    const newAlert: Alert = {
      id: `alt-${Date.now()}`,
      ts: new Date().toISOString(),
      kind: 'stolen_device_moved',
      severity: 'critical',
      vehicleId: targetVeh?.id || 'veh-1',
      plate,
      caseId: newCase.id,
      source: 'device',
      lat: targetVeh?.lastPosition?.lat,
      lon: targetVeh?.lastPosition?.lon,
      locationName: targetVeh?.lastPosition?.address || 'Kampala Metro',
      state: 'new',
      payload: {
        details: 'IMMEDIATE ENFORCEMENT: Owner submitted verified theft affidavit.',
      },
    };
    setAlerts((prev) => [newAlert, ...prev]);

    const audit = await createChainedAuditEvent(
      {
        actorId: 'usr-owner-1',
        actorName: targetVeh?.ownerName || 'Owner Emergency Portal',
        actorRole: currentRole,
        action: 'REPORT_STOLEN',
        targetType: 'vehicle',
        targetId: plate,
        reason: 'Owner confirmed emergency stolen report via digital portal affidavit',
      },
      auditLogs as ChainedAuditEvent[]
    );
    setAuditLogs((prev) => [audit, ...prev]);

    playAlertChime();
    setStolenConfirmPlate(null);
  };

  const handleMarkRecovered = async (caseId: string, vehicleId: string) => {
    setCases((prev) =>
      prev.map((c) =>
        c.id === caseId ? { ...c, state: 'recovered', closedAt: new Date().toISOString() } : c
      )
    );
    setVehicles((prev) =>
      prev.map((v) => (v.id === vehicleId ? { ...v, status: 'recovered' } : v))
    );

    const audit = await createChainedAuditEvent(
      {
        actorId: 'usr-agency-1',
        actorName: 'Agency Commander',
        actorRole: currentRole,
        action: 'MARK_RECOVERED',
        targetType: 'case',
        targetId: caseId,
        reason: 'Vehicle secured by UPF flying squad intercept team and impounded for return',
      },
      auditLogs as ChainedAuditEvent[]
    );
    setAuditLogs((prev) => [audit, ...prev]);
  };

  const handleConfirmOCR = async (id: string, correctedPlate: string) => {
    setSightings((prev) =>
      prev.map((s) => (s.id === id ? { ...s, plateRaw: correctedPlate, reviewState: 'confirmed' } : s))
    );

    const normalizedTarget = correctedPlate.replace(/\s+/g, '').toUpperCase();
    const matchedVeh = vehicles.find(
      (v) => v.plateNorm === normalizedTarget || v.plate.replace(/\s+/g, '') === normalizedTarget
    );

    if (matchedVeh && matchedVeh.status === 'stolen') {
      const cameraMatchAlert: Alert = {
        id: `alt-anpr-${Date.now()}`,
        ts: new Date().toISOString(),
        kind: 'stolen_plate_seen',
        severity: 'critical',
        vehicleId: matchedVeh.id,
        plate: matchedVeh.plate,
        source: 'camera',
        lat: 0.3325,
        lon: 32.5695,
        locationName: 'ANPR Roadside Checkpoint (Mulago / Wandegeya)',
        state: 'new',
        payload: {
          details: `CONFIRMED OPTICAL HIT: Operator verified plate match ${matchedVeh.plate} on stolen vehicle watch list.`,
        },
      };
      setAlerts((prev) => [cameraMatchAlert, ...prev]);
      playAlertChime();

      const audit = await createChainedAuditEvent(
        {
          actorId: 'usr-agency-review-1',
          actorName: 'ANPR Senior Verification Officer',
          actorRole: currentRole,
          action: 'CONFIRM_ANPR_STOLEN_MATCH',
          targetType: 'vehicle_plate',
          targetId: matchedVeh.plate,
          reason: 'Manual optical inspection positively verified plate against active police warrant',
        },
        auditLogs as ChainedAuditEvent[]
      );
      setAuditLogs((prev) => [audit, ...prev]);
    }
  };

  const handleRejectOCR = (id: string) => {
    setSightings((prev) =>
      prev.map((s) => (s.id === id ? { ...s, reviewState: 'rejected' } : s))
    );
  };

  // Scope-Aware filtered vehicles
  const scopedVehicles = filterVehiclesByRole(vehicles, currentRole);
  const visibleMapVehicles = scopedVehicles.filter((v) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      v.plate.toLowerCase().includes(q) ||
      v.plateNorm.toLowerCase().includes(q) ||
      v.make.toLowerCase().includes(q) ||
      v.model.toLowerCase().includes(q) ||
      v.ownerName.toLowerCase().includes(q)
    );
  });

  const scopedCases = filterCasesByRole(cases, currentRole);
  const unreadAlertsCount = alerts.filter((a) => a.state === 'new').length;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-white dark:bg-[#0F1218] text-gray-900 dark:text-gray-100">
      {/* 56px Top Navigation Bar */}
      <Navbar
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        activeScreen={activeScreen}
        onScreenChange={setActiveScreen}
        isDark={isDark}
        onToggleTheme={() => setIsDark(!isDark)}
        alertCount={unreadAlertsCount}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Main Screen Router */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Screen 1: Live Map View */}
        {activeScreen === 'map' && (
          <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden relative">
            {/* Left Vehicles List Panel */}
            <div className="w-full lg:w-[360px] border-r border-gray-200 dark:border-[#2B313D] bg-white dark:bg-[#181C25] flex flex-col shrink-0 z-20 shadow-md">
              <div className="p-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <span className="font-heading font-bold text-xs uppercase tracking-wider text-gray-500">
                  Kampala Trackers ({visibleMapVehicles.length})
                </span>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  ● 100% ONLINE
                </span>
              </div>

              {/* Scrollable Vehicle list */}
              <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800/60">
                {visibleMapVehicles.map((veh) => {
                  const isSelected = selectedVehicle?.id === veh.id;

                  return (
                    <div
                      key={veh.id}
                      onClick={() => handleSelectVehicleWithGate(veh)}
                      className={`p-3 cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-red-50/70 dark:bg-red-950/30 border-l-4 border-[#B3261E]'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <PlateTag plate={veh.plate} size="sm" />
                        <StatusPill status={veh.status} size="sm" />
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-gray-800 dark:text-gray-200">
                          {veh.make} {veh.model}
                        </span>
                        <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                          {veh.lastPosition?.speedKph} km/h
                        </span>
                      </div>

                      <div className="text-[11px] text-gray-500 truncate mt-0.5 font-mono">
                        {veh.lastPosition?.address}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Center: Live MapLibre Map */}
            <div className="flex-1 h-full relative">
              <LiveMap
                vehicles={visibleMapVehicles}
                cameras={cameras}
                geofences={geofences}
                selectedVehicleId={selectedVehicle?.id}
                onSelectVehicle={(veh) => handleSelectVehicleWithGate(veh)}
              />
            </div>

            {/* Right: Vehicle Detail Drawer */}
            {selectedVehicle && (
              <VehicleDetailDrawer
                vehicle={selectedVehicle}
                onClose={() => setSelectedVehicle(null)}
                onReportStolen={handleReportStolen}
                onOpenShareModal={(v) => setShareVehicle(v)}
                userRole={currentRole}
                onAddAuditLog={async (evt) => {
                  const chained = await createChainedAuditEvent(
                    {
                      actorId: evt.actorId,
                      actorName: evt.actorName,
                      actorRole: evt.actorRole,
                      action: evt.action,
                      targetType: evt.targetType,
                      targetId: evt.targetId,
                      reason: evt.reason,
                      ip: evt.ip,
                    },
                    auditLogs as ChainedAuditEvent[]
                  );
                  setAuditLogs((prev) => [chained, ...prev]);
                }}
              />
            )}
          </div>
        )}

        {/* Screen 2: Enrolled Vehicles List */}
        {activeScreen === 'vehicles' && (
          <VehiclesScreen
            vehicles={scopedVehicles}
            searchQuery={searchQuery}
            onSelectVehicle={(v) => {
              handleSelectVehicleWithGate(v);
              setActiveScreen('map');
            }}
            onReportStolen={handleReportStolen}
          />
        )}

        {/* Screen 3: Alerts Inbox */}
        {activeScreen === 'alerts' && (
          <AlertsInboxScreen
            alerts={alerts}
            searchQuery={searchQuery}
            onAcknowledge={(id) => {
              setAlerts((prev) =>
                prev.map((a) => (a.id === id ? { ...a, state: 'ack' } : a))
              );
            }}
            onCloseAlert={(id) => {
              setAlerts((prev) =>
                prev.map((a) => (a.id === id ? { ...a, state: 'closed' } : a))
              );
            }}
            onSelectAlertVehicle={(vehId) => {
              const target = vehicles.find((v) => v.id === vehId);
              if (target) {
                handleSelectVehicleWithGate(target);
                setActiveScreen('map');
              }
            }}
          />
        )}

        {/* Screen 4: Stolen Vehicle Cases & Dossiers */}
        {activeScreen === 'cases' && (
          <CasesScreen
            cases={scopedCases}
            searchQuery={searchQuery}
            onRequestAccess={(plate, caseId) => {
              setAccessReasonData({ plate, caseId });
            }}
            onMarkRecovered={handleMarkRecovered}
            hasAccessPermission={hasAccessPermission}
          />
        )}

        {/* Screen 5: ANPR Low Confidence Plate Review Queue */}
        {activeScreen === 'review' && (
          <PlateReviewScreen
            sightings={sightings}
            onConfirm={handleConfirmOCR}
            onReject={handleRejectOCR}
          />
        )}

        {/* Screen 6: Geofence and Curfew Rules */}
        {activeScreen === 'geofences' && (
          <GeofencesScreen
            geofences={geofences}
            vehicles={scopedVehicles}
            onAddGeofence={(newG) => {
              const created: Geofence = {
                id: `geo-${Date.now()}`,
                name: newG.name || 'Custom Zone',
                ownerUserId: 'usr-admin-1',
                rule: newG.rule || 'speed',
                params: newG.params || {},
                coordinates: newG.coordinates || [],
                active: true,
                vehicleCount: vehicles.length,
              };
              setGeofences((prev) => [created, ...prev]);
            }}
            onToggleActive={(id) => {
              setGeofences((prev) =>
                prev.map((g) => (g.id === id ? { ...g, active: !g.active } : g))
              );
            }}
          />
        )}

        {/* Screen 7: Devices & Camera Nodes Hardware */}
        {activeScreen === 'devices' && (
          <DevicesCamerasScreen
            devices={devices}
            cameras={cameras}
            onRegisterDevice={(dev) => {
              const created: Device = {
                id: `dev-${Date.now()}`,
                imei: dev.imei || '864201048291099',
                protocol: dev.protocol || 'gt06',
                secretHash: 'sha256:generated...',
                lastSeenAt: new Date().toISOString(),
                batteryPct: 100,
                status: 'online',
              };
              setDevices((prev) => [created, ...prev]);
            }}
            onRegisterCamera={(cam) => {
              const created: Camera = {
                id: `cam-${Date.now()}`,
                name: cam.name || 'New ANPR Junction',
                lat: cam.lat || 0.315,
                lon: cam.lon || 32.585,
                secretHash: 'sha256:camera...',
                lastSeenAt: new Date().toISOString(),
                status: 'active',
                todayReadsCount: 0,
              };
              setCameras((prev) => [created, ...prev]);
            }}
          />
        )}

        {/* Screen 8: Owner Mobile View */}
        {activeScreen === 'owner' && (
          <OwnerHomeScreen
            vehicles={vehicles}
            onReportStolen={handleReportStolen}
            onOpenShareModal={(v) => setShareVehicle(v)}
            onSelectVehicle={(v) => {
              setSelectedVehicle(v);
              setActiveScreen('map');
            }}
          />
        )}

        {/* Screen 9: Immutable Audit Log */}
        {activeScreen === 'audit' && (
          <AuditLogScreen logs={auditLogs} searchQuery={searchQuery} />
        )}

        {/* Screen 10: Settings */}
        {activeScreen === 'settings' && (
          <SettingsScreen
            isDark={isDark}
            onToggleTheme={() => setIsDark(!isDark)}
            onResetData={handleResetData}
          />
        )}
      </div>

      {/* Report Stolen Modal with mandatory plate confirmation */}
      <ConfirmStolenModal
        plate={stolenConfirmPlate || ''}
        isOpen={!!stolenConfirmPlate}
        onClose={() => setStolenConfirmPlate(null)}
        onConfirm={handleConfirmStolen}
      />

      {/* Access Reason Modal (Data Protection Act 2019 X-Access-Reason) */}
      <AccessReasonModal
        plate={accessReasonData?.plate || ''}
        isOpen={!!accessReasonData}
        onClose={() => setAccessReasonData(null)}
        onSubmit={handleAccessReasonSubmit}
      />

      {/* Expiring Public Share Link Modal */}
      <PublicShareModal
        vehicle={shareVehicle}
        isOpen={!!shareVehicle}
        onClose={() => setShareVehicle(null)}
      />
    </div>
  );
}

