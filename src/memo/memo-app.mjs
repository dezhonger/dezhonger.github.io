import { createClient } from '@supabase/supabase-js'
import DOMPurify from 'dompurify'
import { marked } from 'marked'

import {
  applyPendingOperations,
  coalescePendingOperations,
  createBlankNote,
  createExportDocument,
  filterNotes,
  normalizeNote,
  normalizeTags,
  noteTitle,
  noteToMutation,
  parseImportDocument,
  sortNotes,
} from './memo-core.mjs'

const DATABASE_NAME = 'dezhonger-memo'
const DATABASE_VERSION = 1
const RECORD_STORE = 'records'
const STORAGE_PREFIX = 'dz-memo'
const AUTOSAVE_DELAY_MS = 650
const REMOTE_REFRESH_INTERVAL_MS = 15_000
const NOTE_SELECT = 'id,user_id,title,content,tags,created_at,updated_at'

const elements = {
  loadingView: document.querySelector('#loading-view'),
  setupView: document.querySelector('#setup-view'),
  authView: document.querySelector('#auth-view'),
  appView: document.querySelector('#app-view'),
  authForm: document.querySelector('#auth-form'),
  authEmail: document.querySelector('#auth-email'),
  authPassword: document.querySelector('#auth-password'),
  authSubmit: document.querySelector('#auth-submit'),
  authMagicLink: document.querySelector('#auth-magic-link'),
  authMessage: document.querySelector('#auth-message'),
  accountEmail: document.querySelector('#account-email'),
  signOut: document.querySelector('#sign-out'),
  onlineStatus: document.querySelector('#online-status'),
  syncStatus: document.querySelector('#sync-status'),
  syncNow: document.querySelector('#sync-now'),
  search: document.querySelector('#memo-search'),
  noteCount: document.querySelector('#note-count'),
  noteList: document.querySelector('#note-list'),
  newNote: document.querySelector('#new-note'),
  emptyNewNote: document.querySelector('#empty-new-note'),
  exportNotes: document.querySelector('#export-notes'),
  importNotes: document.querySelector('#import-notes'),
  importFile: document.querySelector('#import-file'),
  editorEmpty: document.querySelector('#editor-empty'),
  editor: document.querySelector('#memo-editor'),
  title: document.querySelector('#note-title'),
  tags: document.querySelector('#note-tags'),
  content: document.querySelector('#note-content'),
  preview: document.querySelector('#note-preview'),
  editMode: document.querySelector('#edit-mode'),
  previewMode: document.querySelector('#preview-mode'),
  deleteNote: document.querySelector('#delete-note'),
  updatedAt: document.querySelector('#note-updated-at'),
  pendingBadge: document.querySelector('#pending-badge'),
  toast: document.querySelector('#memo-toast'),
}

const state = {
  client: null,
  session: null,
  user: null,
  notes: [],
  pending: [],
  activeId: null,
  query: '',
  mode: 'edit',
  lastQueuedFingerprint: new Map(),
  autosaveTimer: null,
  flushInProgress: false,
  lastRemoteLoad: 0,
  sessionGeneration: 0,
  authHandled: false,
  operationSequence: Date.now(),
  toastTimer: null,
}

marked.setOptions({
  breaks: true,
  gfm: true,
})

function readConfig() {
  const config = window.DEZHONGER_MEMO_CONFIG || {}
  const supabaseUrl = typeof config.supabaseUrl === 'string' ? config.supabaseUrl.trim() : ''
  const supabasePublishableKey =
    typeof config.supabasePublishableKey === 'string'
      ? config.supabasePublishableKey.trim()
      : ''

  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(supabaseUrl)) return null
  if (!supabasePublishableKey || /YOUR_|待填写/i.test(supabasePublishableKey)) return null

  return { supabaseUrl, supabasePublishableKey }
}

function setVisibleView(view) {
  for (const [name, element] of [
    ['loading', elements.loadingView],
    ['setup', elements.setupView],
    ['auth', elements.authView],
    ['app', elements.appView],
  ]) {
    element.hidden = name !== view
  }
}

function setAuthMessage(message, tone = 'neutral') {
  elements.authMessage.textContent = message
  elements.authMessage.dataset.tone = tone
  elements.authMessage.hidden = !message
}

function showToast(message, tone = 'neutral') {
  window.clearTimeout(state.toastTimer)
  elements.toast.textContent = message
  elements.toast.dataset.tone = tone
  elements.toast.hidden = false
  state.toastTimer = window.setTimeout(() => {
    elements.toast.hidden = true
  }, 3200)
}

