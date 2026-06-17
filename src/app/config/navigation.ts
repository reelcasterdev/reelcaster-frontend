import {
  Heart,
  Bell,
  Mail,
  Settings,
  Database,
  Anchor,
  LayoutDashboard,
  User,
  LucideIcon,
} from 'lucide-react'
import { ComponentType, SVGProps } from 'react'

/** Icon type that accepts both Lucide icons and custom SVG components */
type IconComponent = LucideIcon | ComponentType<SVGProps<SVGSVGElement>>

export interface NavItem {
  id: string
  label: string
  /** Short label for mobile (optional, defaults to label) */
  mobileLabel?: string
  href: string
  icon: IconComponent
  /** Whether the item is disabled (coming soon) */
  disabled?: boolean
}

/**
 * Main navigation items shown to all users
 */
export const MAIN_NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    id: 'my-spots',
    label: 'My Spots',
    mobileLabel: 'Spots',
    href: '/my-spots',
    icon: Heart,
  },
  {
    id: 'alerts',
    label: 'Alerts',
    mobileLabel: 'Alerts',
    href: '/alerts',
    icon: Bell,
  },
  {
    id: 'catch-log',
    label: 'Catch Log',
    mobileLabel: 'Catches',
    href: '/profile/catch-log',
    icon: Anchor,
  },
  {
    id: 'profile',
    label: 'Profile',
    href: '/profile',
    icon: User,
  },
]

/**
 * Admin-only navigation items
 */
export const ADMIN_NAV_ITEMS: NavItem[] = [
  {
    id: 'admin-email',
    label: 'Send Email',
    href: '/admin/send-email',
    icon: Mail,
  },
  {
    id: 'admin-regulations',
    label: 'Regulations',
    href: '/admin/regulations',
    icon: Settings,
  },
  {
    id: 'admin-cache',
    label: 'Cache',
    href: '/admin/cache',
    icon: Database,
  },
]

/**
 * Admin emails whitelist
 */
export const ADMIN_EMAILS: readonly string[] = ['mohammad.faisal@toptal.com']

/**
 * Check if email is an admin email
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email)
}

/**
 * Check if a route is active based on current pathname.
 * `/` and `/profile` use exact-match because more specific routes
 * (`/profile/catch-log`) live underneath and own their own nav entry.
 */
const EXACT_MATCH_ROUTES = new Set(['/', '/profile'])

export function isRouteActive(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/' || pathname === ''
  if (EXACT_MATCH_ROUTES.has(href)) return pathname === href
  return pathname.startsWith(href)
}
