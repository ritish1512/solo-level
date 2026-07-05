// This route is deprecated - use /api/cron/daily instead
// Kept for reference only
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return NextResponse.json({ 
    error: 'This cron route is deprecated. Please use /api/cron/daily instead.' 
  }, { status: 410 })
}
