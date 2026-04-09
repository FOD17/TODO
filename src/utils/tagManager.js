// Tag/Company/Executive management utilities

export const createTagsStore = () => ({
  companies: [],
  accountExecutives: [],
  companyAssignments: {},
  companyTypes: {},
  labels: [],
})

// ============ COMPANIES ============

export const addCompany = (tagsData, companyName, type = "company") => {
  const companies = tagsData.companies || []
  if (companies.includes(companyName)) return tagsData
  return {
    ...tagsData,
    companies: [...companies, companyName].sort(),
    companyTypes: {
      ...(tagsData.companyTypes || {}),
      [companyName]: type,
    },
  }
}

export const removeCompany = (tagsData, companyName) => {
  const types = { ...(tagsData.companyTypes || {}) }
  delete types[companyName]
  return {
    ...tagsData,
    companies: (tagsData.companies || []).filter((c) => c !== companyName),
    companyTypes: types,
  }
}

export const setCompanyType = (tagsData, companyName, type) => ({
  ...tagsData,
  companyTypes: {
    ...(tagsData.companyTypes || {}),
    [companyName]: type,
  },
})

export const getCompanies = (tagsData) => tagsData.companies || []
export const getCompanyTypes = (tagsData) => tagsData.companyTypes || {}

// ============ ACCOUNT EXECUTIVES ============

export const addAccountExecutive = (tagsData, name, email = "") => {
  const id = Date.now().toString()
  const accountExecutives = tagsData.accountExecutives || []
  return {
    ...tagsData,
    accountExecutives: [...accountExecutives, { id, name, email }].sort((a, b) =>
      a.name.localeCompare(b.name),
    ),
  }
}

export const updateAccountExecutive = (tagsData, id, name, email = "") => ({
  ...tagsData,
  accountExecutives: (tagsData.accountExecutives || []).map((ae) =>
    ae.id === id ? { id, name, email } : ae,
  ),
})

export const removeAccountExecutive = (tagsData, id) => ({
  ...tagsData,
  accountExecutives: (tagsData.accountExecutives || []).filter((ae) => ae.id !== id),
})

export const assignCompanyToAE = (tagsData, companyName, aeId) => ({
  ...tagsData,
  companyAssignments: {
    ...(tagsData.companyAssignments || {}),
    [companyName]: aeId,
  },
})

export const unassignCompany = (tagsData, companyName) => {
  const assignments = { ...(tagsData.companyAssignments || {}) }
  delete assignments[companyName]
  return { ...tagsData, companyAssignments: assignments }
}

export const getAccountExecutives = (tagsData) => tagsData.accountExecutives || []
export const getCompanyAssignments = (tagsData) => tagsData.companyAssignments || {}

// ============ LABELS (sorted alphabetically) ============

export const addLabel = (tagsData, name, color = "#3498db", description = "") => {
  const labels = tagsData.labels || []
  if (labels.some((l) => l.name === name)) return tagsData
  const id = Date.now().toString()
  return {
    ...tagsData,
    labels: [...labels, { id, name, color, description }].sort((a, b) =>
      a.name.localeCompare(b.name),
    ),
  }
}

export const updateLabel = (tagsData, id, name, color, description = "") => ({
  ...tagsData,
  labels: (tagsData.labels || [])
    .map((l) => (l.id === id ? { id, name, color, description } : l))
    .sort((a, b) => a.name.localeCompare(b.name)),
})

export const removeLabel = (tagsData, id) => ({
  ...tagsData,
  labels: (tagsData.labels || []).filter((l) => l.id !== id),
})

export const getLabels = (tagsData) =>
  (tagsData.labels || []).slice().sort((a, b) => a.name.localeCompare(b.name))

export const parseLabel = (labelName) => {
  const colonIdx = labelName.indexOf(":")
  if (colonIdx === -1) return { tag: labelName, subtag: null }
  return {
    tag: labelName.substring(0, colonIdx),
    subtag: labelName.substring(colonIdx + 1),
  }
}

export const groupLabelsByTag = (labels) => {
  const groups = {}
  labels.filter(Boolean).forEach((label) => {
    const { tag } = parseLabel(label.name)
    if (!groups[tag]) groups[tag] = []
    groups[tag].push(label)
  })
  return groups
}

// ============ DEFAULT LABELS ============

export const DEFAULT_LABELS = [
  { name: "await response", color: "#f39c12", description: "Waiting for a reply from this contact or company." },
  { name: "call", color: "#3498db", description: "A phone or video call needs to be scheduled or completed." },
  { name: "email", color: "#9b59b6", description: "An email needs to be sent or followed up on." },
  { name: "important", color: "#e74c3c", description: "High-priority item that should not be overlooked." },
  { name: "poc", color: "#1abc9c", description: "Proof of concept — requires a demo, trial, or validation step." },
  { name: "vma", color: "#e67e22", description: "Voicemail awaiting — a voicemail was left and needs follow-up." },
  { name: "workshop", color: "#27ae60", description: "A workshop, training session, or structured event." },
]

export const seedDefaultLabels = (tagsData) => {
  const existing = tagsData.labels || []
  if (existing.length > 0) return tagsData

  let updated = tagsData
  for (const label of DEFAULT_LABELS) {
    updated = addLabel(updated, label.name, label.color, label.description)
  }
  return updated
}
