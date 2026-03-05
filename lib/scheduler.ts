// lib/scheduler.ts
import { getDb, Post } from './db'
import { publishCarousel, IGConfig } from './instagram'

export async function runScheduler() {
  const db = getDb()
  const errors: string[] = []
  let processed = 0

  // Get credentials — prefer DB settings, fall back to env
  const rows = await db.execute(`SELECT key, value FROM settings WHERE key IN ('ig_access_token','ig_user_id')`)
  const cfg: Record<string, string> = {}
  for (const row of rows.rows) cfg[row[0] as string] = row[1] as string

  const accessToken = cfg['ig_access_token'] || process.env.IG_ACCESS_TOKEN || ''
  const userId      = cfg['ig_user_id']      || process.env.IG_USER_ID      || ''

  if (!accessToken || !userId) return { processed: 0, errors: ['Instagram credentials missing'] }

  const ig: IGConfig = { accessToken, userId }

  // Find due posts
  const now = new Date().toISOString()
  const due = await db.execute({
    sql:  `SELECT * FROM posts WHERE status='scheduled' AND scheduled_at<=? ORDER BY scheduled_at ASC LIMIT 3`,
    args: [now],
  })

  for (const row of due.rows) {
    const post = row as unknown as Post
    try {
      await db.execute({ sql: `UPDATE posts SET status='processing' WHERE id=?`, args: [post.id] })

      const urls: string[] = post.image_urls ? JSON.parse(post.image_urls as string) : []
      if (urls.length < 2) throw new Error('Not enough images — re-render required')

      const mediaId = await publishCarousel(ig, urls, post.caption as string)

      await db.execute({
        sql:  `UPDATE posts SET status='published', published_at=?, ig_media_id=? WHERE id=?`,
        args: [new Date().toISOString(), mediaId, post.id],
      })
      processed++
    } catch (e: any) {
      errors.push(`Post ${post.id}: ${e.message}`)
      await db.execute({ sql: `UPDATE posts SET status='failed', error_msg=? WHERE id=?`, args: [e.message, post.id] })
    }
  }

  return { processed, errors }
}
