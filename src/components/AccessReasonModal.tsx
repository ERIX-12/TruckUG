import React, { useState } from 'react';
import { ShieldCheck, Lock, AlertCircle, X } from 'lucide-react';

interface AccessReasonModalProps {
  isOpen: boolean;
  plate: string;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}

export const AccessReasonModal: React.FC<AccessReasonModalProps> = ({
  isOpen,
  plate,
  onClose,
  onSubmit,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (trimmed.length < 10) {
      setError('Justification must be at least 10 characters.');
      return;
    }
    if (trimmed.length > 200) {
      setError('Justification cannot exceed 200 characters.');
      return;
    }
    onSubmit(trimmed);
    setReason('');
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md max-h-[calc(100vh-32px)] overflow-y-auto rounded-xl bg-white dark:bg-[#181C25] border border-blue-200 dark:border-blue-900 shadow-2xl p-4 sm:p-6 text-gray-900 dark:text-gray-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400 mb-3">
          <div className="p-2.5 rounded-full bg-blue-100 dark:bg-blue-950/80">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold font-heading uppercase tracking-wide">
              Official Access Reason Required
            </h3>
            <p className="text-xs text-blue-600/80 dark:text-blue-400/80 font-medium">
              Uganda Data Protection &amp; Privacy Act, 2019
            </p>
          </div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-md p-2.5 mb-4 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <span>
            <strong>Your access is logged:</strong> Accessing live GPS positions, route history, and camera sightings for vehicle <strong>{plate}</strong> requires a documented law enforcement or legal reason.
          </span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-xs font-semibold uppercase text-gray-600 dark:text-gray-400 mb-1">
              Operational Justification (10 - 200 characters)
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              placeholder="e.g., Active police pursuit under CRB 4029/2026 Jinja Rd corridor"
              className="w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-[#0F1218] border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="flex justify-between items-center text-[11px] text-gray-500 mt-1">
              <span>{error ? <span className="text-red-500 font-semibold">{error}</span> : 'Mandatory X-Access-Reason'}</span>
              <span className={reason.length < 10 || reason.length > 200 ? 'text-amber-500 font-medium' : 'text-emerald-500 font-semibold'}>
                {reason.length}/200
              </span>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={reason.trim().length < 10 || reason.trim().length > 200}
              className="px-4 py-2 text-sm font-bold rounded-md bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-800 disabled:text-gray-500 text-white transition-all shadow-md"
            >
              Authenticate &amp; View Trail
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
