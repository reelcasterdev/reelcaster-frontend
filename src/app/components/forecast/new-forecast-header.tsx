interface NewForecastHeaderProps {
  location: string
  hotspot: string
}

export default function NewForecastHeader({ location, hotspot }: NewForecastHeaderProps) {
  return (
    <div className="space-y-2">
      <h1 className="text-4xl font-bold tracking-tight text-white">
        FISHING FORECAST
      </h1>
      <p className="text-xl text-slate-300">
        Today&apos;s outlook for{' '}
        <span className="text-blue-400 font-medium">
          {hotspot}, {location}
        </span>
        .
      </p>
    </div>
  )
}