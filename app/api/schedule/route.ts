import { NextRequest, NextResponse } from 'next/server'
import { isAuthed } from '@/lib/auth'
import { getDb, initDb, Post } from '@/lib/db'
import { uploadBase64 } from '@/lib/cloudinary'

// POST — schedule a new post
export async function POST(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await initDb()

  const { slides, caption = '', theme = 'dark', fontScale = 1.0, scheduledAt, imagesBase64 } = await req.json()

  if (!slides?.length)      return NextResponse.json({ error: 'slides required' }, { status: 400 })
  if (!imagesBase64?.length) return NextResponse.json({ error: 'images required' }, { status: 400 })

  const db       = getDb()
  const schedTime = scheduledAt || new Date().toISOString()
  const postRef  = `post_${Date.now()}`

  // Upload all slide images to Cloudinary
  const imageUrls: string[] = []
  for (let i = 0; i < imagesBase64.length; i++) {
    const url = await uploadBase64(imagesBase64[i], postRef, `slide_${i + 1}`)
    imageUrls.push(url)
  }

  // Save to DB
  const result = await db.execute({
    sql:  `INSERT INTO posts (slides_json,caption,theme,font_scale,status,scheduled_at,image_urls) VALUES (?,?,?,?,?,?,?)`,
    args: [JSON.stringify(slides), caption, theme, fontScale, 'scheduled', schedTime, JSON.stringify(imageUrls)],
  })

  return NextResponse.json({ postId: result.lastInsertRowid, imageUrls, scheduledAt: schedTime })
}

// GET — list posts
export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await initDb()
  const db    = getDb()
  const rows  = await db.execute(`SELECT * FROM posts ORDER BY scheduled_at DESC LIMIT 100`)
  // Convert rows array to objects
  const cols  = rows.columns
  const posts = rows.rows.map(r => Object.fromEntries(cols.map((c, i) => [c, r[i]])))
  return NextResponse.json({ posts })
}
