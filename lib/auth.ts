import { NextRequest } from 'next/server'
export const isAuthed = (req: NextRequest) =>
  req.cookies.get('5g_auth')?.value === process.env.APP_PASSWORD
