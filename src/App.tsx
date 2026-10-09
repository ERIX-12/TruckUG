/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  VehicleCategory,
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
import { UGANDA_DISTRICTS } from './data/districts';
import { loadStoredData, saveStoredData, clearAllStoredData } from './utils/storage';
import { createChainedAuditEvent, ChainedAuditEvent } from './utils/cryptoAudit';
import { isPointInPolygon, isCurfewActive, UGANDA_CORRIDORS, getDistrictFromCorridor, isVehicleInUganda, isWithinUganda } from './utils/geoRules';
import { filterVehiclesByRole, filterCasesByRole } from './utils/rbac';

import { Navbar } from './components/Navbar';
import { LiveMap } from './components/Map/LiveMap';
import { VehicleList } from './components/VehicleList';
import { VehicleDetailDrawer } from './components/Screens/VehicleDetailDrawer';
import { TelemetryComparisonDashboard } from './components/Screens/TelemetryComparisonDashboard';
import { AlertsInboxScreen } from './components/Screens/AlertsInboxScreen';
import { playAlertSound } from './utils/audio';
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
import { RegisterVehicleModal } from './components/Modals/RegisterVehicleModal';
import { RegisterPoliceStationModal } from './components/Modals/RegisterPoliceStationModal';
import { MOCK_POLICE_STATIONS } from './data/mockPoliceStations';
import { VoiceCommandModal } from './components/Modals/VoiceCommandModal';
import { VoiceAnnouncementBanner } from './components/VoiceAnnouncementBanner';
import { Alerts24hSummaryPanel } from './components/Screens/Alerts24hSummaryPanel';
import { speakVehicleLocation } from './utils/voiceNavigator';
import {
  ActiveInterceptState,
  InterceptCandidate,
  recalculateOptimalIntercept,
  speakInterceptCompleted,
  speakInterceptReassigned,
} from './utils/interceptNavigator';
import { PlateTag } from './components/PlateTag';
import { StatusPill } from './components/StatusPill';
import { Plus, MapPin, Car, X, BarChart3 } from 'lucide-react';

