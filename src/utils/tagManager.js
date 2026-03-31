// Tag/Company/Executive management utilities

export const createTagsStore = () => {
  return {
    companies: [], // Array of company names
    accountExecutives: [], // Array of { id, name, email }
  }
}

export const addCompany = (tagsData, companyName) => {
  const companies = tagsData.companies || []
  if (!companies.includes(companyName)) {
    return {
      ...tagsData,
      companies: [...companies, companyName].sort(),
    }
  }
  return tagsData
}

export const removeCompany = (tagsData, companyName) => {
  const companies = tagsData.companies || []
  return {
    ...tagsData,
    companies: companies.filter((c) => c !== companyName),
  }
}

export const addAccountExecutive = (tagsData, name, email = "") => {
  const id = Date.now().toString()
  const accountExecutives = tagsData.accountExecutives || []
  return {
    ...tagsData,
    accountExecutives: [
      ...accountExecutives,
      { id, name, email },
    ].sort((a, b) => a.name.localeCompare(b.name)),
  }
}

export const updateAccountExecutive = (tagsData, id, name, email = "") => {
  const accountExecutives = tagsData.accountExecutives || []
  return {
    ...tagsData,
    accountExecutives: accountExecutives.map((ae) =>
      ae.id === id ? { id, name, email } : ae,
    ),
  }
}

export const removeAccountExecutive = (tagsData, id) => {
  const accountExecutives = tagsData.accountExecutives || []
  return {
    ...tagsData,
    accountExecutives: accountExecutives.filter((ae) => ae.id !== id),
  }
}

export const assignCompanyToAE = (tagsData, companyName, aeId) => {
  return {
    ...tagsData,
    companyAssignments: {
      ...(tagsData.companyAssignments || {}),
      [companyName]: aeId,
    },
  }
}

export const unassignCompany = (tagsData, companyName) => {
  const assignments = { ...(tagsData.companyAssignments || {}) }
  delete assignments[companyName]
  return {
    ...tagsData,
    companyAssignments: assignments,
  }
}

export const getCompanies = (tagsData) => tagsData.companies || []
export const getAccountExecutives = (tagsData) =>
  tagsData.accountExecutives || []
export const getCompanyAssignments = (tagsData) =>
  tagsData.companyAssignments || {}

// ============ LABELS (GitLab-style scoped labels) ============

export const addLabel = (tagsData, name, color = "#3498db") => {
  const id = Date.now().toString()
  const labels = tagsData.labels || []
  if (labels.some((l) => l.name === name)) return tagsData
  return {
    ...tagsData,
    labels: [...labels, { id, name, color }],
  }
}

export const updateLabel = (tagsData, id, name, color) => {
  const labels = tagsData.labels || []
  return {
    ...tagsData,
    labels: labels.map((l) => (l.id === id ? { id, name, color } : l)),
  }
}

export const removeLabel = (tagsData, id) => {
  const labels = tagsData.labels || []
  return {
    ...tagsData,
    labels: labels.filter((l) => l.id !== id),
  }
}

export const getLabels = (tagsData) => tagsData.labels || []

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
  labels.forEach((label) => {
    const { tag } = parseLabel(label.name)
    if (!groups[tag]) groups[tag] = []
    groups[tag].push(label)
  })
  return groups
}
