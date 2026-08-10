const MAX_TITLE_LENGTH = 200
const MAX_CONTENT_LENGTH = 2_000_000
const MAX_TAGS = 20
const MAX_TAG_LENGTH = 32
const MAX_CATEGORY_LENGTH = 50
const MAX_IMPORT_NOTES = 500
const NOTE_STATUSES = new Set(['inbox', 'todo', 'doing', 'done', 'archived'])
const NOTE_STATUS_ORDER = ['inbox', 'todo', 'doing', 'done', 'archived']

function asString(value) {
  return typeof value === 'string' ? value : ''
}

export function normalizeTags(value) {
  const rawTags = Array.isArray(value) ? value : asString(value).split(/[,，\n]/)
  const seen = new Set()
  const tags = []

  for (const item of rawTags) {
    const tag = asString(item).trim().slice(0, MAX_TAG_LENGTH)
    const key = tag.toLocaleLowerCase()
    if (!tag || seen.has(key)) continue
    seen.add(key)
    tags.push(tag)
    if (tags.length >= MAX_TAGS) break
  }

  return tags
}

export function normalizeCategory(value) {
  return asString(value).trim().slice(0, MAX_CATEGORY_LENGTH)
}

export function normalizeStatus(value) {
  const status = asString(value)
  return NOTE_STATUSES.has(status) ? status : 'inbox'
}

export function normalizeNote(input, userId = '') {
  const source = input && typeof input === 'object' ? input : {}
  const now = new Date().toISOString()

  return {
    id: asString(source.id),
    user_id: asString(source.user_id) || userId,
    title: asString(source.title).slice(0, MAX_TITLE_LENGTH),
    content: asString(source.content).slice(0, MAX_CONTENT_LENGTH),
    tags: normalizeTags(source.tags),
    category: normalizeCategory(source.category),
    status: normalizeStatus(source.status),
    is_pinned: source.is_pinned === true,
    created_at: asString(source.created_at) || now,
    updated_at: asString(source.updated_at) || now,
  }
}

export function createBlankNote(userId, id, now = new Date().toISOString()) {
  return {
    id,
    user_id: userId,
    title: '',
    content: '',
    tags: [],
    category: '',
    status: 'inbox',
    is_pinned: false,
    created_at: now,
    updated_at: now,
  }
}

