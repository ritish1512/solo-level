import React from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import { Subject, Assignment, Exam } from '@/models/College'
import CollegeClient from './CollegeClient'

export const dynamic = 'force-dynamic'

export default async function CollegePage() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    return null
  }

  await dbConnect()

  const userId = session.user.id

  // Fetch subjects, assignments, and exams
  const subjects = await Subject.find({ user: userId }).sort({ name: 1 })
  const assignments = await Assignment.find({ user: userId }).populate('subject', 'name code').sort({ dueDate: 1 })
  const exams = await Exam.find({ user: userId }).populate('subject', 'name code').sort({ date: 1 })

  return (
    <CollegeClient 
      initialSubjects={JSON.parse(JSON.stringify(subjects))}
      initialAssignments={JSON.parse(JSON.stringify(assignments))}
      initialExams={JSON.parse(JSON.stringify(exams))}
    />
  )
}
