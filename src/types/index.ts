export type Role = 'owner' | 'fleet_manager' | 'agency' | 'admin';

export type VehicleStatus = 'active' | 'stolen' | 'recovered';
export type VehicleCategory = 'private' | 'commercial' | 'public';

export interface Vehicle {
  id: string;
  plate: string;
  plateNorm: string;
  make: string;
  model: string;
  color: string;
  category: VehicleCategory;
  district: string;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  orgId?: string;
  status: VehicleStatus;
  createdAt: string;
  lastPosition?: Position;
  batteryPct: number;
  ignition: boolean;
  deviceImei: string;
  deviceStatus: 'online' | 'offline' | 'idle';
}

export interface Position {
  deviceId: string;
  vehicleId: string;
  ts: string;
  lat: number;
  lon: number;
  speedKph: number;
  heading: number;
  ignition: boolean;
  batteryPct?: number;
  address?: string;
}

export type AlertKind =
  | 'stolen_plate_seen'
  | 'stolen_device_moved'
  | 'geofence_enter'
  | 'geofence_exit'
  | 'curfew'
  | 'speed'
  | 'device_offline'
  | 'low_battery';

export type AlertSeverity = 'info' | 'warn' | 'critical';
export type AlertState = 'new' | 'ack' | 'closed';

export interface Alert {
  id: string;
  ts: string;
  kind: AlertKind;
  severity: AlertSeverity;
  vehicleId: string;
  plate: string;
  caseId?: string;
  source: 'device' | 'camera' | 'system';
  lat?: number;
  lon?: number;
  locationName?: string;
  state: AlertState;
  payload: {
    cameraName?: string;
    cameraId?: string;
    confidence?: number;
    speed?: number;
    speedLimit?: number;
    geofenceName?: string;
    snapshotUrl?: string;
    details?: string;
  };
}

export interface Case {
  id: string;
  vehicleId: string;
  plate: string;
  makeModel: string;
  ownerName: string;
  ownerPhone: string;
  reportedBy: string;
  policeRef: string;
  state: 'open' | 'recovered' | 'closed';
  openedAt: string;
  closedAt?: string;
  assignedOfficers: string[];
  lastSighting?: {
    cameraName: string;
    ts: string;
    confidence: number;
    snapshotUrl?: string;
    lat: number;
    lon: number;
  };
}

export interface PlateSighting {
  id: string;
  ts: string;
  cameraId: string;
  cameraName: string;
  plateRaw: string;
  plateNorm: string;
  confidence: number;
  snapshotUrl: string;
  matchedVehicleId?: string;
  reviewState: 'auto' | 'pending' | 'confirmed' | 'rejected';
  lat: number;
  lon: number;
}

export interface Geofence {
  id: string;
  name: string;
  ownerUserId: string;
  rule: 'enter' | 'exit' | 'curfew' | 'speed';
  params: {
    speedLimit?: number;
    curfewStart?: string;
    curfewEnd?: string;
    timezone?: string;
  };
  coordinates: [number, number][]; // [lat, lon]
  active: boolean;
  vehicleCount: number;
}

export interface Device {
  id: string;
  vehicleId?: string;
  vehiclePlate?: string;
  imei: string;
  protocol: 'gt06' | 'http_json';
  secretHash: string;
  lastSeenAt: string;
  batteryPct: number;
  status: 'online' | 'offline';
}

export interface Camera {
  id: string;
  name: string;
  lat: number;
  lon: number;
  secretHash: string;
  lastSeenAt: string;
  status: 'active' | 'offline';
  todayReadsCount: number;
}

export interface AuditEvent {
  id: string;
  ts: string;
  actorId: string;
  actorName: string;
  actorRole: Role;
  action: string;
  targetType: string;
  targetId: string;
  reason: string;
  ip: string;
}

export interface ShareLink {
  id: string;
  vehicleId: string;
  token: string;
  expiresAt: string;
  createdBy: string;
  createdAt: string;
}
