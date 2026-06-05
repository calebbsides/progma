import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { AnnotationStore } from './annotations.js'

const FINGERPRINT = {
  tag: 'h1',
  domPathHash: 'abc123',
  textSnippet: 'Hello',
  boundingBox: { x: 0, y: 0, width: 100, height: 50 },
}

let tmpDir: string
let store: AnnotationStore

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'progma-ann-test-'))
  store = new AnnotationStore(tmpDir)
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('AnnotationStore', () => {
  it('adds an annotation and returns it', () => {
    const ann = store.add({ fingerprint: FINGERPRINT, comment: 'Fix this' })
    expect(ann.id).toBeTruthy()
    expect(ann.comment).toBe('Fix this')
    expect(ann.resolved).toBe(false)
    expect(ann.fingerprint).toEqual(FINGERPRINT)
  })

  it('persists annotations to disk', () => {
    store.add({ fingerprint: FINGERPRINT, comment: 'Persisted' })
    const store2 = new AnnotationStore(tmpDir)
    expect(store2.getAll()).toHaveLength(1)
    expect(store2.getAll()[0].comment).toBe('Persisted')
  })

  it('returns all annotations', () => {
    store.add({ fingerprint: FINGERPRINT, comment: 'First' })
    store.add({ fingerprint: FINGERPRINT, comment: 'Second' })
    expect(store.getAll()).toHaveLength(2)
  })

  it('resolves an annotation by id', () => {
    const ann = store.add({ fingerprint: FINGERPRINT, comment: 'Resolve me' })
    const ok = store.resolve(ann.id)
    expect(ok).toBe(true)
    expect(store.getAll()[0].resolved).toBe(true)
  })

  it('returns false when resolving a non-existent id', () => {
    expect(store.resolve('no-such-id')).toBe(false)
  })

  it('creates the .progma directory if it does not exist', () => {
    const dir = path.join(tmpDir, '.progma')
    expect(fs.existsSync(dir)).toBe(true)
  })

  it('handles a corrupt annotations.json gracefully', () => {
    const dir = path.join(tmpDir, '.progma')
    fs.writeFileSync(path.join(dir, 'annotations.json'), 'not json')
    const store2 = new AnnotationStore(tmpDir)
    expect(store2.getAll()).toEqual([])
  })

  it('stamps createdAt and updatedAt on add', () => {
    const before = new Date().toISOString()
    const ann = store.add({ fingerprint: FINGERPRINT, comment: 'Timestamps' })
    expect(ann.createdAt >= before).toBe(true)
    expect(ann.updatedAt).toBe(ann.createdAt)
  })

  it('updates updatedAt on resolve', () => {
    const ann = store.add({ fingerprint: FINGERPRINT, comment: 'Update time' })
    const createdAt = ann.createdAt
    store.resolve(ann.id)
    const resolved = store.getAll()[0]
    expect(resolved.updatedAt >= createdAt).toBe(true)
  })
})
