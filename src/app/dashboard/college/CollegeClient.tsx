'use client'

import React, { useState, useTransition, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, 
  Trash2, 
  Calendar, 
  Upload, 
  FileText, 
  Check, 
  X, 
  BookOpen
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { 
  createSubjectAction, 
  logSubjectAttendanceAction,
  deleteSubjectAction,
  createAssignmentAction,
  updateAssignmentStatusAction,
  deleteAssignmentAction,
  createExamAction,
  updateExamAction
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

  // State arrays
  const [subjects, setSubjects] = useState<any[]>(initialSubjects)
  const [assignments, setAssignments] = useState<any[]>(initialAssignments)
  const [exams, setExams] = useState<any[]>(initialExams)

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
  const [showAddExam, setShowAddExam] = useState(false)

  // Forms
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '' })
  const [assignmentForm, setAssignmentForm] = useState({ title: '', description: '', subjectId: '', dueDate: '', fileUrl: '' })
  const [examForm, setExamForm] = useState({ subjectId: '', examType: 'Internal', date: '', syllabus: '' })

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
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setAssignmentForm((prev) => ({ ...prev, fileUrl: data.url }))
      toast('Document uploaded successfully!', 'success')
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
        (args, tempId) => ({
          subject: {
            _id: tempId,
            ...args[0],
            attendedClasses: 0,
            totalClasses: 0,
            classNotes: [],
          }
        })
      )
      if (res.success) {
        toast('Subject added!', 'success')
        if (res.subject) {
          setSubjects((prev) => [...prev, res.subject])
          setAttendanceNotes((prev) => ({ ...prev, [res.subject._id]: '' }))
          setAttendedToday((prev) => ({ ...prev, [res.subject._id]: false }))
        }
        setSubjectForm({ name: '', code: '' })
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
        toast('Today\'s class log saved successfully.', 'success')
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
      const res = await executeAction(
        'createAssignmentAction',
        createAssignmentAction,
        [assignmentForm],
        (args, tempId) => ({
          assignment: {
            _id: tempId,
            ...args[0],
            status: 'Todo',
            createdAt: new Date().toISOString(),
          }
        })
      )
      if (res.success) {
        toast('Assignment logged!', 'success')
        // We populate the subject locally
        const matchedSub = subjects.find((s) => s._id === assignmentForm.subjectId)
        const assignmentWithPopulatedSubject = {
          ...res.assignment,
          subject: matchedSub ? { _id: matchedSub._id, name: matchedSub.name, code: matchedSub.code } : null
        }
        setAssignments((prev) => [...prev, assignmentWithPopulatedSubject])
        setAssignmentForm({ title: '', description: '', subjectId: '', dueDate: '', fileUrl: '' })
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

  // --- EXAM ACTIONS ---
  const handleAddExam = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const { executeAction } = await import('@/lib/offlineSync')
      const res = await executeAction(
        'createExamAction',
        createExamAction,
        [examForm],
        (args, tempId) => ({
          exam: {
            _id: tempId,
            ...args[0],
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
        setExamForm({ subjectId: '', examType: 'Internal', date: '', syllabus: '' })
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
      return `Today's log saved (${today.attended ? 'Attended' : 'Missed'})`
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

                      <div className="flex items-center">
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
                        <span className="font-bold text-[10px] uppercase tracking-wider text-zinc-400 block mb-1">Latest Logged Note ({new Date(lastNote.date).toLocaleDateString()}):</span>
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
                          Save Today's Log
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
                  <Label>Homework File / Attachment (PDF/Image)</Label>
                  <div className="flex gap-2">
                    <Input type="file" onChange={handleFileUpload} disabled={uploading} className="text-xs pt-1.5" />
                    <Button type="button" variant="outline" disabled={uploading} className="p-2">
                      <Upload className="w-4.5 h-4.5" />
                    </Button>
                  </div>
                </div>
                <Button type="submit" variant="primary" className="w-full" isLoading={isPending || uploading}>Save Assignment</Button>
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
                    <option value="Internal">Test (class test)</option>
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
                <Button type="submit" variant="primary" className="w-full" isLoading={isPending}>Schedule Exam</Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
