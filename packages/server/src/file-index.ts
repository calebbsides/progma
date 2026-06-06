import fs from 'node:fs'
import path from 'node:path'
import fg from 'fast-glob'
import ignore from 'ignore'
import chokidar from 'chokidar'

export class FileIndex {
  private projectRoot: string
  private files: Set<string> = new Set()
  private ig = ignore()
  private watcher?: ReturnType<typeof chokidar.watch>
  readonly ready: Promise<void>

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot
    this.loadIgnore()
    this.ready = this.index().catch((err) => {
      console.error('[Protozoan] FileIndex scan failed:', err)
    })
    this.watch()
  }

  private loadIgnore() {
    const gitignorePath = path.join(this.projectRoot, '.gitignore')
    if (fs.existsSync(gitignorePath)) {
      this.ig.add(fs.readFileSync(gitignorePath, 'utf8'))
    }
    this.ig.add(['node_modules', 'dist', '.protozoan', '.git'])
  }

  private async index() {
    const entries = await fg('**/*.{ts,tsx,js,jsx,css,html,vue,svelte}', {
      cwd: this.projectRoot,
      ignore: ['node_modules/**', 'dist/**', '.protozoan/**', '.git/**'],
      absolute: true,
    })
    this.files = new Set(entries)
  }

  private watch() {
    this.watcher = chokidar.watch(this.projectRoot, {
      ignored: [/node_modules/, /dist/, /\.protozoan/, /\.git/],
      ignoreInitial: true,
      persistent: false,
    })
    this.watcher
      .on('add', (f) => this.files.add(f))
      .on('unlink', (f) => this.files.delete(f))
  }

  getAll(): string[] {
    return Array.from(this.files)
  }

  getRelative(): string[] {
    return this.getAll().map((f) => path.relative(this.projectRoot, f))
  }

  resolve(relPath: string): string | null {
    const abs = path.resolve(this.projectRoot, relPath)
    if (!abs.startsWith(this.projectRoot + path.sep) && abs !== this.projectRoot) return null
    return abs
  }

  readFile(relPath: string): string | null {
    const abs = this.resolve(relPath)
    if (!abs || !fs.existsSync(abs)) return null
    return fs.readFileSync(abs, 'utf8')
  }

  writeFile(relPath: string, content: string) {
    const abs = this.resolve(relPath)
    if (!abs) throw new Error(`Path traversal denied: ${relPath}`)
    fs.writeFileSync(abs, content, 'utf8')
  }

  close() {
    this.watcher?.close()
  }
}