function cacheKey(userId) {
  return `${STORAGE_PREFIX}:cache:${userId}`
}

function queueKey(userId) {
  return `${STORAGE_PREFIX}:queue:${userId}`
}

function draftPrefix(userId) {
  return `${STORAGE_PREFIX}:draft:${userId}:`
}

function draftKey(userId, noteId) {
  return `${draftPrefix(userId)}${noteId}`
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB is not available'))
      return
    }

    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onerror = () => reject(request.error || new Error('Unable to open IndexedDB'))
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(RECORD_STORE)) {
        database.createObjectStore(RECORD_STORE, { keyPath: 'key' })
      }
    }
  })
}

async function readLocalRecord(key, fallbackValue) {
  try {
    const database = await openDatabase()
    const value = await new Promise((resolve, reject) => {
      const transaction = database.transaction(RECORD_STORE, 'readonly')
      const request = transaction.objectStore(RECORD_STORE).get(key)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result?.value ?? fallbackValue)
    })
    database.close()
    return value
  } catch {
    try {
      const raw = window.localStorage.getItem(key)
      return raw ? JSON.parse(raw) : fallbackValue
    } catch {
      return fallbackValue
    }
  }
}

async function writeLocalRecord(key, value) {
  try {
    const database = await openDatabase()
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(RECORD_STORE, 'readwrite')
      transaction.onerror = () => reject(transaction.error)
      transaction.oncomplete = () => resolve()
      transaction.objectStore(RECORD_STORE).put({ key, value })
    })
    database.close()
    return
  } catch {
    window.localStorage.setItem(key, JSON.stringify(value))
  }
}

async function deleteLocalRecord(key) {
  try {
    const database = await openDatabase()
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(RECORD_STORE, 'readwrite')
      transaction.onerror = () => reject(transaction.error)
      transaction.oncomplete = () => resolve()
      transaction.objectStore(RECORD_STORE).delete(key)
    })
    database.close()
  } catch {
    window.localStorage.removeItem(key)
  }
}

function clearEmergencyDrafts(userId) {
  const prefix = draftPrefix(userId)
  const keys = []
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index)
    if (key?.startsWith(prefix)) keys.push(key)
  }
  for (const key of keys) window.localStorage.removeItem(key)
}

function readEmergencyDrafts(userId) {
  const prefix = draftPrefix(userId)
  const drafts = []

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index)
    if (!key?.startsWith(prefix)) continue

    try {
      const draft = normalizeNote(JSON.parse(window.localStorage.getItem(key)), userId)
      if (draft.id && draft.user_id === userId) drafts.push(draft)
    } catch {
      window.localStorage.removeItem(key)
    }
  }

  return drafts
}

function persistEmergencyDraft(note) {
  if (!state.user || !note?.id) return
  try {
    window.localStorage.setItem(draftKey(state.user.id, note.id), JSON.stringify(note))
  } catch {
    // IndexedDB autosave remains the fallback when synchronous draft storage is full.
  }
}

function clearEmergencyDraft(noteId) {
  if (!state.user || !noteId) return
  window.localStorage.removeItem(draftKey(state.user.id, noteId))
}

function noteFingerprint(note) {
  return JSON.stringify([note?.title || '', note?.content || '', normalizeTags(note?.tags)])
}

function activeNote() {
  return state.notes.find((note) => note.id === state.activeId) || null
}

function replaceNote(nextNote) {
  const index = state.notes.findIndex((note) => note.id === nextNote.id)
  if (index === -1) state.notes.push(nextNote)
  else state.notes.splice(index, 1, nextNote)
  state.notes = sortNotes(state.notes)
}

function formatUpdatedAt(value) {
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) return '尚未同步'

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

function updateConnectionStatus() {
  const online = window.navigator.onLine
  elements.onlineStatus.textContent = online ? '在线' : '离线'
  elements.onlineStatus.dataset.online = online ? 'true' : 'false'
  elements.syncNow.disabled = !online || state.flushInProgress
}

