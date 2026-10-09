import React, { useState, useEffect } from 'react';
import { PlateTag } from './PlateTag';
import { Volume2, VolumeX, MapPin, X, RotateCcw, Compass, Navigation, ShieldAlert, Gauge } from 'lucide-react';
import { VoiceLocateEvent, stopVehicleVoice } from '../utils/voiceNavigator';

export const VoiceAnnouncementBanner: React.FC = () => {
  const [activeAnnouncement, setActiveAnnouncement] = useState<VoiceLocateEvent | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const handleVoiceLocate = (e: any) => {
      const detail: VoiceLocateEvent = e.detail;
      if (detail) {
        setActiveAnnouncement(detail);
        setIsPlaying(true);
      }
    };

    const handleVoiceStop = () => {
      setIsPlaying(false);
    };

    window.addEventListener('trackug-voice-locate', handleVoiceLocate);
    window.addEventListener('trackug-voice-stop', handleVoiceStop);

    return () => {
      window.removeEventListener('trackug-voice-locate', handleVoiceLocate);
      window.removeEventListener('trackug-voice-stop', handleVoiceStop);
    };
  }, []);

  // Auto dismiss banner after speech duration (12 seconds for full narrative)
  useEffect(() => {
    if (!activeAnnouncement) return;
    const timer = setTimeout(() => {
      setIsPlaying(false);
      setActiveAnnouncement(null);
    }, 12500);

    return () => clearTimeout(timer);
  }, [activeAnnouncement]);

  if (!activeAnnouncement) return null;

  const handleStop = () => {
    stopVehicleVoice();
    setIsPlaying(false);
    setActiveAnnouncement(null);
  };

  const handleReplay = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(activeAnnouncement.message);
      utterance.volume = 1.0;
      utterance.rate = 0.95;
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
      setIsPlaying(true);
    }
  };

  const originText = activeAnnouncement.isStolen
    ? activeAnnouncement.stolenFrom || activeAnnouncement.originAddress || 'Oasis Mall Parking, Yusuf Lule Rd'
    : activeAnnouncement.originAddress || 'Namanve Industrial Transit Depot';

  return (
    <aside
      aria-label="Live Voice Navigation Dispatch"
      className="fixed bottom-16 md:bottom-6 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-xl bg-gray-950/95 text-white backdrop-blur-md rounded-2xl border border-blue-500/60 shadow-2xl p-4 select-none animate-in fade-in slide-in-from-bottom-5 duration-200"
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: Animated Radar Beacon Icon */}
        <div className="relative p-2.5 rounded-xl bg-blue-600/30 border border-blue-400/50 text-blue-400 shrink-0 mt-0.5">
          <Volume2 className="w-5 h-5 animate-pulse" />
          {isPlaying && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          )}
        </div>

        {/* Center: Spoken Telemetry Readout & Live Navigation */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span>LIVE MAP NAVIGATION</span>
              <span>•</span>
              <span>VOICE DISPATCH</span>
            </span>
            <PlateTag plate={activeAnnouncement.plate} size="sm" />
            {activeAnnouncement.isStolen && (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-red-600/80 text-white border border-red-400 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" />
                <span>STOLEN VEHICLE WATCH</span>
              </span>
            )}
          </div>

          {/* Stolen From / Origin Readout */}
          <div className="text-xs text-gray-200 flex items-start gap-1.5">
            <span className="text-gray-400 font-mono shrink-0">
              {activeAnnouncement.isStolen ? '⚠️ Stolen from:' : '📦 Origin / Dispatched:'}
            </span>
            <strong className="text-amber-300 font-semibold truncate">{originText}</strong>
          </div>

          {/* Current Location readout */}
          <div className="flex items-start gap-1.5 text-xs text-gray-100 font-medium">
            <MapPin className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span className="leading-snug">
              Current Location: <strong className="text-emerald-300 font-bold">{activeAnnouncement.address}</strong>,{' '}
              <span className="text-gray-300">{activeAnnouncement.district} District</span>
            </span>
          </div>

          {/* Speed Telemetry & Soundwaves Visualizer */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-gray-800 text-[11px] font-mono">
            <div className="flex items-center gap-2">
              <Gauge className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-gray-300">
                Speed:{' '}
                <strong className={activeAnnouncement.speed > 50 ? 'text-amber-400' : 'text-emerald-400'}>
                  {activeAnnouncement.speed} km/h
                </strong>
                {activeAnnouncement.topSpeed > 0 && (
                  <span className="text-gray-400 ml-1">
                    (Peak: <strong className="text-gray-200">{activeAnnouncement.topSpeed} km/h</strong>)
                  </span>
                )}
              </span>
            </div>

            {/* Soundwave Bars Visualizer */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-400">Audio readout:</span>
              <div className="flex items-center gap-0.5 h-3">
                <span className="w-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s] h-3"></span>
                <span className="w-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.15s] h-2"></span>
                <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-3.5"></span>
                <span className="w-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.2s] h-2.5"></span>
                <span className="w-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.4s] h-1.5"></span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleReplay}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer"
            title="Replay Voice Location & Speed Dispatch"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={handleStop}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer"
            title="Dismiss Banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
