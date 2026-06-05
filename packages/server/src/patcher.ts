import { applyPatch, createPatch } from 'diff'
import type { FileIndex } from './file-index.js'

function extractFilePath(diffText: string): string | null {
  const match = diffText.match(/^--- (?:a\/)?(.+)$/m)
  if (!match) return null
  return match[1].trim()
}

function fixHunkHeaders(diffText: string, original: string): string {
  const lines = diffText.split('\n')
  const result: string[] = []
  const originalLines = original.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Hunk header with missing or incomplete line numbers: @@ or @@ -x @@
    if (/^@@[\s-+\d,]*@@/.test(line) && !/^@@ -\d+,\d+ \+\d+,\d+ @@/.test(line)) {
      // Collect the removed lines from this hunk to find where they are in the original
      const removedLines: string[] = []
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].startsWith('-')) removedLines.push(lines[j].slice(1))
        else if (!lines[j].startsWith('+') && !lines[j].startsWith('\\')) removedLines.push(lines[j].slice(1) || lines[j])
        if (lines[j].startsWith('@@') && j !== i) break
      }

      // Find the start line in the original
      let startLine = 1
      if (removedLines.length > 0) {
        const firstRemoved = removedLines[0]
        const idx = originalLines.findIndex((l) => l.trim() === firstRemoved.trim())
        if (idx !== -1) startLine = idx + 1
      }

      // Count added/removed lines in this hunk
      let removed = 0, added = 0
      for (let j = i + 1; j < lines.length && !lines[j].startsWith('@@'); j++) {
        if (lines[j].startsWith('-')) removed++
        else if (lines[j].startsWith('+')) added++
      }

      result.push(`@@ -${startLine},${removed} +${startLine},${added} @@`)
      continue
    }

    result.push(line)
  }

  return result.join('\n')
}

function applySimpleReplacement(
  original: string,
  diffText: string,
): string | false {
  const lines = diffText.split('\n')
  const removedLines: string[] = []
  const addedLines: string[] = []

  for (const line of lines) {
    if (line.startsWith('---') || line.startsWith('+++') || line.startsWith('@@') || line.startsWith('\\')) continue
    if (line.startsWith('-')) removedLines.push(line.slice(1))
    else if (line.startsWith('+')) addedLines.push(line.slice(1))
  }

  if (removedLines.length === 0) return false

  const removedBlock = removedLines.join('\n')
  const addedBlock = addedLines.join('\n')

  if (!original.includes(removedBlock)) {
    // Try trimmed match: rebuild the replacement using trimmed lines
    const trimmedOriginal = original.split('\n').map((l) => l.trimEnd()).join('\n')
    const trimmedRemoved = removedLines.map((l) => l.trimEnd()).join('\n')
    const trimmedAdded = addedLines.map((l) => l.trimEnd()).join('\n')
    if (!trimmedOriginal.includes(trimmedRemoved)) return false
    return trimmedOriginal.replace(trimmedRemoved, trimmedAdded)
  }

  return original.replace(removedBlock, addedBlock)
}

export function applyDiff(
  diffText: string,
  fileIndex: FileIndex,
): { success: boolean; file?: string; error?: string } {
  const relPath = extractFilePath(diffText)
  if (!relPath) {
    return { success: false, error: 'Could not parse target file from diff' }
  }

  const original = fileIndex.readFile(relPath)
  if (original === null) {
    return { success: false, error: `File not found: ${relPath}` }
  }

  function tryApply(text: string, opts?: Parameters<typeof applyPatch>[2]): string | false {
    try {
      return applyPatch(original, text, opts)
    } catch {
      return false
    }
  }

  // 1. Try applying as-is
  let patched: string | false = tryApply(diffText)

  // 2. Try fixing broken hunk headers
  if (patched === false) {
    const fixed = fixHunkHeaders(diffText, original)
    patched = tryApply(fixed)
  }

  // 3. Try with fuzz factor
  if (patched === false) {
    patched = tryApply(diffText, { fuzzFactor: 4 })
  }

  // 4. Fall back to simple string replacement
  if (patched === false) {
    patched = applySimpleReplacement(original, diffText)
  }

  if (patched === false) {
    return { success: false, error: `Patch did not apply cleanly to ${relPath}` }
  }

  fileIndex.writeFile(relPath, patched)
  return { success: true, file: relPath }
}
