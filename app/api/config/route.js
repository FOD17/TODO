import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const config = await db.getConfig()
    return NextResponse.json(config)
  } catch (err) {
    console.error('[API /config GET]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    const body = await request.json()
    const config = await db.updateConfig(body)
    return NextResponse.json(config)
  } catch (err) {
    console.error('[API /config PUT]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
