import { supabase } from './supabase'

export interface UserPreferences {
  favoriteLocation?: string
  favoriteHotspot?: string
  favoriteSpecies?: string
  favoriteLat?: number
  favoriteLon?: number
  notificationsEnabled?: boolean
  emailForecasts?: boolean
  notificationTime?: string // Format: "HH:MM" (24-hour format)
  timezone?: string
  // Unit preferences
  windUnit?: 'kph' | 'mph' | 'knots'
  tempUnit?: 'C' | 'F'
  precipUnit?: 'mm' | 'inches'
  heightUnit?: 'ft' | 'm'
}

const DEFAULT_PREFERENCES: UserPreferences = {
  favoriteLocation: 'Victoria, Sidney',
  favoriteHotspot: 'Waterfront',
  favoriteLat: 48.4284,
  favoriteLon: -123.3656,
  notificationsEnabled: true,
  emailForecasts: false,
  notificationTime: '06:00',
  timezone: 'America/Vancouver',
  // Default to metric units
  windUnit: 'kph',
  tempUnit: 'C',
  precipUnit: 'mm',
  heightUnit: 'm',
}

export class UserPreferencesService {
  
  static async getUserPreferences(): Promise<UserPreferences> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return DEFAULT_PREFERENCES
      }

      // Try to get preferences from user metadata
      const preferences = user.user_metadata?.preferences as UserPreferences
      
      if (preferences) {
        return { ...DEFAULT_PREFERENCES, ...preferences }
      }

      return DEFAULT_PREFERENCES
    } catch (error) {
      console.error('Error getting user preferences:', error)
      return DEFAULT_PREFERENCES
    }
  }

  static async updateUserPreferences(preferences: Partial<UserPreferences>): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      // Get current preferences
      const currentPreferences = user.user_metadata?.preferences as UserPreferences || {}
      
      // Merge with new preferences
      const updatedPreferences = { ...currentPreferences, ...preferences }

      // Update user metadata
      const { error } = await supabase.auth.updateUser({
        data: {
          preferences: updatedPreferences
        }
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      console.error('Error updating user preferences:', error)
      return { success: false, error: 'Failed to update preferences' }
    }
  }

  static async getDefaultLocation(): Promise<{
    location: string
    hotspot: string
    lat: number
    lon: number
    species?: string
  }> {
    const preferences = await this.getUserPreferences()
    
    return {
      location: preferences.favoriteLocation || DEFAULT_PREFERENCES.favoriteLocation!,
      hotspot: preferences.favoriteHotspot || DEFAULT_PREFERENCES.favoriteHotspot!,
      lat: preferences.favoriteLat || DEFAULT_PREFERENCES.favoriteLat!,
      lon: preferences.favoriteLon || DEFAULT_PREFERENCES.favoriteLon!,
      species: preferences.favoriteSpecies,
    }
  }
}