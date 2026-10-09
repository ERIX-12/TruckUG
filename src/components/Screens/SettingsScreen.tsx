import React, { useState } from 'react';
import { Settings, Shield, Bell, Moon, Sun, Volume2, VolumeX, Save, Check, Play } from 'lucide-react';
import { unlockAudioPlayback, playAlertSound } from '../../utils/audio';

interface SettingsScreenProps {
  isDark: boolean;
  onToggleTheme: () => void;
  onResetData?: () => void;
  alertSoundEnabled?: boolean;
  onToggleAlertSound?: (enabled: boolean) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  isDark,
  onToggleTheme,
  onResetData,
  alertSoundEnabled = true,
  onToggleAlertSound,
}) => {
  const [smsPhone, setSmsPhone] = useState('+256 772 123456');
  const [altPhone, setAltPhone] = useState('+256 701 987654');
  const [policeUnit, setPoliceUnit] = useState('UPF Flying Squad / CID Kampala Central');
  const [saved, setSaved] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [testPlaying, setTestPlaying] = useState(false);

  const handleToggleSound = async () => {
    const nextState = !alertSoundEnabled;
    if (nextState) {
      // Actively unlock audio context through this user click
      await unlockAudioPlayback();
      await playAlertSound('test');
    }
    if (onToggleAlertSound) {
      onToggleAlertSound(nextState);
    }
  };

  const handleTestChime = async () => {
    setTestPlaying(true);
    await unlockAudioPlayback();
    await playAlertSound('critical');
    setTimeout(() => setTestPlaying(false), 700);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleReset = () => {
    if (!resetConfirm) {
      setResetConfirm(true);
      setTimeout(() => setResetConfirm(false), 4000);
      return;
    }
    if (onResetData) {
      onResetData();
      setResetConfirm(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 sm:pb-6 bg-gray-50 dark:bg-[#0F1218] text-gray-900 dark:text-gray-100 select-none">
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="pb-3 border-b border-gray-200 dark:border-gray-800">
          <h1 className="text-2xl font-bold font-heading uppercase tracking-wide flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-600" />
            System Preferences &amp; Dispatch Settings
          </h1>
          <p className="text-xs text-gray-500 font-mono">
            Audible alarm triggers, platform notification gateways (Africa's Talking SMS) &amp; credentials
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Audio Alert Settings */}
          <div className="p-5 rounded-xl bg-white dark:bg-[#181C25] border border-gray-200 dark:border-gray-800 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-base uppercase tracking-wide text-gray-800 dark:text-gray-200 flex items-center gap-2">
                {alertSoundEnabled ? (
                  <Volume2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <VolumeX className="w-5 h-5 text-gray-400" />
                )}
                Audible Alert Chimes &amp; Browser Audio Authorization
              </h3>
              <span
                className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full ${
                  alertSoundEnabled
                    ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                }`}
              >
                {alertSoundEnabled ? 'AUDIO ENABLED' : 'MUTED'}
              </span>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              When enabled, incoming emergency triggers (ANPR camera matches, geofence breaches, curfew violations,
              and stolen vehicle movements) produce an immediate audible siren chime in your browser.
            </p>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 rounded-lg bg-gray-50 dark:bg-[#12151C] border border-gray-200 dark:border-gray-800">
              <div className="space-y-1">
                <div className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                  <span>Enable Alert Sound</span>
                  {alertSoundEnabled && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">
                      ● Browser Web Audio Unlocked
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-gray-500">
                  Toggling ON registers user consent with your browser's autoplay policy.
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleTestChime}
                  disabled={!alertSoundEnabled || testPlaying}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                    alertSoundEnabled
                      ? 'border-gray-300 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 shadow-2xs'
                      : 'opacity-40 cursor-not-allowed border-gray-200 dark:border-gray-800 text-gray-400'
                  }`}
                  title="Test alert audio playback"
                >
                  <Play className={`w-3.5 h-3.5 ${testPlaying ? 'text-emerald-500 animate-spin' : 'text-blue-500'}`} />
                  <span>{testPlaying ? 'Chiming...' : 'Test Sound'}</span>
                </button>

                {/* Switch Toggle */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={alertSoundEnabled}
                  onClick={handleToggleSound}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    alertSoundEnabled ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-gray-700'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      alertSoundEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Emergency SMS Routing */}
          <div className="p-5 rounded-xl bg-white dark:bg-[#181C25] border border-gray-200 dark:border-gray-800 space-y-4 shadow-xs">
            <h3 className="font-heading font-bold text-base uppercase tracking-wide text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <Bell className="w-4 h-4 text-red-600" />
              Emergency Dispatch SMS Contacts
            </h3>
            <p className="text-xs text-gray-500">
              Numbers dispatched automatically within 5 seconds of an ANPR camera match or stolen movement event:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold uppercase text-gray-600 dark:text-gray-400 mb-1">
                  Primary Owner Phone
                </label>
                <input
                  type="text"
                  value={smsPhone}
                  onChange={(e) => setSmsPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#0F1218] font-mono text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase text-gray-600 dark:text-gray-400 mb-1">
                  Secondary Escort / Driver Phone
                </label>
                <input
                  type="text"
                  value={altPhone}
                  onChange={(e) => setAltPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#0F1218] font-mono text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold uppercase text-gray-600 dark:text-gray-400 mb-1">
                  Assigned Police Division / Interceptor Station
                </label>
                <input
                  type="text"
                  value={policeUnit}
                  onChange={(e) => setPoliceUnit(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#0F1218] text-sm"
                />
              </div>
            </div>
          </div>

          {/* Theme & Display */}
          <div className="p-5 rounded-xl bg-white dark:bg-[#181C25] border border-gray-200 dark:border-gray-800 space-y-3 shadow-xs">
            <h3 className="font-heading font-bold text-base uppercase tracking-wide text-gray-800 dark:text-gray-200">
              Appearance &amp; High-Contrast Token Theme
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Night Mode Display</div>
                <div className="text-xs text-gray-500">
                  Optimized for patrol cruisers and night operations in low light
                </div>
              </div>
              <button
                type="button"
                onClick={onToggleTheme}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 font-semibold text-xs flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              >
                {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
                <span>{isDark ? 'Dark Theme (Active)' : 'Light Theme (Active)'}</span>
              </button>
            </div>
          </div>

          {/* Local Persistence & Reset State */}
          <div className="p-5 rounded-xl bg-white dark:bg-[#181C25] border border-gray-200 dark:border-gray-800 space-y-3 shadow-xs">
            <h3 className="font-heading font-bold text-base uppercase tracking-wide text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600" />
              State Persistence &amp; Cryptographic Ledger (Section 43 DPPA 2019)
            </h3>
            <p className="text-xs text-gray-500">
              Your cases, provisioned trackers, ANPR reviews, and SHA-256 audit ledger are persistently stored in browser storage.
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
              <div className="text-xs">
                <span className="font-bold text-gray-700 dark:text-gray-300">Persistence Status:</span>{' '}
                <span className="text-emerald-600 font-mono font-bold">● ACTIVE (LocalStorage Hydration)</span>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  resetConfirm
                    ? 'bg-red-600 border-red-700 text-white animate-pulse'
                    : 'border-red-300 dark:border-red-900/60 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40'
                }`}
              >
                {resetConfirm ? 'Click again to confirm Reset' : 'Reset to Default Seed Data'}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            {saved && (
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="w-4 h-4" /> Preferences saved!
              </span>
            )}
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Save Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
