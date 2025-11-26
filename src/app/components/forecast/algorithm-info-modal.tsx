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
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-800/50">
          <div>
            <h2 className="text-lg font-bold text-white">
              Understanding {speciesData.displayName} Scoring
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Algorithm Version: {speciesData.algorithmVersion}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'text-pink-400 border-b-2 border-pink-400 bg-slate-800/30'
                  : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/20'
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
        <div className="px-6 py-3 border-t border-slate-700 bg-slate-800/30">
          <div className="flex items-center gap-2 text-xs text-slate-500">
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
        <h3 className="text-sm font-semibold text-white mb-2">How We Calculate Your Fishing Score</h3>
        <p className="text-sm text-slate-300 leading-relaxed">
          {speciesData.overview}
        </p>
      </div>

      {/* Weight Distribution Chart */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Factor Weights</h3>
        <div className="space-y-2">
          {speciesData.weightDistribution.map((item) => (
            <div key={item.factor} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">{item.factor}</span>
                <span className="text-slate-400">{item.weight}%</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${item.weight * 5}%` }}
                />
              </div>
              <p className="text-xs text-slate-500">{item.rationale}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Best/Worst Conditions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-green-900/20 border border-green-700/30 rounded-lg">
          <h4 className="text-xs font-semibold text-green-400 mb-2">Best Conditions</h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            {speciesData.bestConditions}
          </p>
        </div>
        <div className="p-4 bg-red-900/20 border border-red-700/30 rounded-lg">
          <h4 className="text-xs font-semibold text-red-400 mb-2">Challenging Conditions</h4>
          <p className="text-xs text-slate-300 leading-relaxed">
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
      <p className="text-xs text-slate-400 mb-4">
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
    <div className="border border-slate-700 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
      >
        <span className="text-sm font-medium text-white">
          {formatFactorName(factorKey)}
        </span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 py-4 bg-slate-800/30 border-t border-slate-700 space-y-4">
          {/* Why It Matters */}
          <div>
            <h5 className="text-xs font-semibold text-pink-400 mb-1">Why This Matters</h5>
            <p className="text-xs text-slate-300 leading-relaxed">
              {factor.whyItMatters}
            </p>
          </div>

          {/* How Calculated */}
          <div>
            <h5 className="text-xs font-semibold text-blue-400 mb-1">How It&apos;s Calculated</h5>
            <p className="text-xs text-slate-300 leading-relaxed">
              {factor.howCalculated}
            </p>
          </div>

          {/* Scoring Ranges */}
          <div>
            <h5 className="text-xs font-semibold text-slate-400 mb-2">Scoring Ranges</h5>
            <div className="grid grid-cols-2 gap-2">
              {factor.scoringRanges.map((range, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded border ${
                    range.color === 'emerald' ? 'bg-green-900/20 border-green-700/30' :
                    range.color === 'blue' ? 'bg-blue-900/20 border-blue-700/30' :
                    range.color === 'yellow' ? 'bg-yellow-900/20 border-yellow-700/30' :
                    'bg-red-900/20 border-red-700/30'
                  }`}
                >
                  <div className={`text-xs font-bold ${
                    range.color === 'emerald' ? 'text-green-400' :
                    range.color === 'blue' ? 'text-blue-400' :
                    range.color === 'yellow' ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {range.range}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{range.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations by Score */}
          <div>
            <h5 className="text-xs font-semibold text-amber-400 mb-2">Recommendations</h5>
            <div className="space-y-2 text-xs">
              <div className="p-2 bg-green-900/10 rounded border border-green-900/30">
                <span className="text-green-400 font-medium">Excellent (8-10):</span>
                <span className="text-slate-300 ml-1">{factor.recommendations.excellent}</span>
              </div>
              <div className="p-2 bg-blue-900/10 rounded border border-blue-900/30">
                <span className="text-blue-400 font-medium">Good (6-7):</span>
                <span className="text-slate-300 ml-1">{factor.recommendations.good}</span>
              </div>
              <div className="p-2 bg-yellow-900/10 rounded border border-yellow-900/30">
                <span className="text-yellow-400 font-medium">Fair (4-5):</span>
                <span className="text-slate-300 ml-1">{factor.recommendations.fair}</span>
              </div>
              <div className="p-2 bg-red-900/10 rounded border border-red-900/30">
                <span className="text-red-400 font-medium">Poor (0-3):</span>
                <span className="text-slate-300 ml-1">{factor.recommendations.poor}</span>
              </div>
            </div>
          </div>

          {/* Scientific Basis */}
          {factor.scientificBasis && (
            <div className="pt-2 border-t border-slate-700">
              <p className="text-xs text-slate-500 italic">
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
        <h3 className="text-sm font-semibold text-white mb-2">Our Methodology for {speciesData.displayName}</h3>
        <p className="text-sm text-slate-300 leading-relaxed">
          Our scoring algorithm combines real-time environmental data with established fishing science
          and local knowledge. We use a weighted multi-factor model that prioritizes the most impactful
          variables for each species.
        </p>
      </div>

      {/* Data Sources */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Data Sources</h3>
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
        <h3 className="text-sm font-semibold text-white mb-3">Research & References</h3>
        <ul className="space-y-2 text-xs text-slate-400">
          <li className="flex items-start gap-2">
            <span className="text-pink-400 mt-0.5">•</span>
            <span>Solunar Theory - John Alden Knight (1926)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-pink-400 mt-0.5">•</span>
            <span>Barometric Pressure and Fish Activity - Journal of Fish Biology</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-pink-400 mt-0.5">•</span>
            <span>Salmon Feeding Behavior Studies - DFO Science Branch</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-pink-400 mt-0.5">•</span>
            <span>Tidal Influences on Salmon Movement - Pacific Salmon Commission</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-pink-400 mt-0.5">•</span>
            <span>Local Knowledge - BC Sport Fishing Community</span>
          </li>
        </ul>
      </div>

      {/* Disclaimer */}
      <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
        <h4 className="text-xs font-semibold text-slate-300 mb-2">Important Note</h4>
        <p className="text-xs text-slate-400 leading-relaxed">
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
    <li className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-white">{title}</span>
        <span className="text-xs text-pink-400 bg-pink-400/10 px-2 py-0.5 rounded">
          {source}
        </span>
      </div>
      <p className="text-xs text-slate-400">{description}</p>
    </li>
  )
}
