'use client'

import { User, LogOut, Settings, CreditCard } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/contexts/auth-context'
import { useAnalytics } from '@/hooks/use-analytics'
import { useRouter } from 'next/navigation'
import { useSubscription } from '@/hooks/use-subscription'
import { useUpgradeFlow } from '@/hooks/use-upgrade-flow'

export function UserMenu() {
  const { user, signOut } = useAuth()
  const { trackEvent } = useAnalytics()
  const router = useRouter()
  const { isPaid } = useSubscription()
  const { openPortal, loading: portalLoading } = useUpgradeFlow()

  const handleSignOut = async () => {
    trackEvent('Sign Out', {
      timestamp: new Date().toISOString(),
    })
    await signOut()
  }

  const handleManageBilling = async () => {
    trackEvent('Manage Subscription Clicked', {
      timestamp: new Date().toISOString(),
    })
    try {
      await openPortal()
    } catch (e) {
      console.error('Failed to open billing portal', e)
    }
  }

  if (!user) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-gray-300 hover:bg-gray-800 hover:text-white w-full">
          <User className="w-5 h-5" />
          <span className="font-medium">Account</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">My Account</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/profile')} className="cursor-pointer">
          <Settings className="mr-2 h-4 w-4" />
          Profile Settings
        </DropdownMenuItem>
        {isPaid && (
          <DropdownMenuItem
            onClick={handleManageBilling}
            disabled={portalLoading}
            className="cursor-pointer"
            data-testid="manage-subscription"
          >
            <CreditCard className="mr-2 h-4 w-4" />
            {portalLoading ? 'Opening…' : 'Manage subscription'}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
