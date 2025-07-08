'use client'

import { useState } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CalendarIcon, AlertCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EnhancedDateSelectorProps {
  onDateRangeChange: (startDate: string, endDate: string) => void
  loading?: boolean
  maxDaysRange?: number
}

export default function EnhancedDateSelector({
  onDateRangeChange,
  loading = false,
  maxDaysRange = 14,
}: EnhancedDateSelectorProps) {
  const [startDate, setStartDate] = useState<Date | undefined>()
  const [endDate, setEndDate] = useState<Date | undefined>()
  const [error, setError] = useState<string | null>(null)
  const [startCalendarOpen, setStartCalendarOpen] = useState(false)
  const [endCalendarOpen, setEndCalendarOpen] = useState(false)

  // Calculate date constraints
  const today = new Date()
  const maxPastDate = new Date('2020-01-01')

  const validateDateRange = (start?: Date, end?: Date): string | null => {
    if (!start || !end) return null

    // Check if dates are in the future
    if (start > today || end > today) {
      return 'Historical dates cannot be in the future'
    }

    // Check if start date is after end date
    if (start > end) {
      return 'Start date must be before end date'
    }

    // Check if date range is too large
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    if (daysDiff > maxDaysRange) {
      return `Date range cannot exceed ${maxDaysRange} days`
    }

    // Check if dates are too far in the past
    if (start < maxPastDate) {
      return 'Historical data is only available from 2020 onwards'
    }

    return null
  }

  const handleStartDateChange = (date: Date | undefined) => {
    setStartDate(date)
    setStartCalendarOpen(false)

    if (date && endDate) {
      const validationError = validateDateRange(date, endDate)
      setError(validationError)

      if (!validationError) {
        onDateRangeChange(date.toISOString().split('T')[0], endDate.toISOString().split('T')[0])
      }
    }
  }

  const handleEndDateChange = (date: Date | undefined) => {
    setEndDate(date)
    setEndCalendarOpen(false)

    if (startDate && date) {
      const validationError = validateDateRange(startDate, date)
      setError(validationError)

      if (!validationError) {
        onDateRangeChange(startDate.toISOString().split('T')[0], date.toISOString().split('T')[0])
      }
    }
  }

  const setPresetRange = (days: number) => {
    const end = new Date()
    end.setDate(end.getDate() - 1) // Yesterday
    const start = new Date()
    start.setDate(end.getDate() - days + 1)

    setStartDate(start)
    setEndDate(end)
    setError(null)
    onDateRangeChange(start.toISOString().split('T')[0], end.toISOString().split('T')[0])
  }

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'Select date'
    return date.toLocaleDateString()
  }

  const daysDifference =
    startDate && endDate ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1 : 0

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-white mb-2">Select Historical Date Range</h3>
        <p className="text-muted-foreground">Choose dates to analyze past fishing conditions</p>
      </div>

      {/* Preset Buttons */}
      <div className="flex flex-wrap gap-2 justify-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPresetRange(7)}
          disabled={loading}
          className="bg-background/50 border-border/50 hover:bg-background/70"
        >
          Last 7 Days
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPresetRange(14)}
          disabled={loading}
          className="bg-background/50 border-border/50 hover:bg-background/70"
        >
          Last 14 Days
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPresetRange(30)}
          disabled={loading}
          className="bg-background/50 border-border/50 hover:bg-background/70"
        >
          Last 30 Days
        </Button>
      </div>

      {/* Date Pickers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label className="text-foreground font-medium">Start Date</Label>
          <Popover open={startCalendarOpen} onOpenChange={setStartCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                disabled={loading}
                className={cn(
                  'w-full justify-start text-left font-normal bg-background/50 border-border/50 hover:bg-background/70',
                  !startDate && 'text-muted-foreground',
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formatDate(startDate)}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-background border-border" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={handleStartDateChange}
                disabled={date => date > today || date < maxPastDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label className="text-foreground font-medium">End Date</Label>
          <Popover open={endCalendarOpen} onOpenChange={setEndCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                disabled={loading}
                className={cn(
                  'w-full justify-start text-left font-normal bg-background/50 border-border/50 hover:bg-background/70',
                  !endDate && 'text-muted-foreground',
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formatDate(endDate)}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-background border-border" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={handleEndDateChange}
                disabled={date => date > today || date < (startDate || maxPastDate)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Success Info */}
      {!error && startDate && endDate && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="flex items-center gap-2">
            Selected: {formatDate(startDate)} to {formatDate(endDate)}
            <Badge variant="secondary">{daysDifference} days</Badge>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
