export interface User {
  id: string;
  email: string;
  phone?: string;
  fullName: string;
  role: 'admin' | 'agency' | 'fleet_manager' | 'owner';
  orgId: string;
  disabledAt?: Date;
  createdAt: Date;
}
