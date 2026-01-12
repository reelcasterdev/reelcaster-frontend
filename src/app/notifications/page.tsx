'use client'

import { useState } from 'react'
import { AppShell } from '../components/layout'
import DashboardHeader from '../components/forecast/dashboard-header'
import { Bell, Fish, AlertTriangle, Calendar, Check, Trash2, MoreVertical, Settings } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Notification {
  id: string
  type: 'score' | 'regulation' | 'weather' | 'system'
  title: string
  message: string
  time: Date
  read: boolean
}

// Mock notifications
const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'score',
    title: 'Great fishing conditions!',
    message: 'Fishing score at Breakwater is now 8.5/10. Best time: 6:00 AM - 9:00 AM.',
    time: new Date(Date.now() - 30 * 60 * 1000), // 30 min ago
    read: false,
  },
  {
    id: '2',
    type: 'regulation',
    title: 'Regulation Change',
    message: 'Chinook salmon daily limit has been updated to 2 fish in Area 19.',
    time: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    read: false,
  },
  {
    id: '3',
    type: 'weather',
    title: 'Weather Alert',
    message: 'Wind speeds expected to reach 30 km/h this afternoon. Consider morning fishing.',
    time: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
    read: true,
  },
  {
    id: '4',
    type: 'score',
    title: 'Score improved',
    message: 'Oak Bay fishing score has improved from 5.2 to 7.1 due to changing tide.',
    time: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    read: true,
  },
  {
    id: '5',
    type: 'system',
    title: 'Weekly Summary Available',
    message: 'Your weekly fishing report is ready to view.',
    time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    read: true,
  },
]

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [activeMenu, setActiveMenu] = useState<string | null>(null)

  const unreadCount = notifications.filter(n => !n.read).length
  const filteredNotifications =
    filter === 'all' ? notifications : notifications.filter(n => !n.read)

  const getTypeIcon = (type: Notification['type']) => {
    switch (type) {
      case 'score':
        return <Fish className="w-5 h-5 text-rc-text-light" />
      case 'regulation':
        return <Calendar className="w-5 h-5 text-yellow-400" />
      case 'weather':
        return <AlertTriangle className="w-5 h-5 text-orange-400" />
      case 'system':
        return <Bell className="w-5 h-5 text-rc-text-muted" />
    }
  }

  const formatTime = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return 'Yesterday'
    return `${diffDays}d ago`
  }

  const markAsRead = (id: string) => {
    setNotifications(
      notifications.map(n => (n.id === id ? { ...n, read: true } : n))
    )
  }

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })))
  }

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id))
  }

  const clearAll = () => {
    setNotifications([])
  }

  return (
    <AppShell>
      <div className="p-4 lg:p-6">
        <DashboardHeader
          title="Notifications"
          showTimeframe={false}
          showSetLocation={false}
          showCustomize={false}
        />

        <div className="space-y-6">
        {/* Actions Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-rc-bg-light text-rc-text'
                  : 'bg-rc-bg-dark text-rc-text-muted hover:bg-rc-bg-light/50'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                filter === 'unread'
                  ? 'bg-rc-bg-light text-rc-text'
                  : 'bg-rc-bg-dark text-rc-text-muted hover:bg-rc-bg-light/50'
              }`}
            >
              Unread
              {unreadCount > 0 && (
                <span className="w-5 h-5 flex items-center justify-center bg-rc-text-muted rounded-full text-xs text-rc-bg-darkest">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-rc-text-muted hover:text-rc-text transition-colors"
              >
                <Check className="w-4 h-4" />
                Mark all read
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-rc-text-muted hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Clear all
              </button>
            )}
            <button
              onClick={() => router.push('/profile/notification-settings')}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-rc-text-muted hover:text-rc-text transition-colors"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-2">
          {filteredNotifications.map(notification => (
            <div
              key={notification.id}
              className={`bg-rc-bg-dark rounded-xl border p-4 transition-colors relative ${
                notification.read
                  ? 'border-rc-bg-light'
                  : 'border-rc-text-muted/30 bg-rc-bg-dark/80'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    notification.read ? 'bg-rc-bg-light' : 'bg-rc-bg-light'
                  }`}
                >
                  {getTypeIcon(notification.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3
                        className={`font-medium ${
                          notification.read ? 'text-rc-text-light' : 'text-rc-text'
                        }`}
                      >
                        {notification.title}
                      </h3>
                      <p className="text-sm text-rc-text-muted mt-1">{notification.message}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-rc-text-muted whitespace-nowrap">
                        {formatTime(notification.time)}
                      </span>

                      <div className="relative">
                        <button
                          onClick={() =>
                            setActiveMenu(
                              activeMenu === notification.id ? null : notification.id
                            )
                          }
                          className="p-1 hover:bg-rc-bg-light rounded transition-colors"
                        >
                          <MoreVertical className="w-4 h-4 text-rc-text-muted" />
                        </button>

                        {activeMenu === notification.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setActiveMenu(null)}
                            />
                            <div className="absolute right-0 mt-1 w-36 bg-rc-bg-darkest border border-rc-bg-light rounded-lg shadow-xl z-20 overflow-hidden">
                              {!notification.read && (
                                <button
                                  onClick={() => {
                                    markAsRead(notification.id)
                                    setActiveMenu(null)
                                  }}
                                  className="w-full text-left px-3 py-2 text-sm text-rc-text-light hover:bg-rc-bg-dark flex items-center gap-2"
                                >
                                  <Check className="w-4 h-4" />
                                  Mark read
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  deleteNotification(notification.id)
                                  setActiveMenu(null)
                                }}
                                className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-rc-bg-dark flex items-center gap-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Unread indicator */}
              {!notification.read && (
                <div className="absolute top-4 right-4 w-2 h-2 bg-green-500 rounded-full" />
              )}
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredNotifications.length === 0 && (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 text-rc-text-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium text-rc-text mb-2">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
            </h3>
            <p className="text-rc-text-muted">
              {filter === 'unread'
                ? "You're all caught up!"
                : 'Notifications about fishing conditions will appear here'}
            </p>
          </div>
        )}
        </div>
      </div>
    </AppShell>
  )
}
