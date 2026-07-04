'use server'

import mongoose from 'mongoose'
import { auth } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import { Subject, Assignment, Exam } from '@/models/College'

export interface CollegeResponse {
  success: boolean
  message?: string
  error?: string
  subject?: any
  subjects?: any[]
  assignment?: any
  assignments?: any[]
  exam?: any
  exams?: any[]
}

// Session authentication check
async function checkAuth() {
  const session = await auth()
  if (!session || !session.user) {
    throw new Error('Unauthorized. Please log in.')
  }
  return session
}

// --- SUBJECT ACTIONS ---
export async function createSubjectAction(data: any): Promise<CollegeResponse> {
  try {
    const session = await checkAuth()
    const { name, code, credits } = data

    if (!name) {
      return { success: false, error: 'Subject name is required.' }
    }

    await dbConnect()

    const newSubject = await Subject.create({
      user: new mongoose.Types.ObjectId(session.user.id),
      name: name.trim(),
      code: code ? code.trim() : undefined,
      credits: credits ? Number(credits) : 3,
      attendedClasses: 0,
      totalClasses: 0,
    })

    return {
      success: true,
      message: 'Subject added successfully!',
      subject: JSON.parse(JSON.stringify(newSubject)),
    }
  } catch (error: any) {
    console.error('Create Subject Error:', error)
    return { success: false, error: error.message || 'Failed to add subject.' }
  }
}

export async function getSubjectsAction(): Promise<CollegeResponse> {
  try {
    const session = await checkAuth()
    await dbConnect()

    const subjects = await Subject.find({ user: session.user.id }).sort({ name: 1 })
    return {
      success: true,
      subjects: JSON.parse(JSON.stringify(subjects)),
    }
  } catch (error: any) {
    console.error('Get Subjects Error:', error)
    return { success: false, error: error.message || 'Failed to fetch subjects.' }
  }
}

export async function updateSubjectAttendanceAction(id: string, attended: number, total: number): Promise<CollegeResponse> {
  try {
    const session = await checkAuth()
    await dbConnect()

    if (attended < 0 || total < 0 || attended > total) {
      return { success: false, error: 'Invalid attendance parameters.' }
    }

    const subject = await Subject.findOne({ _id: id, user: session.user.id })
    if (!subject) {
      return { success: false, error: 'Subject not found.' }
    }

    subject.attendedClasses = attended
    subject.totalClasses = total
    await subject.save()

    return {
      success: true,
      message: 'Attendance logged!',
      subject: JSON.parse(JSON.stringify(subject)),
    }
  } catch (error: any) {
    console.error('Update Attendance Error:', error)
    return { success: false, error: error.message || 'Failed to log attendance.' }
  }
}

export async function logSubjectAttendanceAction(id: string, present: boolean, note?: string): Promise<CollegeResponse> {
  try {
    const session = await checkAuth()
    await dbConnect()

    if (!id) {
      return { success: false, error: 'Subject ID is required.' }
    }

    const subject = await Subject.findOne({ _id: id, user: session.user.id })
    if (!subject) {
      return { success: false, error: 'Subject not found.' }
    }

    const todayKey = new Date().toISOString().slice(0, 10)
    subject.classNotes = subject.classNotes || []

    const existingNote = subject.classNotes.find(
      (noteEntry: any) => new Date(noteEntry.date).toISOString().slice(0, 10) === todayKey
    )

    if (existingNote) {
      if (existingNote.attended !== present) {
        subject.attendedClasses += present ? 1 : -1
        if (subject.attendedClasses < 0) {
          subject.attendedClasses = 0
        }
      }
      existingNote.attended = present
      existingNote.note = note?.trim() || ''
      existingNote.date = new Date()
    } else {
      subject.totalClasses += 1
      if (present) {
        subject.attendedClasses += 1
      }
      subject.classNotes.push({
        date: new Date(),
        attended: present,
        note: note?.trim() || '',
      })
    }

    await subject.save()

    return {
      success: true,
      message: 'Class attendance logged.',
      subject: JSON.parse(JSON.stringify(subject)),
    }
  } catch (error: any) {
    console.error('Log Attendance Error:', error)
    return { success: false, error: error.message || 'Failed to save attendance note.' }
  }
}

export async function deleteSubjectAction(id: string): Promise<CollegeResponse> {
  try {
    const session = await checkAuth()
    await dbConnect()

    const subject = await Subject.findOne({ _id: id, user: session.user.id })
    if (!subject) {
      return { success: false, error: 'Subject not found.' }
    }

    // Cascade delete assignments and exams belonging to this subject
    await Assignment.deleteMany({ subject: id })
    await Exam.deleteMany({ subject: id })
    await subject.deleteOne()

    return {
      success: true,
      message: 'Subject removed successfully.',
    }
  } catch (error: any) {
    console.error('Delete Subject Error:', error)
    return { success: false, error: error.message || 'Failed to remove subject.' }
  }
}

