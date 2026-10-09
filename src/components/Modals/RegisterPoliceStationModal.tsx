import React, { useState } from 'react';
import { Vehicle } from '../../types';
import { PlateTag } from '../PlateTag';
import {
  POLICE_STATION_PRESETS,
  PoliceStationPreset,
  presetToStationVehicle,
} from '../../data/mockPoliceStations';
import {
  Building2,
  ShieldAlert,
  Radio,
  MapPin,
  X,
  Plus,
  CheckCircle,
  Siren,
  Users,
  Compass,
  Zap,
  ChevronRight,
  Shield,
  Layers,
} from 'lucide-react';

interface RegisterPoliceStationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegisterStation: (stationVehicle: Vehicle) => void;
  onBatchRegisterStations?: (stationVehicles: Vehicle[]) => void;
  existingStationIds?: string[];
}

export const RegisterPoliceStationModal: React.FC<RegisterPoliceStationModalProps> = ({
  isOpen,
  onClose,
  onRegisterStation,
  onBatchRegisterStations,
  existingStationIds = [],
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets');

  // Custom station form state
  const [stationName, setStationName] = useState('');
  const [stationCode, setStationCode] = useState('');
  const [division, setDivision] = useState('Kampala Metropolitan Division');
  const [sector, setSector] = useState('Metropolitan Arterial Sector');
  const [district, setDistrict] = useState('Kampala');
  const [officerInCharge, setOfficerInCharge] = useState('');
  const [officerRank, setOfficerRank] = useState('Superintendent of Police (SP)');
  const [phone, setPhone] = useState('+256 999 ');
  const [plate, setPlate] = useState('UP ');
  const [callsign, setCallsign] = useState('');
  const [vehicleMake, setVehicleMake] = useState('Toyota');
  const [vehicleModel, setVehicleModel] = useState('Land Cruiser 79 Tactical Interceptor');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState<number>(0.318);
  const [lon, setLon] = useState<number>(32.585);
  const [squadCount, setSquadCount] = useState<number>(5);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: PoliceStationPreset) => {
    const stationVehicle = presetToStationVehicle(preset);
    onRegisterStation(stationVehicle);
    setSuccessMessage(`Successfully registered ${preset.stationName} (Callsign: ${preset.callsign})!`);
    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 900);
  };

  const handleBatchRegisterAll = () => {
    const allStations = POLICE_STATION_PRESETS.map(presetToStationVehicle);
    if (onBatchRegisterStations) {
      onBatchRegisterStations(allStations);
    } else {
      allStations.forEach((stn) => onRegisterStation(stn));
    }
    setSuccessMessage(`Registered all ${allStations.length} Uganda Police Metropolitan Stations!`);
    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 1100);
  };

  const validateCustom = () => {
    const errs: Record<string, string> = {};
    if (!stationName.trim()) errs.stationName = 'Station name is required.';
    if (!officerInCharge.trim()) errs.officerInCharge = 'Officer in Charge is required.';
    if (!plate.trim() || plate.trim().length < 5) errs.plate = 'Valid UP police plate required (e.g. UP 9901).';
    if (!callsign.trim()) errs.callsign = 'Tactical call sign is required.';
    if (!address.trim()) errs.address = 'Station base address required.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCustom()) return;

    const cleanPlate = plate.trim().toUpperCase();
    const cleanCallsign = callsign.trim().toUpperCase();
    const stnId = `custom-${Date.now().toString().slice(-6)}`;
    const vehicleId = `veh-stn-${stnId}`;
    const deviceId = `dev-stn-${stnId}`;

    const newStationVehicle: Vehicle = {
      id: vehicleId,
      plate: cleanPlate,
      plateNorm: cleanPlate.replace(/\s+/g, ''),
      make: vehicleMake,
      model: vehicleModel,
      color: 'Police Blue & White',
      category: 'police',
      district,
      ownerId: `usr-police-${stnId}`,
      ownerName: `Uganda Police Force (${stationName.trim()})`,
      ownerPhone: phone.trim() || '+256 999 000000',
      status: 'active',
      createdAt: new Date().toISOString(),
      batteryPct: 99,
      ignition: true,
      deviceImei: `864201049${Math.floor(100000 + Math.random() * 900000)}`,
      deviceStatus: 'online',
      isPatrol: true,
      isPoliceStation: true,
      stationName: stationName.trim(),
      stationCode: stationCode.trim() || `UPF-KLA-${cleanPlate.replace(/\s+/g, '')}`,
      callsign: cleanCallsign,
      officerInCharge: `${officerRank} ${officerInCharge.trim()}`,
      assignedDivision: division.trim(),
      jurisdictionSector: sector.trim(),
      dispatchReadiness: 'ready',
      squadCount,
      patrolUnitType: 'station_qrf',
      topSpeedKph: 90,
      lastPosition: {
        deviceId,
        vehicleId,
        ts: new Date().toISOString(),
        lat: Number(lat) || 0.315,
        lon: Number(lon) || 32.582,
        speedKph: 60,
        heading: 90,
        ignition: true,
        address: `${stationName.trim()} Base, ${address.trim()}`,
      },
    };

    onRegisterStation(newStationVehicle);
    setSuccessMessage(`Registered station ${stationName.trim()} with intercept unit ${cleanPlate}!`);
    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150 select-none">
      <div className="relative w-full max-w-2xl max-h-[calc(100vh-32px)] flex flex-col rounded-2xl bg-white dark:bg-[#131722] border border-blue-500/50 shadow-2xl text-gray-900 dark:text-gray-100 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-gray-800 bg-linear-to-r from-blue-950 via-slate-900 to-blue-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600/40 border border-blue-400/40 text-blue-300">
              <Building2 className="w-6 h-6 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300">
                  UGANDA POLICE FORCE • METROPOLITAN COMMAND
                </span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-600 text-white">
                  DISPATCH BASE
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold font-heading uppercase tracking-wide">
                Register Mock Police Station
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert Banner */}
        {successMessage && (
          <div className="bg-emerald-600 text-white px-4 py-2.5 flex items-center gap-2 text-xs font-bold animate-in slide-in-from-top-2 duration-150">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-3 sm:px-4 bg-gray-50 dark:bg-[#161A24] flex-wrap sm:flex-nowrap gap-2 py-1 sm:py-0">
          <div className="flex gap-1 sm:gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('presets')}
              className={`py-2.5 sm:py-3 px-2.5 sm:px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'presets'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Shield className="w-3.5 h-3.5 shrink-0" />
              <span>
                <span className="sm:hidden">Presets ({POLICE_STATION_PRESETS.length})</span>
                <span className="hidden sm:inline">Metropolitan Presets ({POLICE_STATION_PRESETS.length})</span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('custom')}
              className={`py-2.5 sm:py-3 px-2.5 sm:px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'custom'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>
                <span className="sm:hidden">Custom</span>
                <span className="hidden sm:inline">Custom Station</span>
              </span>
            </button>
          </div>

          {activeTab === 'presets' && (
            <button
              onClick={handleBatchRegisterAll}
              className="py-1 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors whitespace-nowrap shrink-0 ml-auto sm:ml-0"
              title="Register all 8 official Kampala Metropolitan police stations"
            >
              <Layers className="w-3 h-3" />
              <span>Batch Register All (8)</span>
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {activeTab === 'presets' ? (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex items-start gap-3">
                <Radio className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="text-[11px] text-gray-700 dark:text-gray-300 leading-relaxed">
                  Select an official Uganda Police Force metropolitan station to register it into the live fleet. Once registered, its tactical quick reaction force (QRF) interceptor unit can be immediately dispatched by the system with live ETA tracking.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {POLICE_STATION_PRESETS.map((preset) => {
                  const isAlreadyRegistered = existingStationIds.includes(`veh-stn-${preset.id}`);
                  return (
                    <div
                      key={preset.id}
                      className={`p-3.5 rounded-xl border transition-all text-left flex flex-col justify-between gap-3 ${
                        isAlreadyRegistered
                          ? 'border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20'
                          : 'border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-[#161B26] hover:border-blue-500/60 hover:shadow-md'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="font-bold text-xs text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                            {preset.stationName}
                          </span>
                          <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold shrink-0">
                            {preset.stationCode}
                          </span>
                        </div>

                        <div className="text-[11px] text-gray-500 dark:text-gray-400 mb-2">
                          {preset.sector}
                        </div>

                        <div className="space-y-1 font-mono text-[10px] bg-black/5 dark:bg-black/30 p-2 rounded-lg border border-black/5 dark:border-white/5">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Commander:</span>
                            <span className="font-semibold text-gray-800 dark:text-gray-200 truncate max-w-[150px]">
                              {preset.officerInCharge}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Interceptor:</span>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              {preset.vehicleMake} {preset.vehicleModel}
                            </span>
                          </div>
                          <div className="flex justify-between items-center pt-0.5">
                            <span className="text-gray-500">Patrol Plate:</span>
                            <PlateTag plate={preset.plate} size="sm" />
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className={`w-full py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          isAlreadyRegistered
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                        }`}
                      >
                        {isAlreadyRegistered ? (
                          <>
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Re-deploy / Refresh Station</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Register &amp; Deploy Station</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <form onSubmit={handleCustomSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-700 dark:text-gray-300 mb-1">
                    Police Station Name *
                  </label>
                  <input
                    type="text"
                    value={stationName}
                    onChange={(e) => setStationName(e.target.value)}
                    placeholder="e.g. Mukono Central Police Division"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1A1F2C] text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  {errors.stationName && (
                    <span className="text-[10px] text-red-500 font-bold">{errors.stationName}</span>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-700 dark:text-gray-300 mb-1">
                    Station Code / Identifier
                  </label>
                  <input
                    type="text"
                    value={stationCode}
                    onChange={(e) => setStationCode(e.target.value)}
                    placeholder="e.g. UPF-MKN-01"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1A1F2C] text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-700 dark:text-gray-300 mb-1">
                    Division Command
                  </label>
                  <input
                    type="text"
                    value={division}
                    onChange={(e) => setDivision(e.target.value)}
                    placeholder="e.g. Mukono Division"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1A1F2C] text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-700 dark:text-gray-300 mb-1">
                    District
                  </label>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1A1F2C] text-xs outline-none"
                  >
                    <option value="Kampala">Kampala</option>
                    <option value="Wakiso">Wakiso</option>
                    <option value="Mukono">Mukono</option>
                    <option value="Entebbe">Entebbe</option>
                    <option value="Jinja">Jinja</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-700 dark:text-gray-300 mb-1">
                    Ready Squad Count
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="15"
                    value={squadCount}
                    onChange={(e) => setSquadCount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1A1F2C] text-xs outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-700 dark:text-gray-300 mb-1">
                    Officer In Charge / Commander *
                  </label>
                  <input
                    type="text"
                    value={officerInCharge}
                    onChange={(e) => setOfficerInCharge(e.target.value)}
                    placeholder="e.g. SP. Mugerwa Robert (DPC)"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1A1F2C] text-xs outline-none"
                  />
                  {errors.officerInCharge && (
                    <span className="text-[10px] text-red-500 font-bold">{errors.officerInCharge}</span>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-700 dark:text-gray-300 mb-1">
                    Station Phone Hotline
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+256 999 112233"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1A1F2C] text-xs outline-none"
                  />
                </div>
              </div>

              {/* Tactical Patrol Vehicle Assigned */}
              <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#161B26] space-y-3">
                <span className="font-bold text-xs uppercase text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                  <Siren className="w-3.5 h-3.5" /> Station Rapid Interceptor Unit
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-gray-700 dark:text-gray-300 mb-1">
                      Patrol Plate (UP Series) *
                    </label>
                    <input
                      type="text"
                      value={plate}
                      onChange={(e) => setPlate(e.target.value.toUpperCase())}
                      placeholder="UP 9901"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1A1F2C] text-xs font-mono font-bold uppercase outline-none"
                    />
                    {errors.plate && (
                      <span className="text-[10px] text-red-500 font-bold">{errors.plate}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-gray-700 dark:text-gray-300 mb-1">
                      Tactical Call Sign *
                    </label>
                    <input
                      type="text"
                      value={callsign}
                      onChange={(e) => setCallsign(e.target.value.toUpperCase())}
                      placeholder="STATION-MKN-ALPHA"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1A1F2C] text-xs font-mono font-bold uppercase outline-none"
                    />
                    {errors.callsign && (
                      <span className="text-[10px] text-red-500 font-bold">{errors.callsign}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-gray-700 dark:text-gray-300 mb-1">
                      Vehicle Model
                    </label>
                    <input
                      type="text"
                      value={vehicleModel}
                      onChange={(e) => setVehicleModel(e.target.value)}
                      placeholder="Toyota Land Cruiser 79"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1A1F2C] text-xs outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold uppercase text-gray-700 dark:text-gray-300 mb-1">
                      Station Base Address *
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. Jinja Highway, Mukono Central"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1A1F2C] text-xs outline-none"
                    />
                    {errors.address && (
                      <span className="text-[10px] text-red-500 font-bold">{errors.address}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-gray-700 dark:text-gray-300 mb-1">
                      Location Preset
                    </label>
                    <select
                      onChange={(e) => {
                        const [lt, ln, addr] = e.target.value.split(',');
                        if (lt && ln) {
                          setLat(parseFloat(lt));
                          setLon(parseFloat(ln));
                          if (addr) setAddress(addr);
                        }
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1A1F2C] text-xs outline-none"
                    >
                      <option value="0.3152,32.5816,Nakasero Central">Kampala Central (Nakasero)</option>
                      <option value="0.3392,32.5938,Kira Road Kamwokya">Kira Road / Kamwokya</option>
                      <option value="0.3235,32.6078,Jinja Road Nakawa">Jinja Road / Nakawa</option>
                      <option value="0.2974,32.6002,Ggaba Road Kabalagala">Ggaba Road / Kabalagala</option>
                      <option value="0.3445,32.5645,Northern Bypass Kalerwe">Northern Bypass</option>
                      <option value="0.2935,32.5320,Masaka Road Natete">Natete / Masaka Road</option>
                    </select>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Register Custom Police Station &amp; Intercept Unit</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
