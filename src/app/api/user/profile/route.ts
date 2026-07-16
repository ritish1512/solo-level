import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await auth()
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()

    const { checkAndUpdateUserStreak } = await import('@/lib/userStreak')
    const user = await checkAndUpdateUserStreak(session.user.id)

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { default: mongoose } = await import('mongoose')
    const db = mongoose.connection.db
    const rawUser = db
      ? await db.collection('users').findOne({ _id: new mongoose.Types.ObjectId(session.user.id) })
      : null

    const installedFeatures = rawUser?.installedFeatures && rawUser.installedFeatures.length > 0
      ? rawUser.installedFeatures
      : ['dashboard', 'tasks', 'habits', 'notifications', 'leaderboard']

    return NextResponse.json({
      name: user.name,
      email: user.email,
      image: user.image,
      xp: user.xp,
      level: user.level,
      streak: user.streak,
      longestStreak: user.longestStreak,
      role: user.role,
      emailVerified: user.emailVerified ? user.emailVerified.toISOString() : null,
      installedFeatures,
    })
  } catch (error: any) {
    console.error('Profile API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
