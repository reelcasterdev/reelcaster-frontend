'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bell } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import Sidebar from '@/app/components/common/sidebar';
import NotificationPreferencesForm from '@/app/components/notifications/notification-preferences-form';

export default function NotificationSettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <Sidebar />
      <div className="ml-64 min-h-screen overflow-auto">
        <div className="max-w-6xl mx-auto p-6 md:p-8">
          {/* Header */}
          <div className="mb-8">
            {/* Back button */}
            <button
              onClick={() => router.push('/profile')}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Profile
            </button>

            {/* Page title */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
                  Notification Settings
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                  Manage your fishing alert preferences and notification settings
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <NotificationPreferencesForm />
          </div>

          {/* Help Section */}
          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <h3 className="text-sm font-semibold text-blue-400 mb-2">
              How Fishing Notifications Work
            </h3>
            <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
              <li>
                <strong className="text-white">Scheduled Notifications:</strong> Receive daily or weekly emails based on
                your preferred time
              </li>
              <li>
                <strong className="text-white">Threshold Filtering:</strong> Only get notified when conditions meet your
                preferences
              </li>
              <li>
                <strong className="text-white">Species-Specific:</strong> Forecasts tailored to your favorite species
              </li>
              <li>
                <strong className="text-white">Location-Based:</strong> Forecasts for your selected area and radius
              </li>
              <li>
                <strong className="text-white">Regulation Updates:</strong> Stay informed about rule changes in your area
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
