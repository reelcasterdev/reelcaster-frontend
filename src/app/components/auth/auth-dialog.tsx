'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/auth-context'
import { useAnalytics } from '@/hooks/use-analytics'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Fish, Mail, CheckCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface AuthDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultMode?: 'signin' | 'signup'
}

export function AuthDialog({ open, onOpenChange, defaultMode = 'signin' }: AuthDialogProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(defaultMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const { signIn, signUp } = useAuth()
  const { trackEvent } = useAnalytics()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)

    try {
      const { error } = mode === 'signin' ? await signIn(email, password) : await signUp(email, password)

      if (error) {
        setError(error.message)
      } else {
        if (mode === 'signup') {
          setSuccess(true)
          // Track signup event
          trackEvent('Sign Up', {
            method: 'email',
            timestamp: new Date().toISOString(),
          })
        } else {
          // Track signin event
          trackEvent('Sign In', {
            method: 'email',
            timestamp: new Date().toISOString(),
          })
          onOpenChange(false)
          setEmail('')
          setPassword('')
        }
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setError('')
    setSuccess(false)
  }

  const switchMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin')
    resetForm()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
          <div className="relative p-6">
            <DialogHeader className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Fish className="h-5 w-5 text-primary" />
                </div>
                <DialogTitle className="text-xl">
                  {mode === 'signin' ? 'Welcome Back' : 'Start Your Journey'}
                </DialogTitle>
              </div>
              <DialogDescription className="text-muted-foreground">
                {mode === 'signin'
                  ? 'Sign in to access the complete 14-day fishing forecast and historical data'
                  : 'Create your free account to unlock premium fishing insights'}
              </DialogDescription>
            </DialogHeader>

            {success ? (
              <Card className="mt-6 border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center space-y-3">
                    <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
                    <h3 className="font-semibold text-green-900 dark:text-green-100">Check Your Email!</h3>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      We&apos;ve sent a confirmation link to <span className="font-medium">{email}</span>
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400">
                      Click the link in the email to activate your account
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                {error && (
                  <Alert variant="destructive" className="border-destructive/50 text-sm">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="angler@example.com"
                      required
                      disabled={loading}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={loading}
                    minLength={6}
                  />
                  {mode === 'signup' && <p className="text-xs text-muted-foreground">Minimum 6 characters</p>}
                </div>

                <Button type="submit" className="w-full h-11 font-medium" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                      Processing...
                    </span>
                  ) : mode === 'signin' ? (
                    'Sign In'
                  ) : (
                    'Create Account'
                  )}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      {mode === 'signin' ? 'New to ReelCaster?' : 'Already have an account?'}
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={switchMode}
                  disabled={loading}
                  className="w-full h-11 font-medium"
                >
                  {mode === 'signin' ? 'Create an Account' : 'Sign In Instead'}
                </Button>
              </form>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
