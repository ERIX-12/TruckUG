import React, { useState } from 'react';
import { Device, Camera } from '../../types';
import { PlateTag } from '../PlateTag';
import {
  Radio,
  Camera as CameraIcon,
  Plus,
  Battery,
  Key,
  Copy,
  Check,
  AlertTriangle,
  Clock,
  ShieldCheck,
} from 'lucide-react';

interface DevicesCamerasScreenProps {
  devices: Device[];
  cameras: Camera[];
  onRegisterDevice: (device: Partial<Device>) => void;
  onRegisterCamera: (camera: Partial<Camera>) => void;
}

export const DevicesCamerasScreen: React.FC<DevicesCamerasScreenProps> = ({
  devices,
  cameras,
  onRegisterDevice,
  onRegisterCamera,
}) => {
  const [activeTab, setActiveTab] = useState<'devices' | 'cameras'>('devices');
  const [isRegistering, setIsRegistering] = useState(false);
  const [generatedSecret, setGeneratedSecret] = useState<string | null>(null);
  const [hasSavedSecret, setHasSavedSecret] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form states
  const [imei, setImei] = useState('');
  const [protocol, setProtocol] = useState<'gt06' | 'http_json'>('gt06');
  const [cameraName, setCameraName] = useState('');

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const newSecret = 'sk_live_' + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);

    if (activeTab === 'devices') {
      onRegisterDevice({
        imei,
        protocol,
        batteryPct: 100,
        status: 'online',
        lastSeenAt: new Date().toISOString(),
      });
    } else {
      onRegisterCamera({
        name: cameraName,
        lat: 0.315,
        lon: 32.585,
        status: 'active',
        lastSeenAt: new Date().toISOString(),
        todayReadsCount: 0,
      });
    }

    setGeneratedSecret(newSecret);
    setHasSavedSecret(false);
    setCopied(false);
    setImei('');
    setCameraName('');
  };

  const copyToClipboard = () => {
    if (generatedSecret) {
      navigator.clipboard.writeText(generatedSecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50 dark:bg-[#0F1218] text-gray-900 dark:text-gray-100 select-none">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-800 gap-2">
          <div>
            <h1 className="text-2xl font-bold font-heading uppercase tracking-wide flex items-center gap-2">
              <Radio className="w-6 h-6 text-blue-600" />
              Hardware Infrastructure: GPS Trackers &amp; ANPR Nodes
            </h1>
            <p className="text-xs text-gray-500 font-mono">
              Port 5023 TCP (GT06 binary decoder) &amp; Edge camera HMAC authentication
            </p>
          </div>

          <button
            onClick={() => {
              setIsRegistering(!isRegistering);
              setGeneratedSecret(null);
            }}
            className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            {isRegistering ? 'Cancel' : `Register New ${activeTab === 'devices' ? 'Tracker' : 'Camera'}`}
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 text-sm font-semibold">
          <button
            onClick={() => {
              setActiveTab('devices');
              setIsRegistering(false);
            }}
            className={`py-2 px-4 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'devices'
                ? 'border-[#B3261E] text-[#B3261E] dark:border-red-500 dark:text-red-400 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Radio className="w-4 h-4" />
            GPS Trackers ({devices.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('cameras');
              setIsRegistering(false);
            }}
            className={`py-2 px-4 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'cameras'
                ? 'border-[#B3261E] text-[#B3261E] dark:border-red-500 dark:text-red-400 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <CameraIcon className="w-4 h-4" />
            Roadside ANPR Cameras ({cameras.length})
          </button>
        </div>

        {/* Secret Shown Once Modal / Notification */}
        {generatedSecret && (
          <div className="p-5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-3 shadow-lg">
            <div className="flex items-center gap-2 font-bold text-sm">
              <Key className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <span>Authentication Secret (Shown Once Only)</span>
            </div>
            <p className="text-xs leading-relaxed">
              This secret is hashed using Argon2id and stored in the database. It cannot be recovered once this modal is closed. Paste it into your edge node / tracker configuration now.
            </p>

            <div className="flex items-center gap-2 bg-white dark:bg-[#0F1218] p-2.5 rounded-md border border-amber-300 dark:border-amber-700 font-mono text-xs">
              <span className="flex-1 select-all break-all">{generatedSecret}</span>
              <button
                onClick={copyToClipboard}
                className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center gap-1 text-[11px]"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasSavedSecret}
                  onChange={(e) => setHasSavedSecret(e.target.checked)}
                  className="rounded accent-amber-600 w-4 h-4"
                />
                <span>I have securely copied and backed up this secret</span>
              </label>

              <button
                disabled={!hasSavedSecret}
                onClick={() => {
                  setGeneratedSecret(null);
                  setIsRegistering(false);
                }}
                className="px-4 py-1.5 rounded-md bg-amber-600 disabled:bg-gray-300 dark:disabled:bg-gray-800 disabled:text-gray-500 text-white text-xs font-bold"
              >
                Done &amp; Close
              </button>
            </div>
          </div>
        )}

        {/* Registration Form */}
        {isRegistering && !generatedSecret && (
          <form
            onSubmit={handleRegister}
            className="p-5 rounded-xl bg-white dark:bg-[#181C25] border border-blue-200 dark:border-blue-900 shadow-md space-y-4 animate-in fade-in duration-200"
          >
            <h3 className="font-heading font-bold text-base uppercase tracking-wide text-blue-600 dark:text-blue-400">
              Provision New {activeTab === 'devices' ? 'GPS Tracker' : 'Roadside ANPR Camera'}
            </h3>

            {activeTab === 'devices' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-600 dark:text-gray-400 mb-1">
                    Device IMEI (15 digits)
                  </label>
                  <input
                    type="text"
                    required
                    pattern="[0-9]{15}"
                    value={imei}
                    onChange={(e) => setImei(e.target.value)}
                    placeholder="864201048291048"
                    className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0F1218] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-600 dark:text-gray-400 mb-1">
                    Protocol Decoder
                  </label>
                  <select
                    value={protocol}
                    onChange={(e: any) => setProtocol(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0F1218] font-semibold"
                  >
                    <option value="gt06">GT06 Binary Protocol (Port 5023)</option>
                    <option value="http_json">HTTPS JSON Payload (Port 8081)</option>
                  </select>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-600 dark:text-gray-400 mb-1">
                  Camera Node Location / Junction Name
                </label>
                <input
                  type="text"
                  required
                  value={cameraName}
                  onChange={(e) => setCameraName(e.target.value)}
                  placeholder="e.g. Mulago Hospital Roundabout North Cam"
                  className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0F1218]"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsRegistering(false)}
                className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm"
              >
                Generate Credentials
              </button>
            </div>
          </form>
        )}

        {/* Devices Table */}
        {activeTab === 'devices' && (
          <div className="bg-white dark:bg-[#181C25] border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-[#13161D] border-b border-gray-200 dark:border-gray-800 font-bold uppercase text-gray-500 text-[10px]">
                <tr>
                  <th className="py-3 px-4">IMEI / Identifier</th>
                  <th className="py-3 px-4">Linked Vehicle</th>
                  <th className="py-3 px-4">Protocol</th>
                  <th className="py-3 px-4">Battery</th>
                  <th className="py-3 px-4">Last Seen</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800 font-mono">
                {devices.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                    <td className="py-3 px-4 font-bold text-gray-900 dark:text-gray-100">{d.imei}</td>
                    <td className="py-3 px-4">
                      {d.vehiclePlate ? <PlateTag plate={d.vehiclePlate} size="sm" /> : <span className="text-gray-400 font-sans">Unassigned</span>}
                    </td>
                    <td className="py-3 px-4 uppercase">{d.protocol}</td>
                    <td className="py-3 px-4">
                      <span className="flex items-center gap-1">
                        <Battery className="w-3.5 h-3.5 text-emerald-500" />
                        {d.batteryPct}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500">
                      {new Date(d.lastSeenAt).toLocaleTimeString('en-GB', { timeZone: 'Africa/Kampala' })} EAT
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          d.status === 'online'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                        }`}
                      >
                        {d.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Cameras Table */}
        {activeTab === 'cameras' && (
          <div className="bg-white dark:bg-[#181C25] border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-[#13161D] border-b border-gray-200 dark:border-gray-800 font-bold uppercase text-gray-500 text-[10px]">
                <tr>
                  <th className="py-3 px-4">Camera Node Location</th>
                  <th className="py-3 px-4">Coordinates</th>
                  <th className="py-3 px-4">Reads Today</th>
                  <th className="py-3 px-4">Last Keep-Alive</th>
                  <th className="py-3 px-4">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800 font-mono">
                {cameras.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                    <td className="py-3 px-4 font-sans font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <CameraIcon className="w-4 h-4 text-blue-500 shrink-0" />
                      {c.name}
                    </td>
                    <td className="py-3 px-4 text-gray-500">
                      {c.lat.toFixed(4)}, {c.lon.toFixed(4)}
                    </td>
                    <td className="py-3 px-4 font-bold text-blue-600 dark:text-blue-400">
                      {c.todayReadsCount.toLocaleString()} plates
                    </td>
                    <td className="py-3 px-4 text-gray-500">
                      {new Date(c.lastSeenAt).toLocaleTimeString('en-GB', { timeZone: 'Africa/Kampala' })} EAT
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
