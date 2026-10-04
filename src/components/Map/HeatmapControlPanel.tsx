import React from 'react';
import { ColorSchemeId, UGANDA_HOTSPOTS } from './D3HeatmapOverlay';
import { Flame, Sliders, Eye, EyeOff, MapPin, X, Sparkles } from 'lucide-react';

interface HeatmapControlPanelProps {
  isOpen: boolean;
  onClose: () => void;
  showHeatmap: boolean;
  onToggleHeatmap: () => void;
  bandwidth: number;
  onChangeBandwidth: (val: number) => void;
  opacity: number;
  onChangeOpacity: (val: number) => void;
  colorScheme: ColorSchemeId;
  onChangeColorScheme: (scheme: ColorSchemeId) => void;
  includeCorridors: boolean;
  onToggleIncludeCorridors: () => void;
  onFlyToHotspot: (lat: number, lon: number) => void;
}

export const HeatmapControlPanel: React.FC<HeatmapControlPanelProps> = ({
  isOpen,
  onClose,
  showHeatmap,
  onToggleHeatmap,
  bandwidth,
  onChangeBandwidth,
  opacity,
  onChangeOpacity,
  colorScheme,
  onChangeColorScheme,
  includeCorridors,
  onToggleIncludeCorridors,
  onFlyToHotspot,
}) => {
  if (!isOpen) return null;

  const gradientStyles: Record<ColorSchemeId, string> = {
    ylorrd: 'linear-gradient(to right, #ffffb2, #fed976, #feb24c, #fd8d3c, #f03b20, #bd0026)',
    inferno: 'linear-gradient(to right, #000004, #420a68, #932667, #dd513a, #fca50a, #fcffa4)',
    turbo: 'linear-gradient(to right, #30123b, #4662d8, #1ae4b6, #a2fc3c, #fb8022, #7a0403)',
    viridis: 'linear-gradient(to right, #440154, #3b528b, #21908c, #5dc863, #fde725)',
  };

  return (
    <div className="absolute top-14 left-3 z-30 w-80 rounded-xl bg-white/95 dark:bg-[#181C25]/95 backdrop-blur-md border border-gray-200 dark:border-gray-800 shadow-xl p-4 text-gray-900 dark:text-gray-100 text-xs select-none animate-in fade-in slide-in-from-top-2 duration-150">
      {/* Title */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-800 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-heading font-bold text-sm uppercase tracking-wide">
              D3.js Density Clusters
            </h4>
            <span className="text-[10px] text-gray-500 font-mono">2D Kernel Density Contours</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3.5">
        {/* Active Toggle */}
        <div className="flex items-center justify-between bg-gray-50 dark:bg-[#13161D] p-2.5 rounded-lg border border-gray-200 dark:border-gray-800">
          <span className="font-semibold text-xs">Heatmap Layer Active</span>
          <button
            onClick={onToggleHeatmap}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
              showHeatmap
                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}
          >
            {showHeatmap ? 'Enabled' : 'Disabled'}
          </button>
        </div>

        {/* Color Palette Selector */}
        <div>
          <label className="block text-[11px] font-semibold uppercase text-gray-500 mb-1.5">
            D3 Color Scale
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: 'ylorrd' as const, label: 'Flame (YlOrRd)' },
              { id: 'inferno' as const, label: 'Thermal (Inferno)' },
              { id: 'turbo' as const, label: 'Spectrum (Turbo)' },
              { id: 'viridis' as const, label: 'Emerald (Viridis)' },
            ].map((scheme) => (
              <button
                key={scheme.id}
                onClick={() => onChangeColorScheme(scheme.id)}
                className={`px-2 py-1.5 rounded-md border text-left font-medium transition-all ${
                  colorScheme === scheme.id
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-bold'
                    : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {scheme.label}
              </button>
            ))}
          </div>
        </div>

        {/* D3 Gradient Legend */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-mono text-gray-500">
            <span>Low Density</span>
            <span>Cluster Core</span>
          </div>
          <div
            className="h-2.5 w-full rounded-full border border-gray-300 dark:border-gray-700 shadow-inner"
            style={{ background: gradientStyles[colorScheme] }}
          />
        </div>

        {/* Sliders: Bandwidth & Opacity */}
        <div className="space-y-2 pt-1 border-t border-gray-200 dark:border-gray-800">
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="font-semibold text-gray-600 dark:text-gray-400">
                Gaussian Bandwidth (Radius):
              </span>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                {bandwidth} px
              </span>
            </div>
            <input
              type="range"
              min="15"
              max="70"
              step="5"
              value={bandwidth}
              onChange={(e) => onChangeBandwidth(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="font-semibold text-gray-600 dark:text-gray-400">Layer Opacity:</span>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                {Math.round(opacity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.2"
              max="0.95"
              step="0.05"
              value={opacity}
              onChange={(e) => onChangeOpacity(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Include Kampala Traffic Convergence Nodes */}
        <div className="flex items-center justify-between text-xs pt-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeCorridors}
              onChange={onToggleIncludeCorridors}
              className="rounded accent-amber-500 w-3.5 h-3.5"
            />
            <span className="text-gray-700 dark:text-gray-300 font-medium">
              Include Regional Traffic Hubs
            </span>
          </label>
        </div>

        {/* Quick Jumps to Regional Convergence Hotspots */}
        <div className="space-y-1 pt-2 border-t border-gray-200 dark:border-gray-800">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Jump to High Density Hub:
          </span>
          <div className="flex flex-wrap gap-1">
            {UGANDA_HOTSPOTS.map((h, i) => (
              <button
                key={i}
                onClick={() => onFlyToHotspot(h.lat, h.lon)}
                className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-[10px] font-mono text-gray-700 dark:text-gray-300 flex items-center gap-1"
              >
                <MapPin className="w-2.5 h-2.5 text-red-500" />
                {h.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
