interface FishSpecies {
  id: string
  name: string
  scientificName: string
  minSize: string
  dailyLimit: string
  status: 'Open' | 'Closed' | 'Non Retention'
  gear: string
  season: string
  description: string
}

interface SpeciesRegulationsProps {
  species: FishSpecies[]
}

export default function SpeciesRegulations({ species }: SpeciesRegulationsProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'Closed':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'Non Retention':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    }
  }

  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <h2 className="text-xl font-semibold text-white mb-6">Species Regulations</h2>
      
      <div className="space-y-3">
        {species.map((fish) => (
          <div key={fish.id} className="flex items-center justify-between py-2">
            <span className="text-slate-300 font-medium">{fish.name}</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(fish.status)}`}>
              {fish.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}