// lib/db.ts  — Turso free tier (libsql)
// Free: 500 DBs, 9 GB storage, 1 billion row reads/month
import { createClient } from '@libsql/client'

let _client: ReturnType<typeof createClient> | null = null

export function getDb() {
  if (_client) return _client
  _client = createClient({
    url:       process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  })
  return _client
}

export async function initDb() {
  const db = getDb()
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS posts (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      slides_json  TEXT    NOT NULL,
      caption      TEXT    NOT NULL DEFAULT '',
      theme        TEXT    NOT NULL DEFAULT 'dark',
      font_scale   REAL    NOT NULL DEFAULT 1.0,
      status       TEXT    NOT NULL DEFAULT 'scheduled',
      scheduled_at TEXT    NOT NULL,
      published_at TEXT,
      ig_media_id  TEXT,
      error_msg    TEXT,
      image_urls   TEXT,
      created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT ''
    );
    INSERT OR IGNORE INTO settings (key,value) VALUES ('ig_access_token','');
    INSERT OR IGNORE INTO settings (key,value) VALUES ('ig_user_id','');
    INSERT OR IGNORE INTO settings (key,value) VALUES ('brand_handle','@5gates.bh');
    INSERT OR IGNORE INTO settings (key,value) VALUES ('default_caption','تابعونا لمزيد من النصائح المالية 💼\n.\n#5gates #محاسبة #البحرين #ضريبة_القيمة_المضافة');
  `)
}

export type PostStatus = 'scheduled' | 'published' | 'failed' | 'draft' | 'processing'
export type Post = {
  id: number
  slides_json: string
  caption: string
  theme: string
  font_scale: number
  status: PostStatus
  scheduled_at: string
  published_at: string | null
  ig_media_id:  string | null
  error_msg:    string | null
  image_urls:   string | null
  created_at:   string
}
