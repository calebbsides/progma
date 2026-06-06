import { spawn } from 'node:child_process'
import net from 'node:net'
import path from 'node:path'
import { config as loadEnv } from 'dotenv'
import { ProtozoanServer } from '@protozoan/server'
import clientScript from 'virtual:client-bundle'

// Load .env from the directory where `protozoan dev` is run
loadEnv({ path: path.join(process.cwd(), '.env') })

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
  console.warn(`[Protozoan] Dev server did not bind on port ${port} within ${retries * delay / 1000}s, starting proxy anyway`)
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

function parseArgs(argv: string[]): { protozoanPort: number; devCmd: string[] } {
  const raw = process.env.PROTOZOAN_PORT ? parseInt(process.env.PROTOZOAN_PORT, 10) : 3000
  const protozoanPort = Number.isFinite(raw) && raw > 0 && raw < 65536 ? raw : 3000
  if (process.env.PROTOZOAN_PORT && protozoanPort !== raw) {
    console.warn(`[Protozoan] Invalid PROTOZOAN_PORT "${process.env.PROTOZOAN_PORT}", using 3000`)
  }
  const sepIdx = argv.indexOf('--')
  const devCmd = sepIdx !== -1 ? argv.slice(sepIdx + 1) : []
  return { protozoanPort, devCmd }
}

async function main() {
  const argv = process.argv.slice(2)

  if (argv[0] !== 'dev') {
    console.error('Usage: protozoan dev -- <dev-server-command>')
    console.error('Example: protozoan dev -- vite')
    console.error('Example: protozoan dev -- next dev')
    process.exit(1)
  }

  const { protozoanPort, devCmd } = parseArgs(argv.slice(1))

  if (devCmd.length === 0) {
    console.error('No dev server command provided. Usage: protozoan dev -- vite')
    process.exit(1)
  }

  const targetPort = await findFreePort(14321)
  const projectRoot = process.cwd()

  console.log(`[Protozoan] Starting ${devCmd.join(' ')}...`)

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
    console.log(`[Protozoan] Dev server exited (code ${code})`)
    process.exit(code ?? 0)
  })

  // Wait for the dev server to actually bind before starting the proxy
  await waitForPort(targetPort)

  const server = new ProtozoanServer({
    port: protozoanPort,
    targetPort,
    projectRoot,
    clientScript,
    onReady: (port) => {
      console.log(`\n  ✦  Protozoan running at http://localhost:${port}\n`)
    },
  })

  server.listen()

  process.on('SIGINT', () => {
    server.close()
    child.kill()
    process.exit(0)
  })
}

main().catch((err) => {
  console.error('[Protozoan] Fatal:', err)
  process.exit(1)
})
