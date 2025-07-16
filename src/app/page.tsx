import LocationSelector from './components/location/location-selector'

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
              <p className="text-gray-400 mb-4">Explore historical fishing data and algorithm performance</p>
              <a
                href="/victoria-analysis"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
              >
                Victoria Analysis: Real vs Algorithm
              </a>
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
