import User from '@/models/User'

/**
 * Calculates and updates user login/activity streak.
 * Assumes MongoDB is already connected.
 */
export async function checkAndUpdateUserStreak(userId: string): Promise<any> {
  try {
    const user = await User.findById(userId)
    if (!user) return null

    const now = new Date()
    
    // Set today to start of day in server timezone
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)

    if (!user.lastActive) {
      // First active session
      user.streak = 1
      user.longestStreak = Math.max(user.longestStreak || 0, 1)
      user.lastActive = now
      await user.save()
      return user
    }

    const lastActiveDate = new Date(user.lastActive)
    const lastActiveDay = new Date(lastActiveDate.getFullYear(), lastActiveDate.getMonth(), lastActiveDate.getDate(), 0, 0, 0)

    const diffTime = today.getTime() - lastActiveDay.getTime()
    const diffDays = Math.round(diffTime / (24 * 60 * 60 * 1000))

    let hasChanged = false

    if (diffDays === 1) {
      // Active yesterday, increment streak
      user.streak = (user.streak || 0) + 1
      user.longestStreak = Math.max(user.longestStreak || 0, user.streak)
      user.lastActive = now
      hasChanged = true
    } else if (diffDays > 1) {
      // Streak broken (missed at least one day)
      user.streak = 1
      user.lastActive = now
      hasChanged = true
    } else if (diffDays === 0) {
      // Already active today, just update lastActive if it's been more than 5 minutes
      const lastActiveMs = lastActiveDate.getTime()
      const currentMs = now.getTime()
      if (currentMs - lastActiveMs > 5 * 60 * 1000) {
        user.lastActive = now
        hasChanged = true
      }
    }

    if (hasChanged) {
      await user.save()
    }

    return user
  } catch (error) {
    console.error('Failed to check and update user streak:', error)
    return null
  }
}
