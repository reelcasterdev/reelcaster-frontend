'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronDown, Beaker } from 'lucide-react'

export type AlgorithmVersion = 'v1' | 'v2'

interface AlgorithmOption {
  value: AlgorithmVersion
  label: string
  description: string
}

const ALGORITHM_OPTIONS: AlgorithmOption[] = [
  {
    value: 'v2',
    label: 'V2 (Physics-Based)',
    description: 'Bio-mechanics & physics models',
  },
  {
    value: 'v1',
    label: 'V1 (Legacy)',
    description: 'Traditional weather-based scoring',
  },
]

interface AlgorithmVersionDropdownProps {
  onVersionChange: (version: AlgorithmVersion) => void
}

export function AlgorithmVersionDropdown({ onVersionChange }: AlgorithmVersionDropdownProps) {
  const [version, setVersion] = useState<AlgorithmVersion>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('algorithm-version')
      if (saved === 'v1' || saved === 'v2') {
        return saved
      }
    }
    return 'v2'
  })
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('algorithm-version')
    if (saved === 'v1' || saved === 'v2') {
      onVersionChange(saved)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleVersionChange = useCallback((newVersion: AlgorithmVersion) => {
    setVersion(newVersion)
    localStorage.setItem('algorithm-version', newVersion)
    onVersionChange(newVersion)
    setIsOpen(false)
  }, [onVersionChange])

  const selectedOption = ALGORITHM_OPTIONS.find(opt => opt.value === version)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-rc-bg-light hover:bg-rc-bg-dark border border-rc-bg-light rounded-lg text-sm text-rc-text-light transition-colors"
      >
        <Beaker className="w-4 h-4 text-rc-text-muted" />
        <span className="text-rc-text-muted hidden sm:inline">Algorithm</span>
        <span className="text-rc-text">{selectedOption?.label || 'V2'}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-1 w-64 bg-rc-bg-light border border-rc-bg-dark rounded-lg shadow-xl z-20 overflow-hidden">
            {ALGORITHM_OPTIONS.map(option => (
              <button
                key={option.value}
                onClick={() => handleVersionChange(option.value)}
                className={`w-full text-left px-4 py-3 transition-colors ${
                  version === option.value
                    ? 'bg-blue-600 text-rc-text'
                    : 'text-rc-text-light hover:bg-rc-bg-dark'
                }`}
              >
                <div className="font-medium text-sm">{option.label}</div>
                <div className={`text-xs mt-0.5 ${
                  version === option.value ? 'text-blue-200' : 'text-rc-text-muted'
                }`}>
                  {option.description}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// Keep the old component for backwards compatibility but mark as deprecated
/** @deprecated Use AlgorithmVersionDropdown instead */
export function AlgorithmVersionToggle({ onVersionChange }: AlgorithmVersionDropdownProps) {
  return <AlgorithmVersionDropdown onVersionChange={onVersionChange} />
}