function updateSyncStatus(message = '') {
  const pendingCount = state.pending.length
  elements.pendingBadge.hidden = pendingCount === 0
  elements.pendingBadge.textContent = `${pendingCount} 项待同步`

  if (message) {
    elements.syncStatus.textContent = message
  } else if (state.flushInProgress) {
    elements.syncStatus.textContent = '正在同步…'
  } else if (!window.navigator.onLine) {
    elements.syncStatus.textContent = pendingCount ? `离线保存 · ${pendingCount} 项待同步` : '离线缓存可用'
  } else if (pendingCount) {
    elements.syncStatus.textContent = `${pendingCount} 项等待同步`
  } else {
    elements.syncStatus.textContent = '已同步'
  }

  updateConnectionStatus()
}

function renderNoteList() {
  const visibleNotes = filterNotes(state.notes, state.query)
  elements.noteCount.textContent = state.query
    ? `${visibleNotes.length}/${state.notes.length}`
    : `${state.notes.length}`
  elements.noteList.replaceChildren()

  if (visibleNotes.length === 0) {
    const empty = document.createElement('li')
    empty.className = 'memo-list-empty'
    empty.textContent = state.query ? '没有匹配的备忘录' : '还没有备忘录'
    elements.noteList.append(empty)
    return
  }

  const pendingIds = new Set(state.pending.map((operation) => operation.noteId))
  for (const note of visibleNotes) {
    const item = document.createElement('li')
    const button = document.createElement('button')
    const heading = document.createElement('span')
    const excerpt = document.createElement('span')
    const meta = document.createElement('span')

    button.type = 'button'
    button.className = 'memo-list-item'
    button.dataset.noteId = note.id
    button.setAttribute('aria-current', note.id === state.activeId ? 'true' : 'false')

    heading.className = 'memo-list-title'
    heading.textContent = noteTitle(note)

    excerpt.className = 'memo-list-excerpt'
    excerpt.textContent = note.content.replace(/\s+/g, ' ').trim() || '暂无正文'

    meta.className = 'memo-list-meta'
    meta.textContent = `${formatUpdatedAt(note.updated_at)}${pendingIds.has(note.id) ? ' · 待同步' : ''}`

    button.append(heading, excerpt, meta)
    item.append(button)
    elements.noteList.append(item)
  }
}

function renderPreview() {
  const note = activeNote()
  if (!note) {
    elements.preview.replaceChildren()
    return
  }

  const source = note.content.trim()
  if (!source) {
    elements.preview.innerHTML = '<p class="memo-preview-placeholder">在编辑区输入 Markdown 后，这里会显示预览。</p>'
    return
  }

  const html = marked.parse(source)
  elements.preview.innerHTML = DOMPurify.sanitize(html, {
    FORBID_ATTR: ['style'],
    FORBID_TAGS: ['button', 'embed', 'form', 'iframe', 'input', 'link', 'meta', 'object', 'select', 'style', 'textarea'],
    USE_PROFILES: { html: true },
  })
}

function renderEditor() {
  const note = activeNote()
  elements.editorEmpty.hidden = Boolean(note)
  elements.editor.hidden = !note
  if (!note) return

  elements.title.value = note.title
  elements.tags.value = note.tags.join(', ')
  elements.content.value = note.content
  elements.updatedAt.textContent = `更新于 ${formatUpdatedAt(note.updated_at)}`
  elements.editMode.setAttribute('aria-pressed', state.mode === 'edit' ? 'true' : 'false')
  elements.previewMode.setAttribute('aria-pressed', state.mode === 'preview' ? 'true' : 'false')
  elements.content.hidden = state.mode !== 'edit'
  elements.preview.hidden = state.mode !== 'preview'
  renderPreview()
}

function renderAll() {
  if (state.activeId && !state.notes.some((note) => note.id === state.activeId)) {
    state.activeId = state.notes[0]?.id || null
  }
  if (!state.activeId && state.notes.length) state.activeId = state.notes[0].id
  renderNoteList()
  renderEditor()
  updateSyncStatus()
}

function captureEditorChanges() {
  const note = activeNote()
  if (!note) return null

  const candidate = {
    ...note,
    title: elements.title.value.slice(0, 200),
    content: elements.content.value.slice(0, 2_000_000),
    tags: normalizeTags(elements.tags.value),
  }
  if (noteFingerprint(candidate) === noteFingerprint(note)) return note

  const nextNote = {
    ...candidate,
    updated_at: new Date().toISOString(),
  }
  replaceNote(nextNote)
  persistEmergencyDraft(nextNote)
  return nextNote
}

async function persistCache() {
  if (!state.user) return
  await writeLocalRecord(cacheKey(state.user.id), state.notes)
}

