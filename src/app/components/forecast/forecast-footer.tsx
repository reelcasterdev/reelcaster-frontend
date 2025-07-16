interface ForecastFooterProps {
  lat: number
  lon: number
}

export default function ForecastFooter({ lat, lon }: ForecastFooterProps) {
  return (
    <div className="mt-12 text-center py-8 border-t border-gray-700">
      <p className="text-gray-500 text-sm">Powered by Open-Meteo API • Free weather service • 15-minute resolution</p>
      <p className="text-gray-600 text-xs mt-1">
        Coordinates: {lat.toFixed(4)}, {lon.toFixed(4)}
      </p>
    </div>
  )
}
