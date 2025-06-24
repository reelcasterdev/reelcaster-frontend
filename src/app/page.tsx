import LocationSelector from './components/LocationSelector'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black p-4">
      <div className="max-w-5xl mx-auto">
        <header className="text-center py-12">
          <div className="mb-6">
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-white via-gray-300 to-gray-400 bg-clip-text text-transparent mb-4">
              BC Fishing Forecast
            </h1>
            <div className="w-24 h-1 bg-gradient-to-r from-gray-400 to-gray-600 mx-auto rounded-full"></div>
          </div>
          <p className="text-gray-300 text-xl md:text-2xl font-light max-w-2xl mx-auto leading-relaxed">
            Discover prime fishing locations across British Columbia and get real-time forecasts
          </p>
        </header>

        <main className="bg-gray-900/50 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-700/50 p-8 md:p-10">
          <LocationSelector />
        </main>

        <footer className="text-center py-8">
          <p className="text-gray-500 text-sm">Powered by advanced weather and marine data • Updated every hour</p>
        </footer>
      </div>
    </div>
  )
}
