# Algorithm Version Toggle - Integration Guide

This guide shows how to add the V1/V2 algorithm version toggle to your UI.

## Files Created

1. ✅ `src/app/components/forecast/algorithm-version-toggle.tsx` - UI component
2. ✅ `src/app/utils/speciesAlgorithms.ts` - Added `setAlgorithmVersion()` and `getAlgorithmVersion()` functions

## How to Integrate

### Option 1: Add to Main Page (Recommended)

In `src/app/page.tsx`, add the toggle above the forecast:

```typescript
'use client'

import { AlgorithmVersionToggle } from './components/forecast/algorithm-version-toggle'
import { setAlgorithmVersion } from './utils/speciesAlgorithms'
import { useState } from 'react'

export default function Page() {
  const [algorithmVersion, setAlgorithmVersionState] = useState<'v1' | 'v2'>('v2')

  const handleVersionChange = (version: 'v1' | 'v2') => {
    setAlgorithmVersion(version) // Updates the algorithm flags
    setAlgorithmVersionState(version) // Updates UI state
    // Force re-calculation by triggering forecast refresh
    // Your existing refresh logic here
  }

  return (
    <div className="min-h-screen">
      {/* Location selector */}
      <CompactLocationSelector ... />

      {/* Algorithm Version Toggle - ADD THIS */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <AlgorithmVersionToggle onVersionChange={handleVersionChange} />
      </div>

      {/* Existing forecast components */}
      <NewForecastHeader ... />
      <DayOutlook ... />
      {/* ... rest of forecast ... */}
    </div>
  )
}
```

### Option 2: Add to Forecast Header

Alternatively, integrate into `new-forecast-header.tsx`:

```typescript
import { AlgorithmVersionToggle } from './algorithm-version-toggle'
import { setAlgorithmVersion } from '@/app/utils/speciesAlgorithms'

export default function NewForecastHeader({
  location,
  hotspot,
  onVersionChange // Add prop
}: NewForecastHeaderProps) {
  return (
    <div className="space-y-4"> {/* Changed from space-y-2 */}
      <div className="flex items-center gap-3">
        <h1 className="text-4xl font-bold tracking-tight text-white">
          FISHING FORECAST
        </h1>
        {/* ... cache indicators ... */}
      </div>

      <p className="text-xl text-slate-300">
        Today's outlook for{' '}
        <span className="text-blue-400 font-medium">
          {hotspot}, {location}
        </span>
      </p>

      {/* ADD ALGORITHM VERSION TOGGLE HERE */}
      <AlgorithmVersionToggle
        onVersionChange={(version) => {
          setAlgorithmVersion(version)
          onVersionChange(version) // Trigger parent re-render
        }}
      />

      {/* ... cache timestamp ... */}
    </div>
  )
}
```

### Option 3: Add to Settings/Profile Page

For a cleaner main UI, add to user preferences:

```typescript
// In src/app/profile/page.tsx or settings page

import { AlgorithmVersionToggle } from '@/app/components/forecast/algorithm-version-toggle'
import { setAlgorithmVersion } from '@/app/utils/speciesAlgorithms'

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <h2>Forecast Settings</h2>

      <div className="space-y-4">
        <h3>Algorithm Version</h3>
        <AlgorithmVersionToggle
          onVersionChange={(version) => {
            setAlgorithmVersion(version)
            // Version is saved to localStorage automatically
          }}
        />
        <p className="text-sm text-muted-foreground">
          V2 algorithms use physics-based bio-mechanics. V1 uses traditional weather scoring.
        </p>
      </div>
    </div>
  )
}
```

## How It Works

1. **UI Component** - Renders radio buttons for V1/V2 selection
2. **localStorage** - Saves preference (`algorithm-version` key)
3. **setAlgorithmVersion()** - Updates all 10 species flags globally
4. **Auto-load** - On page load, reads saved preference from localStorage
5. **Live Switching** - Changing version triggers forecast re-calculation

## Testing

After integration, you can:
1. Toggle between V1 and V2
2. See immediate score changes
3. Compare strategy advice (V2 has detailed recommendations)
4. Verify console logs show correct version being used

## Visual Comparison

The toggle shows:
- **V1 (Legacy)**: Traditional weather-based scoring
- **V2 (Physics-Based)**: Bio-mechanics & physics models

Current selection is highlighted and persists across page reloads.

---

**Next Steps**: Choose an integration option above and add the component to your UI. Once added, you'll be able to switch versions and compare scores for testing!
