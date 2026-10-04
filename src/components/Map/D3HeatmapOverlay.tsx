import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import * as maplibregl from 'maplibre-gl';
import { Vehicle, Alert } from '../../types';

export interface DensityHotspot {
  name: string;
  lat: number;
  lon: number;
  weight: number;
}

// Major traffic & vehicle convergence nodes across Uganda
export const UGANDA_HOTSPOTS: DensityHotspot[] = [
  { name: 'Kampala CBD', lat: 0.313, lon: 32.58, weight: 1.0 },
  { name: 'Jinja Town', lat: 0.447, lon: 33.203, weight: 0.9 },
  { name: 'Mbale', lat: 1.065, lon: 34.18, weight: 0.8 },
  { name: 'Mbarara', lat: -0.61, lon: 30.65, weight: 0.85 },
  { name: 'Gulu City', lat: 2.77, lon: 32.3, weight: 0.75 },
];

export type ColorSchemeId = 'ylorrd' | 'inferno' | 'turbo' | 'viridis';

interface D3HeatmapOverlayProps {
  map: maplibregl.Map | null;
  vehicles: Vehicle[];
  alerts: Alert[];
  bandwidth: number;
  opacity: number;
  colorScheme: ColorSchemeId;
  includeCorridorPings?: boolean;
}

export const D3HeatmapOverlay: React.FC<D3HeatmapOverlayProps> = ({
  map,
  vehicles,
  alerts,
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

      // Collect density points (live vehicles + alerts + Kampala corridor clusters)
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

      // 2. Alert Hotspots
      alerts.forEach((alt) => {
        if (alt.lat === undefined || alt.lon === undefined) return;
        const pt = map.project([alt.lon, alt.lat]);
        if (pt.x >= -100 && pt.x <= width + 100 && pt.y >= -100 && pt.y <= height + 100) {
          // Weighted by severity
          const weight = alt.severity === 'critical' ? 4.0 : 2.0;
          points.push([pt.x, pt.y, weight]);
        }
      });

      // 3. Uganda regional hubs & cluster pings
      if (includeCorridorPings) {
        UGANDA_HOTSPOTS.forEach((spot) => {
          const pt = map.project([spot.lon, spot.lat]);
          if (pt.x >= -150 && pt.x <= width + 150 && pt.y >= -150 && pt.y <= height + 150) {
            points.push([pt.x, pt.y, spot.weight * 2.0]);

            // Disperse micro pings around each major hub
            const microCount = Math.floor(spot.weight * 6);
            for (let i = 0; i < microCount; i++) {
              const angle = (i / microCount) * Math.PI * 2;
              const radiusLon = 0.05 * Math.cos(angle); // Increased radius to cover regional area
              const radiusLat = 0.04 * Math.sin(angle);
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
  }, [map, vehicles, alerts, bandwidth, opacity, colorScheme, includeCorridorPings]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-10"
      style={{ mixBlendMode: 'normal' }}
    />
  );
};
