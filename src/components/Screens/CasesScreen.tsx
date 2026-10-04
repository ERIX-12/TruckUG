import React, { useState } from 'react';
import { Case } from '../../types';
import { PlateTag } from '../PlateTag';
import {
  FolderLock,
  Phone,
  User,
  ShieldCheck,
  CheckCircle,
  Eye,
  Clock,
  MapPin,
  Camera,
  AlertCircle,
  FileCheck,
} from 'lucide-react';

interface CasesScreenProps {
  cases: Case[];
  onRequestAccess: (plate: string, caseId: string) => void;
  onMarkRecovered: (caseId: string, vehicleId: string) => void;
  hasAccessPermission: boolean;
  searchQuery?: string;
}

export const CasesScreen: React.FC<CasesScreenProps> = ({
  cases,
  onRequestAccess,
  onMarkRecovered,
  hasAccessPermission,
  searchQuery = '',
}) => {
  const filteredCases = cases.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      c.plate.toLowerCase().includes(q) ||
      c.ownerName.toLowerCase().includes(q) ||
      c.policeRef.toLowerCase().includes(q) ||
      c.makeModel.toLowerCase().includes(q)
    );
  });

  const [selectedCaseId, setSelectedCaseId] = useState<string>(filteredCases[0]?.id || cases[0]?.id || '');

  const activeCase = cases.find((c) => c.id === selectedCaseId) || filteredCases[0] || cases[0];

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50 dark:bg-[#0F1218] text-gray-900 dark:text-gray-100 select-none">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Banner: Section 5 - Your access is logged */}
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-blue-900 dark:text-blue-200">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>
              <strong>Uganda Police Force &amp; Inter-Agency Command:</strong> All location reads, trail queries, and case records require operational reasons and are logged to the tamper-evident audit ledger.
            </span>
          </div>
          <span className="font-mono text-[11px] font-bold bg-blue-200 dark:bg-blue-900 px-2 py-0.5 rounded shrink-0">
            AUDIT ACTIVE
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Case List */}
          <div className="space-y-2.5">
            <h2 className="text-base font-bold font-heading uppercase tracking-wide text-gray-700 dark:text-gray-300">
              Active Stolen Vehicle Files ({filteredCases.length})
            </h2>

            {filteredCases.map((c) => {
              const isSelected = c.id === selectedCaseId;
              const isOpen = c.state === 'open';

              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCaseId(c.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all shadow-xs ${
                    isSelected
                      ? 'border-[#B3261E] bg-white dark:bg-[#181C25] ring-2 ring-red-500/20'
                      : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-[#181C25] hover:border-gray-300 dark:hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <PlateTag plate={c.plate} size="sm" />
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        isOpen
                          ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}
                    >
                      {c.state}
                    </span>
                  </div>

                  <div className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    {c.makeModel}
                  </div>

                  <div className="text-[11px] font-mono text-gray-500 space-y-0.5">
                    <div>Ref: {c.policeRef}</div>
                    <div>Opened: {new Date(c.openedAt).toLocaleDateString()}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Selected Case Dossier */}
          {activeCase && (
            <div className="lg:col-span-2 space-y-4">
              <div className="p-5 rounded-xl bg-white dark:bg-[#181C25] border border-gray-200 dark:border-gray-800 shadow-xs space-y-4">
                {/* Dossier Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-800 gap-2">
                  <div className="flex items-center gap-3">
                    <PlateTag plate={activeCase.plate} size="lg" />
                    <div>
                      <h3 className="font-heading font-bold text-lg uppercase tracking-wide">
                        {activeCase.makeModel}
                      </h3>
                      <p className="font-mono text-xs text-gray-500">CRB: {activeCase.policeRef}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeCase.state === 'open' && (
                      <button
                        onClick={() => onMarkRecovered(activeCase.id, activeCase.vehicleId)}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm transition-all"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Mark Recovered
                      </button>
                    )}
                  </div>
                </div>

                {/* Case Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#13161D] border border-gray-200 dark:border-gray-800 space-y-1">
                    <div className="text-gray-500 font-semibold uppercase flex items-center gap-1">
                      <User className="w-3.5 h-3.5" /> Registered Owner
                    </div>
                    <div className="font-bold text-gray-900 dark:text-gray-100">{activeCase.ownerName}</div>
                    <div className="text-gray-600 dark:text-gray-400 flex items-center gap-1 font-mono">
                      <Phone className="w-3 h-3 text-emerald-500" /> {activeCase.ownerPhone}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#13161D] border border-gray-200 dark:border-gray-800 space-y-1">
                    <div className="text-gray-500 font-semibold uppercase flex items-center gap-1">
                      <FolderLock className="w-3.5 h-3.5" /> Investigation Team
                    </div>
                    {activeCase.assignedOfficers.map((off, i) => (
                      <div key={i} className="font-medium text-gray-800 dark:text-gray-200">
                        {off}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Reason-Gated Location & Sightings Section */}
                <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-[#13161D] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold font-heading text-sm uppercase tracking-wide flex items-center gap-2">
                      <Camera className="w-4 h-4 text-blue-600" /> Last Confirmed Roadside ANPR Sighting
                    </span>
                    {!hasAccessPermission && (
                      <button
                        onClick={() => onRequestAccess(activeCase.plate, activeCase.id)}
                        className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Provide Reason to Unlock
                      </button>
                    )}
                  </div>

                  {hasAccessPermission ? (
                    <div className="space-y-3 pt-1">
                      <div className="p-3 rounded-lg bg-white dark:bg-[#181C25] border border-blue-200 dark:border-blue-900/50 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-red-500" />
                            {activeCase.lastSighting?.cameraName}
                          </span>
                          <span className="font-mono text-[11px] text-gray-500">
                            {new Date(activeCase.lastSighting?.ts || '').toLocaleTimeString('en-GB', {
                              timeZone: 'Africa/Kampala',
                            })}{' '}
                            EAT
                          </span>
                        </div>
                        <div className="font-mono text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                          Optical Match Confidence: {((activeCase.lastSighting?.confidence || 0) * 100).toFixed(0)}%
                        </div>
                      </div>

                      <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded border border-emerald-200 dark:border-emerald-900 flex items-center gap-1.5">
                        <FileCheck className="w-3.5 h-3.5 shrink-0" />
                        X-Access-Reason logged to audit ledger. Data unlocked for 15 minutes.
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-gray-500 space-y-2">
                      <FolderLock className="w-8 h-8 mx-auto text-gray-400" />
                      <p className="text-xs font-medium">
                        Coordinates, camera photos, and GPS breadcrumbs are encrypted under statutory privacy rules.
                      </p>
                      <button
                        onClick={() => onRequestAccess(activeCase.plate, activeCase.id)}
                        className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Enter Access Justification
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
