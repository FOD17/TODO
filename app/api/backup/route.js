import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const backup = await db.exportBackup()
    return NextResponse.json(backup)
  } catch (err) {
    console.error('[API /backup GET]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const result = await db.importBackup(body)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[API /backup POST]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
