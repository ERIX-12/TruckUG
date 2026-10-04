import React, { useState, useEffect } from 'react';
import { Vehicle } from '../../types';
import { PlateTag } from '../PlateTag';
import { Clock, Shield, MapPin, AlertCircle, Share2, Check, Copy } from 'lucide-react';

interface PublicShareModalProps {
  vehicle: Vehicle | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PublicShareModal: React.FC<PublicShareModalProps> = ({
  vehicle,
  isOpen,
  onClose,
}) => {
  const [durationHours, setDurationHours] = useState<number>(4);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !vehicle) return null;

  const handleCreateShare = () => {
    const token = 'sh_' + Math.random().toString(36).substring(2, 10);
    const origin = window.location.origin;
    setShareUrl(`${origin}/?share=${token}&veh=${vehicle.id}`);
  };

  const handleCopy = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-[#181C25] border border-gray-200 dark:border-gray-800 shadow-2xl p-6 text-gray-900 dark:text-gray-100">
        <h3 className="text-xl font-bold font-heading uppercase tracking-wide flex items-center gap-2 mb-2">
          <Share2 className="w-5 h-5 text-blue-600" />
          Create Expiring Share Link
        </h3>

        <p className="text-xs text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
          Allow family, delivery recipients, or mechanics to track vehicle <PlateTag plate={vehicle.plate} size="sm" /> live without access to your account or trip history.
        </p>

        {shareUrl ? (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> Link Active for {durationHours} Hours
              </div>
              <div className="font-mono text-[11px]">
                Expires at:{' '}
                {new Date(Date.now() + durationHours * 3600000).toLocaleTimeString('en-GB', {
                  timeZone: 'Africa/Kampala',
                })}{' '}
                EAT
              </div>
            </div>

            <div className="flex items-center gap-2 bg-gray-100 dark:bg-[#0F1218] p-2.5 rounded-lg border border-gray-300 dark:border-gray-700 font-mono text-xs">
              <span className="flex-1 truncate">{shareUrl}</span>
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  setShareUrl(null);
                  onClose();
                }}
                className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500 mb-2">
                Select Sharing Duration:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 4, 12, 24].map((hours) => (
                  <button
                    key={hours}
                    type="button"
                    onClick={() => setDurationHours(hours)}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold font-mono transition-all ${
                      durationHours === hours
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    {hours}h
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateShare}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm"
              >
                Generate Secure Link
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
