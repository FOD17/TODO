import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await db.initializeTables()
    const result = await db.ping()
    return NextResponse.json(result)
  } catch (err) {
    console.error('[API /health GET]', err.message)
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
