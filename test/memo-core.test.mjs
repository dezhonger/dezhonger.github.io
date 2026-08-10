import test from 'node:test'
import assert from 'node:assert/strict'

import {
  applyPendingOperations,
  coalescePendingOperations,
  createExportDocument,
  filterNotes,
  normalizeTags,
  parseImportDocument,
} from '../src/memo/memo-core.mjs'

test('normalizeTags trims, deduplicates, and supports Chinese commas', () => {
  assert.deepEqual(normalizeTags('工作，待办, 工作,  灵感  '), ['工作', '待办', '灵感'])
})

test('filterNotes searches title, content, and tags', () => {
  const notes = [
    { id: '1', title: '周报', content: '', tags: [], updated_at: '2026-08-10T10:00:00Z' },
    { id: '2', title: '想法', content: 'Supabase 同步', tags: ['工程'], updated_at: '2026-08-10T11:00:00Z' },
  ]

  assert.deepEqual(filterNotes(notes, '工程').map((note) => note.id), ['2'])
  assert.deepEqual(filterNotes(notes, 'supabase').map((note) => note.id), ['2'])
})

test('coalescePendingOperations keeps only the latest operation per note', () => {
  const operations = [
    { type: 'upsert', noteId: '1', queuedAt: 1 },
    { type: 'upsert', noteId: '2', queuedAt: 2 },
  ]
  const result = coalescePendingOperations(operations, {
    type: 'delete',
    noteId: '1',
    queuedAt: 3,
  })

  assert.deepEqual(result, [
    { type: 'upsert', noteId: '2', queuedAt: 2 },
    { type: 'delete', noteId: '1', queuedAt: 3 },
  ])
})

test('applyPendingOperations overlays offline changes and deletes', () => {
  const notes = [
    {
      id: '1',
      user_id: 'u1',
      title: '旧标题',
      content: '',
      tags: [],
      created_at: '2026-08-10T10:00:00Z',
      updated_at: '2026-08-10T10:00:00Z',
    },
    {
      id: '2',
      user_id: 'u1',
      title: '删除我',
      content: '',
      tags: [],
      created_at: '2026-08-10T10:00:00Z',
      updated_at: '2026-08-10T10:00:00Z',
    },
  ]

  const result = applyPendingOperations(
    notes,
    [
      {
        type: 'upsert',
        noteId: '1',
        payload: { id: '1', user_id: 'u1', title: '离线标题', content: '', tags: [] },
        createdAt: '2026-08-10T10:00:00Z',
        updatedAt: '2026-08-10T12:00:00Z',
      },
      { type: 'delete', noteId: '2', queuedAt: 2 },
    ],
    'u1',
  )

  assert.equal(result.length, 1)
  assert.equal(result[0].title, '离线标题')
})

test('exports and imports the stable public format', () => {
  const document = createExportDocument([
    {
      title: '测试',
      content: '# 内容',
      tags: ['标签'],
      created_at: '2026-08-10T10:00:00Z',
      updated_at: '2026-08-10T11:00:00Z',
    },
  ])
  const notes = parseImportDocument(JSON.stringify(document))

  assert.equal(document.format, 'dezhonger-memo')
  assert.deepEqual(notes[0], {
    title: '测试',
    content: '# 内容',
    tags: ['标签'],
    created_at: '2026-08-10T10:00:00Z',
    updated_at: '2026-08-10T11:00:00Z',
  })
})
