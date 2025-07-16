import { ProcessedOpenMeteoData } from '../../utils/openMeteoApi'

interface DataSummaryProps {
  openMeteoData: ProcessedOpenMeteoData
  forecastsCount: number
}

export default function DataSummary({ openMeteoData, forecastsCount }: DataSummaryProps) {
  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6 mb-6">
      <h3 className="text-xl font-semibold text-white mb-4">📊 Forecast Summary</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
        <div className="bg-gray-800/50 rounded-lg p-3">
          <p className="text-gray-400">Data Points</p>
          <p className="text-white font-bold text-lg">{openMeteoData.minutely15.length}</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3">
          <p className="text-gray-400">Time Range</p>
          <p className="text-white font-bold text-lg">{Math.round((openMeteoData.minutely15.length * 15) / 60)}h</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3">
          <p className="text-gray-400">Forecast Days</p>
          <p className="text-white font-bold text-lg">{forecastsCount}</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3">
          <p className="text-gray-400">Resolution</p>
          <p className="text-white font-bold text-lg">15min</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3">
          <p className="text-gray-400">Elevation</p>
          <p className="text-white font-bold text-lg">{openMeteoData.location.elevation}m</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3">
          <p className="text-gray-400">Timezone</p>
          <p className="text-white font-bold text-lg">{openMeteoData.location.timezone.split('/')[1]}</p>
        </div>
      </div>
    </div>
  )
}
