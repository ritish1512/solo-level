'use client'

import React, { useState, useTransition } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, 
  Trash2, 
  Github, 
  ExternalLink, 
  Bug as BugIcon, 
  CheckSquare, 
  Upload, 
  X, 
  ChevronRight, 
  PlusCircle,
  Check,
  Edit3,
  Save,
  Bell
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { ReminderConfigPanel } from '@/components/ui/ReminderConfigPanel'
import { 
  createProjectAction,
  updateProjectAction,
  deleteProjectAction,
  createBugAction,
  updateBugAction,
  deleteBugAction
} from '@/actions/projectActions'
import { createTaskAction, updateTaskStatusAction, deleteTaskAction, updateTaskAction } from '@/actions/taskActions'

interface ProjectsClientProps {
  initialProjects: any[]
  initialAllTasks: any[]
  initialAllBugs: any[]
}

export default function ProjectsClient({
  initialProjects,
  initialAllTasks,
  initialAllBugs
}: ProjectsClientProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  // State
  const [projects, setProjects] = useState<any[]>(initialProjects)
  const [selectedProject, setSelectedProject] = useState<any | null>(initialProjects[0] || null)
  
  const [tasks, setTasks] = useState<any[]>(initialAllTasks)
  const [bugs, setBugs] = useState<any[]>(initialAllBugs)

  // Dialog triggers
  const [showAddProject, setShowAddProject] = useState(false)
  const [showAddBug, setShowAddBug] = useState(false)
  const [showAddTask, setShowAddTask] = useState(false)
  const [isEditingProject, setIsEditingProject] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [showReminderModal, setShowReminderModal] = useState(false)
  const [selectedProjectForReminder, setSelectedProjectForReminder] = useState<any>(null)

  // Form States
  const [projectForm, setProjectForm] = useState({
    title: '', description: '', githubLink: '', demoLink: '', deploymentLink: '', techStack: '', screenshots: [] as string[], deadline: ''
  })
  const [editProjectForm, setEditProjectForm] = useState({
    title: '', description: '', githubLink: '', demoLink: '', deploymentLink: '', techStack: '', screenshots: [] as string[], notes: '', deadline: ''
  })

  // Refs
  const editScreenshotInputRef = React.useRef<HTMLInputElement>(null)
  const createScreenshotInputRef = React.useRef<HTMLInputElement>(null)
  const [bugForm, setBugForm] = useState({ title: '', description: '', severity: 'Medium' })
  const [taskForm, setTaskForm] = useState({ title: '', deadline: new Date().toISOString().split('T')[0], priority: 'Medium' })
  const [editTaskForm, setEditTaskForm] = useState({ title: '', deadline: '', priority: 'Medium' })

  // Uploader State
  const [uploading, setUploading] = useState(false)

  // Image upload handler
  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) throw new Error('Upload failed')

      const data = await res.json()
      if (isEditingProject) {
        setEditProjectForm((prev) => ({
          ...prev,
          screenshots: [...prev.screenshots, data.url]
        }))
      } else {
        setProjectForm((prev) => ({
          ...prev,
          screenshots: [...prev.screenshots, data.url]
        }))
      }
      toast('Screenshot uploaded!', 'success')
    } catch (err) {
      console.error(err)
      toast('Failed to upload screenshot.', 'error')
    } finally {
      setUploading(false)
    }
  }

  // --- PROJECT ACTIONS ---
  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const parsedTech = projectForm.techStack
        ? projectForm.techStack.split(',').map((t) => t.trim()).filter((t) => t !== '')
        : []

      const res = await createProjectAction({
        ...projectForm,
        techStack: parsedTech,
      })

      if (res.success) {
        toast('Project created successfully!', 'success')
        setProjects((prev) => [res.project, ...prev])
        setSelectedProject(res.project)
        setProjectForm({ title: '', description: '', githubLink: '', demoLink: '', deploymentLink: '', techStack: '', screenshots: [] as string[], deadline: '' })
        setShowAddProject(false)
      } else {
        toast(res.error || 'Failed to create project', 'error')
      }
    })
  }

  const handleEditProject = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProject) return

    startTransition(async () => {
      const parsedTech = editProjectForm.techStack
        ? editProjectForm.techStack.split(',').map((t) => t.trim()).filter((t) => t !== '')
        : selectedProject.techStack

      const res = await updateProjectAction(selectedProject._id, {
        title: editProjectForm.title || selectedProject.title,
        description: editProjectForm.description,
        githubLink: editProjectForm.githubLink,
        demoLink: editProjectForm.demoLink,
        deploymentLink: editProjectForm.deploymentLink,
        techStack: parsedTech,
        screenshots: editProjectForm.screenshots,
        notes: editProjectForm.notes,
      })

      if (res.success) {
        toast('Project updated successfully!', 'success')
        setProjects((prev) => prev.map((p) => (p._id === selectedProject._id ? res.project : p)))
        setSelectedProject(res.project)
        setIsEditingProject(false)
      } else {
        toast(res.error || 'Failed to update project', 'error')
      }
    })
  }

  const handleStartEdit = () => {
    if (selectedProject) {
      setEditProjectForm({
        title: selectedProject.title,
        description: selectedProject.description || '',
        githubLink: selectedProject.githubLink || '',
        demoLink: selectedProject.demoLink || '',
        deploymentLink: selectedProject.deploymentLink || '',
        techStack: selectedProject.techStack?.join(', ') || '',
        screenshots: selectedProject.screenshots || [],
        notes: selectedProject.notes || '',
        deadline: selectedProject.deadline ? new Date(selectedProject.deadline).toISOString().split('T')[0] : '',
      })
      setIsEditingProject(true)
    }
  }

  const handleCancelEdit = () => {
    setIsEditingProject(false)
    setEditProjectForm({
      title: '', description: '', githubLink: '', demoLink: '', deploymentLink: '', techStack: '', screenshots: [] as string[], notes: '', deadline: ''
    })
  }

  const handleDeleteProject = (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project, along with all associated bugs?')) return

    startTransition(async () => {
      const res = await deleteProjectAction(projectId)
      if (res.success) {
        toast(res.message || 'Project deleted', 'info')
        const remaining = projects.filter((p) => p._id !== projectId)
        setProjects(remaining)
        setSelectedProject(remaining[0] || null)
        // Clean up tasks/bugs states locally
        setBugs((prev) => prev.filter((b) => b.project !== projectId))
        setTasks((prev) => prev.filter((t) => t.project !== projectId))
      } else {
        toast(res.error || 'Failed to delete project', 'error')
      }
    })
  }

  // --- BUG ACTIONS ---
  const handleAddBug = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProject) return

    startTransition(async () => {
      const res = await createBugAction({
        ...bugForm,
        projectId: selectedProject._id,
      })

      if (res.success) {
        toast('Bug report logged!', 'success')
        setBugs((prev) => [res.bug, ...prev])
        setBugForm({ title: '', description: '', severity: 'Medium' })
        setShowAddBug(false)
      } else {
        toast(res.error || 'Failed to log bug', 'error')
      }
    })
  }

  const handleUpdateBugStatus = (bugId: string, newStatus: 'Open' | 'In Progress' | 'Resolved') => {
    startTransition(async () => {
      const res = await updateBugAction(bugId, newStatus)
      if (res.success) {
        toast('Bug status updated!', 'success')
        setBugs((prev) => prev.map((b) => (b._id === bugId ? res.bug : b)))
      } else {
        toast(res.error || 'Failed to update bug status', 'error')
      }
    })
  }

  const handleDeleteBug = (bugId: string) => {
    startTransition(async () => {
      const res = await deleteBugAction(bugId)
      if (res.success) {
        setBugs((prev) => prev.filter((b) => b._id !== bugId))
        toast('Bug report deleted.', 'info')
      } else {
        toast(res.error || 'Failed to delete bug', 'error')
      }
    })
  }

  // --- PROJECT SPECIFIC TASKS ---
  const handleAddProjectTask = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProject) return

    startTransition(async () => {
      const res = await createTaskAction({
        ...taskForm,
        category: 'Projects',
        project: selectedProject._id,
      })

      if (res.success) {
        toast('Project task created!', 'success')
        setTasks((prev) => [...prev, res.task])
        setTaskForm({ title: '', deadline: new Date().toISOString().split('T')[0], priority: 'Medium' })
        setShowAddTask(false)
      } else {
        toast(res.error || 'Failed to create task', 'error')
      }
    })
  }

  const handleToggleTaskStatus = (taskId: string, isCompleted: boolean) => {
    const nextStatus = isCompleted ? 'Todo' : 'Completed'
    startTransition(async () => {
      const res = await updateTaskStatusAction(taskId, nextStatus)
      if (res.success) {
        setTasks((prev) =>
          prev.map((t) => (t._id === taskId ? res.task : t))
        )
      } else {
        toast(res.error || 'Failed to update task status', 'error')
      }
    })
  }

  const handleDeleteProjectTask = (taskId: string) => {
    startTransition(async () => {
      const res = await deleteTaskAction(taskId)
      if (res.success) {
        setTasks((prev) => prev.filter((t) => t._id !== taskId))
        toast('Project task deleted.', 'info')
      } else {
        toast(res.error || 'Failed to delete task', 'error')
      }
    })
  }

  const handleStartEditTask = (task: any) => {
    setEditTaskForm({
      title: task.title,
      deadline: task.deadline.split('T')[0],
      priority: task.priority,
    })
    setEditingTaskId(task._id)
  }

  const handleSaveEditTask = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTaskId) return

    startTransition(async () => {
      const res = await updateTaskAction(editingTaskId, {
        title: editTaskForm.title,
        deadline: editTaskForm.deadline,
        priority: editTaskForm.priority,
      })

      if (res.success) {
        toast('Project task updated!', 'success')
        setTasks((prev) =>
          prev.map((t) => (t._id === editingTaskId ? res.task : t))
        )
        setEditingTaskId(null)
        setEditTaskForm({ title: '', deadline: '', priority: 'Medium' })
      } else {
        toast(res.error || 'Failed to update task', 'error')
      }
    })
  }

  const handleCancelEditTask = () => {
    setEditingTaskId(null)
    setEditTaskForm({ title: '', deadline: '', priority: 'Medium' })
  }

  // Filter Tasks and Bugs for Selected Project
  const projectTasks = selectedProject
    ? tasks.filter((t) => t.project === selectedProject._id)
    : []

  const projectBugs = selectedProject
    ? bugs.filter((b) => b.project === selectedProject._id)
    : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-white">Project Manager</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm font-medium">Log software projects, track tasks, and resolve bug reports</p>
        </div>
        <Button onClick={() => setShowAddProject(true)} variant="primary" className="gap-2 cursor-pointer shadow-sm">
          <Plus className="w-4 h-4" /> Add Project
        </Button>
      </div>

      {/* Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Left Column: Projects Directory list */}
        <div className="lg:col-span-1 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 pl-1">Projects Directory</p>
          <div className="space-y-2">
            {projects.length === 0 ? (
              <p className="text-zinc-500 dark:text-zinc-450 italic text-xs py-4 pl-1">No projects configured.</p>
            ) : (
              projects.map((p) => {
                const isSelected = selectedProject && selectedProject._id === p._id
                return (
                  <button
                    key={p._id}
                    onClick={() => setSelectedProject(p)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-lg border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20 shadow-sm'
                        : 'bg-card border-border hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    <span className="font-semibold text-sm truncate">{p.title}</span>
                    <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'transform translate-x-0.5 text-indigo-500' : 'text-zinc-400'}`} />
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Center/Right Columns: Detail Workspace & Boards */}
        <div className="lg:col-span-3 space-y-6">
          {selectedProject ? (
            <div className="space-y-6">
              
              {/* Selected Project Overview Card */}
              <Card className="border-border bg-card/30">
                <CardHeader className="pb-2 border-b border-border/40 flex flex-col sm:flex-row justify-between gap-4">
                  {!isEditingProject ? (
                    <>
                      <div>
                        <CardTitle className="text-xl font-bold">{selectedProject.title}</CardTitle>
                        {selectedProject.description && <CardDescription className="text-xs mt-1 leading-relaxed">{selectedProject.description}</CardDescription>}
                      </div>

                      {/* Metadata links */}
                      <div className="flex gap-2 self-start sm:self-center">
                        {selectedProject.githubLink && (
                          <a href={selectedProject.githubLink} target="_blank" rel="noreferrer" className="p-2 border border-border rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors" title="Github Codebase">
                            <Github className="w-4 h-4" />
                          </a>
                        )}
                        {selectedProject.deploymentLink && (
                          <a href={selectedProject.deploymentLink} target="_blank" rel="noreferrer" className="p-2 border border-border rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-indigo-500 hover:text-indigo-400 transition-colors" title="Deployment Link">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        <Button
                          onClick={() => {
                            setSelectedProjectForReminder(selectedProject)
                            setShowReminderModal(true)
                          }}
                          variant="ghost"
                          size="sm"
                          className="text-indigo-500 hover:bg-indigo-500/10 cursor-pointer h-9.5"
                        >
                          <Bell className="w-4 h-4" />
                        </Button>
                        <Button onClick={handleStartEdit} variant="ghost" size="sm" className="text-indigo-500 hover:bg-indigo-500/10 cursor-pointer h-9.5 gap-1">
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button onClick={() => handleDeleteProject(selectedProject._id)} variant="ghost" size="sm" className="text-rose-500 hover:bg-rose-500/10 cursor-pointer h-9.5">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="w-full">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-sm">Edit Project</h3>
                        <div className="flex gap-2">
                          <Button onClick={handleCancelEdit} variant="outline" size="sm" className="h-8">
                            Cancel
                          </Button>
                          <Button onClick={handleEditProject} variant="primary" size="sm" className="h-8 gap-1" isLoading={isPending}>
                            <Save className="w-4 h-4" />
                            Save Changes
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardHeader>

                <CardContent className="py-4 space-y-4">
                  {!isEditingProject ? (
                    <>
                      {/* Tech stack tags */}
                      {selectedProject.techStack?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {selectedProject.techStack.map((tech: string) => (
                            <span key={tech} className="text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/20 text-indigo-500">
                              {tech}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Screenshots Slider view */}
                      {selectedProject.screenshots?.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-wider">Visual Mockups</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {selectedProject.screenshots.map((url: string, index: number) => (
                              <a href={url} target="_blank" rel="noreferrer" key={index} className="aspect-video relative rounded-lg border border-border overflow-hidden hover:opacity-85 transition-opacity">
                                <Image
                                  src={url}
                                  alt={`Screenshot ${index + 1}`}
                                  fill
                                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 260px"
                                  className="object-cover"
                                />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    /* Edit Mode Form */
                    <form className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-title">Project Title</Label>
                        <Input
                          id="edit-title"
                          value={editProjectForm.title}
                          onChange={(e) => setEditProjectForm({ ...editProjectForm, title: e.target.value })}
                          placeholder="Project title"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="edit-description">Description</Label>
                        <textarea
                          id="edit-description"
                          value={editProjectForm.description}
                          onChange={(e) => setEditProjectForm({ ...editProjectForm, description: e.target.value })}
                          placeholder="Project description"
                          rows={2}
                          className="w-full rounded-md border border-border bg-background/50 px-3 py-2 text-sm text-zinc-900 outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-zinc-50"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="edit-github">GitHub Link</Label>
                          <Input
                            id="edit-github"
                            value={editProjectForm.githubLink}
                            onChange={(e) => setEditProjectForm({ ...editProjectForm, githubLink: e.target.value })}
                            placeholder="https://github.com/..."
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="edit-demo">Demo Link</Label>
                          <Input
                            id="edit-demo"
                            value={editProjectForm.demoLink}
                            onChange={(e) => setEditProjectForm({ ...editProjectForm, demoLink: e.target.value })}
                            placeholder="https://demo.example.com"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="edit-deployment">Deployment Link</Label>
                        <Input
                          id="edit-deployment"
                          value={editProjectForm.deploymentLink}
                          onChange={(e) => setEditProjectForm({ ...editProjectForm, deploymentLink: e.target.value })}
                          placeholder="https://app.example.com"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="edit-tech">Tech Stack (comma-separated)</Label>
                        <Input
                          id="edit-tech"
                          value={editProjectForm.techStack}
                          onChange={(e) => setEditProjectForm({ ...editProjectForm, techStack: e.target.value })}
                          placeholder="React, Node.js, MongoDB"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <Label htmlFor="edit-deadline">Project Deadline</Label>
                          <Input
                            id="edit-deadline"
                            type="date"
                            value={editProjectForm.deadline || ''}
                            onChange={(e) => setEditProjectForm({ ...editProjectForm, deadline: e.target.value })}
                          />
                        </div>
                        {editProjectForm.deadline && (
                          <Button
                            type="button"
                            onClick={() => {
                              setSelectedProjectForReminder(selectedProject)
                              setShowReminderModal(true)
                            }}
                            variant="outline"
                            size="sm"
                            className="mt-5 h-11 w-11 flex items-center justify-center text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20"
                          >
                            <Bell className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="edit-notes">Notes</Label>
                        <textarea
                          id="edit-notes"
                          value={editProjectForm.notes}
                          onChange={(e) => setEditProjectForm({ ...editProjectForm, notes: e.target.value })}
                          placeholder="Additional notes about the project"
                          rows={2}
                          className="w-full rounded-md border border-border bg-background/50 px-3 py-2 text-sm text-zinc-900 outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-zinc-50"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label>Screenshots</Label>
                        <div className="flex gap-2 items-center">
                          <input
                            ref={editScreenshotInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleScreenshotUpload}
                            disabled={uploading}
                            className="hidden"
                            id="edit-screenshot-upload"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={uploading}
                            className="cursor-pointer"
                            onClick={() => editScreenshotInputRef.current?.click()}
                          >
                            {uploading ? 'Uploading...' : 'Add Screenshot'}
                          </Button>
                        </div>
                      </div>

                      {editProjectForm.screenshots.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Screenshots</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {editProjectForm.screenshots.map((url: string, index: number) => (
                              <div key={index} className="relative group aspect-video rounded-lg border border-border overflow-hidden">
                                <Image
                                  src={url}
                                  alt={`Screenshot ${index + 1}`}
                                  fill
                                  className="object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditProjectForm({
                                      ...editProjectForm,
                                      screenshots: editProjectForm.screenshots.filter((_, i) => i !== index),
                                    })
                                  }
                                  className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="w-5 h-5 text-white" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </form>
                  )}
                </CardContent>
              </Card>

              {/* Sub-workspace grids: Tasks & Bug Tracker */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Project Tasks checklist */}
                <Card className="border-border bg-card/30">
                  <CardHeader className="pb-2 border-b border-border/40 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-500">Project Tasks</CardTitle>
                      <CardDescription className="text-xs">Schedule milestones and checkmarks</CardDescription>
                    </div>
                    <Button onClick={() => setShowAddTask(true)} variant="outline" size="sm" className="h-8 px-2.5 gap-1 shadow-sm cursor-pointer">
                      <PlusCircle className="w-4 h-4" /> Add Task
                    </Button>
                  </CardHeader>
                  <CardContent className="py-4 space-y-2 max-h-[360px] overflow-y-auto pr-1">
                    {projectTasks.length === 0 ? (
                      <p className="text-xs text-zinc-500 italic py-6 text-center">No tasks logged for this project.</p>
                    ) : (
                      projectTasks.map((t) => (
                        <div key={t._id} className="p-3 rounded-lg border border-border bg-card flex items-center justify-between gap-3 group">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleToggleTaskStatus(t._id, t.status === 'Completed')}
                              className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-all ${
                                t.status === 'Completed'
                                  ? 'bg-indigo-500 border-indigo-500 text-white'
                                  : 'border-zinc-300 dark:border-zinc-700'
                              }`}
                            >
                              {t.status === 'Completed' && <Check className="w-3 h-3 stroke-[3]" />}
                            </button>
                            <span className={`text-sm font-semibold ${t.status === 'Completed' ? 'line-through text-zinc-400' : 'text-zinc-950 dark:text-zinc-50'}`}>
                              {t.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                              t.priority === 'High' ? 'bg-rose-500/10 text-rose-500' : t.priority === 'Medium' ? 'bg-amber-500/10 text-amber-500' : 'bg-zinc-500/10 text-zinc-500'
                            }`}>
                              {t.priority}
                            </span>
                            <button 
                              onClick={() => handleStartEditTask(t)} 
                              className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-indigo-500 transition-opacity p-0.5 rounded hover:bg-indigo-500/10"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => handleDeleteProjectTask(t._id)} 
                              className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-rose-500 transition-opacity p-0.5 rounded hover:bg-rose-500/10"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Bug Logger tracker */}
                <Card className="border-border bg-card/30">
                  <CardHeader className="pb-2 border-b border-border/40 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-500">Bug Tracker</CardTitle>
                      <CardDescription className="text-xs">Register issues and debug statuses</CardDescription>
                    </div>
                    <Button onClick={() => setShowAddBug(true)} variant="outline" size="sm" className="h-8 px-2.5 gap-1 shadow-sm cursor-pointer border border-transparent hover:border-amber-500/20 text-amber-500 hover:bg-amber-500/10">
                      <BugIcon className="w-4 h-4" /> Log Bug
                    </Button>
                  </CardHeader>
                  <CardContent className="py-4 space-y-2 max-h-[360px] overflow-y-auto pr-1">
                    {projectBugs.length === 0 ? (
                      <p className="text-xs text-zinc-500 italic py-6 text-center">Zero bugs logged. Clean codebase!</p>
                    ) : (
                      projectBugs.map((bug) => (
                        <div key={bug._id} className="p-3 rounded-lg border border-border bg-card space-y-2 group">
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="font-semibold text-sm text-zinc-950 dark:text-zinc-100">{bug.title}</h4>
                            <div className="flex items-center gap-1.5">
                              {/* Severity Badge */}
                              <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                                bug.severity === 'Critical'
                                  ? 'bg-rose-500 text-white font-extrabold'
                                  : bug.severity === 'High'
                                  ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                                  : bug.severity === 'Medium'
                                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                  : 'bg-zinc-500/10 text-zinc-500 border border-border'
                              }`}>
                                {bug.severity}
                              </span>

                              {/* Delete Bug */}
                              <button 
                                onClick={() => handleDeleteBug(bug._id)} 
                                className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-rose-500 transition-opacity p-0.5 rounded hover:bg-rose-500/10"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          
                          {bug.description && <p className="text-xs text-zinc-500 dark:text-zinc-450 leading-relaxed">{bug.description}</p>}

                          {/* Quick Resolution toggle */}
                          <div className="flex justify-end gap-1 pt-1.5 border-t border-border/40">
                            {bug.status !== 'Resolved' ? (
                              <>
                                <button
                                  onClick={() => handleUpdateBugStatus(bug._id, 'In Progress')}
                                  className={`text-[9px] font-extrabold px-2 py-0.5 rounded border border-border cursor-pointer ${bug.status === 'In Progress' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-background hover:bg-zinc-100 text-zinc-500'}`}
                                >
                                  In Progress
                                </button>
                                <button
                                  onClick={() => handleUpdateBugStatus(bug._id, 'Resolved')}
                                  className="text-[9px] font-extrabold px-2 py-0.5 rounded border border-border bg-background hover:bg-emerald-500 hover:text-white hover:border-transparent text-zinc-500 cursor-pointer shadow-sm"
                                >
                                  Resolve
                                </button>
                              </>
                            ) : (
                              <span className="text-[10px] font-extrabold text-emerald-500 flex items-center gap-1">
                                <CheckSquare className="w-3.5 h-3.5" /> Resolved
                              </span>
                            )}
                          </div>

                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

              </div>

            </div>
          ) : (
            <p className="text-center text-zinc-500 dark:text-zinc-400 italic py-16">No project selected. Choose a project from the directory or create a new one to arise.</p>
          )}
        </div>

      </div>

      {/* --- FORMS POPUPS MODALS --- */}
      
      {/* 1. Add Project Modal */}
      <AnimatePresence>
        {showAddProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-lg bg-card border border-border rounded-xl p-6 relative my-8">
              <button onClick={() => setShowAddProject(false)} className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-200"><X className="w-5 h-5" /></button>
              <h3 className="text-lg font-bold mb-4 font-sans">Initialize Project</h3>
              <form onSubmit={handleAddProject} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="proTitle">Project Title</Label>
                  <Input id="proTitle" type="text" placeholder="e.g. Solo Leveling" value={projectForm.title} onChange={(e) => setProjectForm((prev) => ({ ...prev, title: e.target.value }))} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="proDesc">Description</Label>
                  <textarea id="proDesc" placeholder="Describe the software scope..." value={projectForm.description} onChange={(e) => setProjectForm((prev) => ({ ...prev, description: e.target.value }))} className="flex w-full rounded-md border border-border bg-background/50 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 outline-none focus-visible:ring-2 focus-visible:ring-ring" rows={2} />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="proGit">GitHub Repo Link</Label>
                    <Input id="proGit" type="url" placeholder="https://github.com/..." value={projectForm.githubLink} onChange={(e) => setProjectForm((prev) => ({ ...prev, githubLink: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="proDeploy">Deployment Link</Label>
                    <Input id="proDeploy" type="url" placeholder="https://..." value={projectForm.deploymentLink} onChange={(e) => setProjectForm((prev) => ({ ...prev, deploymentLink: e.target.value }))} />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="proTech">Tech Stack (comma separated)</Label>
                  <Input id="proTech" type="text" placeholder="Next.js, TypeScript, Tailwind, MongoDB" value={projectForm.techStack} onChange={(e) => setProjectForm((prev) => ({ ...prev, techStack: e.target.value }))} />
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Label htmlFor="proDeadline">Project Deadline</Label>
                    <Input id="proDeadline" type="date" value={projectForm.deadline || ''} onChange={(e) => setProjectForm((prev) => ({ ...prev, deadline: e.target.value }))} />
                  </div>
                  {projectForm.deadline && (
                    <Button
                      type="button"
                      onClick={() => {
                        setSelectedProjectForReminder({ ...projectForm, _id: 'temp' } as any)
                        setShowReminderModal(true)
                      }}
                      variant="outline"
                      size="sm"
                      className="mt-5 h-11 w-11 flex items-center justify-center text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20"
                    >
                      <Bell className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Screenshot media uploader */}
                <div className="space-y-1">
                  <Label>Screenshots / Visual Assets</Label>
                  <div className="flex gap-2">
                    <input
                      ref={createScreenshotInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleScreenshotUpload}
                      disabled={uploading}
                      className="hidden"
                      id="create-screenshot-upload"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="px-3 py-2"
                      disabled={uploading}
                      onClick={() => createScreenshotInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4" />
                      {uploading ? 'Uploading...' : 'Add Screenshot'}
                    </Button>
                  </div>
                  {projectForm.screenshots.length > 0 && (
                    <p className="text-[10px] text-zinc-400 font-bold mt-1">Uploaded: {projectForm.screenshots.length} screenshot(s)</p>
                  )}
                </div>

                <Button type="submit" variant="primary" className="w-full" isLoading={isPending || uploading}>Build Workspace</Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Add Task Modal */}
      <AnimatePresence>
        {showAddTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-sm bg-card border border-border rounded-xl p-6 relative">
              <button onClick={() => setShowAddTask(false)} className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-200"><X className="w-5 h-5" /></button>
              <h3 className="text-lg font-bold mb-4">Add Project Milestone Task</h3>
              <form onSubmit={handleAddProjectTask} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="proTaskTitle">Task Title</Label>
                  <Input id="proTaskTitle" type="text" placeholder="e.g. Implement Oauth" value={taskForm.title} onChange={(e) => setTaskForm((prev) => ({ ...prev, title: e.target.value }))} required />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="proTaskDeadline">Deadline</Label>
                    <Input id="proTaskDeadline" type="date" value={taskForm.deadline} onChange={(e) => setTaskForm((prev) => ({ ...prev, deadline: e.target.value }))} required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="proTaskPri">Priority</Label>
                    <select id="proTaskPri" value={taskForm.priority} onChange={(e) => setTaskForm((prev) => ({ ...prev, priority: e.target.value }))} className="flex h-10 w-full rounded-md border border-border bg-background/80 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                </div>
                <Button type="submit" variant="primary" className="w-full" isLoading={isPending}>Create Milestone Task</Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Log Bug Modal */}
      <AnimatePresence>
        {showAddBug && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-sm bg-card border border-border rounded-xl p-6 relative">
              <button onClick={() => setShowAddBug(false)} className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-200"><X className="w-5 h-5" /></button>
              <h3 className="text-lg font-bold mb-4">Log Bug Report</h3>
              <form onSubmit={handleAddBug} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="bugTitle">Bug Title / Summary</Label>
                  <Input id="bugTitle" type="text" placeholder="e.g. Token validation fails on reload" value={bugForm.title} onChange={(e) => setBugForm((prev) => ({ ...prev, title: e.target.value }))} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="bugDesc">Description / Reproduction Steps</Label>
                  <textarea id="bugDesc" placeholder="Explain the error state..." value={bugForm.description} onChange={(e) => setBugForm((prev) => ({ ...prev, description: e.target.value }))} className="flex w-full rounded-md border border-border bg-background/50 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 outline-none focus-visible:ring-2 focus-visible:ring-ring" rows={3} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="bugSev">Severity</Label>
                  <select id="bugSev" value={bugForm.severity} onChange={(e) => setBugForm((prev) => ({ ...prev, severity: e.target.value }))} className="flex h-10 w-full rounded-md border border-border bg-background/80 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
                <Button type="submit" variant="primary" className="w-full" isLoading={isPending}>Log Bug</Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. Edit Task Modal */}
      <AnimatePresence>
        {editingTaskId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-sm bg-card border border-border rounded-xl p-6 relative">
              <button onClick={handleCancelEditTask} className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-200"><X className="w-5 h-5" /></button>
              <h3 className="text-lg font-bold mb-4">Edit Project Task</h3>
              <form onSubmit={handleSaveEditTask} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="editTaskTitle">Task Title</Label>
                  <Input id="editTaskTitle" type="text" placeholder="e.g. Implement Oauth" value={editTaskForm.title} onChange={(e) => setEditTaskForm((prev) => ({ ...prev, title: e.target.value }))} required />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="editTaskDeadline">Deadline</Label>
                    <Input id="editTaskDeadline" type="date" value={editTaskForm.deadline} onChange={(e) => setEditTaskForm((prev) => ({ ...prev, deadline: e.target.value }))} required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="editTaskPri">Priority</Label>
                    <select id="editTaskPri" value={editTaskForm.priority} onChange={(e) => setEditTaskForm((prev) => ({ ...prev, priority: e.target.value }))} className="flex h-10 w-full rounded-md border border-border bg-background/80 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={handleCancelEditTask}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" className="flex-1" isLoading={isPending}>Save Changes</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. Project Reminder Modal */}
      <AnimatePresence>
        {showReminderModal && selectedProjectForReminder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-lg bg-card border border-border rounded-xl p-6 relative max-h-[90vh] overflow-y-auto">
              <button onClick={() => setShowReminderModal(false)} className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-200"><X className="w-5 h-5" /></button>
              <h3 className="text-lg font-bold mb-2">Set Reminders for {selectedProjectForReminder.title}</h3>
              <p className="text-sm text-zinc-500 mb-6">Configure custom reminders for this project</p>

              <ReminderConfigPanel
                configs={selectedProjectForReminder.reminderConfigs || []}
                onConfigsChange={(configs) => {
                  setSelectedProjectForReminder((prev: any) => ({ ...prev, reminderConfigs: configs }))
                }}
                title="Project Reminders"
                description="Set reminder times for this project"
              />

              <div className="mt-6 flex gap-3">
                <Button
                  onClick={async () => {
                    startTransition(async () => {
                      // If this is a draft/new project (temp id), persist reminders to the create form
                      if (selectedProjectForReminder && selectedProjectForReminder._id === 'temp') {
                        setProjectForm((prev) => ({ ...prev, reminderConfigs: selectedProjectForReminder.reminderConfigs || [] }))
                        toast('Reminder settings saved to draft project.', 'success')
                        setShowReminderModal(false)
                        return
                      }

                      const res = await updateProjectAction(selectedProjectForReminder._id, {
                        ...selectedProjectForReminder,
                        reminderConfigs: selectedProjectForReminder.reminderConfigs
                      })
                      if (res.success) {
                        toast('Reminders updated successfully!', 'success')
                        setProjects((prev) =>
                          prev.map((p) =>
                            p._id === selectedProjectForReminder._id
                              ? { ...p, reminderConfigs: selectedProjectForReminder.reminderConfigs }
                              : p
                          )
                        )
                        if (selectedProject && selectedProject._id === selectedProjectForReminder._id) {
                          setSelectedProject({ ...selectedProject, reminderConfigs: selectedProjectForReminder.reminderConfigs })
                        }
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
