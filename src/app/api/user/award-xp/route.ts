import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const minutes = Number(body?.minutes)

    let xpGain = 5
    if (Number.isFinite(minutes) && minutes >= 50) {
      xpGain = 20
    } else if (Number.isFinite(minutes) && minutes >= 25) {
      xpGain = 10
    }

    await dbConnect()

    const user = await User.findById(session.user.id)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    user.xp += xpGain
    const newLevel = Math.floor(user.xp / 100) + 1
    let levelUp = false

    if (newLevel > user.level) {
      user.level = newLevel
      levelUp = true
    }

    await user.save()

    return NextResponse.json({
      success: true,
      xp: user.xp,
      level: user.level,
      xpGain,
      levelUp,
      message: levelUp
        ? `Pomodoro completed! +${xpGain} XP. LEVEL UP! You reached Level ${user.level}.`
        : `Pomodoro completed! +${xpGain} XP.`,
    })
  } catch (error: any) {
    console.error('Award XP API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
