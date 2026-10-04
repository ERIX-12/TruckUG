import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import maplibreglWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { Vehicle, Camera, Geofence, Alert } from '../../types';
import { D3HeatmapOverlay, ColorSchemeId } from './D3HeatmapOverlay';
import { HeatmapControlPanel } from './HeatmapControlPanel';
import { useRenderPerformance } from '../../hooks/useRenderPerformance';
// Set worker URL explicitly so Vite loads the bundled web worker correctly
if (typeof window !== 'undefined' && (maplibregl as any).setWorkerUrl) {
  try {
    (maplibregl as any).setWorkerUrl(maplibreglWorkerUrl || '/maplibre-gl-worker.mjs');
  } catch {
    // Fallback handled by browser
  }
}
import {
  Navigation,
  Compass,
  Layers,
  AlertCircle,
  Flame,
  Sliders,
  ChevronDown,
} from 'lucide-react';

interface LiveMapProps {
  vehicles: Vehicle[];
  alerts: Alert[];
  cameras: Camera[];
  geofences: Geofence[];
  selectedVehicleId?: string;
  onSelectVehicle: (vehicle: Vehicle) => void;
  followVehicle?: boolean;
  onToggleFollow?: () => void;
}

export const LiveMap: React.FC<LiveMapProps> = ({
  vehicles = [],
  alerts = [],
  cameras = [],
  geofences = [],
  selectedVehicleId,
  onSelectVehicle,
  followVehicle = false,
  onToggleFollow,
}) => {
  useRenderPerformance('LiveMap');
  
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const markersRef = useRef<{ [key: string]: maplibregl.Marker }>({});
  const cameraMarkersRef = useRef<{ [key: string]: maplibregl.Marker }>({});
  const [mapError, setMapError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(followVehicle);

  // D3 Heatmap Layer States
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showHeatmapControls, setShowHeatmapControls] = useState(false);
  const [heatmapBandwidth, setHeatmapBandwidth] = useState(35);
  const [heatmapOpacity, setHeatmapOpacity] = useState(0.75);
  const [heatmapColorScheme, setHeatmapColorScheme] = useState<ColorSchemeId>('ylorrd');
  const [includeCorridorPings, setIncludeCorridorPings] = useState(true);

  // Initialize Map
  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    try {
      const map = new maplibregl.Map({
        container: mapContainer.current,
        style: {
          version: 8,
          sources: {
            osm: {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
            },
          },
          layers: [
            {
              id: 'osm-tiles',
              type: 'raster',
              source: 'osm',
              minzoom: 0,
              maxzoom: 19,
            },
          ],
        },
        center: [32.4, 1.3], // Uganda Center [lon, lat]
        zoom: 6.5,
      });

      map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');

      map.on('error', (e: any) => {
        const errorMsg = e?.error?.message || e?.message || (typeof e === 'string' ? e : 'Map event error');
        console.warn('MapLibre event error:', errorMsg);
        setMapError(errorMsg);
      });

      map.on('load', () => {
        setMapReady(true);

        // Draw Geofences GeoJSON
        const geofenceFeatures = geofences.map((gf) => ({
          type: 'Feature' as const,
          properties: {
            id: gf.id,
            name: gf.name,
            rule: gf.rule,
          },
          geometry: {
            type: 'Polygon' as const,
            coordinates: [
              gf.coordinates.map(([lat, lon]) => [lon, lat]), // Leaflet/GeoJSON lon, lat
            ],
          },
        }));

        if (!map.getSource('geofences-src')) {
          map.addSource('geofences-src', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: geofenceFeatures,
            },
          });

          map.addLayer({
            id: 'geofences-fill',
            type: 'fill',
            source: 'geofences-src',
            paint: {
              'fill-color': '#0B63CE',
              'fill-opacity': 0.15,
            },
          });

          map.addLayer({
            id: 'geofences-line',
            type: 'line',
            source: 'geofences-src',
            paint: {
              'line-color': '#0B63CE',
              'line-width': 2,
              'line-dasharray': [2, 2],
            },
          });
        }
      });

      mapInstance.current = map;
    } catch (err: any) {
      const msg = err?.message || String(err);
      console.error('Failed to initialize MapLibre map:', msg);
      setMapError('Unable to load OpenStreetMap tiles. Markers will continue to display.');
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Update Vehicle Markers
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    vehicles.forEach((veh) => {
      if (!veh.lastPosition) return;
      const { lat, lon, heading = 0, speedKph = 0 } = veh.lastPosition;
      const isSelected = veh.id === selectedVehicleId;
      const isStolen = veh.status === 'stolen';

      let marker = markersRef.current[veh.id];

      if (!marker) {
        const el = document.createElement('div');
        el.className = 'vehicle-marker-wrapper cursor-pointer select-none transition-transform duration-300';
        el.addEventListener('click', () => {
          onSelectVehicle(veh);
        });

        marker = new maplibregl.Marker({ element: el }).setLngLat([lon, lat]).addTo(map);
        markersRef.current[veh.id] = marker;
      } else {
        marker.setLngLat([lon, lat]);
      }

      // Render marker element
      const el = marker.getElement();
      el.innerHTML = `
        <div class="relative group flex flex-col items-center">
          <!-- Plate Label Tag -->
          <div class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase shadow-md whitespace-nowrap mb-1 border ${
            isStolen
              ? 'bg-red-600 text-white border-red-900 animate-bounce'
              : isSelected
              ? 'bg-[#F2B705] text-[#1A1500] border-gray-900 ring-2 ring-blue-500'
              : 'bg-white/95 text-gray-900 border-gray-300 dark:bg-gray-900/90 dark:text-gray-100 dark:border-gray-700'
          }">
            ${veh.plate} <span class="text-[8px] opacity-75">${speedKph}kph</span>
          </div>

          <!-- Direction Arrow Icon -->
          <div class="w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-transform ${
            isStolen
              ? 'bg-[#B3261E] text-white ring-4 ring-red-400/50'
              : veh.status === 'active'
              ? 'bg-emerald-600 text-white'
              : 'bg-gray-500 text-white'
          } ${isSelected ? 'ring-4 ring-amber-400 scale-110' : ''}">
            <svg style="transform: rotate(${heading}deg); transition: transform 0.5s ease-out;" class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
            </svg>
          </div>
        </div>
      `;
    });

    // Handle Follow Vehicle
    if (isFollowing && selectedVehicleId) {
      const selected = vehicles.find((v) => v.id === selectedVehicleId);
      if (selected && selected.lastPosition) {
        map.easeTo({
          center: [selected.lastPosition.lon, selected.lastPosition.lat],
          zoom: Math.max(map.getZoom(), 14),
          duration: 1000,
        });
      }
    }
  }, [vehicles, selectedVehicleId, isFollowing]);

  // Center map on selected vehicle change
  useEffect(() => {
    if (!mapInstance.current || !selectedVehicleId) return;
    const vehicle = vehicles.find((v) => v.id === selectedVehicleId);
    if (vehicle && vehicle.lastPosition) {
      mapInstance.current.flyTo({
        center: [vehicle.lastPosition.lon, vehicle.lastPosition.lat],
        zoom: 14,
        essential: true,
      });
    }
  }, [selectedVehicleId]);

  // Update Camera Markers
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    cameras.forEach((cam) => {
      let marker = cameraMarkersRef.current[cam.id];
      if (!marker) {
        const el = document.createElement('div');
        el.className = 'camera-marker-wrapper select-none cursor-pointer';
        el.innerHTML = `
          <div class="group relative flex flex-col items-center">
            <div class="hidden group-hover:block absolute bottom-8 px-2 py-0.5 rounded bg-gray-900 text-white text-[10px] font-mono whitespace-nowrap shadow-md z-20">
              ${cam.name} (${cam.todayReadsCount} reads)
            </div>
            <div class="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center border-2 border-white shadow-md">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                <circle cx="12" cy="13" r="3"/>
              </svg>
            </div>
          </div>
        `;
        marker = new maplibregl.Marker({ element: el }).setLngLat([cam.lon, cam.lat]).addTo(map);
        cameraMarkersRef.current[cam.id] = marker;
      }
    });
  }, [cameras]);

  const handleFlyToHotspot = (lat: number, lon: number) => {
    if (mapInstance.current) {
      mapInstance.current.flyTo({
        center: [lon, lat],
        zoom: 14.5,
        duration: 1200,
      });
    }
  };

  return (
    <div className="relative w-full h-full min-h-[400px] overflow-hidden bg-slate-100 dark:bg-slate-900">
      {/* Map Container */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* D3.js Density Heatmap Layer */}
      {showHeatmap && mapReady && (
        <D3HeatmapOverlay
          map={mapInstance.current}
          vehicles={vehicles}
          alerts={alerts}
          bandwidth={heatmapBandwidth}
          opacity={heatmapOpacity}
          colorScheme={heatmapColorScheme}
          includeCorridorPings={includeCorridorPings}
        />
      )}

      {/* Network or Tile Error Banner */}
      {mapError && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 rounded-md bg-amber-500/90 text-white text-xs font-medium shadow-md flex items-center gap-2 backdrop-blur-xs">
          <AlertCircle className="w-4 h-4" />
          <span>{mapError}</span>
        </div>
      )}

      {/* Floating Controls Bar */}
      <div className="absolute top-3 left-3 z-30 flex flex-wrap items-center gap-1.5 bg-white/95 dark:bg-[#181C25]/95 backdrop-blur-md p-1.5 rounded-lg border border-gray-200 dark:border-gray-800 shadow-md text-xs">
        {/* D3 Heatmap Toggle Button */}
        <div className="flex items-center rounded-md border border-amber-300 dark:border-amber-800/80 bg-amber-50/80 dark:bg-amber-950/40 p-0.5">
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold transition-all ${
              showHeatmap
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40'
            }`}
            title="Toggle D3.js Vehicle Density Heatmap"
          >
            <Flame className={`w-3.5 h-3.5 ${showHeatmap ? 'animate-pulse' : ''}`} />
            <span>Heatmap (D3)</span>
          </button>

          <button
            onClick={() => setShowHeatmapControls(!showHeatmapControls)}
            className={`p-1 rounded text-amber-800 dark:text-amber-300 hover:bg-amber-200/60 dark:hover:bg-amber-900/60 transition-colors ${
              showHeatmapControls ? 'bg-amber-200 dark:bg-amber-900' : ''
            }`}
            title="Configure D3 Heatmap Parameters"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-4 w-px bg-gray-300 dark:bg-gray-700 mx-0.5"></div>

        {/* Follow Selected Vehicle Toggle */}
        <button
          onClick={() => {
            const next = !isFollowing;
            setIsFollowing(next);
            if (onToggleFollow) onToggleFollow();
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-semibold transition-colors ${
            isFollowing
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
          title="Keep map centered on selected vehicle"
        >
          <Navigation className={`w-3.5 h-3.5 ${isFollowing ? 'animate-pulse' : ''}`} />
          <span>Follow Selected</span>
        </button>

        {/* Reset to Kampala Center */}
        <button
          onClick={() => {
            if (mapInstance.current) {
              mapInstance.current.flyTo({ center: [32.5811, 0.3136], zoom: 12.5 });
            }
          }}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium"
          title="Reset View to Kampala Metro"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Kampala Center</span>
        </button>

        <div className="h-4 w-px bg-gray-300 dark:bg-gray-700 mx-0.5"></div>

        <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400 px-1">
          {vehicles.length} GPS | {cameras.length} ANPR
        </span>
      </div>

      {/* Heatmap Configuration Popover Panel */}
      <HeatmapControlPanel
        isOpen={showHeatmapControls}
        onClose={() => setShowHeatmapControls(false)}
        showHeatmap={showHeatmap}
        onToggleHeatmap={() => setShowHeatmap(!showHeatmap)}
        bandwidth={heatmapBandwidth}
        onChangeBandwidth={setHeatmapBandwidth}
        opacity={heatmapOpacity}
        onChangeOpacity={setHeatmapOpacity}
        colorScheme={heatmapColorScheme}
        onChangeColorScheme={setHeatmapColorScheme}
        includeCorridors={includeCorridorPings}
        onToggleIncludeCorridors={() => setIncludeCorridorPings(!includeCorridorPings)}
        onFlyToHotspot={handleFlyToHotspot}
      />

      {/* Mini Heatmap Legend in bottom-left when active */}
      {showHeatmap && (
        <div className="absolute bottom-6 left-3 z-20 bg-white/90 dark:bg-[#181C25]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 shadow-md text-[11px] font-mono flex items-center gap-2">
          <Flame className="w-3.5 h-3.5 text-amber-500" />
          <span className="font-semibold text-gray-700 dark:text-gray-300">D3 Density:</span>
          <div className="w-16 h-2 rounded-full overflow-hidden bg-gradient-to-r from-yellow-200 via-orange-500 to-red-600"></div>
          <span className="text-[10px] text-gray-500">Kernel: {heatmapBandwidth}px</span>
        </div>
      )}
    </div>
  );
};
