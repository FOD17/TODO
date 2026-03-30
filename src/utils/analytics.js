/**
 * Analytics and aggregation utilities for corporate TODO tracking
 */

export function getCompanyStats(todos) {
  const stats = {}
  const allTodos = [...todos.active, ...todos.completed]

  for (const todo of allTodos) {
    if (!todo.company) continue

    if (!stats[todo.company]) {
      stats[todo.company] = {
        total: 0,
        active: 0,
        completed: 0,
        names: new Set(),
        accountReps: new Set(),
      }
    }

    stats[todo.company].total++
    if (todo.completed) {
      stats[todo.company].completed++
    } else {
      stats[todo.company].active++
    }

    if (todo.names) {
      todo.names.forEach((name) => stats[todo.company].names.add(name))
    }
    if (todo.accountRep) {
      stats[todo.company].accountReps.add(todo.accountRep)
    }
  }

  // Convert sets to arrays for rendering
  Object.keys(stats).forEach((company) => {
    stats[company].names = Array.from(stats[company].names)
    stats[company].accountReps = Array.from(stats[company].accountReps)
  })

  return stats
}

export function getCompanyPriority(stats) {
  const companies = Object.keys(stats)
  return companies.sort((a, b) => {
    const aActive = stats[a].active
    const bActive = stats[b].active
    return bActive - aActive // Sort by active count descending
  })
}

export function searchTodos(todos, query) {
  const lowerQuery = query.toLowerCase()
  const allTodos = [...todos.active, ...todos.completed]

  return allTodos.filter((todo) => {
    return (
      todo.message.toLowerCase().includes(lowerQuery) ||
      todo.company.toLowerCase().includes(lowerQuery) ||
      todo.accountRep.toLowerCase().includes(lowerQuery) ||
      todo.names.some((name) => name.toLowerCase().includes(lowerQuery))
    )
  })
}

export function filterTodosByCompany(todos, company) {
  return {
    active: todos.active.filter((t) => t.company === company),
    completed: todos.completed.filter((t) => t.company === company),
  }
}

export function getOverdueCount(todos) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return todos.active.filter((todo) => {
    const todoDate = new Date(todo.date)
    todoDate.setHours(0, 0, 0, 0)
    return todoDate < today
  }).length
}

export function getDueSoonCount(todos, daysAhead = 3) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const futureDate = new Date(today)
  futureDate.setDate(futureDate.getDate() + daysAhead)

  return todos.active.filter((todo) => {
    const todoDate = new Date(todo.date)
    todoDate.setHours(0, 0, 0, 0)
    return todoDate >= today && todoDate <= futureDate
  }).length
}

export function getCompletionRate(todos) {
  const completed = todos.completed.length
  const total = todos.active.length + todos.completed.length

  return total === 0 ? 0 : Math.round((completed / total) * 100)
}
