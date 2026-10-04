import React, { useState } from 'react';
import { Vehicle } from '../../types';
import { PlateTag } from '../PlateTag';
import { StatusPill } from '../StatusPill';
import {
  ShieldAlert,
  Share2,
  MapPin,
  Battery,
  Zap,
  Clock,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

interface OwnerHomeScreenProps {
  vehicles: Vehicle[];
  onReportStolen: (plate: string) => void;
  onOpenShareModal: (vehicle: Vehicle) => void;
  onSelectVehicle: (vehicle: Vehicle) => void;
}

export const OwnerHomeScreen: React.FC<OwnerHomeScreenProps> = ({
  vehicles,
  onReportStolen,
  onOpenShareModal,
  onSelectVehicle,
}) => {
  // Filter only owner's vehicles
  const ownerVehicles = vehicles.filter((v) => v.ownerId === 'usr-owner-1');

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50 dark:bg-[#0F1218] text-gray-900 dark:text-gray-100 select-none">
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Mobile Header Greeting */}
        <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-800">
          <div>
            <span className="text-xs text-gray-500 uppercase font-semibold tracking-wider">
              Vehicle Security Portal
            </span>
            <h1 className="text-2xl font-bold font-heading uppercase text-gray-900 dark:text-gray-100">
              Mugisha Dennis
            </h1>
          </div>
          <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Vehicle Cards List */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold font-heading uppercase tracking-wide text-gray-500">
            Registered Vehicles ({ownerVehicles.length})
          </h2>

          {ownerVehicles.map((veh) => {
            const isStolen = veh.status === 'stolen';

            return (
              <div
                key={veh.id}
                className={`p-5 rounded-2xl border transition-all shadow-md bg-white dark:bg-[#181C25] space-y-4 ${
                  isStolen
                    ? 'border-red-500 ring-2 ring-red-500/20'
                    : 'border-gray-200 dark:border-gray-800 hover:border-gray-300'
                }`}
              >
                {/* Plate and Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <PlateTag plate={veh.plate} size="lg" />
                    <div>
                      <div className="font-bold text-sm text-gray-900 dark:text-gray-100">
                        {veh.make} {veh.model}
                      </div>
                      <div className="text-xs text-gray-500 font-medium">{veh.color}</div>
                    </div>
                  </div>
                  <StatusPill status={veh.status} />
                </div>

                {/* Telemetry Chips */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-gray-50 dark:bg-[#13161D] p-3 rounded-xl border border-gray-200 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    <Battery className="w-4 h-4 text-emerald-500" />
                    <span>Battery: <strong>{veh.batteryPct}%</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className={`w-4 h-4 ${veh.ignition ? 'text-amber-500' : 'text-gray-400'}`} />
                    <span>Ignition: <strong>{veh.ignition ? 'ON' : 'OFF'}</strong></span>
                  </div>
                  <div className="col-span-2 flex items-center gap-1.5 text-gray-600 dark:text-gray-400 pt-1 border-t border-gray-200 dark:border-gray-800 text-[11px]">
                    <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span className="truncate">{veh.lastPosition?.address}</span>
                  </div>
                </div>

                {/* Action Buttons: Report Stolen & Share Location */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {isStolen ? (
                    <div className="col-span-2 p-3 rounded-xl bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-900 text-red-800 dark:text-red-200 text-xs font-semibold flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
                      <span>Case Active: UPF Patrols alerted. ANPR watch active.</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => onReportStolen(veh.plate)}
                      className="py-3 px-4 rounded-xl bg-[#B3261E] hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md active:scale-98 transition-all"
                    >
                      <ShieldAlert className="w-4 h-4" />
                      Report Stolen
                    </button>
                  )}

                  <button
                    onClick={() => onOpenShareModal(veh)}
                    className={`py-3 px-4 rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all ${
                      isStolen ? 'col-span-2' : ''
                    }`}
                  >
                    <Share2 className="w-4 h-4 text-blue-500" />
                    Share Live Link
                  </button>
                </div>

                <div
                  onClick={() => onSelectVehicle(veh)}
                  className="text-center pt-1 text-xs text-blue-600 dark:text-blue-400 font-semibold cursor-pointer hover:underline flex items-center justify-center gap-1"
                >
                  <span>View live map &amp; route playback</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Consents list (Section 4 & 5 - Data Protection Act) */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#181C25] border border-gray-200 dark:border-gray-800 space-y-2 text-xs">
          <h3 className="font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            Statutory Data Sharing Consents
          </h3>
          <p className="text-gray-500 leading-relaxed">
            Pursuant to the Uganda Data Protection and Privacy Act, 2019, your real-time vehicle GPS feeds are private and only exposed to enforcement agencies if a verified stolen complaint is reported by you.
          </p>
          <div className="flex items-center gap-2 pt-1 font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Emergency Police Dispatch: ENABLED ON THEFT REPORT</span>
          </div>
        </div>
      </div>
    </div>
  );
};