export default function App() {
  // Persistent App State with guaranteed UPF patrol & station units
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    const loaded = loadStoredData<Vehicle[]>('vehicles', INITIAL_VEHICLES);
    const hasPolice = loaded.some(
      (v) => v.category === 'police' || v.isPatrol || v.plate.startsWith('UP ')
    );
    if (!hasPolice) {
      const policeUnits = INITIAL_VEHICLES.filter(
        (v) => v.category === 'police' || v.isPatrol || v.plate.startsWith('UP ')
      );
      const merged = [...loaded, ...policeUnits];
      saveStoredData('vehicles', merged);
      return merged;
    }
    // Also verify all metropolitan mock police stations are available in the fleet
    const existingIds = new Set(loaded.map((v) => v.id));
    const missingStations = MOCK_POLICE_STATIONS.filter((s) => !existingIds.has(s.id));
    if (missingStations.length > 0) {
      const merged = [...loaded, ...missingStations];
      saveStoredData('vehicles', merged);
      return merged;
    }
    return loaded;
  });
  const [alerts, setAlerts] = useState<Alert[]>(() => {
    const loaded = loadStoredData('alerts', INITIAL_ALERTS);
    const existingIds = new Set(loaded.map((a) => a.id));
    const missing = INITIAL_ALERTS.filter((a) => !existingIds.has(a.id));
    if (missing.length > 0) {
      const merged = [...loaded, ...missing];
      saveStoredData('alerts', merged);
      return merged;
    }
    return loaded;
  });
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

  // Live synchronizing selected vehicle reference (updates telemetry in real-time)
  const liveSelectedVehicle = useMemo(() => {
    if (!selectedVehicle) return null;
    return vehicles.find((v) => v.id === selectedVehicle.id) || selectedVehicle;
  }, [vehicles, selectedVehicle]);

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
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isRegisterStationModalOpen, setIsRegisterStationModalOpen] = useState(false);
  const [mapCategoryFilter, setMapCategoryFilter] = useState<'all' | VehicleCategory>('all');
  const [mapDistrictFilter, setMapDistrictFilter] = useState<string>('all');

  // Audible alerts state
  const [alertSoundEnabled, setAlertSoundEnabled] = useState<boolean>(() =>
    loadStoredData('alertSoundEnabled', true)
  );

  // Multi-select vehicle comparison state (up to 5 vehicles)
  const [multiSelectMode, setMultiSelectMode] = useState<boolean>(false);
  const [comparisonVehicleIds, setComparisonVehicleIds] = useState<string[]>([]);
  const [showComparisonDashboard, setShowComparisonDashboard] = useState<boolean>(false);

  // Spoken voice command dispatch modal state
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);

  // 24-Hour Telematics Alerts Summary Visualization Modal State
  const [show24hAlertsModal, setShow24hAlertsModal] = useState<boolean>(false);

  // Active Intercept Path Projection State
  const [activeIntercept, setActiveIntercept] = useState<ActiveInterceptState | null>(null);

  // Mobile Map vs List tab state
  const [mobileMapTab, setMobileMapTab] = useState<'map' | 'list'>('map');

  // Corridor progression indices per vehicle
  const corridorPositionsRef = useRef<Record<string, { corridor: string; index: number }>>({
    'veh-1': { corridor: 'kampala_jinja_road', index: 0 },
    'veh-2': { corridor: 'northern_bypass', index: 0 },
    'veh-3': { corridor: 'mbarara_fortportal_road', index: 0 },
    'veh-4': { corridor: 'gulu_corridor', index: 0 },
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
  useEffect(() => saveStoredData('alertSoundEnabled', alertSoundEnabled), [alertSoundEnabled]);

  // Audio chime using Web Audio API with user toggle gate
  const playAlertChime = (type: 'critical' | 'warn' | 'test' = 'critical') => {
    if (!alertSoundEnabled) return;
    playAlertSound(type);
  };

  const handleToggleComparisonVehicle = (vehicleId: string) => {
    setComparisonVehicleIds((prev) => {
      if (prev.includes(vehicleId)) {
        return prev.filter((id) => id !== vehicleId);
      }
      if (prev.length >= 5) {
        return prev;
      }
      return [...prev, vehicleId];
    });
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
          const corridorKeys = Object.keys(UGANDA_CORRIDORS);
          if (!cData || !UGANDA_CORRIDORS[cData.corridor]) {
            const fallbackKey = corridorKeys[Math.floor(Math.random() * corridorKeys.length)] || 'northern_bypass';
            cData = { corridor: fallbackKey, index: 0 };
            corridorPositionsRef.current[veh.id] = cData;
          }

          const waypoints = UGANDA_CORRIDORS[cData.corridor] || UGANDA_CORRIDORS.northern_bypass || Object.values(UGANDA_CORRIDORS)[0];
          if (!waypoints || waypoints.length === 0) return veh;

          const nextIndex = (cData.index + 1) % waypoints.length;
          cData.index = nextIndex;
          const targetWaypoint = waypoints[nextIndex];
          if (!targetWaypoint) return veh;

          // Strictly ensure telemetry tracking stays within sovereign boundaries of Uganda
          if (!isWithinUganda(targetWaypoint.lat, targetWaypoint.lon)) {
            return veh;
          }
          
          // District Assignment
          const district = getDistrictFromCorridor(cData.corridor);

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

          // 3. Harsh Braking / Rapid Deceleration Check
          const prevSpeed = veh.lastPosition?.speedKph ?? 45;
          if (prevSpeed >= 45 && speed <= 22 && !veh.isPatrol && !veh.isPoliceStation) {
            const harshBrakeAlertId = `harsh-brake-${veh.id}-${Date.now().toString().slice(-4)}`;
            setAlerts((curr) => {
              if (curr.some((a) => a.vehicleId === veh.id && a.kind === 'harsh_braking' && (Date.now() - new Date(a.ts).getTime() < 120000))) return curr;
              return [
                {
                  id: harshBrakeAlertId,
                  ts: new Date().toISOString(),
                  kind: 'harsh_braking',
                  severity: 'warn',
                  vehicleId: veh.id,
                  plate: veh.plate,
                  source: 'device',
                  lat: targetWaypoint.lat,
                  lon: targetWaypoint.lon,
                  locationName: targetWaypoint.roadName,
                  state: 'new',
                  payload: {
                    speed,
                    decelerationG: 0.54,
                    details: `HARSH BRAKING: Sudden deceleration (-0.54g from ${prevSpeed} km/h to ${speed} km/h in 1.4s) detected on ${targetWaypoint.roadName}.`,
                  },
                },
                ...curr,
              ];
            });
          }

          return {
            ...veh,
            district: district,
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

  const handleDispatchIntercept = (
    targetVeh: Vehicle,
    patrolVeh: Vehicle,
    candidate: InterceptCandidate,
    reason: string
  ) => {
    const interceptState: ActiveInterceptState = {
      targetVehicle: targetVeh,
      patrolVehicle: patrolVeh,
      candidate,
      reason,
      dispatchedAt: new Date().toISOString(),
      status: 'en_route',
      autoReassign: true,
      lastRecalculatedAt: new Date().toISOString(),
    };
    setActiveIntercept(interceptState);
    setActiveScreen('map');
    setMobileMapTab('map');
  };

  const handleCancelIntercept = () => {
    setActiveIntercept((prev) => (prev ? { ...prev, status: 'cancelled' } : null));
    setTimeout(() => {
      setActiveIntercept(null);
    }, 1500);
  };

  const handleCompleteIntercept = () => {
    if (!activeIntercept) return;
    speakInterceptCompleted(activeIntercept.targetVehicle, activeIntercept.patrolVehicle);
    setActiveIntercept((prev) => (prev ? { ...prev, status: 'intercepted' } : null));
  };

  const handleRegisterPoliceStation = (stationVehicle: Vehicle) => {
    setVehicles((prev) => {
      const filtered = prev.filter((v) => v.id !== stationVehicle.id && v.plateNorm !== stationVehicle.plateNorm);
      const updated = [stationVehicle, ...filtered];
      saveStoredData('vehicles', updated);
      return updated;
    });
  };

  const handleBatchRegisterStations = (stationVehicles: Vehicle[]) => {
    setVehicles((prev) => {
      const incomingIds = new Set(stationVehicles.map((s) => s.id));
      const filtered = prev.filter((v) => !incomingIds.has(v.id));
      const updated = [...stationVehicles, ...filtered];
      saveStoredData('vehicles', updated);
      return updated;
    });
  };

  const handleTriggerSimulatedAlert = (kind: 'speed' | 'harsh_braking' | 'curfew') => {
    if (!liveSelectedVehicle) return;
    const alertId = `alt-sim-${kind}-${Date.now().toString().slice(-4)}`;
    const speed = kind === 'speed' ? 76 : 38;
    const newAlert: Alert = {
      id: alertId,
      ts: new Date().toISOString(),
      kind,
      severity: kind === 'curfew' ? 'critical' : 'warn',
      vehicleId: liveSelectedVehicle.id,
      plate: liveSelectedVehicle.plate,
      source: 'device',
      lat: liveSelectedVehicle.lastPosition?.lat || 0.3204,
      lon: liveSelectedVehicle.lastPosition?.lon || 32.5976,
      locationName: liveSelectedVehicle.lastPosition?.address || 'Kampala Metropolitan Route',
      state: 'new',
      payload: {
        speed,
        speedLimit: 50,
        decelerationG: kind === 'harsh_braking' ? 0.54 : undefined,
        details:
          kind === 'speed'
            ? `SPEED VIOLATION: Excessive velocity recorded at ${speed} km/h (statutory limit 50 km/h).`
            : kind === 'harsh_braking'
            ? 'HARSH BRAKING: High-G deceleration (-0.54g from 60 km/h to standstill in 1.4s).'
            : 'CURFEW BREACH: Vehicle movement registered inside restricted zone during night curfew hours (01:45 EAT).',
      },
    };
    setAlerts((prev) => [newAlert, ...prev]);
  };

  // Real-time Auto-Refresh Loop for Active Intercept
  // Continuously monitors target vehicle movement from telemetry ticks,
  // re-calculates the optimal patrol unit with shortest ETA, and tracks until completed or cancelled.
  useEffect(() => {
    if (!activeIntercept || activeIntercept.status !== 'en_route') return;

    const result = recalculateOptimalIntercept(activeIntercept, vehicles);
    if (!result) return;

    const { updatedState, isUnitChanged, isCompleted } = result;

    if (isCompleted) {
      speakInterceptCompleted(updatedState.targetVehicle, updatedState.patrolVehicle);
    } else if (isUnitChanged) {
      speakInterceptReassigned(
        updatedState.targetVehicle,
        updatedState.patrolVehicle,
        updatedState.candidate.etaMinutes
      );
    }

    setActiveIntercept((prev) => {
      if (!prev || prev.status !== 'en_route') return prev;
      return updatedState;
    });
  }, [vehicles, activeIntercept?.status, activeIntercept?.targetVehicle?.id]);

  // Spoken voice locate dispatch: announces "Locating vehicle. Vehicle [Plate] located at [Address], [District] District"
  const handleLocateVehicle = async (vehicleOrId: Vehicle | string) => {
    const target =
      typeof vehicleOrId === 'string'
        ? vehicles.find((v) => v.id === vehicleOrId)
        : vehicleOrId;
    if (!target) return;

    if ((currentRole === 'agency' || currentRole === 'admin') && !unlockedPlates.has(target.plate)) {
      setAccessReasonData({ plate: target.plate, caseId: 'POLICE-INTELLIGENCE' });
      return;
    }

    setSelectedVehicle(target);
    setActiveScreen('map');
    setMobileMapTab('map');

    // Spoken voice dispatch readout (loudly reading place name on map)
    await speakVehicleLocation(target);
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
    if (targetVeh) {
      setSelectedVehicle(targetVeh);
      setActiveScreen('map');
      setMobileMapTab('map');
      await speakVehicleLocation(targetVeh);
    }
  };

  const handleReportStolen = (plate: string) => {
    setStolenConfirmPlate(plate);
  };

  const handleConfirmStolen = async () => {
    if (!stolenConfirmPlate) return;
    const plate = stolenConfirmPlate;

    setVehicles((prev) =>
      prev.map((v) =>
        v.plate === plate
          ? {
              ...v,
              status: 'stolen',
              stolenFrom: v.lastPosition?.address || 'Incident Scene, Kampala Central',
              topSpeedKph: Math.max(v.topSpeedKph || 0, 72),
            }
          : v
      )
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

  // Vehicle Registration Handler
  const handleRegisterVehicle = async (newVehicle: Vehicle, corridor: string, newDevice?: Device) => {
    // 1. Add vehicle to state
    setVehicles((prev) => [newVehicle, ...prev]);

    // 2. Set corridor waypoint tracking
    corridorPositionsRef.current[newVehicle.id] = { corridor, index: 0 };

    // 3. Add device to devices state if provided
    if (newDevice) {
      setDevices((prev) => [newDevice, ...prev]);
    }

    // 4. Automatically grant access to registered plate in active session
    setUnlockedPlates((prev) => new Set([...prev, newVehicle.plate]));

    // 5. Compute cryptographic chained audit event
    const chained = await createChainedAuditEvent(
      {
        actorId: currentRole === 'owner' ? 'usr-owner-1' : currentRole === 'fleet_manager' ? 'usr-fleet-1' : 'usr-admin-1',
        actorName: currentRole === 'owner' ? 'Mugisha Dennis' : currentRole === 'fleet_manager' ? 'Nile Logistics Ltd' : 'System Administrator',
        actorRole: currentRole,
        action: 'REGISTER_VEHICLE',
        targetType: 'vehicle',
        targetId: newVehicle.id,
        reason: `Enrolled new ${newVehicle.category} vehicle ${newVehicle.plate} (${newVehicle.make} ${newVehicle.model}) with GT06 tracker on ${corridor}`,
        ip: '196.12.140.22',
      },
      auditLogs as ChainedAuditEvent[]
    );
    setAuditLogs((prev) => [chained, ...prev]);

    // 6. Select vehicle and open details / map
    setSelectedVehicle(newVehicle);
  };

  // Scope-Aware filtered vehicles
  const scopedVehicles = filterVehiclesByRole(vehicles, currentRole);
  const searchedVehicles = scopedVehicles.filter((v) => {
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

  const visibleMapVehicles = searchedVehicles.filter((v) => {
    if (mapCategoryFilter !== 'all' && v.category !== mapCategoryFilter) return false;
    if (mapDistrictFilter !== 'all' && v.district !== mapDistrictFilter) return false;
    // Strictly restrict live tracking to vehicles located within the sovereign boundaries of Uganda
    if (v.lastPosition && !isVehicleInUganda(v)) return false;
    return true;
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
        onOpenVoiceCommandModal={() => setIsVoiceModalOpen(true)}
        onOpenAlertsSummaryModal={() => setShow24hAlertsModal(true)}
      />

      {/* Main Screen Router */}
      <div className="flex-1 flex overflow-hidden relative pb-14 md:pb-0">
        {/* Screen 1: Live Map View */}
        {activeScreen === 'map' && (
          <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden relative">
            {/* Mobile View Switcher (Map vs Vehicle List) */}
            <div className="lg:hidden absolute top-2 right-2 z-30 flex items-center bg-white/95 dark:bg-[#181C25]/95 backdrop-blur-md p-1 rounded-xl border border-gray-200 dark:border-gray-800 shadow-md text-xs font-semibold select-none">
              <button
                onClick={() => setMobileMapTab('map')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  mobileMapTab === 'map'
                    ? 'bg-[#B3261E] text-white shadow-xs font-bold'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Map</span>
              </button>
              <button
                onClick={() => setMobileMapTab('list')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  mobileMapTab === 'list'
                    ? 'bg-[#B3261E] text-white shadow-xs font-bold'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Car className="w-3.5 h-3.5" />
                <span>Trackers ({visibleMapVehicles.length})</span>
              </button>
            </div>

            {/* Left Vehicles List Panel (full screen on phone if active, side-panel on desktop) */}
            <div
              className={`${
                mobileMapTab === 'list' ? 'flex' : 'hidden'
              } lg:flex w-full lg:w-[360px] h-full shrink-0 flex-col z-20`}
            >
              <VehicleList 
                vehicles={visibleMapVehicles}
                mapCategoryFilter={mapCategoryFilter}
                setMapCategoryFilter={setMapCategoryFilter}
                mapDistrictFilter={mapDistrictFilter}
                setMapDistrictFilter={setMapDistrictFilter}
                UGANDA_DISTRICTS={UGANDA_DISTRICTS}
                selectedVehicleId={liveSelectedVehicle?.id}
                onSelectVehicle={(veh) => {
                  handleSelectVehicleWithGate(veh);
                  setMobileMapTab('map');
                }}
                onEnroll={() => setIsRegisterModalOpen(true)}
                onOpenRegisterStationModal={() => setIsRegisterStationModalOpen(true)}
                multiSelectMode={multiSelectMode}
                onToggleMultiSelectMode={() => setMultiSelectMode((prev) => !prev)}
                comparisonVehicleIds={comparisonVehicleIds}
                onToggleComparisonVehicle={handleToggleComparisonVehicle}
                onLaunchComparison={() => setShowComparisonDashboard(true)}
                onClearComparison={() => setComparisonVehicleIds([])}
                onLocateVehicle={handleLocateVehicle}
                onOpenVoiceCommandModal={() => setIsVoiceModalOpen(true)}
                onOpenAlertsSummaryModal={() => setShow24hAlertsModal(true)}
              />
            </div>

            {/* Center: Live MapLibre Map (full screen on phone if active, flex-1 on desktop) */}
            <div
              className={`${
                mobileMapTab === 'map' ? 'flex' : 'hidden'
              } lg:flex flex-1 h-full relative`}
            >
              <LiveMap
                vehicles={visibleMapVehicles}
                alerts={alerts}
                cameras={cameras}
                geofences={geofences}
                selectedVehicleId={liveSelectedVehicle?.id}
                onSelectVehicle={(veh) => handleSelectVehicleWithGate(veh)}
                onLocateVehicle={handleLocateVehicle}
                activeIntercept={activeIntercept}
                onClearIntercept={() => setActiveIntercept(null)}
                onCancelIntercept={handleCancelIntercept}
                onCompleteIntercept={handleCompleteIntercept}
              />
            </div>

            {/* Right: Vehicle Detail Drawer */}
            {liveSelectedVehicle && (
              <VehicleDetailDrawer
                vehicle={liveSelectedVehicle}
                onClose={() => setSelectedVehicle(null)}
                onReportStolen={handleReportStolen}
                onOpenShareModal={(v) => setShareVehicle(v)}
                userRole={currentRole}
                alerts={alerts}
                onLocateVehicle={handleLocateVehicle}
                allVehicles={vehicles}
                onDispatchIntercept={handleDispatchIntercept}
                onRegisterPoliceStation={handleRegisterPoliceStation}
                onBatchRegisterStations={handleBatchRegisterStations}
                activeIntercept={activeIntercept}
                onCancelIntercept={handleCancelIntercept}
                onCompleteIntercept={handleCompleteIntercept}
                onTriggerSimulatedAlert={handleTriggerSimulatedAlert}
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
            onOpenRegisterModal={() => setIsRegisterModalOpen(true)}
            onLocateVehicle={handleLocateVehicle}
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
              handleLocateVehicle(vehId);
            }}
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
            onLocateVehicle={handleLocateVehicle}
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
            onOpenRegisterModal={() => setIsRegisterModalOpen(true)}
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
            alertSoundEnabled={alertSoundEnabled}
            onToggleAlertSound={setAlertSoundEnabled}
          />
        )}
      </div>

      {/* Side-by-side Telemetry Comparison Dashboard Modal */}
      {showComparisonDashboard && (
        <TelemetryComparisonDashboard
          vehicles={vehicles.filter((v) => comparisonVehicleIds.includes(v.id))}
          onClose={() => setShowComparisonDashboard(false)}
          onRemoveVehicle={(id) => setComparisonVehicleIds((prev) => prev.filter((vId) => vId !== id))}
          onSelectForMap={(veh) => {
            setShowComparisonDashboard(false);
            handleSelectVehicleWithGate(veh);
            setActiveScreen('map');
          }}
          onClearAll={() => {
            setComparisonVehicleIds([]);
            setShowComparisonDashboard(false);
          }}
        />
      )}

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

      {/* Register Vehicle Modal */}
      <RegisterVehicleModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onRegister={handleRegisterVehicle}
        currentRole={currentRole}
      />

      {/* Register Police Station & Interceptor Unit Modal */}
      <RegisterPoliceStationModal
        isOpen={isRegisterStationModalOpen}
        onClose={() => setIsRegisterStationModalOpen(false)}
        existingStationIds={vehicles.map((v) => v.id)}
        onRegisterStation={handleRegisterPoliceStation}
        onBatchRegisterStations={handleBatchRegisterStations}
      />

      {/* Voice Announcement Spoken Banner with Audio Visualizer */}
      <VoiceAnnouncementBanner />

      {/* Voice Command Recognition & Dispatch Modal */}
      <VoiceCommandModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        vehicles={scopedVehicles}
        onSelectAndLocate={handleLocateVehicle}
      />

      {/* 24-Hour Telematics Alerts Summary Visualization Modal */}
      {show24hAlertsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-xs animate-in fade-in select-none">
          <div className="relative w-full max-w-4xl max-h-[calc(100vh-32px)] flex flex-col rounded-2xl bg-white dark:bg-[#181C25] border border-blue-500/40 shadow-2xl overflow-hidden">
            <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#13161F] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span className="font-heading font-bold text-sm uppercase text-gray-900 dark:text-gray-100">
                  24-Hour Telematics &amp; Security Alerts Analytics
                </span>
              </div>
              <button
                onClick={() => setShow24hAlertsModal(false)}
                className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer"
                aria-label="Close analytics modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 sm:p-4">
              <Alerts24hSummaryPanel
                alerts={alerts}
                defaultExpanded={true}
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

