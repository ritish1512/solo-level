'use server'

import mongoose from 'mongoose'
import { auth } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import { Subject, Assignment, Exam } from '@/models/College'
import {
  createAssignmentReminders,
  deleteAssignmentReminders,
  createExamReminders,
  deleteExamReminders,
  createSubjectReminders,
  deleteSubjectReminders,
  updateSubjectReminders,
  generateAutoReminders
} from '@/services/reminderService'
import { sendDeletionConfirmationEmail } from '@/services/emailService'

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
    const { name, code, credits, reminderConfigs } = data

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
      reminderConfigs: reminderConfigs || [],
    })

    // Create reminder documents if reminder configs provided
    if (reminderConfigs && reminderConfigs.length > 0) {
      // Convert reminderTime strings to Date objects
      const configsForService = reminderConfigs.map((config: any) => ({
        ...config,
        reminderTime: new Date(config.reminderTime),
      }))
      await createSubjectReminders(newSubject._id.toString(), configsForService)
    }

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

    // Delete subject reminders
    await deleteSubjectReminders(id)

    // Cascade delete assignments and exams belonging to this subject, including their reminders
    const assignments = await Assignment.find({ subject: id })
    for (const a of assignments) {
      await deleteAssignmentReminders(a._id.toString())
    }
    const exams = await Exam.find({ subject: id })
    for (const e of exams) {
      await deleteExamReminders(e._id.toString())
    }

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

    const dueDateObj = new Date(dueDate)
    const newAssignment = await Assignment.create({
      user: new mongoose.Types.ObjectId(session.user.id),
      title: title.trim(),
      description,
      subject: new mongoose.Types.ObjectId(subjectId),
      dueDate: dueDateObj,
      status: 'Todo',
      fileUrl,
    })

    // Generate automatic reminders (1 week before, 1 day before, on the day)
    const autoReminders = generateAutoReminders(dueDateObj, 'assignment')
    if (autoReminders.length > 0) {
      await createAssignmentReminders(newAssignment._id.toString(), autoReminders)
    }

    return {
      success: true,
      message: `Assignment recorded! You'll receive automatic reminders 1 week before, 1 day before, and on the due date.`,
      assignment: JSON.parse(JSON.stringify(newAssignment)),
    }
  } catch (error: any) {
    console.error('Create Assignment Error:', error)
    return { success: false, error: error.message || 'Failed to add assignment.' }
  }
}

export async function updateAssignmentAction(id: string, data: any): Promise<CollegeResponse> {
  try {
    const session = await checkAuth()
    const { title, description, subjectId, dueDate, fileUrl } = data

    await dbConnect()

    const assignment = await Assignment.findOne({ _id: id, user: session.user.id })
    if (!assignment) {
      return { success: false, error: 'Assignment not found.' }
    }

    if (title) assignment.title = title.trim()
    if (description !== undefined) assignment.description = description
    if (subjectId) assignment.subject = new mongoose.Types.ObjectId(subjectId)
    if (dueDate) assignment.dueDate = new Date(dueDate)
    if (fileUrl !== undefined) assignment.fileUrl = fileUrl

    if (assignment.dueDate > new Date() && assignment.deletionRequested) {
      assignment.deletionRequested = false
      assignment.deletionRequestedAt = undefined
      assignment.deletionConfirmed = false
      assignment.deletionConfirmedAt = undefined
    }

    await assignment.save()

    await deleteAssignmentReminders(id)
    if (assignment.status !== 'Completed') {
      await createAssignmentReminders(id)
    }

    return {
      success: true,
      message: 'Assignment updated successfully.',
      assignment: JSON.parse(JSON.stringify(assignment)),
    }
  } catch (error: any) {
    console.error('Update Assignment Error:', error)
    return { success: false, error: error.message || 'Failed to update assignment.' }
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

    // Delete reminders if completed, or re-create them if reopened
    if (status === 'Completed') {
      await deleteAssignmentReminders(id)
    } else {
      await deleteAssignmentReminders(id)
      await createAssignmentReminders(id)
    }

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

    // Delete associated reminders first
    await deleteAssignmentReminders(id)
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
    const { subjectId, examType, date, syllabus, fileUrl } = data

    if (!subjectId || !date) {
      return { success: false, error: 'Subject and date are required.' }
    }

    await dbConnect()

    const examDateObj = new Date(date)
    const newExam = await Exam.create({
      user: new mongoose.Types.ObjectId(session.user.id),
      subject: new mongoose.Types.ObjectId(subjectId),
      examType,
      date: examDateObj,
      syllabus,
      fileUrl,
    })

    // Generate automatic reminders (1 week before, 1 day before, on the day)
    const autoReminders = generateAutoReminders(examDateObj, 'exam')
    if (autoReminders.length > 0) {
      await createExamReminders(newExam._id.toString(), autoReminders)
    }

    return {
      success: true,
      message: `Exam scheduled! You'll receive automatic reminders 1 week before, 1 day before, and on the exam date.`,
      exam: JSON.parse(JSON.stringify(newExam)),
    }
  } catch (error: any) {
    console.error('Create Exam Error:', error)
    return { success: false, error: error.message || 'Failed to schedule exam.' }
  }
}

