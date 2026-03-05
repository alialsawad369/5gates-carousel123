import { NextRequest, NextResponse } from 'next/server'
import { isAuthed } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function DELETE(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  await getDb().execute({ sql: `DELETE FROM posts WHERE id=?`, args: [id] })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, action, scheduledAt } = await req.json()
  const db = getDb()
  if (action === 'retry')
    await db.execute({ sql: `UPDATE posts SET status='scheduled', error_msg=NULL WHERE id=?`, args: [id] })
  if (action === 'reschedule' && scheduledAt)
    await db.execute({ sql: `UPDATE posts SET scheduled_at=?, status='scheduled' WHERE id=?`, args: [scheduledAt, id] })
  if (action === 'cancel')
    await db.execute({ sql: `UPDATE posts SET status='draft' WHERE id=?`, args: [id] })
  return NextResponse.json({ ok: true })
}
