import { addToQueue, getQueue, removeFromQueue } from './offlineDb'

// Import all actions to map them for background execution
import { createTaskAction, updateTaskAction, deleteTaskAction, updateTaskStatusAction } from '@/actions/taskActions'
import { createHabitAction, toggleHabitDateAction, deleteHabitAction } from '@/actions/habitActions'
import { createTimeBlockAction, updateTimeBlockAction, deleteTimeBlockAction } from '@/actions/plannerActions'
import { createProjectAction, updateProjectAction, deleteProjectAction } from '@/actions/projectActions'
import { createNoteAction, updateNoteAction, toggleNotePinAction, toggleNoteArchiveAction, deleteNoteAction } from '@/actions/noteActions'
import { createSubjectAction, updateSubjectAttendanceAction, logSubjectAttendanceAction, deleteSubjectAction, createAssignmentAction, updateAssignmentAction, updateAssignmentStatusAction, deleteAssignmentAction, createExamAction, updateExamDetailsAction, updateExamAction, deleteExamAction } from '@/actions/collegeActions'
import { createTransactionAction, updateTransactionAction, deleteTransactionAction, createInvoiceAction, deleteInvoiceAction, markInvoicePaidAction } from '@/actions/financeActions'

type ServerActionResult = {
  success?: boolean
  message?: string
  error?: string
  [key: string]: unknown
}

type ServerAction = (...args: any[]) => Promise<unknown>

// Action Map mapping string names to Server Action functions
export const ACTION_MAP: Record<string, ServerAction> = {
  createTaskAction,
  updateTaskAction,
  deleteTaskAction,
  updateTaskStatusAction,
  createHabitAction,
  toggleHabitDateAction,
  deleteHabitAction,
  createTimeBlockAction,
  updateTimeBlockAction,
  deleteTimeBlockAction,
  createProjectAction,
  updateProjectAction,
  deleteProjectAction,
  createNoteAction,
  updateNoteAction,
  toggleNotePinAction,
  toggleNoteArchiveAction,
  deleteNoteAction,
  createSubjectAction,
  updateSubjectAttendanceAction,
  logSubjectAttendanceAction,
  deleteSubjectAction,
  createAssignmentAction,
  updateAssignmentAction,
  updateAssignmentStatusAction,
  deleteAssignmentAction,
  createExamAction,
  updateExamDetailsAction,
  updateExamAction,
  deleteExamAction,
  createTransactionAction,
  updateTransactionAction,
  deleteTransactionAction,
  createInvoiceAction,
  deleteInvoiceAction,
  markInvoicePaidAction,
}

/**
 * Executes a server action. If offline, it saves the action to IndexedDB queue and returns a mock success.
 */
/**
 * Executes a server action. If offline, it saves the action to IndexedDB queue and returns a mock success.
 */
export async function executeAction<T extends Record<string, unknown> = Record<string, unknown>>(
  actionName: string,
  actionFn: ServerAction,
  args: unknown[],
  mockGenerator?: (args: unknown[], tempId: string) => T
): Promise<{ success: boolean; message?: string; error?: string; [key: string]: unknown } & T> {
  const isOnline = typeof navigator !== 'undefined' && navigator.onLine

  // Define the explicit return type alias for clean casting
  type ExpectedReturn = { success: boolean; message?: string; error?: string; [key: string]: unknown } & T

  if (isOnline) {
    try {
      const result = (await actionFn(...args)) as ServerActionResult
      // Cast the successful server response to the expected return type
      return result as unknown as ExpectedReturn
    } catch (err: unknown) {
      console.warn(`Server action ${actionName} failed, check if network error:`, err)
      const message = err instanceof Error ? err.message : 'Server action failed'
      // Check if it is a network error
      const isNetworkError = !navigator.onLine || message.includes('fetch') || message.includes('Network') || message.includes('Failed to fetch')
      if (!isNetworkError) {
        // FIX 1: Cast the application-level failure payload to the intersection type
        return { success: false, error: message } as unknown as ExpectedReturn
      }
      // If network failure occurred, fall through to offline queue
    }
  }

  // Handle Offline state
  const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const timestamp = Date.now()

  // Add mutation to offline IndexedDB queue
  await addToQueue({
    id: tempId,
    actionName,
    args,
    timestamp,
    status: 'pending',
  })

  // Trigger window custom event to update status banner
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('offline-action-queued'))
  }

  // Generate optimistic result
  const mockData = mockGenerator ? mockGenerator(args, tempId) : ({} as T)
  
  // FIX 2: Correctly spread mockData and cast the complete object to ExpectedReturn
  return {
    success: true,
    message: 'Changes saved locally. They will be synchronized automatically when you are online.',
    isOfflineOptimistic: true,
    ...mockData,
  } as unknown as ExpectedReturn
}

/**
 * Synchronizes the offline queue with the server.
 */
export async function syncOfflineQueue(onProgress?: (actionName: string, success: boolean) => void): Promise<{ processed: number; failed: number }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { processed: 0, failed: 0 }
  }

  const queue = await getQueue()
  if (queue.length === 0) {
    return { processed: 0, failed: 0 }
  }

  // Sort queue by timestamp to ensure chronological execution
  const sortedQueue = [...queue].sort((a, b) => a.timestamp - b.timestamp)

  let processed = 0
  let failed = 0

  for (const item of sortedQueue) {
    const action = ACTION_MAP[item.actionName]
    if (!action) {
      console.error(`Offline sync: Action ${item.actionName} not found in ACTION_MAP. Skipping.`)
      await removeFromQueue(item.id)
      continue
    }

    try {
      const res:any = await action(...item.args)
      if (res.success) {
        await removeFromQueue(item.id)
        processed++
        if (onProgress) onProgress(item.actionName, true)
      } else {
        console.error(`Offline sync: Action ${item.actionName} returned error:`, res.error)
        failed++
        if (onProgress) onProgress(item.actionName, false)
      }
    } catch (err) {
      console.error(`Offline sync: Execution of ${item.actionName} crashed:`, err)
      failed++
      if (onProgress) onProgress(item.actionName, false)
      // Stop syncing subsequent actions to maintain order in case of dependencies (e.g. update depends on create)
      break
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('offline-sync-completed', { detail: { processed, failed } }))
  }

  return { processed, failed }
}
