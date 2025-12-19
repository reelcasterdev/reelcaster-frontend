'use client'

import React from 'react'
import { useAuth } from '@/contexts/auth-context'
import FishOnButton from './fish-on-button'

/**
 * Wrapper component that connects FishOnButton to the auth context
 * Renders the Fish On button only when user is authenticated
 */
const FishOnButtonWrapper: React.FC = () => {
  const { user, loading } = useAuth()

  // Don't render while loading auth state
  if (loading) {
    return null
  }

  // Render the Fish On button with user ID
  return <FishOnButton userId={user?.id || null} />
}

export default FishOnButtonWrapper
