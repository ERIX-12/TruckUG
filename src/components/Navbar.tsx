import React, { useState } from 'react';
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
  Menu,
  X,
  ChevronRight,
  Volume2,
  Mic,
  BarChart3,
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
  onOpenVoiceCommandModal?: () => void;
  onOpenAlertsSummaryModal?: () => void;
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
  onOpenVoiceCommandModal,
  onOpenAlertsSummaryModal,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

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

  const handleNavClick = (id: string) => {
    onScreenChange(id);
    setIsMobileMenuOpen(false);
    setShowMobileSearch(false);
  };

  return (
    <>
      {/* Top Navbar */}
      <header className="h-14 border-b bg-white dark:bg-[#181C25] border-gray-200 dark:border-[#2B313D] px-3 sm:px-4 flex items-center justify-between gap-2 shrink-0 z-40 select-none">
        {/* Brand & Plate Logo */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            className="md:hidden p-2 -ml-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg cursor-pointer"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Open Navigation Drawer"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div
            onClick={() => handleNavClick('map')}
            className="cursor-pointer flex items-center gap-2 group"
            title="TrackUG - Uganda National Fleet & ANPR Surveillance"
          >
            <div className="bg-[#B3261E] text-white px-2 py-1 rounded-md font-heading font-extrabold text-sm sm:text-base tracking-wider flex items-center gap-1 shadow-xs">
              <span>TRACK</span>
              <span className="bg-[#F2B705] text-[#1A1500] px-1 rounded text-[11px] sm:text-xs">UG</span>
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
        </div>

        {/* Desktop Navigation tabs */}
        <nav className="hidden md:flex items-center gap-1 overflow-x-auto py-1">
          {navItems
            .filter((item) => !item.roles || item.roles.includes(currentRole))
            .map((item) => {
              const Icon = item.icon;
              const isActive = activeScreen === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
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

        {/* Right Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Mobile Search Toggle Button */}
          <button
            onClick={() => setShowMobileSearch(!showMobileSearch)}
            className="sm:hidden p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
            title="Toggle Search"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Desktop Global Search */}
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

          {/* Role Selector Badge (Desktop) */}
          <div className="hidden sm:flex items-center gap-1 bg-gray-100 dark:bg-[#0F1218] border border-gray-300 dark:border-gray-700 rounded-md p-0.5 text-xs">
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

          {/* 24h Alerts Summary Visualization Button */}
          {onOpenAlertsSummaryModal && (
            <button
              onClick={onOpenAlertsSummaryModal}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60 cursor-pointer shadow-2xs transition-colors"
              title="24-Hour Telematics Alerts Summary (Speeding, Curfew, Harsh Braking)"
            >
              <BarChart3 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span className="hidden xl:inline text-xs font-bold">24h Summary</span>
            </button>
          )}

          {/* Voice Dispatch Command Button */}
          {onOpenVoiceCommandModal && (
            <button
              onClick={onOpenVoiceCommandModal}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 cursor-pointer shadow-2xs transition-colors"
              title="Voice Dispatch Command (e.g. 'Locate vehicle')"
            >
              <Mic className="w-3.5 h-3.5" />
              <span className="hidden lg:inline text-xs font-bold">Voice Command</span>
            </button>
          )}

          {/* Alert Bell */}
          <button
            onClick={() => handleNavClick('alerts')}
            className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 cursor-pointer"
            title="Alerts Inbox"
          >
            <Bell className="w-4 h-4" />
            {alertCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-red-600 ring-2 ring-white dark:ring-[#181C25] animate-pulse"></span>
            )}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 cursor-pointer"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Expandable Mobile Search Bar */}
      {showMobileSearch && (
        <div className="sm:hidden px-3 py-2 bg-white dark:bg-[#181C25] border-b border-gray-200 dark:border-gray-800 flex items-center gap-2 z-40 animate-in slide-in-from-top-2 duration-150">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search registration plate, IMEI, district..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-gray-100 dark:bg-[#0F1218] border border-gray-300 dark:border-gray-700 font-mono text-gray-900 dark:text-gray-100"
            />
          </div>
          <button
            onClick={() => setShowMobileSearch(false)}
            className="p-1.5 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 text-xs font-semibold"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Slide-over Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />

          {/* Drawer Menu Panel */}
          <div className="relative w-4/5 max-w-xs bg-white dark:bg-[#181C25] text-gray-900 dark:text-gray-100 h-full flex flex-col shadow-2xl z-10 border-r border-gray-200 dark:border-gray-800 animate-in slide-in-from-left duration-200 overflow-hidden">
            {/* Drawer Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50/80 dark:bg-[#12151D]">
              <div className="flex items-center gap-2">
                <div className="bg-[#B3261E] text-white px-2 py-0.5 rounded font-heading font-extrabold text-sm tracking-wider flex items-center gap-1">
                  <span>TRACK</span>
                  <span className="bg-[#F2B705] text-[#1A1500] px-1 rounded text-[10px]">UG</span>
                </div>
                <span className="font-heading font-bold text-xs uppercase tracking-wide">
                  Navigation Menu
                </span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Role Switcher in Drawer */}
            <div className="p-3 bg-gray-50 dark:bg-[#11141B] border-b border-gray-200 dark:border-gray-800 space-y-1">
              <div className="text-[10px] font-bold uppercase text-gray-400 font-mono flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-blue-500" /> Current Operational Role:
              </div>
              <select
                value={currentRole}
                onChange={(e) => {
                  onRoleChange(e.target.value as Role);
                }}
                className="w-full bg-white dark:bg-[#181C25] text-xs font-semibold p-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200 cursor-pointer"
              >
                <option value="agency">Agency (Uganda Police Force)</option>
                <option value="owner">Vehicle Owner (Citizen)</option>
                <option value="fleet_manager">Fleet Manager (Commercial)</option>
                <option value="admin">System Administrator</option>
              </select>
            </div>

            {/* Navigation Links */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {onOpenAlertsSummaryModal && (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenAlertsSummaryModal();
                  }}
                  className="flex w-full items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 mb-2 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span className="text-sm">24h Alerts Summary (Speed/Curfew/Brake)</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-600 text-white font-bold">
                    STATS
                  </span>
                </button>
              )}

              {onOpenVoiceCommandModal && (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenVoiceCommandModal();
                  }}
                  className="flex w-full items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 mb-2 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Mic className="w-4 h-4 shrink-0" />
                    <span className="text-sm">Voice Command Dispatch</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-600 text-white font-bold">
                    MIC
                  </span>
                </button>
              )}

              {navItems
                .filter((item) => !item.roles || item.roles.includes(currentRole))
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = activeScreen === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`flex w-full items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#B3261E] text-white shadow-xs'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="text-sm">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {item.badge !== undefined && item.badge > 0 && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                              isActive ? 'bg-white text-red-700' : 'bg-red-600 text-white'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 opacity-50" />
                      </div>
                    </button>
                  );
                })}
            </div>

            {/* Drawer Footer with Quick Toggles */}
            <div className="p-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#12151D] flex items-center justify-between text-xs">
              <button
                onClick={onToggleTheme}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 font-semibold cursor-pointer"
              >
                {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-500" />}
                <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
              </button>
              <span className="text-[10px] font-mono text-gray-400">v1.2.0 • DPPA</span>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar (Primary thumb destinations) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-[#181C25]/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 flex items-center justify-around py-1 px-1 shadow-lg select-none">
        {/* Tab 1: Map */}
        <button
          onClick={() => handleNavClick('map')}
          className={`flex flex-col items-center justify-center flex-1 py-1 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
            activeScreen === 'map'
              ? 'text-[#B3261E] dark:text-red-400 font-bold'
              : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          <MapPin className={`w-4 h-4 ${activeScreen === 'map' ? 'stroke-[2.5]' : ''}`} />
          <span className="mt-0.5">Live Map</span>
        </button>

        {/* Tab 2: Vehicles */}
        <button
          onClick={() => handleNavClick('vehicles')}
          className={`flex flex-col items-center justify-center flex-1 py-1 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
            activeScreen === 'vehicles'
              ? 'text-[#B3261E] dark:text-red-400 font-bold'
              : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          <Car className={`w-4 h-4 ${activeScreen === 'vehicles' ? 'stroke-[2.5]' : ''}`} />
          <span className="mt-0.5">Vehicles</span>
        </button>

        {/* Tab 3: Alerts */}
        <button
          onClick={() => handleNavClick('alerts')}
          className={`relative flex flex-col items-center justify-center flex-1 py-1 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
            activeScreen === 'alerts'
              ? 'text-[#B3261E] dark:text-red-400 font-bold'
              : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          <div className="relative">
            <AlertTriangle className={`w-4 h-4 ${activeScreen === 'alerts' ? 'stroke-[2.5]' : ''}`} />
            {alertCount > 0 && (
              <span className="absolute -top-1 -right-2 px-1 py-0.2 rounded-full text-[8px] font-bold bg-red-600 text-white font-mono">
                {alertCount}
              </span>
            )}
          </div>
          <span className="mt-0.5">Alerts</span>
        </button>

        {/* Tab 4: Stolen Cases */}
        <button
          onClick={() => handleNavClick('cases')}
          className={`flex flex-col items-center justify-center flex-1 py-1 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
            activeScreen === 'cases'
              ? 'text-[#B3261E] dark:text-red-400 font-bold'
              : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          <FolderLock className={`w-4 h-4 ${activeScreen === 'cases' ? 'stroke-[2.5]' : ''}`} />
          <span className="mt-0.5">Cases</span>
        </button>

        {/* Tab 5: More Menu */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className={`flex flex-col items-center justify-center flex-1 py-1 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
            isMobileMenuOpen
              ? 'text-[#B3261E] dark:text-red-400 font-bold'
              : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          <Menu className="w-4 h-4" />
          <span className="mt-0.5">More</span>
        </button>
      </nav>
    </>
  );
};
