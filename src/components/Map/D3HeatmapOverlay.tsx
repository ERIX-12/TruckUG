import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import * as maplibregl from 'maplibre-gl';
import { Vehicle } from '../../types';

export interface DensityHotspot {
  name: string;
  lat: number;
  lon: number;
  weight: number;
}

// Major traffic & vehicle convergence nodes across Kampala
export const KAMPALA_HOTSPOTS: DensityHotspot[] = [
  { name: 'Old Taxi Park & CBD', lat: 0.3131, lon: 32.5788, weight: 1.0 },
  { name: 'New Taxi Park & Downtown', lat: 0.3148, lon: 32.5742, weight: 0.95 },
  { name: 'Clock Tower / Queensway Junction', lat: 0.3082, lon: 32.5765, weight: 0.85 },
  { name: 'Jinja Road / Wampewo Roundabout', lat: 0.3204, lon: 32.5976, weight: 0.88 },
  { name: 'Wandegeya / Makerere Junction', lat: 0.3325, lon: 32.5695, weight: 0.8 },
  { name: 'Nakawa / Spear Motors Hub', lat: 0.3308, lon: 32.6162, weight: 0.75 },
  { name: 'Busega Northern Bypass Flyover', lat: 0.3015, lon: 32.518, weight: 0.82 },
  { name: 'Kalerwe Market / Northern Bypass', lat: 0.3421, lon: 32.5621, weight: 0.78 },
  { name: 'Kibuye Roundabout / Entebbe Rd', lat: 0.2975, lon: 32.5684, weight: 0.72 },
  { name: 'Mulago Roundabout', lat: 0.3375, lon: 32.576, weight: 0.65 },
  { name: 'Bugolobi Commercial Area', lat: 0.317, lon: 32.618, weight: 0.6 },
  { name: 'Ntinda Capital Shoppers Hub', lat: 0.354, lon: 32.614, weight: 0.68 },
];

export type ColorSchemeId = 'ylorrd' | 'inferno' | 'turbo' | 'viridis';

interface D3HeatmapOverlayProps {
  map: maplibregl.Map | null;
  vehicles: Vehicle[];
  bandwidth: number;
  opacity: number;
  colorScheme: ColorSchemeId;
  includeCorridorPings?: boolean;
}

export const D3HeatmapOverlay: React.FC<D3HeatmapOverlayProps> = ({
  map,
  vehicles,
  bandwidth,
  opacity,
  colorScheme,
  includeCorridorPings = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!map) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Pick D3 interpolator
    let interpolator = d3.interpolateYlOrRd;
    if (colorScheme === 'inferno') interpolator = d3.interpolateInferno;
    if (colorScheme === 'turbo') interpolator = d3.interpolateTurbo;
    if (colorScheme === 'viridis') interpolator = d3.interpolateViridis;

    const render = () => {
      if (!map || !canvas || !ctx) return;

      const container = map.getContainer();
      const width = container.clientWidth;
      const height = container.clientHeight;

      // Handle retina displays
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Collect density points (live vehicles + Kampala corridor clusters)
      const points: [number, number, number][] = [];

      // 1. Live vehicles
      vehicles.forEach((v) => {
        if (!v.lastPosition) return;
        const pt = map.project([v.lastPosition.lon, v.lastPosition.lat]);
        if (pt.x >= -100 && pt.x <= width + 100 && pt.y >= -100 && pt.y <= height + 100) {
          // Weight boosted if moving or in critical state
          const weight = v.status === 'stolen' ? 2.5 : 1.2;
          points.push([pt.x, pt.y, weight]);
        }
      });

      // 2. Kampala corridor hubs & cluster pings
      if (includeCorridorPings) {
        KAMPALA_HOTSPOTS.forEach((spot) => {
          const pt = map.project([spot.lon, spot.lat]);
          if (pt.x >= -150 && pt.x <= width + 150 && pt.y >= -150 && pt.y <= height + 150) {
            points.push([pt.x, pt.y, spot.weight * 2.0]);

            // Disperse micro pings around each major junction to reflect dense matatu & boda traffic
            const microCount = Math.floor(spot.weight * 6);
            for (let i = 0; i < microCount; i++) {
              const angle = (i / microCount) * Math.PI * 2;
              const radiusLon = 0.003 * Math.cos(angle);
              const radiusLat = 0.0025 * Math.sin(angle);
              const subPt = map.project([spot.lon + radiusLon, spot.lat + radiusLat]);
              points.push([subPt.x, subPt.y, spot.weight * 0.9]);
            }
          }
        });
      }

      if (points.length < 2) {
        ctx.restore();
        return;
      }

      // Compute 2D Kernel Density Estimation with D3 contours
      const density = d3
        .contourDensity<[number, number, number]>()
        .x((d) => d[0])
        .y((d) => d[1])
        .weight((d) => d[2])
        .size([width, height])
        .bandwidth(bandwidth)
        .thresholds(16)(points);

      if (!density || density.length === 0) {
        ctx.restore();
        return;
      }

      // Find max contour value for D3 normalization
      const maxVal = d3.max(density, (d) => d.value) || 1;
      const colorScale = d3.scaleSequential(interpolator).domain([0, maxVal * 0.9]);

      // D3 GeoPath to draw polygon contours on HTML5 Canvas context
      const geoPath = d3.geoPath().context(ctx);

      ctx.globalAlpha = opacity;

      // Render contour bands from lowest to highest density
      density.forEach((contour) => {
        ctx.beginPath();
        geoPath(contour as any);
        ctx.fillStyle = colorScale(contour.value);
        ctx.fill();
      });

      // Render radial glow centers on highest convergence points for vibrant visualization
      ctx.globalAlpha = opacity * 0.8;
      ctx.globalCompositeOperation = 'screen';

      points.forEach(([px, py, w]) => {
        const radius = Math.max(10, (bandwidth * 0.6) * (w / 1.5));
        const gradient = ctx.createRadialGradient(px, py, 0, px, py, radius);
        gradient.addColorStop(0, colorScale(maxVal * 0.95));
        gradient.addColorStop(0.5, colorScale(maxVal * 0.5));
        gradient.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();
    };

    render();

    map.on('move', render);
    map.on('zoom', render);
    map.on('resize', render);

    return () => {
      map.off('move', render);
      map.off('zoom', render);
      map.off('resize', render);
    };
  }, [map, vehicles, bandwidth, opacity, colorScheme, includeCorridorPings]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-10"
      style={{ mixBlendMode: 'normal' }}
    />
  );
};
