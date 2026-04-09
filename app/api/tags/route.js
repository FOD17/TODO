import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const tags = await db.getTags()
    return NextResponse.json(tags)
  } catch (err) {
    console.error('[API /tags GET]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    const body = await request.json()
    const tags = await db.saveTags(body)
    return NextResponse.json(tags)
  } catch (err) {
    console.error('[API /tags PUT]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
