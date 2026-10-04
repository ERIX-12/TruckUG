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

export const KAMPALA_CORRIDORS: Record<string, CorridorWaypoint[]> = {
  // Corridor 1: Northern Bypass (Busega -> Namungoona -> Kalerwe -> Kyebando -> Kiwatule -> Bweyogerere)
  northern_bypass: [
    { lat: 0.312, lon: 32.545, heading: 45, roadName: 'Northern Bypass, Busega Interchange', speedLimit: 70 },
    { lat: 0.325, lon: 32.552, heading: 40, roadName: 'Northern Bypass, Namungoona Viaduct', speedLimit: 70 },
    { lat: 0.3421, lon: 32.5621, heading: 60, roadName: 'Northern Bypass, Kalerwe Flyover', speedLimit: 70 },
    { lat: 0.355, lon: 32.585, heading: 90, roadName: 'Northern Bypass, Kyebando Junction', speedLimit: 70 },
    { lat: 0.358, lon: 32.615, heading: 110, roadName: 'Northern Bypass, Kiwatule Flyover', speedLimit: 70 },
    { lat: 0.352, lon: 32.645, heading: 125, roadName: 'Northern Bypass, Namboole Roundabout', speedLimit: 70 },
    { lat: 0.358, lon: 32.615, heading: 290, roadName: 'Northern Bypass, Kiwatule Flyover (Inbound)', speedLimit: 70 },
    { lat: 0.3421, lon: 32.5621, heading: 240, roadName: 'Northern Bypass, Kalerwe Flyover (Inbound)', speedLimit: 70 },
  ],

  // Corridor 2: Jinja Road (CBD Posta -> Wampewo -> Nakawa -> Banda -> Kireka)
  jinja_road: [
    { lat: 0.314, lon: 32.582, heading: 85, roadName: 'Jinja Road, Kitgum House Junction', speedLimit: 50 },
    { lat: 0.3204, lon: 32.5976, heading: 80, roadName: 'Jinja Road, Wampewo Roundabout', speedLimit: 50 },
    { lat: 0.3308, lon: 32.6162, heading: 75, roadName: 'Jinja Road, Spear Motors Nakawa', speedLimit: 50 },
    { lat: 0.341, lon: 32.635, heading: 85, roadName: 'Jinja Road, Banda Kyambogo Footbridge', speedLimit: 60 },
    { lat: 0.347, lon: 32.655, heading: 95, roadName: 'Jinja Road, Kireka Town Center', speedLimit: 50 },
    { lat: 0.3308, lon: 32.6162, heading: 255, roadName: 'Jinja Road, Nakawa Inbound', speedLimit: 50 },
    { lat: 0.3204, lon: 32.5976, heading: 260, roadName: 'Jinja Road, Wampewo Roundabout Inbound', speedLimit: 50 },
  ],

  // Corridor 3: Entebbe Road & Kibuye Node
  entebbe_road: [
    { lat: 0.3082, lon: 32.5765, heading: 175, roadName: 'Clock Tower / Queensway Roundabout', speedLimit: 40 },
    { lat: 0.2975, lon: 32.5684, heading: 185, roadName: 'Entebbe Road, Kibuye Roundabout', speedLimit: 50 },
    { lat: 0.278, lon: 32.562, heading: 195, roadName: 'Entebbe Road, Najjanankumbi Corridor', speedLimit: 50 },
    { lat: 0.255, lon: 32.558, heading: 180, roadName: 'Entebbe Road, Zana Flyover', speedLimit: 60 },
    { lat: 0.278, lon: 32.562, heading: 15, roadName: 'Entebbe Road, Najjanankumbi Inbound', speedLimit: 50 },
    { lat: 0.2975, lon: 32.5684, heading: 5, roadName: 'Entebbe Road, Kibuye Inbound', speedLimit: 50 },
  ],

  // Corridor 4: Kampala Central Business District Loop
  cbd_loop: [
    { lat: 0.3136, lon: 32.5811, heading: 90, roadName: 'Kampala Road, near Posta Uganda', speedLimit: 40 },
    { lat: 0.317, lon: 32.586, heading: 45, roadName: 'Parliamentary Avenue / Kimathi Ave', speedLimit: 35 },
    { lat: 0.322, lon: 32.582, heading: 315, roadName: 'Yusuf Lule Road, Garden City Hub', speedLimit: 50 },
    { lat: 0.328, lon: 32.574, heading: 270, roadName: 'Mulago Hill Road Interchange', speedLimit: 45 },
    { lat: 0.325, lon: 32.565, heading: 210, roadName: 'Wandegeya Traffic Intersection', speedLimit: 40 },
    { lat: 0.315, lon: 32.572, heading: 135, roadName: 'Bombo Road / Bat Valley Theatre', speedLimit: 40 },
  ],
};
