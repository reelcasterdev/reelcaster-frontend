'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'

export type AlgorithmVersion = 'v1' | 'v2'

interface AlgorithmVersionToggleProps {
  onVersionChange: (version: AlgorithmVersion) => void
}

export function AlgorithmVersionToggle({ onVersionChange }: AlgorithmVersionToggleProps) {
  const [version, setVersion] = useState<AlgorithmVersion>(() => {
    // Initialize from localStorage on mount
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('algorithm-version')
      if (saved === 'v1' || saved === 'v2') {
        return saved
      }
    }
    return 'v2'
  })

  // Only call onVersionChange on mount if there's a saved preference
  useEffect(() => {
    const saved = localStorage.getItem('algorithm-version')
    if (saved === 'v1' || saved === 'v2') {
      onVersionChange(saved)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty deps - only run once on mount

  const handleVersionChange = (newVersion: AlgorithmVersion) => {
    setVersion(newVersion)
    localStorage.setItem('algorithm-version', newVersion)
    onVersionChange(newVersion)
  }

  return (
    <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
      <span className="text-sm font-medium text-slate-300">Algorithm Version:</span>
      <div className="flex gap-2">
        <Button
          variant={version === 'v1' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleVersionChange('v1')}
          className={version === 'v1' ? 'bg-blue-600 hover:bg-blue-700' : 'border-slate-600 text-slate-400'}
        >
          V1 (Legacy)
        </Button>
        <Button
          variant={version === 'v2' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleVersionChange('v2')}
          className={version === 'v2' ? 'bg-blue-600 hover:bg-blue-700' : 'border-slate-600 text-slate-400'}
        >
          V2 (Physics-Based)
        </Button>
      </div>
      <span className="text-xs text-slate-400 ml-2 hidden sm:inline">
        {version === 'v2' ?
          'Using bio-mechanics & physics models' :
          'Using traditional weather-based scoring'
        }
      </span>
    </div>
  )
}
