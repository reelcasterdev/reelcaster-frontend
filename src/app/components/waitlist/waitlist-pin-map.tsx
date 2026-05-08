'use client';

import { useState, useCallback } from 'react';
import Map, { Marker } from 'react-map-gl/mapbox';
import type { MapMouseEvent } from 'mapbox-gl';
import { MapPin } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

interface Props {
  initialLat?: number;
  initialLon?: number;
  onChange: (pin: { lat: number; lon: number } | null) => void;
}

export default function WaitlistPinMap({ initialLat, initialLon, onChange }: Props) {
  const [pin, setPin] = useState<{ lat: number; lon: number } | null>(
    initialLat !== undefined && initialLon !== undefined
      ? { lat: initialLat, lon: initialLon }
      : null,
  );

  const handleClick = useCallback(
    (e: MapMouseEvent) => {
      const next = { lat: e.lngLat.lat, lon: e.lngLat.lng };
      setPin(next);
      onChange(next);
    },
    [onChange],
  );

  if (!MAPBOX_TOKEN) {
    return (
      <div className="w-full h-full flex items-center justify-center text-rc-text-muted text-sm">
        Map unavailable (NEXT_PUBLIC_MAPBOX_TOKEN missing)
      </div>
    );
  }

  return (
    <Map
      mapboxAccessToken={MAPBOX_TOKEN}
      initialViewState={{
        latitude: initialLat ?? 48.41,
        longitude: initialLon ?? -123.4,
        zoom: 7,
      }}
      mapStyle="mapbox://styles/mapbox/dark-v11"
      onClick={handleClick}
      style={{ width: '100%', height: '100%' }}
    >
      {pin && (
        <Marker latitude={pin.lat} longitude={pin.lon} anchor="bottom">
          <MapPin className="w-7 h-7 text-blue-500 fill-blue-500/30" />
        </Marker>
      )}
    </Map>
  );
}
