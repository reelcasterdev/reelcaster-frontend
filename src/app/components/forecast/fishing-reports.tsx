import { Info } from 'lucide-react'

export default function FishingReports() {
  const reports = [
    {
      id: 1,
      title: 'Early morning topwater bite has been strong for bass.',
      source: 'Local Angler',
      time: '2h ago'
    },
    {
      id: 2,
      title: 'Trolling silver spoons at 20ft is effective for trout.',
      source: 'Pro Guide Tip',
      time: '5h ago'
    },
    {
      id: 3,
      title: 'Jigging near the south bank drop-off produced good results.',
      source: 'Community Report',
      time: '1d ago'
    },
    {
      id: 4,
      title: 'New regulations for shellfish effective next month.',
      source: 'State Fisheries Dept',
      time: '2d ago'
    }
  ]

  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <h2 className="text-xl font-semibold text-white mb-6">Reports</h2>
      
      <div className="space-y-4">
        {reports.map((report) => (
          <div key={report.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors cursor-pointer">
            <div className="mt-1">
              <Info className="w-4 h-4 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium leading-relaxed">
                {report.title}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-slate-400 text-xs font-medium">{report.source}</span>
                <span className="text-slate-500 text-xs">{report.time}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}