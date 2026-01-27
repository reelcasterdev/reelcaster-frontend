'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import ForecastMapSwitcher from './forecast-map-switcher'
import { ProcessedOpenMeteoData } from '../../utils/openMeteoApi'
import { CHSWaterData } from '../../utils/chsTideApi'

interface Hotspot {
  name: string
  coordinates: { lat: number; lon: number }
}

interface MapModalProps {
  isOpen: boolean
  onClose: () => void
  location: string
  hotspot: string
  hotspots: Hotspot[]
  centerCoordinates: { lat: number; lon: number }
  onHotspotChange: (hotspot: Hotspot) => void
  openMeteoData: ProcessedOpenMeteoData | null
  tideData?: CHSWaterData | null
}

export default function MapModal({
  isOpen,
  onClose,
  location,
  hotspot,
  hotspots,
  centerCoordinates,
  onHotspotChange,
  openMeteoData,
  tideData,
}: MapModalProps) {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full h-full max-w-[95vw] max-h-[95vh] sm:max-w-[90vw] sm:max-h-[90vh] m-2 sm:m-8 bg-rc-bg-darkest rounded-xl sm:rounded-2xl border border-rc-bg-light overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-rc-bg-light">
          <h2 className="text-lg sm:text-xl font-semibold text-rc-text">Weather Map</h2>
          <button
            onClick={onClose}
            className="p-2.5 rounded-lg bg-rc-bg-light hover:bg-rc-bg-dark text-rc-text-muted hover:text-rc-text transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Map Content */}
        <div className="flex-1 overflow-hidden p-4">
          <div className="w-full h-full rounded-xl overflow-hidden">
            <ForecastMapSwitcher
              location={location}
              hotspot={hotspot}
              hotspots={hotspots}
              centerCoordinates={centerCoordinates}
              onHotspotChange={onHotspotChange}
              openMeteoData={openMeteoData}
              tideData={tideData}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
