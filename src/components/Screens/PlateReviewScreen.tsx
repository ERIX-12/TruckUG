import React, { useState, useEffect } from 'react';
import { PlateSighting } from '../../types';
import { PlateTag } from '../PlateTag';
import {
  Check,
  X,
  SkipForward,
  Keyboard,
  Camera,
  MapPin,
  Clock,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

interface PlateReviewScreenProps {
  sightings: PlateSighting[];
  onConfirm: (id: string, correctedPlate: string) => void;
  onReject: (id: string) => void;
}

export const PlateReviewScreen: React.FC<PlateReviewScreenProps> = ({
  sightings,
  onConfirm,
  onReject,
}) => {
  const pendingItems = sightings.filter((s) => s.reviewState === 'pending');
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentItem = pendingItems[currentIndex];
  const [editedPlate, setEditedPlate] = useState(currentItem?.plateRaw || '');

  // Keep edited plate in sync when current item changes
  useEffect(() => {
    if (currentItem) {
      setEditedPlate(currentItem.plateRaw);
    }
  }, [currentIndex, currentItem]);

  // Keyboard shortcuts C, R, S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (document.activeElement?.tagName === 'INPUT') return;

      if (!currentItem) return;

      if (e.key === 'c' || e.key === 'C') {
        onConfirm(currentItem.id, editedPlate);
      } else if (e.key === 'r' || e.key === 'R') {
        onReject(currentItem.id);
      } else if (e.key === 's' || e.key === 'S') {
        handleSkip();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentItem, editedPlate, currentIndex]);

  const handleSkip = () => {
    if (pendingItems.length > 0) {
      setCurrentIndex((prev) => (prev + 1) % pendingItems.length);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50 dark:bg-[#0F1218] text-gray-900 dark:text-gray-100 select-none">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-800 gap-2">
          <div>
            <h1 className="text-2xl font-bold font-heading uppercase tracking-wide flex items-center gap-2">
              <Camera className="w-6 h-6 text-blue-600" />
              ANPR Low-Confidence Plate Review Queue
            </h1>
            <p className="text-xs text-gray-500 font-mono">
              Reviewing edge readings with confidence between 0.50 and 0.85
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white dark:bg-[#181C25] border border-gray-200 dark:border-gray-800 px-3 py-1.5 rounded-lg text-xs font-mono">
            <Keyboard className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600 dark:text-gray-300">
              Shortcuts: <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-bold border">C</kbd> Confirm,{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-bold border">R</kbd> Reject,{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-bold border">S</kbd> Skip
            </span>
          </div>
        </div>

        {!currentItem ? (
          <div className="p-16 text-center bg-white dark:bg-[#181C25] rounded-xl border border-gray-200 dark:border-gray-800 text-gray-500 space-y-2">
            <Sparkles className="w-10 h-10 text-emerald-500 mx-auto" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Review Queue Cleared</h3>
            <p className="text-xs">No pending ambiguous optical plate sightings requiring operator decision.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-[#181C25] border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-xs">
            {/* Left: Snapshot Image */}
            <div className="space-y-3">
              <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 aspect-4/3 bg-black flex items-center justify-center">
                <img
                  src={currentItem.snapshotUrl}
                  alt={`Plate Snapshot ${currentItem.plateRaw}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-0.5 rounded">
                  {currentItem.cameraName}
                </div>
                <div className="absolute bottom-2 right-2 bg-red-600 text-white text-[11px] font-mono font-bold px-2 py-0.5 rounded">
                  CROPPED ANPR BUFFER
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 font-mono">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(currentItem.ts).toLocaleTimeString('en-GB', { timeZone: 'Africa/Kampala' })} EAT
                </span>
                <span>Item {currentIndex + 1} of {pendingItems.length}</span>
              </div>
            </div>

            {/* Right: OCR Verification Form */}
            <div className="flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                    Raw Edge OCR Extraction
                  </span>
                  <div className="flex items-center gap-2">
                    <PlateTag plate={currentItem.plateRaw} size="lg" />
                    <span className="text-xs text-amber-600 font-medium">(Requires Verification)</span>
                  </div>
                </div>

                {/* Confidence Bar */}
                <div className="space-y-1.5 bg-gray-50 dark:bg-[#13161D] p-3 rounded-lg border border-gray-200 dark:border-gray-800">
                  <div className="flex justify-between text-xs font-bold">
                    <span>Optical Confidence Score</span>
                    <span className="font-mono text-amber-600 font-bold">
                      {(currentItem.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                    <div
                      style={{ width: `${currentItem.confidence * 100}%` }}
                      className="h-full bg-amber-500 rounded-full"
                    ></div>
                  </div>
                  <div className="text-[10px] text-gray-400">
                    Threshold: &lt; 85% requires manual human operator sign-off before dispatching critical alerts.
                  </div>
                </div>

                {/* Edit Plate Input */}
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-600 dark:text-gray-400 mb-1">
                    Corrected Plate String
                  </label>
                  <input
                    type="text"
                    value={editedPlate}
                    onChange={(e) => setEditedPlate(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-base font-mono font-bold tracking-wider uppercase rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0F1218] text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                  <p className="text-[11px] text-gray-400 mt-1 font-mono">
                    Apply look-alike repair (e.g. '0' vs 'O', '1' vs 'I')
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-200 dark:border-gray-800">
                <button
                  onClick={() => onReject(currentItem.id)}
                  className="py-2.5 px-3 rounded-lg border border-red-300 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <X className="w-4 h-4" /> Reject (R)
                </button>
                <button
                  onClick={handleSkip}
                  className="py-2.5 px-3 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <SkipForward className="w-4 h-4" /> Skip (S)
                </button>
                <button
                  onClick={() => onConfirm(currentItem.id, editedPlate)}
                  className="py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                >
                  <Check className="w-4 h-4" /> Confirm (C)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
