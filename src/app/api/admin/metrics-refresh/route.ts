import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { fetchDashboardMetrics } from '@/actions/adminDashboardActions'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Session authorization check
    const session = await getServerSession(authOptions)
    if (!session || !session.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const metrics = await fetchDashboardMetrics()
    return NextResponse.json(metrics)
  } catch (error: any) {
    console.error('Metrics Refresh API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
