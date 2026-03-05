import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { password } = await req.json()
  if (password !== process.env.APP_PASSWORD)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const res = NextResponse.json({ ok: true })
  res.cookies.set('5g_auth', password, {
    httpOnly: true, secure: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30, path: '/',
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete('5g_auth')
  return res
}
