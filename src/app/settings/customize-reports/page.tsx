'use client'

import { useState } from 'react'
import { AppShell } from '../../components/layout'
import DashboardHeader from '../../components/forecast/dashboard-header'
import { Settings, Save, RotateCcw, Eye, EyeOff, GripVertical } from 'lucide-react'

interface ReportWidget {
  id: string
  name: string
  description: string
  enabled: boolean
  order: number
}

const DEFAULT_WIDGETS: ReportWidget[] = [
  {
    id: 'day-outlook',
    name: '14-Day Outlook',
    description: 'Shows fishing scores for the next 14 days',
    enabled: true,
    order: 0,
  },
  {
    id: 'hourly-chart',
    name: 'Hourly Chart',
    description: '24-hour fishing score visualization',
    enabled: true,
    order: 1,
  },
  {
    id: 'hourly-table',
    name: 'Hourly Data Table',
    description: 'Detailed hourly breakdown of conditions',
    enabled: true,
    order: 2,
  },
  {
    id: 'weather-widget',
    name: 'Weather & Conditions',
    description: 'Current weather, wind, and temperature',
    enabled: true,
    order: 3,
  },
  {
    id: 'tide-widget',
    name: 'Tide Status',
    description: 'Tide chart and current tide information',
    enabled: true,
    order: 4,
  },
  {
    id: 'overall-score',
    name: 'Overall Score',
    description: 'Summary score for the current time',
    enabled: true,
    order: 5,
  },
  {
    id: 'map-widget',
    name: 'Map View',
    description: 'Location map preview',
    enabled: true,
    order: 6,
  },
  {
    id: 'regulations',
    name: 'Species Regulations',
    description: 'Current fishing regulations for the area',
    enabled: true,
    order: 7,
  },
  {
    id: 'fishing-reports',
    name: 'Fishing Reports',
    description: 'Recent fishing reports from the community',
    enabled: true,
    order: 8,
  },
]

export default function CustomizeReportsPage() {
  const [widgets, setWidgets] = useState<ReportWidget[]>(DEFAULT_WIDGETS)
  const [hasChanges, setHasChanges] = useState(false)

  const toggleWidget = (id: string) => {
    setWidgets(
      widgets.map(w => (w.id === id ? { ...w, enabled: !w.enabled } : w))
    )
    setHasChanges(true)
  }

  const resetToDefault = () => {
    setWidgets(DEFAULT_WIDGETS)
    setHasChanges(false)
  }

  const saveChanges = () => {
    // Save to localStorage or database
    localStorage.setItem('report-widgets', JSON.stringify(widgets))
    setHasChanges(false)
    alert('Changes saved!')
  }

  const enabledCount = widgets.filter(w => w.enabled).length

  return (
    <AppShell>
      <div className="p-4 lg:p-6">
        <DashboardHeader
          title="Customize Reports"
          showTimeframe={false}
          showSetLocation={false}
          showCustomize={false}
        />

        <div className="space-y-6">
        {/* Header Info */}
        <div className="bg-rc-bg-dark rounded-xl border border-rc-bg-light p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-rc-bg-light rounded-lg">
              <Settings className="w-5 h-5 text-rc-text-light" />
            </div>
            <div>
              <h2 className="font-semibold text-rc-text">Report Widgets</h2>
              <p className="text-sm text-rc-text-muted mt-1">
                Choose which widgets appear on your forecast dashboard. You can enable or
                disable widgets to customize your view.
              </p>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-rc-text-muted">
            {enabledCount} of {widgets.length} widgets enabled
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={resetToDefault}
              className="flex items-center gap-1.5 px-3 py-1.5 text-rc-text-muted hover:text-rc-text transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to default
            </button>
            {hasChanges && (
              <button
                onClick={saveChanges}
                className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white font-medium transition-colors"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            )}
          </div>
        </div>

        {/* Widgets List */}
        <div className="space-y-2">
          {widgets
            .sort((a, b) => a.order - b.order)
            .map(widget => (
              <div
                key={widget.id}
                className={`bg-rc-bg-dark rounded-xl border p-4 transition-colors ${
                  widget.enabled ? 'border-rc-bg-light' : 'border-rc-bg-light/50 opacity-60'
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Drag Handle (placeholder for future drag & drop) */}
                  <div className="text-rc-text-muted cursor-grab">
                    <GripVertical className="w-5 h-5" />
                  </div>

                  {/* Widget Info */}
                  <div className="flex-1">
                    <h3 className="font-medium text-rc-text">{widget.name}</h3>
                    <p className="text-sm text-rc-text-muted">{widget.description}</p>
                  </div>

                  {/* Toggle Button */}
                  <button
                    onClick={() => toggleWidget(widget.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      widget.enabled
                        ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                        : 'bg-rc-bg-light text-rc-text-muted hover:bg-rc-bg-light/80'
                    }`}
                  >
                    {widget.enabled ? (
                      <>
                        <Eye className="w-4 h-4" />
                        Visible
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-4 h-4" />
                        Hidden
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
        </div>

        {/* Preview Note */}
        <div className="bg-rc-bg-dark rounded-xl border border-rc-bg-light p-4">
          <p className="text-sm text-rc-text-muted">
            <strong className="text-rc-text-light">Tip:</strong> Changes will take effect immediately on your forecast
            dashboard after saving. You can always reset to the default configuration if
            needed.
          </p>
        </div>
        </div>
      </div>
    </AppShell>
  )
}
