import React, { useEffect, useRef, useState, useMemo } from 'react';
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
  Volume2,
  Siren,
  ShieldAlert,
  Clock,
} from 'lucide-react';
import { speakVehicleLocation } from '../../utils/voiceNavigator';
import {
  ActiveInterceptState,
  generateInterceptCorridorPath,
} from '../../utils/interceptNavigator';
import {
  UGANDA_BORDER_GEOJSON,
  isVehicleInUganda,
} from '../../utils/geoRules';

interface LiveMapProps {
  vehicles: Vehicle[];
  alerts: Alert[];
  cameras: Camera[];
  geofences: Geofence[];
  selectedVehicleId?: string;
  onSelectVehicle: (vehicle: Vehicle) => void;
  followVehicle?: boolean;
  onToggleFollow?: () => void;
  onLocateVehicle?: (vehicle: Vehicle) => void;
  activeIntercept?: ActiveInterceptState | null;
  onClearIntercept?: () => void;
  onCancelIntercept?: () => void;
  onCompleteIntercept?: () => void;
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
  onLocateVehicle,
  activeIntercept = null,
  onClearIntercept,
  onCancelIntercept,
  onCompleteIntercept,
}) => {
  useRenderPerformance('LiveMap');
  
  // Strictly filter vehicles located within the sovereign boundaries of Uganda
  const inBoundsVehicles = useMemo(() => vehicles.filter(isVehicleInUganda), [vehicles]);

  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const markersRef = useRef<{ [key: string]: maplibregl.Marker }>({});
  const cameraMarkersRef = useRef<{ [key: string]: maplibregl.Marker }>({});
  const [mapError, setMapError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(followVehicle);
  const interceptEtaMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [navigatingVehicle, setNavigatingVehicle] = useState<{
    vehicleId: string;
    lat: number;
    lon: number;
    plate: string;
    speed: number;
    address: string;
  } | null>(null);

  // Listen for direct voice locate navigation trigger
  useEffect(() => {
    const handleNavigateMap = (e: any) => {
      const detail = e.detail;
      if (!detail) return;
      setIsFollowing(true);
      setNavigatingVehicle(detail);

      if (mapInstance.current) {
        mapInstance.current.flyTo({
          center: [detail.lon, detail.lat],
          zoom: 15,
          speed: 1.2,
          curve: 1.4,
          essential: true,
        });
      }
    };

    window.addEventListener('trackug-navigate-map', handleNavigateMap);
    return () => window.removeEventListener('trackug-navigate-map', handleNavigateMap);
  }, []);

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
        center: [32.35, 1.35], // Uganda Center [lon, lat]
        zoom: 6.8,
        minZoom: 5.5,
        maxBounds: [
          [28.8, -1.8], // Southwest bound: lon, lat
          [35.6, 4.6],  // Northeast bound: lon, lat
        ],
      });

      map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');

      map.on('error', (e: any) => {
        const errorMsg = e?.error?.message || e?.message || (typeof e === 'string' ? e : 'Map event error');
        console.warn('MapLibre event error:', errorMsg);
        setMapError(errorMsg);
      });

      map.on('load', () => {
        setMapReady(true);

        // Draw Uganda National Territorial Boundary (Tracking Zone)
        if (!map.getSource('uganda-border-src')) {
          map.addSource('uganda-border-src', {
            type: 'geojson',
            data: UGANDA_BORDER_GEOJSON,
          });

          map.addLayer({
            id: 'uganda-border-fill',
            type: 'fill',
            source: 'uganda-border-src',
            paint: {
              'fill-color': '#10B981',
              'fill-opacity': 0.03,
            },
          });

          map.addLayer({
            id: 'uganda-border-line',
            type: 'line',
            source: 'uganda-border-src',
            paint: {
              'line-color': '#059669',
              'line-width': 2.5,
              'line-dasharray': [3, 2],
              'line-opacity': 0.85,
            },
          });
        }

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
      // Remove intercept ETA marker if present
      if (interceptEtaMarkerRef.current) {
        interceptEtaMarkerRef.current.remove();
        interceptEtaMarkerRef.current = null;
      }

      // Remove all vehicle markers
      Object.values(markersRef.current).forEach((m) => m.remove());
      markersRef.current = {};

      // Remove all camera markers
      Object.values(cameraMarkersRef.current).forEach((m) => m.remove());
      cameraMarkersRef.current = {};

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

    // Tracking is strictly bounded to vehicles located within the sovereign boundaries of Uganda
    const inBoundsVehicles = vehicles.filter((v) => isVehicleInUganda(v));
    const activeVehicleIds = new Set(inBoundsVehicles.map((v) => v.id));
    Object.keys(markersRef.current).forEach((id) => {
      if (!activeVehicleIds.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    inBoundsVehicles.forEach((veh) => {
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
      const isNavigating = navigatingVehicle && navigatingVehicle.vehicleId === veh.id;
      const isInterceptPatrol = !!(activeIntercept && activeIntercept.patrolVehicle.id === veh.id && activeIntercept.status === 'en_route');
      const isInterceptTarget = !!(activeIntercept && activeIntercept.targetVehicle.id === veh.id && activeIntercept.status === 'en_route');
      const isInterceptInProgress = isInterceptPatrol || isInterceptTarget;

      el.className = `vehicle-marker-wrapper cursor-pointer select-none transition-transform duration-300 ${
        isInterceptInProgress
          ? `intercept-in-progress ${isInterceptPatrol ? 'intercept-patrol' : 'intercept-target'}`
          : ''
      }`;

      el.innerHTML = `
        <div class="relative group flex flex-col items-center">
          ${isInterceptInProgress ? `
            <!-- Concentric Expanding Sonar Radar Waves -->
            <div class="intercept-wave intercept-wave-1"></div>
            <div class="intercept-wave intercept-wave-2"></div>
            <div class="intercept-wave intercept-wave-3"></div>
          ` : ''}

          ${(isSelected || isNavigating) && !isInterceptInProgress ? '<span class="absolute -inset-3 rounded-full border-2 border-emerald-400 dark:border-emerald-300 animate-ping opacity-75 pointer-events-none"></span>' : ''}
          
          <!-- Tactical Maneuver Status Tag -->
          ${isInterceptInProgress ? `
            <div class="px-2 py-0.5 rounded-full text-[9px] font-mono font-black uppercase tracking-wider shadow-lg whitespace-nowrap mb-1 border flex items-center gap-1 intercept-badge-pulse ${
              isInterceptPatrol
                ? 'bg-blue-600 text-white border-cyan-300 ring-2 ring-blue-400/80'
                : 'bg-red-600 text-white border-amber-300 ring-2 ring-red-400/80'
            }">
              <span class="w-1.5 h-1.5 rounded-full ${isInterceptPatrol ? 'bg-cyan-300' : 'bg-amber-300'} animate-ping"></span>
              <span>${isInterceptPatrol ? '🚨 INTERCEPT IN PROGRESS' : '🎯 TARGET MANEUVER'}</span>
            </div>
          ` : ''}

          <!-- Plate Label Tag -->
          <div class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase shadow-md whitespace-nowrap mb-1 border ${
            isInterceptPatrol
              ? 'bg-blue-950 text-cyan-300 border-cyan-400 ring-2 ring-blue-500 font-extrabold shadow-cyan-500/50'
              : isInterceptTarget
              ? 'bg-red-950 text-red-200 border-red-500 ring-2 ring-red-400 font-extrabold shadow-red-500/50'
              : isStolen
              ? 'bg-red-600 text-white border-red-900 animate-bounce'
              : veh.isPoliceStation
              ? 'bg-blue-900 text-amber-300 border-amber-400/80 shadow-blue-950/60 font-black'
              : isSelected || isNavigating
              ? 'bg-[#F2B705] text-[#1A1500] border-gray-900 ring-2 ring-emerald-500'
              : 'bg-white/95 text-gray-900 border-gray-300 dark:bg-gray-900/90 dark:text-gray-100 dark:border-gray-700'
          }">
            ${isInterceptPatrol ? '🚨 ' : isInterceptTarget ? '🎯 ' : veh.isPoliceStation ? '🏢 ' : ''}${veh.plate}${veh.isPoliceStation ? ` • ${veh.callsign}` : ''} <span class="text-[8px] opacity-75">${speedKph}kph</span>
          </div>

          <!-- Direction Arrow Icon / Tactical Beacon Core -->
          <div class="w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-transform ${
            isInterceptInProgress
              ? 'intercept-beacon-core'
              : ''
          } ${
            isInterceptPatrol
              ? 'bg-blue-600 text-white ring-4 ring-cyan-400 scale-125'
              : isInterceptTarget || isStolen
              ? 'bg-[#B3261E] text-white ring-4 ring-red-500 scale-125'
              : veh.isPoliceStation
              ? 'bg-blue-950 text-amber-300 ring-2 ring-amber-400/80'
              : veh.status === 'active'
              ? 'bg-emerald-600 text-white'
              : 'bg-gray-500 text-white'
          } ${(isSelected || isNavigating) && !isInterceptInProgress ? 'ring-4 ring-emerald-400 scale-110' : ''}">
            ${veh.isPoliceStation && !isInterceptPatrol ? `
              <svg class="w-4 h-4 text-amber-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
                <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
                <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
                <path d="M10 6h4"/>
                <path d="M10 10h4"/>
                <path d="M10 14h4"/>
                <path d="M10 18h4"/>
              </svg>
            ` : `
              <svg style="transform: rotate(${heading}deg); transition: transform 0.5s ease-out;" class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
              </svg>
            `}
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
  }, [vehicles, selectedVehicleId, isFollowing, activeIntercept]);

  const handleFitInterceptCorridor = () => {
    if (!mapInstance.current || !activeIntercept) return;
    const pPos = activeIntercept.patrolVehicle.lastPosition;
    const tPos = activeIntercept.targetVehicle.lastPosition;
    if (!pPos || !tPos) return;

    const minLon = Math.min(pPos.lon, tPos.lon);
    const maxLon = Math.max(pPos.lon, tPos.lon);
    const minLat = Math.min(pPos.lat, tPos.lat);
    const maxLat = Math.max(pPos.lat, tPos.lat);

    mapInstance.current.fitBounds(
      [
        [minLon, minLat],
        [maxLon, maxLat],
      ],
      {
        padding: { top: 120, bottom: 100, left: 100, right: 100 },
        maxZoom: 15.5,
        duration: 1200,
        essential: true,
      }
    );
  };

  // Draw / update Intercept Route Overlay and Midpoint ETA Projection on Map
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !mapReady) return;

    const sourceId = 'intercept-corridor-src';
    const glowLayerId = 'intercept-corridor-glow';
    const lineLayerId = 'intercept-corridor-line';
    const pulseLayerId = 'intercept-corridor-pulse';

    if (
      !activeIntercept ||
      !activeIntercept.patrolVehicle.lastPosition ||
      !activeIntercept.targetVehicle.lastPosition
    ) {
      if (interceptEtaMarkerRef.current) {
        interceptEtaMarkerRef.current.remove();
        interceptEtaMarkerRef.current = null;
      }
      if (map.getLayer(pulseLayerId)) map.removeLayer(pulseLayerId);
      if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
      if (map.getLayer(glowLayerId)) map.removeLayer(glowLayerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
      return;
    }

    const patrolPos = activeIntercept.patrolVehicle.lastPosition;
    const targetPos = activeIntercept.targetVehicle.lastPosition;

    const routeCoordinates = generateInterceptCorridorPath(
      { lat: patrolPos.lat, lon: patrolPos.lon },
      { lat: targetPos.lat, lon: targetPos.lon }
    );

    const geojsonData: any = {
      type: 'Feature',
      properties: {
        etaMinutes: activeIntercept.candidate.etaMinutes,
        formattedEta: activeIntercept.candidate.formattedEta,
        distanceKm: activeIntercept.candidate.distanceKm,
        patrolCallsign: activeIntercept.patrolVehicle.callsign,
        targetPlate: activeIntercept.targetVehicle.plate,
      },
      geometry: {
        type: 'LineString',
        coordinates: routeCoordinates,
      },
    };

    const existingSource = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;

    if (existingSource) {
      existingSource.setData(geojsonData);
    } else {
      map.addSource(sourceId, {
        type: 'geojson',
        data: geojsonData,
      });

      // 1. Neon Cyan / Emerald Tactical Outer Glow
      map.addLayer({
        id: glowLayerId,
        type: 'line',
        source: sourceId,
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': '#00E5FF',
          'line-width': 10,
          'line-opacity': 0.5,
          'line-blur': 4,
        },
      });

      // 2. High-visibility Tactical Core Line
      map.addLayer({
        id: lineLayerId,
        type: 'line',
        source: sourceId,
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': '#0B63CE',
          'line-width': 5,
          'line-opacity': 0.95,
        },
      });

      // 3. Dynamic Animated Dashed Line (White Pulse Track)
      map.addLayer({
        id: pulseLayerId,
        type: 'line',
        source: sourceId,
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': '#FFFFFF',
          'line-width': 2.5,
          'line-dasharray': [2, 2],
          'line-opacity': 0.9,
        },
      });
    }

    // Place or update Midpoint ETA Marker along route
    const midCoordIndex = Math.floor(routeCoordinates.length / 2);
    const midPoint = routeCoordinates[midCoordIndex] || [
      (patrolPos.lon + targetPos.lon) / 2,
      (patrolPos.lat + targetPos.lat) / 2,
    ];

    const isIntercepted = activeIntercept.status === 'intercepted';

    if (!interceptEtaMarkerRef.current) {
      const el = document.createElement('div');
      el.className = 'intercept-eta-marker pointer-events-auto select-none cursor-pointer';
      el.innerHTML = `
        <div class="group relative flex flex-col items-center">
          <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-full ${
            isIntercepted
              ? 'bg-emerald-950/95 border-2 border-emerald-400 text-emerald-200'
              : 'bg-gray-950/95 border-2 border-cyan-400 text-white'
          } shadow-2xl backdrop-blur-md font-mono animate-in zoom-in-90 duration-200 hover:scale-105 transition-transform">
            ${
              isIntercepted
                ? '<span class="text-xs">✅</span><span class="text-xs font-black text-emerald-300 uppercase">INTERCEPTED • SECURED</span>'
                : `<span class="flex h-2.5 w-2.5 relative">
                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
                  </span>
                  <span class="text-[10px] uppercase font-bold text-cyan-400">ETA:</span>
                  <span class="text-xs font-black text-white tracking-wide">${activeIntercept.candidate.formattedEta}</span>
                  <span class="text-[10px] text-gray-300 font-semibold">• ${activeIntercept.candidate.distanceKm} km</span>
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" title="Auto-recalculating live"></span>`
            }
          </div>
          <div class="w-2 h-2 ${isIntercepted ? 'bg-emerald-400' : 'bg-cyan-400'} rotate-45 -mt-1 shadow-xs"></div>
        </div>
      `;
      el.addEventListener('click', () => {
        handleFitInterceptCorridor();
      });

      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat(midPoint as [number, number])
        .addTo(map);
      interceptEtaMarkerRef.current = marker;
    } else {
      interceptEtaMarkerRef.current.setLngLat(midPoint as [number, number]);
      const el = interceptEtaMarkerRef.current.getElement();
      el.innerHTML = `
        <div class="group relative flex flex-col items-center">
          <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-full ${
            isIntercepted
              ? 'bg-emerald-950/95 border-2 border-emerald-400 text-emerald-200'
              : 'bg-gray-950/95 border-2 border-cyan-400 text-white'
          } shadow-2xl backdrop-blur-md font-mono animate-in zoom-in-90 duration-200 hover:scale-105 transition-transform">
            ${
              isIntercepted
                ? '<span class="text-xs">✅</span><span class="text-xs font-black text-emerald-300 uppercase">INTERCEPTED • SECURED</span>'
                : `<span class="flex h-2.5 w-2.5 relative">
                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
                  </span>
                  <span class="text-[10px] uppercase font-bold text-cyan-400">ETA:</span>
                  <span class="text-xs font-black text-white tracking-wide">${activeIntercept.candidate.formattedEta}</span>
                  <span class="text-[10px] text-gray-300 font-semibold">• ${activeIntercept.candidate.distanceKm} km</span>
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" title="Auto-recalculating live"></span>`
            }
          </div>
          <div class="w-2 h-2 ${isIntercepted ? 'bg-emerald-400' : 'bg-cyan-400'} rotate-45 -mt-1 shadow-xs"></div>
        </div>
      `;
    }

    // Auto-fit bounds on initial intercept activation
    const minLon = Math.min(patrolPos.lon, targetPos.lon);
    const maxLon = Math.max(patrolPos.lon, targetPos.lon);
    const minLat = Math.min(patrolPos.lat, targetPos.lat);
    const maxLat = Math.max(patrolPos.lat, targetPos.lat);

    map.fitBounds(
      [
        [minLon, minLat],
        [maxLon, maxLat],
      ],
      {
        padding: { top: 120, bottom: 100, left: 100, right: 100 },
        maxZoom: 15.5,
        duration: 1200,
        essential: true,
      }
    );
  }, [activeIntercept, mapReady]);

  // Center map on selected vehicle change
  useEffect(() => {
    if (!mapInstance.current || !selectedVehicleId) return;
    const vehicle = vehicles.find((v) => v.id === selectedVehicleId);
    if (vehicle && vehicle.lastPosition) {
      mapInstance.current.flyTo({
        center: [vehicle.lastPosition.lon, vehicle.lastPosition.lat],
        zoom: 15,
        speed: 1.2,
        essential: true,
      });
    }
  }, [selectedVehicleId, mapReady]);

  // Update Camera Markers
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    // Remove camera markers no longer in the active list
    const activeCameraIds = new Set(cameras.map((c) => c.id));
    Object.keys(cameraMarkersRef.current).forEach((id) => {
      if (!activeCameraIds.has(id)) {
        cameraMarkersRef.current[id].remove();
        delete cameraMarkersRef.current[id];
      }
    });

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
      <div className="absolute top-2.5 left-2.5 z-30 flex items-center gap-1 sm:gap-1.5 bg-white/95 dark:bg-[#181C25]/95 backdrop-blur-md p-1 sm:p-1.5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-md text-xs max-w-[calc(100vw-145px)] lg:max-w-none overflow-x-auto select-none">
        {/* D3 Heatmap Toggle Button */}
        <div className="flex items-center rounded-md border border-amber-300 dark:border-amber-800/80 bg-amber-50/80 dark:bg-amber-950/40 p-0.5 shrink-0">
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
              showHeatmap
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40'
            }`}
            title="Toggle D3.js Vehicle Density Heatmap"
          >
            <Flame className={`w-3.5 h-3.5 ${showHeatmap ? 'animate-pulse' : ''}`} />
            <span className="hidden sm:inline">Heatmap</span>
          </button>

          <button
            onClick={() => setShowHeatmapControls(!showHeatmapControls)}
            className={`p-1 rounded text-amber-800 dark:text-amber-300 hover:bg-amber-200/60 dark:hover:bg-amber-900/60 transition-colors cursor-pointer ${
              showHeatmapControls ? 'bg-amber-200 dark:bg-amber-900' : ''
            }`}
            title="Configure D3 Heatmap Parameters"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-4 w-px bg-gray-300 dark:bg-gray-700 mx-0.5 shrink-0"></div>

        {/* Follow Selected Vehicle Toggle */}
        <button
          onClick={() => {
            const next = !isFollowing;
            setIsFollowing(next);
            if (onToggleFollow) onToggleFollow();
          }}
          className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-md font-semibold transition-colors shrink-0 cursor-pointer ${
            isFollowing
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
          title="Keep map centered on selected vehicle"
        >
          <Navigation className={`w-3.5 h-3.5 ${isFollowing ? 'animate-pulse' : ''}`} />
          <span className="hidden sm:inline">Follow</span>
        </button>

        {/* Spoken Locate Voice Dispatch Trigger */}
        {(() => {
          const targetVeh = vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0];
          if (!targetVeh) return null;
          return (
            <button
              onClick={() => {
                if (onLocateVehicle) {
                  onLocateVehicle(targetVeh);
                } else {
                  speakVehicleLocation(targetVeh);
                }
              }}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs shadow-xs transition-all shrink-0 cursor-pointer"
              title={`Voice dispatch: Locate ${targetVeh.plate} and speak exact place name`}
            >
              <Volume2 className="w-3.5 h-3.5 animate-pulse" />
              <span>Locate {selectedVehicleId ? targetVeh.plate : ''}</span>
            </button>
          );
        })()}

        {/* Uganda Territorial Grid Enforced Badge */}
        <div
          className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-mono text-[10px] font-bold shrink-0 shadow-2xs"
          title="Telemetry tracking strictly bounded to sovereign territory of Uganda"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="hidden sm:inline">UGANDA BOUNDS ENFORCED</span>
          <span className="sm:hidden">UG BOUNDS</span>
        </div>

        <div className="h-4 w-px bg-gray-300 dark:bg-gray-700 mx-0.5 shrink-0"></div>

        {/* Reset to Uganda National View */}
        <button
          onClick={() => {
            if (mapInstance.current) {
              mapInstance.current.flyTo({ center: [32.35, 1.35], zoom: 6.8 });
            }
          }}
          className="flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-md text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-semibold shrink-0 cursor-pointer"
          title="Fit View to Republic of Uganda Sovereign Boundaries"
        >
          <Compass className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="hidden md:inline">Uganda Grid</span>
        </button>

        {/* Reset to Kampala Center */}
        <button
          onClick={() => {
            if (mapInstance.current) {
              mapInstance.current.flyTo({ center: [32.5811, 0.3136], zoom: 12.5 });
            }
          }}
          className="flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium shrink-0 cursor-pointer"
          title="Focus View on Kampala Metropolitan Area"
        >
          <span className="hidden md:inline">Kampala</span>
        </button>

        <div className="hidden lg:block h-4 w-px bg-gray-300 dark:bg-gray-700 mx-0.5 shrink-0"></div>

        <span className="hidden lg:inline text-[11px] font-mono text-gray-500 dark:text-gray-400 px-1 shrink-0">
          {inBoundsVehicles.length} UG Tracked | {cameras.length} ANPR
        </span>
      </div>

      {/* Tactical Intercept Corridor HUD */}
      {activeIntercept && (
        <div className="absolute top-14 sm:top-2.5 left-2 sm:left-auto right-2 sm:right-2.5 z-30 flex flex-col items-start gap-2 bg-gray-950/95 text-white border-2 border-emerald-500/80 shadow-2xl p-2.5 sm:px-3.5 sm:py-2.5 rounded-xl text-xs font-mono backdrop-blur-md animate-in slide-in-from-top-2 w-[calc(100%-16px)] sm:w-auto max-w-sm sm:max-w-md">
          <div className="flex items-center justify-between w-full gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 relative">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${activeIntercept.status === 'intercepted' ? 'bg-emerald-400' : 'bg-cyan-400'} opacity-75`}></span>
                <span className={`relative inline-flex rounded-full h-3 w-3 ${activeIntercept.status === 'intercepted' ? 'bg-emerald-500' : 'bg-cyan-500'}`}></span>
              </span>
              <div className="flex items-center gap-1.5 font-bold">
                <span className={activeIntercept.status === 'intercepted' ? 'text-emerald-400' : 'text-amber-300'}>
                  {activeIntercept.status === 'intercepted' ? '✅ INTERCEPTED:' : '🚨 AUTO-TRACKING:'}
                </span>
                <span className="text-blue-400 font-bold">{activeIntercept.patrolVehicle.callsign || activeIntercept.patrolVehicle.plate}</span>
                <span className="text-gray-400">➔</span>
                <span className="text-emerald-400 font-bold">{activeIntercept.targetVehicle.plate}</span>
              </div>
            </div>

            {/* Live Auto-Refresh Pulse Indicator */}
            {activeIntercept.status === 'en_route' && (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-900/60 border border-blue-400/60 text-blue-300 flex items-center gap-1 shrink-0 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>AUTO-REFRESH</span>
              </span>
            )}
          </div>

          {/* Re-assigned banner notification */}
          {activeIntercept.reassignedFromCallsign && activeIntercept.status === 'en_route' && (
            <div className="w-full text-[10px] text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-600/50 flex items-center justify-between">
              <span>⚡ Optimal unit updated based on target movement!</span>
              <span className="text-gray-400">(Re-routed from {activeIntercept.reassignedFromCallsign})</span>
            </div>
          )}

          <div className="flex items-center justify-between w-full gap-2 pt-0.5 flex-wrap">
            <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-500/60 px-2.5 py-1 rounded-lg">
              <span className="text-emerald-300 font-bold">ETA:</span>
              <span className="text-white font-black text-sm">{activeIntercept.candidate.formattedEta}</span>
              <span className="text-gray-400 text-[10px]">({activeIntercept.candidate.distanceKm} km route)</span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={handleFitInterceptCorridor}
                className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-[11px] font-bold text-white transition-colors cursor-pointer"
                title="Fit map camera to intercept route corridor"
              >
                Fit Corridor
              </button>
              {activeIntercept.status === 'en_route' && onCompleteIntercept && (
                <button
                  onClick={onCompleteIntercept}
                  className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-[11px] font-bold text-white transition-colors cursor-pointer"
                  title="Mark tactical interception as completed"
                >
                  Complete
                </button>
              )}
              {activeIntercept.status === 'en_route' && onCancelIntercept && (
                <button
                  onClick={onCancelIntercept}
                  className="px-2.5 py-1 rounded bg-red-950/80 hover:bg-red-900 border border-red-600/60 text-[11px] font-bold text-red-200 transition-colors cursor-pointer"
                  title="Cancel active intercept operation"
                >
                  Cancel
                </button>
              )}
              {(activeIntercept.status === 'intercepted' || activeIntercept.status === 'cancelled') && onClearIntercept && (
                <button
                  onClick={onClearIntercept}
                  className="px-2.5 py-1 rounded bg-gray-800 hover:bg-gray-700 text-[11px] text-gray-200 transition-colors cursor-pointer"
                  title="Dismiss Intercept Overlay"
                >
                  Dismiss
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Live Map Navigation HUD */}
      {navigatingVehicle && (
        <div className="absolute top-14 left-2.5 z-30 flex items-center gap-2 bg-gray-950/92 text-white border border-emerald-500/70 shadow-2xl px-3 py-1.5 rounded-xl text-xs font-mono backdrop-blur-md animate-in slide-in-from-top-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0"></span>
          <span className="font-bold text-emerald-400">LIVE NAVIGATING:</span>
          <span className="text-white font-bold">{navigatingVehicle.plate}</span>
          <span className="text-gray-500">•</span>
          <span className="text-amber-300 truncate max-w-xs">{navigatingVehicle.address}</span>
          <span className="text-gray-500">•</span>
          <span className="text-emerald-400 font-bold">{navigatingVehicle.speed} km/h</span>
          <button
            onClick={() => setNavigatingVehicle(null)}
            className="ml-1 p-0.5 text-gray-400 hover:text-white cursor-pointer"
            title="Dismiss Navigation HUD"
          >
            ✕
          </button>
        </div>
      )}

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
