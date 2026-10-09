import React, { useState } from 'react';
import { Vehicle, VehicleCategory, Role, Device } from '../../types';
import { PlateTag } from '../PlateTag';
import { UGANDA_CORRIDORS, getDistrictFromCorridor } from '../../utils/geoRules';
import { POLICE_STATION_PRESETS } from '../../data/mockPoliceStations';
import {
  X,
  Car,
  Truck,
  Bus,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Radio,
  MapPin,
  User,
  Phone,
  Building2,
  Cpu,
  Sparkles,
  Info,
  Siren,
  Shield,
} from 'lucide-react';

interface RegisterVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister: (vehicle: Vehicle, corridor: string, device?: Device) => void;
  currentRole: Role;
}

const COMMON_MAKES = [
  'Toyota',
  'Isuzu',
  'Nissan',
  'Bajaj',
  'TVS',
  'Mitsubishi',
  'Mercedes-Benz',
  'Scania',
  'Hyundai',
  'Honda',
];

const BODY_TYPES = [
  { id: 'sedan', label: 'Saloon / Sedan' },
  { id: 'suv', label: 'SUV / 4x4' },
  { id: 'pickup', label: 'Pickup Truck' },
  { id: 'motorcycle', label: 'Motorcycle / Boda' },
  { id: 'minibus', label: 'Minibus / Matatu' },
  { id: 'truck', label: 'Heavy Cargo Truck' },
  { id: 'bus', label: 'Transit Bus' },
];

const POPULAR_COLORS = [
  'Silver Metallic',
  'Commercial White',
  'Pearl White',
  'Midnight Black',
  'Gloss Red',
  'Royal Blue',
  'Charcoal Grey',
  'Golden Bronze',
  'White & Blue Stripes',
];

