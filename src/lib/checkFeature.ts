import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'
import mongoose from 'mongoose'

const DEFAULT_FEATURES = ['dashboard', 'tasks', 'habits', 'notifications', 'leaderboard']

/**
 * Server-side route guard to verify if a feature is installed for the logged-in user.
 * Throws a Next.js redirect if unauthorized or feature not installed.
 */
export async function verifyFeature(featureId: string): Promise<void> {
  const session = await auth()
  if (!session || !session.user) {
    redirect('/login?error=Please%20log%20in%20to%20access%20the%20dashboard.')
  }

  await dbConnect()
  const db = mongoose.connection.db
  const rawUser = db && session.user.email
    ? await db.collection('users').findOne({ email: session.user.email })
    : null

  console.log(`[verifyFeature] Checking permission for feature: "${featureId}" for user: ${session.user.email}. Database contains:`, rawUser?.installedFeatures)

  const installedFeatures = rawUser?.installedFeatures && rawUser.installedFeatures.length > 0
    ? rawUser.installedFeatures
    : DEFAULT_FEATURES

  if (!installedFeatures.includes(featureId)) {
    redirect('/dashboard?error=feature-not-installed')
  }
}
