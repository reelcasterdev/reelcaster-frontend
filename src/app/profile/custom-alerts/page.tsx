'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Plus, ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

  const handleUpdateProfile = async (profileData: Partial<AlertProfile> & { id?: string }) => {
    if (!session?.access_token || !profileData.id) return

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
    <div className="min-h-screen bg-slate-900 text-white">
      <Sidebar />

      <main className="ml-64 min-h-screen overflow-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/profile')}
                className="text-slate-400 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent flex items-center gap-3">
                  <Bell className="h-7 w-7 text-blue-500" />
                  Custom Alerts
                </h1>
                <p className="text-slate-400 mt-1">
                  Get notified when your perfect fishing conditions are detected
                </p>
              </div>
            </div>

            {!showForm && !editingProfile && (
              <Button
                onClick={() => setShowForm(true)}
                disabled={profiles.length >= 10}
                className="gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              >
                <Plus className="h-4 w-4" />
                New Alert
              </Button>
            )}
          </div>

          {/* Error message */}
          {error && (
            <Card className="border-red-500 bg-red-500/10">
              <CardContent className="py-4">
                <p className="text-red-400 text-sm">{error}</p>
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
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center text-slate-400">
                  <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mb-4" />
                  <p>Loading alerts...</p>
                </div>
              </CardContent>
            </Card>
          ) : profiles.length === 0 ? (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mb-4">
                    <Bell className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">No Custom Alerts Yet</h3>
                  <p className="text-slate-400 mb-6 max-w-md">
                    Create custom alerts to get notified when specific fishing conditions
                    are detected at your favorite spots.
                  </p>
                  <Button onClick={() => setShowForm(true)} className="gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
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
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-base">How Custom Alerts Work</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-400 space-y-2">
              <p>
                <strong className="text-slate-300">Triggers:</strong> Set conditions for wind, tide, pressure, water temperature,
                solunar periods, and fishing score.
              </p>
              <p>
                <strong className="text-slate-300">Logic Mode:</strong> Choose AND (all conditions must match) or OR (any condition can match).
              </p>
              <p>
                <strong className="text-slate-300">Cooldown:</strong> Prevents duplicate alerts. Set 1-168 hours between notifications.
              </p>
              <p>
                <strong className="text-slate-300">Active Hours:</strong> Only check conditions during specific times of day.
              </p>
              <p>
                <strong className="text-slate-300">Evaluation:</strong> Conditions are checked every 30 minutes.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