export async function updateExamDetailsAction(id: string, data: any): Promise<CollegeResponse> {
  try {
    const session = await checkAuth()
    const { examType, date, syllabus, fileUrl } = data

    await dbConnect()

    const exam = await Exam.findOne({ _id: id, user: session.user.id })
    if (!exam) {
      return { success: false, error: 'Exam not found.' }
    }

    if (examType) exam.examType = examType
    if (date) exam.date = new Date(date)
    if (syllabus !== undefined) exam.syllabus = syllabus
    if (fileUrl !== undefined) exam.fileUrl = fileUrl

    if (exam.date > new Date() && exam.deletionRequested) {
      exam.deletionRequested = false
      exam.deletionRequestedAt = undefined
      exam.deletionConfirmed = false
      exam.deletionConfirmedAt = undefined
    }

    await exam.save()

    await deleteExamReminders(id)
    if (exam.marksObtained === undefined) {
      await createExamReminders(id)
    }

    return {
      success: true,
      message: 'Exam updated successfully.',
      exam: JSON.parse(JSON.stringify(exam)),
    }
  } catch (error: any) {
    console.error('Update Exam Details Error:', error)
    return { success: false, error: error.message || 'Failed to update exam details.' }
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

    // If graded, we clean up any active reminders
    if (marksObtained !== undefined || maxMarks !== undefined) {
      await deleteExamReminders(id)
    }

    return {
      success: true,
      message: 'Exam grades updated!',
      exam: JSON.parse(JSON.stringify(exam)),
    }
  } catch (error: any) {
    console.error('Update Exam Error:', error)
    return { success: false, error: error.message || 'Failed to update exam grades.' }
  }
}

export async function deleteExamAction(id: string): Promise<CollegeResponse> {
  try {
    const session = await checkAuth()
    await dbConnect()

    await deleteExamReminders(id)
    await Exam.deleteOne({ _id: id, user: session.user.id })

    return {
      success: true,
      message: 'Exam removed.',
    }
  } catch (error: any) {
    console.error('Delete Exam Error:', error)
    return { success: false, error: error.message || 'Failed to delete exam.' }
  }
}

export async function updateSubjectRemindersAction(subjectId: string, reminderConfigs: any[]): Promise<CollegeResponse> {
  try {
    const session = await checkAuth()
    
    // Verify subject belongs to user
    const subject = await Subject.findOne({ _id: subjectId, user: session.user.id })
    if (!subject) {
      return { success: false, error: 'Subject not found.' }
    }

    const result = await updateSubjectReminders(subjectId, reminderConfigs)
    
    if (result.success) {
      return {
        success: true,
        message: 'Subject reminders updated successfully!',
      }
    } else {
      return { success: false, error: result.error || 'Failed to update reminders.' }
    }
  } catch (error: any) {
    console.error('Update Subject Reminders Error:', error)
    return { success: false, error: error.message || 'Failed to update subject reminders.' }
  }
}

// --- DELETION CONFIRMATION ACTIONS ---

export async function requestAssignmentDeletionAction(id: string): Promise<CollegeResponse> {
  try {
    const session = await checkAuth()
    await dbConnect()

    const assignment = await Assignment.findOne({ _id: id, user: session.user.id }).populate('subject')
    if (!assignment) {
      return { success: false, error: 'Assignment not found.' }
    }

    // Check if deadline has passed
    const now = new Date()
    if (assignment.dueDate > now) {
      return { success: false, error: 'Cannot request deletion before deadline.' }
    }

    assignment.deletionRequested = true
    assignment.deletionRequestedAt = now
    await assignment.save()

    // Send confirmation email
    if (session.user.email) {
      await sendDeletionConfirmationEmail(
        session.user.email,
        session.user.name || 'User',
        'assignment',
        assignment.title,
        assignment._id.toString()
      )
    }

    return {
      success: true,
      message: 'Deletion confirmation requested. Please check your email to confirm.',
      assignment: JSON.parse(JSON.stringify(assignment)),
    }
  } catch (error: any) {
    console.error('Request Assignment Deletion Error:', error)
    return { success: false, error: error.message || 'Failed to request deletion.' }
  }
}

