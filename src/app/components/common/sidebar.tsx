'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { MapPin, Compass, Fish, BookOpen, Calendar, Image, Settings } from 'lucide-react'
import { AuthButton } from '../auth/auth-button'
import { useAuth } from '@/contexts/auth-context'

interface NavItem {
  id: string
  label: string
  href: string
  icon: React.ReactNode
  isActive: boolean
}

export default function Sidebar() {
  const pathname = usePathname()
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const { user } = useAuth()

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      href: '/',
      icon: <MapPin className="w-5 h-5" />,
      isActive: true,
    },
    {
      id: 'my-spots',
      label: 'My Spots',
      href: '#',
      icon: <MapPin className="w-5 h-5" />,
      isActive: false,
    },
    {
      id: 'explore',
      label: 'Explore',
      href: '#',
      icon: <Compass className="w-5 h-5" />,
      isActive: false,
    },
    {
      id: 'species-id',
      label: 'Species ID',
      href: '#',
      icon: <Fish className="w-5 h-5" />,
      isActive: false,
    },
    {
      id: 'logbook',
      label: 'Logbook',
      href: '#',
      icon: <BookOpen className="w-5 h-5" />,
      isActive: false,
    },
    {
      id: 'calendar',
      label: 'Calendar',
      href: '#',
      icon: <Calendar className="w-5 h-5" />,
      isActive: false,
    },
    {
      id: 'photo-gallery',
      label: 'Photo Gallery',
      href: '#',
      icon: <Image className="w-5 h-5" />,
      isActive: false,
    },
  ]

  const isCurrentPage = pathname === '/'
  const isProfilePage = pathname === '/profile'

  return (
    <div className="w-64 h-screen bg-gray-950 border-r border-gray-800 flex flex-col fixed left-0 top-0">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <Link href="/" className="flex items-center gap-3">
          <Fish className="w-8 h-8 text-blue-500" />
          <span className="text-xl font-bold text-white">REELCASTER</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map(item => (
            <li key={item.id} className="relative">
              {item.isActive ? (
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isCurrentPage
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  {item.icon}
                  <span className="font-medium">{item.label}</span>
                </Link>
              ) : (
                <div
                  onMouseEnter={() => setHoveredItem(item.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-500 cursor-not-allowed relative"
                >
                  {item.icon}
                  <span className="font-medium">{item.label}</span>

                  {/* Coming Soon Tooltip */}
                  {hoveredItem === item.id && (
                    <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50">
                      <div className="bg-gray-800 text-white text-sm px-3 py-1.5 rounded-md shadow-lg whitespace-nowrap border border-gray-700">
                        <span className="font-medium">Coming Soon</span>
                        <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-gray-800 border-l border-t border-gray-700 rotate-45"></div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* Profile & Auth Section */}
      <div className="p-4 border-t border-gray-800">
        {user && (
          <div className="mb-4">
            <Link
              href="/profile"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isProfilePage
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span className="font-medium">Profile Settings</span>
            </Link>
          </div>
        )}

        <div className="flex justify-center mb-4">
          <AuthButton variant="outline" size="sm" />
        </div>
        <div className="text-center text-xs text-gray-500">
          <p>© 2025 ReelCaster</p>
          <p className="mt-1">All rights reserved</p>
        </div>
      </div>
    </div>
  )
}
