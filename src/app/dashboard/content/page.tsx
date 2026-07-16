import React from 'react'
import { auth } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import ContentIdea from '@/models/ContentIdea'
import ContentClient from './ContentClient'
import { verifyFeature } from '@/lib/checkFeature'

export const dynamic = 'force-dynamic'

export default async function ContentPage() {
  await verifyFeature('content')
  
  const session = await auth()
  
  if (!session || !session.user) {
    return null
  }

  await dbConnect()

  const ideas = await ContentIdea.find({ user: session.user.id }).sort({ updatedAt: -1 })

  return <ContentClient initialIdeas={JSON.parse(JSON.stringify(ideas))} />
}
