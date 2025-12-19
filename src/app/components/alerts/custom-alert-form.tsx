'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Wind,
  Waves,
  Gauge,
  Thermometer,
  Moon,
  Fish,
  MapPin,
  ChevronDown,
  Save,
  X,
  Loader2,
} from 'lucide-react'
import type { AlertProfile, AlertTriggers } from '@/lib/custom-alert-engine'

interface CustomAlertFormProps {
  profile?: AlertProfile | null
  onSubmit: (data: Partial<AlertProfile> & { id?: string }) => Promise<void>
  onCancel: () => void
}

const SPECIES_OPTIONS = [
  { id: 'chinook-salmon', name: 'Chinook Salmon' },
  { id: 'coho-salmon', name: 'Coho Salmon' },
  { id: 'pink-salmon', name: 'Pink Salmon' },
  { id: 'sockeye-salmon', name: 'Sockeye Salmon' },
  { id: 'chum-salmon', name: 'Chum Salmon' },
  { id: 'halibut', name: 'Halibut' },
  { id: 'lingcod', name: 'Lingcod' },
  { id: 'rockfish', name: 'Rockfish' },
]

const TIDE_PHASES = [
  { id: 'incoming', name: 'Incoming (Rising)' },
  { id: 'outgoing', name: 'Outgoing (Falling)' },
  { id: 'high_slack', name: 'High Slack' },
  { id: 'low_slack', name: 'Low Slack' },
]

const WIND_DIRECTIONS = [
  { value: 0, label: 'N' },
  { value: 45, label: 'NE' },
  { value: 90, label: 'E' },
  { value: 135, label: 'SE' },
  { value: 180, label: 'S' },
  { value: 225, label: 'SW' },
  { value: 270, label: 'W' },
  { value: 315, label: 'NW' },
]

const DEFAULT_TRIGGERS: AlertTriggers = {
  wind: { enabled: false, speed_min: 0, speed_max: 15 },
  tide: { enabled: false, phases: ['incoming'] },
  pressure: { enabled: false, trend: 'falling', gradient_threshold: -2.0 },
  water_temp: { enabled: false, min: 10, max: 14 },
  solunar: { enabled: false, phases: ['major'] },
  fishing_score: { enabled: false, min_score: 70 },
}

