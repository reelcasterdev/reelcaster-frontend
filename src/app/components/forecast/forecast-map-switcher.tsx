'use client';

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Map, Wind, Sparkles } from 'lucide-react';
import ForecastMap from './forecast-map';
import ForecastMapWindy from './forecast-map-windy';
import { ProcessedOpenMeteoData } from '@/app/utils/openMeteoApi';
import { CHSWaterData } from '@/app/utils/chsTideApi';

// Lazy load the experimental mapcn component
const ForecastMapMapcn = lazy(() => import('./forecast-map-mapcn'));

interface FishingHotspot {
  name: string;
  coordinates: { lat: number; lon: number };
}

interface ForecastMapSwitcherProps {
  location: string;
  hotspot: string;
  hotspots: FishingHotspot[];
  centerCoordinates: { lat: number; lon: number };
  onHotspotChange: (hotspot: FishingHotspot) => void;
  openMeteoData: ProcessedOpenMeteoData | null;
  tideData?: CHSWaterData | null;
  variant?: 'card' | 'fullscreen';
}

type MapType = 'mapbox' | 'windy' | 'mapcn';

const ForecastMapSwitcher: React.FC<ForecastMapSwitcherProps> = ({ variant = 'card', ...restProps }) => {
  const props = { ...restProps, variant };
  const [selectedMap, setSelectedMap] = useState<MapType>('mapbox');

  // Load saved preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('forecast-map-type');
    if (saved === 'mapbox' || saved === 'windy' || saved === 'mapcn') {
      setSelectedMap(saved);
    }
  }, []);

  // Save preference to localStorage
  const handleMapChange = (mapType: MapType) => {
    setSelectedMap(mapType);
    localStorage.setItem('forecast-map-type', mapType);
  };

  const isFullscreen = variant === 'fullscreen';

  // Map type switcher element
  const mapTypeSwitcher = (
    <div className={`flex items-center gap-1 ${isFullscreen ? 'bg-rc-bg-dark/80 backdrop-blur-md border border-rc-bg-light/30' : 'bg-rc-bg-darkest border border-rc-bg-light'} rounded-lg p-1`}>
      <button
        onClick={() => handleMapChange('mapbox')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
          selectedMap === 'mapbox'
            ? 'bg-blue-600 text-rc-text shadow-lg'
            : 'text-rc-text-muted hover:text-rc-text-light'
        }`}
      >
        <Map className="w-3 h-3" />
        <span>Mapbox</span>
      </button>
      <button
        onClick={() => handleMapChange('windy')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
          selectedMap === 'windy'
            ? 'bg-gradient-to-r from-blue-600 to-green-600 text-rc-text shadow-lg'
            : 'text-rc-text-muted hover:text-rc-text-light'
        }`}
      >
        <Wind className="w-3 h-3" />
        <span>Windy</span>
      </button>
      <button
        onClick={() => handleMapChange('mapcn')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
          selectedMap === 'mapcn'
            ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-rc-text shadow-lg'
            : 'text-rc-text-muted hover:text-rc-text-light'
        }`}
      >
        <Sparkles className="w-3 h-3" />
        <span>MapLibre</span>
        <span className="text-[9px] px-1 py-0.5 rounded bg-purple-500/30 text-purple-300 font-medium">NEW</span>
      </button>
    </div>
  );

  // Map element based on selected type
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { variant: _variant, ...mapBaseProps } = props;
  const mapElement = selectedMap === 'mapbox' ? (
    <ForecastMap {...mapBaseProps} variant={variant} />
  ) : selectedMap === 'mapcn' ? (
    <Suspense fallback={
      <div className={`w-full ${isFullscreen ? 'h-full' : 'h-[350px] sm:h-[500px]'} rounded-xl bg-rc-bg-dark border border-rc-bg-light flex items-center justify-center`}>
        <div className="flex flex-col items-center gap-2">
          <div className="flex gap-1">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse [animation-delay:150ms]" />
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse [animation-delay:300ms]" />
          </div>
          <p className="text-xs text-rc-text-muted">Loading MapLibre...</p>
        </div>
      </div>
    }>
      <ForecastMapMapcn {...mapBaseProps} variant={variant} />
    </Suspense>
  ) : (() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { tideData: _td, ...windyProps } = mapBaseProps;
    return <ForecastMapWindy {...windyProps} variant={variant} />;
  })();

  if (isFullscreen) {
    return (
      <div className="relative h-full w-full">
        {mapElement}
        {/* Floating map type switcher */}
        <div className="absolute bottom-3 right-3 z-20 pointer-events-auto">
          {mapTypeSwitcher}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-rc-text-muted font-medium">Map Type:</span>
        {mapTypeSwitcher}
      </div>
      {mapElement}
    </div>
  );
};

export default ForecastMapSwitcher;
