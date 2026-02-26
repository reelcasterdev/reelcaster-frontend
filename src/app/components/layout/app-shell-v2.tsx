'use client'

import { useState, Suspense } from 'react'
import IconSidebar from './icon-sidebar'
import LocationPanel from './location-panel'
import MobileTabBar from './mobile-tab-bar'
import MobileLocationSheet from './mobile-location-sheet'

interface AppShellV2Props {
  children: React.ReactNode
  showLocationPanel?: boolean
  rightSidebar?: React.ReactNode
}

export default function AppShellV2({
  children,
  showLocationPanel = true,
  rightSidebar,
}: AppShellV2Props) {
  const [isLocationSheetOpen, setIsLocationSheetOpen] = useState(false)
  const [isLocationPanelCollapsed, setIsLocationPanelCollapsed] = useState(false)

  const toggleLocationPanel = () => {
    setIsLocationPanelCollapsed(prev => !prev)
  }

  return (
    <div className="h-screen overflow-hidden bg-rc-bg-darkest text-rc-text">
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

      {/* Main Content Area - fills remaining space, no scroll */}
      <main
        className={`h-screen transition-all duration-300 ${
          showLocationPanel && !isLocationPanelCollapsed
            ? 'lg:ml-[300px]'
            : 'lg:ml-[100px]'
        } ${rightSidebar ? 'lg:mr-[340px]' : ''}`}
      >
        {/* Mobile padding for bottom tab bar, desktop fills full height */}
        <div className="h-full pb-16 lg:pb-0 relative">
          {children}
        </div>
      </main>

      {/* Desktop Right Sidebar */}
      {rightSidebar && (
        <aside className="hidden lg:block w-[340px] h-screen bg-rc-bg-dark/50 border-l border-rc-bg-light fixed right-0 top-0 overflow-y-auto z-20">
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
