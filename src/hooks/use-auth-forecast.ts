'use client'

import { useAuth } from '@/contexts/auth-context'
import { OpenMeteoDailyForecast } from '@/app/utils/fishingCalculations'

export interface AuthForecastResult {
  isAuthenticated: boolean
  forecastData: OpenMeteoDailyForecast[]
  availableDays: number
  shouldBlurAfterDay: number | null
}

export function useAuthForecast(fullForecastData: OpenMeteoDailyForecast[]): AuthForecastResult {
  const { user, loading } = useAuth()
  
  const isAuthenticated = !loading && !!user
  const availableDays = isAuthenticated ? 14 : 3
  
  // Return full forecast data but indicate which days should be blurred
  const shouldBlurAfterDay = isAuthenticated ? null : 2 // Blur after day 3 (index 2)
  
  return {
    isAuthenticated,
    forecastData: fullForecastData,
    availableDays,
    shouldBlurAfterDay
  }
}