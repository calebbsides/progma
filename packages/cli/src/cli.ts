import { spawn } from 'node:child_process'
import net from 'node:net'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { config as loadEnv } from 'dotenv'
import { ProgmaServer } from '@progma/server'

// Load .env from the directory where `progma dev` is run
loadEnv({ path: path.join(process.cwd(), '.env') })

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function waitForPort(port: number, retries = 60, delay = 500): Promise<void> {
  for (let i = 0; i < retries; i++) {
    const ok = await new Promise<boolean>((resolve) => {
      const sock = net.createConnection({ port, host: 'localhost' })
      sock.once('connect', () => { sock.destroy(); resolve(true) })
      sock.once('error', () => resolve(false))
    })
    if (ok) return
    await new Promise((r) => setTimeout(r, delay))
  }
  console.warn(`[Progma] Dev server did not bind on port ${port} within ${retries * delay / 1000}s, starting proxy anyway`)
}

async function findFreePort(start = 3001): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.listen(start, () => {
      const { port } = server.address() as net.AddressInfo
      server.close(() => resolve(port))
    })
    server.on('error', () => findFreePort(start + 1).then(resolve, reject))
  })
}

function parseArgs(argv: string[]): { progmaPort: number; devCmd: string[] } {
  const raw = process.env.PROGMA_PORT ? parseInt(process.env.PROGMA_PORT, 10) : 3000
  const progmaPort = Number.isFinite(raw) && raw > 0 && raw < 65536 ? raw : 3000
  if (process.env.PROGMA_PORT && progmaPort !== raw) {
    console.warn(`[Progma] Invalid PROGMA_PORT "${process.env.PROGMA_PORT}", using 3000`)
  }
  const sepIdx = argv.indexOf('--')
  const devCmd = sepIdx !== -1 ? argv.slice(sepIdx + 1) : []
  return { progmaPort, devCmd }
}

function findClientBundle(): string | null {
  // When running from dist/, the client bundle is in sibling packages
  const candidates = [
    // Installed in node_modules (published package layout)
    path.join(__dirname, '..', 'node_modules', '@progma', 'client', 'dist', 'client.js'),
    // Monorepo: dist/cli.js → ../../client/dist/client.js
    path.join(__dirname, '..', '..', 'client', 'dist', 'client.js'),
    // Monorepo via packages/
    path.join(__dirname, '..', '..', '..', 'client', 'dist', 'client.js'),
  ]
  return candidates.find((p) => fs.existsSync(p)) ?? null
}

async function main() {
  const argv = process.argv.slice(2)

  if (argv[0] !== 'dev') {
    console.error('Usage: progma dev -- <dev-server-command>')
    console.error('Example: progma dev -- vite')
    console.error('Example: progma dev -- next dev')
    process.exit(1)
  }

  const { progmaPort, devCmd } = parseArgs(argv.slice(1))

  if (devCmd.length === 0) {
    console.error('No dev server command provided. Usage: progma dev -- vite')
    process.exit(1)
  }

  const targetPort = await findFreePort(14321)
  const projectRoot = process.cwd()

  const clientBundle = findClientBundle()
  if (!clientBundle) {
    console.warn('[Progma] Warning: client bundle not found — UI will not be injected.')
    console.warn('         Run `pnpm build` in packages/client first.')
  }

  console.log(`[Progma] Starting dev server: ${devCmd.join(' ')}`)
  console.log(`[Progma] Internal port: ${targetPort}`)

  // Resolve the binary from the project's node_modules/.bin so it works
  // without the binary being on PATH (common in monorepos / Windows)
  const binDir = path.join(projectRoot, 'node_modules', '.bin')
  const env = {
    ...process.env,
    PORT: String(targetPort),
    VITE_PORT: String(targetPort),
    PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}`,
  }

  const child = spawn(devCmd[0], devCmd.slice(1), {
    env,
    stdio: 'inherit',
    shell: true,
  })

  child.on('exit', (code) => {
    console.log(`[Progma] Dev server exited (code ${code})`)
    process.exit(code ?? 0)
  })

  // Wait for the dev server to actually bind before starting the proxy
  await waitForPort(targetPort)

  const server = new ProgmaServer({
    port: progmaPort,
    targetPort,
    projectRoot,
    clientBundlePath: clientBundle ?? undefined,
  })

  server.listen()

  console.log(`\n  ✦  Progma  →  http://localhost:${progmaPort}`)
  console.log(`     Proxying →  http://localhost:${targetPort}\n`)

  process.on('SIGINT', () => {
    server.close()
    child.kill()
    process.exit(0)
  })
}

main().catch((err) => {
  console.error('[Progma] Fatal:', err)
  process.exit(1)
})
