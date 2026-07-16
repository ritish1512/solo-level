import React from 'react'
import { auth } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import mongoose from 'mongoose'
import FeatureShopClient from './FeatureShopClient'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Feature Shop',
  description: 'Install and uninstall premium raider features for your system.',
}

export default async function FeatureShopPage() {
  const session = await auth()
  
  if (!session || !session.user) {
    redirect('/login?error=Please%20log%20in%20to%20access%20the%20dashboard.')
  }

  await dbConnect()

  const db = mongoose.connection.db
  const rawUser = db && session.user.email
    ? await db.collection('users').findOne({ email: session.user.email })
    : null

  console.log(`[FeatureShopPage] Fetching installed features for user: ${session.user.email}. Database contains:`, rawUser?.installedFeatures)

  const installedFeatures = rawUser?.installedFeatures && rawUser.installedFeatures.length > 0
    ? rawUser.installedFeatures
    : ['dashboard', 'tasks', 'habits', 'notifications', 'leaderboard']

  return (
    <FeatureShopClient 
      initialInstalledFeatures={JSON.parse(JSON.stringify(installedFeatures))} 
    />
  )
}
