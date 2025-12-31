'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
  MAIN_NAV_ITEMS,
  ADMIN_NAV_ITEMS,
  isAdminEmail,
  isRouteActive,
  type NavItem,
} from '@/app/config/navigation'

/** Blue color for active/selected state */
const ACTIVE_ICON_COLOR = 'text-[#3F8AE2]'

interface IconSidebarProps {
  isLocationPanelCollapsed?: boolean
  onToggleLocationPanel?: () => void
}

interface NavItemCardProps {
  item: NavItem
  isActive: boolean
}

function NavItemCard({ item, isActive }: NavItemCardProps) {
  const Icon = item.icon

  return (
    <li>
      <Link
        href={item.href}
        className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 ${
          isActive
            ? 'bg-rc-bg-dark text-rc-text shadow-lg shadow-black/30'
            : 'text-rc-text-muted hover:text-rc-text-light'
        }`}
        aria-current={isActive ? 'page' : undefined}
      >
        <Icon className={`w-6 h-6 mb-2 ${isActive ? ACTIVE_ICON_COLOR : ''}`} />
        <span className="text-xs font-medium text-center leading-tight">
          {item.label}
        </span>
      </Link>
    </li>
  )
}

export default function IconSidebar({
  isLocationPanelCollapsed = false,
  onToggleLocationPanel,
}: IconSidebarProps) {
  const pathname = usePathname()
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminExpanded, setAdminExpanded] = useState(false)

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (isAdminEmail(user?.email)) {
        setIsAdmin(true)
      }
    }
    checkAdmin()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAdmin(isAdminEmail(session?.user?.email))
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <div className="hidden lg:flex w-[100px] h-screen bg-rc-bg-darkest border-r border-rc-bg-light flex-col fixed left-0 top-0 z-50">
      {/* Header: Collapse button */}
      <div className="h-20 flex items-center justify-center border-b border-rc-bg-light">
        {onToggleLocationPanel && (
          <button
            onClick={onToggleLocationPanel}
            className="p-2 rounded-lg text-rc-text-muted hover:text-rc-text hover:bg-rc-bg-light transition-colors"
            title={isLocationPanelCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isLocationPanelCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isLocationPanelCollapsed ? (
              <PanelLeftOpen className="w-5 h-5" />
            ) : (
              <PanelLeftClose className="w-5 h-5" />
            )}
          </button>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto" aria-label="Main navigation">
        <ul className="space-y-2 px-2">
          {MAIN_NAV_ITEMS.map(item => (
            <NavItemCard
              key={item.id}
              item={item}
              isActive={isRouteActive(item.href, pathname)}
            />
          ))}
        </ul>
      </nav>

      {/* Admin Section */}
      {isAdmin && (
        <div className="border-t border-rc-bg-light py-2 px-2">
          <button
            onClick={() => setAdminExpanded(!adminExpanded)}
            className="w-full h-9 flex items-center justify-center rounded-lg text-rc-text-muted hover:text-rc-text-light hover:bg-rc-bg-light transition-colors"
            aria-expanded={adminExpanded}
            aria-label="Toggle admin menu"
          >
            {adminExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </button>

          {adminExpanded && (
            <ul className="mt-1 space-y-2" aria-label="Admin navigation">
              {ADMIN_NAV_ITEMS.map(item => (
                <NavItemCard
                  key={item.id}
                  item={item}
                  isActive={isRouteActive(item.href, pathname)}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
