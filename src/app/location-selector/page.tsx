import LocationSelector from '../components/location/location-selector'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black p-4">
      <div className="max-w-5xl mx-auto">
        <header className="text-center py-12">
          <div className="mb-6">
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-white via-gray-300 to-gray-400 bg-clip-text text-transparent mb-4">
              Fishing Forecast
            </h1>
            <div className="w-24 h-1 bg-gradient-to-r from-gray-400 to-gray-600 mx-auto rounded-full"></div>
          </div>
        </header>

        <main className="bg-gray-900/50 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-700/50 p-8 md:p-10">
          <LocationSelector />

          <div className="mt-8 pt-8 border-t border-gray-700">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-white mb-4">Data Analysis</h2>
              <p className="text-gray-400 mb-6">Explore historical fishing data and algorithm performance</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                <a
                  href="/victoria-analysis"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-lg transition-colors font-medium block"
                >
                  <div className="font-semibold mb-1">Victoria Analysis</div>
                  <div className="text-sm text-blue-200">Real vs Algorithm Comparison</div>
                </a>
                <a
                  href="/data-comparison"
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-lg transition-colors font-medium block"
                >
                  <div className="font-semibold mb-1">Live Data Comparison</div>
                  <div className="text-sm text-green-200">Compare with iNaturalist Data</div>
                </a>
              </div>
            </div>
          </div>
        </main>

        <footer className="text-center py-8">
          <p className="text-gray-500 text-sm">Powered by advanced weather and marine data • Updated every hour</p>
        </footer>
      </div>
    </div>
  )
}
