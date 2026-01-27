'use client';

import React, { useState, useEffect } from 'react';
import { Map, Wind } from 'lucide-react';
import ForecastMap from './forecast-map';
import ForecastMapWindy from './forecast-map-windy';
import { ProcessedOpenMeteoData } from '@/app/utils/openMeteoApi';
import { CHSWaterData } from '@/app/utils/chsTideApi';

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
}

type MapType = 'mapbox' | 'windy';

const ForecastMapSwitcher: React.FC<ForecastMapSwitcherProps> = (props) => {
  const [selectedMap, setSelectedMap] = useState<MapType>('mapbox');

  // Load saved preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('forecast-map-type');
    if (saved === 'mapbox' || saved === 'windy') {
      setSelectedMap(saved);
    }
  }, []);

  // Save preference to localStorage
  const handleMapChange = (mapType: MapType) => {
    setSelectedMap(mapType);
    localStorage.setItem('forecast-map-type', mapType);
  };

  return (
    <div className="space-y-3">
      {/* Map Type Switcher */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400 font-medium">Map Type:</span>
        <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-md p-1">
          <button
            onClick={() => handleMapChange('mapbox')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
              selectedMap === 'mapbox'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Map className="w-3 h-3" />
            <span>Mapbox</span>
            <span className="text-[10px] opacity-70">(Custom)</span>
          </button>
          <button
            onClick={() => handleMapChange('windy')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
              selectedMap === 'windy'
                ? 'bg-gradient-to-r from-blue-600 to-green-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wind className="w-3 h-3" />
            <span>Windy</span>
            <span className="text-[10px] opacity-70">(Pro)</span>
          </button>
        </div>
      </div>

      {/* Render Selected Map */}
      {selectedMap === 'mapbox' ? (
        <ForecastMap {...props} />
      ) : (() => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { tideData, ...windyProps } = props;
        return <ForecastMapWindy {...windyProps} />;
      })()}
    </div>
  );
};

export default ForecastMapSwitcher;
