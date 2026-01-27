'use client';

import React, { useMemo } from 'react';
import { Marker } from 'react-map-gl/mapbox';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { CHSWaterData } from '@/app/utils/chsTideApi';

interface TideStationMarkerProps {
  tideData: CHSWaterData;
  currentTimestamp: number | null; // Unix timestamp in seconds
}

const TideStationMarker: React.FC<TideStationMarkerProps> = ({
  tideData,
  currentTimestamp,
}) => {
  const tideInfo = useMemo(() => {
    const ts = currentTimestamp ?? Date.now() / 1000;

    // Binary search for closest water level entry
    let closestLevel = tideData.waterLevels[0];
    let lo = 0;
    let hi = tideData.waterLevels.length - 1;

    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (tideData.waterLevels[mid].timestamp < ts) {
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }

    // lo is now the first entry >= ts, pick closest between lo and lo-1
    if (lo >= tideData.waterLevels.length) {
      closestLevel = tideData.waterLevels[tideData.waterLevels.length - 1];
    } else if (lo === 0) {
      closestLevel = tideData.waterLevels[0];
    } else {
      const before = tideData.waterLevels[lo - 1];
      const after = tideData.waterLevels[lo];
      closestLevel = Math.abs(before.timestamp - ts) <= Math.abs(after.timestamp - ts)
        ? before
        : after;
    }

    // Determine rising/falling by checking surrounding water levels
    const closestIdx = tideData.waterLevels.indexOf(closestLevel);
    let isRising = tideData.isRising;
    if (closestIdx > 0 && closestIdx < tideData.waterLevels.length - 1) {
      const prev = tideData.waterLevels[closestIdx - 1];
      const next = tideData.waterLevels[closestIdx + 1];
      isRising = next.height > prev.height;
    } else if (closestIdx > 0) {
      isRising = closestLevel.height > tideData.waterLevels[closestIdx - 1].height;
    }

    // Find next tide event after current timestamp
    const nextEvent = tideData.tideEvents.find(e => e.timestamp > ts);
    let nextTideLabel = '';
    if (nextEvent) {
      const eventDate = new Date(nextEvent.timestamp * 1000);
      const timeStr = eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      nextTideLabel = `${nextEvent.type === 'high' ? 'High' : 'Low'} ${timeStr}`;
    }

    return {
      height: closestLevel.height,
      isRising,
      nextTideLabel,
    };
  }, [tideData, currentTimestamp]);

  return (
    <Marker
      latitude={tideData.station.latitude}
      longitude={tideData.station.longitude}
      anchor="bottom"
    >
      <div className="relative cursor-default">
        {/* Compact tide card */}
        <div className="bg-rc-bg-dark/95 backdrop-blur-sm border border-blue-500/40 rounded-lg px-2.5 py-1.5 shadow-lg shadow-blue-500/10 min-w-[90px]">
          {/* Water height + direction */}
          <div className="flex items-center gap-1.5">
            {tideInfo.isRising ? (
              <ArrowUp className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            ) : (
              <ArrowDown className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            )}
            <span className="text-sm font-bold text-rc-text tabular-nums">
              {tideInfo.height.toFixed(1)}m
            </span>
          </div>

          {/* Next tide */}
          {tideInfo.nextTideLabel && (
            <p className="text-[10px] text-rc-text-muted mt-0.5 leading-tight">
              {tideInfo.nextTideLabel}
            </p>
          )}
        </div>

        {/* Pointer triangle */}
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 bg-rc-bg-dark/95 border-b border-r border-blue-500/40 rotate-45" />
      </div>
    </Marker>
  );
};

export default TideStationMarker;
