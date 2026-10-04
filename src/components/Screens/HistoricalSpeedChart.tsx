import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { Vehicle } from '../../types';
import { Gauge, Clock, Zap, AlertTriangle, TrendingUp, ShieldCheck } from 'lucide-react';

interface HistoricalSpeedChartProps {
  vehicle: Vehicle;
  playbackIndex?: number;
  onSelectTimePoint?: (index: number) => void;
}

export interface TelemetryPoint {
  time: string;
  hour: number;
  fullTimestamp: string;
  speed: number;
  speedLimit: number;
  battery: number;
  ignition: boolean;
  location: string;
  isOverSpeed: boolean;
}

export const HistoricalSpeedChart: React.FC<HistoricalSpeedChartProps> = ({
  vehicle,
  playbackIndex,
  onSelectTimePoint,
}) => {
  const [timeRange, setTimeRange] = useState<'24h' | '12h' | '6h'>('24h');

  // Generate deterministic realistic 24-hour telemetry points based on vehicle ID and status
  const telemetryData: TelemetryPoint[] = useMemo(() => {
    const points: TelemetryPoint[] = [];
    const now = new Date();
    const totalPoints = 24; // 1 reading per hour over the last 24h
    const isStolen = vehicle.status === 'stolen';

    const locations = [
      'Depot / Parking Natete',
      'Masaka Road outbound',
      'Busega Northern Bypass flyover',
      'Kalerwe Market Interchange',
      'Mulago Hill intersection',
      'Wandegeya / Makerere',
      'Kampala Road / Posta Uganda',
      'Clock Tower Roundabout',
      'Jinja Road / Wampewo roundabout',
      'Lugogo Bypass commercial zone',
      'Nakawa / Spear Motors junction',
      'Bugolobi / Spring Road corridor',
    ];

    for (let i = totalPoints; i >= 0; i--) {
      const pointTime = new Date(now.getTime() - i * 3600000);
      const hour = pointTime.getHours();
      const timeStr = pointTime.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Africa/Kampala',
      });

      // Realistic speed profile:
      let baseSpeed = 0;
      let ignition = false;

      if (hour >= 23 || hour < 5) {
        // Late night: mostly stationary
        baseSpeed = isStolen ? 45 : (hour === 2 ? 0 : 0);
        ignition = baseSpeed > 0;
      } else if (hour >= 7 && hour <= 9) {
        // Morning rush hour in Kampala: 15-35 kph
        baseSpeed = 22 + ((i * 7) % 15);
        ignition = true;
      } else if (hour >= 11 && hour <= 14) {
        // Mid-day bypass travel: 45-68 kph
        baseSpeed = 48 + ((i * 11) % 24);
        ignition = true;
      } else if (hour >= 17 && hour <= 20) {
        // Evening rush: 12-28 kph
        baseSpeed = 18 + ((i * 5) % 14);
        ignition = true;
      } else {
        baseSpeed = 35 + ((i * 9) % 25);
        ignition = true;
      }

      // If vehicle is flagged as stolen, add a prominent spike in the last few hours
      if (isStolen && i <= 3) {
        baseSpeed = 68 + i * 4; // 68 - 80 km/h flight speed
        ignition = true;
      }

      const speedLimit = 50;
      const speed = Math.max(0, Math.round(baseSpeed));
      const battery = Math.max(20, Math.min(100, Math.round(vehicle.batteryPct - (i * 0.4))));
      const location = locations[(hour + i) % locations.length];

      points.push({
        time: timeStr,
        hour,
        fullTimestamp: pointTime.toLocaleString('en-GB', { timeZone: 'Africa/Kampala' }),
        speed,
        speedLimit,
        battery,
        ignition,
        location,
        isOverSpeed: speed > speedLimit,
      });
    }

    return points;
  }, [vehicle.id, vehicle.status, vehicle.batteryPct]);

  // Filter based on selected time range
  const filteredData = useMemo(() => {
    if (timeRange === '6h') return telemetryData.slice(-7);
    if (timeRange === '12h') return telemetryData.slice(-13);
    return telemetryData;
  }, [telemetryData, timeRange]);

  // Aggregate telemetry metrics
  const maxSpeed = useMemo(() => Math.max(...filteredData.map((d) => d.speed)), [filteredData]);
  const avgSpeed = useMemo(() => {
    const moving = filteredData.filter((d) => d.speed > 0);
    if (!moving.length) return 0;
    const sum = moving.reduce((acc, cur) => acc + cur.speed, 0);
    return Math.round(sum / moving.length);
  }, [filteredData]);
  const overSpeedCount = useMemo(
    () => filteredData.filter((d) => d.isOverSpeed).length,
    [filteredData]
  );
  const distanceEstimateKm = useMemo(() => {
    // Trapezoidal approximate distance
    return Math.round(
      filteredData.reduce((acc, cur) => acc + (cur.speed * 1.0), 0) / (timeRange === '24h' ? 1.4 : 1.1)
    );
  }, [filteredData, timeRange]);

  return (
    <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-[#13161D] space-y-3 select-none">
      {/* Chart Title and Time Range Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-1.5">
          <Gauge className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="font-heading font-bold text-xs uppercase tracking-wider text-gray-800 dark:text-gray-200">
            Speed Telemetry (24h History)
          </span>
        </div>

        <div className="flex items-center gap-1 bg-white dark:bg-[#181C25] p-0.5 rounded-md border border-gray-300 dark:border-gray-700 text-[10px] font-mono font-bold">
          {(['6h', '12h', '24h'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-2 py-0.5 rounded transition-all ${
                timeRange === range
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Aggregate Stats Bar */}
      <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-mono">
        <div className="p-1.5 rounded-lg bg-white dark:bg-[#181C25] border border-gray-200 dark:border-gray-800">
          <div className="text-gray-400">Peak Speed</div>
          <div className={`font-bold text-xs ${maxSpeed > 50 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-gray-100'}`}>
            {maxSpeed} km/h
          </div>
        </div>

        <div className="p-1.5 rounded-lg bg-white dark:bg-[#181C25] border border-gray-200 dark:border-gray-800">
          <div className="text-gray-400">Avg Moving</div>
          <div className="font-bold text-xs text-blue-600 dark:text-blue-400">
            {avgSpeed} km/h
          </div>
        </div>

        <div className="p-1.5 rounded-lg bg-white dark:bg-[#181C25] border border-gray-200 dark:border-gray-800">
          <div className="text-gray-400">Est. Travel</div>
          <div className="font-bold text-xs text-emerald-600 dark:text-emerald-400">
            {distanceEstimateKm} km
          </div>
        </div>

        <div className="p-1.5 rounded-lg bg-white dark:bg-[#181C25] border border-gray-200 dark:border-gray-800">
          <div className="text-gray-400">&gt; 50 km/h</div>
          <div className={`font-bold text-xs ${overSpeedCount > 0 ? 'text-red-500 font-extrabold' : 'text-gray-500'}`}>
            {overSpeedCount} alerts
          </div>
        </div>
      </div>

      {/* Recharts Area Chart */}
      <div className="w-full h-44 relative">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={filteredData}
            margin={{ top: 10, right: 10, left: -24, bottom: 0 }}
          >
            <defs>
              <linearGradient id="speedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#B3261E" stopOpacity={0.6} />
                <stop offset="50%" stopColor="#F2B705" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#0B63CE" stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="2 2"
              stroke="#888888"
              opacity={0.15}
              vertical={false}
            />

            <XAxis
              dataKey="time"
              tickLine={false}
              axisLine={{ stroke: '#888888', opacity: 0.2 }}
              tick={{ fontSize: 9, fill: '#888888' }}
              interval="preserveStartEnd"
            />

            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 9, fill: '#888888' }}
              domain={[0, (dataMax: number) => Math.max(80, Math.ceil(dataMax / 10) * 10)]}
              unit="kph"
            />

            {/* Statutory Urban Speed Limit Reference Line */}
            <ReferenceLine
              y={50}
              stroke="#B3261E"
              strokeDasharray="3 3"
              strokeWidth={1.5}
              label={{
                value: '50 kph Limit',
                position: 'top',
                fill: '#B3261E',
                fontSize: 9,
                fontWeight: 'bold',
              }}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as TelemetryPoint;
                  return (
                    <div className="rounded-lg bg-gray-900/95 text-white p-2 shadow-xl border border-gray-700 text-xs font-mono space-y-1 backdrop-blur-xs">
                      <div className="flex items-center justify-between gap-3 text-[10px] text-gray-400 border-b border-gray-800 pb-0.5">
                        <span>{data.fullTimestamp}</span>
                        <span className={data.ignition ? 'text-amber-400' : 'text-gray-500'}>
                          {data.ignition ? '● IGN ON' : '○ IGN OFF'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <span className="text-gray-300">Speed:</span>
                        <span
                          className={`font-bold text-sm ${
                            data.speed > 50
                              ? 'text-red-400'
                              : data.speed > 0
                              ? 'text-emerald-400'
                              : 'text-gray-400'
                          }`}
                        >
                          {data.speed} km/h
                        </span>
                      </div>

                      <div className="text-[10px] text-gray-400 truncate max-w-[200px]">
                        Loc: {data.location}
                      </div>

                      <div className="flex justify-between text-[10px] text-gray-400 pt-0.5">
                        <span>Battery: {data.battery}%</span>
                        {data.isOverSpeed && (
                          <span className="text-red-400 font-bold uppercase flex items-center gap-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" /> Over Limit
                          </span>
                        )}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            <Area
              type="monotone"
              dataKey="speed"
              stroke="#B3261E"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#speedGradient)"
              activeDot={{ r: 5, fill: '#F2B705', stroke: '#14181F', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono pt-0.5">
        <span className="flex items-center gap-1">
          <span className="w-2 h-0.5 bg-red-600 inline-block"></span>
          <span>Red dashed: 50 km/h urban speed threshold</span>
        </span>
        <span>EAT (UTC+3)</span>
      </div>
    </div>
  );
};
