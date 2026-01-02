'use client'

import { useState } from 'react'
import { X, Info, ChevronDown, ChevronUp, FlaskConical, BookOpen, BarChart3 } from 'lucide-react'
import { getSpeciesExplanations, SpeciesExplanationData, FactorExplanation } from '../../utils/speciesExplanations'

interface AlgorithmInfoModalProps {
  isOpen: boolean
  onClose: () => void
  species?: string | null
}

type TabType = 'overview' | 'factors' | 'science'

export default function AlgorithmInfoModal({
  isOpen,
  onClose,
  species
}: AlgorithmInfoModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [expandedFactor, setExpandedFactor] = useState<string | null>(null)

  // Get species data
  const speciesName = species || 'chinook'
  const speciesData = getSpeciesExplanations(speciesName)

  if (!isOpen) return null

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
    { key: 'factors', label: 'Factors', icon: <FlaskConical className="w-4 h-4" /> },
    { key: 'science', label: 'Science', icon: <BookOpen className="w-4 h-4" /> },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-rc-bg-darkest border border-rc-bg-light rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-rc-bg-light bg-rc-bg-dark">
          <div>
            <h2 className="text-lg font-bold text-rc-text">
              Understanding {speciesData.displayName} Scoring
            </h2>
            <p className="text-xs text-rc-text-muted mt-0.5">
              Algorithm Version: {speciesData.algorithmVersion}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-rc-bg-light rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-rc-text-muted" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-rc-bg-light">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'text-rc-text border-b-2 border-rc-text-muted bg-rc-bg-dark/30'
                  : 'text-rc-text-muted hover:text-rc-text-light hover:bg-rc-bg-dark/20'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'overview' && (
            <OverviewTab speciesData={speciesData} />
          )}
          {activeTab === 'factors' && (
            <FactorsTab
              speciesData={speciesData}
              expandedFactor={expandedFactor}
              setExpandedFactor={setExpandedFactor}
            />
          )}
          {activeTab === 'science' && (
            <ScienceTab speciesData={speciesData} />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-rc-bg-light bg-rc-bg-dark/50">
          <div className="flex items-center gap-2 text-xs text-rc-text-muted">
            <Info className="w-3 h-3" />
            <span>
              Scores are calculated using real-time data and updated every 15 minutes
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Overview Tab Component
function OverviewTab({ speciesData }: { speciesData: SpeciesExplanationData }) {
  return (
    <div className="p-6 space-y-6">
      {/* Overview Text */}
      <div>
        <h3 className="text-sm font-semibold text-rc-text mb-2">How We Calculate Your Fishing Score</h3>
        <p className="text-sm text-rc-text-light leading-relaxed">
          {speciesData.overview}
        </p>
      </div>

      {/* Weight Distribution Chart */}
      <div>
        <h3 className="text-sm font-semibold text-rc-text mb-3">Factor Weights</h3>
        <div className="space-y-3">
          {speciesData.weightDistribution.map((item) => (
            <div key={item.factor} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-rc-text-light">{item.factor}</span>
                <span className="text-rc-text-muted">{item.weight}%</span>
              </div>
              <div className="h-1.5 bg-rc-bg-dark rounded-full overflow-hidden">
                <div
                  className="h-full bg-rc-text-muted rounded-full transition-all duration-500"
                  style={{ width: `${item.weight * 5}%` }}
                />
              </div>
              <p className="text-xs text-rc-text-muted">{item.rationale}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Best/Worst Conditions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-rc-bg-dark/50 border border-rc-bg-light rounded-lg">
          <h4 className="text-xs font-semibold text-rc-text-light mb-2">Best Conditions</h4>
          <p className="text-xs text-rc-text-muted leading-relaxed">
            {speciesData.bestConditions}
          </p>
        </div>
        <div className="p-4 bg-rc-bg-dark/50 border border-rc-bg-light rounded-lg">
          <h4 className="text-xs font-semibold text-rc-text-light mb-2">Challenging Conditions</h4>
          <p className="text-xs text-rc-text-muted leading-relaxed">
            {speciesData.worstConditions}
          </p>
        </div>
      </div>
    </div>
  )
}

// Factors Tab Component
function FactorsTab({
  speciesData,
  expandedFactor,
  setExpandedFactor
}: {
  speciesData: SpeciesExplanationData
  expandedFactor: string | null
  setExpandedFactor: (factor: string | null) => void
}) {
  // Get V2 factor keys (main factors)
  const v2FactorKeys = [
    'seasonality',
    'lightTime',
    'pressureTrend',
    'solunar',
    'catchReports',
    'tidalCurrent',
    'seaState',
    'waterTemp',
    'precipitation',
  ]

  // Filter to only show relevant factors
  const factors = Object.entries(speciesData.factors)
    .filter(([key]) => v2FactorKeys.includes(key))
    .map(([key, data]) => ({ key, ...data }))

  return (
    <div className="p-6 space-y-3">
      <p className="text-xs text-rc-text-muted mb-4">
        Click on any factor to see detailed explanations and scoring criteria.
      </p>

      {factors.map((factor) => (
        <FactorAccordion
          key={factor.key}
          factorKey={factor.key}
          factor={factor}
          isExpanded={expandedFactor === factor.key}
          onToggle={() =>
            setExpandedFactor(expandedFactor === factor.key ? null : factor.key)
          }
        />
      ))}
    </div>
  )
}

// Factor Accordion Component
function FactorAccordion({
  factorKey,
  factor,
  isExpanded,
  onToggle
}: {
  factorKey: string
  factor: FactorExplanation & { key: string }
  isExpanded: boolean
  onToggle: () => void
}) {
  const formatFactorName = (key: string) => {
    const nameMap: { [key: string]: string } = {
      seasonality: 'Seasonality / Run Timing',
      lightTime: 'Light / Time of Day',
      pressureTrend: 'Barometric Pressure Trend',
      solunar: 'Solunar Periods',
      catchReports: 'Catch Reports',
      tidalCurrent: 'Tidal Current',
      seaState: 'Sea State (Wind & Waves)',
      waterTemp: 'Water Temperature',
      precipitation: 'Precipitation',
    }
    return nameMap[key] || key.charAt(0).toUpperCase() + key.slice(1)
  }

  return (
    <div className="border border-rc-bg-light rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-rc-bg-dark/50 transition-colors"
      >
        <span className="text-sm font-medium text-rc-text">
          {formatFactorName(factorKey)}
        </span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-rc-text-muted" />
        ) : (
          <ChevronDown className="w-4 h-4 text-rc-text-muted" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 py-4 bg-rc-bg-dark/30 border-t border-rc-bg-light space-y-4">
          {/* Why It Matters */}
          <div>
            <h5 className="text-xs font-semibold text-rc-text-light mb-1">Why This Matters</h5>
            <p className="text-xs text-rc-text-muted leading-relaxed">
              {factor.whyItMatters}
            </p>
          </div>

          {/* How Calculated */}
          <div>
            <h5 className="text-xs font-semibold text-rc-text-light mb-1">How It&apos;s Calculated</h5>
            <p className="text-xs text-rc-text-muted leading-relaxed">
              {factor.howCalculated}
            </p>
          </div>

          {/* Scoring Ranges */}
          <div>
            <h5 className="text-xs font-semibold text-rc-text-light mb-2">Scoring Ranges</h5>
            <div className="grid grid-cols-2 gap-2">
              {factor.scoringRanges.map((range, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded border bg-rc-bg-dark/50 border-rc-bg-light"
                >
                  <div className="text-xs font-semibold text-rc-text">
                    {range.range}
                  </div>
                  <div className="text-xs text-rc-text-muted mt-0.5">{range.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations by Score */}
          <div>
            <h5 className="text-xs font-semibold text-rc-text-light mb-2">Recommendations</h5>
            <div className="space-y-2 text-xs">
              <div className="p-2 bg-rc-bg-dark/50 rounded border border-rc-bg-light">
                <span className="text-rc-text-light font-medium">Excellent (8-10):</span>
                <span className="text-rc-text-muted ml-1">{factor.recommendations.excellent}</span>
              </div>
              <div className="p-2 bg-rc-bg-dark/50 rounded border border-rc-bg-light">
                <span className="text-rc-text-light font-medium">Good (6-7):</span>
                <span className="text-rc-text-muted ml-1">{factor.recommendations.good}</span>
              </div>
              <div className="p-2 bg-rc-bg-dark/50 rounded border border-rc-bg-light">
                <span className="text-rc-text-light font-medium">Fair (4-5):</span>
                <span className="text-rc-text-muted ml-1">{factor.recommendations.fair}</span>
              </div>
              <div className="p-2 bg-rc-bg-dark/50 rounded border border-rc-bg-light">
                <span className="text-rc-text-light font-medium">Poor (0-3):</span>
                <span className="text-rc-text-muted ml-1">{factor.recommendations.poor}</span>
              </div>
            </div>
          </div>

          {/* Scientific Basis */}
          {factor.scientificBasis && (
            <div className="pt-2 border-t border-rc-bg-light">
              <p className="text-xs text-rc-text-muted italic">
                <span className="font-medium">Scientific basis:</span> {factor.scientificBasis}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Science Tab Component
function ScienceTab({ speciesData }: { speciesData: SpeciesExplanationData }) {
  return (
    <div className="p-6 space-y-6">
      {/* Methodology */}
      <div>
        <h3 className="text-sm font-semibold text-rc-text mb-2">Our Methodology for {speciesData.displayName}</h3>
        <p className="text-sm text-rc-text-light leading-relaxed">
          Our scoring algorithm combines real-time environmental data with established fishing science
          and local knowledge. We use a weighted multi-factor model that prioritizes the most impactful
          variables for each species.
        </p>
      </div>

      {/* Data Sources */}
      <div>
        <h3 className="text-sm font-semibold text-rc-text mb-3">Data Sources</h3>
        <ul className="space-y-3">
          <DataSourceItem
            title="Weather Data"
            source="Open-Meteo API"
            description="15-minute resolution forecasts including temperature, pressure, wind, precipitation, and cloud cover"
          />
          <DataSourceItem
            title="Tide Data"
            source="DFO / Dairiki"
            description="Tide predictions for BC coastal waters with high/low times and heights"
          />
          <DataSourceItem
            title="Catch Reports"
            source="FishingVictoria.com"
            description="Weekly fishing reports aggregated from local anglers and charter operators"
          />
          <DataSourceItem
            title="Astronomical Data"
            source="Calculated"
            description="Sunrise/sunset times and moon positions calculated for your location"
          />
          <DataSourceItem
            title="Fish Stock Data"
            source="DFO Pacific Region"
            description="Seasonal run timing and stock assessment data for BC salmon populations"
          />
        </ul>
      </div>

      {/* Research References */}
      <div>
        <h3 className="text-sm font-semibold text-rc-text mb-3">Research & References</h3>
        <ul className="space-y-2 text-xs text-rc-text-muted">
          <li className="flex items-start gap-2">
            <span className="text-rc-text-muted mt-0.5">•</span>
            <span>Solunar Theory - John Alden Knight (1926)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-rc-text-muted mt-0.5">•</span>
            <span>Barometric Pressure and Fish Activity - Journal of Fish Biology</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-rc-text-muted mt-0.5">•</span>
            <span>Salmon Feeding Behavior Studies - DFO Science Branch</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-rc-text-muted mt-0.5">•</span>
            <span>Tidal Influences on Salmon Movement - Pacific Salmon Commission</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-rc-text-muted mt-0.5">•</span>
            <span>Local Knowledge - BC Sport Fishing Community</span>
          </li>
        </ul>
      </div>

      {/* Disclaimer */}
      <div className="p-4 bg-rc-bg-dark rounded-lg border border-rc-bg-light">
        <h4 className="text-xs font-semibold text-rc-text-light mb-2">Important Note</h4>
        <p className="text-xs text-rc-text-muted leading-relaxed">
          Fishing scores are predictions based on environmental factors and historical patterns.
          Actual fishing success depends on many variables including angler skill, equipment,
          specific location within an area, and luck. Use our scores as one input in your
          fishing decisions, not as a guarantee of success.
        </p>
      </div>
    </div>
  )
}

// Data Source Item Component
function DataSourceItem({
  title,
  source,
  description
}: {
  title: string
  source: string
  description: string
}) {
  return (
    <li className="p-3 bg-rc-bg-dark/50 rounded-lg border border-rc-bg-light">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-rc-text">{title}</span>
        <span className="text-xs text-rc-text-muted">
          {source}
        </span>
      </div>
      <p className="text-xs text-rc-text-muted">{description}</p>
    </li>
  )
}
