import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PATCH(request, { params }) {
  try {
    const { id } = params
    const body = await request.json()
    const { action, ...updates } = body

    if (action === 'complete') {
      await db.completeTodo(id)
      return NextResponse.json({ ok: true })
    }
    if (action === 'uncomplete') {
      await db.uncompleteTodo(id)
      return NextResponse.json({ ok: true })
    }

    const todo = await db.updateTodo(id, updates)
    return NextResponse.json(todo)
  } catch (err) {
    console.error('[API /todos/[id] PATCH]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    await db.deleteTodo(params.id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[API /todos/[id] DELETE]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
