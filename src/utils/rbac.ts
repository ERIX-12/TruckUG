import { Vehicle, Case, Role } from '../types';

export function filterVehiclesByRole(vehicles: Vehicle[], role: Role): Vehicle[] {
  switch (role) {
    case 'owner':
      // Owner only sees their registered vehicle(s)
      return vehicles.filter((v) => v.ownerId === 'usr-owner-1');
    case 'fleet_manager':
      // Fleet manager sees commercial fleet vehicles
      return vehicles.filter(
        (v) => v.ownerId === 'usr-fleet-1' || v.ownerName.includes('Logistics') || v.ownerName.includes('Security')
      );
    case 'agency':
    case 'admin':
    default:
      // Law enforcement and System admin see national vehicle fleet
      return vehicles;
  }
}

export function filterCasesByRole(cases: Case[], role: Role): Case[] {
  switch (role) {
    case 'owner':
      // Owner only sees cases involving their own vehicles
      return cases.filter((c) => c.vehicleId === 'veh-1' || c.ownerName.includes('Mugisha'));
    case 'fleet_manager':
      // Fleet manager only sees their commercial fleet's stolen cases
      return cases.filter((c) => c.ownerName.includes('Nile') || c.ownerName.includes('Apex'));
    case 'agency':
    case 'admin':
    default:
      // Police investigators and Admins see all active police dockets
      return cases;
  }
}

export function canAccessAuditLog(role: Role): boolean {
  return role === 'agency' || role === 'admin';
}

export function canManageHardware(role: Role): boolean {
  return role === 'agency' || role === 'admin' || role === 'fleet_manager';
}

export function canCreateGeofence(role: Role): boolean {
  return role === 'agency' || role === 'admin' || role === 'fleet_manager';
}
