'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Fish, Menu, X, FileText, Calendar, Bell, Anchor, History, Settings, Mail, Database, ChevronDown, ChevronRight } from 'lucide-react'
import { AuthButton } from '../auth/auth-button'
import { supabase } from '@/lib/supabase'

// Admin emails - easy to add more admins here
const ADMIN_EMAILS = [
  'mohammad.faisal@toptal.com',
]

interface NavItem {
  id: string
  label: string
  href: string
  icon: React.ReactNode
}

export default function Sidebar() {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminExpanded, setAdminExpanded] = useState(false)

  // Check if current user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email && ADMIN_EMAILS.includes(user.email)) {
        setIsAdmin(true)
      }
    }
    checkAdmin()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user?.email && ADMIN_EMAILS.includes(session.user.email)) {
        setIsAdmin(true)
      } else {
        setIsAdmin(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const navItems: NavItem[] = [
    {
      id: 'reports',
      label: 'Reports',
      href: '/',
      icon: <FileText className="w-5 h-5" />,
    },
    {
      id: 'species-calendar',
      label: 'Species Calendar',
      href: '/species-calendar',
      icon: <Calendar className="w-5 h-5" />,
    },
    {
      id: 'historical-reports',
      label: 'Historical Reports',
      href: '/historical-reports',
      icon: <History className="w-5 h-5" />,
    },
    {
      id: 'custom-alerts',
      label: 'Custom Alerts',
      href: '/profile/custom-alerts',
      icon: <Bell className="w-5 h-5" />,
    },
    {
      id: 'catch-log',
      label: 'Catch Log',
      href: '/profile/catch-log',
      icon: <Anchor className="w-5 h-5" />,
    },
  ]

  const adminItems: NavItem[] = [
    {
      id: 'admin-email',
      label: 'Send Email',
      href: '/admin/send-email',
      icon: <Mail className="w-5 h-5" />,
    },
    {
      id: 'admin-regulations',
      label: 'Regulations',
      href: '/admin/regulations',
      icon: <Settings className="w-5 h-5" />,
    },
    {
      id: 'admin-cache',
      label: 'Cache',
      href: '/admin/cache',
      icon: <Database className="w-5 h-5" />,
    },
  ]

  const showAuth = true

  return (
    <>
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gray-800 rounded-lg text-white hover:bg-gray-700 transition-colors"
      >
        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      <div
        className={`w-64 h-screen bg-gray-950 border-r border-gray-800 flex flex-col fixed left-0 top-0 z-40 transition-transform duration-300 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-6 border-b border-gray-800">
          <Link href="/" className="flex items-center gap-3">
            <Fish className="w-8 h-8 text-blue-500" aria-hidden="true" />
            <span className="text-xl font-bold text-white">REELCASTER</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-2">
            {navItems.map(item => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    pathname === item.href
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  {item.icon}
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>

          {/* Admin Section - Only visible to admins */}
          {isAdmin && (
            <div className="mt-6 pt-4 border-t border-gray-800">
              <button
                onClick={() => setAdminExpanded(!adminExpanded)}
                className="flex items-center justify-between w-full px-4 py-2 text-sm font-semibold text-gray-400 hover:text-gray-300 transition-colors"
              >
                <span>Admin</span>
                {adminExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
              {adminExpanded && (
                <ul className="mt-2 space-y-1">
                  {adminItems.map(item => (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 text-sm ${
                          pathname === item.href
                            ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20'
                            : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                        }`}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </nav>

        {/* Auth Section */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex mb-4">{showAuth && <AuthButton variant="outline" size="sm" />}</div>
          <div className="text-center text-xs text-gray-500">
            <p>© 2025 ReelCaster</p>
            <p className="mt-1">All rights reserved</p>
          </div>
        </div>
      </div>
    </>
  )
}
