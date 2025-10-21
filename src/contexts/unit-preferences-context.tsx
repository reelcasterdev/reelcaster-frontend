'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { UserPreferencesService } from '@/lib/user-preferences'
import { WindUnit, TempUnit, PrecipUnit, HeightUnit, MetricType, getNextUnit } from '@/app/utils/unit-conversions'
import { useAuth } from './auth-context'

interface UnitPreferencesContextType {
  windUnit: WindUnit
  tempUnit: TempUnit
  precipUnit: PrecipUnit
  heightUnit: HeightUnit
  cycleUnit: (type: MetricType) => Promise<void>
  loading: boolean
}

const UnitPreferencesContext = createContext<UnitPreferencesContextType | undefined>(undefined)

export function UnitPreferencesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [windUnit, setWindUnit] = useState<WindUnit>('kph')
  const [tempUnit, setTempUnit] = useState<TempUnit>('C')
  const [precipUnit, setPrecipUnit] = useState<PrecipUnit>('mm')
  const [heightUnit, setHeightUnit] = useState<HeightUnit>('m')
  const [loading, setLoading] = useState(true)

  // Load preferences from UserPreferencesService
  useEffect(() => {
    const loadPreferences = async () => {
      setLoading(true)
      const preferences = await UserPreferencesService.getUserPreferences()

      setWindUnit(preferences.windUnit || 'kph')
      setTempUnit(preferences.tempUnit || 'C')
      setPrecipUnit(preferences.precipUnit || 'mm')
      setHeightUnit(preferences.heightUnit || 'm')

      setLoading(false)
    }

    loadPreferences()
  }, [user])

  // Cycle to next unit for a given metric type
  const cycleUnit = useCallback(async (type: MetricType) => {
    let currentUnit: WindUnit | TempUnit | PrecipUnit | HeightUnit
    let setUnit: (unit: any) => void

    switch (type) {
      case 'wind':
        currentUnit = windUnit
        setUnit = setWindUnit
        break
      case 'temp':
        currentUnit = tempUnit
        setUnit = setTempUnit
        break
      case 'precip':
        currentUnit = precipUnit
        setUnit = setPrecipUnit
        break
      case 'height':
        currentUnit = heightUnit
        setUnit = setHeightUnit
        break
      default:
        return
    }

    const nextUnit = getNextUnit(currentUnit as any, type)

    // Update local state immediately for responsiveness
    setUnit(nextUnit)

    // Update in database
    const updatePayload: Record<string, string> = {}
    updatePayload[`${type === 'wind' ? 'wind' : type === 'temp' ? 'temp' : type === 'precip' ? 'precip' : 'height'}Unit`] = nextUnit

    await UserPreferencesService.updateUserPreferences(updatePayload)
  }, [windUnit, tempUnit, precipUnit, heightUnit])

  const value = {
    windUnit,
    tempUnit,
    precipUnit,
    heightUnit,
    cycleUnit,
    loading,
  }

  return (
    <UnitPreferencesContext.Provider value={value}>
      {children}
    </UnitPreferencesContext.Provider>
  )
}

export function useUnitPreferences() {
  const context = useContext(UnitPreferencesContext)
  if (context === undefined) {
    throw new Error('useUnitPreferences must be used within a UnitPreferencesProvider')
  }
  return context
}
