interface LoadingStateProps {
  forecastDays: number
}

export default function LoadingState({ forecastDays }: LoadingStateProps) {
  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-12">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h3 className="text-xl font-semibold text-white mb-2">Fetching Weather Data</h3>
        <p className="text-gray-300">Getting {forecastDays}-day forecast with 15-minute resolution...</p>
      </div>
    </div>
  )
}
