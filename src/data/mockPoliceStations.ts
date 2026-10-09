import { Vehicle, Device } from '../types';

export interface PoliceStationPreset {
  id: string;
  stationName: string;
  stationCode: string;
  division: string;
  sector: string;
  district: string;
  officerInCharge: string;
  officerRank: string;
  phone: string;
  plate: string;
  callsign: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleColor: string;
  address: string;
  lat: number;
  lon: number;
  squadCount: number;
  topSpeedKph: number;
  deviceImei: string;
}

export const POLICE_STATION_PRESETS: PoliceStationPreset[] = [
  {
    id: 'stn-cps',
    stationName: 'Central Police Station (CPS Kampala)',
    stationCode: 'UPF-KLA-CPS-01',
    division: 'Kampala Central Police Division',
    sector: 'Nakasero / Buganda Road Sector',
    district: 'Kampala',
    officerInCharge: 'SSP. Mwaka Joseph (DPC Central)',
    officerRank: 'Senior Superintendent of Police',
    phone: '+256 999 100201',
    plate: 'UP 9101',
    callsign: 'STATION-CPS-INTERCEPT',
    vehicleMake: 'Toyota',
    vehicleModel: 'Land Cruiser 79 Tactical Command',
    vehicleColor: 'Police Blue & White',
    address: 'Buganda Road, Nakasero, Kampala Central',
    lat: 0.3152,
    lon: 32.5816,
    squadCount: 6,
    topSpeedKph: 95,
    deviceImei: '864201048999101',
  },
  {
    id: 'stn-kira',
    stationName: 'Kira Road Police Division',
    stationCode: 'UPF-KLA-KIRA-02',
    division: 'Kira Road Police Division',
    sector: 'Kamwokya / Kololo / Bukoto Sector',
    district: 'Kampala',
    officerInCharge: 'SP. Tumuhimbise Brenda (DPC Kira Rd)',
    officerRank: 'Superintendent of Police',
    phone: '+256 999 100202',
    plate: 'UP 9202',
    callsign: 'STATION-KIRA-ALPHA',
    vehicleMake: 'Ford',
    vehicleModel: 'Ranger Rapid Interceptor',
    vehicleColor: 'Police Matte Blue',
    address: 'Kira Road, Kamwokya, Kampala',
    lat: 0.3392,
    lon: 32.5938,
    squadCount: 5,
    topSpeedKph: 90,
    deviceImei: '864201048999202',
  },
  {
    id: 'stn-kabalagala',
    stationName: 'Kabalagala Police Division',
    stationCode: 'UPF-KLA-KBL-03',
    division: 'Makindye Police Division',
    sector: 'Ggaba Road / Kansanga / Muyenga Sector',
    district: 'Kampala',
    officerInCharge: 'ASP. Chemonges Felix (OC Station)',
    officerRank: 'Assistant Superintendent of Police',
    phone: '+256 999 100203',
    plate: 'UP 9303',
    callsign: 'STATION-KABALAGALA-RAPID',
    vehicleMake: 'Toyota',
    vehicleModel: 'Hilux 4x4 Emergency Interceptor',
    vehicleColor: 'High-Vis Reflective Blue',
    address: 'Ggaba Road, Kabalagala Junction, Makindye',
    lat: 0.2974,
    lon: 32.6002,
    squadCount: 4,
    topSpeedKph: 88,
    deviceImei: '864201048999303',
  },
  {
    id: 'stn-jinja-rd',
    stationName: 'Jinja Road Police Division',
    stationCode: 'UPF-KLA-JRD-04',
    division: 'Nakawa Police Division',
    sector: 'Jinja Road / Lugogo / Nakawa Corridor',
    district: 'Kampala',
    officerInCharge: 'SP. Opolot Isaac (DPC Nakawa)',
    officerRank: 'Superintendent of Police',
    phone: '+256 999 100204',
    plate: 'UP 9404',
    callsign: 'STATION-JINJA-RD-PURSUIT',
    vehicleMake: 'Toyota',
    vehicleModel: 'Land Cruiser Prado TX Tactical',
    vehicleColor: 'Police Dark Navy',
    address: 'Jinja Road, opposite Nakawa Market, Kampala',
    lat: 0.3235,
    lon: 32.6078,
    squadCount: 6,
    topSpeedKph: 92,
    deviceImei: '864201048999404',
  },
  {
    id: 'stn-old-kla',
    stationName: 'Old Kampala Police Division',
    stationCode: 'UPF-KLA-OKLA-05',
    division: 'Old Kampala Police Division',
    sector: 'Old Kampala Hill / Mengo / Makerere Sector',
    district: 'Kampala',
    officerInCharge: 'ASP. Nabukenya Grace (OC Station)',
    officerRank: 'Assistant Superintendent of Police',
    phone: '+256 999 100205',
    plate: 'UP 9505',
    callsign: 'STATION-OLD-KLA-TACTICAL',
    vehicleMake: 'Mahindra',
    vehicleModel: 'Scorpio Rapid Pursuit Interceptor',
    vehicleColor: 'Police Blue & White',
    address: 'Old Kampala Hill, Gadhafi Mosque Access Road',
    lat: 0.3148,
    lon: 32.5684,
    squadCount: 4,
    topSpeedKph: 85,
    deviceImei: '864201048999505',
  },
  {
    id: 'stn-wandegeya',
    stationName: 'Wandegeya Police Division',
    stationCode: 'UPF-KLA-WND-06',
    division: 'Kawempe Police Division',
    sector: 'Bombo Road / Wandegeya / Mulago Sector',
    district: 'Kampala',
    officerInCharge: 'Insp. Byaruhanga Dan (Sector Patrol Commander)',
    officerRank: 'Inspector of Police',
    phone: '+256 999 100206',
    plate: 'UP 9606',
    callsign: 'STATION-WANDEGEYA-ECHO',
    vehicleMake: 'Toyota',
    vehicleModel: 'Land Cruiser 79 Troop Carrier',
    vehicleColor: 'Police Blue & White',
    address: 'Bombo Road, Wandegeya Traffic Junction',
    lat: 0.3325,
    lon: 32.5714,
    squadCount: 5,
    topSpeedKph: 86,
    deviceImei: '864201048999606',
  },
  {
    id: 'stn-katwe',
    stationName: 'Katwe Police Division',
    stationCode: 'UPF-KLA-KTW-07',
    division: 'Katwe Police Division',
    sector: 'Entebbe Road / Katwe / Kibuye Sector',
    district: 'Kampala',
    officerInCharge: 'SP. Kyomugisha Allen (DPC Katwe)',
    officerRank: 'Superintendent of Police',
    phone: '+256 999 100207',
    plate: 'UP 9707',
    callsign: 'STATION-KATWE-SECTOR',
    vehicleMake: 'Toyota',
    vehicleModel: 'Hilux Tactical Response Unit',
    vehicleColor: 'High-Vis Reflective Blue',
    address: 'Entebbe Road, Katwe Police Station Grounds',
    lat: 0.2985,
    lon: 32.5712,
    squadCount: 6,
    topSpeedKph: 88,
    deviceImei: '864201048999707',
  },
  {
    id: 'stn-natete',
    stationName: 'Natete Police Division',
    stationCode: 'UPF-KLA-NAT-08',
    division: 'Rubaga Police Division',
    sector: 'Masaka Road / Natete / Busega Corridor',
    district: 'Kampala',
    officerInCharge: 'ASP. Ssekandi Emmanuel (OC Station)',
    officerRank: 'Assistant Superintendent of Police',
    phone: '+256 999 100208',
    plate: 'UP 9808',
    callsign: 'STATION-NATETE-BRAVO',
    vehicleMake: 'Ford',
    vehicleModel: 'Ranger Rapid Response Interceptor',
    vehicleColor: 'Police Matte Blue',
    address: 'Masaka Road, Natete Town Centre Hub',
    lat: 0.2935,
    lon: 32.5320,
    squadCount: 5,
    topSpeedKph: 90,
    deviceImei: '864201048999808',
  },
];

