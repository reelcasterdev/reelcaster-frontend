'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, MapPin, Settings } from 'lucide-react'
import { AlgorithmVersionDropdown, type AlgorithmVersion } from './algorithm-version-toggle'
import { ReportIcon } from '@/app/components/common/report-icon'

interface DashboardHeaderProps {
  title?: string
  showTimeframe?: boolean
  showSetLocation?: boolean
  showCustomize?: boolean
  showAlgorithm?: boolean
  onSetLocation?: () => void
  onAlgorithmChange?: (version: AlgorithmVersion) => void
}

const TIMEFRAME_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: '3-day', label: '3 Days' },
  { value: '7-day', label: '7 Days' },
  { value: '14-day', label: '14 Days' },
]

export default function DashboardHeader({
  title = 'Reports',
  showTimeframe = true,
  showSetLocation = true,
  showCustomize = true,
  showAlgorithm = false,
  onSetLocation,
  onAlgorithmChange,
}: DashboardHeaderProps) {
  const router = useRouter()
  const [timeframe, setTimeframe] = useState<string>('')
  const [isTimeframeOpen, setIsTimeframeOpen] = useState(false)

  const handleCustomize = () => {
    router.push('/settings/customize-reports')
  }

  const selectedTimeframeLabel = TIMEFRAME_OPTIONS.find(t => t.value === timeframe)?.label || 'Not selected'

  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-rc-bg-light rounded-lg">
          <ReportIcon className="w-5 h-5 text-rc-text-light" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-rc-text">{title}</h1>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Algorithm Version Dropdown */}
        {showAlgorithm && onAlgorithmChange && (
          <AlgorithmVersionDropdown onVersionChange={onAlgorithmChange} />
        )}

        {/* Timeframe Dropdown */}
        {showTimeframe && (
          <div className="relative">
            <button
              onClick={() => setIsTimeframeOpen(!isTimeframeOpen)}
              className="flex items-center bg-rc-bg-dark hover:bg-rc-bg-light border border-rc-bg-light rounded-full text-sm transition-colors"
            >
              <span className="px-4 py-2 text-rc-text-muted border-r border-rc-bg-light">Timeframe</span>
              <span className="flex items-center gap-2 px-4 py-2 text-rc-text">
                {selectedTimeframeLabel}
                <ChevronDown className={`w-4 h-4 text-rc-text-muted transition-transform ${isTimeframeOpen ? 'rotate-180' : ''}`} />
              </span>
            </button>

            {isTimeframeOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsTimeframeOpen(false)}
                />
                <div className="absolute right-0 mt-1 w-40 bg-rc-bg-light border border-rc-bg-dark rounded-lg shadow-xl z-20 overflow-hidden">
                  {TIMEFRAME_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setTimeframe(option.value)
                        setIsTimeframeOpen(false)
                      }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                        timeframe === option.value
                          ? 'bg-blue-600 text-rc-text'
                          : 'text-rc-text-light hover:bg-rc-bg-dark'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Set Location Button */}
        {showSetLocation && (
          <button
            onClick={onSetLocation}
            className="flex items-center gap-2 px-4 py-2 bg-rc-bg-light hover:bg-rc-bg-dark border border-rc-bg-light rounded-lg text-sm text-rc-text transition-colors"
          >
            <MapPin className="w-4 h-4" />
            <span className="hidden sm:inline">Set Location</span>
          </button>
        )}

        {/* Customize Reports Button */}
        {showCustomize && (
          <button
            onClick={handleCustomize}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium text-rc-text transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Customize Reports</span>
          </button>
        )}
      </div>
    </header>
  )
}
