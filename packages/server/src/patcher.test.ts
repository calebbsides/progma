import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { applyDiff } from './patcher.js'
import { FileIndex } from './file-index.js'

const ORIGINAL = `function App() {
  return (
    <div>
      <h1>Get started</h1>
      <p>Edit src/App.tsx</p>
    </div>
  )
}
`

let tmpDir: string
let fileIndex: FileIndex

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'protozoan-test-'))
  fs.writeFileSync(path.join(tmpDir, 'App.tsx'), ORIGINAL)
  fileIndex = new FileIndex(tmpDir)
})

afterEach(() => {
  fileIndex.close()
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('applyDiff', () => {
  it('applies a well-formed unified diff', () => {
    const diff = `--- a/App.tsx
+++ b/App.tsx
@@ -3,5 +3,5 @@
   return (
     <div>
-      <h1>Get started</h1>
+      <h1>Protozoan</h1>
       <p>Edit src/App.tsx</p>
     </div>
`
    const result = applyDiff(diff, fileIndex)
    expect(result.success).toBe(true)
    expect(result.file).toBe('App.tsx')
    const content = fs.readFileSync(path.join(tmpDir, 'App.tsx'), 'utf8')
    expect(content).toContain('<h1>Protozoan</h1>')
    expect(content).not.toContain('<h1>Get started</h1>')
  })

  it('applies a diff with a broken @@ header (no line numbers)', () => {
    const diff = `--- a/App.tsx
+++ b/App.tsx
@@
-      <h1>Get started</h1>
+      <h1>Protozoan</h1>
`
    const result = applyDiff(diff, fileIndex)
    expect(result.success).toBe(true)
    const content = fs.readFileSync(path.join(tmpDir, 'App.tsx'), 'utf8')
    expect(content).toContain('<h1>Protozoan</h1>')
  })

  it('falls back to simple string replacement', () => {
    const diff = `--- a/App.tsx
+++ b/App.tsx
@@ @@
-      <p>Edit src/App.tsx</p>
+      <p>Welcome to Protozoan</p>
`
    const result = applyDiff(diff, fileIndex)
    expect(result.success).toBe(true)
    const content = fs.readFileSync(path.join(tmpDir, 'App.tsx'), 'utf8')
    expect(content).toContain('Welcome to Protozoan')
  })

  it('returns error when file not found', () => {
    const diff = `--- a/nonexistent.tsx
+++ b/nonexistent.tsx
@@ -1,1 +1,1 @@
-old
+new
`
    const result = applyDiff(diff, fileIndex)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/not found/)
  })

  it('returns error when diff has no file header', () => {
    const result = applyDiff('not a diff', fileIndex)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/parse/)
  })

  it('does not modify the file when patch fails', () => {
    // All 4 strategies should fail: unique string not in file, no matching context
    const diff = `--- a/App.tsx
+++ b/App.tsx
@@ -1,3 +1,3 @@
-THIS_LINE_DOES_NOT_EXIST_XYZ_UNIQUE_12345
+replacement
`
    const before = fs.readFileSync(path.join(tmpDir, 'App.tsx'), 'utf8')
    const result = applyDiff(diff, fileIndex)
    const after = fs.readFileSync(path.join(tmpDir, 'App.tsx'), 'utf8')
    expect(result.success).toBe(false)
    expect(after).toBe(before)
  })
})
