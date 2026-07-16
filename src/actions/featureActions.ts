'use server'

import { auth } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'
import { revalidatePath } from 'next/cache'

const DEFAULT_FEATURES = ['dashboard', 'tasks', 'habits', 'notifications', 'leaderboard']

async function checkAuth() {
  const session = await auth()
  if (!session || !session.user) {
    throw new Error('Unauthorized. Please log in.')
  }
  return session
}

export async function getInstalledFeaturesAction(): Promise<string[]> {
  try {
    const session = await checkAuth()
    await dbConnect()

    const user = await User.findById(session.user.id).select('installedFeatures')
    if (!user) {
      return DEFAULT_FEATURES
    }

    return user.installedFeatures || DEFAULT_FEATURES
  } catch (error) {
    console.error('Failed to get installed features:', error)
    return DEFAULT_FEATURES
  }
}

export async function installFeatureAction(featureId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await checkAuth()
    await dbConnect()

    console.log(`[installFeatureAction] Installing feature: ${featureId} for user: ${session.user.email}`)

    const user = await User.findOne({ email: session.user.email })
    if (!user) {
      console.log(`[installFeatureAction] User not found: ${session.user.email}`)
      return { success: false, error: 'User not found.' }
    }

    if (!user.installedFeatures || user.installedFeatures.length === 0) {
      await User.findOneAndUpdate({ email: session.user.email }, {
        $set: { installedFeatures: [...DEFAULT_FEATURES, featureId] }
      })
      console.log(`[installFeatureAction] Initialized features array and added: ${featureId}`)
    } else {
      await User.findOneAndUpdate({ email: session.user.email }, {
        $addToSet: { installedFeatures: featureId }
      })
      console.log(`[installFeatureAction] Added to existing features array: ${featureId}`)
    }

    const updatedUser = await User.findOne({ email: session.user.email })
    console.log(`[installFeatureAction] Post-update features list:`, updatedUser?.installedFeatures)

    revalidatePath('/dashboard')
    return { success: true }
  } catch (error: any) {
    console.error('Failed to install feature:', error)
    return { success: false, error: error.message || 'Failed to install feature.' }
  }
}

export async function uninstallFeatureAction(featureId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await checkAuth()

    if (DEFAULT_FEATURES.includes(featureId)) {
      return { success: false, error: 'Cannot uninstall a default core feature.' }
    }

    await dbConnect()

    console.log(`[uninstallFeatureAction] Uninstalling feature: ${featureId} for user: ${session.user.email}`)

    const user = await User.findOne({ email: session.user.email })
    if (!user) {
      console.log(`[uninstallFeatureAction] User not found: ${session.user.email}`)
      return { success: false, error: 'User not found.' }
    }

    if (!user.installedFeatures || user.installedFeatures.length === 0) {
      await User.findOneAndUpdate({ email: session.user.email }, {
        $set: { installedFeatures: DEFAULT_FEATURES }
      })
      console.log(`[uninstallFeatureAction] Reset features to defaults.`)
    } else {
      await User.findOneAndUpdate({ email: session.user.email }, {
        $pull: { installedFeatures: featureId }
      })
      console.log(`[uninstallFeatureAction] Pulled feature from array: ${featureId}`)
    }

    const updatedUser = await User.findOne({ email: session.user.email })
    console.log(`[uninstallFeatureAction] Post-update features list:`, updatedUser?.installedFeatures)

    revalidatePath('/dashboard')
    return { success: true }
  } catch (error: any) {
    console.error('Failed to uninstall feature:', error)
    return { success: false, error: error.message || 'Failed to uninstall feature.' }
  }
}
