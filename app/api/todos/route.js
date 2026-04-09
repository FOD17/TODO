import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const todos = await db.getTodos()
    return NextResponse.json(todos)
  } catch (err) {
    console.error('[API /todos GET]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const todo = await db.addTodo(body)
    return NextResponse.json(todo)
  } catch (err) {
    console.error('[API /todos POST]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    const body = await request.json()
    await db.saveTodos(body)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[API /todos PUT]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
