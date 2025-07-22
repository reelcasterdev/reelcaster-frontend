interface LoadingStateProps {
  forecastDays: number
}

export default function LoadingState({ forecastDays }: LoadingStateProps) {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Main Loading Container */}
        <div className="bg-slate-800/90 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8 shadow-2xl">
          
          {/* Animated Logo/Icon */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              {/* Outer rotating ring */}
              <div className="w-20 h-20 border-4 border-slate-700 border-t-blue-500 border-r-blue-400 rounded-full animate-spin"></div>
              
              {/* Inner pulsing circle */}
              <div className="absolute inset-3 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-full animate-pulse flex items-center justify-center">
                {/* Fish icon */}
                <svg 
                  className="w-8 h-8 text-white" 
                  fill="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2c-1.5 0-3 .5-4 1.5C6.5 4.5 6 6 6 7.5c0 1 .5 2 1.5 2.5C8.5 10.5 10 11 12 11s3.5-.5 4.5-1c1-.5 1.5-1.5 1.5-2.5 0-1.5-.5-3-1.5-4C15.5 2.5 14 2 12 2z"/>
                  <path d="M4 12c0-2 1-4 3-5v1c-1.5.5-2.5 2-2.5 4s1 3.5 2.5 4v1c-2-1-3-3-3-5z"/>
                  <path d="M20 12c0 2-1 4-3 5v-1c1.5-.5 2.5-2 2.5-4s-1-3.5-2.5-4V7c2 1 3 3 3 5z"/>
                  <path d="M12 13c-2 0-3.5.5-4.5 1-1 .5-1.5 1.5-1.5 2.5 0 1.5.5 3 1.5 4 1 1 2.5 1.5 4 1.5s3-.5 4-1.5c1-1 1.5-2.5 1.5-4 0-1-.5-2-1.5-2.5-1-.5-2.5-1-4.5-1z"/>
                  <circle cx="10" cy="8" r="1"/>
                  <circle cx="10" cy="16" r="1"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Title and Description */}
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              FISHING FORECAST
            </h2>
            
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-white">
                Fetching Weather Data
              </h3>
              <p className="text-slate-300">
                Getting {forecastDays}-day forecast with 15-minute resolution...
              </p>
            </div>

            {/* Progress Steps */}
            <div className="mt-8 space-y-3">
              <div className="flex items-center space-x-3 text-sm">
                <div className="flex-shrink-0 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-slate-300">Connecting to weather API</span>
              </div>
              
              <div className="flex items-center space-x-3 text-sm">
                <div className="flex-shrink-0 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-slate-300">Fetching tide data</span>
              </div>
              
              <div className="flex items-center space-x-3 text-sm">
                <div className="flex-shrink-0 w-4 h-4 bg-slate-600 rounded-full"></div>
                <span className="text-slate-500">Calculating fishing scores</span>
              </div>
            </div>

            {/* Loading Bar */}
            <div className="mt-6">
              <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full animate-pulse" style={{width: '60%'}}></div>
              </div>
              <p className="text-xs text-slate-400 mt-2">This may take a few seconds...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
