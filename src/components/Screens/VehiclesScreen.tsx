import React, { useState } from 'react';
import { Vehicle, VehicleCategory, VehicleStatus } from '../../types';
import { UGANDA_DISTRICTS } from '../../data/districts';
import { PlateTag } from '../PlateTag';
import { StatusPill } from '../StatusPill';
import {
  Car,
  Truck,
  Bus,
  Search,
  Battery,
  Zap,
  MapPin,
  Eye,
  ShieldAlert,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  Radio,
} from 'lucide-react';

interface VehiclesScreenProps {
  vehicles: Vehicle[];
  onSelectVehicle: (vehicle: Vehicle) => void;
  onReportStolen: (plate: string) => void;
  searchQuery?: string;
  onOpenRegisterModal?: () => void;
}

export const VehiclesScreen: React.FC<VehiclesScreenProps> = ({
  vehicles,
  onSelectVehicle,
  onReportStolen,
  searchQuery = '',
  onOpenRegisterModal,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | VehicleStatus | 'offline'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | VehicleCategory>('all');
  const [districtFilter, setDistrictFilter] = useState<string>('all');
  const [search, setSearch] = useState(searchQuery);

  React.useEffect(() => {
    if (searchQuery) setSearch(searchQuery);
  }, [searchQuery]);

  // Compute category counts
  const categoryCounts = {
    all: (vehicles || []).length,
    private: (vehicles || []).filter((v) => v.category === 'private').length,
    commercial: (vehicles || []).filter((v) => v.category === 'commercial').length,
    public: (vehicles || []).filter((v) => v.category === 'public').length,
  };

  // Compute status counts
  const statusCounts = {
    all: (vehicles || []).length,
    active: (vehicles || []).filter((v) => v.status === 'active').length,
    stolen: (vehicles || []).filter((v) => v.status === 'stolen').length,
    recovered: (vehicles || []).filter((v) => v.status === 'recovered').length,
    offline: (vehicles || []).filter((v) => v.deviceStatus === 'offline').length,
  };

  const filtered = vehicles.filter((v) => {
    // Status filter
    if (statusFilter === 'active' && v.status !== 'active') return false;
    if (statusFilter === 'stolen' && v.status !== 'stolen') return false;
    if (statusFilter === 'recovered' && v.status !== 'recovered') return false;
    if (statusFilter === 'offline' && v.deviceStatus !== 'offline') return false;

    // Category filter
    if (categoryFilter !== 'all' && v.category !== categoryFilter) return false;

    // District filter
    if (districtFilter !== 'all' && v.district !== districtFilter) return false;

    // Search query
    if (search) {
      const q = search.toLowerCase().trim();
      return (
        v.plate.toLowerCase().includes(q) ||
        v.make.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        v.ownerName.toLowerCase().includes(q) ||
        v.deviceImei.includes(q) ||
        (v.orgId && v.orgId.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const getCategoryBadge = (cat?: VehicleCategory) => {
    switch (cat) {
      case 'commercial':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <Truck className="w-3 h-3" />
            <span>Commercial</span>
          </span>
        );
      case 'public':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <Bus className="w-3 h-3" />
            <span>Public Transit</span>
          </span>
        );
      case 'private':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
            <Car className="w-3 h-3" />
            <span>Private</span>
          </span>
        );
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50 dark:bg-[#0F1218] text-gray-900 dark:text-gray-100 select-none">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header with Stats & Enroll Action Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-800 gap-3">
          <div>
            <h1 className="text-2xl font-bold font-heading uppercase tracking-wide flex items-center gap-2">
              <Car className="w-6 h-6 text-blue-600" />
              <span>Fleet &amp; Enrolled Vehicles</span>
            </h1>
            <p className="text-xs text-gray-500 font-mono">
              URA Vehicle Registry &amp; National GT06 Telemetry Stream ({(vehicles || []).length} Total Enrolled)
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onOpenRegisterModal && (
              <button
                onClick={onOpenRegisterModal}
                className="px-3.5 py-2 rounded-xl bg-[#B3261E] hover:bg-red-700 active:scale-98 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Enroll New Vehicle</span>
              </button>
            )}
          </div>
        </div>

        {/* Dual Filtering & Search Panel */}
        <div className="bg-white dark:bg-[#181C25] p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-2xs space-y-3">
          {/* Row 1: Category Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-[11px] font-bold uppercase text-gray-400 font-mono mr-1 hidden sm:inline">
                Category:
              </span>
              {[
                { id: 'all', label: 'All Categories', count: categoryCounts.all, icon: Filter },
                { id: 'private', label: 'Private Personal', count: categoryCounts.private, icon: Car },
                { id: 'commercial', label: 'Commercial Fleet', count: categoryCounts.commercial, icon: Truck },
                { id: 'public', label: 'Public Transit', count: categoryCounts.public, icon: Bus },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = categoryFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setCategoryFilter(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                        isActive
                          ? 'bg-white/25 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Universal Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search plate, make, IMEI, owner..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#0F1218] text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-[#B3261E]"
              />
            </div>
          </div>

          {/* Row 3: District Filter */}
          <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100 dark:border-gray-800 text-xs">
            <span className="text-[11px] font-bold uppercase text-gray-400 font-mono mr-1 hidden sm:inline">
              District:
            </span>
            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-none cursor-pointer"
            >
              <option value="all">All Districts</option>
              {UGANDA_DISTRICTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Vehicles Grid */}
        {filtered.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-[#181C25] rounded-2xl border border-gray-200 dark:border-gray-800 space-y-3">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto text-gray-400">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold font-heading uppercase text-gray-800 dark:text-gray-200">
              No Vehicles Found
            </h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              No enrolled vehicles match the current filter selection ({categoryFilter !== 'all' ? `Category: ${categoryFilter}` : ''}{' '}
              {statusFilter !== 'all' ? `Status: ${statusFilter}` : ''} {search ? `Search: "${search}"` : ''}).
            </p>
            {onOpenRegisterModal && (
              <button
                onClick={onOpenRegisterModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#B3261E] hover:bg-red-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Enroll New Vehicle</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((veh) => {
              const isStolen = veh.status === 'stolen';
              return (
                <div
                  key={veh.id}
                  className={`p-4 rounded-xl border bg-white dark:bg-[#181C25] shadow-xs space-y-3 transition-all ${
                    isStolen
                      ? 'border-red-500 ring-2 ring-red-500/20'
                      : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                  }`}
                >
                  {/* Top Bar: Plate + Category Badge + Status */}
                  <div className="flex items-center justify-between gap-2">
                    <PlateTag plate={veh.plate} size="md" />
                    <div className="flex items-center gap-1.5">
                      {getCategoryBadge(veh.category)}
                      <StatusPill status={veh.status} size="sm" />
                    </div>
                  </div>

                  {/* Vehicle Identity */}
                  <div>
                    <div className="font-bold text-sm text-gray-900 dark:text-gray-100 flex items-center justify-between">
                      <span>
                        {veh.make} {veh.model}
                      </span>
                      <span className="text-[11px] font-mono text-gray-400 font-normal">
                        {veh.color}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 font-mono mt-0.5 flex items-center justify-between">
                      <span>{veh.district} District</span>
                      {veh.orgId && (
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold uppercase">
                          {veh.orgId}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Telemetry Status Box */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-gray-50 dark:bg-[#13161D] p-2.5 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <Battery className={`w-3.5 h-3.5 ${veh.batteryPct < 20 ? 'text-red-500' : 'text-emerald-500'}`} />
                      <span>{veh.batteryPct}% Battery</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Zap className={`w-3.5 h-3.5 ${veh.ignition ? 'text-amber-500' : 'text-gray-400'}`} />
                      <span>{veh.ignition ? 'Ignition ON' : 'Engine OFF'}</span>
                    </div>
                    <div className="col-span-2 flex items-center gap-1.5 truncate text-gray-500">
                      <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      <span className="truncate">{veh.lastPosition?.address || 'Corridor waypoint active'}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => onSelectVehicle(veh)}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Inspect Telemetry</span>
                    </button>

                    {veh.status !== 'stolen' && (
                      <button
                        onClick={() => onReportStolen(veh.plate)}
                        className="py-1.5 px-3 rounded-lg bg-[#B3261E] hover:bg-red-700 text-xs font-bold text-white flex items-center gap-1 transition-colors cursor-pointer"
                        title="Report Vehicle Stolen"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">SOS</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
