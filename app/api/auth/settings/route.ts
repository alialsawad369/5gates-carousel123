import { NextRequest, NextResponse } from 'next/server'
import { isAuthed } from '@/lib/auth'
import { getDb, initDb } from '@/lib/db'
import { verifyToken } from '@/lib/instagram'

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await initDb()
  const db   = getDb()
  const rows = await db.execute(`SELECT key, value FROM settings`)
  const s: Record<string, string> = {}
  for (const r of rows.rows) {
    const k = r[0] as string
    const v = r[1] as string
    s[k] = k === 'ig_access_token' && v ? v.slice(0, 8) + '••••••••' : v
  }
  return NextResponse.json(s)
}

export async function POST(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await initDb()
  const body = await req.json()
  const db   = getDb()
  const allowed = ['ig_access_token', 'ig_user_id', 'brand_handle', 'default_caption']
  for (const key of allowed) {
    if (body[key] !== undefined) {
      await db.execute({ sql: `INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)`, args: [key, body[key]] })
    }
  }
  if (body.ig_access_token && body.ig_user_id) {
    const check = await verifyToken({ accessToken: body.ig_access_token, userId: body.ig_user_id })
    return NextResponse.json({ ok: true, igCheck: check })
  }
  return NextResponse.json({ ok: true })
}
