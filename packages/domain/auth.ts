export type Role = 'admin' | 'agency' | 'fleet_manager' | 'owner';

export interface User {
  id: string;
  email: string;
  role: Role;
  orgId: string;
}

export const canPerformAction = (
  user: User,
  action: string,
  targetContext?: { ownerId?: string; caseAssignedTo?: string }
): boolean => {
  // Default deny
  if (user.role === 'admin') return true;

  switch (action) {
    case 'read_own_vehicles':
      return ['owner', 'fleet_manager'].includes(user.role);
    case 'report_stolen':
      return ['owner', 'fleet_manager'].includes(user.role);
    // Add other RBAC rules based on the spec
    default:
      return false;
  }
};
