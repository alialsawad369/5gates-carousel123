import { NextRequest, NextResponse } from 'next/server'
import { runScheduler } from '@/lib/scheduler'
import { initDb } from '@/lib/db'

// Called by cron-job.org every 5 minutes (free)
// URL: https://your-app.vercel.app/api/publish
// Header: Authorization: Bearer YOUR_CRON_SECRET
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await initDb()
  return NextResponse.json(await runScheduler())
}

// Manual trigger from dashboard
export async function POST(req: NextRequest) {
  const { isAuthed } = await import('@/lib/auth')
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await initDb()
  return NextResponse.json(await runScheduler())
}
