'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import AuditLog from '@/models/AuditLog'

async function checkAdminAuth() {
  const session = await getServerSession(authOptions)
  if (!session || !session.user || session.user.role !== 'admin') {
    throw new Error('Unauthorized: Admin access required')
  }
  return session
}

export interface AuditLogItem {
  id: string
  adminName: string
  adminEmail: string
  action: string
  target?: string
  collectionName?: string
  details?: string
  ipAddress?: string
  browser?: string
  device?: string
  result: 'Success' | 'Failure'
  timestamp: string
}

/**
 * Queries administrative audit logs with pagination and search queries.
 */
export async function fetchAdminAuditLogs(options: {
  search?: string
  action?: string
  result?: string
  page?: number
  limit?: number
}): Promise<{ logs: AuditLogItem[]; total: number; pages: number }> {
  await checkAdminAuth()
  await dbConnect()

  const page = options.page || 1
  const limit = options.limit || 15
  const skip = (page - 1) * limit

  const filter: any = {}

  // 1. Result filter
  if (options.result && options.result !== 'all') {
    filter.result = options.result
  }

  // 2. Action filter
  if (options.action && options.action !== 'all') {
    filter.action = options.action
  }

  // Query audit logs
  const rawLogs = await AuditLog.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('admin', 'name email')
    .exec()

  const total = await AuditLog.countDocuments(filter)

  // Map and filter by search string
  let logs = rawLogs.map((l: any) => ({
    id: l._id.toString(),
    adminName: l.admin?.name || 'Unknown Admin',
    adminEmail: l.admin?.email || 'Unknown',
    action: l.action,
    target: l.target,
    collectionName: l.collectionName,
    details: l.details,
    ipAddress: l.ipAddress,
    browser: l.browser,
    device: l.device,
    result: l.result,
    timestamp: l.createdAt.toISOString(),
  }))

  if (options.search) {
    const s = options.search.toLowerCase()
    logs = logs.filter(
      (l) =>
        l.adminName.toLowerCase().includes(s) ||
        l.action.toLowerCase().includes(s) ||
        (l.details && l.details.toLowerCase().includes(s)) ||
        (l.target && l.target.toLowerCase().includes(s))
    )
  }

  return {
    logs,
    total,
    pages: Math.ceil(total / limit),
  }
}

/**
 * Returns a list of unique actions recorded in the AuditLog collection (for filters dropdown).
 */
export async function fetchUniqueAuditActions(): Promise<string[]> {
  await checkAdminAuth()
  await dbConnect()

  try {
    const actions = await AuditLog.distinct('action')
    return actions || []
  } catch (err) {
    console.error('Failed to query distinct audit actions:', err)
    return []
  }
}
