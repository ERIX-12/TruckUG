import React, { useState } from 'react';
import { Geofence, Vehicle } from '../../types';
import { Layers, Plus, Clock, Gauge, Shield, Check, Trash2, AlertCircle } from 'lucide-react';

interface GeofencesScreenProps {
  geofences: Geofence[];
  vehicles: Vehicle[];
  onAddGeofence: (newGeo: Partial<Geofence>) => void;
  onToggleActive: (id: string) => void;
}

export const GeofencesScreen: React.FC<GeofencesScreenProps> = ({
  geofences,
  vehicles,
  onAddGeofence,
  onToggleActive,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [rule, setRule] = useState<'enter' | 'exit' | 'curfew' | 'speed'>('speed');
  const [speedLimit, setSpeedLimit] = useState(50);
  const [curfewStart, setCurfewStart] = useState('22:00');
  const [curfewEnd, setCurfewEnd] = useState('05:30');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAddGeofence({
      name,
      rule,
      params: {
        speedLimit: rule === 'speed' ? speedLimit : undefined,
        curfewStart: rule === 'curfew' ? curfewStart : undefined,
        curfewEnd: rule === 'curfew' ? curfewEnd : undefined,
        timezone: 'Africa/Kampala',
      },
      coordinates: [
        [0.31, 32.57],
        [0.33, 32.59],
        [0.32, 32.61],
        [0.3, 32.59],
      ],
      active: true,
      vehicleCount: vehicles.length,
    });

    setName('');
    setIsAdding(false);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50 dark:bg-[#0F1218] text-gray-900 dark:text-gray-100 select-none">
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h1 className="text-2xl font-bold font-heading uppercase tracking-wide flex items-center gap-2">
              <Layers className="w-6 h-6 text-blue-600" />
              Geofence &amp; Curfew Enforcement
            </h1>
            <p className="text-xs text-gray-500 font-mono">
              Evaluated with PostGIS ST_Covers(polygon, point) against active tracker streams
            </p>
          </div>

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            {isAdding ? 'Cancel' : 'Define New Geofence'}
          </button>
        </div>

        {/* Create Geofence Form Modal/Section */}
        {isAdding && (
          <form
            onSubmit={handleSave}
            className="p-5 rounded-xl bg-white dark:bg-[#181C25] border border-blue-200 dark:border-blue-900 shadow-md space-y-4 animate-in fade-in duration-200"
          >
            <h3 className="font-heading font-bold text-base uppercase tracking-wide text-blue-600 dark:text-blue-400">
              Create Perimeter Rule
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-600 dark:text-gray-400 mb-1">
                  Geofence Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Entebbe Expressway Corridor"
                  className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0F1218] text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-600 dark:text-gray-400 mb-1">
                  Enforcement Rule
                </label>
                <select
                  value={rule}
                  onChange={(e: any) => setRule(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0F1218] text-gray-900 dark:text-gray-100 font-semibold"
                >
                  <option value="speed">Speed Limit Perimeter</option>
                  <option value="curfew">Night Curfew (Movement Window)</option>
                  <option value="enter">Entry Alert</option>
                  <option value="exit">Exit Alert</option>
                </select>
              </div>
            </div>

            {rule === 'speed' && (
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#13161D] border border-gray-200 dark:border-gray-800 flex items-center gap-4 text-xs">
                <Gauge className="w-5 h-5 text-amber-500" />
                <div>
                  <label className="font-semibold block mb-1">Maximum Allowed Speed (km/h): {speedLimit} km/h</label>
                  <input
                    type="range"
                    min="20"
                    max="120"
                    step="5"
                    value={speedLimit}
                    onChange={(e) => setSpeedLimit(Number(e.target.value))}
                    className="w-48 accent-blue-600"
                  />
                </div>
              </div>
            )}

            {rule === 'curfew' && (
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#13161D] border border-gray-200 dark:border-gray-800 flex items-center gap-4 text-xs font-mono">
                <Clock className="w-5 h-5 text-blue-500" />
                <div className="flex items-center gap-2">
                  <span>Start (EAT):</span>
                  <input
                    type="time"
                    value={curfewStart}
                    onChange={(e) => setCurfewStart(e.target.value)}
                    className="px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0F1218]"
                  />
                  <span>End (EAT):</span>
                  <input
                    type="time"
                    value={curfewEnd}
                    onChange={(e) => setCurfewEnd(e.target.value)}
                    className="px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0F1218]"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm"
              >
                Save Virtual Geofence
              </button>
            </div>
          </form>
        )}

        {/* Existing Geofences List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {geofences.map((gf) => (
            <div
              key={gf.id}
              className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#181C25] shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-heading font-bold text-base uppercase tracking-wide text-gray-900 dark:text-gray-100">
                    {gf.name}
                  </h3>
                  <div className="text-xs font-mono text-gray-500 flex items-center gap-1.5 mt-0.5">
                    <span className="font-semibold text-blue-600 dark:text-blue-400 uppercase">
                      Rule: {gf.rule}
                    </span>
                    <span>•</span>
                    <span>{gf.coordinates.length} vertices</span>
                  </div>
                </div>

                <button
                  onClick={() => onToggleActive(gf.id)}
                  className={`px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${
                    gf.active
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-800'
                  }`}
                >
                  {gf.active ? 'Active' : 'Disabled'}
                </button>
              </div>

              {/* Params summary */}
              <div className="text-xs text-gray-600 dark:text-gray-400 font-mono bg-gray-50 dark:bg-[#13161D] p-2.5 rounded-lg border border-gray-200 dark:border-gray-800 space-y-1">
                {gf.params.speedLimit && <div>Max Speed: {gf.params.speedLimit} km/h</div>}
                {gf.params.curfewStart && (
                  <div>
                    Curfew Window: {gf.params.curfewStart} – {gf.params.curfewEnd} (Africa/Kampala)
                  </div>
                )}
                <div>Monitored Vehicles: {gf.vehicleCount} vehicles linked</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
