import { Vehicle, InterceptDispatchOrder } from '../types';
import { unlockAudioPlayback } from './audio';
import { isVehicleInUganda } from './geoRules';

export interface InterceptCandidate {
  vehicle: Vehicle;
  distanceKm: number;
  etaMinutes: number;
  etaSecondsTotal: number;
  formattedEta: string;
  tacticalSpeedKph: number;
  bearingDeg: number;
  corridorNotes: string;
  isStation?: boolean;
  stationName?: string;
  stationCode?: string;
}

export interface ActiveInterceptState {
  targetVehicle: Vehicle;
  patrolVehicle: Vehicle;
  candidate: InterceptCandidate;
  reason?: string;
  dispatchedAt?: string;
  status: 'en_route' | 'intercepted' | 'cancelled';
  autoReassign?: boolean;
  reassignedFromCallsign?: string;
  lastRecalculatedAt?: string;
  allCandidates?: InterceptCandidate[];
}

/**
 * Generates realistic road corridor coordinates [lon, lat] between patrol unit and target vehicle.
 * Produces smooth waypoints following arterial corridors for map line rendering.
 */
export function generateInterceptCorridorPath(
  patrolPos: { lat: number; lon: number },
  targetPos: { lat: number; lon: number }
): [number, number][] {
  const p0: [number, number] = [patrolPos.lon, patrolPos.lat];
  const p1: [number, number] = [targetPos.lon, targetPos.lat];

  const dx = p1[0] - p0[0];
  const dy = p1[1] - p0[1];
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 0.0001) {
    return [p0, p1];
  }

  // Slight perpendicular bow for realistic city corridor curvature
  const ux = -dy / dist;
  const uy = dx / dist;

  // Curvature amplitude proportional to distance (subtle, 12% of span)
  const curveMagnitude = dist * 0.12;

  // Waypoints using quadratic Bezier curve
  const steps = 14;
  const coordinates: [number, number][] = [];

  const controlX = (p0[0] + p1[0]) / 2 + ux * curveMagnitude;
  const controlY = (p0[1] + p1[1]) / 2 + uy * curveMagnitude;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const oneMinusT = 1 - t;
    const lon = oneMinusT * oneMinusT * p0[0] + 2 * oneMinusT * t * controlX + t * t * p1[0];
    const lat = oneMinusT * oneMinusT * p0[1] + 2 * oneMinusT * t * controlY + t * t * p1[1];
    coordinates.push([Math.round(lon * 100000) / 100000, Math.round(lat * 100000) / 100000]);
  }

  return coordinates;
}

