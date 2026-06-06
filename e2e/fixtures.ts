import { test as base } from '@playwright/test'
import { spawn, type ChildProcess } from 'node:child_process'
import net from 'node:net'
import path from 'node:path'

const ROOT = path.join(__dirname, '..')
const CLI = path.join(ROOT, 'packages', 'cli', 'dist', 'cli.js')
const EXAMPLE = path.join(ROOT, 'examples', 'vite-react')

async function waitForPort(port: number, retries = 30, delay = 500): Promise<void> {
  for (let i = 0; i < retries; i++) {
    const ok = await new Promise<boolean>((resolve) => {
      const sock = net.createConnection({ port, host: 'localhost' })
      sock.once('connect', () => { sock.destroy(); resolve(true) })
      sock.once('error', () => resolve(false))
    })
    if (ok) return
    await new Promise((r) => setTimeout(r, delay))
  }
  throw new Error(`Port ${port} never became available`)
}

type ProtozoanFixtures = {
  protozoanUrl: string
}

export const test = base.extend<ProtozoanFixtures>({
  protozoanUrl: [async ({}, use) => {
    const child: ChildProcess = spawn('node', [CLI, 'dev', '--', 'vite'], {
      cwd: EXAMPLE,
      env: {
        ...process.env,
        PORT: '14399',
        PROTOZOAN_PORT: '13999',
      },
      shell: true,
      stdio: 'pipe',
    })

    child.stderr?.on('data', (d: Buffer) => process.stderr.write(d))

    try {
      await waitForPort(13999)
    } catch {
      child.kill()
      throw new Error('Protozoan proxy did not start in time')
    }

    await use('http://localhost:13999')

    child.kill('SIGTERM')
    await new Promise((r) => setTimeout(r, 500))
  }, { scope: 'worker' }],
})

export { expect } from '@playwright/test'
