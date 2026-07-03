'use client'

import React, { useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, 
  Trash2, 
  Calendar, 
  Upload, 
  FileText, 
  Calculator, 
  Percent, 
  Check, 
  X, 
  Clock, 
  AlertTriangle,
  BookOpen
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { 
  createSubjectAction, 
  updateSubjectAttendanceAction, 
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

const GRADE_POINTS: { [key: string]: number } = {
  'O': 10, 'A+': 9, 'A': 8, 'B+': 7, 'B': 6, 'C': 5, 'F': 0
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

  // Dialog triggers
  const [showAddSubject, setShowAddSubject] = useState(false)
  const [showAddAssignment, setShowAddAssignment] = useState(false)
  const [showAddExam, setShowAddExam] = useState(false)

  // Forms
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '', credits: '3' })
  const [assignmentForm, setAssignmentForm] = useState({ title: '', description: '', subjectId: '', dueDate: '', fileUrl: '' })
  const [examForm, setExamForm] = useState({ subjectId: '', examType: 'Internal', date: '', syllabus: '' })

  // File Upload State
  const [uploading, setUploading] = useState(false)

  // CGPA Grade selection state (subjectId -> letterGrade)
  const [subjectGrades, setSubjectGrades] = useState<{ [key: string]: string }>({})

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
      const res = await createSubjectAction(subjectForm)
      if (res.success) {
        toast('Subject added!', 'success')
        setSubjects((prev) => [...prev, res.subject])
        setSubjectForm({ name: '', code: '', credits: '3' })
        setShowAddSubject(false)
      } else {
        toast(res.error || 'Failed to add subject', 'error')
      }
    })
  }

  const handleUpdateAttendance = (id: string, attended: number, total: number) => {
    startTransition(async () => {
      const res = await updateSubjectAttendanceAction(id, attended, total)
      if (res.success) {
        setSubjects((prev) => prev.map((s) => (s._id === id ? res.subject : s)))
      } else {
        toast(res.error || 'Failed to log attendance', 'error')
      }
    })
  }

  const handleDeleteSubject = (id: string) => {
    if (!confirm('Warning: Deleting this subject will also delete associated assignments and exams. Continue?')) return
    startTransition(async () => {
      const res = await deleteSubjectAction(id)
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

  // --- ASSIGNMENT ACTIONS ---
  const handleAddAssignment = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const res = await createAssignmentAction(assignmentForm)
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
      const res = await updateAssignmentStatusAction(id, nextStatus)
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
      const res = await deleteAssignmentAction(id)
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
      const res = await createExamAction(examForm)
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
      const res = await updateExamAction(id, Number(marks), Number(max))
      if (res.success) {
        setExams((prev) => prev.map((ex) => (ex._id === id ? { ...ex, marksObtained: Number(marks), maxMarks: Number(max) } : ex)))
        toast('Grades logged!', 'success')
      } else {
        toast(res.error || 'Failed to update marks', 'error')
      }
    })
  }

  // --- ATTENDANCE PREDICTION LOGIC ---
  const getAttendanceMetrics = (attended: number, total: number) => {
    const percentage = total > 0 ? (attended / total) * 100 : 0
    
    if (total === 0) {
      return { percentage: 0, text: 'No classes logged yet.', color: 'text-zinc-400' }
    }

    if (percentage >= 75) {
      // safeMisses = Math.floor(attended / 0.75 - total)
      const safeMiss = Math.floor(attended / 0.75 - total)
      return {
        percentage: Math.round(percentage),
        text: safeMiss > 0 ? `You can safely miss ${safeMiss} class(es).` : 'You are exactly on the line. Attend next class!',
        color: 'text-emerald-500',
        status: 'good'
      }
    } else {
      // neededAttend = 3T - 4A
      const neededAttend = Math.max(0, 3 * total - 4 * attended)
      return {
        percentage: Math.round(percentage),
        text: `Must attend ${neededAttend} consecutive class(es) to restore 75%.`,
        color: 'text-rose-500',
        status: 'danger'
      }
    }
  }

  // --- CGPA CALCULATOR LOGIC ---
  const calculateGPA = () => {
    let totalCredits = 0
    let weightedPoints = 0

    subjects.forEach((s) => {
      const grade = subjectGrades[s._id]
      if (grade && GRADE_POINTS[grade] !== undefined) {
        totalCredits += s.credits
        weightedPoints += s.credits * GRADE_POINTS[grade]
      }
    })

    return totalCredits > 0 ? (weightedPoints / totalCredits).toFixed(2) : '0.00'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-white">College Manager</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm font-medium">Monitor attendance, track assignment pdfs, and project GPA</p>
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

      {/* Grid: Subjects/Attendance & CGPA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Attendance Tracker Column (Left spans 2) */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border-border bg-card/30">
            <CardHeader className="pb-2 border-b border-border/40 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-500">Subjects & Attendance</CardTitle>
                <CardDescription className="text-xs">Class tracking (75% baseline requirement)</CardDescription>
              </div>
              <Percent className="w-5 h-5 text-indigo-500" />
            </CardHeader>
            <CardContent className="py-4 space-y-4">
              {subjects.length === 0 ? (
                <p className="text-center text-xs text-zinc-500 italic py-8">No subjects configured. Add your college classes above.</p>
              ) : (
                subjects.map((sub) => {
                  const { percentage, text, color, status } = getAttendanceMetrics(sub.attendedClasses, sub.totalClasses)
                  return (
                    <div key={sub._id} className="p-4 rounded-lg border border-border bg-card hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex flex-col sm:flex-row justify-between gap-4">
                      
                      {/* Name / Info */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{sub.name}</h3>
                          {sub.code && <span className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-900 px-1 py-0.5 rounded border border-border">{sub.code}</span>}
                        </div>
                        <p className={`text-xs font-semibold ${color}`}>{text}</p>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Credits: {sub.credits}</p>
                      </div>

                      {/* Attendance inputs */}
                      <div className="flex items-center gap-3.5 self-end sm:self-center">
                        {/* Attendance Counter */}
                        <div className="flex items-center border border-border rounded overflow-hidden h-8.5 bg-background">
                          <button 
                            onClick={() => handleUpdateAttendance(sub._id, Math.max(0, sub.attendedClasses - 1), Math.max(0, sub.totalClasses - 1))}
                            className="px-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-extrabold cursor-pointer border-r border-border"
                          >
                            -
                          </button>
                          <span className="px-3 text-xs font-mono font-bold text-zinc-900 dark:text-white">
                            {sub.attendedClasses} / {sub.totalClasses}
                          </span>
                          <button 
                            onClick={() => handleUpdateAttendance(sub._id, sub.attendedClasses + 1, sub.totalClasses + 1)}
                            className="px-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-extrabold cursor-pointer border-l border-border"
                          >
                            +
                          </button>
                        </div>

                        {/* Direct miss log (Increments only total classes, keeping attended same) */}
                        <Button 
                          onClick={() => handleUpdateAttendance(sub._id, sub.attendedClasses, sub.totalClasses + 1)}
                          variant="ghost" 
                          size="sm" 
                          className="h-8.5 text-xs text-rose-500 border border-transparent hover:border-rose-500/20 hover:bg-rose-500/10 cursor-pointer"
                        >
                          Miss Class
                        </Button>

                        {/* Delete Subject */}
                        <button
                          onClick={() => handleDeleteSubject(sub._id)}
                          className="p-1.5 text-zinc-400 hover:text-rose-500 rounded hover:bg-rose-500/10 transition-colors cursor-pointer"
                          aria-label="Delete subject"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* CGPA Calculator Column (Right spans 1) */}
        <Card className="border-border bg-card/30 self-start">
          <CardHeader className="pb-2 border-b border-border/40">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-500">CGPA Calculator</CardTitle>
            <CardDescription className="text-xs">Estimate GPA based on course grades</CardDescription>
          </CardHeader>
          <CardContent className="py-4 space-y-4">
            {subjects.length === 0 ? (
              <p className="text-xs text-zinc-500 italic py-4 text-center">Add subjects to compute SGPA/CGPA.</p>
            ) : (
              <div className="space-y-3.5">
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {subjects.map((sub) => (
                    <div key={sub._id} className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300 truncate w-32">{sub.name}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-zinc-400 mr-2">({sub.credits} Credits)</span>
                        <select
                          value={subjectGrades[sub._id] || ''}
                          onChange={(e) => setSubjectGrades((prev) => ({ ...prev, [sub._id]: e.target.value }))}
                          className="h-8 rounded border border-border bg-background/70 text-[11px] font-bold outline-none px-1.5"
                        >
                          <option value="">Grade</option>
                          <option value="O">O (10)</option>
                          <option value="A+">A+ (9)</option>
                          <option value="A">A (8)</option>
                          <option value="B+">B+ (7)</option>
                          <option value="B">B (6)</option>
                          <option value="C">C (5)</option>
                          <option value="F">F (0)</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border/40 pt-4 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-950/20 p-3 rounded-lg border">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-zinc-400 leading-none">Weighted CGPA</p>
                    <p className="text-3xl font-extrabold font-mono text-indigo-500 mt-1">{calculateGPA()}</p>
                  </div>
                  <Calculator className="w-8 h-8 text-zinc-300 dark:text-zinc-700" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Grid: Assignments & Exams */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Assignments Checklist Card */}
        <Card className="border-border bg-card/30">
          <CardHeader className="pb-2 border-b border-border/40 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-500">Homework & Assignments</CardTitle>
              <CardDescription className="text-xs">Submission checkpoints and grades</CardDescription>
            </div>
            <FileText className="w-5 h-5 text-indigo-500" />
          </CardHeader>
          <CardContent className="py-4 space-y-2">
            {assignments.length === 0 ? (
              <p className="text-xs text-zinc-500 italic py-6 text-center">No assignments listed.</p>
            ) : (
              assignments.map((ass) => (
                <div key={ass._id} className="p-3 rounded-lg border border-border bg-card hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex justify-between items-center gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleAssignment(ass._id, ass.status)}
                      className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-all ${
                        ass.status === 'Completed'
                          ? 'bg-indigo-500 border-indigo-500 text-white'
                          : 'border-zinc-300 dark:border-zinc-700'
                      }`}
                    >
                      {ass.status === 'Completed' && <Check className="w-3 h-3 stroke-[3]" />}
                    </button>
                    <div>
                      <p className={`text-sm font-bold ${ass.status === 'Completed' ? 'line-through text-zinc-400' : 'text-zinc-950 dark:text-zinc-50'}`}>
                        {ass.title}
                      </p>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                        {ass.subject?.name || 'Coursework'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Attachment links */}
                    {ass.fileUrl && (
                      <a 
                        href={ass.fileUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-indigo-500 hover:text-indigo-400 p-1 rounded hover:bg-indigo-500/10"
                        title="View Document"
                      >
                        <FileText className="w-4.5 h-4.5" />
                      </a>
                    )}
                    
                    <span className="text-[10px] font-semibold text-zinc-400">
                      {new Date(ass.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>

                    <button 
                      onClick={() => handleDeleteAssignment(ass._id)}
                      className="text-zinc-400 hover:text-rose-500 p-1 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Exams Timelines */}
        <Card className="border-border bg-card/30">
          <CardHeader className="pb-2 border-b border-border/40 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-500">Exams Timeline</CardTitle>
              <CardDescription className="text-xs">Scheduled internal and external exams</CardDescription>
            </div>
            <Calendar className="w-5 h-5 text-indigo-500" />
          </CardHeader>
          <CardContent className="py-4 space-y-2">
            {exams.length === 0 ? (
              <p className="text-xs text-zinc-500 italic py-6 text-center">No exams scheduled.</p>
            ) : (
              exams.map((ex) => (
                <div key={ex._id} className="p-4 rounded-lg border border-border bg-card hover:border-zinc-300 dark:hover:border-zinc-700 transition-all space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-sm text-zinc-950 dark:text-zinc-100">
                        {ex.subject?.name || 'Internal Exam'}
                      </h4>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{ex.examType} Exam</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-indigo-500">
                      {new Date(ex.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  
                  {ex.syllabus && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-50/50 dark:bg-zinc-900/50 p-2 rounded border border-border/45">
                      <strong className="text-[10px] uppercase font-bold text-zinc-400 block mb-0.5">Syllabus</strong>
                      {ex.syllabus}
                    </p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

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
                <div className="space-y-1">
                  <Label htmlFor="subCredits">Credits</Label>
                  <Input id="subCredits" type="number" min="1" max="10" value={subjectForm.credits} onChange={(e) => setSubjectForm((prev) => ({ ...prev, credits: e.target.value }))} required />
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