// --- ASSIGNMENT ACTIONS ---
export async function createAssignmentAction(data: any): Promise<CollegeResponse> {
  try {
    const session = await checkAuth()
    const { title, description, subjectId, dueDate, fileUrl } = data

    if (!title || !subjectId || !dueDate) {
      return { success: false, error: 'Title, Subject, and Due Date are required.' }
    }

    await dbConnect()

    const newAssignment = await Assignment.create({
      user: new mongoose.Types.ObjectId(session.user.id),
      title: title.trim(),
      description,
      subject: new mongoose.Types.ObjectId(subjectId),
      dueDate: new Date(dueDate),
      status: 'Todo',
      fileUrl,
    })

    return {
      success: true,
      message: 'Assignment recorded!',
      assignment: JSON.parse(JSON.stringify(newAssignment)),
    }
  } catch (error: any) {
    console.error('Create Assignment Error:', error)
    return { success: false, error: error.message || 'Failed to add assignment.' }
  }
}

export async function getAssignmentsAction(): Promise<CollegeResponse> {
  try {
    const session = await checkAuth()
    await dbConnect()

    const assignments = await Assignment.find({ user: session.user.id })
      .populate('subject', 'name code')
      .sort({ dueDate: 1 })

    return {
      success: true,
      assignments: JSON.parse(JSON.stringify(assignments)),
    }
  } catch (error: any) {
    console.error('Get Assignments Error:', error)
    return { success: false, error: error.message || 'Failed to fetch assignments.' }
  }
}

export async function updateAssignmentStatusAction(id: string, status: 'Todo' | 'In Progress' | 'Completed', grade?: string): Promise<CollegeResponse> {
  try {
    const session = await checkAuth()
    await dbConnect()

    const assignment = await Assignment.findOne({ _id: id, user: session.user.id })
    if (!assignment) {
      return { success: false, error: 'Assignment not found.' }
    }

    assignment.status = status
    if (grade !== undefined) {
      assignment.grade = grade
    }
    await assignment.save()

    return {
      success: true,
      message: 'Assignment updated!',
      assignment: JSON.parse(JSON.stringify(assignment)),
    }
  } catch (error: any) {
    console.error('Update Assignment Error:', error)
    return { success: false, error: error.message || 'Failed to update assignment.' }
  }
}

export async function deleteAssignmentAction(id: string): Promise<CollegeResponse> {
  try {
    const session = await checkAuth()
    await dbConnect()

    await Assignment.deleteOne({ _id: id, user: session.user.id })

    return {
      success: true,
      message: 'Assignment removed.',
    }
  } catch (error: any) {
    console.error('Delete Assignment Error:', error)
    return { success: false, error: error.message || 'Failed to delete assignment.' }
  }
}

// --- EXAM ACTIONS ---
export async function createExamAction(data: any): Promise<CollegeResponse> {
  try {
    const session = await checkAuth()
    const { subjectId, examType, date, syllabus } = data

    if (!subjectId || !date) {
      return { success: false, error: 'Subject and date are required.' }
    }

    await dbConnect()

    const newExam = await Exam.create({
      user: new mongoose.Types.ObjectId(session.user.id),
      subject: new mongoose.Types.ObjectId(subjectId),
      examType,
      date: new Date(date),
      syllabus,
    })

    return {
      success: true,
      message: 'Exam scheduled!',
      exam: JSON.parse(JSON.stringify(newExam)),
    }
  } catch (error: any) {
    console.error('Create Exam Error:', error)
    return { success: false, error: error.message || 'Failed to schedule exam.' }
  }
}

export async function getExamsAction(): Promise<CollegeResponse> {
  try {
    const session = await checkAuth()
    await dbConnect()

    const exams = await Exam.find({ user: session.user.id })
      .populate('subject', 'name code')
      .sort({ date: 1 })

    return {
      success: true,
      exams: JSON.parse(JSON.stringify(exams)),
    }
  } catch (error: any) {
    console.error('Get Exams Error:', error)
    return { success: false, error: error.message || 'Failed to fetch exams.' }
  }
}

export async function updateExamAction(id: string, marksObtained?: number, maxMarks?: number): Promise<CollegeResponse> {
  try {
    const session = await checkAuth()
    await dbConnect()

    const exam = await Exam.findOne({ _id: id, user: session.user.id })
    if (!exam) {
      return { success: false, error: 'Exam details not found.' }
    }

    if (marksObtained !== undefined) exam.marksObtained = Number(marksObtained)
    if (maxMarks !== undefined) exam.maxMarks = Number(maxMarks)
    await exam.save()

    return {
      success: true,
      message: 'Exam grades updated!',
      exam: JSON.parse(JSON.stringify(exam)),
    }
  } catch (error: any) {
    console.error('Update Exam Error:', error)
    return { success: false, error: error.message || 'Failed to update grades.' }
  }
}
