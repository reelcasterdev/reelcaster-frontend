'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Plus, ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import Sidebar from '@/app/components/common/sidebar'
import { CustomAlertsList } from '@/app/components/alerts/custom-alerts-list'
import { CustomAlertForm } from '@/app/components/alerts/custom-alert-form'
import type { AlertProfile } from '@/lib/custom-alert-engine'

export default function CustomAlertsPage() {
  const { user, session } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profiles, setProfiles] = useState<AlertProfile[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingProfile, setEditingProfile] = useState<AlertProfile | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Redirect if not logged in
  useEffect(() => {
    if (!user && !loading) {
      router.push('/')
    }
  }, [user, loading, router])

  // Load profiles
  useEffect(() => {
    const loadProfiles = async () => {
      if (!session?.access_token) {
        setLoading(false)
        return
      }

      try {
        const response = await fetch('/api/alerts?include_history=true', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })

        if (!response.ok) {
          throw new Error('Failed to load profiles')
        }

        const data = await response.json()
        setProfiles(data.profiles || [])
      } catch (err) {
        console.error('Error loading profiles:', err)
        setError('Failed to load alert profiles')
      } finally {
        setLoading(false)
      }
    }

    if (user && session) {
      loadProfiles()
    } else if (!user) {
      setLoading(false)
    }
  }, [user, session])

  const handleCreateProfile = async (profileData: Partial<AlertProfile>) => {
    if (!session?.access_token) return

    try {
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(profileData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create profile')
      }

      const { profile } = await response.json()
      setProfiles([profile, ...profiles])
      setShowForm(false)
    } catch (err) {
      throw err
    }
  }

  const handleUpdateProfile = async (profileData: Partial<AlertProfile> & { id: string }) => {
    if (!session?.access_token) return

    try {
      const response = await fetch('/api/alerts', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(profileData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update profile')
      }

      const { profile } = await response.json()
      setProfiles(profiles.map((p) => (p.id === profile.id ? profile : p)))
      setEditingProfile(null)
    } catch (err) {
      throw err
    }
  }

  const handleDeleteProfile = async (profileId: string) => {
    if (!session?.access_token) return

    try {
      const response = await fetch(`/api/alerts?id=${profileId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to delete profile')
      }

      setProfiles(profiles.filter((p) => p.id !== profileId))
    } catch (err) {
      console.error('Error deleting profile:', err)
      setError('Failed to delete profile')
    }
  }

  const handleToggleActive = async (profileId: string, isActive: boolean) => {
    if (!session?.access_token) return

    try {
      const response = await fetch('/api/alerts', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ id: profileId, is_active: isActive }),
      })

      if (!response.ok) {
        throw new Error('Failed to update profile')
      }

      const { profile } = await response.json()
      setProfiles(profiles.map((p) => (p.id === profile.id ? profile : p)))
    } catch (err) {
      console.error('Error toggling profile:', err)
      setError('Failed to update profile')
    }
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="flex-1 md:ml-64 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/profile')}
                className="md:hidden"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Bell className="h-6 w-6 text-primary" />
                  Custom Alerts
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  Get notified when your perfect fishing conditions are detected
                </p>
              </div>
            </div>

            {!showForm && !editingProfile && (
              <Button
                onClick={() => setShowForm(true)}
                disabled={profiles.length >= 10}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                New Alert
              </Button>
            )}
          </div>

          {/* Error message */}
          {error && (
            <Card className="mb-6 border-destructive">
              <CardContent className="py-4">
                <p className="text-destructive text-sm">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Form or List */}
          {showForm || editingProfile ? (
            <CustomAlertForm
              profile={editingProfile}
              onSubmit={editingProfile ? handleUpdateProfile : handleCreateProfile}
              onCancel={() => {
                setShowForm(false)
                setEditingProfile(null)
              }}
            />
          ) : loading ? (
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center text-muted-foreground">
                  <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mb-4" />
                  <p>Loading alerts...</p>
                </div>
              </CardContent>
            </Card>
          ) : profiles.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center text-center">
                  <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Custom Alerts Yet</h3>
                  <p className="text-muted-foreground mb-6 max-w-md">
                    Create custom alerts to get notified when specific fishing conditions
                    are detected at your favorite spots.
                  </p>
                  <Button onClick={() => setShowForm(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Your First Alert
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <CustomAlertsList
              profiles={profiles}
              onEdit={(profile) => setEditingProfile(profile)}
              onDelete={handleDeleteProfile}
              onToggleActive={handleToggleActive}
            />
          )}

          {/* Info card */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">How Custom Alerts Work</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                <strong>Triggers:</strong> Set conditions for wind, tide, pressure, water temperature,
                solunar periods, and fishing score.
              </p>
              <p>
                <strong>Logic Mode:</strong> Choose AND (all conditions must match) or OR (any condition can match).
              </p>
              <p>
                <strong>Cooldown:</strong> Prevents duplicate alerts. Set 1-168 hours between notifications.
              </p>
              <p>
                <strong>Active Hours:</strong> Only check conditions during specific times of day.
              </p>
              <p>
                <strong>Evaluation:</strong> Conditions are checked every 30 minutes.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
