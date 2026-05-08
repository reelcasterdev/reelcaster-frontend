'use client';

import type { ReactNode } from 'react';
import { useAuth } from '@/contexts/auth-context';

interface Props {
  /** 'signed-in' renders children when user is authed; 'signed-out' renders for anonymous. */
  mode: 'signed-in' | 'signed-out';
  /** What to render when the predicate is NOT satisfied. */
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Client-side auth-aware conditional wrapper. Used in SSR'd marketing pages
 * to swap UI based on auth state without making the whole page client-side.
 *
 * While auth is still loading, renders nothing (avoids paywall flash on
 * navigation for already-authed users).
 */
export function AuthAwareReveal({ mode, fallback = null, children }: Props) {
  const { user, loading } = useAuth();
  if (loading) return null;
  const matches = mode === 'signed-in' ? !!user : !user;
  return <>{matches ? children : fallback}</>;
}

export default AuthAwareReveal;