export function noteTitle(note) {
  const title = asString(note?.title).trim()
  if (title) return title

  const firstContentLine = asString(note?.content)
    .split('\n')
    .map((line) => line.replace(/^\s*#+\s*/, '').trim())
    .find(Boolean)

  return firstContentLine?.slice(0, 60) || '无标题备忘录'
}

export function sortNotes(notes, sortBy = 'updated_desc') {
  return [...notes].sort((left, right) => {
    const byPinned = Number(Boolean(right.is_pinned)) - Number(Boolean(left.is_pinned))
    if (byPinned !== 0) return byPinned

    if (sortBy === 'created_desc') {
      const byCreatedAt = Date.parse(right.created_at || '') - Date.parse(left.created_at || '')
      if (Number.isFinite(byCreatedAt) && byCreatedAt !== 0) return byCreatedAt
    } else if (sortBy === 'title_asc') {
      const byTitle = noteTitle(left).localeCompare(noteTitle(right), 'zh-CN')
      if (byTitle !== 0) return byTitle
    } else if (sortBy === 'status') {
      const byStatus =
        NOTE_STATUS_ORDER.indexOf(normalizeStatus(left.status)) -
        NOTE_STATUS_ORDER.indexOf(normalizeStatus(right.status))
      if (byStatus !== 0) return byStatus
    }

    const byUpdatedAt = Date.parse(right.updated_at || '') - Date.parse(left.updated_at || '')
    if (Number.isFinite(byUpdatedAt) && byUpdatedAt !== 0) return byUpdatedAt
    return noteTitle(left).localeCompare(noteTitle(right), 'zh-CN')
  })
}

export function filterNotes(notes, query, filters = {}) {
  const normalizedQuery = asString(query).trim().toLocaleLowerCase()
  const selectedTag = asString(filters.tag).trim().toLocaleLowerCase()
  const selectedCategory = normalizeCategory(filters.category).toLocaleLowerCase()
  const selectedStatus = asString(filters.status)

  const filtered = notes.filter((note) => {
    if (
      selectedTag &&
      !normalizeTags(note.tags).some((tag) => tag.toLocaleLowerCase() === selectedTag)
    ) {
      return false
    }
    if (
      selectedCategory &&
      normalizeCategory(note.category).toLocaleLowerCase() !== selectedCategory
    ) {
      return false
    }
    if (selectedStatus && normalizeStatus(note.status) !== selectedStatus) return false
    if (!normalizedQuery) return true

    const haystack = [note.title, note.content, note.category, ...(note.tags || [])]
      .join('\n')
      .toLocaleLowerCase()
    return haystack.includes(normalizedQuery)
  })

  return sortNotes(filtered, filters.sortBy)
}

export function noteToMutation(note) {
  return {
    id: note.id,
    user_id: note.user_id,
    title: asString(note.title).slice(0, MAX_TITLE_LENGTH),
    content: asString(note.content).slice(0, MAX_CONTENT_LENGTH),
    tags: normalizeTags(note.tags),
    category: normalizeCategory(note.category),
    status: normalizeStatus(note.status),
    is_pinned: note.is_pinned === true,
  }
}

export function coalescePendingOperations(operations, nextOperation) {
  const current = Array.isArray(operations) ? operations : []
  const filtered = current.filter((operation) => operation.noteId !== nextOperation.noteId)
  return [...filtered, nextOperation].sort((left, right) => left.queuedAt - right.queuedAt)
}

export function applyPendingOperations(notes, operations, userId) {
  const byId = new Map(notes.map((note) => [note.id, normalizeNote(note, userId)]))

  for (const operation of operations || []) {
    if (operation.type === 'delete') {
      byId.delete(operation.noteId)
      continue
    }

    if (operation.type === 'upsert' && operation.payload) {
      const previous = byId.get(operation.noteId)
      byId.set(
        operation.noteId,
        normalizeNote(
          {
            ...previous,
            ...operation.payload,
            created_at: previous?.created_at || operation.createdAt,
            updated_at: operation.updatedAt,
          },
          userId,
        ),
      )
    }
  }

  return sortNotes([...byId.values()])
}

export function createExportDocument(notes, exportedAt = new Date().toISOString()) {
  return {
    format: 'dezhonger-memo',
    version: 2,
    exported_at: exportedAt,
    notes: sortNotes(notes).map((note) => ({
      title: asString(note.title),
      content: asString(note.content),
      tags: normalizeTags(note.tags),
      category: normalizeCategory(note.category),
      status: normalizeStatus(note.status),
      is_pinned: note.is_pinned === true,
      created_at: asString(note.created_at),
      updated_at: asString(note.updated_at),
    })),
  }
}

export function parseImportDocument(rawText) {
  let document
  try {
    document = JSON.parse(rawText)
  } catch {
    throw new Error('无法解析 JSON 文件。')
  }

  const inputNotes = Array.isArray(document) ? document : document?.notes
  if (!Array.isArray(inputNotes)) {
    throw new Error('文件中没有有效的 notes 数组。')
  }
  if (inputNotes.length > MAX_IMPORT_NOTES) {
    throw new Error(`单次最多导入 ${MAX_IMPORT_NOTES} 条备忘录。`)
  }

  return inputNotes.map((note, index) => {
    if (!note || typeof note !== 'object') {
      throw new Error(`第 ${index + 1} 条备忘录格式不正确。`)
    }

    return {
      title: asString(note.title).slice(0, MAX_TITLE_LENGTH),
      content: asString(note.content).slice(0, MAX_CONTENT_LENGTH),
      tags: normalizeTags(note.tags),
      category: normalizeCategory(note.category),
      status: normalizeStatus(note.status),
      is_pinned: note.is_pinned === true,
      created_at: asString(note.created_at),
      updated_at: asString(note.updated_at),
    }
  })
}
