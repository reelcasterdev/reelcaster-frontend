'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapPin, Wind, CloudRain, Thermometer, Info, Play, Pause } from 'lucide-react';
import { ProcessedOpenMeteoData } from '@/app/utils/openMeteoApi';
import Script from 'next/script';

interface FishingHotspot {
  name: string;
  coordinates: { lat: number; lon: number };
}

interface ForecastMapWindyProps {
  location: string;
  hotspot: string;
  hotspots: FishingHotspot[];
  centerCoordinates: { lat: number; lon: number };
  onHotspotChange: (hotspot: FishingHotspot) => void;
  openMeteoData: ProcessedOpenMeteoData | null;
}

// Extend Window interface for Windy API
declare global {
  interface Window {
    windyInit: (options: any, windyAPI: any) => void;
    L?: typeof import('leaflet');
  }
}

const ForecastMapWindy: React.FC<ForecastMapWindyProps> = ({
  location,
  hotspot,
  hotspots,
  centerCoordinates,
  onHotspotChange,
  openMeteoData,
}) => {
  const windyApiKey = process.env.NEXT_PUBLIC_WINDY_API_KEY;
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [windyLoaded, setWindyLoaded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Timeline state for forecast playback
  const [timelineIndex, setTimelineIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Store Windy API instance
  const windyAPIRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

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

  // Timeline playback
  const togglePlayback = () => {
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
      }, 500);
    }
  };

  // Load Leaflet CSS dynamically
  useEffect(() => {
    // Check if CSS is already loaded
    const existingLink = document.querySelector('link[href*="leaflet.css"]');
    if (existingLink) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.4.0/dist/leaflet.css';
    link.integrity = 'sha512-puBpdR0798OZvTTbP4A8Ix/l+A4dHDD0DGqYW6RQ+9jxkRFclaxxQb/SJAWZfWAkuyeQUytO7+7N4QKrDh+drA==';
    link.crossOrigin = '';
    document.head.appendChild(link);

    return () => {
      // Don't remove on unmount as it might be used by other instances
    };
  }, []);

  // Cleanup playback on unmount
  useEffect(() => {
    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    };
  }, []);

  // Initialize Windy map
  useEffect(() => {
    if (!leafletLoaded || !windyLoaded || !windyApiKey) return;

    let retryCount = 0;
    const maxRetries = 50; // 5 seconds max

    // Wait a bit for Windy to fully initialize
    const initializeWindy = () => {
      retryCount++;

      if (retryCount > maxRetries) {
        console.error('Windy initialization timeout - windyInit not available after 5 seconds');
        console.log('window object keys:', Object.keys(window).filter(k => k.toLowerCase().includes('windy')));
        return;
      }

      if (typeof window.windyInit !== 'function') {
        console.log(`Waiting for windyInit... (attempt ${retryCount}/${maxRetries})`);
        setTimeout(initializeWindy, 100);
        return;
      }

      const options = {
        key: windyApiKey,
        lat: centerCoordinates.lat,
        lon: centerCoordinates.lon,
        zoom: 10,
      };

      try {
        console.log('Initializing Windy with options:', options);
        window.windyInit(options, (windyAPI: any) => {
          console.log('Windy API initialized successfully');
          windyAPIRef.current = windyAPI;
          const { map } = windyAPI;
          mapRef.current = map;

          // Ensure zoom control is visible
          if (window.L && map) {
            // Remove default zoom control if it exists
            map.zoomControl?.remove();

            // Add zoom control explicitly in top-left position
            window.L.control.zoom({
              position: 'topleft'
            }).addTo(map);

            console.log('Zoom control added to map');
          }

          // Set wind overlay as default
          windyAPI.store.set('overlay', 'wind');

          // Add hotspot markers
          addHotspotMarkers();
        });
      } catch (error) {
        console.error('Error initializing Windy:', error);
      }
    };

    initializeWindy();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windyLoaded, windyApiKey, centerCoordinates]);

  // Add hotspot markers to map
  const addHotspotMarkers = () => {
    if (!mapRef.current || !window.L) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    const L = window.L;

    hotspots.forEach((hotspotData) => {
      const isSelected = hotspotData.name === hotspot;

      // Create custom icon
      const iconHtml = `
        <div class="relative cursor-pointer group">
          <svg
            width="${isSelected ? 40 : 24}"
            height="${isSelected ? 40 : 24}"
            viewBox="0 0 24 24"
            fill="${isSelected ? '#3b82f6' : '#60a5fa'}"
            stroke="currentColor"
            stroke-width="2"
            class="drop-shadow-lg ${isSelected ? 'animate-pulse' : ''}"
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-marker-icon',
        iconSize: [isSelected ? 40 : 24, isSelected ? 40 : 24],
        iconAnchor: [isSelected ? 20 : 12, isSelected ? 40 : 24],
      });

      const marker = L.marker(
        [hotspotData.coordinates.lat, hotspotData.coordinates.lon],
        { icon: customIcon }
      );

      // Add popup
      const popupContent = `
        <div class="text-sm">
          <p class="font-semibold text-white mb-1">${hotspotData.name}</p>
          <p class="text-xs text-slate-400">
            ${hotspotData.coordinates.lat.toFixed(4)}, ${hotspotData.coordinates.lon.toFixed(4)}
          </p>
          ${isSelected ? '<p class="text-xs text-blue-400 font-medium mt-1 pt-1 border-t border-slate-600">Current Location</p>' : ''}
        </div>
      `;

      marker.bindPopup(popupContent);

      // Add click handler
      marker.on('click', () => {
        onHotspotChange(hotspotData);
      });

      // Add hover handlers
      marker.on('mouseover', () => {
        marker.openPopup();
      });

      marker.on('mouseout', () => {
        if (!isSelected) {
          marker.closePopup();
        }
      });

      marker.addTo(mapRef.current);
      markersRef.current.push(marker);
    });
  };

  // Update markers when hotspot changes
  useEffect(() => {
    if (windyAPIRef.current && mapRef.current) {
      addHotspotMarkers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotspot, hotspots]);

  // Update map center when coordinates change
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView([centerCoordinates.lat, centerCoordinates.lon], 10);
    }
  }, [centerCoordinates]);

  if (!windyApiKey) {
    return (
      <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
        <p className="text-red-400 text-sm">
          Windy API key not configured. Please add NEXT_PUBLIC_WINDY_API_KEY to your environment variables.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Load Leaflet JS first */}
      <Script
        src="https://unpkg.com/leaflet@1.4.0/dist/leaflet.js"
        integrity="sha512-QVftwZFqvtRNi0ZyCtsznlKSWOStnDORoefr1enyq5mVL4tmKB3S/EnC3rRJcxCPavG10IcrVGSmPh6Qw5lwrg=="
        crossOrigin=""
        strategy="afterInteractive"
        onLoad={() => {
          console.log('Leaflet script loaded');
          setLeafletLoaded(true);
        }}
        onError={(e) => {
          console.error('Error loading Leaflet script:', e);
        }}
      />

      {/* Load Windy API after Leaflet */}
      {leafletLoaded && (
        <Script
          src="https://api.windy.com/assets/map-forecast/libBoot.js"
          strategy="afterInteractive"
          onLoad={() => {
            console.log('Windy script loaded');
            setWindyLoaded(true);
          }}
          onError={(e) => {
            console.error('Error loading Windy script:', e);
          }}
        />
      )}

      <div className="space-y-3">
        {/* Map Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-medium text-white">
              Windy Weather Map - {location}
            </h3>
            <span className="text-xs bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded border border-blue-500/30">
              Official Windy Visualization
            </span>
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

        {/* Info Banner */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-slate-700 text-slate-300 border border-slate-600 hover:bg-slate-600 transition-colors"
          >
            <Info className="w-4 h-4" />
            <span>How to use</span>
          </button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="p-3 bg-slate-800 border border-slate-700 rounded-lg space-y-2">
            <p className="text-xs text-slate-300 font-medium mb-2">Windy Map Features:</p>
            <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
              <li>Use the <strong>layer menu</strong> (bottom right) to switch between wind, temperature, precipitation, and more</li>
              <li>Click <strong>hotspot markers</strong> to change fishing location</li>
              <li>Drag to pan, scroll to zoom</li>
              <li>Click on the map to get detailed forecast at any point</li>
              <li>Use the <strong>timeline</strong> (bottom) to see forecast progression</li>
            </ul>
            <p className="text-xs text-yellow-300 mt-2 pt-2 border-t border-slate-600">
              <strong>Note:</strong> This uses Windy&apos;s official wind visualization - one of the best in the industry!
            </p>
          </div>
        )}

        {/* Map Container */}
        <div
          ref={mapContainerRef}
          id="windy"
          className="w-full h-[350px] sm:h-[500px] rounded-lg border border-slate-600"
          style={{ position: 'relative', overflow: 'visible' }}
        />

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

      {/* Custom Styles for Leaflet markers */}
      <style jsx global>{`
        .custom-marker-icon {
          background: transparent !important;
          border: none !important;
        }

        .leaflet-popup-content-wrapper {
          background: rgba(30, 41, 59, 0.95) !important;
          backdrop-filter: blur(8px);
          border: 1px solid rgb(71, 85, 105) !important;
          border-radius: 0.5rem !important;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3) !important;
        }

        .leaflet-popup-tip {
          background: rgba(30, 41, 59, 0.95) !important;
        }

        .leaflet-popup-content {
          margin: 8px 12px !important;
        }

        .leaflet-container {
          font-family: inherit !important;
          border-radius: 0.5rem !important;
        }

        /* Ensure Windy controls are always visible on top */
        #windy .leaflet-control-container,
        #windy .leaflet-control,
        #windy .leaflet-bar,
        #windy .leaflet-top,
        #windy .leaflet-bottom,
        #windy .leaflet-right,
        #windy .leaflet-left {
          z-index: 1000 !important;
        }

        /* Zoom control specific styling */
        #windy .leaflet-control-zoom {
          z-index: 1000 !important;
          pointer-events: auto !important;
          visibility: visible !important;
          opacity: 1 !important;
          display: block !important;
          margin: 10px !important;
        }

        #windy .leaflet-control-zoom a {
          background-color: rgba(30, 41, 59, 0.95) !important;
          color: white !important;
          border: 1px solid rgb(71, 85, 105) !important;
          width: 32px !important;
          height: 32px !important;
          line-height: 32px !important;
          text-align: center !important;
          display: block !important;
        }

        #windy .leaflet-control-zoom a:hover {
          background-color: rgba(51, 65, 85, 0.95) !important;
        }

        #windy .leaflet-top.leaflet-left {
          top: 10px !important;
          left: 10px !important;
        }

        /* Windy specific controls */
        #windy [class*="rqb-"],
        #windy [class*="plugin-"],
        #windy [class*="mobile-"],
        #windy .size-l {
          z-index: 1000 !important;
          pointer-events: auto !important;
        }
      `}</style>
    </>
  );
};

export default ForecastMapWindy;
