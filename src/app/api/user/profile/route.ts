import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()

    const user = await User.findById(session.user.id).select(
      'name email image xp level streak longestStreak role'
    )

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      name: user.name,
      email: user.email,
      image: user.image,
      xp: user.xp,
      level: user.level,
      streak: user.streak,
      longestStreak: user.longestStreak,
      role: user.role,
    })
  } catch (error: any) {
    console.error('Profile API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
