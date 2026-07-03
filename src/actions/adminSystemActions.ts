'use server'

import os from 'os'
import mongoose from 'mongoose'
import { auth } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import packageJson from '../../package.json'

async function checkAdminAuth() {
  const session = await auth()
  if (!session || !session.user || session.user.role !== 'admin') {
    throw new Error('Unauthorized: Admin access required')
  }
  return session
}

export interface CollectionStat {
  name: string
  count: number
  sizeKb: number
  storageSizeKb: number
  indexesCount: number
}

export interface SystemDiagnostics {
  appVersion: string
  nodeVersion: string
  uptimeSeconds: number
  osType: string
  cpuArchitecture: string
  cpuCores: number
  totalMemoryMb: number
  freeMemoryMb: number
  db: {
    connectionState: string
    collectionsCount: number
    dataSizeMb: number
    storageSizeMb: number
    objectsCount: number
    collections: CollectionStat[]
  }
  services: {
    cloudinaryStatus: 'Connected' | 'Unconfigured'
    nodemailerStatus: 'Connected' | 'Unconfigured'
  }
}

/**
 * Retrieves low-level database statistics, collection details, and host CPU/Memory diagnostics.
 */
export async function fetchSystemDiagnostics(): Promise<SystemDiagnostics> {
  await checkAdminAuth()
  await dbConnect()

  // 1. Host OS specs
  const uptimeSeconds = os.uptime()
  const osType = os.type()
  const cpuArchitecture = os.arch()
  const cpuCores = os.cpus().length
  const totalMemoryMb = Math.round(os.totalmem() / (1024 * 1024))
  const freeMemoryMb = Math.round(os.freemem() / (1024 * 1024))

  // 2. Mongoose database statistics
  const connectionStateMap = ['Disconnected', 'Connected', 'Connecting', 'Disconnecting']
  const connectionState = connectionStateMap[mongoose.connection.readyState] || 'Unknown'

  let collectionsCount = 0
  let dataSizeMb = 0
  let storageSizeMb = 0
  let objectsCount = 0
  let collectionsList: CollectionStat[] = []

  if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
    try {
      const db = mongoose.connection.db
      const dbStats = await db.command({ dbStats: 1 })
      
      dataSizeMb = Math.round((dbStats.dataSize / (1024 * 1024)) * 100) / 100
      storageSizeMb = Math.round((dbStats.storageSize / (1024 * 1024)) * 100) / 100
      objectsCount = dbStats.objects || 0

      const collections = await db.listCollections().toArray()
      collectionsCount = collections.length

      for (const col of collections) {
        try {
          const stats = await db.command({ collStats: col.name })
          collectionsList.push({
            name: col.name,
            count: stats.count || 0,
            sizeKb: Math.round((stats.size || 0) / 1024),
            storageSizeKb: Math.round((stats.storageSize || 0) / 1024),
            indexesCount: stats.nindexes || 0,
          })
        } catch (e) {
          // Fallback if collStats fails (e.g. view vs collection)
          collectionsList.push({
            name: col.name,
            count: 0,
            sizeKb: 0,
            storageSizeKb: 0,
            indexesCount: 0,
          })
        }
      }
    } catch (dbErr) {
      console.error('Failed to retrieve dbStats details:', dbErr)
    }
  }

  // Sort collection details by document counts descending
  collectionsList.sort((a, b) => b.count - a.count)

  // 3. Service configurations
  const cloudinaryStatus = process.env.CLOUDINARY_CLOUD_NAME ? 'Connected' : 'Unconfigured'
  const nodemailerStatus = process.env.SMTP_HOST && process.env.SMTP_USER ? 'Connected' : 'Unconfigured'

  return {
    appVersion: packageJson.version || '0.1.0',
    nodeVersion: process.version,
    uptimeSeconds,
    osType,
    cpuArchitecture,
    cpuCores,
    totalMemoryMb,
    freeMemoryMb,
    db: {
      connectionState,
      collectionsCount,
      dataSizeMb,
      storageSizeMb,
      objectsCount,
      collections: collectionsList,
    },
    services: {
      cloudinaryStatus,
      nodemailerStatus,
    },
  }
}