async function persistPendingQueue() {
  if (!state.user) return
  await writeLocalRecord(queueKey(state.user.id), state.pending)
}

function nextOperationStamp() {
  state.operationSequence = Math.max(state.operationSequence + 1, Date.now())
  return state.operationSequence
}

async function queueUpsert(note) {
  const queuedAt = nextOperationStamp()
  state.pending = coalescePendingOperations(state.pending, {
    type: 'upsert',
    noteId: note.id,
    payload: noteToMutation(note),
    createdAt: note.created_at,
    updatedAt: note.updated_at,
    queuedAt,
  })
  state.lastQueuedFingerprint.set(note.id, noteFingerprint(note))
  await Promise.all([persistCache(), persistPendingQueue()])
  clearEmergencyDraft(note.id)
  updateSyncStatus()
}

async function queueDelete(noteId) {
  state.pending = coalescePendingOperations(state.pending, {
    type: 'delete',
    noteId,
    queuedAt: nextOperationStamp(),
  })
  await Promise.all([persistCache(), persistPendingQueue()])
  clearEmergencyDraft(noteId)
  updateSyncStatus()
}

async function saveActiveNote({ flush = true } = {}) {
  window.clearTimeout(state.autosaveTimer)
  state.autosaveTimer = null
  const note = captureEditorChanges()
  if (!note) return

  if (state.lastQueuedFingerprint.get(note.id) !== noteFingerprint(note)) {
    updateSyncStatus('正在本地保存…')
    await queueUpsert(note)
    renderNoteList()
  }

  if (flush) await flushPendingOperations()
}

function scheduleAutosave() {
  const note = captureEditorChanges()
  if (!note) return
  renderNoteList()
  if (state.mode === 'preview') renderPreview()
  updateSyncStatus('等待自动保存…')

  window.clearTimeout(state.autosaveTimer)
  state.autosaveTimer = window.setTimeout(() => {
    saveActiveNote().catch((error) => {
      console.error(error)
      updateSyncStatus('已保存在本地，远程同步失败')
    })
  }, AUTOSAVE_DELAY_MS)
}

async function refreshFromRemote({ silent = false } = {}) {
  if (!state.client || !state.user || !window.navigator.onLine) return
  if (!silent) updateSyncStatus('正在刷新…')

  const { data, error } = await state.client
    .from('notes')
    .select(NOTE_SELECT)
    .order('updated_at', { ascending: false })

  if (error) throw error

  state.notes = applyPendingOperations(data || [], state.pending, state.user.id)
  state.lastRemoteLoad = Date.now()
  for (const note of state.notes) {
    if (!state.pending.some((operation) => operation.noteId === note.id)) {
      state.lastQueuedFingerprint.set(note.id, noteFingerprint(note))
    }
  }
  await persistCache()
  renderAll()
}

async function flushPendingOperations() {
  if (
    state.flushInProgress ||
    !state.client ||
    !state.user ||
    !window.navigator.onLine ||
    state.pending.length === 0
  ) {
    updateSyncStatus()
    return
  }

  state.flushInProgress = true
  updateSyncStatus()
  let completedAny = false

  try {
    while (state.pending.length && window.navigator.onLine) {
      const operation = state.pending[0]
      let savedNote = null

      if (operation.type === 'delete') {
        const { error } = await state.client.from('notes').delete().eq('id', operation.noteId)
        if (error) throw error
      } else {
        const { data, error } = await state.client
          .from('notes')
          .upsert(operation.payload, { onConflict: 'id' })
          .select(NOTE_SELECT)
          .single()
        if (error) throw error
        savedNote = normalizeNote(data, state.user.id)
      }

      const hasNewerOperation = state.pending.some(
        (candidate) =>
          candidate.noteId === operation.noteId && candidate.queuedAt > operation.queuedAt,
      )
      state.pending = state.pending.filter(
        (candidate) =>
          !(
            candidate.noteId === operation.noteId &&
            candidate.queuedAt === operation.queuedAt
          ),
      )

      if (savedNote && !hasNewerOperation) {
        replaceNote(savedNote)
        state.lastQueuedFingerprint.set(savedNote.id, noteFingerprint(savedNote))
      }

      completedAny = true
      await Promise.all([persistCache(), persistPendingQueue()])
      renderNoteList()
      updateSyncStatus()
    }
  } catch (error) {
    console.error(error)
    updateSyncStatus('已保存在本地，远程同步失败')
    showToast('同步失败，联网后将自动重试。', 'danger')
  } finally {
    state.flushInProgress = false
    updateSyncStatus()
  }

  if (completedAny && state.pending.length === 0 && window.navigator.onLine) {
    try {
      await refreshFromRemote({ silent: true })
    } catch (error) {
      console.error(error)
    }
  }
}

