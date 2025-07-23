'use client'

import { useState } from 'react'
import { Crown, Calendar, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AuthDialog } from './auth-dialog'

interface UpgradePromptProps {
  className?: string
}

export function UpgradePrompt({ className }: UpgradePromptProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <Card className={`border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 ${className}`}>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Crown className="h-8 w-8 text-amber-600" />
          </div>
          <CardTitle className="flex items-center justify-center gap-2">
            Unlock Full Forecast
            <Badge variant="secondary" className="bg-amber-100 text-amber-800">
              Premium
            </Badge>
          </CardTitle>
          <CardDescription>
            Sign up for free to access the complete 14-day fishing forecast
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-blue-600" />
              <span className="text-sm">Complete 14-day forecast instead of 3 days</span>
            </div>
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span className="text-sm">Advanced fishing scores and analytics</span>
            </div>
            <div className="flex items-center gap-3">
              <Crown className="h-5 w-5 text-amber-600" />
              <span className="text-sm">Access to all BC fishing locations</span>
            </div>
          </div>
          
          <div className="space-y-2 pt-2">
            <Button 
              onClick={() => setDialogOpen(true)} 
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            >
              Sign Up Free
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Already have an account?{' '}
              <button 
                onClick={() => setDialogOpen(true)} 
                className="text-blue-600 hover:underline"
              >
                Sign in
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
      
      <AuthDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen}
        defaultMode="signup"
      />
    </>
  )
}