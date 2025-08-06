export interface ErrorStateProps {
  message: string
}

export default function ErrorState({ message }: ErrorStateProps) {
  return (
    <div className="bg-red-900/50 border border-red-700 rounded-2xl p-6 mb-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <div>
          <h3 className="text-red-300 font-semibold">Error</h3>
          <p className="text-red-300">{message}</p>
        </div>
      </div>
    </div>
  )
}
