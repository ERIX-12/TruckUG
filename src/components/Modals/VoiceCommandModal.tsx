import React, { useState, useEffect } from 'react';
import { Vehicle } from '../../types';
import { PlateTag } from '../PlateTag';
import { StatusPill } from '../StatusPill';
import {
  Mic,
  MicOff,
  Volume2,
  MapPin,
  X,
  Radio,
  Sparkles,
  Command,
  Car,
} from 'lucide-react';
import {
  startVoiceCommandRecognition,
  VoiceRecognitionController,
  speakVehicleLocation,
} from '../../utils/voiceNavigator';

interface VoiceCommandModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicles: Vehicle[];
  onSelectAndLocate: (vehicle: Vehicle) => void;
}

export const VoiceCommandModal: React.FC<VoiceCommandModalProps> = ({
  isOpen,
  onClose,
  vehicles,
  onSelectAndLocate,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [recognitionController, setRecognitionController] =
    useState<VoiceRecognitionController | null>(null);

  useEffect(() => {
    return () => {
      if (recognitionController) {
        recognitionController.stop();
      }
    };
  }, [recognitionController]);

  if (!isOpen) return null;

  const handleExecuteVoiceCommand = (commandText: string) => {
    setFeedback(`Processing: "${commandText}"`);
    const clean = commandText.toLowerCase().trim();

    // Check if matching specific plate
    let matchedVehicle: Vehicle | undefined;

    // Direct plate search
    matchedVehicle = vehicles.find((v) => {
      const p = v.plate.toLowerCase().replace(/\s+/g, '');
      const pNorm = v.plateNorm.toLowerCase().replace(/\s+/g, '');
      const target = clean.replace(/\s+/g, '');
      return target.includes(p) || target.includes(pNorm);
    });

    // Check for "stolen" or "sos"
    if (!matchedVehicle && (clean.includes('stolen') || clean.includes('sos'))) {
      matchedVehicle = vehicles.find((v) => v.status === 'stolen') || vehicles[0];
    }

    // Check for "speed" or "fastest"
    if (!matchedVehicle && (clean.includes('speed') || clean.includes('fast'))) {
      matchedVehicle = [...vehicles].sort(
        (a, b) => (b.lastPosition?.speedKph || 0) - (a.lastPosition?.speedKph || 0)
      )[0];
    }

    // Default to first active vehicle or selected
    if (!matchedVehicle) {
      matchedVehicle = vehicles[0];
    }

    if (matchedVehicle) {
      setFeedback(`Vehicle matched: ${matchedVehicle.plate} - Dispatching voice announcement...`);
      setTimeout(() => {
        onSelectAndLocate(matchedVehicle!);
        onClose();
      }, 300);
    } else {
      setFeedback('No vehicle matched. Try saying "Locate UAX 892K" or click a preset below.');
    }
  };

  const handleStartListening = () => {
    setFeedback(null);
    setTranscript('');
    setIsListening(true);

    const controller = startVoiceCommandRecognition(
      (text) => {
        setIsListening(false);
        setTranscript(text);
        handleExecuteVoiceCommand(text);
      },
      (err) => {
        setIsListening(false);
        setFeedback(`Microphone notice: ${err}. You can tap any voice command shortcut below.`);
      }
    );

    if (controller) {
      setRecognitionController(controller);
    } else {
      setIsListening(false);
      setFeedback('Speech recognition not available. Use the 1-click voice command presets below.');
    }
  };

  const handleStopListening = () => {
    if (recognitionController) {
      recognitionController.stop();
    }
    setIsListening(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-[#181C25] border border-gray-200 dark:border-[#2B313D] rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden text-gray-900 dark:text-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50/80 dark:bg-[#13161F]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
              <Command className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-heading font-bold uppercase tracking-wide flex items-center gap-2">
                <span>Dispatch Voice Command</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800">
                  LIVE TTS
                </span>
              </h2>
              <p className="text-[11px] text-gray-500 font-mono">
                Speak or tap to announce vehicle location loudly on the live map
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* Microphone Push to Talk Area */}
          <div className="p-5 rounded-2xl bg-gray-50 dark:bg-[#11141B] border border-gray-200 dark:border-gray-800 text-center space-y-3.5">
            <div className="relative inline-flex items-center justify-center">
              {isListening && (
                <span className="absolute -inset-3 rounded-full bg-red-500/30 animate-ping"></span>
              )}
              <button
                onClick={isListening ? handleStopListening : handleStartListening}
                className={`relative w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all cursor-pointer ${
                  isListening
                    ? 'bg-red-600 text-white ring-4 ring-red-400/50 scale-105'
                    : 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-105 active:scale-95'
                }`}
                title={isListening ? 'Click to stop listening' : 'Click to speak voice command'}
              >
                {isListening ? (
                  <MicOff className="w-8 h-8 animate-pulse" />
                ) : (
                  <Mic className="w-8 h-8" />
                )}
              </button>
            </div>

            <div>
              <div className="font-heading font-bold text-sm uppercase tracking-wide">
                {isListening ? (
                  <span className="text-red-500 animate-pulse">● Listening for voice command...</span>
                ) : (
                  <span>Press microphone to speak</span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Say: <strong className="text-blue-600 dark:text-blue-400">"Locate vehicle"</strong> or{' '}
                <strong className="text-blue-600 dark:text-blue-400">"Locate UAX 892K"</strong>
              </p>
            </div>

            {transcript && (
              <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-xs font-mono text-blue-900 dark:text-blue-200">
                Transcribed: <strong>"{transcript}"</strong>
              </div>
            )}

            {feedback && (
              <div className="text-xs font-mono text-amber-600 dark:text-amber-400">
                {feedback}
              </div>
            )}
          </div>

          {/* Quick Voice Command Presets */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase tracking-wider font-mono">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Instant Voice Dispatch Commands
              </span>
              <span>Tap to Dispatch</span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {vehicles.slice(0, 4).map((veh) => (
                <button
                  key={veh.id}
                  onClick={() => {
                    handleExecuteVoiceCommand(`Locate ${veh.plate}`);
                  }}
                  className="p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#181C25] hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-all flex items-center justify-between group cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                      <Volume2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <PlateTag plate={veh.plate} size="sm" />
                        <span className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">
                          {veh.make} {veh.model}
                        </span>
                        <StatusPill status={veh.status} size="sm" />
                      </div>
                      <div className="text-[11px] text-gray-500 truncate flex items-center gap-1 font-mono">
                        <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                        <span className="truncate">{veh.lastPosition?.address}</span>
                      </div>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 group-hover:bg-blue-600 group-hover:text-white text-[11px] font-bold text-gray-700 dark:text-gray-300 transition-colors shrink-0 font-mono ml-2">
                    🔊 Locate
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#13161F] flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <Radio className="w-3.5 h-3.5 text-emerald-500" />
            <span>TTS readout: "Locating vehicle... [Exact place name]"</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
