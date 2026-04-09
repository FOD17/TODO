import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PATCH(request, { params }) {
  try {
    const body = await request.json()
    const { company, ...updates } = body
    const contact = await db.updateContact(company, params.id, updates)
    return NextResponse.json(contact)
  } catch (err) {
    console.error('[API /contacts/[id] PATCH]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const { searchParams } = new URL(request.url)
    const company = searchParams.get('company')
    await db.deleteContact(company, params.id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[API /contacts/[id] DELETE]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
