'use client'

import { Waves, Wind, Droplets } from 'lucide-react'

interface MapLayerControlsProps {
  activeLayers: string[]
  onToggleLayer: (layer: string) => void
}

const LAYERS = [
  { id: 'depth', label: 'Depth', icon: Waves },
  { id: 'wind', label: 'Wind Flow', icon: Wind },
  { id: 'tide', label: 'Tide', icon: Droplets },
]

export default function MapLayerControls({
  activeLayers,
  onToggleLayer,
}: MapLayerControlsProps) {
  return (
    <div className="pointer-events-auto px-3 py-1">
      <div className="flex items-center gap-1.5">
        {LAYERS.map(layer => {
          const isActive = activeLayers.includes(layer.id)
          const Icon = layer.icon

          return (
            <button
              key={layer.id}
              onClick={() => onToggleLayer(layer.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-rc-text shadow-lg shadow-blue-600/20'
                  : 'bg-rc-bg-dark text-rc-text-muted hover:bg-rc-bg-light hover:text-rc-text border border-rc-bg-light'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{layer.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
