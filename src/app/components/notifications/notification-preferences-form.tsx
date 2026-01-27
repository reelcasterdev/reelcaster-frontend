'use client';

import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Mail, Smartphone, Clock, Save, Loader2, CheckCircle } from 'lucide-react';
import { UserPreferencesService, type NotificationPreferences } from '@/lib/user-preferences';
import NotificationLocationSelector from './notification-location-selector';
import SpeciesSelector from './species-selector';
import WeatherThresholdSliders from './weather-threshold-sliders';
import RegulatoryPreferences from './regulatory-preferences';

const NotificationPreferencesForm: React.FC = () => {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const prefs = await UserPreferencesService.getNotificationPreferences();
      setPreferences(prefs);
    } catch (err) {
      console.error('Failed to load preferences:', err);
      setError('Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!preferences) return;

    try {
      setSaving(true);
      setError(null);
      setSaved(false);

      const result = await UserPreferencesService.upsertNotificationPreferences(preferences);

      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000); // Clear success message after 3s
      } else {
        setError(result.error || 'Failed to save preferences');
      }
    } catch (err) {
      console.error('Error saving preferences:', err);
      setError('An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => {
    if (!preferences) return;
    setPreferences({ ...preferences, [key]: value });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
        <p className="text-red-400 text-sm">Failed to load notification preferences.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Master Toggle */}
      <div className="bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border border-blue-500/30 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {preferences.notification_enabled ? (
              <div className="p-3 bg-blue-600 rounded-full">
                <Bell className="w-6 h-6 text-white" />
              </div>
            ) : (
              <div className="p-3 bg-slate-600 rounded-full">
                <BellOff className="w-6 h-6 text-slate-300" />
              </div>
            )}
            <div>
              <h2 className="text-lg font-semibold text-white">Fishing Notifications</h2>
              <p className="text-sm text-slate-300 mt-1">
                {preferences.notification_enabled
                  ? 'Notifications are enabled'
                  : 'Turn on notifications to receive fishing alerts'}
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.notification_enabled}
              onChange={(e) => updatePreference('notification_enabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-slate-500 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {/* Settings - Only show if notifications are enabled */}
      {preferences.notification_enabled && (
        <>
          {/* Notification Types */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-white">Notification Types</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Email */}
              <label className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg cursor-pointer border-2 border-blue-500/50">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-blue-400" />
                  <div>
                    <div className="text-sm font-medium text-white">Email</div>
                    <div className="text-xs text-slate-400">Receive emails</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.email_enabled}
                  onChange={(e) => updatePreference('email_enabled', e.target.checked)}
                  className="w-5 h-5 rounded text-blue-600 bg-slate-700 border-slate-600"
                />
              </label>

              {/* Push (disabled) */}
              <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg border-2 border-slate-600/50 opacity-50 cursor-not-allowed">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-slate-500" />
                  <div>
                    <div className="text-sm font-medium text-slate-400">Push Notifications</div>
                    <div className="text-xs text-slate-500">Coming soon</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={false}
                  disabled
                  className="w-5 h-5 rounded text-slate-400"
                />
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-white">Schedule</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Frequency */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Frequency</label>
                <select
                  value={preferences.notification_frequency}
                  onChange={(e) =>
                    updatePreference(
                      'notification_frequency',
                      e.target.value as 'daily' | 'weekly'
                    )
                  }
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>

              {/* Time */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Notification Time
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="time"
                    value={preferences.notification_time}
                    onChange={(e) => updatePreference('notification_time', e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Timezone */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Timezone</label>
              <select
                value={preferences.timezone}
                onChange={(e) => updatePreference('timezone', e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="America/Vancouver">Pacific Time (Vancouver)</option>
                <option value="America/Edmonton">Mountain Time (Edmonton)</option>
                <option value="America/Winnipeg">Central Time (Winnipeg)</option>
                <option value="America/Toronto">Eastern Time (Toronto)</option>
                <option value="America/Halifax">Atlantic Time (Halifax)</option>
              </select>
            </div>
          </div>

          {/* Location Section */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-white">Notification Location</h3>
            <NotificationLocationSelector
              initialLat={preferences.location_lat || undefined}
              initialLng={preferences.location_lng || undefined}
              initialRadius={preferences.location_radius_km}
              onLocationChange={(lat, lng, radius) => {
                updatePreference('location_lat', lat);
                updatePreference('location_lng', lng);
                updatePreference('location_radius_km', radius);
              }}
            />
          </div>

          {/* Species Section */}
          <div className="space-y-4">
            <SpeciesSelector
              selectedSpecies={preferences.favorite_species}
              onChange={(species) => updatePreference('favorite_species', species)}
            />
          </div>

          {/* Weather Thresholds Section */}
          <div className="space-y-4">
            <WeatherThresholdSliders
              thresholds={{
                wind_speed_threshold_kph: preferences.wind_speed_threshold_kph,
                wave_height_threshold_m: preferences.wave_height_threshold_m,
                precipitation_threshold_mm: preferences.precipitation_threshold_mm,
                temperature_min_c: preferences.temperature_min_c,
                temperature_max_c: preferences.temperature_max_c,
                fishing_score_threshold: preferences.fishing_score_threshold,
                uv_index_threshold: preferences.uv_index_threshold,
                alert_on_thunderstorm: preferences.alert_on_thunderstorm,
                alert_on_gale_warning: preferences.alert_on_gale_warning,
                alert_on_pressure_drop: preferences.alert_on_pressure_drop,
              }}
              onChange={(thresholds) => {
                // Update all thresholds in a single state update
                setPreferences({ ...preferences, ...thresholds });
              }}
            />
          </div>

          {/* Regulatory Section */}
          <div className="space-y-4">
            <RegulatoryPreferences
              includeRegulationChanges={preferences.include_regulation_changes}
              onChange={(include) => updatePreference('include_regulation_changes', include)}
            />
          </div>
        </>
      )}

      {/* Save Button */}
      <div className="sticky bottom-0 bg-slate-800 border-t border-slate-700 pt-4 pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6">
        {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-blue-500/20 font-medium"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Saving...
            </>
          ) : saved ? (
            <>
              <CheckCircle className="w-5 h-5" />
              Saved Successfully!
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save Preferences
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default NotificationPreferencesForm;
