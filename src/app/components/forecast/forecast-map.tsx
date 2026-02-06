'use client';

import React, { useState, useRef, useCallback, useMemo } from 'react';
import Map, { Marker, Source, Layer, MapRef } from 'react-map-gl/mapbox';
import type { MapMouseEvent } from 'mapbox-gl';
import { MapPin, Wind, CloudRain, Thermometer, Info, Sparkles, Map as MapIcon, Waves, Anchor, X, Star, Heart, Check, Loader2 } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';
import { ProcessedOpenMeteoData } from '@/app/utils/openMeteoApi';
import { CHSWaterData } from '@/app/utils/chsTideApi';
import { useAuth } from '@/contexts/auth-context';
import { UserPreferencesService } from '@/lib/user-preferences';
import { supabase } from '@/lib/supabase';
import WindParticleLayer from './wind-particle-layer';
import OceanCurrentLayer from './ocean-current-layer';
import TideStationMarker from './tide-station-marker';

interface FishingHotspot {
  name: string;
  coordinates: { lat: number; lon: number };
}

interface ForecastMapProps {
  location: string;
  hotspot: string;
  hotspots: FishingHotspot[];
  centerCoordinates: { lat: number; lon: number };
  onHotspotChange: (hotspot: FishingHotspot) => void;
  openMeteoData: ProcessedOpenMeteoData | null;
  tideData?: CHSWaterData | null;
}

interface MapStyle {
  id: string;
  name: string;
  url: string;
}

const MAP_STYLES: MapStyle[] = [
  { id: 'dark', name: 'Dark', url: 'mapbox://styles/mapbox/dark-v11' },
  { id: 'satellite', name: 'Satellite', url: 'mapbox://styles/mapbox/satellite-streets-v12' },
  { id: 'outdoors', name: 'Outdoors', url: 'mapbox://styles/mapbox/outdoors-v12' },
  { id: 'streets', name: 'Streets', url: 'mapbox://styles/mapbox/streets-v12' },
  { id: 'light', name: 'Light', url: 'mapbox://styles/mapbox/light-v11' },
  { id: 'nav-night', name: 'Navigation', url: 'mapbox://styles/mapbox/navigation-night-v1' },
];

const MAP_STYLE_STORAGE_KEY = 'reelcaster-map-style';

