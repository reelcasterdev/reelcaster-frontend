/**
 * Catch Sync Manager
 * Handles background synchronization of offline catches to Supabase
 */

import {
  getPendingCatches,
  getSyncQueue,
  markCatchSynced,
  markCatchConflict,
  updateSyncQueueItem,
  removeSyncQueueItem,
  getCatch,
  isOnline,
  onConnectivityChange,
  type OfflineCatch,
  type SyncQueueItem,
} from './offline-catch-store'
import { supabase } from './supabase'

const MAX_RETRY_COUNT = 5
const BASE_RETRY_DELAY_MS = 1000 // 1 second
const MAX_RETRY_DELAY_MS = 60000 // 1 minute

let syncInProgress = false
let syncInterval: NodeJS.Timeout | null = null

/**
 * Calculate exponential backoff delay
 */
function getRetryDelay(retryCount: number): number {
  const delay = BASE_RETRY_DELAY_MS * Math.pow(2, retryCount)
  return Math.min(delay, MAX_RETRY_DELAY_MS)
}

/**
 * Sync a single catch to the server
 */
async function syncCatch(
  catchData: OfflineCatch,
  queueItem: SyncQueueItem
): Promise<{ success: boolean; error?: string; serverId?: string }> {
  try {
    // Get current session for auth
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return { success: false, error: 'Not authenticated' }
    }

    if (queueItem.action === 'delete') {
      // Handle deletion
      if (catchData.serverId) {
        const response = await fetch(`/api/catches?id=${catchData.serverId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })

        if (!response.ok) {
          const error = await response.json()
          return { success: false, error: error.error || 'Failed to delete' }
        }
      }
      return { success: true }
    }

    if (queueItem.action === 'create') {
      // Create new catch on server
      const response = await fetch('/api/catches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          caught_at: catchData.caughtAt,
          location_lat: catchData.locationLat,
          location_lng: catchData.locationLng,
          location_accuracy_m: catchData.locationAccuracy,
          location_heading: catchData.locationHeading,
          location_speed_kph: catchData.locationSpeed,
          location_name: catchData.locationName,
          outcome: catchData.outcome,
          species_id: catchData.speciesId,
          species_name: catchData.speciesName,
          retention_status: catchData.retentionStatus,
          length_cm: catchData.lengthCm,
          weight_kg: catchData.weightKg,
          depth_m: catchData.depthM,
          lure_id: catchData.lureId,
          lure_name: catchData.lureName,
          notes: catchData.notes,
          photos: catchData.photos,
          client_id: catchData.clientId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        return { success: false, error: error.error || 'Failed to create' }
      }

      const data = await response.json()
      return { success: true, serverId: data.catch.id }
    }

    if (queueItem.action === 'update' && catchData.serverId) {
      // Update existing catch on server
      const response = await fetch('/api/catches', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          id: catchData.serverId,
          outcome: catchData.outcome,
          species_id: catchData.speciesId,
          species_name: catchData.speciesName,
          retention_status: catchData.retentionStatus,
          length_cm: catchData.lengthCm,
          weight_kg: catchData.weightKg,
          depth_m: catchData.depthM,
          lure_id: catchData.lureId,
          lure_name: catchData.lureName,
          notes: catchData.notes,
          photos: catchData.photos,
          location_name: catchData.locationName,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        return { success: false, error: error.error || 'Failed to update' }
      }

      return { success: true, serverId: catchData.serverId }
    }

    return { success: false, error: 'Unknown action' }
  } catch (error) {
    console.error('Sync error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Network error' }
  }
}

/**
 * Process the sync queue
 */
async function processSyncQueue(): Promise<void> {
  if (syncInProgress || !isOnline()) {
    return
  }

  syncInProgress = true

  try {
    const queue = await getSyncQueue()

    for (const queueItem of queue) {
      // Check if we should retry
      if (queueItem.retryCount >= MAX_RETRY_COUNT) {
        console.warn(`Max retries reached for catch ${queueItem.catchId}`)
        continue
      }

      // Check backoff delay
      if (queueItem.lastAttempt) {
        const delay = getRetryDelay(queueItem.retryCount)
        const timeSinceLastAttempt = Date.now() - new Date(queueItem.lastAttempt).getTime()
        if (timeSinceLastAttempt < delay) {
          continue // Skip this item, backoff not expired
        }
      }

      // Get the catch data
      const catchData = await getCatch(queueItem.catchId)
      if (!catchData) {
        // Catch was deleted locally, remove from queue
        await removeSyncQueueItem(queueItem.id)
        continue
      }

      // Attempt sync
      const result = await syncCatch(catchData, queueItem)

      if (result.success) {
        // Mark as synced
        if (result.serverId) {
          await markCatchSynced(queueItem.catchId, result.serverId)
        } else {
          await removeSyncQueueItem(queueItem.id)
        }
        console.log(`Synced catch ${queueItem.catchId}`)
      } else {
        // Update retry count
        await updateSyncQueueItem(queueItem.id, {
          retryCount: queueItem.retryCount + 1,
          lastAttempt: new Date().toISOString(),
          error: result.error,
        })

        // If max retries reached, mark as conflict
        if (queueItem.retryCount + 1 >= MAX_RETRY_COUNT) {
          await markCatchConflict(queueItem.catchId, result.error || 'Max retries exceeded')
        }

        console.warn(`Failed to sync catch ${queueItem.catchId}: ${result.error}`)
      }
    }
  } finally {
    syncInProgress = false
  }
}

/**
 * Start the sync manager
 * Should be called when the app initializes
 */
export function startSyncManager(): void {
  if (syncInterval) {
    return // Already running
  }

  // Process queue immediately
  processSyncQueue()

  // Set up interval (every 30 seconds)
  syncInterval = setInterval(processSyncQueue, 30000)

  // Listen for connectivity changes
  onConnectivityChange((online) => {
    if (online) {
      // Sync immediately when coming online
      processSyncQueue()
    }
  })
}

/**
 * Stop the sync manager
 */
export function stopSyncManager(): void {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
  }
}

/**
 * Manually trigger a sync
 */
export async function triggerSync(): Promise<void> {
  await processSyncQueue()
}

/**
 * Get sync status
 */
export async function getSyncStatus(): Promise<{
  pendingCount: number
  conflictCount: number
  inProgress: boolean
}> {
  const queue = await getSyncQueue()
  const pending = await getPendingCatches()

  return {
    pendingCount: queue.length,
    conflictCount: pending.filter((c) => c.syncStatus === 'conflict').length,
    inProgress: syncInProgress,
  }
}

/**
 * Retry a conflicted catch
 */
export async function retryCatch(catchId: string): Promise<void> {
  const queue = await getSyncQueue()
  const queueItem = queue.find((q) => q.catchId === catchId)

  if (queueItem) {
    await updateSyncQueueItem(queueItem.id, {
      retryCount: 0,
      lastAttempt: null,
      error: null,
    })

    // Trigger sync
    await processSyncQueue()
  }
}
