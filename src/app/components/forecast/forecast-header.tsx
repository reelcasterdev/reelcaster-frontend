interface ForecastHeaderProps {
  location: string
  hotspot: string
  species: string | null
  forecastDays: number
  loading: boolean
  onBack: () => void
  onForecastDaysChange: (days: number) => void
  onRefresh: () => void
}

export default function ForecastHeader({
  location,
  hotspot,
  species,
  forecastDays,
  loading,
  onBack,
  onForecastDaysChange,
  onRefresh,
}: ForecastHeaderProps) {
  return (
    <div className="mb-8">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-green-400 via-green-300 to-green-500 bg-clip-text text-transparent mb-2">
            14-Day Fishing Forecast
          </h1>
          <p className="text-gray-300 text-xl">
            {hotspot}, {location}
            {species && <span className="text-gray-400"> • Target: {species}</span>}
          </p>
          <p className="text-green-400 text-sm mt-1">Powered by Open-Meteo API • 15-minute resolution • Free service</p>
        </div>

        <div className="flex items-center gap-4">
          <select
            value={forecastDays}
            onChange={e => onForecastDaysChange(Number(e.target.value))}
            disabled={loading}
            className="bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-2"
          >
            <option value={3}>3 days</option>
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
          </select>

          <button
            onClick={onRefresh}
            disabled={loading}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              loading ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Loading...
              </div>
            ) : (
              'Refresh Forecast'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
