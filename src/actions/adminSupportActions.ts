'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import Bug from '@/models/Bug'
import SupportTicket from '@/models/SupportTicket'
import User from '@/models/User'
import { logAdminAction } from '@/services/auditLogService'

async function checkAdminAuth() {
  const session = await getServerSession(authOptions)
  if (!session || !session.user || session.user.role !== 'admin') {
    throw new Error('Unauthorized: Admin access required')
  }
  return session
}

export interface SupportItem {
  id: string
  isBug: boolean
  userName: string
  userEmail: string
  type: 'Contact Message' | 'Bug Report' | 'Feature Request'
  title: string
  description?: string
  priority: 'Low' | 'Medium' | 'High' | 'Critical'
  status: 'Open' | 'In Progress' | 'Resolved'
  assignedName?: string
  internalNotes?: string
  attachments: string[]
  createdAt: string
}

/**
 * Gathers a combined list of bug reports and support tickets.
 */
export async function fetchAdminSupportTickets(options?: {
  type?: string
  status?: string
  priority?: string
}): Promise<SupportItem[]> {
  await checkAdminAuth()
  await dbConnect()

  const items: SupportItem[] = []

  // 1. Query support tickets (Contact Messages and Feature Requests)
  const ticketFilter: any = {}
  if (options?.status && options.status !== 'all') {
    ticketFilter.status = options.status
  }
  if (options?.priority && options.priority !== 'all') {
    ticketFilter.priority = options.priority
  }
  if (options?.type && options.type !== 'all' && options.type !== 'Bug Report') {
    ticketFilter.type = options.type
  }

  // Only query SupportTicket collection if type filter permits it
  if (!options?.type || options.type === 'all' || options.type !== 'Bug Report') {
    const rawTickets = await SupportTicket.find(ticketFilter)
      .sort({ createdAt: -1 })
      .populate('user', 'name email')
      .populate('assignedTo', 'name')
      .exec()

    rawTickets.forEach((t: any) => {
      items.push({
        id: t._id.toString(),
        isBug: false,
        userName: t.user?.name || 'Deleted User',
        userEmail: t.user?.email || 'Unknown',
        type: t.type,
        title: t.title,
        description: t.description,
        priority: t.priority,
        status: t.status,
        assignedName: t.assignedTo?.name,
        internalNotes: t.internalNotes,
        attachments: t.attachments || [],
        createdAt: t.createdAt.toISOString(),
      })
    })
  }

  // 2. Query Bug collection (Bug Reports)
  const bugFilter: any = {}
  if (options?.status && options.status !== 'all') {
    bugFilter.status = options.status
  }
  if (options?.priority && options.priority !== 'all') {
    // Map severity to priority query parameter
    bugFilter.severity = options.priority
  }

  if (!options?.type || options.type === 'all' || options.type === 'Bug Report') {
    const rawBugs = await Bug.find(bugFilter)
      .sort({ createdAt: -1 })
      .populate('user', 'name email')
      .exec()

    rawBugs.forEach((b: any) => {
      items.push({
        id: b._id.toString(),
        isBug: true,
        userName: b.user?.name || 'Deleted User',
        userEmail: b.user?.email || 'Unknown',
        type: 'Bug Report',
        title: b.title,
        description: b.description,
        priority: b.severity, // Map severity to priority
        status: b.status,
        attachments: [], // Bug schema lacks attachment field
        createdAt: b.createdAt.toISOString(),
      })
    })
  }

  // Sort consolidated items by created date desc
  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

/**
 * Updates a ticket status.
 */
export async function updateTicketStatusAction(
  ticketId: string,
  isBug: boolean,
  status: 'Open' | 'In Progress' | 'Resolved'
): Promise<{ success: boolean; error?: string }> {
  const session = await checkAdminAuth()
  await dbConnect()

  try {
    if (isBug) {
      await Bug.findByIdAndUpdate(ticketId, { status })
    } else {
      await SupportTicket.findByIdAndUpdate(ticketId, { status })
    }

    await logAdminAction(session.user.id, {
      action: 'UPDATE_TICKET_STATUS',
      target: ticketId,
      collectionName: isBug ? 'Bug' : 'SupportTicket',
      details: `Status set to ${status} for ticket ${ticketId}`,
      result: 'Success',
    })

    return { success: true }
  } catch (error: any) {
    console.error('Update status error:', error)
    return { success: false, error: error.message || 'Failed to update ticket status.' }
  }
}

/**
 * Updates a ticket priority level.
 */
export async function updateTicketPriorityAction(
  ticketId: string,
  isBug: boolean,
  priority: 'Low' | 'Medium' | 'High' | 'Critical'
): Promise<{ success: boolean; error?: string }> {
  const session = await checkAdminAuth()
  await dbConnect()

  try {
    if (isBug) {
      await Bug.findByIdAndUpdate(ticketId, { severity: priority })
    } else {
      await SupportTicket.findByIdAndUpdate(ticketId, { priority })
    }

    await logAdminAction(session.user.id, {
      action: 'UPDATE_TICKET_PRIORITY',
      target: ticketId,
      collectionName: isBug ? 'Bug' : 'SupportTicket',
      details: `Priority set to ${priority} for ticket ${ticketId}`,
      result: 'Success',
    })

    return { success: true }
  } catch (error: any) {
    console.error('Update priority error:', error)
    return { success: false, error: error.message || 'Failed to update priority.' }
  }
}

/**
 * Assigns ticket ownership to an administrator user.
 */
export async function assignTicketAction(
  ticketId: string,
  isBug: boolean,
  adminUserId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await checkAdminAuth()
  await dbConnect()

  try {
    if (isBug) {
      return { success: false, error: 'Bugs cannot currently be assigned in schema.' }
    }

    const admin = await User.findById(adminUserId)
    if (!admin) {
      return { success: false, error: 'Target admin user not found.' }
    }

    await SupportTicket.findByIdAndUpdate(ticketId, { assignedTo: adminUserId })

    await logAdminAction(session.user.id, {
      action: 'ASSIGN_SUPPORT_TICKET',
      target: ticketId,
      collectionName: 'SupportTicket',
      details: `Assigned ticket ${ticketId} to admin ${admin.name}`,
      result: 'Success',
    })

    return { success: true }
  } catch (error: any) {
    console.error('Assign ticket error:', error)
    return { success: false, error: error.message || 'Failed to assign ticket.' }
  }
}

/**
 * Modifies internal administrative notes.
 */
export async function updateTicketNotesAction(
  ticketId: string,
  isBug: boolean,
  notes: string
): Promise<{ success: boolean; error?: string }> {
  const session = await checkAdminAuth()
  await dbConnect()

  try {
    if (isBug) {
      return { success: false, error: 'Bugs do not support internal notes in schema.' }
    }

    await SupportTicket.findByIdAndUpdate(ticketId, { internalNotes: notes })

    await logAdminAction(session.user.id, {
      action: 'UPDATE_TICKET_NOTES',
      target: ticketId,
      collectionName: 'SupportTicket',
      details: `Updated internal notes on ticket ${ticketId}`,
      result: 'Success',
    })

    return { success: true }
  } catch (error: any) {
    console.error('Update notes error:', error)
    return { success: false, error: error.message || 'Failed to write internal notes.' }
  }
}
