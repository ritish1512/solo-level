import React from 'react'
import { auth } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import { Subject, Assignment, Exam } from '@/models/College'
import CollegeClient from './CollegeClient'
import { verifyFeature } from '@/lib/checkFeature'

export const dynamic = 'force-dynamic'

export default async function CollegePage() {
  await verifyFeature('college')
  
  const session = await auth()
  
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
