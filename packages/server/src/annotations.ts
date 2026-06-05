import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import type { Annotation, AnnotationSavePayload } from '@progma/core'
import { fingerprintsMatch } from '@progma/core'

export class AnnotationStore {
  private filePath: string
  private annotations: Annotation[] = []

  constructor(projectRoot: string) {
    const dir = path.join(projectRoot, '.progma')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    this.filePath = path.join(dir, 'annotations.json')
    this.load()
  }

  private load() {
    if (fs.existsSync(this.filePath)) {
      try {
        this.annotations = JSON.parse(fs.readFileSync(this.filePath, 'utf8'))
      } catch {
        this.annotations = []
      }
    }
  }

  private save() {
    fs.writeFileSync(this.filePath, JSON.stringify(this.annotations, null, 2))
  }

  add(payload: AnnotationSavePayload): Annotation {
    const now = new Date().toISOString()
    const annotation: Annotation = {
      id: randomUUID(),
      fingerprint: payload.fingerprint,
      comment: payload.comment,
      filePath: payload.filePath,
      resolved: false,
      createdAt: now,
      updatedAt: now,
    }
    this.annotations.push(annotation)
    this.save()
    return annotation
  }

  resolve(id: string): boolean {
    const ann = this.annotations.find((a) => a.id === id)
    if (!ann) return false
    ann.resolved = true
    ann.updatedAt = new Date().toISOString()
    this.save()
    return true
  }

  getAll(): Annotation[] {
    return this.annotations
  }

  getForPage(url: string): Annotation[] {
    return this.annotations.filter((a) => !a.resolved && a.fingerprint.pageUrl === url)
  }
}
