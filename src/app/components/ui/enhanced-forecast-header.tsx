'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ArrowLeft, RefreshCw, Calendar, MapPin, Fish, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EnhancedForecastHeaderProps {
  location: string
  hotspot: string
  species?: string | null
  forecastDays: number
  loading?: boolean
  onBack: () => void
  onForecastDaysChange: (days: number) => void
  onRefresh: () => void
  mode?: 'forecast' | 'historical'
}

export default function EnhancedForecastHeader({
  location,
  hotspot,
  species,
  forecastDays,
  loading = false,
  onBack,
  onForecastDaysChange,
  onRefresh,
  mode = 'forecast',
}: EnhancedForecastHeaderProps) {
  const forecastOptions = [
    { value: '3', label: '3 Days', description: 'Short-term detailed forecast' },
    { value: '7', label: '7 Days', description: 'Week ahead planning' },
    { value: '14', label: '14 Days', description: 'Extended outlook' },
  ]

  return (
    <TooltipProvider>
      <div className="bg-card/50 backdrop-blur-sm rounded-lg border border-border/50 p-6 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Left Section - Title and Info */}
          <div className="flex items-start gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={onBack}
              className="mt-1 bg-background/50 border-border/50 hover:bg-background/70"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground">
                  {mode === 'forecast' ? 'Fishing Forecast' : 'Historical Analysis'}
                </h1>
                <Badge variant={mode === 'forecast' ? 'default' : 'secondary'}>
                  {mode === 'forecast' ? 'Live' : 'Archive'}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span className="font-medium text-foreground">{location}</span>
                </div>
                <span>•</span>
                <span>{hotspot}</span>
                {species && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Fish className="h-4 w-4" />
                      <span className="font-medium text-foreground">{species}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Section - Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {mode === 'forecast' && (
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Choose forecast duration</p>
                  </TooltipContent>
                </Tooltip>

                <Select
                  value={forecastDays.toString()}
                  onValueChange={value => onForecastDaysChange(parseInt(value))}
                  disabled={loading}
                >
                  <SelectTrigger className="w-32 bg-background/50 border-border/50">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {forecastOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex flex-col">
                          <span>{option.label}</span>
                          <span className="text-xs text-muted-foreground">{option.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
              className="bg-background/50 border-border/50 hover:bg-background/70"
            >
              <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* Quick Stats Bar */}
        {mode === 'forecast' && (
          <div className="mt-4 pt-4 border-t border-border/30">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-muted-foreground">Live Data</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {forecastDays} day{forecastDays > 1 ? 's' : ''} ahead
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <span className="text-muted-foreground">15-min resolution</span>
              </div>
              <Badge variant="outline" className="text-xs">
                Open-Meteo API
              </Badge>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