/**
 * Converts a PoliceStationPreset into a fully dispatchable Vehicle entity with real-time GPS telemetry
 */
export function presetToStationVehicle(preset: PoliceStationPreset): Vehicle {
  const cleanPlate = preset.plate.trim().toUpperCase();
  const plateNorm = cleanPlate.replace(/\s+/g, '');
  const vehicleId = `veh-stn-${preset.id}`;
  const deviceId = `dev-stn-${preset.id}`;

  return {
    id: vehicleId,
    plate: cleanPlate,
    plateNorm,
    make: preset.vehicleMake,
    model: preset.vehicleModel,
    color: preset.vehicleColor,
    category: 'police',
    district: preset.district,
    ownerId: `usr-police-${preset.id}`,
    ownerName: `Uganda Police Force (${preset.stationName})`,
    ownerPhone: preset.phone,
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    batteryPct: 98,
    ignition: true,
    deviceImei: preset.deviceImei,
    deviceStatus: 'online',
    isPatrol: true,
    isPoliceStation: true,
    stationName: preset.stationName,
    stationCode: preset.stationCode,
    callsign: preset.callsign,
    officerInCharge: preset.officerInCharge,
    assignedDivision: preset.division,
    jurisdictionSector: preset.sector,
    dispatchReadiness: 'ready',
    squadCount: preset.squadCount,
    patrolUnitType: 'station_qrf',
    topSpeedKph: preset.topSpeedKph,
    lastPosition: {
      deviceId,
      vehicleId,
      ts: new Date().toISOString(),
      lat: preset.lat,
      lon: preset.lon,
      speedKph: 55,
      heading: 90,
      ignition: true,
      address: `${preset.stationName} Base, ${preset.address}`,
    },
  };
}

/**
 * Returns all initial dispatchable police stations ready for metropolitan response
 */
export const MOCK_POLICE_STATIONS: Vehicle[] = POLICE_STATION_PRESETS.map(presetToStationVehicle);
