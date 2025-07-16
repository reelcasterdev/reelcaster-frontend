export default function EmptyState() {
  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-12">
      <div className="text-center">
        <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mb-4 mx-auto">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
            />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">No Forecast Data</h3>
        <p className="text-gray-400">Click &ldquo;Refresh Forecast&rdquo; to load weather data</p>
      </div>
    </div>
  )
}
