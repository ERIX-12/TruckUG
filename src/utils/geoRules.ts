import { Geofence } from '../types';

/**
 * 2D Ray-Casting algorithm to determine if a point (lat, lon) is inside a polygon.
 * Coordinates in Geofence are [lat, lon].
 */
export function isPointInPolygon(
  point: [number, number],
  polygon: [number, number][]
): boolean {
  if (polygon.length < 3) return false;

  const [lat, lon] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [latI, lonI] = polygon[i];
    const [latJ, lonJ] = polygon[j];

    const intersect =
      lonI > lon !== lonJ > lon &&
      lat < ((latJ - latI) * (lon - lonI)) / (lonJ - lonI) + latI;

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Evaluates whether current East Africa Time (Africa/Kampala) falls within curfew hours.
 * Supports crossing midnight (e.g. 22:00 to 05:30).
 */
export function isCurfewActive(
  curfewStart: string = '22:00',
  curfewEnd: string = '05:30'
): boolean {
  // Get Kampala local time
  const now = new Date();
  const kampalaTimeStr = now.toLocaleTimeString('en-US', {
    timeZone: 'Africa/Kampala',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });

  const [currH, currM] = kampalaTimeStr.split(':').map(Number);
  const currentTotal = currH * 60 + currM;

  const [startH, startM] = curfewStart.split(':').map(Number);
  const startTotal = startH * 60 + startM;

  const [endH, endM] = curfewEnd.split(':').map(Number);
  const endTotal = endH * 60 + endM;

  if (startTotal > endTotal) {
    // Crosses midnight (e.g. 22:00 to 05:30)
    return currentTotal >= startTotal || currentTotal <= endTotal;
  } else {
    // Same day
    return currentTotal >= startTotal && currentTotal <= endTotal;
  }
}

/**
 * Kampala arterial road corridors with waypoints to prevent vehicles from drifting into water.
 */
export interface CorridorWaypoint {
  lat: number;
  lon: number;
  heading: number;
  roadName: string;
  speedLimit: number;
}

export const UGANDA_CORRIDORS: Record<string, CorridorWaypoint[]> = {
  // Central & Kampala Metro Corridors
  kampala_jinja_road: [
    { lat: 0.314, lon: 32.582, heading: 85, roadName: 'Jinja Road, Kampala', speedLimit: 50 },
    { lat: 0.3308, lon: 32.6162, heading: 75, roadName: 'Nakawa', speedLimit: 50 },
    { lat: 0.447, lon: 33.203, heading: 85, roadName: 'Jinja Town', speedLimit: 50 },
  ],
  jinja_road: [
    { lat: 0.314, lon: 32.582, heading: 85, roadName: 'Jinja Road, Kitgum House', speedLimit: 50 },
    { lat: 0.3204, lon: 32.5976, heading: 80, roadName: 'Jinja Road, Wampewo Roundabout', speedLimit: 50 },
    { lat: 0.3308, lon: 32.6162, heading: 75, roadName: 'Jinja Road, Spear Motors Nakawa', speedLimit: 50 },
    { lat: 0.347, lon: 32.655, heading: 95, roadName: 'Jinja Road, Kireka Town Center', speedLimit: 50 },
  ],
  northern_bypass: [
    { lat: 0.312, lon: 32.545, heading: 45, roadName: 'Northern Bypass, Busega Interchange', speedLimit: 70 },
    { lat: 0.325, lon: 32.552, heading: 40, roadName: 'Northern Bypass, Namungoona Viaduct', speedLimit: 70 },
    { lat: 0.3421, lon: 32.5621, heading: 60, roadName: 'Northern Bypass, Kalerwe Flyover', speedLimit: 70 },
    { lat: 0.355, lon: 32.585, heading: 90, roadName: 'Northern Bypass, Kyebando Junction', speedLimit: 70 },
    { lat: 0.358, lon: 32.615, heading: 110, roadName: 'Northern Bypass, Kiwatule Flyover', speedLimit: 70 },
    { lat: 0.352, lon: 32.645, heading: 125, roadName: 'Northern Bypass, Namboole Roundabout', speedLimit: 70 },
  ],
  cbd_loop: [
    { lat: 0.3136, lon: 32.5811, heading: 90, roadName: 'Kampala Road, near Posta Uganda', speedLimit: 40 },
    { lat: 0.317, lon: 32.586, heading: 45, roadName: 'Parliamentary Avenue / Kimathi Ave', speedLimit: 35 },
    { lat: 0.322, lon: 32.582, heading: 315, roadName: 'Yusuf Lule Road, Garden City Hub', speedLimit: 50 },
    { lat: 0.328, lon: 32.574, heading: 270, roadName: 'Mulago Hill Road Interchange', speedLimit: 45 },
    { lat: 0.325, lon: 32.565, heading: 210, roadName: 'Wandegeya Traffic Intersection', speedLimit: 40 },
  ],
  entebbe_road: [
    { lat: 0.3082, lon: 32.5765, heading: 175, roadName: 'Clock Tower / Queensway Roundabout', speedLimit: 40 },
    { lat: 0.2975, lon: 32.5684, heading: 185, roadName: 'Entebbe Road, Kibuye Roundabout', speedLimit: 50 },
    { lat: 0.278, lon: 32.562, heading: 195, roadName: 'Entebbe Road, Najjanankumbi Corridor', speedLimit: 50 },
    { lat: 0.255, lon: 32.558, heading: 180, roadName: 'Entebbe Road, Zana Flyover', speedLimit: 60 },
  ],
  // Eastern
  mbale_tororo_road: [
    { lat: 1.065, lon: 34.18, heading: 60, roadName: 'Mbale Town', speedLimit: 50 },
    { lat: 0.69, lon: 34.18, heading: 180, roadName: 'Tororo Road', speedLimit: 70 },
  ],
  // Western
  mbarara_fortportal_road: [
    { lat: -0.61, lon: 30.65, heading: 270, roadName: 'Mbarara Town', speedLimit: 50 },
    { lat: 0.66, lon: 30.27, heading: 330, roadName: 'Fort Portal Town', speedLimit: 50 },
  ],
  // Northern
  gulu_corridor: [
    { lat: 2.77, lon: 32.3, heading: 0, roadName: 'Gulu City', speedLimit: 50 },
    { lat: 2.3, lon: 32.25, heading: 180, roadName: 'Gulu-Kampala Rd', speedLimit: 80 },
  ],
  // West Nile
  aru_corridor: [
    { lat: 3.02, lon: 30.9, heading: 300, roadName: 'Arua City', speedLimit: 50 },
  ],
  arua_corridor: [
    { lat: 3.02, lon: 30.9, heading: 300, roadName: 'Arua City', speedLimit: 50 },
  ],
};

export const KAMPALA_CORRIDORS = UGANDA_CORRIDORS;

export const CORRIDOR_DISTRICT_MAP: Record<string, string> = {
  kampala_jinja_road: 'Kampala',
  jinja_road: 'Jinja',
  northern_bypass: 'Wakiso',
  cbd_loop: 'Kampala',
  entebbe_road: 'Wakiso',
  mbale_tororo_road: 'Mbale',
  mbarara_fortportal_road: 'Mbarara',
  gulu_corridor: 'Gulu',
  aru_corridor: 'Arua',
  arua_corridor: 'Arua',
};


export function getDistrictFromCorridor(corridor: string): string {
  return CORRIDOR_DISTRICT_MAP[corridor] || 'Kampala';
}