/**
 * Calculates straight-line Haversine distance in kilometers between two coordinates
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Computes cardinal bearing from patrol unit to target vehicle
 */
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const y = Math.sin(((lon2 - lon1) * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(((lon2 - lon1) * Math.PI) / 180);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return Math.round((brng + 360) % 360);
}

/**
 * Filters registered police patrol vehicles and police stations from the fleet
 */
export function getRegisteredPatrolVehicles(vehicles: Vehicle[]): Vehicle[] {
  return vehicles.filter(
    (v) =>
      v.category === 'police' ||
      v.isPatrol === true ||
      v.isPoliceStation === true ||
      v.plate.startsWith('UP ') ||
      v.callsign?.includes('STATION') ||
      v.callsign?.includes('PATROL') ||
      v.ownerName?.toLowerCase().includes('police') ||
      v.ownerName?.toLowerCase().includes('patrol') ||
      v.ownerName?.toLowerCase().includes('station')
  );
}

/**
 * Calculates and ranks all registered police patrol vehicles and police stations relative to the target vehicle,
 * sorting them by shortest ETA first.
 */
export function findNearestInterceptUnits(
  targetVehicle: Vehicle,
  allVehicles: Vehicle[]
): InterceptCandidate[] {
  const targetPos = targetVehicle.lastPosition;
  if (!targetPos || !isVehicleInUganda(targetVehicle)) return [];

  const patrolUnits = getRegisteredPatrolVehicles(allVehicles);

  const candidates: InterceptCandidate[] = patrolUnits
    .filter((patrol) => patrol.id !== targetVehicle.id && patrol.lastPosition && isVehicleInUganda(patrol))
    .map((patrol) => {
      const pos = patrol.lastPosition!;
      const straightDistKm = calculateDistanceKm(
        pos.lat,
        pos.lon,
        targetPos.lat,
        targetPos.lon
      );

      // Kampala metropolitan street tortuosity multiplier (1.28)
      const roadDistanceKm = Math.round(straightDistKm * 1.28 * 10) / 10;

      // Emergency tactical response speed (65 km/h emergency with sirens)
      const tacticalSpeed = Math.max(pos.speedKph || 0, 60);

      // Travel time in minutes
      const timeHours = roadDistanceKm / tacticalSpeed;
      const totalSeconds = Math.max(60, Math.round(timeHours * 3600));
      const etaMinutes = Math.max(1, Math.round(totalSeconds / 60));

      const minutesPart = Math.floor(totalSeconds / 60);
      const secondsPart = totalSeconds % 60;
      const formattedEta =
        minutesPart > 0
          ? `${minutesPart} min${secondsPart > 0 ? ` ${secondsPart}s` : ''}`
          : `${secondsPart}s`;

      const bearing = calculateBearing(pos.lat, pos.lon, targetPos.lat, targetPos.lon);

      const isStation = !!patrol.isPoliceStation;
      let corridorNotes = isStation
        ? `${patrol.stationName || 'Police Station'} • QRF Squad Standing By`
        : 'Urban arterial corridor';
      if (straightDistKm < 2.5) {
        corridorNotes = isStation
          ? `${patrol.stationName || 'Police Station'} Base • Perimeter Visual Range`
          : 'Immediate vicinity • Tactical visual range';
      } else if (straightDistKm < 5.0) {
        corridorNotes = isStation
          ? `${patrol.stationName || 'Police Division'} • Rapid Interceptor Deployed`
          : 'Rapid perimeter approach • Sirens active';
      } else {
        corridorNotes = isStation
          ? `${patrol.stationName || 'Police Command'} • Arterial Highway Intercept`
          : 'Express highway intercept route';
      }

      return {
        vehicle: patrol,
        distanceKm: roadDistanceKm,
        etaMinutes,
        etaSecondsTotal: totalSeconds,
        formattedEta,
        tacticalSpeedKph: tacticalSpeed,
        bearingDeg: bearing,
        corridorNotes,
        isStation,
        stationName: patrol.stationName,
        stationCode: patrol.stationCode,
      };
    });

  // Sort by shortest ETA ascending
  return candidates.sort((a, b) => a.etaSecondsTotal - b.etaSecondsTotal);
}

/**
 * Vocal police radio announcement when an intercept is dispatched
 */
export async function speakInterceptDispatch(
  targetVehicle: Vehicle,
  patrolVehicle: Vehicle,
  etaMinutes: number
): Promise<void> {
  if (typeof window === 'undefined') return;

  await unlockAudioPlayback();

  const callsign = patrolVehicle.callsign || patrolVehicle.plate;
  const targetPlate = targetVehicle.plate;
  const targetAddr = targetVehicle.lastPosition?.address || 'Kampala Metro';
  const isStation = !!patrolVehicle.isPoliceStation;

  const dispatchText = isStation
    ? `Emergency tactical order. Police Station ${patrolVehicle.stationName || callsign}, dispatching quick reaction interceptor unit ${patrolVehicle.plate} to target vehicle ${targetPlate} at ${targetAddr}. Estimated intercept time: ${etaMinutes} minutes.`
    : `Emergency tactical order. Intercept unit ${callsign}, plate ${patrolVehicle.plate}, dispatched to target vehicle ${targetPlate} at ${targetAddr}. Estimated intercept time: ${etaMinutes} minutes.`;

  if (!('speechSynthesis' in window)) return;

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(dispatchText);
    utterance.volume = 1.0;
    utterance.rate = 1.0;
    utterance.pitch = 1.05;
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    // ignore
  }
}

