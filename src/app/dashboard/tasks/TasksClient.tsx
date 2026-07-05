'use client'

import React, { useState, useTransition, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  Edit3, 
  Clock, 
  CheckCircle, 
  X, 
  Calendar,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Bell
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { 
  createTaskAction, 
  updateTaskAction, 
  deleteTaskAction, 
  updateTaskStatusAction 
} from '@/actions/taskActions'
import { ReminderConfigPanel } from '@/components/ui/ReminderConfigPanel'

interface TasksClientProps {
  initialTasks: any[]
}

const CATEGORIES = ['All', 'Study', 'Projects', 'College', 'Assignments', 'LeetCode', 'Freelancing', 'Content', 'Health', 'Finance', 'Personal']
const COLUMNS = [
  { id: 'Todo', title: 'To Do', color: 'bg-zinc-500/10 text-zinc-600 border-zinc-200 dark:border-zinc-800' },
  { id: 'In Progress', title: 'In Progress', color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' },
  { id: 'Testing', title: 'Testing', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  { id: 'Completed', title: 'Completed', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' }
]

export default function TasksClient({ initialTasks }: TasksClientProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  
  const formatLocalDateTime = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  // Data State
  const [tasks, setTasks] = useState<any[]>(initialTasks)

  // Caching tasks state in IndexedDB for offline reliability
  useEffect(() => {
    async function loadCache() {
      try {
        const { getFromStore, saveToStore } = await import('@/lib/offlineDb')
        const cachedTasks = await getFromStore('cache_store', 'tasks')
        if (cachedTasks && Array.isArray(cachedTasks)) {
          setTasks(cachedTasks)
        } else {
          await saveToStore('cache_store', 'tasks', initialTasks)
        }
      } catch (err) {
        console.error('Failed to load tasks cache:', err)
      }
    }
    void loadCache()
  }, [initialTasks])

  useEffect(() => {
    async function saveCache() {
      try {
        const { saveToStore } = await import('@/lib/offlineDb')
        await saveToStore('cache_store', 'tasks', tasks)
      } catch (err) {
        console.error('Failed to save tasks cache:', err)
      }
    }
    void saveCache()
  }, [tasks])
  
  // Modal & Form States
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState<any | null>(null)
  const [showReminderModal, setShowReminderModal] = useState(false)
  const [selectedTaskForReminder, setSelectedTaskForReminder] = useState<any>(null)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Personal',
    priority: 'Medium',
    difficulty: 'Medium',
    deadline: formatLocalDateTime(new Date()),
    estimatedTime: '',
    tags: '',
    notes: '',
  })

  // Reminder configurations state
  const [reminderConfigs, setReminderConfigs] = useState<Array<{ enabled: boolean; reminderTime: string; message?: string; notificationType: 'email' | 'in-app' | 'both' }>>([])

  // Filter States
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedPriority, setSelectedPriority] = useState('All')
  
  // Form submission
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const parsedTags = formData.tags
        ? formData.tags.split(',').map((t) => t.trim()).filter((t) => t !== '')
        : []

      const { executeAction } = await import('@/lib/offlineSync')
      const res = await executeAction(
        'createTaskAction',
        createTaskAction,
        [{
          ...formData,
          tags: parsedTags,
          reminderConfigs: reminderConfigs.filter((r) => r.enabled),
        }],
        (args, tempId) => ({
          task: {
            _id: tempId,
            ...args[0],
            status: 'Todo',
            createdAt: new Date().toISOString(),
          }
        })
      )

      if (res.success) {
        toast(res.message || 'Task created successfully!', 'success')
        if (res.task) {
          setTasks((prev) => [...prev, res.task])
        }
        setShowAddModal(false)
        resetForm()
      } else {
        toast(res.error || 'Failed to create task', 'error')
      }
    })
  }

  const handleUpdateTask = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTask) return

    startTransition(async () => {
      const parsedTags = formData.tags
        ? formData.tags.split(',').map((t) => t.trim()).filter((t) => t !== '')
        : []

      const { executeAction } = await import('@/lib/offlineSync')
      const res = await executeAction(
        'updateTaskAction',
        updateTaskAction,
        [selectedTask._id, {
          ...formData,
          tags: parsedTags,
          reminderConfigs: reminderConfigs.filter((r) => r.enabled),
        }],
        (args) => ({
          task: {
            ...selectedTask,
            ...args[1],
          }
        })
      )

      if (res.success) {
        toast(res.message || 'Task updated!', 'success')
        if (res.task) {
          setTasks((prev) => prev.map((t) => (t._id === selectedTask._id ? res.task : t)))
        }
        setSelectedTask(null)
        resetForm()
      } else {
        toast(res.error || 'Failed to update task', 'error')
      }
    })
  }

  const handleDeleteTask = (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return

    startTransition(async () => {
      const { executeAction } = await import('@/lib/offlineSync')
      const res = await executeAction(
        'deleteTaskAction',
        deleteTaskAction,
        [taskId],
        () => ({ success: true })
      )
      if (res.success) {
        toast(res.message || 'Task deleted', 'info')
        setTasks((prev) => prev.filter((t) => t._id !== taskId))
        setSelectedTask(null)
      } else {
        toast(res.error || 'Failed to delete task', 'error')
      }
    })
  }

  const handleMoveStatus = (taskId: string, newStatus: 'Todo' | 'In Progress' | 'Testing' | 'Completed') => {
    startTransition(async () => {
      const { executeAction } = await import('@/lib/offlineSync')
      const res = await executeAction(
        'updateTaskStatusAction',
        updateTaskStatusAction,
        [taskId, newStatus],
        (args) => {
          const task = tasks.find(t => t._id === args[0])
          return {
            task: {
              ...task,
              status: args[1],
            }
          }
        }
      )
      if (res.success) {
        toast(res.message || 'Status updated', 'success')
        if (res.task) {
          setTasks((prev) => prev.map((t) => (t._id === taskId ? res.task : t)))
        }
      } else {
        toast(res.error || 'Failed to update status', 'error')
      }
    })
  }

  const openEditModal = (task: any) => {
    setSelectedTask(task)
    const deadlineDate = new Date(task.deadline)
    setFormData({
      title: task.title,
      description: task.description || '',
      category: task.category,
      priority: task.priority,
      difficulty: task.difficulty,
      deadline: Number.isNaN(deadlineDate.getTime()) ? formatLocalDateTime(new Date()) : formatLocalDateTime(deadlineDate),
      estimatedTime: task.estimatedTime?.toString() || '',
      tags: task.tags?.join(', ') || '',
      notes: task.notes || '',
    })
    // Load existing reminder configs
    setReminderConfigs(task.reminderConfigs || [])
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'Personal',
      priority: 'Medium',
      difficulty: 'Medium',
      deadline: formatLocalDateTime(new Date()),
      estimatedTime: '',
      tags: '',
      notes: '',
    })
    setReminderConfigs([])
  }

  // Filtering Logic
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory
    const matchesPriority = selectedPriority === 'All' || t.priority === selectedPriority
    return matchesSearch && matchesCategory && matchesPriority
  })

  const getStatusMoveOptions = (currentStatus: string) => {
    if (currentStatus === 'Todo') return ['In Progress']
    if (currentStatus === 'In Progress') return ['Todo', 'Testing', 'Completed']
    if (currentStatus === 'Testing') return ['In Progress', 'Completed']
    return ['In Progress'] // Completed can move back to In Progress
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-white">Smart Task Manager</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm font-medium">Plan, filter, and track actual execution</p>
        </div>
        <Button
          onClick={() => {
            resetForm()
            setSelectedTask(null)
            setShowAddModal(true)
          }}
          variant="primary"
          className="gap-2 shadow-md cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Create Task
        </Button>
      </div>

      {/* Filters workspace bar */}
      <div className="p-4 rounded-xl border border-border bg-card/40 backdrop-blur-md flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Search */}
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-zinc-400" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9.5 bg-background/70 border-border"
          />
        </div>

        {/* Category & Priority Filters */}
        <div className="flex flex-wrap gap-3 w-full md:w-auto justify-end">
          
          {/* Category Select */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-9 rounded-md border border-border bg-background/70 text-xs px-2.5 font-medium outline-none focus:ring-1 focus:ring-ring"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
              ))}
            </select>
          </div>

          {/* Priority Select */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="h-9 rounded-md border border-border bg-background/70 text-xs px-2.5 font-medium outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="All">All Priorities</option>
            <option value="Low">Low Priority</option>
            <option value="Medium">Medium Priority</option>
            <option value="High">High Priority</option>
          </select>
        </div>
      </div>

      {/* Kanban Board Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        {COLUMNS.map((col) => {
          const colTasks = filteredTasks.filter((t) => t.status === col.id)
          return (
            <div key={col.id} className="rounded-xl border border-border bg-card/25 p-4 space-y-4">
              
              {/* Column Header */}
              <div className={`p-2.5 rounded-lg border flex items-center justify-between font-bold text-xs uppercase tracking-wider ${col.color}`}>
                <span>{col.title}</span>
                <span className="px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-[10px] text-zinc-500 font-extrabold">{colTasks.length}</span>
              </div>

              {/* Tasks list in column */}
              <div className="space-y-3 min-h-[300px] overflow-y-auto max-h-[550px] pr-1">
                <AnimatePresence mode="popLayout">
                  {colTasks.length === 0 ? (
                    <p className="text-center text-xs text-zinc-500 italic py-10">No tasks</p>
                  ) : (
                    colTasks.map((task) => (
                      <motion.div
                        key={task._id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="p-4 rounded-lg border border-border bg-card hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-sm space-y-3 relative group"
                      >
                        {/* Task header info */}
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-[10px] font-extrabold uppercase tracking-wide text-zinc-400 bg-zinc-100 dark:bg-zinc-900 border border-border px-1.5 py-0.5 rounded">
                            {task.category}
                          </span>

                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => {
                                setSelectedTaskForReminder(task)
                                setShowReminderModal(true)
                              }}
                              size="sm"
                              variant="ghost"
                              className="text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 p-1 h-6 w-6"
                            >
                              <Bell className="h-3.5 w-3.5" />
                            </Button>
                            <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                              task.priority === 'High'
                                ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                                : task.priority === 'Medium'
                                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                : 'bg-zinc-500/10 text-zinc-500 border border-zinc-200 dark:border-zinc-800'
                            }`}>
                              {task.priority}
                            </span>
                          </div>
                        </div>

                        {/* Title & Description */}
                        <div>
                          <h4 
                            onClick={() => openEditModal(task)}
                            className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 hover:text-indigo-500 dark:hover:text-indigo-400 cursor-pointer transition-colors leading-snug"
                          >
                            {task.title}
                          </h4>
                          {task.description && (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                              {task.description}
                            </p>
                          )}
                        </div>

                        {/* Footer details */}
                        <div className="flex justify-between items-center text-[10px] text-zinc-400 font-semibold border-t border-border/40 pt-2.5">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(task.deadline).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                          
                          {task.estimatedTime && (
                            <span className="flex items-center gap-1 font-mono font-bold">
                              <Clock className="w-3.5 h-3.5" />
                              {task.estimatedTime}m
                            </span>
                          )}
                        </div>

                        {/* Status switcher overlay triggers */}
                        <div className="flex gap-1 justify-end pt-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          {getStatusMoveOptions(task.status).map((opt: any) => (
                            <button
                              key={opt}
                              onClick={() => handleMoveStatus(task._id, opt)}
                              className="text-[9px] font-bold px-2 py-0.5 rounded border border-border bg-indigo-500 md:bg-background md:hover:bg-indigo-500 text-zinc-100 md:hover:text-white transition-all cursor-pointer shadow-sm"
                            >
                              Move {opt}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>

            </div>
          )
        })}
      </div>

      {/* Creation Modal Dialogue overlay */}
      <AnimatePresence>
        {(showAddModal || selectedTask) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl p-6 relative my-8 mt-120 md:mt-50"
            >
              {/* Close Button */}
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setSelectedTask(null)
                  resetForm()
                }}
                className="absolute right-4 top-4 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-white" />
              </button>

              <h2 className="text-xl font-bold mb-4">
                {selectedTask ? 'Task Details & Editing' : 'Create New Task'}
              </h2>

              <form onSubmit={selectedTask ? handleUpdateTask : handleCreateTask} className="space-y-4">
                {/* Title */}
                <div className="space-y-1">
                  <Label htmlFor="taskTitle">Task Title</Label>
                  <Input
                    id="taskTitle"
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter task title"
                    required
                  />
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <Label htmlFor="taskDesc">Description</Label>
                  <textarea
                    id="taskDesc"
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Provide details about the task"
                    rows={2}
                    className="flex w-full rounded-md border border-border bg-background/70 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                {/* Category & Priority selection dropdowns */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="taskCat">Category</Label>
                    <select
                      id="taskCat"
                      value={formData.category}
                      onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                      className="flex h-10 w-full rounded-md border border-border bg-background/70 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="taskPri">Priority</Label>
                    <select
                      id="taskPri"
                      value={formData.priority}
                      onChange={(e) => setFormData((prev) => ({ ...prev, priority: e.target.value }))}
                      className="flex h-10 w-full rounded-md border border-border bg-background/70 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                </div>

                {/* Difficulty & Energy required */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="taskDiff">Difficulty</Label>
                    <select
                      id="taskDiff"
                      value={formData.difficulty}
                      onChange={(e) => setFormData((prev) => ({ ...prev, difficulty: e.target.value }))}
                      className="flex h-10 w-full rounded-md border border-border bg-background/70 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>

                </div>

                {/* Deadline & Estimated Minutes */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="taskDeadline">Deadline Date</Label>
                    <div className="flex gap-2">
                      <Input
                        id="taskDeadline"
                        type="datetime-local"
                        value={formData.deadline}
                        onChange={(e) => setFormData((prev) => ({ ...prev, deadline: e.target.value }))}
                        required
                        className="flex-1"
                      />
                      {formData.deadline && (
                        <Button
                          type="button"
                          onClick={() => {
                            setSelectedTaskForReminder(selectedTask || { ...formData, _id: 'temp' })
                            setShowReminderModal(true)
                          }}
                          variant="outline"
                          size="sm"
                          className="h-10 w-10 flex items-center justify-center text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20"
                        >
                          <Bell className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="taskEst">Estimated (minutes)</Label>
                    <Input
                      id="taskEst"
                      type="number"
                      placeholder="e.g. 60"
                      value={formData.estimatedTime}
                      onChange={(e) => setFormData((prev) => ({ ...prev, estimatedTime: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Tags (comma separated) */}
                <div className="space-y-1">
                  <Label htmlFor="taskTags">Tags (comma separated)</Label>
                  <Input
                    id="taskTags"
                    type="text"
                    placeholder="coding, dsa, design"
                    value={formData.tags}
                    onChange={(e) => setFormData((prev) => ({ ...prev, tags: e.target.value }))}
                  />
                </div>

                {/* Footer notes */}
                <div className="space-y-1">
                  <Label htmlFor="taskNotes">Notes</Label>
                  <textarea
                    id="taskNotes"
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Any quick references or hyperlinks..."
                    rows={2}
                    className="flex w-full rounded-md border border-border bg-background/70 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 justify-between pt-4 border-t border-border/40">
                  {selectedTask && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => handleDeleteTask(selectedTask._id)}
                      disabled={isPending}
                    >
                      Delete
                    </Button>
                  )}
                  
                  <div className="flex gap-2 ml-auto">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setShowAddModal(false)
                        setSelectedTask(null)
                        resetForm()
                      }}
                      disabled={isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      isLoading={isPending}
                    >
                      {selectedTask ? 'Save Changes' : 'Create Task'}
                    </Button>
                  </div>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Task Reminder Modal */}
      <AnimatePresence>
        {showReminderModal && selectedTaskForReminder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-lg bg-card border border-border rounded-xl p-6 relative max-h-[90vh] overflow-y-auto">
              <button onClick={() => setShowReminderModal(false)} className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-200"><X className="w-5 h-5" /></button>
              <h3 className="text-lg font-bold mb-2">Set Reminders for {selectedTaskForReminder.title}</h3>
              <p className="text-sm text-zinc-500 mb-6">Configure custom reminders for this task</p>

              <ReminderConfigPanel
                configs={selectedTaskForReminder.reminderConfigs || []}
                onConfigsChange={(configs) => {
                  setSelectedTaskForReminder((prev: any) => ({ ...prev, reminderConfigs: configs }))
                }}
                title="Task Reminders"
                description="Set reminder times for this task"
              />

              <div className="mt-6 flex gap-3">
                <Button
                  onClick={async () => {
                    startTransition(async () => {
                      const { executeAction } = await import('@/lib/offlineSync')
                      const res = await executeAction(
                        'updateTaskAction',
                        updateTaskAction,
                        [selectedTaskForReminder._id, {
                          ...selectedTaskForReminder,
                          reminderConfigs: selectedTaskForReminder.reminderConfigs
                        }],
                        () => ({ success: true })
                      )
                      if (res.success) {
                        toast('Reminders updated successfully!', 'success')
                        setTasks((prev) =>
                          prev.map((t) =>
                            t._id === selectedTaskForReminder._id
                              ? { ...t, reminderConfigs: selectedTaskForReminder.reminderConfigs }
                              : t
                          )
                        )
                        setShowReminderModal(false)
                      } else {
                        toast(res.error || 'Failed to update reminders', 'error')
                      }
                    })
                  }}
                  variant="primary"
                  className="flex-1"
                  isLoading={isPending}
                >
                  Save Reminders
                </Button>
                <Button
                  onClick={() => setShowReminderModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
