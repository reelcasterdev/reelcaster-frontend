import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'BC Fishing Forecast - British Columbia Fishing Conditions',
  description:
    'Get accurate fishing forecasts for Victoria, Sidney, Tofino, Vancouver, Squamish, Sooke, and Port Renfrew. Find the best fishing spots and conditions.',
  keywords:
    'fishing forecast, BC fishing, British Columbia, Victoria, Tofino, Vancouver, Sooke, fishing conditions, fishing spots',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body>
    </html>
  )
}
