'use client'

import { useState } from 'react'
import { LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import { AuthDialog } from './auth-dialog'
import { UserMenu } from './user-menu'

interface AuthButtonProps {
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
  showUpgradeDialog?: boolean
}

export function AuthButton({ variant = 'outline', size = 'sm', showUpgradeDialog = false }: AuthButtonProps) {
  const { user, loading } = useAuth()
  const [dialogOpen, setDialogOpen] = useState(showUpgradeDialog)

  if (loading) {
    return (
      <Button variant={variant} size={size} disabled>
        Loading...
      </Button>
    )
  }

  if (user) {
    return <UserMenu />
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setDialogOpen(true)}
        className="flex items-center gap-2 w-full"
      >
        <LogIn className="h-4 w-4" />
        <span className="hidden sm:inline">Sign In</span>
      </Button>
      <AuthDialog open={dialogOpen} onOpenChange={setDialogOpen} defaultMode="signin" />
    </>
  )
}
