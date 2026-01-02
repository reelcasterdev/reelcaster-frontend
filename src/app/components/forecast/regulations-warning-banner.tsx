'use client'

import { AlertTriangle, ExternalLink } from 'lucide-react'

interface RegulationsWarningBannerProps {
  lastVerified: string
  nextReviewDate: string
  officialUrl: string
}

export default function RegulationsWarningBanner({
  lastVerified,
  nextReviewDate,
  officialUrl,
}: RegulationsWarningBannerProps) {
  const daysSinceVerification = Math.floor(
    (new Date().getTime() - new Date(lastVerified).getTime()) / (1000 * 60 * 60 * 24)
  )

  const isOutdated = daysSinceVerification > 30
  const isApproachingReview = new Date() >= new Date(nextReviewDate)

  // Don't show banner if data is fresh
  if (!isOutdated && !isApproachingReview) {
    return null
  }

  return (
    <div
      className={`rounded-lg p-4 mb-4 border ${
        isOutdated
          ? 'bg-orange-500/10 border-orange-500/30'
          : 'bg-yellow-500/10 border-yellow-500/30'
      }`}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          className={`w-5 h-5 mt-0.5 ${
            isOutdated ? 'text-orange-400' : 'text-yellow-400'
          }`}
        />
        <div className="flex-1">
          <p
            className={`text-sm font-medium mb-1 ${
              isOutdated ? 'text-orange-300' : 'text-yellow-300'
            }`}
          >
            {isOutdated
              ? 'Regulation Data May Be Outdated'
              : 'Regulation Review Due'}
          </p>
          <p className="text-sm text-rc-text-light mb-2">
            {isOutdated
              ? `Last verified ${daysSinceVerification} days ago. `
              : 'This data is scheduled for review. '}
            Fishing regulations can change frequently. Always check the official
            DFO website for the most current information before fishing.
          </p>
          <a
            href={officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 text-sm font-medium transition-colors ${
              isOutdated
                ? 'text-orange-400 hover:text-orange-300'
                : 'text-yellow-400 hover:text-yellow-300'
            }`}
          >
            <span>View Official DFO Regulations</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  )
}
