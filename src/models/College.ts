import mongoose, { Schema, Document, Model } from 'mongoose'
import { IReminderConfig } from './Task'

// --- SUBJECT INTERFACE & SCHEMA ---
export interface ISubject extends Document {
  user: mongoose.Types.ObjectId
  name: string
  code?: string
  credits: number // for CGPA weighting
  attendedClasses: number
  totalClasses: number
  classNotes: {
    date: Date
    attended: boolean
    note?: string
  }[]
  createdAt: Date
  updatedAt: Date
}

const SubjectSchema: Schema<ISubject> = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: [true, 'Subject name is required'], trim: true },
    code: { type: String, required: false, trim: true },
    credits: { type: Number, default: 3, min: 1 },
    attendedClasses: { type: Number, default: 0, min: 0 },
    totalClasses: { type: Number, default: 0, min: 0 },
    classNotes: {
      type: [
        {
          date: { type: Date, default: Date.now },
          attended: { type: Boolean, required: true },
          note: { type: String, required: false, trim: true },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
)

// --- ASSIGNMENT INTERFACE & SCHEMA ---
export interface IAssignment extends Document {
  user: mongoose.Types.ObjectId
  title: string
  description?: string
  subject: mongoose.Types.ObjectId // Reference to Subject
  dueDate: Date
  status: 'Todo' | 'In Progress' | 'Completed'
  grade?: string
  fileUrl?: string // Cloudinary pdf/image URL
  reminderConfigs: IReminderConfig[] // Email reminder configurations
  createdAt: Date
  updatedAt: Date
}

const AssignmentSchema: Schema<IAssignment> = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: [true, 'Assignment title is required'], trim: true },
    description: { type: String, required: false },
    subject: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: ['Todo', 'In Progress', 'Completed'], default: 'Todo' },
    grade: { type: String, required: false },
    fileUrl: { type: String, required: false },
    reminderConfigs: {
      type: [
        {
          enabled: { type: Boolean, default: true },
          timeBefore: { type: Number, required: true },
          notificationType: { type: String, enum: ['email', 'in-app', 'both'], default: 'both' },
          emailSent: { type: Boolean, default: false },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
)

// --- EXAM INTERFACE & SCHEMA ---
export interface IExam extends Document {
  user: mongoose.Types.ObjectId
  subject: mongoose.Types.ObjectId // Reference to Subject
  examType: 'Internal' | 'Semester'
  date: Date
  syllabus?: string
  marksObtained?: number
  maxMarks?: number
  reminderConfigs: IReminderConfig[] // Email reminder configurations
  createdAt: Date
  updatedAt: Date
}

const ExamSchema: Schema<IExam> = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    examType: { type: String, enum: ['Internal', 'Semester'], default: 'Internal' },
    date: { type: Date, required: true },
    syllabus: { type: String, required: false },
    marksObtained: { type: Number, required: false },
    maxMarks: { type: Number, required: false },
    reminderConfigs: {
      type: [
        {
          enabled: { type: Boolean, default: true },
          timeBefore: { type: Number, required: true },
          notificationType: { type: String, enum: ['email', 'in-app', 'both'], default: 'both' },
          emailSent: { type: Boolean, default: false },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
)

export const Subject: Model<ISubject> = mongoose.models.Subject || mongoose.model<ISubject>('Subject', SubjectSchema)
export const Assignment: Model<IAssignment> = mongoose.models.Assignment || mongoose.model<IAssignment>('Assignment', AssignmentSchema)
export const Exam: Model<IExam> = mongoose.models.Exam || mongoose.model<IExam>('Exam', ExamSchema)
