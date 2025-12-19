/**
 * Offline Catch Store
 * IndexedDB-backed storage for offline-first catch logging
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb'

// Types
export type CatchOutcome = 'bite' | 'landed'
export type RetentionStatus = 'released' | 'kept'
export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'conflict'

export interface OfflineCatch {
  id: string // UUID generated client-side
  clientId: string // Same as id for new catches, used for deduplication
  userId: string
  caughtAt: string // ISO timestamp
  locationLat: number
  locationLng: number
  locationAccuracy: number | null
  locationHeading: number | null
  locationSpeed: number | null
  locationName: string | null
  outcome: CatchOutcome
  speciesId: string | null
  speciesName: string | null
  retentionStatus: RetentionStatus | null
  lengthCm: number | null
  weightKg: number | null
  depthM: number | null
  lureId: string | null
  lureName: string | null
  notes: string | null
  photos: string[] // Base64 or blob URLs for pending, actual URLs for synced
  weatherSnapshot: Record<string, unknown> | null
  tideSnapshot: Record<string, unknown> | null
  moonPhase: number | null
  isPrivate: boolean
  syncStatus: SyncStatus
  syncedAt: string | null
  serverId: string | null // Server-assigned ID after sync
  createdAt: string
  updatedAt: string
}

export interface SyncQueueItem {
  id: string
  catchId: string
  action: 'create' | 'update' | 'delete'
  retryCount: number
  lastAttempt: string | null
  error: string | null
}

interface CatchLogDBSchema extends DBSchema {
  catches: {
    key: string
    value: OfflineCatch
    indexes: {
      'by-userId': string
      'by-syncStatus': SyncStatus
      'by-caughtAt': string
    }
  }
  syncQueue: {
    key: string
    value: SyncQueueItem
    indexes: {
      'by-catchId': string
    }
  }
}

const DB_NAME = 'reelcaster-catches'
const DB_VERSION = 1

let dbInstance: IDBPDatabase<CatchLogDBSchema> | null = null

/**
 * Get or create the database instance
 */
async function getDB(): Promise<IDBPDatabase<CatchLogDBSchema>> {
  if (dbInstance) return dbInstance

  dbInstance = await openDB<CatchLogDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Catches store
      if (!db.objectStoreNames.contains('catches')) {
        const catchStore = db.createObjectStore('catches', { keyPath: 'id' })
        catchStore.createIndex('by-userId', 'userId')
        catchStore.createIndex('by-syncStatus', 'syncStatus')
        catchStore.createIndex('by-caughtAt', 'caughtAt')
      }

      // Sync queue store
      if (!db.objectStoreNames.contains('syncQueue')) {
        const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' })
        syncStore.createIndex('by-catchId', 'catchId')
      }
    },
  })

  return dbInstance
}

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  return crypto.randomUUID()
}

/**
 * Create a new catch record
 */
export async function createCatch(
  catch_data: Omit<OfflineCatch, 'id' | 'clientId' | 'syncStatus' | 'syncedAt' | 'serverId' | 'createdAt' | 'updatedAt'>
): Promise<OfflineCatch> {
  const db = await getDB()
  const now = new Date().toISOString()
  const id = generateUUID()

  const newCatch: OfflineCatch = {
    ...catch_data,
    id,
    clientId: id,
    syncStatus: 'pending',
    syncedAt: null,
    serverId: null,
    createdAt: now,
    updatedAt: now,
  }

  await db.put('catches', newCatch)

  // Add to sync queue
  await addToSyncQueue(id, 'create')

  return newCatch
}

/**
 * Get a catch by ID
 */
export async function getCatch(id: string): Promise<OfflineCatch | undefined> {
  const db = await getDB()
  return db.get('catches', id)
}

/**
 * Get all catches for a user
 */
export async function getCatchesByUser(
  userId: string,
  options?: {
    limit?: number
    offset?: number
    syncStatus?: SyncStatus
  }
): Promise<OfflineCatch[]> {
  const db = await getDB()
  let catches = await db.getAllFromIndex('catches', 'by-userId', userId)

  // Filter by sync status if specified
  if (options?.syncStatus) {
    catches = catches.filter((c) => c.syncStatus === options.syncStatus)
  }

  // Sort by caughtAt descending (most recent first)
  catches.sort((a, b) => new Date(b.caughtAt).getTime() - new Date(a.caughtAt).getTime())

  // Apply pagination
  if (options?.offset) {
    catches = catches.slice(options.offset)
  }
  if (options?.limit) {
    catches = catches.slice(0, options.limit)
  }

  return catches
}

/**
 * Get pending catches for sync
 */
export async function getPendingCatches(): Promise<OfflineCatch[]> {
  const db = await getDB()
  return db.getAllFromIndex('catches', 'by-syncStatus', 'pending')
}

