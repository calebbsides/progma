import { describe, it, expect } from 'vitest'
import { hashString, fingerprintsMatch } from './fingerprint.js'

describe('hashString', () => {
  it('returns a string', () => {
    expect(typeof hashString('hello')).toBe('string')
  })

  it('is deterministic', () => {
    expect(hashString('foo')).toBe(hashString('foo'))
  })

  it('produces different hashes for different inputs', () => {
    expect(hashString('foo')).not.toBe(hashString('bar'))
  })

  it('handles empty string', () => {
    expect(() => hashString('')).not.toThrow()
  })
})

describe('fingerprintsMatch', () => {
  const base = { tag: 'h1', domPathHash: 'abc123', textSnippet: 'Hello' }

  it('matches by dataProtozoanId when both have it', () => {
    const a = { ...base, dataProtozoanId: 'id-1' }
    const b = { ...base, domPathHash: 'different', dataProtozoanId: 'id-1' }
    expect(fingerprintsMatch(a, b)).toBe(true)
  })

  it('does not match when dataProtozoanIds differ', () => {
    const a = { ...base, dataProtozoanId: 'id-1' }
    const b = { ...base, dataProtozoanId: 'id-2' }
    expect(fingerprintsMatch(a, b)).toBe(false)
  })

  it('falls back to domPathHash + tag when no dataProtozoanId', () => {
    expect(fingerprintsMatch(base, { ...base })).toBe(true)
  })

  it('does not match when domPathHash differs', () => {
    expect(fingerprintsMatch(base, { ...base, domPathHash: 'zzz' })).toBe(false)
  })

  it('does not match when tag differs', () => {
    expect(fingerprintsMatch(base, { ...base, tag: 'h2' })).toBe(false)
  })

  it('uses dataProtozoanId even if domPathHash differs', () => {
    const a = { ...base, domPathHash: 'aaa', dataProtozoanId: 'same' }
    const b = { ...base, domPathHash: 'bbb', dataProtozoanId: 'same' }
    expect(fingerprintsMatch(a, b)).toBe(true)
  })

  it('falls back to hash+tag match when only one side has dataProtozoanId', () => {
    const a = { ...base, dataProtozoanId: 'id-1' }
    const b = { ...base } // no dataProtozoanId — falls back to hash+tag, which match
    expect(fingerprintsMatch(a, b)).toBe(true)
  })

  it('does not match when only one side has dataProtozoanId and hashes differ', () => {
    const a = { ...base, domPathHash: 'aaa', dataProtozoanId: 'id-1' }
    const b = { ...base, domPathHash: 'bbb' }
    expect(fingerprintsMatch(a, b)).toBe(false)
  })
})
