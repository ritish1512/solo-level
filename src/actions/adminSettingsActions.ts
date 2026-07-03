'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import SystemContent from '@/models/SystemContent'
import { logAdminAction } from '@/services/auditLogService'

async function checkAdminAuth() {
  const session = await getServerSession(authOptions)
  if (!session || !session.user || session.user.role !== 'admin') {
    throw new Error('Unauthorized: Admin access required')
  }
  return session
}

/**
 * Queries platform settings by group key.
 */
export async function fetchPlatformSettings(key: string): Promise<any> {
  await checkAdminAuth()
  await dbConnect()

  const entry = await SystemContent.findOne({ key })
  if (entry) {
    return entry.data
  }

  // Provide initial configuration skeletons if database records do not exist
  if (key === 'general_settings') {
    return {
      brandName: 'Solo Leveling',
      logoUrl: '',
      faviconUrl: '',
      maintenanceMode: false,
      registrationAllowed: true,
      defaultUserXp: 0,
      defaultUserLevel: 1,
    }
  }

  if (key === 'security_settings') {
    return {
      sessionDurationDays: 30,
      passwordMinLength: 6,
      requireSpecialChars: false,
      backupFrequencyHours: 24,
      lastBackupTime: new Date().toISOString(),
    }
  }

  return null
}

/**
 * Saves platform settings and logs the action to AuditLog.
 */
export async function savePlatformSettingsAction(
  key: string,
  data: any
): Promise<{ success: boolean; error?: string }> {
  const session = await checkAdminAuth()
  await dbConnect()

  try {
    await SystemContent.findOneAndUpdate(
      { key },
      { key, data },
      { upsert: true, new: true }
    )

    await logAdminAction(session.user.id, {
      action: 'UPDATE_SYSTEM_SETTINGS',
      target: key,
      collectionName: 'SystemContent',
      details: `Updated platform configurations for: ${key}`,
      result: 'Success',
    })

    return { success: true }
  } catch (error: any) {
    console.error('Save settings error:', error)
    return { success: false, error: error.message || 'Failed to save settings.' }
  }
}
