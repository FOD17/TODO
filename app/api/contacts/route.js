import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const contacts = await db.getContacts()
    return NextResponse.json(contacts)
  } catch (err) {
    console.error('[API /contacts GET]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    const body = await request.json()
    await db.saveContacts(body)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[API /contacts PUT]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { company, ...contact } = body
    const result = await db.addContact(company, contact)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[API /contacts POST]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
