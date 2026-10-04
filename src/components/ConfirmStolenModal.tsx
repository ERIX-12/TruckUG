import React, { useState } from 'react';
import { PlateTag } from './PlateTag';
import { AlertTriangle, ShieldAlert, X } from 'lucide-react';

interface ConfirmStolenModalProps {
  plate: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ConfirmStolenModal: React.FC<ConfirmStolenModalProps> = ({
  plate,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [typedPlate, setTypedPlate] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const isMatch = typedPlate.trim().toUpperCase() === plate.trim().toUpperCase();

  const handleConfirm = () => {
    if (isMatch) {
      onConfirm();
      setTypedPlate('');
      setError(false);
      onClose();
    } else {
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-xl bg-white dark:bg-[#181C25] border border-red-200 dark:border-red-950 shadow-2xl p-6 text-gray-900 dark:text-gray-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-3">
          <div className="p-2.5 rounded-full bg-red-100 dark:bg-red-950/80">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold font-heading uppercase tracking-wide">
              Initiate Stolen Vehicle Protocol
            </h3>
            <p className="text-xs text-red-600/80 dark:text-red-400/80 font-medium">
              High-priority enforcement alert
            </p>
          </div>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
          Reporting vehicle <PlateTag plate={plate} size="sm" /> as stolen will immediately:
        </p>

        <ul className="text-xs space-y-2 mb-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-lg p-3 text-gray-700 dark:text-gray-300">
          <li className="flex items-start gap-2">
            <span className="text-red-600 font-bold">•</span>
            <span>Add plate to the high-speed Redis watch set for instant ANPR camera alerts within 5s.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-red-600 font-bold">•</span>
            <span>Dispatch SMS notifications to Uganda Police Force (UPF Flying Squad) and saved contacts.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-red-600 font-bold">•</span>
            <span>Open an official investigation case file on the Agency command dashboard.</span>
          </li>
        </ul>

        <div className="mb-5">
          <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">
            Type <span className="font-mono font-bold text-red-600 dark:text-red-400">{plate}</span> to confirm:
          </label>
          <input
            type="text"
            value={typedPlate}
            onChange={(e) => {
              setTypedPlate(e.target.value.toUpperCase());
              setError(false);
            }}
            placeholder={`Type ${plate}`}
            className="w-full px-3 py-2 border rounded-md font-mono text-center font-bold tracking-wider uppercase text-base bg-white dark:bg-[#0F1218] border-gray-300 dark:border-gray-700 focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:border-red-500"
          />
          {error && (
            <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Plate does not match. Please enter exactly {plate}.
            </p>
          )}
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
            type="button"
            disabled={!isMatch}
            onClick={handleConfirm}
            className={`px-4 py-2 text-sm font-bold rounded-md text-white transition-all shadow-md ${
              isMatch
                ? 'bg-[#B3261E] hover:bg-red-700 active:scale-98'
                : 'bg-gray-300 dark:bg-gray-800 text-gray-500 cursor-not-allowed'
            }`}
          >
            Confirm Stolen Report
          </button>
        </div>
      </div>
    </div>
  );
};
