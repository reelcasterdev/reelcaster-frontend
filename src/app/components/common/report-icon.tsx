'use client'

import { forwardRef, SVGProps } from 'react'
import { cn } from '@/lib/utils'

interface ReportIconProps extends SVGProps<SVGSVGElement> {
  size?: number
}

/**
 * Custom Report icon matching the Lucide icon interface
 * Can be used in navigation configs alongside Lucide icons
 */
export const ReportIcon = forwardRef<SVGSVGElement, ReportIconProps>(
  ({ className, size = 24, ...props }, ref) => {
    return (
      <svg
        ref={ref}
        width={size}
        height={size}
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn('lucide', className)}
        {...props}
      >
        <path
          d="M2 2V12.6667C2 13.0203 2.14048 13.3594 2.39052 13.6095C2.64057 13.8595 2.97971 14 3.33333 14H14"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M4.66663 7.33325H9.99996"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M4.66663 10.6667H12.6666"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M4.66663 4H6.66663"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
)

ReportIcon.displayName = 'ReportIcon'