async function hydrateUser(user, generation) {
  const [cachedNotes, pendingOperations] = await Promise.all([
    readLocalRecord(cacheKey(user.id), []),
    readLocalRecord(queueKey(user.id), []),
  ])
  if (generation !== state.sessionGeneration) return

  state.pending = Array.isArray(pendingOperations) ? pendingOperations : []
  state.notes = applyPendingOperations(
    Array.isArray(cachedNotes) ? cachedNotes : [],
    state.pending,
    user.id,
  )

  const emergencyDrafts = readEmergencyDrafts(user.id)
  for (const draft of emergencyDrafts) {
    replaceNote(draft)
    state.pending = coalescePendingOperations(state.pending, {
      type: 'upsert',
      noteId: draft.id,
      payload: noteToMutation(draft),
      createdAt: draft.created_at,
      updatedAt: draft.updated_at,
      queuedAt: nextOperationStamp(),
    })
    state.lastQueuedFingerprint.set(draft.id, noteFingerprint(draft))
  }
  if (emergencyDrafts.length) {
    await Promise.all([persistCache(), persistPendingQueue()])
    clearEmergencyDrafts(user.id)
  }

  for (const note of state.notes) {
    if (!state.lastQueuedFingerprint.has(note.id)) {
      state.lastQueuedFingerprint.set(note.id, noteFingerprint(note))
    }
  }

  renderAll()

  if (!window.navigator.onLine) return
  try {
    await flushPendingOperations()
    await refreshFromRemote({ silent: state.notes.length > 0 })
  } catch (error) {
    console.error(error)
    updateSyncStatus('正在使用本地缓存')
    showToast('无法连接远程存储，当前显示本地缓存。', 'danger')
  }
}

async function activateSession(session) {
  const nextUserId = session?.user?.id || null
  const currentUserId = state.user?.id || null
  if (
    state.authHandled &&
    nextUserId === currentUserId &&
    Boolean(session) === Boolean(state.session)
  ) {
    return
  }
  state.authHandled = true

  state.sessionGeneration += 1
  const generation = state.sessionGeneration
  state.session = session || null
  state.user = session?.user || null
  state.notes = []
  state.pending = []
  state.activeId = null
  state.lastQueuedFingerprint.clear()

  if (!state.user) {
    setVisibleView('auth')
    elements.accountEmail.textContent = ''
    elements.accountEmail.hidden = true
    elements.signOut.hidden = true
    return
  }

  elements.accountEmail.textContent = state.user.email || '已登录'
  elements.accountEmail.hidden = false
  elements.signOut.hidden = false
  setVisibleView('app')
  updateConnectionStatus()
  await hydrateUser(state.user, generation)
}

async function createNewNote() {
  await saveActiveNote({ flush: false })
  const note = createBlankNote(state.user.id, window.crypto.randomUUID())
  replaceNote(note)
  state.activeId = note.id
  state.query = ''
  elements.search.value = ''
  await queueUpsert(note)
  renderAll()
  elements.title.focus()
  flushPendingOperations().catch(console.error)
}

async function selectNote(noteId) {
  if (noteId === state.activeId) return
  await saveActiveNote({ flush: false })
  state.activeId = noteId
  renderAll()
}

async function deleteActiveNote() {
  const note = activeNote()
  if (!note) return
  const confirmed = window.confirm(`确定删除“${noteTitle(note)}”吗？此操作会同步到其他浏览器。`)
  if (!confirmed) return

  window.clearTimeout(state.autosaveTimer)
  state.notes = state.notes.filter((candidate) => candidate.id !== note.id)
  state.lastQueuedFingerprint.delete(note.id)
  state.activeId = sortNotes(state.notes)[0]?.id || null
  await queueDelete(note.id)
  renderAll()
  showToast('备忘录已删除。')
  flushPendingOperations().catch(console.error)
}