/**
  * Re-calculates optimal patrol unit for an active intercept based on real-time target vehicle movement.
  * Dynamically accounts for target position changes, selects the optimal unit with shortest ETA,
  * and detects completion when patrol unit reaches tactical contact distance (<= 350m).
  */
export function recalculateOptimalIntercept(
  activeState: ActiveInterceptState,
  allVehicles: Vehicle[]
): {
  updatedState: ActiveInterceptState;
  isUnitChanged: boolean;
  isCompleted: boolean;
} | null {
  if (activeState.status === 'intercepted' || activeState.status === 'cancelled') {
    return null;
  }

  const freshTarget = allVehicles.find((v) => v.id === activeState.targetVehicle.id);
  if (!freshTarget || !freshTarget.lastPosition) return null;

  const rankedCandidates = findNearestInterceptUnits(freshTarget, allVehicles);
  if (rankedCandidates.length === 0) return null;

  const optimalCandidate = rankedCandidates[0];
  const currentPatrolCandidate =
    rankedCandidates.find((c) => c.vehicle.id === activeState.patrolVehicle.id) || optimalCandidate;

  // Tactical interception completion threshold: within 350 meters
  const isCompleted = currentPatrolCandidate.distanceKm <= 0.35 || freshTarget.status === 'recovered';

  // Hysteresis threshold: only switch to new unit if ETA is at least 45 seconds shorter to prevent oscillation
  const shouldSwitch =
    activeState.autoReassign !== false &&
    optimalCandidate.vehicle.id !== activeState.patrolVehicle.id &&
    optimalCandidate.etaSecondsTotal < currentPatrolCandidate.etaSecondsTotal - 45;

  const chosenCandidate = shouldSwitch ? optimalCandidate : currentPatrolCandidate;
  const isUnitChanged = chosenCandidate.vehicle.id !== activeState.patrolVehicle.id;

  const updatedState: ActiveInterceptState = {
    ...activeState,
    targetVehicle: freshTarget,
    patrolVehicle: chosenCandidate.vehicle,
    candidate: chosenCandidate,
    status: isCompleted ? 'intercepted' : 'en_route',
    reassignedFromCallsign: isUnitChanged
      ? activeState.patrolVehicle.callsign || activeState.patrolVehicle.plate
      : activeState.reassignedFromCallsign,
    lastRecalculatedAt: new Date().toISOString(),
    allCandidates: rankedCandidates,
  };

  return {
    updatedState,
    isUnitChanged,
    isCompleted,
  };
}

/**
 * Spoken voice dispatch when an intercept is completed and target vehicle is secured
 */
export async function speakInterceptCompleted(
  targetVehicle: Vehicle,
  patrolVehicle: Vehicle
): Promise<void> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    await unlockAudioPlayback();
    window.speechSynthesis.cancel();
    const text = `Tactical order update. Target vehicle ${targetVehicle.plate} successfully intercepted and secured by unit ${patrolVehicle.callsign || patrolVehicle.plate}.`;
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 1.0;
    utt.pitch = 1.05;
    utt.lang = 'en-US';
    window.speechSynthesis.speak(utt);
  } catch (e) {
    // ignore
  }
}

/**
 * Spoken voice dispatch when a closer patrol unit is dynamically re-assigned
 */
export async function speakInterceptReassigned(
  targetVehicle: Vehicle,
  newPatrolVehicle: Vehicle,
  etaMinutes: number
): Promise<void> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    await unlockAudioPlayback();
    window.speechSynthesis.cancel();
    const text = `Tactical re-route. Unit ${newPatrolVehicle.callsign || newPatrolVehicle.plate} re-assigned with shortest ETA of ${etaMinutes} minutes to target ${targetVehicle.plate}.`;
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 1.0;
    utt.pitch = 1.0;
    utt.lang = 'en-US';
    window.speechSynthesis.speak(utt);
  } catch (e) {
    // ignore
  }
}
