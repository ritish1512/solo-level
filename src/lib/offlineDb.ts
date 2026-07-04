export interface SyncItem {
  id: string
  actionName: string
  args: any[]
  timestamp: number
  status: 'pending' | 'syncing' | 'failed'
}

let dbInstance: IDBDatabase | null = null

export function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance)
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('IndexedDB is only available in the browser'))
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open('solo-leveling-offline', 2)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('sync_queue')) {
        db.createObjectStore('sync_queue', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('cache_store')) {
        db.createObjectStore('cache_store', { keyPath: 'key' })
      }
      if (!db.objectStoreNames.contains('audio_store')) {
        db.createObjectStore('audio_store', { keyPath: 'key' })
      }
    }

    request.onsuccess = () => {
      dbInstance = request.result
      resolve(request.result)
    }

    request.onerror = () => {
      reject(request.error)
    }
  })
}

export async function getFromStore(storeName: string, key: string): Promise<any> {
  try {
    const db = await getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.get(key)
      request.onsuccess = () => resolve(request.result?.value ?? null)
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.error('IndexedDB get error:', err)
    return null
  }
}

export async function saveToStore(storeName: string, key: string, value: any): Promise<void> {
  try {
    const db = await getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.put({ key, value })
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.error('IndexedDB save error:', err)
  }
}

export async function deleteFromStore(storeName: string, key: string): Promise<void> {
  try {
    const db = await getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.delete(key)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.error('IndexedDB delete error:', err)
  }
}

export async function getQueue(): Promise<SyncItem[]> {
  try {
    const db = await getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('sync_queue', 'readonly')
      const store = transaction.objectStore('sync_queue')
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.error('IndexedDB getQueue error:', err)
    return []
  }
}

export async function addToQueue(item: SyncItem): Promise<void> {
  try {
    const db = await getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('sync_queue', 'readwrite')
      const store = transaction.objectStore('sync_queue')
      const request = store.put(item)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.error('IndexedDB addToQueue error:', err)
  }
}

export async function removeFromQueue(id: string): Promise<void> {
  try {
    const db = await getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('sync_queue', 'readwrite')
      const store = transaction.objectStore('sync_queue')
      const request = store.delete(id)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.error('IndexedDB removeFromQueue error:', err)
  }
}
