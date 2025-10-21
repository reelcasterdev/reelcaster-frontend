'use client'

import { useUnitPreferences } from '@/contexts/unit-preferences-context'
import {
  MetricType,
  WindUnit,
  TempUnit,
  PrecipUnit,
  HeightUnit,
  convertAndFormat
} from '@/app/utils/unit-conversions'

interface ConvertibleValueProps {
  value: number
  type: MetricType
  sourceUnit: WindUnit | TempUnit | PrecipUnit | HeightUnit
  precision?: number
  className?: string
}

export function ConvertibleValue({
  value,
  type,
  sourceUnit,
  precision,
  className = ''
}: ConvertibleValueProps) {
  const { windUnit, tempUnit, precipUnit, heightUnit, cycleUnit } = useUnitPreferences()

  // Determine target unit based on type
  let targetUnit: WindUnit | TempUnit | PrecipUnit | HeightUnit
  switch (type) {
    case 'wind':
      targetUnit = windUnit
      break
    case 'temp':
      targetUnit = tempUnit
      break
    case 'precip':
      targetUnit = precipUnit
      break
    case 'height':
      targetUnit = heightUnit
      break
  }

  // Convert and format the value
  const formattedValue = convertAndFormat(value, type, sourceUnit, targetUnit, precision)

  // Handle click to cycle units
  const handleClick = () => {
    cycleUnit(type)
  }

  return (
    <button
      onClick={handleClick}
      className={`
        inline-flex items-center gap-0.5
        border-b border-dotted border-current
        cursor-pointer
        transition-colors
        hover:text-blue-600 dark:hover:text-blue-400
        ${className}
      `}
      title={`Click to change ${type} unit`}
      type="button"
    >
      {formattedValue}
    </button>
  )
}