export function CustomAlertForm({ profile, onSubmit, onCancel }: CustomAlertFormProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState(profile?.name || '')
  const [locationLat, setLocationLat] = useState(profile?.location_lat || 48.4284)
  const [locationLng, setLocationLng] = useState(profile?.location_lng || -123.3656)
  const [locationName, setLocationName] = useState(profile?.location_name || 'Victoria, BC')
  const [triggers, setTriggers] = useState<AlertTriggers>(profile?.triggers || DEFAULT_TRIGGERS)
  const [logicMode, setLogicMode] = useState<'AND' | 'OR'>(profile?.logic_mode || 'AND')
  const [cooldownHours, setCooldownHours] = useState(profile?.cooldown_hours || 12)
  const [activeHoursEnabled, setActiveHoursEnabled] = useState(!!profile?.active_hours)
  const [activeHoursStart, setActiveHoursStart] = useState(profile?.active_hours?.start || '05:00')
  const [activeHoursEnd, setActiveHoursEnd] = useState(profile?.active_hours?.end || '21:00')

  // Collapsible states
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    wind: triggers.wind?.enabled || false,
    tide: triggers.tide?.enabled || false,
    pressure: triggers.pressure?.enabled || false,
    water_temp: triggers.water_temp?.enabled || false,
    solunar: triggers.solunar?.enabled || false,
    fishing_score: triggers.fishing_score?.enabled || false,
  })

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const updateTrigger = <K extends keyof AlertTriggers>(
    key: K,
    updates: Partial<NonNullable<AlertTriggers[K]>>
  ) => {
    setTriggers((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...updates },
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    try {
      const data: Partial<AlertProfile> & { id?: string } = {
        name,
        location_lat: locationLat,
        location_lng: locationLng,
        location_name: locationName,
        triggers,
        logic_mode: logicMode,
        cooldown_hours: cooldownHours,
        active_hours: activeHoursEnabled
          ? { start: activeHoursStart, end: activeHoursEnd }
          : undefined,
      }

      if (profile) {
        data.id = profile.id
      }

      await onSubmit(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">{profile ? 'Edit Alert' : 'Create New Alert'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error */}
          {error && (
            <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-white">Alert Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Sooke Basin Chinook"
                required
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="lat" className="text-white">Latitude</Label>
                <Input
                  id="lat"
                  type="number"
                  step="0.0001"
                  value={locationLat}
                  onChange={(e) => setLocationLat(parseFloat(e.target.value))}
                  required
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="lng" className="text-white">Longitude</Label>
                <Input
                  id="lng"
                  type="number"
                  step="0.0001"
                  value={locationLng}
                  onChange={(e) => setLocationLng(parseFloat(e.target.value))}
                  required
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="locationName" className="text-white">Location Name</Label>
              <Input
                id="locationName"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g., Victoria, BC"
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Triggers */}
          <div className="space-y-3">
            <Label className="text-base font-semibold text-white">Trigger Conditions</Label>

            {/* Wind Trigger */}
            <Collapsible open={openSections.wind} onOpenChange={() => toggleSection('wind')}>
              <div className="border border-slate-600 rounded-lg bg-slate-700/30">
                <div className="flex items-center justify-between w-full p-3 hover:bg-slate-700/50">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={triggers.wind?.enabled}
                      onCheckedChange={(checked) => {
                        updateTrigger('wind', { enabled: checked })
                        if (checked) setOpenSections((prev) => ({ ...prev, wind: true }))
                      }}
                    />
                    <Wind className="h-4 w-4 text-slate-400" />
                    <span className="font-medium text-white">Wind</span>
                  </div>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <ChevronDown className={`h-4 w-4 transition-transform ${openSections.wind ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent className="p-3 pt-0 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-slate-400">Min Speed (mph)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={triggers.wind?.speed_min || 0}
                        onChange={(e) => updateTrigger('wind', { speed_min: parseInt(e.target.value) })}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-400">Max Speed (mph)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={triggers.wind?.speed_max || 15}
                        onChange={(e) => updateTrigger('wind', { speed_max: parseInt(e.target.value) })}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-slate-400">Direction (optional)</Label>
                      <Select
                        value={triggers.wind?.direction_center?.toString() || '__none__'}
                        onValueChange={(v) => updateTrigger('wind', { direction_center: v === '__none__' ? undefined : parseInt(v) })}
                      >
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                          <SelectValue placeholder="Any direction" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Any direction</SelectItem>
                          {WIND_DIRECTIONS.map((d) => (
                            <SelectItem key={d.value} value={d.value.toString()}>
                              {d.label} ({d.value}°)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-400">Tolerance (±degrees)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={180}
                        value={triggers.wind?.direction_tolerance || 45}
                        onChange={(e) => updateTrigger('wind', { direction_tolerance: parseInt(e.target.value) })}
                        disabled={!triggers.wind?.direction_center}
                        className="bg-slate-700 border-slate-600 text-white disabled:opacity-50"
                      />
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* Tide Trigger */}
            <Collapsible open={openSections.tide} onOpenChange={() => toggleSection('tide')}>
              <div className="border border-slate-600 rounded-lg bg-slate-700/30">
                <div className="flex items-center justify-between w-full p-3 hover:bg-slate-700/50">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={triggers.tide?.enabled}
                      onCheckedChange={(checked) => {
                        updateTrigger('tide', { enabled: checked })
                        if (checked) setOpenSections((prev) => ({ ...prev, tide: true }))
                      }}
                    />
                    <Waves className="h-4 w-4 text-slate-400" />
                    <span className="font-medium text-white">Tide Phase</span>
                  </div>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-white">
                      <ChevronDown className={`h-4 w-4 transition-transform ${openSections.tide ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent className="p-3 pt-0 space-y-3">
                  <div className="space-y-2">
                    {TIDE_PHASES.map((phase) => (
                      <div key={phase.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`tide-${phase.id}`}
                          checked={triggers.tide?.phases?.includes(phase.id as any)}
                          onCheckedChange={(checked) => {
                            const current = triggers.tide?.phases || []
                            const updated = checked
                              ? [...current, phase.id]
                              : current.filter((p) => p !== phase.id)
                            updateTrigger('tide', { phases: updated as any })
                          }}
                        />
                        <Label htmlFor={`tide-${phase.id}`} className="text-sm text-slate-300">
                          {phase.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                  <div>
                    <Label className="text-xs text-slate-400">Min Tidal Exchange (m, optional)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min={0}
                      value={triggers.tide?.exchange_min || ''}
                      onChange={(e) => updateTrigger('tide', { exchange_min: e.target.value ? parseFloat(e.target.value) : undefined })}
                      placeholder="Any exchange"
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                    />
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* Pressure Trigger */}
            <Collapsible open={openSections.pressure} onOpenChange={() => toggleSection('pressure')}>
              <div className="border border-slate-600 rounded-lg bg-slate-700/30">
                <div className="flex items-center justify-between w-full p-3 hover:bg-slate-700/50">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={triggers.pressure?.enabled}
                      onCheckedChange={(checked) => {
                        updateTrigger('pressure', { enabled: checked })
                        if (checked) setOpenSections((prev) => ({ ...prev, pressure: true }))
                      }}
                    />
                    <Gauge className="h-4 w-4 text-slate-400" />
                    <span className="font-medium text-white">Barometric Pressure</span>
                  </div>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <ChevronDown className={`h-4 w-4 transition-transform ${openSections.pressure ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent className="p-3 pt-0 space-y-3">
                  <div>
                    <Label className="text-xs text-slate-400">Trend</Label>
                    <Select
                      value={triggers.pressure?.trend || 'falling'}
                      onValueChange={(v) => updateTrigger('pressure', { trend: v as 'rising' | 'falling' | 'steady' })}
                    >
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="falling">Falling</SelectItem>
                        <SelectItem value="rising">Rising</SelectItem>
                        <SelectItem value="steady">Steady</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-400">Gradient Threshold (mb/3h)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={triggers.pressure?.gradient_threshold || -2}
                      onChange={(e) => updateTrigger('pressure', { gradient_threshold: parseFloat(e.target.value) })}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      {triggers.pressure?.trend === 'falling' ? 'Alert when change ≤ threshold' : 'Alert when change ≥ threshold'}
                    </p>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* Water Temp Trigger */}
            <Collapsible open={openSections.water_temp} onOpenChange={() => toggleSection('water_temp')}>
              <div className="border border-slate-600 rounded-lg bg-slate-700/30">
                <div className="flex items-center justify-between w-full p-3 hover:bg-slate-700/50">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={triggers.water_temp?.enabled}
                      onCheckedChange={(checked) => {
                        updateTrigger('water_temp', { enabled: checked })
                        if (checked) setOpenSections((prev) => ({ ...prev, water_temp: true }))
                      }}
                    />
                    <Thermometer className="h-4 w-4 text-slate-400" />
                    <span className="font-medium text-white">Water Temperature</span>
                  </div>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <ChevronDown className={`h-4 w-4 transition-transform ${openSections.water_temp ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent className="p-3 pt-0 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-slate-400">Min (°C)</Label>
                      <Input
                        type="number"
                        step="0.5"
                        value={triggers.water_temp?.min || 10}
                        onChange={(e) => updateTrigger('water_temp', { min: parseFloat(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-400">Max (°C)</Label>
                      <Input
                        type="number"
                        step="0.5"
                        value={triggers.water_temp?.max || 14}
                        onChange={(e) => updateTrigger('water_temp', { max: parseFloat(e.target.value) })}
                      />
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* Solunar Trigger */}
            <Collapsible open={openSections.solunar} onOpenChange={() => toggleSection('solunar')}>
              <div className="border border-slate-600 rounded-lg bg-slate-700/30">
                <div className="flex items-center justify-between w-full p-3 hover:bg-slate-700/50">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={triggers.solunar?.enabled}
                      onCheckedChange={(checked) => {
                        updateTrigger('solunar', { enabled: checked })
                        if (checked) setOpenSections((prev) => ({ ...prev, solunar: true }))
                      }}
                    />
                    <Moon className="h-4 w-4 text-slate-400" />
                    <span className="font-medium text-white">Solunar Period</span>
                  </div>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <ChevronDown className={`h-4 w-4 transition-transform ${openSections.solunar ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent className="p-3 pt-0 space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="solunar-major"
                        checked={triggers.solunar?.phases?.includes('major')}
                        onCheckedChange={(checked) => {
                          const current = triggers.solunar?.phases || []
                          const updated = checked
                            ? [...current, 'major']
                            : current.filter((p) => p !== 'major')
                          updateTrigger('solunar', { phases: updated as any })
                        }}
                      />
                      <Label htmlFor="solunar-major" className="text-sm">
                        Major Period (~2 hrs, highest activity)
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="solunar-minor"
                        checked={triggers.solunar?.phases?.includes('minor')}
                        onCheckedChange={(checked) => {
                          const current = triggers.solunar?.phases || []
                          const updated = checked
                            ? [...current, 'minor']
                            : current.filter((p) => p !== 'minor')
                          updateTrigger('solunar', { phases: updated as any })
                        }}
                      />
                      <Label htmlFor="solunar-minor" className="text-sm">
                        Minor Period (~1 hr, moderate activity)
                      </Label>
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* Fishing Score Trigger */}
            <Collapsible open={openSections.fishing_score} onOpenChange={() => toggleSection('fishing_score')}>
              <div className="border border-slate-600 rounded-lg bg-slate-700/30">
                <div className="flex items-center justify-between w-full p-3 hover:bg-slate-700/50">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={triggers.fishing_score?.enabled}
                      onCheckedChange={(checked) => {
                        updateTrigger('fishing_score', { enabled: checked })
                        if (checked) setOpenSections((prev) => ({ ...prev, fishing_score: true }))
                      }}
                    />
                    <Fish className="h-4 w-4 text-slate-400" />
                    <span className="font-medium text-white">Fishing Score</span>
                  </div>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <ChevronDown className={`h-4 w-4 transition-transform ${openSections.fishing_score ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent className="p-3 pt-0 space-y-3">
                  <div>
                    <Label className="text-xs text-slate-400">Minimum Score: {triggers.fishing_score?.min_score || 70}/100</Label>
                    <Slider
                      value={[triggers.fishing_score?.min_score || 70]}
                      onValueChange={([v]) => updateTrigger('fishing_score', { min_score: v })}
                      min={0}
                      max={100}
                      step={5}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-400">Species (optional)</Label>
                    <Select
                      value={triggers.fishing_score?.species || '__none__'}
                      onValueChange={(v) => updateTrigger('fishing_score', { species: v === '__none__' ? undefined : v })}
                    >
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue placeholder="Any species" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Any species</SelectItem>
                        {SPECIES_OPTIONS.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          </div>

          {/* Logic Mode */}
          <div className="space-y-3">
            <Label className="text-base font-semibold text-white">Logic Mode</Label>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="logic-and"
                  name="logic"
                  value="AND"
                  checked={logicMode === 'AND'}
                  onChange={() => setLogicMode('AND')}
                  className="w-4 h-4 accent-blue-500"
                />
                <Label htmlFor="logic-and" className="text-sm font-normal text-slate-300">
                  AND - All conditions must match
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="logic-or"
                  name="logic"
                  value="OR"
                  checked={logicMode === 'OR'}
                  onChange={() => setLogicMode('OR')}
                  className="w-4 h-4 accent-blue-500"
                />
                <Label htmlFor="logic-or" className="text-sm font-normal text-slate-300">
                  OR - Any condition can match
                </Label>
              </div>
            </div>
          </div>

          {/* Cooldown */}
          <div className="space-y-3">
            <Label className="text-base font-semibold text-white">Cooldown Period</Label>
            <div>
              <Label className="text-xs text-slate-400">
                Minimum {cooldownHours} hours between notifications
              </Label>
              <Slider
                value={[cooldownHours]}
                onValueChange={([v]) => setCooldownHours(v)}
                min={1}
                max={168}
                step={1}
                className="mt-2"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>1 hour</span>
                <span>1 week</span>
              </div>
            </div>
          </div>

          {/* Active Hours */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold text-white">Active Hours</Label>
              <Switch
                checked={activeHoursEnabled}
                onCheckedChange={setActiveHoursEnabled}
              />
            </div>
            {activeHoursEnabled && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-slate-400">Start Time</Label>
                  <Input
                    type="time"
                    value={activeHoursStart}
                    onChange={(e) => setActiveHoursStart(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-400">End Time</Label>
                  <Input
                    type="time"
                    value={activeHoursEnd}
                    onChange={(e) => setActiveHoursEnd(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-700">
            <Button type="button" variant="outline" onClick={onCancel} disabled={saving} className="border-slate-600 text-slate-300 hover:bg-slate-700">
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {profile ? 'Update Alert' : 'Create Alert'}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