/**
 * Update a catch
 */
export async function updateCatch(
  id: string,
  updates: Partial<Omit<OfflineCatch, 'id' | 'clientId' | 'createdAt'>>
): Promise<OfflineCatch | null> {
  const db = await getDB()
  const existing = await db.get('catches', id)

  if (!existing) return null

  const updated: OfflineCatch = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  }

  // If already synced, mark as pending for re-sync
  if (existing.syncStatus === 'synced') {
    updated.syncStatus = 'pending'
    await addToSyncQueue(id, 'update')
  }

  await db.put('catches', updated)
  return updated
}

/**
 * Delete a catch
 */
export async function deleteCatch(id: string): Promise<boolean> {
  const db = await getDB()
  const existing = await db.get('catches', id)

  if (!existing) return false

  // If synced, we need to sync the deletion
  if (existing.syncStatus === 'synced') {
    await addToSyncQueue(id, 'delete')
    // Mark as pending deletion
    existing.syncStatus = 'pending'
    await db.put('catches', existing)
  } else {
    // Not synced yet, just delete locally
    await db.delete('catches', id)
    // Remove from sync queue
    const queueItems = await db.getAllFromIndex('syncQueue', 'by-catchId', id)
    for (const item of queueItems) {
      await db.delete('syncQueue', item.id)
    }
  }

  return true
}

/**
 * Mark a catch as synced
 */
export async function markCatchSynced(id: string, serverId: string): Promise<void> {
  const db = await getDB()
  const existing = await db.get('catches', id)

  if (!existing) return

  existing.syncStatus = 'synced'
  existing.syncedAt = new Date().toISOString()
  existing.serverId = serverId

  await db.put('catches', existing)

  // Remove from sync queue
  const queueItems = await db.getAllFromIndex('syncQueue', 'by-catchId', id)
  for (const item of queueItems) {
    await db.delete('syncQueue', item.id)
  }
}

/**
 * Mark a catch as having a sync conflict
 */
export async function markCatchConflict(id: string, error: string): Promise<void> {
  const db = await getDB()
  const existing = await db.get('catches', id)

  if (!existing) return

  existing.syncStatus = 'conflict'
  await db.put('catches', existing)

  // Update sync queue item with error
  const queueItems = await db.getAllFromIndex('syncQueue', 'by-catchId', id)
  for (const item of queueItems) {
    item.error = error
    await db.put('syncQueue', item)
  }
}

/**
 * Add item to sync queue
 */
async function addToSyncQueue(catchId: string, action: 'create' | 'update' | 'delete'): Promise<void> {
  const db = await getDB()

  // Check if already in queue
  const existing = await db.getAllFromIndex('syncQueue', 'by-catchId', catchId)
  if (existing.length > 0) {
    // Update existing queue item
    existing[0].action = action
    existing[0].retryCount = 0
    existing[0].lastAttempt = null
    existing[0].error = null
    await db.put('syncQueue', existing[0])
    return
  }

  const queueItem: SyncQueueItem = {
    id: generateUUID(),
    catchId,
    action,
    retryCount: 0,
    lastAttempt: null,
    error: null,
  }

  await db.put('syncQueue', queueItem)
}

/**
 * Get all items in sync queue
 */
export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await getDB()
  return db.getAll('syncQueue')
}

/**
 * Update sync queue item after attempt
 */
export async function updateSyncQueueItem(
  id: string,
  updates: Partial<Pick<SyncQueueItem, 'retryCount' | 'lastAttempt' | 'error'>>
): Promise<void> {
  const db = await getDB()
  const existing = await db.get('syncQueue', id)

  if (!existing) return

  await db.put('syncQueue', { ...existing, ...updates })
}

/**
 * Remove item from sync queue
 */
export async function removeSyncQueueItem(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('syncQueue', id)
}

/**
 * Get count of pending syncs
 */
export async function getPendingSyncCount(): Promise<number> {
  const db = await getDB()
  const queue = await db.getAll('syncQueue')
  return queue.length
}

/**
 * Clear all local data (for logout)
 */
export async function clearAllData(): Promise<void> {
  const db = await getDB()
  await db.clear('catches')
  await db.clear('syncQueue')
}

/**
 * Import catches from server (initial sync)
 */
export async function importCatches(catches: OfflineCatch[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('catches', 'readwrite')

  for (const catchItem of catches) {
    await tx.store.put({
      ...catchItem,
      syncStatus: 'synced',
    })
  }

  await tx.done
}

/**
 * Check if we're online
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

/**
 * Listen for online/offline events
 */
export function onConnectivityChange(callback: (online: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {}

  const handleOnline = () => callback(true)
  const handleOffline = () => callback(false)

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}
