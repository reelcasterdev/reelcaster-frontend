'use client';

import React, { useState, useRef, useCallback, useMemo } from 'react';
import Map, { Marker, Source, Layer, MapRef } from 'react-map-gl/mapbox';
import { MapPin, Wind, CloudRain, Thermometer, Layers, Info, Play, Pause, Sparkles } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';
import { ProcessedOpenMeteoData } from '@/app/utils/openMeteoApi';
import WindParticleLayer from './wind-particle-layer';

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
}

interface WeatherLayer {
  id: string;
  name: string;
  icon: React.ReactNode;
  owmLayer: string;
  enabled: boolean;
}

const ForecastMap: React.FC<ForecastMapProps> = ({
  location,
  hotspot,
  hotspots,
  centerCoordinates,
  onHotspotChange,
  openMeteoData,
}) => {
  const mapRef = useRef<MapRef>(null);
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const owmApiKey = process.env.NEXT_PUBLIC_OPENWEATHERMAP_API_KEY;

  // Map viewport state
  const [viewport, setViewport] = useState({
    latitude: centerCoordinates.lat,
    longitude: centerCoordinates.lon,
    zoom: 10,
  });

  // Weather layer toggles
  const [weatherLayers, setWeatherLayers] = useState<WeatherLayer[]>([
    { id: 'temp', name: 'Temperature', icon: <Thermometer className="w-3 h-3" />, owmLayer: 'temp_new', enabled: true },
    { id: 'precipitation', name: 'Precipitation', icon: <CloudRain className="w-3 h-3" />, owmLayer: 'precipitation_new', enabled: false },
    { id: 'wind', name: 'Wind', icon: <Wind className="w-3 h-3" />, owmLayer: 'wind_new', enabled: false },
    { id: 'clouds', name: 'Clouds', icon: <Layers className="w-3 h-3" />, owmLayer: 'clouds_new', enabled: false },
  ]);

  const [layerOpacity, setLayerOpacity] = useState(0.6);
  const [showSettings, setShowSettings] = useState(false);
  const [hoveredHotspot, setHoveredHotspot] = useState<string | null>(null);
  const [windAnimationEnabled, setWindAnimationEnabled] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Timeline state for forecast playback
  const [timelineIndex, setTimelineIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update viewport when center coordinates change
  React.useEffect(() => {
    setViewport(prev => ({
      ...prev,
      latitude: centerCoordinates.lat,
      longitude: centerCoordinates.lon,
    }));
  }, [centerCoordinates]);

  // Toggle weather layer
  const toggleLayer = useCallback((layerId: string) => {
    setWeatherLayers(prev =>
      prev.map(layer =>
        layer.id === layerId ? { ...layer, enabled: !layer.enabled } : layer
      )
    );
  }, []);

  // Handle hotspot click
  const handleHotspotClick = useCallback((hotspotData: FishingHotspot) => {
    onHotspotChange(hotspotData);
  }, [onHotspotChange]);

  // Get current weather data for display
  const currentWeather = useMemo(() => {
    if (!openMeteoData || !openMeteoData.minutely15 || openMeteoData.minutely15.length === 0) {
      return null;
    }
    const current = openMeteoData.minutely15[timelineIndex] || openMeteoData.minutely15[0];
    return {
      temp: current.temp,
      windSpeed: current.windSpeed,
      windDirection: current.windDirection,
      precipitation: current.precipitation,
      cloudCover: current.cloudCover,
    };
  }, [openMeteoData, timelineIndex]);

  // Timeline playback
  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      playbackIntervalRef.current = setInterval(() => {
        setTimelineIndex(prev => {
          const maxIndex = openMeteoData?.minutely15?.length || 0;
          const next = prev + 1;
          if (next >= maxIndex) {
            if (playbackIntervalRef.current) {
              clearInterval(playbackIntervalRef.current);
              playbackIntervalRef.current = null;
            }
            setIsPlaying(false);
            return 0;
          }
          return next;
        });
      }, 500); // Update every 500ms
    }
  }, [isPlaying, openMeteoData]);

  // Cleanup playback on unmount
  React.useEffect(() => {
    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    };
  }, []);

  // Get timeline timestamp
  const timelineTimestamp = useMemo(() => {
    if (!openMeteoData || !openMeteoData.minutely15 || openMeteoData.minutely15.length === 0) {
      return null;
    }
    const dataPoint = openMeteoData.minutely15[timelineIndex];
    if (!dataPoint || !dataPoint.timestamp) {
      return null;
    }
    return new Date(dataPoint.timestamp);
  }, [openMeteoData, timelineIndex]);

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-medium text-white">Weather Map - {location}</h3>
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

      {/* Weather Layer Toggles */}
      <div className="flex items-center gap-2 flex-wrap">
        {weatherLayers.map(layer => (
          <button
            key={layer.id}
            onClick={() => toggleLayer(layer.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              layer.enabled
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'
            } border`}
          >
            {layer.icon}
            <span>{layer.name}</span>
          </button>
        ))}

        {/* Wind Animation Toggle */}
        <button
          onClick={() => setWindAnimationEnabled(!windAnimationEnabled)}
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

        <button
          onClick={() => setShowSettings(!showSettings)}
          className="ml-auto p-1.5 rounded-md bg-slate-700 hover:bg-slate-600 border border-slate-600 transition-colors"
          title="Map Settings"
        >
          <Info className="w-4 h-4 text-slate-300" />
        </button>
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
            <strong>Tip:</strong> Toggle layers to view different weather conditions. Enable &quot;Wind Flow&quot; to see directional arrows over water (longer arrows = stronger wind). Click hotspot markers to change location.
          </p>
        </div>
      )}

      {/* Map Container */}
      <div
        ref={mapContainerRef}
        className="relative w-full h-[500px] rounded-lg overflow-hidden border border-slate-600"
      >
        <Map
          ref={mapRef}
          {...viewport}
          onMove={evt => setViewport(evt.viewState)}
          mapboxAccessToken={mapboxToken}
          mapStyle="mapbox://styles/mapbox/dark-v11"
          style={{ width: '100%', height: '100%' }}
        >
          {/* OpenWeatherMap Tile Layers */}
          {owmApiKey && weatherLayers.filter(l => l.enabled).map(layer => (
            <Source
              key={layer.id}
              id={`owm-${layer.id}`}
              type="raster"
              tiles={[`https://tile.openweathermap.org/map/${layer.owmLayer}/{z}/{x}/{y}.png?appid=${owmApiKey}`]}
              tileSize={256}
            >
              <Layer
                id={`${layer.id}-layer`}
                type="raster"
                paint={{ 'raster-opacity': layerOpacity }}
              />
            </Source>
          ))}

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
                  onClick={() => handleHotspotClick(hotspotData)}
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

        {/* Map Legend Overlay */}
        {!owmApiKey && weatherLayers.some(l => l.enabled) && (
          <div className="absolute top-4 right-4 bg-yellow-500/20 border border-yellow-500/30 backdrop-blur-sm px-3 py-2 rounded-lg">
            <p className="text-xs text-yellow-300 flex items-center gap-1">
              <Info className="w-3 h-3" />
              Add OpenWeatherMap API key for weather layers
            </p>
          </div>
        )}
      </div>

      {/* Timeline Scrubber */}
      {openMeteoData && openMeteoData.minutely15 && openMeteoData.minutely15.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlayback}
                className="p-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-md transition-colors"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 text-blue-400" />
                ) : (
                  <Play className="w-4 h-4 text-blue-400" />
                )}
              </button>
              <label className="text-xs font-medium text-slate-300">Forecast Timeline</label>
            </div>
            {timelineTimestamp && (
              <span className="text-xs text-blue-400 font-mono">
                {timelineTimestamp.toLocaleDateString()} {timelineTimestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={openMeteoData.minutely15.length - 1}
              step={1}
              value={timelineIndex}
              onChange={(e) => setTimelineIndex(Number(e.target.value))}
              className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <span className="text-xs text-slate-400 font-mono w-16 text-right">
              {timelineIndex + 1} / {openMeteoData.minutely15.length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForecastMap;
