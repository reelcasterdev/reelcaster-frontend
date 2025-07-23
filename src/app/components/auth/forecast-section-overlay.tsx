'use client'

import { useState } from 'react'
import { Lock, Crown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AuthDialog } from './auth-dialog'

interface ForecastSectionOverlayProps {
  className?: string
}

export function ForecastSectionOverlay({ className }: ForecastSectionOverlayProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <div className={`absolute inset-0 bg-gradient-to-r from-black/60 via-black/80 to-black/60 backdrop-blur-[2px] rounded-lg flex flex-col items-center justify-center z-20 ${className}`}>
        <div className="text-center px-6 py-8 max-w-sm">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center shadow-2xl">
              <Crown className="h-8 w-8 text-white" />
            </div>
          </div>
          
          <h3 className="text-2xl font-bold text-white mb-3">
            Unlock Full Forecast
          </h3>
          
          <p className="text-gray-200 mb-6 leading-relaxed">
            Sign up free to access the complete 14-day fishing forecast and premium features
          </p>
          
          <Button 
            onClick={() => setDialogOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-8 py-3 text-lg shadow-2xl hover:shadow-blue-500/20 transition-all duration-300"
          >
            <Lock className="h-5 w-5 mr-2" />
            Sign Up Free
          </Button>
          
          <p className="text-xs text-gray-400 mt-4">
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