function exportNotes() {
  const document = createExportDocument(state.notes)
  const blob = new Blob([`${JSON.stringify(document, null, 2)}\n`], {
    type: 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = documentCreateDownloadLink(url)
  link.click()
  URL.revokeObjectURL(url)
  showToast(`已导出 ${state.notes.length} 条备忘录。`)
}

function documentCreateDownloadLink(url) {
  const link = document.createElement('a')
  const date = new Date().toISOString().slice(0, 10)
  link.href = url
  link.download = `dezhonger-memo-${date}.json`
  return link
}

async function importNotes(file) {
  if (!file) return
  if (file.size > 5 * 1024 * 1024) throw new Error('导入文件不能超过 5 MB。')

  await saveActiveNote({ flush: false })
  const imported = parseImportDocument(await file.text())
  const now = new Date().toISOString()

  for (const source of imported) {
    const note = normalizeNote(
      {
        ...source,
        id: window.crypto.randomUUID(),
        user_id: state.user.id,
        created_at: source.created_at || now,
        updated_at: now,
      },
      state.user.id,
    )
    replaceNote(note)
    state.pending = coalescePendingOperations(state.pending, {
      type: 'upsert',
      noteId: note.id,
      payload: noteToMutation(note),
      createdAt: note.created_at,
      updatedAt: note.updated_at,
      queuedAt: nextOperationStamp(),
    })
    state.lastQueuedFingerprint.set(note.id, noteFingerprint(note))
  }

  state.activeId = sortNotes(state.notes)[0]?.id || null
  state.query = ''
  elements.search.value = ''
  await Promise.all([persistCache(), persistPendingQueue()])
  renderAll()
  showToast(`已导入 ${imported.length} 条备忘录。`)
  flushPendingOperations().catch(console.error)
}

function setAuthBusy(busy) {
  elements.authSubmit.disabled = busy
  elements.authMagicLink.disabled = busy
}

function authErrorMessage(error, fallbackMessage) {
  if (error?.code === 'invalid_credentials') return '邮箱或密码不正确。'
  if (error?.code === 'email_not_confirmed') return '该邮箱尚未确认，请先在 Supabase 中确认用户。'
  if (error?.code === 'over_email_send_rate_limit') {
    return 'Supabase 登录邮件额度已用完，请稍后重试或直接使用密码登录。'
  }
  if (/not authorized/i.test(error?.message || '')) {
    return '该邮箱不在 Supabase 默认邮件服务的授权收件人范围内，请使用密码登录。'
  }
  return fallbackMessage
}

async function signInWithPassword(event) {
  event.preventDefault()
  const email = elements.authEmail.value.trim()
  const password = elements.authPassword.value
  if (!email || !password) return

  setAuthBusy(true)
  setAuthMessage('正在登录…')
  try {
    window.sessionStorage.setItem(`${STORAGE_PREFIX}:login-email`, email)
    const { error } = await state.client.auth.signInWithPassword({ email, password })
    if (error) throw error

    elements.authPassword.value = ''
    setAuthMessage('登录成功，正在加载备忘录…', 'success')
  } catch (error) {
    console.error(error)
    setAuthMessage(authErrorMessage(error, '登录失败，请稍后重试。'), 'danger')
  } finally {
    setAuthBusy(false)
  }
}

async function requestMagicLink() {
  if (!elements.authEmail.reportValidity()) return
  const email = elements.authEmail.value.trim()

  setAuthBusy(true)
  setAuthMessage('正在发送登录邮件…')
  try {
    window.sessionStorage.setItem(`${STORAGE_PREFIX}:login-email`, email)
    const redirectUrl = new URL('/memo/', window.location.origin).toString()
    const { error } = await state.client.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectUrl,
        shouldCreateUser: false,
      },
    })
    if (error) throw error

    setAuthMessage('登录邮件已发送。请在需要使用备忘录的浏览器中打开邮件里的登录链接。', 'success')
  } catch (error) {
    console.error(error)
    setAuthMessage(authErrorMessage(error, '发送失败，请确认邮箱已由站点管理员创建。'), 'danger')
  } finally {
    setAuthBusy(false)
  }
}

async function signOut() {
  elements.signOut.disabled = true
  try {
    await saveActiveNote()
    await flushPendingOperations()
    if (state.pending.length) {
      showToast('仍有内容未同步，暂不退出以避免丢失。', 'danger')
      return
    }

    const userId = state.user.id
    await Promise.all([deleteLocalRecord(cacheKey(userId)), deleteLocalRecord(queueKey(userId))])
    clearEmergencyDrafts(userId)
    const { error } = await state.client.auth.signOut()
    if (error) throw error
  } catch (error) {
    console.error(error)
    showToast('退出失败，请稍后重试。', 'danger')
  } finally {
    elements.signOut.disabled = false
  }
}

