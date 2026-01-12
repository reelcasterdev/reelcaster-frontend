'use client'

import { useState, Suspense } from 'react'
import IconSidebar from './icon-sidebar'
import LocationPanel from './location-panel'
import MobileTabBar from './mobile-tab-bar'
import MobileLocationSheet from './mobile-location-sheet'

interface AppShellProps {
  children: React.ReactNode
  showLocationPanel?: boolean
  rightSidebar?: React.ReactNode
}

export default function AppShell({
  children,
  showLocationPanel = true,
  rightSidebar,
}: AppShellProps) {
  const [isLocationSheetOpen, setIsLocationSheetOpen] = useState(false)
  const [isLocationPanelCollapsed, setIsLocationPanelCollapsed] = useState(false)

  const toggleLocationPanel = () => {
    setIsLocationPanelCollapsed(prev => !prev)
  }

  return (
    <div className="min-h-screen bg-rc-bg-darkest text-rc-text">
      
      <IconSidebar
        isLocationPanelCollapsed={isLocationPanelCollapsed}
        onToggleLocationPanel={toggleLocationPanel}
      />

      
      {showLocationPanel && (
        <div
          className={`hidden lg:block transition-all duration-300 ease-in-out ${
            isLocationPanelCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-[200px] opacity-100'
          }`}
        >
          <Suspense fallback={<div className="w-[200px] h-screen bg-rc-bg-darkest fixed left-[100px] top-0" />}>
            <LocationPanel />
          </Suspense>
        </div>
      )}

      {/* Main Content Area */}
      <main
        className={`min-h-screen transition-all duration-300 ${
          showLocationPanel && !isLocationPanelCollapsed
            ? 'lg:ml-[300px]' // 100px icon sidebar + 200px location panel
            : 'lg:ml-[100px]'
        } ${rightSidebar ? 'lg:mr-[340px]' : ''}`}
      >
        {/* Mobile padding for bottom tab bar */}
        <div className="pb-20 lg:pb-0">
          {children}
        </div>
      </main>

      {/* Desktop Right Sidebar */}
      {rightSidebar && (
        <aside className="hidden lg:block w-[340px] h-screen bg-rc-bg-dark/50 border-l border-rc-bg-light fixed right-0 top-0 overflow-y-auto">
          {rightSidebar}
        </aside>
      )}

      {/* Mobile Tab Bar */}
      <MobileTabBar />

      {/* Mobile Location Sheet */}
      <Suspense fallback={null}>
        <MobileLocationSheet
          isOpen={isLocationSheetOpen}
          onClose={() => setIsLocationSheetOpen(false)}
        />
      </Suspense>
    </div>
  )
}

// Export a hook for opening the location sheet from child components
export function useLocationSheet() {
  // This would typically use a context, but for now we'll use a simpler approach
  // The actual implementation will be handled by the parent component
  return {
    open: () => {
      // Dispatch custom event to open sheet
      window.dispatchEvent(new CustomEvent('openLocationSheet'))
    },
  }
}
