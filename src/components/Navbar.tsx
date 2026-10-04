import React from 'react';
import { Role } from '../types';
import {
  Bell,
  Search,
  Sun,
  Moon,
  Shield,
  Radio,
  MapPin,
  Car,
  AlertTriangle,
  FolderLock,
  Camera,
  Layers,
  Smartphone,
  FileText,
  Settings,
  UserCheck,
} from 'lucide-react';

interface NavbarProps {
  currentRole: Role;
  onRoleChange: (role: Role) => void;
  activeScreen: string;
  onScreenChange: (screen: string) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  alertCount: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  onRoleChange,
  activeScreen,
  onScreenChange,
  isDark,
  onToggleTheme,
  alertCount,
  searchQuery,
  onSearchChange,
}) => {
  const navItems = [
    { id: 'map', label: 'Live Map', icon: MapPin },
    { id: 'vehicles', label: 'Vehicles', icon: Car },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle, badge: alertCount },
    { id: 'cases', label: 'Stolen Cases', icon: FolderLock },
    { id: 'review', label: 'ANPR Review', icon: Camera },
    { id: 'geofences', label: 'Geofences', icon: Layers },
    { id: 'devices', label: 'Devices & Cams', icon: Radio },
    { id: 'owner', label: 'Owner View', icon: Smartphone },
    { id: 'audit', label: 'Audit Log', icon: FileText, roles: ['admin'] },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header className="h-14 border-b bg-white dark:bg-[#181C25] border-gray-200 dark:border-[#2B313D] px-3 sm:px-4 flex items-center justify-between gap-2 shrink-0 z-40 select-none">
      {/* Brand & Plate Logo */}
      <div className="flex items-center gap-3">
        <div
          onClick={() => onScreenChange('map')}
          className="cursor-pointer flex items-center gap-2 group"
          title="TrackUG - Innovation Challenge Prototype"
        >
          <div className="bg-[#B3261E] text-white px-2 py-1 rounded font-heading font-extrabold text-base tracking-wider flex items-center gap-1 shadow-sm">
            <span>TRACK</span>
            <span className="bg-[#F2B705] text-[#1A1500] px-1 rounded text-xs">UG</span>
          </div>
          <div className="hidden lg:block leading-none">
            <div className="font-heading font-bold text-sm tracking-wide text-gray-900 dark:text-white uppercase">
              Uganda Fleet &amp; ANPR
            </div>
            <div className="text-[10px] text-gray-500 font-mono tracking-tighter">
              KAMPALA METRO DEFENSE
            </div>
          </div>
        </div>

        {/* Live Stream Ticker */}
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span className="font-mono font-bold">LIVE:</span>
          <span>5023/TCP GT06 &amp; Redis Streams</span>
        </div>
      </div>

      {/* Navigation tabs */}
      <nav className="hidden md:flex items-center gap-1 overflow-x-auto py-1">
        {navItems
          .filter((item) => !item.roles || item.roles.includes(currentRole))
          .map((item) => {
            const Icon = item.icon;
            const isActive = activeScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onScreenChange(item.id)}
                className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-[#B3261E] text-white shadow-xs'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-white text-red-700' : 'bg-red-600 text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
      </nav>

      {/* Right Controls: Search, Role Switcher, Alert Bell, Theme */}
      <div className="flex items-center gap-2">
        {/* Global Search */}
        <div className="relative hidden sm:block w-36 lg:w-48">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search plate / IMEI..."
            className="w-full pl-8 pr-2.5 py-1 text-xs rounded-md bg-gray-100 dark:bg-[#0F1218] border border-gray-300 dark:border-gray-700 focus:outline-hidden focus:ring-1 focus:ring-red-500 font-mono"
          />
        </div>

        {/* Role Selector Badge */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#0F1218] border border-gray-300 dark:border-gray-700 rounded-md p-0.5 text-xs">
          <UserCheck className="w-3.5 h-3.5 ml-1 text-gray-500" />
          <select
            value={currentRole}
            onChange={(e) => onRoleChange(e.target.value as Role)}
            className="bg-transparent text-xs font-semibold py-1 pr-1 text-gray-700 dark:text-gray-200 focus:outline-hidden cursor-pointer"
            title="Switch Simulated User Role"
          >
            <option value="agency">Agency (Police)</option>
            <option value="owner">Vehicle Owner</option>
            <option value="fleet_manager">Fleet Manager</option>
            <option value="admin">System Admin</option>
          </select>
        </div>

        {/* Alert Bell */}
        <button
          onClick={() => onScreenChange('alerts')}
          className="relative p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
          title="Alerts Inbox"
        >
          <Bell className="w-4 h-4" />
          {alertCount > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-red-600 ring-2 ring-white dark:ring-[#181C25]"></span>
          )}
        </button>

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
