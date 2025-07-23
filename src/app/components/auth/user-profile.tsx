'use client'

import { useState } from 'react'
import { User, Mail, Calendar, Crown } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/auth-context'

export function UserProfile() {
  const { user, signOut } = useAuth()
  const [loading, setLoading] = useState(false)

  if (!user) return null

  const handleSignOut = async () => {
    setLoading(true)
    try {
      await signOut()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
            <User className="h-8 w-8 text-white" />
          </div>
        </div>
        <CardTitle className="flex items-center justify-center gap-2">
          My Account
          <Badge variant="secondary" className="bg-amber-100 text-amber-800">
            <Crown className="h-3 w-3 mr-1" />
            Premium
          </Badge>
        </CardTitle>
        <CardDescription>
          Access to full 14-day forecasts and premium features
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <Mail className="h-5 w-5 text-slate-600" />
            <div>
              <p className="text-sm font-medium">Email</p>
              <p className="text-sm text-slate-600">{user.email}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <Calendar className="h-5 w-5 text-slate-600" />
            <div>
              <p className="text-sm font-medium">Member Since</p>
              <p className="text-sm text-slate-600">
                {new Date(user.created_at || '').toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
        
        <div className="pt-4 border-t">
          <Button 
            onClick={handleSignOut} 
            variant="outline" 
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Signing out...' : 'Sign Out'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}