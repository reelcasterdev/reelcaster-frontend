import {
  Heart,
  Fish,
  Calendar,
  Bell,
  AlertCircle,
  Mail,
  Settings,
  Database,
  User,
  History,
  Anchor,
  LucideIcon,
} from 'lucide-react'
import { ReportIcon } from '@/app/components/common/report-icon'
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
    id: 'reports',
    label: 'Reports',
    href: '/',
    icon: ReportIcon,
  },
  {
    id: 'species-calendar',
    label: 'Species Calendar',
    mobileLabel: 'Calendar',
    href: '/species-calendar',
    icon: Calendar,
  },
  {
    id: 'historical-reports',
    label: 'Historical Reports',
    mobileLabel: 'History',
    href: '/historical-reports',
    icon: History,
  },
  {
    id: 'favorite-spots',
    label: 'Favorite Spots',
    mobileLabel: 'Spots',
    href: '/favorite-spots',
    icon: Heart,
    // disabled: true,
  },
  {
    id: 'species-id',
    label: 'Species ID',
    mobileLabel: 'Species',
    href: '/species-id',
    icon: Fish,
    // disabled: true,
  },
  {
    id: '14-day-report',
    label: '14 Day Report',
    mobileLabel: '14 Day',
    href: '/14-day-report',
    icon: Calendar,
    // disabled: true,
  },
  {
    id: 'custom-alerts',
    label: 'Custom Alerts',
    mobileLabel: 'Alerts',
    href: '/profile/custom-alerts',
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
    id: 'notifications',
    label: 'Notification Center',
    mobileLabel: 'Alerts',
    href: '/notifications',
    icon: Bell,
    // disabled: true,
  },
  {
    id: 'dfo-notices',
    label: 'DFO Notices',
    mobileLabel: 'DFO',
    href: '/dfo-notices',
    icon: AlertCircle,
    // disabled: true,
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
 * Check if a route is active based on current pathname
 */
export function isRouteActive(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname.startsWith(href)
}