const ForecastMap: React.FC<ForecastMapProps> = ({
  location,
  hotspot,
  hotspots,
  centerCoordinates,
  onHotspotChange,
  openMeteoData,
  tideData,
}) => {
  const mapRef = useRef<MapRef>(null);
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const { user } = useAuth();

  // Map viewport state
  const [viewport, setViewport] = useState({
    latitude: centerCoordinates.lat,
    longitude: centerCoordinates.lon,
    zoom: 10,
  });

  const [layerOpacity, setLayerOpacity] = useState(0.6);
  const [showSettings, setShowSettings] = useState(false);
  const [hoveredHotspot, setHoveredHotspot] = useState<string | null>(null);
  const [windAnimationEnabled, setWindAnimationEnabled] = useState(false);
  const [oceanCurrentEnabled, setOceanCurrentEnabled] = useState(false);
  const [tideStationEnabled, setTideStationEnabled] = useState(false);
  const [bathymetryEnabled, setBathymetryEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('reelcaster-bathymetry-enabled');
      // Default to true if not set
      return saved === null ? true : saved === 'true';
    }
    return true;
  });
  const [bathymetrySource, setBathymetrySource] = useState<'mapbox' | 'chs'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('reelcaster-bathymetry-source');
      return saved === 'chs' ? 'chs' : 'mapbox';
    }
    return 'mapbox';
  });
  const [showBathymetryPicker, setShowBathymetryPicker] = useState(false);
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [mapStyle, setMapStyle] = useState<MapStyle>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(MAP_STYLE_STORAGE_KEY);
      if (saved) {
        const found = MAP_STYLES.find(s => s.id === saved);
        if (found) return found;
      }
    }
    // Default to Navigation style
    return MAP_STYLES.find(s => s.id === 'nav-night') || MAP_STYLES[0];
  });
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Custom pin state
  const [customPin, setCustomPin] = useState<{ latitude: number; longitude: number } | null>(
    () => {
      // Restore pin if current hotspot is Custom Pin
      if (hotspot === 'Custom Pin') {
        return { latitude: centerCoordinates.lat, longitude: centerCoordinates.lon };
      }
      return null;
    }
  );
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [defaultStatus, setDefaultStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Update viewport when center coordinates change
  React.useEffect(() => {
    setViewport(prev => ({
      ...prev,
      latitude: centerCoordinates.lat,
      longitude: centerCoordinates.lon,
    }));
  }, [centerCoordinates]);

  // Change map style
  const handleStyleChange = useCallback((style: MapStyle) => {
    setMapStyle(style);
    setShowStylePicker(false);
    localStorage.setItem(MAP_STYLE_STORAGE_KEY, style.id);
  }, []);

  // Toggle bathymetry layer
  const toggleBathymetry = useCallback(() => {
    setBathymetryEnabled(prev => {
      const newValue = !prev;
      localStorage.setItem('reelcaster-bathymetry-enabled', String(newValue));
      if (!newValue) {
        setShowBathymetryPicker(false);
      }
      return newValue;
    });
  }, []);

  // Change bathymetry source
  const handleBathymetrySourceChange = useCallback((source: 'mapbox' | 'chs') => {
    setBathymetrySource(source);
    setShowBathymetryPicker(false);
    localStorage.setItem('reelcaster-bathymetry-source', source);
  }, []);

  // Handle hotspot click
  const handleHotspotClick = useCallback((hotspotData: FishingHotspot) => {
    setCustomPin(null);
    setShowSaveForm(false);
    setSaveStatus('idle');
    setDefaultStatus('idle');
    onHotspotChange(hotspotData);
  }, [onHotspotChange]);

  // Handle map click — place custom pin
  const handleMapClick = useCallback((e: MapMouseEvent) => {
    const { lng, lat } = e.lngLat;
    setCustomPin({ latitude: lat, longitude: lng });
    setShowSaveForm(false);
    setSaveStatus('idle');
    setDefaultStatus('idle');
    onHotspotChange({
      name: 'Custom Pin',
      coordinates: { lat, lon: lng },
    });
  }, [onHotspotChange]);

  // Handle custom pin drag end
  const handlePinDragEnd = useCallback((e: { lngLat: { lng: number; lat: number } }) => {
    const { lng, lat } = e.lngLat;
    setCustomPin({ latitude: lat, longitude: lng });
    setSaveStatus('idle');
    setDefaultStatus('idle');
    onHotspotChange({
      name: 'Custom Pin',
      coordinates: { lat, lon: lng },
    });
  }, [onHotspotChange]);

  // Clear custom pin
  const handleClearCustomPin = useCallback(() => {
    setCustomPin(null);
    setShowSaveForm(false);
    setSaveStatus('idle');
    setDefaultStatus('idle');
  }, []);

  // Set custom pin as default location
  const handleSetAsDefault = useCallback(async () => {
    if (!customPin || !user) return;
    setDefaultStatus('saving');
    const result = await UserPreferencesService.updateUserPreferences({
      favoriteLocation: location,
      favoriteHotspot: 'Custom Pin',
      favoriteLat: customPin.latitude,
      favoriteLon: customPin.longitude,
    });
    setDefaultStatus(result.success ? 'saved' : 'error');
  }, [customPin, user, location]);

  // Save custom pin to favorites
  const handleSaveToFavorites = useCallback(async () => {
    if (!customPin || !user || !saveName.trim()) return;
    setSaveStatus('saving');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setSaveStatus('error');
        return;
      }
      const res = await fetch('/api/favorite-spots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: saveName.trim(),
          lat: customPin.latitude,
          lon: customPin.longitude,
          location,
        }),
      });
      if (res.ok) {
        setSaveStatus('saved');
        setShowSaveForm(false);
        setSaveName('');
      } else {
        setSaveStatus('error');
      }
    } catch {
      setSaveStatus('error');
    }
  }, [customPin, user, saveName, location]);

  // Get current weather data for display
  const currentWeather = useMemo(() => {
    if (!openMeteoData || !openMeteoData.minutely15 || openMeteoData.minutely15.length === 0) {
      return null;
    }
    const current = openMeteoData.minutely15[0];
    return {
      temp: current.temp,
      windSpeed: current.windSpeed,
      windDirection: current.windDirection,
      precipitation: current.precipitation,
      cloudCover: current.cloudCover,
      oceanCurrentSpeed: current.oceanCurrentSpeed ?? 0,
      oceanCurrentDirection: current.oceanCurrentDirection ?? 0,
    };
  }, [openMeteoData]);

  if (!mapboxToken) {
    return (
      <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
        <p className="text-red-400 text-sm">
          Mapbox token not configured. Please add NEXT_PUBLIC_MAPBOX_TOKEN to your environment variables.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Map Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <h3 className="text-sm font-medium text-white truncate">Weather Map - {location}</h3>
        </div>
        {currentWeather && (
          <div className="flex items-center gap-3 text-xs text-slate-300">
            <div className="flex items-center gap-1">
              <Thermometer className="w-3 h-3" />
              <span>{currentWeather.temp.toFixed(1)}°C</span>
            </div>
            <div className="flex items-center gap-1">
              <Wind className="w-3 h-3" />
              <span>{currentWeather.windSpeed.toFixed(0)} km/h</span>
            </div>
            <div className="flex items-center gap-1">
              <CloudRain className="w-3 h-3" />
              <span>{currentWeather.precipitation.toFixed(1)} mm</span>
            </div>
          </div>
        )}
      </div>

      {/* Layer Toggles */}
      <div className="flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
        {/* Bathymetry Toggle with Source Picker - moved to first position */}
        <div className="relative">
          <div className="flex">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                toggleBathymetry();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all ${
                bathymetryEnabled
                  ? 'rounded-l-md bg-gradient-to-r from-blue-700 to-cyan-600 text-white shadow-lg shadow-blue-500/30'
                  : 'rounded-md bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'
              } border border-slate-600`}
              title="Toggle underwater depth visualization"
            >
              <Anchor className="w-3 h-3" />
              <span>Depth</span>
            </button>
            {bathymetryEnabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setShowBathymetryPicker(!showBathymetryPicker);
                }}
                className="px-2 py-1.5 rounded-r-md text-xs font-medium bg-gradient-to-r from-cyan-600 to-cyan-700 text-white border border-l-0 border-slate-600 hover:from-cyan-500 hover:to-cyan-600 transition-all"
                title="Select depth data source"
              >
                <span className="text-[10px]">{bathymetrySource === 'chs' ? 'CA' : 'Global'}</span>
              </button>
            )}
          </div>
          {showBathymetryPicker && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowBathymetryPicker(false)} />
              <div className="absolute left-0 top-full mt-1 bg-rc-bg-dark border border-rc-bg-light rounded-lg shadow-xl z-20 py-1 min-w-[180px]">
                <button
                  type="button"
                  onClick={() => handleBathymetrySourceChange('mapbox')}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                    bathymetrySource === 'mapbox'
                      ? 'bg-blue-600/20 text-blue-400 font-medium'
                      : 'text-rc-text-light hover:bg-rc-bg-light'
                  }`}
                >
                  <div className="font-medium">Global (Mapbox)</div>
                  <div className="text-[10px] text-rc-text-muted mt-0.5">~450m resolution, worldwide</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleBathymetrySourceChange('chs')}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                    bathymetrySource === 'chs'
                      ? 'bg-blue-600/20 text-blue-400 font-medium'
                      : 'text-rc-text-light hover:bg-rc-bg-light'
                  }`}
                >
                  <div className="font-medium">Canada High-Res (CHS)</div>
                  <div className="text-[10px] text-rc-text-muted mt-0.5">10m resolution, Canadian waters</div>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Wind Animation Toggle */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setWindAnimationEnabled(!windAnimationEnabled);
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            windAnimationEnabled
              ? 'bg-gradient-to-r from-green-600 to-blue-600 text-white border-green-500 shadow-lg shadow-green-500/30'
              : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'
          } border`}
          title="Toggle animated wind flow"
        >
          <Sparkles className="w-3 h-3" />
          <span>Wind Flow</span>
          {windAnimationEnabled && (
            <span className="ml-1 text-[10px] bg-white/20 px-1.5 py-0.5 rounded">LIVE</span>
          )}
        </button>

        {/* Ocean Current Toggle */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setOceanCurrentEnabled(!oceanCurrentEnabled);
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            oceanCurrentEnabled
              ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white border-cyan-500 shadow-lg shadow-cyan-500/30'
              : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'
          } border`}
          title="Toggle ocean current flow"
        >
          <Waves className="w-3 h-3" />
          <span>Currents</span>
          {oceanCurrentEnabled && (
            <span className="ml-1 text-[10px] bg-white/20 px-1.5 py-0.5 rounded">LIVE</span>
          )}
        </button>

        {/* Tide Station Toggle */}
        {tideData && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setTideStationEnabled(!tideStationEnabled);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              tideStationEnabled
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'
            } border`}
            title="Toggle tide station marker"
          >
            <Anchor className="w-3 h-3" />
            <span>Tide</span>
          </button>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          {/* Map Style Picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowStylePicker(!showStylePicker)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all border ${
                showStylePicker
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'
              }`}
              title="Map Style"
            >
              <MapIcon className="w-3 h-3" />
              <span>{mapStyle.name}</span>
            </button>
            {showStylePicker && (
              <>
              <div className="fixed inset-0 z-10" onClick={() => setShowStylePicker(false)} />
              <div className="absolute right-0 top-full mt-1 bg-rc-bg-dark border border-rc-bg-light rounded-lg shadow-xl z-20 py-1 min-w-[140px]">
                {MAP_STYLES.map(style => (
                  <button
                    type="button"
                    key={style.id}
                    onClick={() => handleStyleChange(style)}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                      mapStyle.id === style.id
                        ? 'bg-blue-600/20 text-blue-400 font-medium'
                        : 'text-rc-text-light hover:bg-rc-bg-light'
                    }`}
                  >
                    {style.name}
                  </button>
                ))}
              </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 rounded-md bg-slate-700 hover:bg-slate-600 border border-slate-600 transition-colors"
            title="Map Settings"
          >
            <Info className="w-4 h-4 text-slate-300" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-3 bg-slate-800 border border-slate-700 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-300">Layer Opacity</label>
            <span className="text-xs text-blue-400 font-semibold">{Math.round(layerOpacity * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={layerOpacity}
            onChange={(e) => setLayerOpacity(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <p className="text-xs text-slate-400 mt-2">
            <strong>Tip:</strong> Enable &quot;Depth&quot; to visualize underwater structure - choose &quot;CA&quot; for high-resolution (10m) Canadian data or &quot;Global&quot; for worldwide coverage. Enable &quot;Wind Flow&quot; to see directional arrows over water (longer arrows = stronger wind). Click anywhere on the map to place a custom pin, or click hotspot markers to change location.
          </p>
        </div>
      )}

      {/* Map Container */}
      <div
        ref={mapContainerRef}
        className="relative w-full h-[350px] sm:h-[500px] rounded-lg overflow-hidden border border-slate-600"
      >
        <Map
          ref={mapRef}
          {...viewport}
          onMove={evt => setViewport(evt.viewState)}
          onClick={handleMapClick}
          mapboxAccessToken={mapboxToken}
          mapStyle={mapStyle.url}
          style={{ width: '100%', height: '100%' }}
        >
          {/* Bathymetry Layer - Underwater depth visualization */}
          {/* Mapbox Global Bathymetry (~450m resolution) - data only at zoom 0-7 */}
          {bathymetryEnabled && bathymetrySource === 'mapbox' && (
            <Source
              id="bathymetry-mapbox"
              type="vector"
              url="mapbox://mapbox.mapbox-bathymetry-v2"
              maxzoom={7}
            >
              {/* Fill layer - depth gradient */}
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
                    0, '#ADD8E6',    // Light cyan - shore casting, kelp beds
                    10, '#87CEEB',   // Sky blue transition
                    50, '#64B4DC',   // Sky blue - rockfish, shallow structure
                    100, '#468CC8',  // Steel blue - lingcod, downrigger range
                    200, '#3264B4',  // Royal blue - halibut, deep jigging
                    500, '#1E4696',  // Navy - deep structure, Chinook
                    1000, '#142864', // Deep navy - channels, migration routes
                  ],
                  'fill-opacity': layerOpacity * 0.7,
                }}
              />
              {/* Contour lines overlay */}
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
                    2,  // Major contours (100m intervals) are thicker
                    1   // Minor contours
                  ],
                  'line-opacity': layerOpacity * 0.8,
                }}
              />
            </Source>
          )}

          {/* CHS NONNA 10m High-Resolution Bathymetry (Canadian waters) */}
          {/* Proxied through our API to bypass CORS restrictions */}
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

          {/* Hotspot Markers */}
          {hotspots.map((hotspotData) => {
            const isSelected = hotspotData.name === hotspot;
            const isHovered = hotspotData.name === hoveredHotspot;

            return (
              <Marker
                key={hotspotData.name}
                latitude={hotspotData.coordinates.lat}
                longitude={hotspotData.coordinates.lon}
                anchor="bottom"
              >
                <div
                  onMouseEnter={() => setHoveredHotspot(hotspotData.name)}
                  onMouseLeave={() => setHoveredHotspot(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleHotspotClick(hotspotData);
                  }}
                  className="relative cursor-pointer group"
                >
                  {/* Marker Pin */}
                  <div
                    className={`transition-all ${
                      isSelected
                        ? 'w-10 h-10 animate-pulse'
                        : isHovered
                        ? 'w-8 h-8'
                        : 'w-6 h-6'
                    }`}
                  >
                    <MapPin
                      className={`w-full h-full drop-shadow-lg ${
                        isSelected
                          ? 'text-blue-500 fill-blue-400'
                          : 'text-blue-400 fill-blue-300'
                      }`}
                    />
                  </div>

                  {/* Popup on Hover */}
                  {(isHovered || isSelected) && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800/95 backdrop-blur-sm border border-slate-600 rounded-lg shadow-xl whitespace-nowrap z-10">
                      <p className="text-xs font-semibold text-white">{hotspotData.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {hotspotData.coordinates.lat.toFixed(4)}, {hotspotData.coordinates.lon.toFixed(4)}
                      </p>
                      {isSelected && (
                        <div className="mt-1 pt-1 border-t border-slate-600">
                          <p className="text-[10px] text-blue-400 font-medium">Current Location</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Marker>
            );
          })}

          {/* Custom Pin Marker */}
          {customPin && (
            <Marker
              latitude={customPin.latitude}
              longitude={customPin.longitude}
              anchor="bottom"
              draggable
              onDragEnd={handlePinDragEnd}
            >
              <div
                className="relative cursor-grab active:cursor-grabbing"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Amber pin to distinguish from blue hotspot markers */}
                <div className="w-10 h-10">
                  <MapPin className="w-full h-full text-amber-500 fill-amber-400 drop-shadow-lg" />
                </div>

                {/* Custom pin tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-800/95 backdrop-blur-sm border border-slate-600 rounded-lg shadow-xl z-10 min-w-[200px]">
                  <div className="px-3 py-2">
                    <p className="text-xs font-semibold text-amber-400">Custom Pin</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {customPin.latitude.toFixed(4)}, {customPin.longitude.toFixed(4)}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">Drag to adjust position</p>
                  </div>

                  {/* Action buttons */}
                  <div className="border-t border-slate-600 px-2 py-1.5 space-y-1">
                    {/* Set as Default */}
                    {user ? (
                      <button
                        type="button"
                        onClick={handleSetAsDefault}
                        disabled={defaultStatus === 'saving' || defaultStatus === 'saved'}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] text-slate-300 hover:bg-slate-700/50 rounded transition-colors disabled:opacity-50"
                      >
                        {defaultStatus === 'saving' ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : defaultStatus === 'saved' ? (
                          <Check className="w-3 h-3 text-green-400" />
                        ) : (
                          <Star className="w-3 h-3" />
                        )}
                        <span>{defaultStatus === 'saved' ? 'Default saved!' : 'Set as Default'}</span>
                      </button>
                    ) : null}

                    {/* Save to Favorites */}
                    {user ? (
                      !showSaveForm ? (
                        <button
                          type="button"
                          onClick={() => {
                            setShowSaveForm(true);
                            setSaveStatus('idle');
                          }}
                          disabled={saveStatus === 'saved'}
                          className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] text-slate-300 hover:bg-slate-700/50 rounded transition-colors disabled:opacity-50"
                        >
                          {saveStatus === 'saved' ? (
                            <Check className="w-3 h-3 text-green-400" />
                          ) : (
                            <Heart className="w-3 h-3" />
                          )}
                          <span>{saveStatus === 'saved' ? 'Saved!' : 'Save to Favorites'}</span>
                        </button>
                      ) : (
                        <div className="space-y-1.5">
                          <input
                            type="text"
                            value={saveName}
                            onChange={(e) => setSaveName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveToFavorites();
                              if (e.key === 'Escape') setShowSaveForm(false);
                            }}
                            placeholder="Spot name..."
                            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-[11px] text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                            autoFocus
                          />
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={handleSaveToFavorites}
                              disabled={!saveName.trim() || saveStatus === 'saving'}
                              className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white text-[11px] rounded transition-colors disabled:opacity-50"
                            >
                              {saveStatus === 'saving' ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Check className="w-3 h-3" />
                              )}
                              <span>Save</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowSaveForm(false);
                                setSaveName('');
                              }}
                              className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-[11px] rounded transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                          {saveStatus === 'error' && (
                            <p className="text-[10px] text-red-400">Failed to save. Try again.</p>
                          )}
                        </div>
                      )
                    ) : (
                      <p className="px-2 py-1.5 text-[10px] text-slate-500">Sign in to save spots</p>
                    )}

                    {/* Clear Pin */}
                    <button
                      type="button"
                      onClick={handleClearCustomPin}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] text-red-400 hover:bg-slate-700/50 rounded transition-colors"
                    >
                      <X className="w-3 h-3" />
                      <span>Clear Pin</span>
                    </button>
                  </div>
                </div>
              </div>
            </Marker>
          )}

          {/* Tide Station Marker */}
          {tideData && tideStationEnabled && (
            <TideStationMarker
              tideData={tideData}
              currentTimestamp={
                openMeteoData?.minutely15?.[0]?.timestamp ?? null
              }
            />
          )}
        </Map>

        {/* Wind Particle Animation Overlay */}
        {currentWeather && (
          <WindParticleLayer
            windData={{
              windSpeed: currentWeather.windSpeed,
              windDirection: currentWeather.windDirection,
            }}
            width={mapContainerRef.current?.clientWidth || 800}
            height={mapContainerRef.current?.clientHeight || 500}
            enabled={windAnimationEnabled}
            particleCount={300}
            particleSpeed={0.8}
            particleLife={150}
          />
        )}

        {/* Ocean Current Particle Animation Overlay */}
        {currentWeather && (
          <OceanCurrentLayer
            currentData={{
              speed: currentWeather.oceanCurrentSpeed,
              direction: currentWeather.oceanCurrentDirection,
            }}
            width={mapContainerRef.current?.clientWidth || 800}
            height={mapContainerRef.current?.clientHeight || 500}
            enabled={oceanCurrentEnabled}
          />
        )}

        {/* Custom Pin Instructions */}
        <div className="absolute bottom-3 left-3 bg-slate-800/80 backdrop-blur-sm px-3 py-1.5 rounded-lg pointer-events-none">
          <p className="text-[10px] text-slate-300">
            {customPin ? 'Drag pin to adjust • Click map to reposition' : 'Click map to place custom pin'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForecastMap;
