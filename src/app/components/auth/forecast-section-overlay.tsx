'use client'

import { useState } from 'react'
import { Lock } from 'lucide-react'
import { AuthDialog } from './auth-dialog'

interface ForecastSectionOverlayProps {
  className?: string
}

export function ForecastSectionOverlay({ className }: ForecastSectionOverlayProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      {/* Gradient fade overlay */}
      <div
        className={`absolute inset-0 z-10 pointer-events-none ${className}`}
        style={{
          background: 'linear-gradient(to right, transparent 0%, rgba(18, 18, 18, 0.7) 20%, rgba(18, 18, 18, 0.95) 50%)',
        }}
      />

      {/* Content card */}
      <div className="absolute inset-0 z-20 flex items-center justify-center">
        <div
          className="text-center px-6 py-5 rounded-2xl border max-w-[220px]"
          style={{
            backgroundColor: 'rgba(30, 30, 35, 0.98)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
          }}
        >
          <h3 className="text-base font-semibold mb-2" style={{ color: '#ffffff' }}>
            Unlock Full Forecast
          </h3>


          <button
            onClick={() => setDialogOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg font-medium transition-all hover:brightness-110 text-sm"
            style={{ backgroundColor: '#2563eb', color: '#ffffff' }}
          >
            <Lock className="h-4 w-4" />
            Sign Up Free
          </button>

          <p className="text-[10px] mt-2.5" style={{ color: '#6b7280' }}>
            No credit card required • Instant access
          </p>
        </div>
      </div>

      <AuthDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultMode="signup"
      />
    </>
  )
}