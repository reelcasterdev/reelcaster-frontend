'use client';

import React, { useState, useCallback } from 'react';
import Map, { Source, Layer, NavigationControl } from 'react-map-gl/mapbox';
import { Anchor, Layers } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';

const VICTORIA_COORDS = { lat: 48.4284, lon: -123.3656 };

export default function MapTestPage() {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const [viewport, setViewport] = useState({
    latitude: VICTORIA_COORDS.lat,
    longitude: VICTORIA_COORDS.lon,
    zoom: 9,
  });

  const [bathymetryEnabled, setBathymetryEnabled] = useState(true);
  const [bathymetrySource, setBathymetrySource] = useState<'mapbox' | 'chs'>('mapbox');
  const [layerOpacity, setLayerOpacity] = useState(0.7);

  const toggleBathymetry = useCallback(() => {
    setBathymetryEnabled(prev => !prev);
  }, []);

  if (!mapboxToken) {
    return (
      <div className="min-h-screen bg-rc-bg-darkest p-8">
        <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
          <p className="text-red-400">
            Mapbox token not configured. Please add NEXT_PUBLIC_MAPBOX_TOKEN to your environment variables.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-rc-bg-darkest p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold text-white">Bathymetry Map Test</h1>
        <p className="text-rc-text-muted text-sm">
          Testing depth visualization layers. Current location: Victoria, BC
        </p>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3 p-4 bg-rc-bg-dark border border-rc-bg-light rounded-xl">
          {/* Bathymetry Toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              toggleBathymetry();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              bathymetryEnabled
                ? 'bg-gradient-to-r from-blue-700 to-cyan-600 text-white shadow-lg'
                : 'bg-rc-bg-light text-rc-text-muted hover:bg-rc-bg-light/80'
            }`}
          >
            <Anchor className="w-4 h-4" />
            <span>Depth {bathymetryEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {/* Source Selector */}
          {bathymetryEnabled && (
            <div className="flex items-center gap-2">
              <span className="text-rc-text-muted text-sm">Source:</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setBathymetrySource('mapbox');
                }}
                className={`px-3 py-1.5 rounded-md text-sm transition-all ${
                  bathymetrySource === 'mapbox'
                    ? 'bg-blue-600 text-white'
                    : 'bg-rc-bg-light text-rc-text-muted hover:bg-rc-bg-light/80'
                }`}
              >
                Global (Mapbox)
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setBathymetrySource('chs');
                }}
                className={`px-3 py-1.5 rounded-md text-sm transition-all ${
                  bathymetrySource === 'chs'
                    ? 'bg-blue-600 text-white'
                    : 'bg-rc-bg-light text-rc-text-muted hover:bg-rc-bg-light/80'
                }`}
              >
                Canada (CHS 10m)
              </button>
            </div>
          )}

          {/* Opacity Slider */}
          {bathymetryEnabled && (
            <div className="flex items-center gap-2 ml-auto">
              <Layers className="w-4 h-4 text-rc-text-muted" />
              <span className="text-rc-text-muted text-sm">Opacity:</span>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.1}
                value={layerOpacity}
                onChange={(e) => setLayerOpacity(Number(e.target.value))}
                className="w-24 h-2 bg-rc-bg-light rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <span className="text-rc-text-light text-sm w-10">{Math.round(layerOpacity * 100)}%</span>
            </div>
          )}
        </div>

        {/* Status */}
        <div className="p-3 bg-rc-bg-dark border border-rc-bg-light rounded-lg">
          <p className="text-sm text-rc-text-light">
            <strong>Status:</strong>{' '}
            {bathymetryEnabled ? (
              <>
                Bathymetry <span className="text-green-400">enabled</span> using{' '}
                <span className="text-blue-400">{bathymetrySource === 'mapbox' ? 'Mapbox Global' : 'CHS Canada'}</span>
              </>
            ) : (
              <span className="text-rc-text-muted">Bathymetry disabled</span>
            )}
          </p>
          <p className="text-xs text-rc-text-muted mt-1">
            Zoom: {viewport.zoom.toFixed(1)} | Lat: {viewport.latitude.toFixed(4)} | Lon: {viewport.longitude.toFixed(4)}
          </p>
        </div>

        {/* Map */}
        <div className="relative w-full h-[600px] rounded-xl overflow-hidden border border-rc-bg-light">
          <Map
            {...viewport}
            onMove={evt => setViewport(evt.viewState)}
            mapboxAccessToken={mapboxToken}
            mapStyle="mapbox://styles/mapbox/dark-v11"
            style={{ width: '100%', height: '100%' }}
          >
            <NavigationControl position="top-right" />

            {/* Mapbox Bathymetry (Global) - data available at zoom 0-7, overzoomed beyond */}
            {bathymetryEnabled && bathymetrySource === 'mapbox' && (
              <Source
                id="bathymetry-mapbox"
                type="vector"
                url="mapbox://mapbox.mapbox-bathymetry-v2"
                maxzoom={7}
              >
                <Layer
                  id="bathymetry-mapbox-fill"
                  type="fill"
                  source-layer="depth"
                  minzoom={0}
                  maxzoom={22}
                  paint={{
                    'fill-color': [
                      'interpolate',
                      ['linear'],
                      ['get', 'min_depth'],
                      0, '#ADD8E6',
                      10, '#87CEEB',
                      50, '#64B4DC',
                      100, '#468CC8',
                      200, '#3264B4',
                      500, '#1E4696',
                      1000, '#142864',
                    ],
                    'fill-opacity': layerOpacity * 0.7,
                  }}
                />
                <Layer
                  id="bathymetry-mapbox-contours"
                  type="line"
                  source-layer="depth"
                  minzoom={0}
                  maxzoom={22}
                  paint={{
                    'line-color': '#96C8FF',
                    'line-width': [
                      'case',
                      ['==', ['%', ['get', 'min_depth'], 100], 0],
                      2,
                      1
                    ],
                    'line-opacity': layerOpacity * 0.8,
                  }}
                />
              </Source>
            )}

            {/* CHS Bathymetry (Canada) */}
            {bathymetryEnabled && bathymetrySource === 'chs' && (
              <Source
                id="bathymetry-chs"
                type="raster"
                tiles={['/api/tiles/chs-bathymetry/{z}/{y}/{x}']}
                tileSize={256}
                minzoom={0}
                maxzoom={18}
              >
                <Layer
                  id="bathymetry-chs-layer"
                  type="raster"
                  paint={{
                    'raster-opacity': layerOpacity,
                  }}
                />
              </Source>
            )}
          </Map>

          {/* Legend */}
          {bathymetryEnabled && bathymetrySource === 'mapbox' && (
            <div className="absolute bottom-4 left-4 bg-rc-bg-dark/90 backdrop-blur-sm border border-rc-bg-light rounded-lg p-3">
              <p className="text-xs font-medium text-rc-text mb-2">Depth Legend</p>
              <div className="space-y-1">
                {[
                  { depth: '0-10m', color: '#ADD8E6', label: 'Shore/Kelp' },
                  { depth: '10-50m', color: '#87CEEB', label: 'Shallow' },
                  { depth: '50-100m', color: '#64B4DC', label: 'Rockfish' },
                  { depth: '100-200m', color: '#468CC8', label: 'Lingcod' },
                  { depth: '200-500m', color: '#3264B4', label: 'Halibut' },
                  { depth: '500m+', color: '#1E4696', label: 'Deep' },
                ].map(item => (
                  <div key={item.depth} className="flex items-center gap-2">
                    <div
                      className="w-4 h-3 rounded"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-[10px] text-rc-text-muted">{item.depth}</span>
                    <span className="text-[10px] text-rc-text-light">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Debug Info */}
        <div className="p-4 bg-rc-bg-dark border border-rc-bg-light rounded-xl">
          <h2 className="text-sm font-medium text-rc-text mb-2">Debug Info</h2>
          <div className="text-xs text-rc-text-muted space-y-1 font-mono">
            <p>Mapbox Source: mapbox://mapbox.mapbox-bathymetry-v2 (maxzoom: 7)</p>
            <p>CHS Source: /api/tiles/chs-bathymetry/&#123;z&#125;/&#123;y&#125;/&#123;x&#125;</p>
            <p>Check browser DevTools Network tab for tile requests</p>
            <p>Check terminal for [CHS Bathymetry] logs when using CA source</p>
          </div>
        </div>
      </div>
    </div>
  );
}
