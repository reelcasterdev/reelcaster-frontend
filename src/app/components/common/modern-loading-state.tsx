import { useEffect, useState } from 'react'

interface ModernLoadingStateProps {
  forecastDays: number
}

const loadingSteps = [
  'Connecting to weather API',
  'Fetching tide data', 
  'Calculating fishing scores',
  'Processing location data'
]

export default function ModernLoadingState({ forecastDays }: ModernLoadingStateProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev < loadingSteps.length - 1) {
          return prev + 1
        }
        return 0 // Loop back to start
      })
    }, 2000)

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return 20
        return prev + Math.random() * 15 + 5
      })
    }, 300)

    return () => {
      clearInterval(stepInterval)
      clearInterval(progressInterval)
    }
  }, [])

  return (
    <div className="min-h-screen bg-rc-bg-darkest relative overflow-hidden">
      {/* Animated background waves */}
      <div className="absolute inset-0 opacity-5">
        <svg className="w-full h-full" viewBox="0 0 1200 800" fill="none">
          <path
            d="M0,400 C300,300 600,500 1200,400 L1200,800 L0,800 Z"
            fill="url(#wave1)"
            className="animate-pulse"
          />
          <path
            d="M0,500 C400,400 800,600 1200,500 L1200,800 L0,800 Z"
            fill="url(#wave2)"
            className="animate-pulse"
            style={{ animationDelay: '1s' }}
          />
          <defs>
            <linearGradient id="wave1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0ea5e9" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
            <linearGradient id="wave2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Floating bubbles */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute w-4 h-4 bg-blue-400/20 rounded-full animate-bounce"
          style={{
            left: `${10 + i * 15}%`,
            top: `${20 + (i % 3) * 20}%`,
            animationDelay: `${i * 0.5}s`,
            animationDuration: `${2 + i * 0.5}s`
          }}
        />
      ))}

      {/* Main loading content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-6">
        <div className="max-w-lg w-full">
          <div className="bg-rc-bg-dark backdrop-blur-2xl rounded-3xl border border-rc-bg-light p-10 shadow-2xl">

            {/* Animated fishing rod and fish */}
            <div className="flex justify-center mb-10">
              <div className="relative w-32 h-32">
                {/* Outer spinning ring */}
                <div className="absolute inset-0 border-4 border-rc-bg-light/30 border-t-blue-500 border-r-cyan-400 rounded-full animate-spin" />

                {/* Middle ring */}
                <div
                  className="absolute inset-2 border-2 border-rc-bg-light/40 border-b-blue-400 rounded-full animate-spin"
                  style={{ animationDirection: 'reverse', animationDuration: '3s' }}
                />

                {/* Inner glowing circle */}
                <div className="absolute inset-6 bg-gradient-to-br from-blue-500 via-cyan-400 to-blue-600 rounded-full animate-pulse shadow-lg shadow-blue-500/25 flex items-center justify-center">
                  {/* Fishing hook and fish icon */}
                  <svg className="w-12 h-12 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2c3.5 0 6.5 1.5 8 4l-2 1c-1-1.5-3-2.5-5-2.5V7l4 3-4 3v2.5c2 0 4-1 5-2.5l2 1c-1.5 2.5-4.5 4-8 4s-6.5-1.5-8-4l2-1c1 1.5 3 2.5 5 2.5V13l-4-3 4-3V4.5c-2 0-4 1-5 2.5l-2-1c1.5-2.5 4.5-4 8-4z"/>
                    <circle cx="12" cy="12" r="2" fill="white"/>
                  </svg>
                </div>

                {/* Floating fish */}
                <div
                  className="absolute -top-2 -right-2 text-blue-300 animate-bounce"
                  style={{ animationDelay: '0.5s' }}
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 6c2 0 4 1 5 2l-1 1c-.5-.5-2-1.5-4-1.5S8.5 8.5 8 9l-1-1c1-1 3-2 5-2z"/>
                    <path d="M7 12c0-1.5 1-3 2.5-3.5v1c-1 .5-1.5 1.5-1.5 2.5s.5 2 1.5 2.5v1c-1.5-.5-2.5-2-2.5-3.5z"/>
                    <path d="M17 12c0 1.5-1 3-2.5 3.5v-1c1-.5 1.5-1.5 1.5-2.5s-.5-2-1.5-2.5V9c1.5.5 2.5 2 2.5 3.5z"/>
                    <path d="M12 18c-2 0-4-1-5-2l1-1c.5.5 2 1.5 4 1.5s3.5-1 4-1.5l1 1c-1 1-3 2-5 2z"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* Header */}
            <div className="text-center space-y-4 mb-8">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
                FISHING FORECAST
              </h1>

              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-rc-text">
                  Preparing Your Forecast
                </h2>
                <p className="text-rc-text-muted">
                  Getting {forecastDays}-day forecast with 15-minute precision
                </p>
              </div>
            </div>

            {/* Dynamic progress steps */}
            <div className="space-y-4 mb-8">
              {loadingSteps.map((step, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500 ${
                    index < currentStep
                      ? 'bg-green-500 text-white'
                      : index === currentStep
                      ? 'bg-blue-500 text-white animate-pulse'
                      : 'bg-rc-bg-light text-rc-text-muted'
                  }`}>
                    {index < currentStep ? (
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : index === currentStep ? (
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span className="text-xs font-bold">{index + 1}</span>
                    )}
                  </div>

                  <span className={`text-sm font-medium transition-colors duration-300 ${
                    index <= currentStep ? 'text-rc-text' : 'text-rc-text-muted'
                  }`}>
                    {step}
                  </span>
                </div>
              ))}
            </div>

            {/* Animated progress bar */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-rc-text-muted">Progress</span>
                <span className="text-blue-400 font-medium">{Math.min(progress, 100).toFixed(0)}%</span>
              </div>

              <div className="w-full bg-rc-bg-light rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500 rounded-full transition-all duration-300 ease-out relative"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
                </div>
              </div>

              <p className="text-xs text-rc-text-muted text-center mt-3">
                Analyzing weather patterns and marine conditions...
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}