async function syncNow() {
  elements.syncNow.disabled = true
  try {
    await saveActiveNote({ flush: false })
    await flushPendingOperations()
    await refreshFromRemote()
    showToast('同步完成。', 'success')
  } catch (error) {
    console.error(error)
    showToast('同步失败，已保留本地内容。', 'danger')
    updateSyncStatus('同步失败')
  } finally {
    updateConnectionStatus()
  }
}

function switchMode(mode) {
  if (mode !== 'edit' && mode !== 'preview') return
  captureEditorChanges()
  state.mode = mode
  renderEditor()
}

function bindEvents() {
  elements.authForm.addEventListener('submit', signInWithPassword)
  elements.authMagicLink.addEventListener('click', requestMagicLink)
  elements.signOut.addEventListener('click', signOut)
  elements.syncNow.addEventListener('click', syncNow)
  elements.newNote.addEventListener('click', () => createNewNote().catch(console.error))
  elements.emptyNewNote.addEventListener('click', () => createNewNote().catch(console.error))
  elements.deleteNote.addEventListener('click', () => deleteActiveNote().catch(console.error))
  elements.exportNotes.addEventListener('click', exportNotes)
  elements.importNotes.addEventListener('click', () => elements.importFile.click())
  elements.importFile.addEventListener('change', () => {
    const [file] = elements.importFile.files
    importNotes(file)
      .catch((error) => {
        console.error(error)
        showToast(error.message || '导入失败。', 'danger')
      })
      .finally(() => {
        elements.importFile.value = ''
      })
  })
  elements.search.addEventListener('input', () => {
    state.query = elements.search.value
    renderNoteList()
  })
  elements.noteList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-note-id]')
    if (button) selectNote(button.dataset.noteId).catch(console.error)
  })
  for (const input of [elements.title, elements.tags, elements.content]) {
    input.addEventListener('input', scheduleAutosave)
  }
  elements.editMode.addEventListener('click', () => switchMode('edit'))
  elements.previewMode.addEventListener('click', () => switchMode('preview'))

  window.addEventListener('online', () => {
    updateConnectionStatus()
    showToast('网络已恢复，正在同步。', 'success')
    flushPendingOperations()
      .then(() => refreshFromRemote({ silent: true }))
      .catch(console.error)
  })
  window.addEventListener('offline', () => {
    updateSyncStatus()
    showToast('已离线，修改会先保存在当前浏览器。')
  })
  window.addEventListener('focus', () => {
    if (
      state.user &&
      window.navigator.onLine &&
      Date.now() - state.lastRemoteLoad > REMOTE_REFRESH_INTERVAL_MS
    ) {
      saveActiveNote({ flush: false })
        .then(() => flushPendingOperations())
        .then(() => refreshFromRemote({ silent: true }))
        .catch(console.error)
    }
  })
  window.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === 's') {
      event.preventDefault()
      saveActiveNote()
        .then(() => showToast('已保存。', 'success'))
        .catch(console.error)
    }
  })
}

function showAuthErrorFromUrl() {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const queryParams = new URLSearchParams(window.location.search)
  const description = hashParams.get('error_description') || queryParams.get('error_description')
  if (description) setAuthMessage(description, 'danger')
}

async function bootstrap() {
  bindEvents()
  updateConnectionStatus()
  elements.authEmail.value = window.sessionStorage.getItem(`${STORAGE_PREFIX}:login-email`) || ''

  const config = readConfig()
  if (!config) {
    setVisibleView('setup')
    return
  }

  state.client = createClient(config.supabaseUrl, config.supabasePublishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      persistSession: true,
      storageKey: `${STORAGE_PREFIX}:auth`,
    },
  })

  state.client.auth.onAuthStateChange((_event, session) => {
    window.setTimeout(() => {
      activateSession(session).catch((error) => {
        console.error(error)
        showToast('登录状态初始化失败。', 'danger')
      })
    }, 0)
  })

  const {
    data: { session },
    error,
  } = await state.client.auth.getSession()
  if (error) throw error

  showAuthErrorFromUrl()
  await activateSession(session)
}

bootstrap().catch((error) => {
  console.error(error)
  setVisibleView('auth')
  setAuthMessage('初始化失败，请刷新页面后重试。', 'danger')
})
