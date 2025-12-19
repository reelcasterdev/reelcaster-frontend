'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { Fish, Loader2, WifiOff, Check } from 'lucide-react'
import { getCurrentPosition, GeoLocationResult, GeoLocationError } from '@/lib/geolocation-service'
import {
  createCatch,
  getPendingSyncCount,
  isOnline,
  onConnectivityChange,
  type OfflineCatch,
} from '@/lib/offline-catch-store'
import QuickCatchModal from './quick-catch-modal'

interface FishOnButtonProps {
  userId: string | null
  onCatchCreated?: (catchData: OfflineCatch) => void
}

type CaptureState = 'idle' | 'capturing' | 'selecting' | 'success' | 'error'

const FishOnButton: React.FC<FishOnButtonProps> = ({ userId, onCatchCreated }) => {
  const [state, setState] = useState<CaptureState>('idle')
  const [gpsData, setGpsData] = useState<GeoLocationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [online, setOnline] = useState(true)
  const [showSuccess, setShowSuccess] = useState(false)

  // Monitor connectivity and pending sync count
  useEffect(() => {
    const updatePendingCount = async () => {
      const count = await getPendingSyncCount()
      setPendingCount(count)
    }

    updatePendingCount()
    const interval = setInterval(updatePendingCount, 30000) // Check every 30 seconds

    const cleanup = onConnectivityChange((isOnlineNow) => {
      setOnline(isOnlineNow)
      if (isOnlineNow) {
        updatePendingCount()
      }
    })

    setOnline(isOnline())

    return () => {
      clearInterval(interval)
      cleanup()
    }
  }, [])

  // Handle Fish On button click
  const handleFishOn = useCallback(async () => {
    if (!userId) {
      setError('Please sign in to log catches')
      setState('error')
      return
    }

    setState('capturing')
    setError(null)

    try {
      // Capture GPS location
      const position = await getCurrentPosition()
      setGpsData(position)

      // Trigger haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }

      // Show outcome selection modal
      setState('selecting')
      setShowModal(true)
    } catch (err) {
      const geoError = err as GeoLocationError
      setError(geoError.message)
      setState('error')

      // Auto-clear error after 5 seconds
      setTimeout(() => {
        if (state === 'error') {
          setState('idle')
          setError(null)
        }
      }, 5000)
    }
  }, [userId, state])

  // Handle outcome selection from modal
  const handleOutcomeSelect = useCallback(
    async (outcome: 'bite' | 'landed', speciesId?: string, speciesName?: string) => {
      if (!gpsData || !userId) return

      try {
        // Create catch in local store
        const newCatch = await createCatch({
          userId,
          caughtAt: new Date().toISOString(),
          locationLat: gpsData.latitude,
          locationLng: gpsData.longitude,
          locationAccuracy: gpsData.accuracy,
          locationHeading: gpsData.heading,
          locationSpeed: gpsData.speed,
          locationName: null,
          outcome,
          speciesId: speciesId || null,
          speciesName: speciesName || null,
          retentionStatus: null,
          lengthCm: null,
          weightKg: null,
          depthM: null,
          lureId: null,
          lureName: null,
          notes: null,
          photos: [],
          weatherSnapshot: null,
          tideSnapshot: null,
          moonPhase: null,
          isPrivate: true,
        })

        // Haptic feedback for success
        if (navigator.vibrate) {
          navigator.vibrate([50, 50, 50])
        }

        // Update pending count
        const count = await getPendingSyncCount()
        setPendingCount(count)

        // Notify parent
        if (onCatchCreated) {
          onCatchCreated(newCatch)
        }

        // Show success state
        setShowModal(false)
        setState('success')
        setShowSuccess(true)

        // Reset after 2 seconds
        setTimeout(() => {
          setState('idle')
          setShowSuccess(false)
          setGpsData(null)
        }, 2000)
      } catch (err) {
        console.error('Error creating catch:', err)
        setError('Failed to save catch')
        setState('error')
      }
    },
    [gpsData, userId, onCatchCreated]
  )

  // Handle modal close
  const handleModalClose = useCallback(() => {
    setShowModal(false)
    setState('idle')
    setGpsData(null)
  }, [])

  // Don't render if no user
  if (!userId) {
    return null
  }

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {/* Offline indicator */}
        {!online && pendingCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/20 border border-yellow-500/50 rounded-full text-xs text-yellow-300 animate-pulse">
            <WifiOff className="w-3 h-3" />
            <span>{pendingCount} pending sync</span>
          </div>
        )}

        {/* Error message */}
        {error && state === 'error' && (
          <div className="max-w-[200px] px-3 py-2 bg-red-500/20 border border-red-500/50 rounded-lg text-xs text-red-300">
            {error}
          </div>
        )}

        {/* Success message */}
        {showSuccess && (
          <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/50 rounded-lg text-sm text-green-300 animate-fade-in">
            <Check className="w-4 h-4" />
            <span>Catch logged!</span>
          </div>
        )}

        {/* Main FAB button */}
        <button
          onClick={handleFishOn}
          disabled={state === 'capturing' || state === 'selecting'}
          className={`
            relative flex items-center justify-center
            w-16 h-16 sm:w-20 sm:h-20
            rounded-full shadow-2xl
            transition-all duration-300 transform
            ${
              state === 'capturing'
                ? 'bg-blue-600 scale-95'
                : state === 'success'
                  ? 'bg-green-600 scale-110'
                  : state === 'error'
                    ? 'bg-red-600'
                    : 'bg-gradient-to-br from-blue-500 to-emerald-500 hover:scale-110 hover:shadow-blue-500/50'
            }
            disabled:opacity-75 disabled:cursor-not-allowed
            active:scale-95
          `}
          style={{
            boxShadow: state === 'idle' ? '0 4px 20px rgba(59, 130, 246, 0.5)' : undefined,
          }}
        >
          {/* Pulsing ring animation when capturing */}
          {state === 'capturing' && (
            <>
              <span className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-40" />
              <span className="absolute inset-0 rounded-full bg-blue-500 animate-pulse opacity-60" />
            </>
          )}

          {/* Icon */}
          {state === 'capturing' ? (
            <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 text-white animate-spin" />
          ) : state === 'success' ? (
            <Check className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          ) : (
            <Fish className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          )}
        </button>

        {/* Label */}
        <span
          className={`
          text-xs font-bold uppercase tracking-wider
          ${state === 'success' ? 'text-green-400' : 'text-white'}
          transition-colors
        `}
        >
          {state === 'capturing' ? 'Getting GPS...' : state === 'success' ? 'Logged!' : 'Fish On!'}
        </span>
      </div>

      {/* Quick Catch Modal */}
      {showModal && gpsData && (
        <QuickCatchModal
          gpsData={gpsData}
          onSelectOutcome={handleOutcomeSelect}
          onClose={handleModalClose}
        />
      )}
    </>
  )
}

export default FishOnButton
