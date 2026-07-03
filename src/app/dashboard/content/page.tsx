import React from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import ContentIdea from '@/models/ContentIdea'
import ContentClient from './ContentClient'

export const dynamic = 'force-dynamic'

export default async function ContentPage() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    return null
  }

  await dbConnect()

  const ideas = await ContentIdea.find({ user: session.user.id }).sort({ updatedAt: -1 })

  return <ContentClient initialIdeas={JSON.parse(JSON.stringify(ideas))} />
}
