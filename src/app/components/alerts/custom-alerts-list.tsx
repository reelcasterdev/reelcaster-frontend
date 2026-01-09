'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Wind,
  Waves,
  Gauge,
  Thermometer,
  Moon,
  Fish,
  MapPin,
  Clock,
  Edit,
  Trash2,
  History,
} from 'lucide-react'
import type { AlertProfile, AlertTriggers } from '@/lib/custom-alert-engine'
import { formatDistanceToNow } from 'date-fns'

interface CustomAlertsListProps {
  profiles: AlertProfile[]
  onEdit: (profile: AlertProfile) => void
  onDelete: (profileId: string) => void
  onToggleActive: (profileId: string, isActive: boolean) => void
}

const TRIGGER_ICONS: Record<string, React.ReactNode> = {
  wind: <Wind className="h-4 w-4" />,
  tide: <Waves className="h-4 w-4" />,
  pressure: <Gauge className="h-4 w-4" />,
  water_temp: <Thermometer className="h-4 w-4" />,
  solunar: <Moon className="h-4 w-4" />,
  fishing_score: <Fish className="h-4 w-4" />,
}

const TRIGGER_LABELS: Record<string, string> = {
  wind: 'Wind',
  tide: 'Tide',
  pressure: 'Pressure',
  water_temp: 'Water Temp',
  solunar: 'Solunar',
  fishing_score: 'Score',
}

function getEnabledTriggers(triggers: AlertTriggers): string[] {
  return Object.entries(triggers)
    .filter(([, value]) => value && typeof value === 'object' && 'enabled' in value && value.enabled)
    .map(([key]) => key)
}

function formatTriggerSummary(trigger: string, triggers: AlertTriggers): string {
  const t = triggers[trigger as keyof AlertTriggers]
  if (!t || !('enabled' in t)) return ''

  switch (trigger) {
    case 'wind':
      if ('speed_min' in t && 'speed_max' in t) {
        const dir = 'direction_center' in t ? ` @ ${t.direction_center}°` : ''
        return `${t.speed_min}-${t.speed_max} mph${dir}`
      }
      return ''
    case 'tide':
      if ('phases' in t) {
        return t.phases.join(', ')
      }
      return ''
    case 'pressure':
      if ('trend' in t) {
        return t.trend
      }
      return ''
    case 'water_temp':
      if ('min' in t && 'max' in t) {
        return `${t.min}-${t.max}°C`
      }
      return ''
    case 'solunar':
      if ('phases' in t) {
        return t.phases.join(', ')
      }
      return ''
    case 'fishing_score':
      if ('min_score' in t) {
        const species = 'species' in t && t.species ? ` (${t.species})` : ''
        return `≥${t.min_score}${species}`
      }
      return ''
    default:
      return ''
  }
}

export function CustomAlertsList({
  profiles,
  onEdit,
  onDelete,
  onToggleActive,
}: CustomAlertsListProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      {profiles.map((profile) => {
        const enabledTriggers = getEnabledTriggers(profile.triggers)

        return (
          <Card
            key={profile.id}
            className={`bg-rc-bg-dark border-rc-bg-light transition-opacity ${!profile.is_active ? 'opacity-60' : ''}`}
          >
            <CardContent className="p-4">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg text-rc-text">{profile.name}</h3>
                    <Badge variant={profile.logic_mode === 'AND' ? 'default' : 'secondary'} className="bg-blue-600 text-white">
                      {profile.logic_mode}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-rc-text-muted">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {profile.location_name || `${profile.location_lat.toFixed(4)}, ${profile.location_lng.toFixed(4)}`}
                    </span>
                    {profile.active_hours && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {profile.active_hours.start} - {profile.active_hours.end}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={profile.is_active}
                    onCheckedChange={(checked) => onToggleActive(profile.id, checked)}
                  />
                </div>
              </div>

              {/* Triggers */}
              <div className="flex flex-wrap gap-2 mb-3">
                {enabledTriggers.map((trigger) => (
                  <Badge
                    key={trigger}
                    variant="outline"
                    className="flex items-center gap-1.5 py-1 px-2 border-rc-bg-light bg-rc-bg-light/50 text-rc-text-muted"
                  >
                    {TRIGGER_ICONS[trigger]}
                    <span className="font-medium">{TRIGGER_LABELS[trigger]}</span>
                    <span className="text-rc-text-muted">
                      {formatTriggerSummary(trigger, profile.triggers)}
                    </span>
                  </Badge>
                ))}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-rc-bg-light">
                <div className="text-xs text-rc-text-muted">
                  {profile.last_triggered_at ? (
                    <span className="flex items-center gap-1">
                      <History className="h-3.5 w-3.5" />
                      Last triggered {formatDistanceToNow(new Date(profile.last_triggered_at))} ago
                    </span>
                  ) : (
                    <span>Never triggered</span>
                  )}
                  <span className="mx-2">•</span>
                  <span>Cooldown: {profile.cooldown_hours}h</span>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(profile)}
                    className="h-8 px-2"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteConfirm(profile.id)}
                    className="h-8 px-2 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent className="bg-rc-bg-dark border-rc-bg-light">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-rc-text">Delete Alert Profile?</AlertDialogTitle>
            <AlertDialogDescription className="text-rc-text-muted">
              This will permanently delete this alert profile and all its history.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-rc-bg-light text-rc-text-muted hover:bg-rc-bg-light">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirm) {
                  onDelete(deleteConfirm)
                  setDeleteConfirm(null)
                }
              }}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