export const RegisterVehicleModal: React.FC<RegisterVehicleModalProps> = ({
  isOpen,
  onClose,
  onRegister,
  currentRole,
}) => {
  // Category
  const [category, setCategory] = useState<VehicleCategory>(
    currentRole === 'fleet_manager' ? 'commercial' : 'private'
  );

  // Form fields
  const [plate, setPlate] = useState('');
  const [make, setMake] = useState('Toyota');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('Silver Metallic');
  const [bodyType, setBodyType] = useState('sedan');
  const [year, setYear] = useState('2022');
  const [nin, setNin] = useState('');

  // Ownership
  const [ownerName, setOwnerName] = useState(
    currentRole === 'owner' ? 'Mugisha Dennis' : currentRole === 'fleet_manager' ? 'Nile Logistics Ltd' : ''
  );
  const [ownerPhone, setOwnerPhone] = useState('+256 7');
  const [orgName, setOrgName] = useState(
    category === 'commercial' ? 'Nile Logistics Ltd' : category === 'public' ? 'Kampala City Transporters' : ''
  );

  // Telemetry Hardware
  const [imei, setImei] = useState(() => `864201048${Math.floor(100000 + Math.random() * 900000)}`);
  const [protocol, setProtocol] = useState<'gt06' | 'http_json'>('gt06');
  const [corridor, setCorridor] = useState<string>('jinja_road');
  const [batteryPct, setBatteryPct] = useState<number>(95);
  const [ignition, setIgnition] = useState<boolean>(true);

  // Validation & Submission
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleGenerateImei = () => {
    const random15 = `86420104${Math.floor(1000000 + Math.random() * 9000000)}`;
    setImei(random15);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    // Plate format: standard Ugandan plates e.g. UBG 123A or UAX 892K
    const cleanPlate = plate.trim().toUpperCase();
    if (!cleanPlate) {
      newErrors.plate = 'Registration number plate is required.';
    } else if (cleanPlate.length < 5 || cleanPlate.length > 10) {
      newErrors.plate = 'Please enter a valid Ugandan plate format (e.g. UBG 123A).';
    }

    if (!make.trim()) newErrors.make = 'Make is required.';
    if (!model.trim()) newErrors.model = 'Vehicle model is required (e.g. Premio, HiAce, Boxer).';
    if (!ownerName.trim()) newErrors.ownerName = 'Owner / Organization name is required.';
    if (!ownerPhone.trim() || ownerPhone.length < 9) {
      newErrors.ownerPhone = 'Valid Ugandan contact number required (e.g. +256 772 123456).';
    }

    if (!imei.trim() || !/^\d{15}$/.test(imei.trim())) {
      newErrors.imei = 'IMEI must be exactly 15 numeric digits.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    const cleanPlate = plate.trim().toUpperCase();
    const plateNorm = cleanPlate.replace(/\s+/g, '');
    const vehicleId = `veh-${Date.now().toString().slice(-6)}`;
    const deviceId = `dev-${Date.now().toString().slice(-6)}`;

    // Pick initial waypoint based on corridor
    const waypoints = UGANDA_CORRIDORS[corridor] || UGANDA_CORRIDORS.northern_bypass || UGANDA_CORRIDORS.kampala_jinja_road || Object.values(UGANDA_CORRIDORS)[0];
    const initialWaypoint = waypoints?.[0] || {
      lat: 0.314,
      lon: 32.582,
      heading: 85,
      roadName: 'Jinja Road, Kampala',
      speedLimit: 50,
    };
    const district = getDistrictFromCorridor(corridor);

    const newVehicle: Vehicle = {
      id: vehicleId,
      plate: cleanPlate,
      plateNorm,
      make: make.trim(),
      model: model.trim(),
      color,
      category,
      district,
      ownerId: currentRole === 'owner' ? 'usr-owner-1' : currentRole === 'fleet_manager' ? 'usr-fleet-1' : `usr-${Date.now().toString().slice(-4)}`,
      ownerName: ownerName.trim(),
      ownerPhone: ownerPhone.trim(),
      orgId: orgName.trim() ? orgName.trim().toLowerCase().replace(/\s+/g, '-') : undefined,
      status: 'active',
      createdAt: new Date().toISOString(),
      batteryPct,
      ignition,
      deviceImei: imei.trim(),
      deviceStatus: 'online',
      isPatrol: category === 'police',
      callsign: category === 'police' ? `PATROL-${cleanPlate.replace(/\s+/g, '')}` : undefined,
      officerInCharge: category === 'police' ? 'Uganda Police Force Patrol Commander' : undefined,
      assignedDivision: category === 'police' ? 'Kampala Metropolitan Police Command' : undefined,
      patrolUnitType: category === 'police' ? 'flying_squad' : undefined,
      topSpeedKph: category === 'police' ? 92 : undefined,
      lastPosition: {
        deviceId,
        vehicleId,
        ts: new Date().toISOString(),
        lat: initialWaypoint.lat,
        lon: initialWaypoint.lon,
        speedKph: ignition ? initialWaypoint.speedLimit - 5 : 0,
        heading: initialWaypoint.heading,
        ignition,
        batteryPct,
        address: `${initialWaypoint.roadName} (Registered Corridor)`,
      },
    };

    const newDevice: Device = {
      id: deviceId,
      vehicleId,
      vehiclePlate: cleanPlate,
      imei: imei.trim(),
      protocol,
      secretHash: `sha256:${Math.random().toString(36).substring(2)}...`,
      lastSeenAt: new Date().toISOString(),
      batteryPct,
      status: 'online',
    };

    setTimeout(() => {
      onRegister(newVehicle, corridor, newDevice);
      setIsSubmitting(false);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs select-none overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#181C25] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden my-6 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50/80 dark:bg-[#13161D]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#B3261E] text-white flex items-center justify-center shadow-md">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-heading uppercase text-gray-900 dark:text-gray-100 tracking-wide">
                  Enroll New Vehicle
                </h2>
                <span className="text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 px-2 py-0.5 rounded-full">
                  URA / UPF INDEX
                </span>
              </div>
              <p className="text-xs text-gray-500 font-mono">
                Bind GPS IoT tracking hardware &amp; assign Kampala transit corridor
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Category Selector Tabs */}
          <div>
            <label className="block text-xs font-bold uppercase text-gray-700 dark:text-gray-300 mb-2">
              Vehicle Classification &amp; Operational Category *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Private */}
              <button
                type="button"
                onClick={() => setCategory('private')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  category === 'private'
                    ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-gray-50/50 dark:bg-[#12151C]'
                }`}
              >
                <div
                  className={`p-2 rounded-lg ${
                    category === 'private'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <Car className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase">Private</div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400">
                    Personal cars, SUVs
                  </div>
                </div>
              </button>

              {/* Commercial */}
              <button
                type="button"
                onClick={() => setCategory('commercial')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  category === 'commercial'
                    ? 'border-amber-600 bg-amber-50/80 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/20 shadow-xs'
                    : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-gray-50/50 dark:bg-[#12151C]'
                }`}
              >
                <div
                  className={`p-2 rounded-lg ${
                    category === 'commercial'
                      ? 'bg-amber-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase">Commercial</div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400">
                    Fleets, haulers
                  </div>
                </div>
              </button>

              {/* Public Transit */}
              <button
                type="button"
                onClick={() => setCategory('public')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  category === 'public'
                    ? 'border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-gray-50/50 dark:bg-[#12151C]'
                }`}
              >
                <div
                  className={`p-2 rounded-lg ${
                    category === 'public'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <Bus className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase">Public Transit</div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400">
                    Matatus, buses
                  </div>
                </div>
              </button>

              {/* Police Station / UPF Patrol */}
              <button
                type="button"
                onClick={() => {
                  setCategory('police');
                  if (!plate || !plate.startsWith('UP')) setPlate('UP ');
                  setOwnerName('Uganda Police Force');
                  setMake('Toyota');
                  setModel('Land Cruiser 79 Tactical Command');
                  setColor('Police Blue & White');
                }}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  category === 'police'
                    ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-gray-50/50 dark:bg-[#12151C]'
                }`}
              >
                <div
                  className={`p-2 rounded-lg ${
                    category === 'police'
                      ? 'bg-blue-900 text-amber-300'
                      : 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase">Police Station / UPF</div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400">
                    Stations &amp; interceptors
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Section 1: Number Plate & Live Preview */}
          <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-[#13161D] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1">
                <label className="block text-xs font-bold uppercase text-gray-700 dark:text-gray-300 mb-1">
                  Registration Number Plate *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={plate}
                    onChange={(e) => setPlate(e.target.value.toUpperCase())}
                    placeholder="e.g. UBG 123A"
                    maxLength={10}
                    className="w-full uppercase font-mono font-bold text-sm px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#181C25] focus:outline-hidden focus:ring-2 focus:ring-[#B3261E]"
                  />
                </div>
                {errors.plate && (
                  <p className="text-[11px] text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {errors.plate}
                  </p>
                )}
              </div>

              {/* Live Ugandan Plate Renderer */}
              <div className="flex flex-col items-center sm:items-end justify-center">
                <span className="text-[10px] font-mono text-gray-500 uppercase mb-1">
                  Live Plate Preview
                </span>
                <PlateTag plate={plate.trim() || 'UB_ ___'} size="lg" />
              </div>
            </div>
          </div>

          {/* Section 2: Vehicle Specs (Make, Model, Body, Color) */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5 text-blue-600" />
              Vehicle Specifications
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Make */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Make *
                </label>
                <select
                  value={make}
                  onChange={(e) => setMake(e.target.value)}
                  className="w-full text-xs px-2.5 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#181C25] font-medium"
                >
                  {COMMON_MAKES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                  <option value="Other">Other Make</option>
                </select>
              </div>

              {/* Model */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Model / Variant *
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g. Premio, Forward 10T"
                  className="w-full text-xs px-2.5 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#181C25]"
                />
                {errors.model && (
                  <p className="text-[10px] text-red-600 dark:text-red-400 mt-0.5">{errors.model}</p>
                )}
              </div>

              {/* Body Type */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Body Style
                </label>
                <select
                  value={bodyType}
                  onChange={(e) => setBodyType(e.target.value)}
                  className="w-full text-xs px-2.5 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#181C25]"
                >
                  {BODY_TYPES.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Color */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Primary Color
                </label>
                <select
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full text-xs px-2.5 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#181C25]"
                >
                  {POPULAR_COLORS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Manufacture Year
                </label>
                <input
                  type="number"
                  min="1995"
                  max="2026"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full text-xs px-2.5 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#181C25] font-mono"
                />
              </div>

              {/* National ID / TIN */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  NIN / URA Tax PIN
                </label>
                <input
                  type="text"
                  value={nin}
                  onChange={(e) => setNin(e.target.value.toUpperCase())}
                  placeholder="e.g. CM9802318898"
                  className="w-full text-xs px-2.5 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#181C25] font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Owner & Fleet Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-600" />
              Ownership &amp; Fleet Organization
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Registered Owner Full Name *
                </label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="e.g. Mugisha Dennis or Nile Logistics Ltd"
                  className="w-full text-xs px-2.5 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#181C25]"
                />
                {errors.ownerName && (
                  <p className="text-[10px] text-red-600 dark:text-red-400 mt-0.5">{errors.ownerName}</p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Contact Phone Number *
                </label>
                <input
                  type="tel"
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                  placeholder="+256 7XX XXXXXX"
                  className="w-full text-xs px-2.5 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#181C25] font-mono"
                />
                {errors.ownerPhone && (
                  <p className="text-[10px] text-red-600 dark:text-red-400 mt-0.5">{errors.ownerPhone}</p>
                )}
              </div>
            </div>

            {/* Fleet / Organization (Required for Commercial or Public) */}
            {(category === 'commercial' || category === 'public') && (
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Fleet Name / Operating Company
                </label>
                <div className="relative">
                  <Building2 className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g. Nile Logistics Ltd, Apex Security Transit, Pioneer Bus"
                    className="w-full pl-8 pr-2.5 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#181C25]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 4: GPS Telemetry Hardware & Corridor Assignment */}
          <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-[#13161D] space-y-3">
            <h3 className="text-xs font-bold uppercase text-gray-700 dark:text-gray-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-red-600" />
                GPS Telemetry IoT Tracker Binding
              </span>
              <button
                type="button"
                onClick={handleGenerateImei}
                className="text-[11px] font-normal text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                Generate Test IMEI
              </button>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* IMEI */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Tracker IMEI (15 digits) *
                </label>
                <input
                  type="text"
                  maxLength={15}
                  value={imei}
                  onChange={(e) => setImei(e.target.value.replace(/\D/g, ''))}
                  placeholder="864201048XXXXXX"
                  className="w-full text-xs px-2.5 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#181C25] font-mono tracking-wider"
                />
                {errors.imei && (
                  <p className="text-[10px] text-red-600 dark:text-red-400 mt-0.5">{errors.imei}</p>
                )}
              </div>

              {/* Protocol */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Data Gateway Ingestion Protocol
                </label>
                <select
                  value={protocol}
                  onChange={(e) => setProtocol(e.target.value as any)}
                  className="w-full text-xs px-2.5 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#181C25] font-mono"
                >
                  <option value="gt06">GT06 Binary TCP (Port 5023)</option>
                  <option value="http_json">Signed HTTP/JSON Webhook</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Corridor */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Operating Arterial Corridor (Uganda)
                </label>
                <select
                  value={corridor}
                  onChange={(e) => setCorridor(e.target.value)}
                  className="w-full text-xs px-2.5 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#181C25]"
                >
                  <option value="northern_bypass">Northern Bypass (Wakiso - Busega - Kalerwe)</option>
                  <option value="kampala_jinja_road">Kampala - Jinja Road (Mukono - Jinja)</option>
                  <option value="jinja_road">Jinja Road (Wampewo - Nakawa - Kireka)</option>
                  <option value="cbd_loop">Kampala CBD Loop (Posta - Parliament - Mulago)</option>
                  <option value="entebbe_road">Entebbe Road (Clock Tower - Kibuye - Zana)</option>
                  <option value="mbale_tororo_road">Mbale - Tororo Corridor (Eastern Region)</option>
                  <option value="mbarara_fortportal_road">Mbarara - Fort Portal Road (Western Region)</option>
                  <option value="gulu_corridor">Gulu City Corridor (Northern Region)</option>
                  <option value="aru_corridor">Arua City Corridor (West Nile)</option>
                </select>
              </div>

              {/* Initial Ignition & Battery */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Initial Status ({batteryPct}% Battery)
                </label>
                <div className="flex items-center gap-3 py-1">
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="ignition"
                      checked={ignition === true}
                      onChange={() => setIgnition(true)}
                      className="text-red-600 focus:ring-red-500"
                    />
                    <span className="text-emerald-600 font-bold">Engine ON (In Transit)</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="ignition"
                      checked={ignition === false}
                      onChange={() => setIgnition(false)}
                      className="text-red-600 focus:ring-red-500"
                    />
                    <span className="text-gray-500">Parked (OFF)</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Statutory Privacy Declaration */}
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-200">
            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong>Statutory Compliance (Section 43 DPPA 2019):</strong> By registering this vehicle,
              telemetry data will be securely processed and protected. Access by law enforcement agencies
              requires an active warrant or police incident docket, and will be logged to the immutable
              audit ledger.
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-gray-200 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-[#B3261E] hover:bg-red-700 active:scale-98 rounded-lg shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Enrolling Vehicle...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Complete Registration &amp; Provision Tracker</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