export async function confirmAssignmentDeletionAction(id: string): Promise<CollegeResponse> {
  try {
    const session = await checkAuth()
    await dbConnect()

    const assignment = await Assignment.findOne({ _id: id, user: session.user.id })
    if (!assignment) {
      return { success: false, error: 'Assignment not found.' }
    }

    if (!assignment.deletionRequested) {
      return { success: false, error: 'Deletion not requested.' }
    }

    // Delete associated reminders
    await deleteAssignmentReminders(id)
    
    // Delete the assignment
    await Assignment.deleteOne({ _id: id })

    return {
      success: true,
      message: 'Assignment deleted successfully.',
    }
  } catch (error: any) {
    console.error('Confirm Assignment Deletion Error:', error)
    return { success: false, error: error.message || 'Failed to delete assignment.' }
  }
}

export async function cancelAssignmentDeletionAction(id: string): Promise<CollegeResponse> {
  try {
    const session = await checkAuth()
    await dbConnect()

    const assignment = await Assignment.findOne({ _id: id, user: session.user.id })
    if (!assignment) {
      return { success: false, error: 'Assignment not found.' }
    }

    assignment.deletionRequested = false
    assignment.deletionRequestedAt = undefined
    assignment.deletionConfirmed = false
    assignment.deletionConfirmedAt = undefined
    await assignment.save()

    return {
      success: true,
      message: 'Deletion request cancelled.',
      assignment: JSON.parse(JSON.stringify(assignment)),
    }
  } catch (error: any) {
    console.error('Cancel Assignment Deletion Error:', error)
    return { success: false, error: error.message || 'Failed to cancel deletion.' }
  }
}

export async function requestExamDeletionAction(id: string): Promise<CollegeResponse> {
  try {
    const session = await checkAuth()
    await dbConnect()

    const exam = await Exam.findOne({ _id: id, user: session.user.id }).populate('subject')
    if (!exam) {
      return { success: false, error: 'Exam not found.' }
    }

    // Check if exam date has passed
    const now = new Date()
    if (exam.date > now) {
      return { success: false, error: 'Cannot request deletion before exam date.' }
    }

    exam.deletionRequested = true
    exam.deletionRequestedAt = now
    await exam.save()

    // Send confirmation email
    if (session.user.email) {
      await sendDeletionConfirmationEmail(
        session.user.email,
        session.user.name || 'User',
        'exam',
        exam.examType,
        exam._id.toString()
      )
    }

    return {
      success: true,
      message: 'Deletion confirmation requested. Please check your email to confirm.',
      exam: JSON.parse(JSON.stringify(exam)),
    }
  } catch (error: any) {
    console.error('Request Exam Deletion Error:', error)
    return { success: false, error: error.message || 'Failed to request deletion.' }
  }
}

export async function confirmExamDeletionAction(id: string): Promise<CollegeResponse> {
  try {
    const session = await checkAuth()
    await dbConnect()

    const exam = await Exam.findOne({ _id: id, user: session.user.id })
    if (!exam) {
      return { success: false, error: 'Exam not found.' }
    }

    if (!exam.deletionRequested) {
      return { success: false, error: 'Deletion not requested.' }
    }

    // Delete associated reminders
    await deleteExamReminders(id)
    
    // Delete the exam
    await Exam.deleteOne({ _id: id })

    return {
      success: true,
      message: 'Exam deleted successfully.',
    }
  } catch (error: any) {
    console.error('Confirm Exam Deletion Error:', error)
    return { success: false, error: error.message || 'Failed to delete exam.' }
  }
}

export async function cancelExamDeletionAction(id: string): Promise<CollegeResponse> {
  try {
    const session = await checkAuth()
    await dbConnect()

    const exam = await Exam.findOne({ _id: id, user: session.user.id })
    if (!exam) {
      return { success: false, error: 'Exam not found.' }
    }

    exam.deletionRequested = false
    exam.deletionRequestedAt = undefined
    exam.deletionConfirmed = false
    exam.deletionConfirmedAt = undefined
    await exam.save()

    return {
      success: true,
      message: 'Deletion request cancelled.',
      exam: JSON.parse(JSON.stringify(exam)),
    }
  } catch (error: any) {
    console.error('Cancel Exam Deletion Error:', error)
    return { success: false, error: error.message || 'Failed to cancel deletion.' }
  }
}
