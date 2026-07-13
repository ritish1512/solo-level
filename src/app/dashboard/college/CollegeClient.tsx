'use client'

import React, { useState, useTransition, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, 
  Trash2, 
  Calendar, 
  Upload, 
  FileText, 
  Check, 
  X, 
  BookOpen,
  Bell,
  AlertTriangle
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { ReminderConfigPanel } from '@/components/ui/ReminderConfigPanel'
import {
  createSubjectAction,
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
  updateSubjectRemindersAction,
  requestAssignmentDeletionAction,
  confirmAssignmentDeletionAction,
  cancelAssignmentDeletionAction,
  requestExamDeletionAction,
  confirmExamDeletionAction,
  cancelExamDeletionAction
} from '@/actions/collegeActions'

interface CollegeClientProps {
  initialSubjects: any[]
  initialAssignments: any[]
  initialExams: any[]
}

export default function CollegeClient({
  initialSubjects,
  initialAssignments,
  initialExams
}: CollegeClientProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const searchParams = useSearchParams()

  // State arrays
  const [subjects, setSubjects] = useState<any[]>(initialSubjects)
  const [assignments, setAssignments] = useState<any[]>(initialAssignments)
  const [exams, setExams] = useState<any[]>(initialExams)

  // Handle deletion confirmation from URL parameters
  useEffect(() => {
    const confirmDelete = searchParams.get('confirmDelete')
    const cancelDelete = searchParams.get('cancelDelete')
    const id = searchParams.get('id')

    if (confirmDelete && id) {
      if (confirmDelete === 'assignment') {
        startTransition(async () => {
          const res = await confirmAssignmentDeletionAction(id)
          if (res.success) {
            toast('Assignment deleted successfully', 'success')
            setAssignments((prev) => prev.filter((a) => a._id !== id))
          } else {
            toast(res.error || 'Failed to delete assignment', 'error')
          }
        })
      } else if (confirmDelete === 'exam') {
        startTransition(async () => {
          const res = await confirmExamDeletionAction(id)
          if (res.success) {
            toast('Exam deleted successfully', 'success')
            setExams((prev) => prev.filter((e) => e._id !== id))
          } else {
            toast(res.error || 'Failed to delete exam', 'error')
          }
        })
      }
    } else if (cancelDelete && id) {
      if (cancelDelete === 'assignment') {
        startTransition(async () => {
          const res = await cancelAssignmentDeletionAction(id)
          if (res.success) {
            toast('Deletion request cancelled', 'success')
            setAssignments((prev) => 
              prev.map((a) => 
                a._id === id 
                  ? { ...a, deletionRequested: false, deletionRequestedAt: undefined } 
                  : a
              )
            )
          } else {
            toast(res.error || 'Failed to cancel deletion', 'error')
          }
        })
      } else if (cancelDelete === 'exam') {
        startTransition(async () => {
          const res = await cancelExamDeletionAction(id)
          if (res.success) {
            toast('Deletion request cancelled', 'success')
            setExams((prev) => 
              prev.map((e) => 
                e._id === id 
                  ? { ...e, deletionRequested: false, deletionRequestedAt: undefined } 
                  : e
              )
            )
          } else {
            toast(res.error || 'Failed to cancel deletion', 'error')
          }
        })
      }
    }
  }, [searchParams, toast])

  // Caching college states in IndexedDB for offline reliability
  useEffect(() => {
    async function loadCache() {
      try {
        const { getFromStore, saveToStore } = await import('@/lib/offlineDb')
        const cachedSubjects = await getFromStore('cache_store', 'subjects')
        if (cachedSubjects && Array.isArray(cachedSubjects)) setSubjects(cachedSubjects)
        else await saveToStore('cache_store', 'subjects', initialSubjects)

        const cachedAssignments = await getFromStore('cache_store', 'assignments')
        if (cachedAssignments && Array.isArray(cachedAssignments)) setAssignments(cachedAssignments)
        else await saveToStore('cache_store', 'assignments', initialAssignments)

        const cachedExams = await getFromStore('cache_store', 'exams')
        if (cachedExams && Array.isArray(cachedExams)) setExams(cachedExams)
        else await saveToStore('cache_store', 'exams', initialExams)
      } catch (err) {
        console.error('Failed to load college caches:', err)
      }
    }
    void loadCache()
  }, [initialSubjects, initialAssignments, initialExams])

  useEffect(() => {
    async function saveSubjects() {
      const { saveToStore } = await import('@/lib/offlineDb')
      await saveToStore('cache_store', 'subjects', subjects)
    }
    void saveSubjects()
  }, [subjects])

  useEffect(() => {
    async function saveAssignments() {
      const { saveToStore } = await import('@/lib/offlineDb')
      await saveToStore('cache_store', 'assignments', assignments)
    }
    void saveAssignments()
  }, [assignments])

  useEffect(() => {
    async function saveExams() {
      const { saveToStore } = await import('@/lib/offlineDb')
      await saveToStore('cache_store', 'exams', exams)
    }
    void saveExams()
  }, [exams])

  // Dialog triggers
  const [showAddSubject, setShowAddSubject] = useState(false)
  const [showAddAssignment, setShowAddAssignment] = useState(false)
  const [showReminderModal, setShowReminderModal] = useState(false)
  const [selectedSubjectForReminder, setSelectedSubjectForReminder] = useState<any>(null)
  const [showAddExam, setShowAddExam] = useState(false)

  // Forms
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '', reminderConfigs: [] as Array<{ enabled: boolean; reminderTime: string; message?: string; notificationType: 'email' | 'in-app' | 'both' }> })
  const [assignmentForm, setAssignmentForm] = useState({ title: '', description: '', subjectId: '', dueDate: '', fileUrl: '', fileLink: '', useLink: false })
  const [examForm, setExamForm] = useState({ subjectId: '', examType: 'Internal', date: '', syllabus: '', fileUrl: '', fileLink: '', useLink: false })
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null)
  const [editingExamId, setEditingExamId] = useState<string | null>(null)

  const assignmentFileInputRef = useRef<HTMLInputElement>(null)
  const examFileInputRef = useRef<HTMLInputElement>(null)

  // File Upload State
  const [uploading, setUploading] = useState(false)

  // Attendance notes keyed by subject
  const [attendanceNotes, setAttendanceNotes] = useState<{ [key: string]: string }>(() => {
    const notes: { [key: string]: string } = {}
    initialSubjects.forEach((sub) => {
      const today = sub.classNotes?.find(
        (noteEntry: any) => new Date(noteEntry.date).toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10)
      )
      notes[sub._id] = today?.note || ''
    })
    return notes
  })

  // Attended today checkbox states
  const [attendedToday, setAttendedToday] = useState<{ [key: string]: boolean }>(() => {
    const states: { [key: string]: boolean } = {}
    initialSubjects.forEach((sub) => {
      const today = sub.classNotes?.find(
        (noteEntry: any) => new Date(noteEntry.date).toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10)
      )
      states[sub._id] = today?.attended || false
    })
    return states
  })

  // --- FILE UPLOADER TO CLOUDINARY PROXY ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'assignment' | 'exam') => {
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

      if (!res.ok) throw new Error('Upload request failed.')
      
      const data = await res.json()
      if (target === 'assignment') {
        setAssignmentForm((prev) => ({ ...prev, fileUrl: data.url, fileLink: '', useLink: false }))
      } else {
        setExamForm((prev) => ({ ...prev, fileUrl: data.url, fileLink: '', useLink: false }))
      }
      toast('File uploaded successfully!', 'success')
    } catch (err) {
      console.error(err)
      toast('Failed to upload file. Check console.', 'error')
    } finally {
      setUploading(false)
    }
  }

  // --- SUBJECT ACTIONS ---
  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const { executeAction } = await import('@/lib/offlineSync')
      const res = await executeAction(
        'createSubjectAction',
        createSubjectAction,
        [subjectForm],
        (args, tempId) => {
          const input = args[0]
          const subjectInput = typeof input === 'object' && input !== null ? input as Record<string, unknown> : {}

          return {
            subject: {
              _id: tempId,
              ...subjectInput,
              attendedClasses: 0,
              totalClasses: 0,
              classNotes: [],
            }
          }
        }
      )
      if (res.success) {
        toast('Subject added!', 'success')
        const optimisticSubject = res.subject as { _id: string } | undefined
        if (optimisticSubject) {
          setSubjects((prev) => [...prev, optimisticSubject as never])
          setAttendanceNotes((prev) => ({ ...prev, [optimisticSubject._id]: '' }))
          setAttendedToday((prev) => ({ ...prev, [optimisticSubject._id]: false }))
        }
        setSubjectForm({ name: '', code: '', reminderConfigs: [] })
        setShowAddSubject(false)
      } else {
        toast(res.error || 'Failed to add subject', 'error')
      }
    })
  }

  const handleDeleteSubject = (id: string) => {
    if (!confirm('Warning: Deleting this subject will also delete associated assignments and exams. Continue?')) return
    startTransition(async () => {
      const { executeAction } = await import('@/lib/offlineSync')
      const res = await executeAction(
        'deleteSubjectAction',
        deleteSubjectAction,
        [id],
        () => ({ success: true })
      )
      if (res.success) {
        toast(res.message || 'Subject deleted', 'info')
        setSubjects((prev) => prev.filter((s) => s._id !== id))
        setAssignments((prev) => prev.filter((a) => a.subject?._id !== id && a.subject !== id))
        setExams((prev) => prev.filter((ex) => ex.subject?._id !== id && ex.subject !== id))
      } else {
        toast(res.error || 'Failed to delete subject', 'error')
      }
    })
  }

  const handleSaveClassLog = (id: string) => {
    startTransition(async () => {
      const attended = attendedToday[id] || false
      const note = attendanceNotes[id]?.trim() || ''

      const { executeAction } = await import('@/lib/offlineSync')
      const res = await executeAction(
        'logSubjectAttendanceAction',
        logSubjectAttendanceAction,
        [id, attended, note],
        (args) => {
          const sub = subjects.find(s => s._id === args[0])
          const todayStr = new Date().toISOString().slice(0, 10)
          const oldLog = sub?.classNotes?.find((n: any) => new Date(n.date).toISOString().slice(0, 10) === todayStr)
          
          let attendedDiff = 0
          let totalDiff = 0
          let newNotes = sub?.classNotes ? [...sub.classNotes] : []

          if (oldLog) {
            if (oldLog.attended !== args[1]) {
              attendedDiff = args[1] ? 1 : -1
            }
            newNotes = newNotes.map((n: any) => 
              new Date(n.date).toISOString().slice(0, 10) === todayStr 
                ? { ...n, attended: args[1], note: args[2], date: new Date() } 
                : n
            )
          } else {
            totalDiff = 1
            attendedDiff = args[1] ? 1 : 0
            newNotes.push({ date: new Date(), attended: args[1], note: args[2] })
          }

          return {
            subject: {
              ...sub,
              attendedClasses: Math.max(0, (sub?.attendedClasses || 0) + attendedDiff),
              totalClasses: (sub?.totalClasses || 0) + totalDiff,
              classNotes: newNotes,
            }
          }
        }
      )
      if (res.success) {
        toast('Today&apos;s class log saved successfully.', 'success')
        if (res.subject) {
          setSubjects((prev) => prev.map((s) => (s._id === id ? res.subject : s)))
        }
      } else {
        toast(res.error || 'Failed to save log', 'error')
      }
    })
  }

  // --- ASSIGNMENT ACTIONS ---
  const handleAddAssignment = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const { executeAction } = await import('@/lib/offlineSync')
      const payload = {
        title: assignmentForm.title,
        description: assignmentForm.description,
        subjectId: assignmentForm.subjectId,
        dueDate: assignmentForm.dueDate,
        fileUrl: assignmentForm.useLink ? assignmentForm.fileLink : assignmentForm.fileUrl,
      }

      if (editingAssignmentId) {
        const res = await executeAction(
          'updateAssignmentAction',
          updateAssignmentAction,
          [editingAssignmentId, payload],
          () => ({ success: true })
        )
        if (res.success) {
          toast('Assignment updated!', 'success')
          setAssignments((prev) => prev.map((a) => (a._id === editingAssignmentId ? { ...a, ...payload, title: payload.title, description: payload.description, dueDate: payload.dueDate } : a)))
          setEditingAssignmentId(null)
          setAssignmentForm({ title: '', description: '', subjectId: '', dueDate: '', fileUrl: '', fileLink: '', useLink: false })
          setShowAddAssignment(false)
        } else {
          toast(res.error || 'Failed to update assignment', 'error')
        }
        return
      }

      const res = await executeAction(
        'createAssignmentAction',
        createAssignmentAction,
        [payload],
        (args, tempId) => ({
          assignment: {
            _id: tempId,
            ...(args[0] as Record<string, unknown>),
            status: 'Todo',
            createdAt: new Date().toISOString(),
          }
        })
      )
      if (res.success) {
        toast('Assignment logged!', 'success')
        const matchedSub = subjects.find((s) => s._id === assignmentForm.subjectId)
        const assignmentWithPopulatedSubject = {
          ...res.assignment,
          subject: matchedSub ? { _id: matchedSub._id, name: matchedSub.name, code: matchedSub.code } : null
        }
        setAssignments((prev) => [...prev, assignmentWithPopulatedSubject])
        setAssignmentForm({ title: '', description: '', subjectId: '', dueDate: '', fileUrl: '', fileLink: '', useLink: false })
        setShowAddAssignment(false)
      } else {
        toast(res.error || 'Failed to record assignment', 'error')
      }
    })
  }

  const handleToggleAssignment = (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'Completed' ? 'Todo' : 'Completed'
    startTransition(async () => {
      const { executeAction } = await import('@/lib/offlineSync')
      const res = await executeAction(
        'updateAssignmentStatusAction',
        updateAssignmentStatusAction,
        [id, nextStatus],
        () => ({ success: true })
      )
      if (res.success) {
        setAssignments((prev) =>
          prev.map((a) => (a._id === id ? { ...a, status: nextStatus } : a))
        )
      } else {
        toast(res.error || 'Failed to update assignment', 'error')
      }
    })
  }

  const handleDeleteAssignment = (id: string) => {
    const assignment = assignments.find((a) => a._id === id)
    const isPastDue = assignment && new Date(assignment.dueDate) < new Date()

    if (isPastDue) {
      // Request deletion confirmation for past-due assignments
      startTransition(async () => {
        const res = await requestAssignmentDeletionAction(id)
        if (res.success) {
          toast('Deletion confirmation requested. Please check your email.', 'success')
          setAssignments((prev) => 
            prev.map((a) => 
              a._id === id 
                ? { ...a, deletionRequested: true, deletionRequestedAt: new Date() } 
                : a
            )
          )
        } else {
          toast(res.error || 'Failed to request deletion', 'error')
        }
      })
    } else {
      // Direct delete for non-past-due assignments
      startTransition(async () => {
        const { executeAction } = await import('@/lib/offlineSync')
        const res = await executeAction(
          'deleteAssignmentAction',
          deleteAssignmentAction,
          [id],
          () => ({ success: true })
        )
        if (res.success) {
          setAssignments((prev) => prev.filter((a) => a._id !== id))
          toast('Assignment deleted.', 'info')
        } else {
          toast(res.error || 'Failed to delete assignment', 'error')
        }
      })
    }
  }

  const handleEditAssignment = (assignment: any) => {
    setEditingAssignmentId(assignment._id)
    setAssignmentForm({
      title: assignment.title || '',
      description: assignment.description || '',
      subjectId: assignment.subject?._id || assignment.subject || '',
      dueDate: assignment.dueDate ? new Date(assignment.dueDate).toISOString().slice(0, 10) : '',
      fileUrl: assignment.fileUrl || '',
      fileLink: assignment.fileUrl || '',
      useLink: false,
    })
    setShowAddAssignment(true)
  }

  const handleDeleteExam = (id: string) => {
    const exam = exams.find((e) => e._id === id)
    const isPastDue = exam && new Date(exam.date) < new Date()

    if (isPastDue) {
      startTransition(async () => {
        const res = await requestExamDeletionAction(id)
        if (res.success) {
          toast('Deletion confirmation requested. Please check your email.', 'success')
          setExams((prev) => 
            prev.map((e) => 
              e._id === id 
                ? { ...e, deletionRequested: true, deletionRequestedAt: new Date() } 
                : e
            )
          )
        } else {
          toast(res.error || 'Failed to request deletion', 'error')
        }
      })
    } else {
      startTransition(async () => {
        const { executeAction } = await import('@/lib/offlineSync')
        const res = await executeAction(
          'deleteExamAction',
          deleteExamAction,
          [id],
          () => ({ success: true })
        )
        if (res.success) {
          setExams((prev) => prev.filter((e) => e._id !== id))
          toast('Exam deleted.', 'info')
        } else {
          toast(res.error || 'Failed to delete exam', 'error')
        }
      })
    }
  }

  const handleEditExam = (exam: any) => {
    setEditingExamId(exam._id)
    setExamForm({
      subjectId: exam.subject?._id || exam.subject || '',
      examType: exam.examType || 'Internal',
      date: exam.date ? new Date(exam.date).toISOString().slice(0, 10) : '',
      syllabus: exam.syllabus || '',
      fileUrl: exam.fileUrl || '',
      fileLink: exam.fileUrl || '',
      useLink: false,
    })
    setShowAddExam(true)
  }

  // --- EXAM ACTIONS ---
  const handleAddExam = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const { executeAction } = await import('@/lib/offlineSync')
      const payload = {
        subjectId: examForm.subjectId,
        examType: examForm.examType,
        date: examForm.date,
        syllabus: examForm.syllabus,
        fileUrl: examForm.useLink ? examForm.fileLink : examForm.fileUrl,
      }

      if (editingExamId) {
        const res = await executeAction(
          'updateExamDetailsAction',
          updateExamDetailsAction,
          [editingExamId, payload],
          () => ({ success: true })
        )
        if (res.success) {
          toast('Exam updated!', 'success')
          setExams((prev) => prev.map((ex) => ex._id === editingExamId ? { ...ex, ...payload, examType: payload.examType, date: payload.date } : ex))
          setEditingExamId(null)
          setExamForm({ subjectId: '', examType: 'Internal', date: '', syllabus: '', fileUrl: '', fileLink: '', useLink: false })
          setShowAddExam(false)
        } else {
          toast(res.error || 'Failed to update exam', 'error')
        }
        return
      }

      const res = await executeAction(
        'createExamAction',
        createExamAction,
        [payload],
        (args, tempId) => ({
          exam: {
            _id: tempId,
            ...(args[0] as Record<string, unknown>),
            createdAt: new Date().toISOString(),
          }
        })
      )
      if (res.success) {
        toast('Exam scheduled!', 'success')
        const matchedSub = subjects.find((s) => s._id === examForm.subjectId)
        const examWithPopulatedSubject = {
          ...res.exam,
          subject: matchedSub ? { _id: matchedSub._id, name: matchedSub.name, code: matchedSub.code } : null
        }
        setExams((prev) => [...prev, examWithPopulatedSubject])
        setExamForm({ subjectId: '', examType: 'Internal', date: '', syllabus: '', fileUrl: '', fileLink: '', useLink: false })
        setShowAddExam(false)
      } else {
        toast(res.error || 'Failed to schedule exam', 'error')
      }
    })
  }

  const handleUpdateExamMarks = (id: string, marks: string, max: string) => {
    startTransition(async () => {
      const { executeAction } = await import('@/lib/offlineSync')
      const res = await executeAction(
        'updateExamAction',
        updateExamAction,
        [id, Number(marks), Number(max)],
        (args) => ({
          exam: {
            marksObtained: args[1],
            maxMarks: args[2],
          }
        })
      )
      if (res.success) {
        setExams((prev) => prev.map((ex) => (ex._id === id ? { ...ex, marksObtained: Number(marks), maxMarks: Number(max) } : ex)))
        toast('Grades logged!', 'success')
      } else {
        toast(res.error || 'Failed to update marks', 'error')
      }
    })
  }

  const getTodayAttendance = (subject: any) => {
    const todayKey = new Date().toISOString().slice(0, 10)
    const notes = subject.classNotes || []
    return notes.find((note: any) => new Date(note.date).toISOString().slice(0, 10) === todayKey) || null
  }

  const getLastNote = (subject: any) => {
    const notes = subject.classNotes || []
    return notes.length ? notes[notes.length - 1] : null
  }

  const getLastLogInfo = (subject: any) => {
    const today = getTodayAttendance(subject)
    if (today) {
      return `Today&apos;s log saved (${today.attended ? 'Attended' : 'Missed'})`
    }
    const last = getLastNote(subject)
    if (last) {
      const dateStr = new Date(last.date).toLocaleDateString([], { month: 'short', day: 'numeric' })
      return `Last log: ${dateStr} (${last.attended ? 'Attended' : 'Missed'})`
    }
    return 'No class note recorded yet.'
  }

  const timelineEntries = [
    ...assignments.map((ass) => ({
      id: ass._id,
      type: 'Assignment' as const,
      title: ass.title,
      subject: ass.subject?.name || 'Coursework',
      date: new Date(ass.dueDate),
      status: ass.status,
      description: ass.description,
      fileUrl: ass.fileUrl,
    })),
    ...exams.map((ex) => ({
      id: ex._id,
      type: 'Exam' as const,
      title: `${ex.subject?.name || 'Course'} ${ex.examType} Exam`,
      subject: ex.subject?.name || 'Coursework',
      date: new Date(ex.date),
      status: ex.marksObtained !== undefined ? 'Graded' : 'Scheduled',
      description: ex.syllabus,
      marksObtained: ex.marksObtained,
      maxMarks: ex.maxMarks,
      fileUrl: ex.fileUrl,
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime())

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-white">College Manager</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm font-medium">Track subjects, log today’s class activities, and manage a unified timetable.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowAddSubject(true)} variant="outline" size="sm" className="gap-1.5 h-8.5 cursor-pointer">
            <Plus className="w-4 h-4" /> Subject
          </Button>
          <Button onClick={() => setShowAddAssignment(true)} variant="outline" size="sm" className="gap-1.5 h-8.5 cursor-pointer">
            <Plus className="w-4 h-4" /> Assignment
          </Button>
          <Button onClick={() => setShowAddExam(true)} variant="outline" size="sm" className="gap-1.5 h-8.5 cursor-pointer">
            <Plus className="w-4 h-4" /> Exam
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <Card className="border-border bg-card/30">
          <CardHeader className="pb-2 border-b border-border/40 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-500">My Course Subjects</CardTitle>
              <CardDescription className="text-xs">Select if you attended today and write a short study note</CardDescription>
            </div>
            <BookOpen className="w-5 h-5 text-indigo-500" />
          </CardHeader>
          <CardContent className="py-4 space-y-4">
            {subjects.length === 0 ? (
              <p className="text-center text-xs text-zinc-500 italic py-8">No subjects configured. Add your course list above.</p>
            ) : (
              subjects.map((sub) => {
                const lastNote = getLastNote(sub)
                const isAttended = attendedToday[sub._id] ?? false

                return (
                  <div key={sub._id} className="space-y-4 rounded-2xl border border-border bg-background p-4 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-zinc-950 dark:text-zinc-100">{sub.name}</h3>
                          {sub.code && (
                            <span className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-900 px-1.5 py-0.5 rounded border border-border">
                              {sub.code}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Button
                          onClick={() => {
                            setSelectedSubjectForReminder(sub)
                            setShowReminderModal(true)
                          }}
                          size="sm"
                          variant="ghost"
                          className="text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20"
                        >
                          <Bell className="h-4 w-4" />
                        </Button>
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-zinc-600 dark:text-zinc-400 select-none">
                          <input
                            type="checkbox"
                            checked={isAttended}
                            onChange={(e) => setAttendedToday((prev) => ({ ...prev, [sub._id]: e.target.checked }))}
                            className="h-4.5 w-4.5 rounded border-zinc-300 dark:border-zinc-700 bg-background text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          Attended today?
                        </label>
                      </div>
                    </div>

                    <AnimatePresence initial={false}>
                      {isAttended && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden space-y-2"
                        >
                          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">What happened in class? (Study focus for this evening)</label>
                          <textarea
                            value={attendanceNotes[sub._id] || ''}
                            onChange={(e) => setAttendanceNotes((prev) => ({ ...prev, [sub._id]: e.target.value }))}
                            rows={3}
                            placeholder="Topics discussed, assignments set, what to read tonight..."
                            className="w-full rounded-md border border-border bg-background/50 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {lastNote && (
                      <div className="bg-zinc-50 dark:bg-zinc-900/50 p-2.5 rounded-lg border border-border/60 text-xs text-zinc-600 dark:text-zinc-400">
                        <span className="font-bold text-[10px] uppercase tracking-wider text-zinc-400 block mb-1" suppressHydrationWarning>
                          Latest Logged Note ({new Date(lastNote.date).toLocaleDateString()}):
                        </span>
                        <p className="italic">{lastNote.note || 'Attended with no written study note.'}</p>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-3">
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => handleSaveClassLog(sub._id)} 
                          size="sm" 
                          variant="secondary"
                          isLoading={isPending}
                        >
                          Save Today&apos;s Log
                        </Button>
                        <Button onClick={() => handleDeleteSubject(sub._id)} size="sm" variant="destructive">
                          Remove Subject
                        </Button>
                      </div>
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.14em]">
                        {getLastLogInfo(sub)}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card/30">
        <CardHeader className="pb-2 border-b border-border/40 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-500">Unified Timetable</CardTitle>
            <CardDescription className="text-xs">Homework, exams, and upcoming deadlines in one place</CardDescription>
          </div>
          <Calendar className="w-5 h-5 text-indigo-500" />
        </CardHeader>
        <CardContent className="py-4 space-y-3">
          {timelineEntries.length === 0 ? (
            <p className="text-xs text-zinc-500 italic py-6 text-center">No coursework or exams scheduled.</p>
          ) : (
            timelineEntries.map((item) => (
              <div key={item.id} className="rounded-2xl border border-border bg-background p-4 transition-all hover:border-zinc-300 dark:hover:border-zinc-700">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${item.type === 'Assignment' ? 'bg-indigo-500/10 text-indigo-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                        {item.type}
                      </span>
                      <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-100">{item.title}</h3>
                    </div>
                    <p className="text-[11px] text-zinc-500">{item.subject}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-400">{item.status}</span>
                    <span className="text-xs font-semibold text-zinc-500">
                      {item.date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                {item.description && (
                  <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">{item.description}</p>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {item.type === 'Assignment' && (
                    <>
                      <Button
                        onClick={() => handleToggleAssignment(item.id, item.status)}
                        size="sm"
                        variant={item.status === 'Completed' ? 'secondary' : 'outline'}
                      >
                        {item.status === 'Completed' ? 'Mark Todo' : 'Mark Completed'}
                      </Button>
                      <Button onClick={() => handleEditAssignment(item)} size="sm" variant="secondary">
                        Edit
                      </Button>
                      <Button onClick={() => handleDeleteAssignment(item.id)} size="sm" variant="destructive">
                        Delete
                      </Button>
                      {item.fileUrl && (
                        <a
                          href={item.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-indigo-500 hover:text-indigo-400"
                        >
                          View attachment
                        </a>
                      )}
                    </>
                  )}
                  {item.type === 'Exam' && (
                    <>
                      <Button onClick={() => handleEditExam(item)} size="sm" variant="secondary">
                        Edit
                      </Button>
                      <Button onClick={() => handleDeleteExam(item.id)} size="sm" variant="destructive">
                        Delete
                      </Button>
                      {item.fileUrl && (
                        <a
                          href={item.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-indigo-500 hover:text-indigo-400"
                        >
                          View attachment
                        </a>
                      )}
                    </>
                  )}
                  {item.type === 'Exam' && item.marksObtained !== undefined && (
                    <span className="rounded-full bg-zinc-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
                      Score: {item.marksObtained}/{item.maxMarks ?? '-'}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* --- FORMS POPUPS MODALS OVERLAYS --- */}
      
      {/* 1. Add Subject Modal */}
      <AnimatePresence>
        {showAddSubject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-sm bg-card border border-border rounded-xl p-6 relative">
              <button onClick={() => setShowAddSubject(false)} className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-200"><X className="w-5 h-5" /></button>
              <h3 className="text-lg font-bold mb-4">Add Course Subject</h3>
              <form onSubmit={handleAddSubject} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="subName">Subject Name</Label>
                  <Input id="subName" type="text" placeholder="e.g. Data Structures" value={subjectForm.name} onChange={(e) => setSubjectForm((prev) => ({ ...prev, name: e.target.value }))} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="subCode">Subject Code</Label>
                  <Input id="subCode" type="text" placeholder="e.g. CS102" value={subjectForm.code} onChange={(e) => setSubjectForm((prev) => ({ ...prev, code: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Daily Class Reminders</Label>
                  <ReminderConfigPanel
                    configs={subjectForm.reminderConfigs}
                    onConfigsChange={(configs) => setSubjectForm((prev) => ({ ...prev, reminderConfigs: configs }))}
                  />
                </div>
                <Button type="submit" variant="primary" className="w-full" isLoading={isPending}>Add Subject</Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Add Assignment Modal */}
      <AnimatePresence>
        {showAddAssignment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-md bg-card border border-border rounded-xl p-6 relative">
              <button onClick={() => setShowAddAssignment(false)} className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-200"><X className="w-5 h-5" /></button>
              <h3 className="text-lg font-bold mb-4">Add Assignment</h3>
              <form onSubmit={handleAddAssignment} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="assTitle">Assignment Title</Label>
                  <Input id="assTitle" type="text" placeholder="e.g. Homework 2" value={assignmentForm.title} onChange={(e) => setAssignmentForm((prev) => ({ ...prev, title: e.target.value }))} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="assDesc">Description</Label>
                  <Input id="assDesc" type="text" placeholder="Quick details..." value={assignmentForm.description} onChange={(e) => setAssignmentForm((prev) => ({ ...prev, description: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="assSub">Subject</Label>
                  <select id="assSub" value={assignmentForm.subjectId} onChange={(e) => setAssignmentForm((prev) => ({ ...prev, subjectId: e.target.value }))} required className="flex h-10 w-full rounded-md border border-border bg-background/70 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <option value="">Select subject</option>
                    {subjects.map((s) => (
                      <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="assDue">Due Date</Label>
                  <Input id="assDue" type="date" value={assignmentForm.dueDate} onChange={(e) => setAssignmentForm((prev) => ({ ...prev, dueDate: e.target.value }))} required />
                </div>
                {/* File upload proxy */}
                <div className="space-y-1">
                  <Label>Attachment</Label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setAssignmentForm((prev) => ({ ...prev, useLink: false }))}
                      className={`rounded-full border px-3 py-1 text-sm ${assignmentForm.useLink ? 'border-zinc-300 bg-background text-zinc-700' : 'border-indigo-500 bg-indigo-500/10 text-indigo-600'}`}
                    >
                      Upload file
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssignmentForm((prev) => ({ ...prev, useLink: true }))}
                      className={`rounded-full border px-3 py-1 text-sm ${assignmentForm.useLink ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600' : 'border-zinc-300 bg-background text-zinc-700'}`}
                    >
                      Add link
                    </button>
                  </div>
                  {assignmentForm.useLink ? (
                    <Input
                      type="url"
                      placeholder="https://example.com/assignment"
                      value={assignmentForm.fileLink}
                      onChange={(e) => setAssignmentForm((prev) => ({ ...prev, fileLink: e.target.value }))}
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        ref={assignmentFileInputRef}
                        type="file"
                        accept="application/pdf,image/*"
                        onChange={(e) => handleFileUpload(e, 'assignment')}
                        disabled={uploading}
                        className="hidden"
                        id="assignment-file-upload"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={uploading}
                        onClick={() => assignmentFileInputRef.current?.click()}
                      >
                        <Upload className="w-4.5 h-4.5" />
                        {uploading ? 'Uploading...' : 'Upload file'}
                      </Button>
                    </div>
                  )}
                  {(assignmentForm.fileUrl && !assignmentForm.useLink) || (assignmentForm.fileLink && assignmentForm.useLink) ? (
                    <p className="text-xs text-zinc-500">
                      {assignmentForm.useLink ? 'Link added.' : 'Uploaded file attached.'}
                    </p>
                  ) : null}
                </div>
                <Button type="submit" variant="primary" className="w-full" isLoading={isPending || uploading}>{editingAssignmentId ? 'Update Assignment' : 'Save Assignment'}</Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Add Exam Modal */}
      <AnimatePresence>
        {showAddExam && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-md bg-card border border-border rounded-xl p-6 relative">
              <button onClick={() => setShowAddExam(false)} className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-200"><X className="w-5 h-5" /></button>
              <h3 className="text-lg font-bold mb-4">Schedule Exam</h3>
              <form onSubmit={handleAddExam} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="exSub">Subject</Label>
                  <select id="exSub" value={examForm.subjectId} onChange={(e) => setExamForm((prev) => ({ ...prev, subjectId: e.target.value }))} required className="flex h-10 w-full rounded-md border border-border bg-background/70 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <option value="">Select subject</option>
                    {subjects.map((s) => (
                      <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="exType">Exam Type</Label>
                  <select id="exType" value={examForm.examType} onChange={(e) => setExamForm((prev) => ({ ...prev, examType: e.target.value as any }))} className="flex h-10 w-full rounded-md border border-border bg-background/70 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <option value="Test">Test (class test)</option>
                    <option value="Internal">Internal (Midterm)</option>
                    <option value="Semester">Semester (Finals)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="exDate">Exam Date</Label>
                  <Input id="exDate" type="date" value={examForm.date} onChange={(e) => setExamForm((prev) => ({ ...prev, date: e.target.value }))} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="exSyllabus">Syllabus Details</Label>
                  <textarea id="exSyllabus" placeholder="Chapters, topics..." value={examForm.syllabus} onChange={(e) => setExamForm((prev) => ({ ...prev, syllabus: e.target.value }))} className="flex w-full rounded-md border border-border bg-background/50 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 outline-none focus-visible:ring-2 focus-visible:ring-ring" rows={3} />
                </div>
                <div className="space-y-1">
                  <Label>Attachment</Label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setExamForm((prev) => ({ ...prev, useLink: false }))}
                      className={`rounded-full border px-3 py-1 text-sm ${examForm.useLink ? 'border-zinc-300 bg-background text-zinc-700' : 'border-indigo-500 bg-indigo-500/10 text-indigo-600'}`}
                    >
                      Upload file
                    </button>
                    <button
                      type="button"
                      onClick={() => setExamForm((prev) => ({ ...prev, useLink: true }))}
                      className={`rounded-full border px-3 py-1 text-sm ${examForm.useLink ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600' : 'border-zinc-300 bg-background text-zinc-700'}`}
                    >
                      Add link
                    </button>
                  </div>
                  {examForm.useLink ? (
                    <Input
                      type="url"
                      placeholder="https://example.com/exam-syllabus"
                      value={examForm.fileLink}
                      onChange={(e) => setExamForm((prev) => ({ ...prev, fileLink: e.target.value }))}
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        ref={examFileInputRef}
                        type="file"
                        accept="application/pdf,image/*"
                        onChange={(e) => handleFileUpload(e, 'exam')}
                        disabled={uploading}
                        className="hidden"
                        id="exam-file-upload"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={uploading}
                        onClick={() => examFileInputRef.current?.click()}
                      >
                        <Upload className="w-4.5 h-4.5" />
                        {uploading ? 'Uploading...' : 'Upload file'}
                      </Button>
                    </div>
                  )}
                  {(examForm.fileUrl && !examForm.useLink) || (examForm.fileLink && examForm.useLink) ? (
                    <p className="text-xs text-zinc-500">
                      {examForm.useLink ? 'Link added.' : 'Uploaded file attached.'}
                    </p>
                  ) : null}
                </div>
                <Button type="submit" variant="primary" className="w-full" isLoading={isPending}>{editingExamId ? 'Update Exam' : 'Schedule Exam'}</Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. Subject Reminder Modal */}
      <AnimatePresence>
        {showReminderModal && selectedSubjectForReminder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-lg bg-card border border-border rounded-xl p-6 relative max-h-[90vh] overflow-y-auto">
              <button onClick={() => setShowReminderModal(false)} className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-200"><X className="w-5 h-5" /></button>
              <h3 className="text-lg font-bold mb-2">Set Reminders for {selectedSubjectForReminder.name}</h3>
              <p className="text-sm text-zinc-500 mb-6">Configure reminders for assignments, tests, internals, and semester exams</p>

              <ReminderConfigPanel
                configs={selectedSubjectForReminder.reminderConfigs || []}
                onConfigsChange={(configs) => {
                  setSelectedSubjectForReminder((prev: any) => ({ ...prev, reminderConfigs: configs }))
                }}
                title="Subject Reminders"
                description="Set reminder times for this subject"
              />

              <div className="mt-6 flex gap-3">
                <Button
                  onClick={async () => {
                    startTransition(async () => {
                      const res = await updateSubjectRemindersAction(
                        selectedSubjectForReminder._id,
                        selectedSubjectForReminder.reminderConfigs
                      )
                      if (res.success) {
                        toast('Reminders updated successfully!', 'success')
                        setSubjects((prev) =>
                          prev.map((s) =>
                            s._id === selectedSubjectForReminder._id
                              ? { ...s, reminderConfigs: selectedSubjectForReminder.reminderConfigs }
                              : s
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
