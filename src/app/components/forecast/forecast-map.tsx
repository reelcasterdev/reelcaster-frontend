'use client';

import React, { useState, useRef, useCallback, useMemo } from 'react';
import Map, { Marker, MapRef } from 'react-map-gl/mapbox';
import type { MapMouseEvent } from 'mapbox-gl';
import { MapPin, Wind, CloudRain, Thermometer, X, Star, Heart, Check, Loader2 } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';
import { ProcessedOpenMeteoData } from '@/app/utils/openMeteoApi';
import { CHSWaterData } from '@/app/utils/chsTideApi';
import { useAuth } from '@/contexts/auth-context';
import { UserPreferencesService } from '@/lib/user-preferences';
import { supabase } from '@/lib/supabase';

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
  variant?: 'card' | 'fullscreen';
}

const ForecastMap: React.FC<ForecastMapProps> = ({
  location,
  hotspot,
  hotspots,
  centerCoordinates,
  onHotspotChange,
  openMeteoData,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  tideData,
  variant = 'card',
}) => {
  const isFullscreen = variant === 'fullscreen';
  const mapRef = useRef<MapRef>(null);
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const { user } = useAuth();

  // Map viewport state
  const [viewport, setViewport] = useState({
    latitude: centerCoordinates.lat,
    longitude: centerCoordinates.lon,
    zoom: 10,
  });

  const [hoveredHotspot, setHoveredHotspot] = useState<string | null>(null);

  // Custom pin state
  const [customPin, setCustomPin] = useState<{ latitude: number; longitude: number } | null>(
    () => {
      if (hotspot === 'Custom Pin') {
        return { latitude: centerCoordinates.lat, longitude: centerCoordinates.lon };
      }
      return null;
    }
  );
  const [showPinTooltip, setShowPinTooltip] = useState(true);
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
    setShowPinTooltip(true);
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
    setShowPinTooltip(true);
    setSaveStatus('idle');
    setDefaultStatus('idle');
  }, []);

  // Close pin tooltip (without clearing pin)
  const handleClosePinTooltip = useCallback(() => {
    setShowPinTooltip(false);
    setShowSaveForm(false);
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
    <div className={isFullscreen ? 'h-full w-full' : 'space-y-3'}>
      {/* Map Header - only in card mode */}
      {!isFullscreen && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <h3 className="text-sm font-medium text-rc-text truncate">Weather Map - {location}</h3>
          </div>
          {currentWeather && (
            <div className="flex items-center gap-3 text-xs text-rc-text-light">
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
      )}

      {/* Map Container */}
      <div
        className={isFullscreen
          ? 'relative w-full h-full'
          : 'relative w-full h-[350px] sm:h-[500px] rounded-lg overflow-hidden border border-rc-bg-light'
        }
      >
        <Map
          ref={mapRef}
          {...viewport}
          onMove={evt => setViewport(evt.viewState)}
          onClick={handleMapClick}
          mapboxAccessToken={mapboxToken}
          mapStyle="mapbox://styles/mapbox/navigation-night-v1"
          style={{ width: '100%', height: '100%' }}
        >
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
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-rc-bg-dark/95 backdrop-blur-sm border border-rc-bg-light rounded-lg shadow-xl whitespace-nowrap z-10">
                      <p className="text-xs font-semibold text-rc-text">{hotspotData.name}</p>
                      <p className="text-[10px] text-rc-text-muted mt-0.5">
                        {hotspotData.coordinates.lat.toFixed(4)}, {hotspotData.coordinates.lon.toFixed(4)}
                      </p>
                      {isSelected && (
                        <div className="mt-1 pt-1 border-t border-rc-bg-light">
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
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPinTooltip(true);
                }}
              >
                {/* Amber pin to distinguish from blue hotspot markers */}
                <div className="w-10 h-10">
                  <MapPin className="w-full h-full text-amber-500 fill-amber-400 drop-shadow-lg" />
                </div>

                {/* Custom pin tooltip - with close button */}
                {showPinTooltip && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-rc-bg-dark/95 backdrop-blur-sm border border-rc-bg-light rounded-lg shadow-xl z-10 min-w-[200px]">
                    {/* Close button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClosePinTooltip();
                      }}
                      className="absolute top-1.5 right-1.5 p-0.5 rounded-md hover:bg-rc-bg-light transition-colors z-20"
                    >
                      <X className="w-3.5 h-3.5 text-rc-text-muted hover:text-rc-text" />
                    </button>

                    <div className="px-3 py-2 pr-7">
                      <p className="text-xs font-semibold text-amber-400">Custom Pin</p>
                      <p className="text-[10px] text-rc-text-muted mt-0.5">
                        {customPin.latitude.toFixed(4)}, {customPin.longitude.toFixed(4)}
                      </p>
                      <p className="text-[10px] text-rc-text-muted/60 mt-1">Drag to adjust position</p>
                    </div>

                    {/* Action buttons */}
                    <div className="border-t border-rc-bg-light px-2 py-1.5 space-y-1">
                      {/* Set as Default */}
                      {user ? (
                        <button
                          type="button"
                          onClick={handleSetAsDefault}
                          disabled={defaultStatus === 'saving' || defaultStatus === 'saved'}
                          className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] text-rc-text-light hover:bg-rc-bg-light rounded transition-colors disabled:opacity-50"
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
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] text-rc-text-light hover:bg-rc-bg-light rounded transition-colors disabled:opacity-50"
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
                              className="w-full bg-rc-bg-light border border-rc-bg-light rounded px-2 py-1 text-[11px] text-rc-text placeholder:text-rc-text-muted focus:outline-none focus:ring-1 focus:ring-amber-500"
                              autoFocus
                            />
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={handleSaveToFavorites}
                                disabled={!saveName.trim() || saveStatus === 'saving'}
                                className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-amber-600 hover:bg-amber-500 text-rc-text text-[11px] rounded transition-colors disabled:opacity-50"
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
                                className="px-2 py-1 bg-rc-bg-light hover:bg-rc-bg-dark text-rc-text-muted text-[11px] rounded transition-colors"
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
                        <p className="px-2 py-1.5 text-[10px] text-rc-text-muted">Sign in to save spots</p>
                      )}

                      {/* Clear Pin */}
                      <button
                        type="button"
                        onClick={handleClearCustomPin}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] text-red-400 hover:bg-rc-bg-light rounded transition-colors"
                      >
                        <X className="w-3 h-3" />
                        <span>Clear Pin</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </Marker>
          )}
        </Map>

        {/* Custom Pin Instructions */}
        {!isFullscreen && (
          <div className="absolute bottom-3 left-3 bg-rc-bg-dark/80 backdrop-blur-sm px-3 py-1.5 rounded-lg pointer-events-none">
            <p className="text-[10px] text-rc-text-muted">
              {customPin ? 'Drag pin to adjust \u2022 Click map to reposition' : 'Click map to place custom pin'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForecastMap;
