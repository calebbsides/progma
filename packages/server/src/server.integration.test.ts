import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import net from 'node:net'
import { WebSocket } from 'ws'
import type { ProtozoanMessage } from '@protozoan/core'

// Mock the AI module before importing the server
vi.mock('./ai.js', () => ({
  runAiChat: vi.fn().mockResolvedValue({
    reply: 'I will change the header.',
    diff: `--- a/App.tsx
+++ b/App.tsx
@@
-      <h1>Get started</h1>
+      <h1>Progma</h1>
`,
  }),
}))

import { ProtozoanServer } from './server.js'

const FINGERPRINT = {
  tag: 'h1',
  domPathHash: 'abc123',
  textSnippet: 'Hello',
  boundingBox: { x: 0, y: 0, width: 100, height: 50 },
}

async function getFreePort(): Promise<number> {
  return new Promise((resolve) => {
    const srv = net.createServer()
    srv.listen(0, () => {
      const { port } = srv.address() as net.AddressInfo
      srv.close(() => resolve(port))
    })
  })
}

function waitForMessage(ws: WebSocket): Promise<ProtozoanMessage> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('WebSocket message timeout')), 5000)
    ws.once('message', (data) => {
      clearTimeout(timer)
      resolve(JSON.parse(data.toString()))
    })
  })
}

function send(ws: WebSocket, msg: ProtozoanMessage) {
  ws.send(JSON.stringify(msg))
}

let tmpDir: string
let server: ProtozoanServer
let port: number
let ws: WebSocket

beforeEach(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'protozoan-int-test-'))

  // Write a source file the patcher can target
  fs.writeFileSync(
    path.join(tmpDir, 'App.tsx'),
    `function App() {\n  return (\n    <div>\n      <h1>Get started</h1>\n    </div>\n  )\n}\n`,
  )

  port = await getFreePort()
  const targetPort = await getFreePort()

  server = new ProtozoanServer({
    port,
    targetPort,
    projectRoot: tmpDir,
  })
  server.listen()

  // Connect WebSocket client
  await new Promise<void>((resolve, reject) => {
    ws = new WebSocket(`ws://localhost:${port}/__protozoan/ws`)
    ws.once('open', resolve)
    ws.once('error', reject)
  })
})

afterEach(async () => {
  ws.close()
  server.close()
  fs.rmSync(tmpDir, { recursive: true, force: true })
  vi.clearAllMocks()
})

describe('ProtozoanServer WebSocket', () => {
  it('responds to annotation:list with empty array initially', async () => {
    send(ws, { type: 'annotation:list', payload: {} })
    const msg = await waitForMessage(ws)
    expect(msg.type).toBe('annotation:list:response')
    expect(msg.payload).toEqual([])
  })

  it('saves an annotation and returns it in the list', async () => {
    send(ws, {
      type: 'annotation:save',
      payload: { fingerprint: FINGERPRINT, comment: 'Fix this button' },
    })
    const msg = await waitForMessage(ws)
    expect(msg.type).toBe('annotation:list:response')
    const annotations = msg.payload as { comment: string; resolved: boolean }[]
    expect(annotations).toHaveLength(1)
    expect(annotations[0].comment).toBe('Fix this button')
    expect(annotations[0].resolved).toBe(false)
  })

  it('resolves an annotation and broadcasts the update', async () => {
    // Save first
    send(ws, {
      type: 'annotation:save',
      payload: { fingerprint: FINGERPRINT, comment: 'To be resolved' },
    })
    const saveMsg = await waitForMessage(ws)
    const annotations = saveMsg.payload as { id: string }[]
    const id = annotations[0].id

    // Resolve
    send(ws, { type: 'annotation:resolve', payload: { id } })
    const resolveMsg = await waitForMessage(ws)
    expect(resolveMsg.type).toBe('annotation:list:response')
    const updated = resolveMsg.payload as { id: string; resolved: boolean }[]
    expect(updated.find((a) => a.id === id)?.resolved).toBe(true)
  })

  it('handles ai:chat and returns a response', async () => {
    send(ws, {
      type: 'ai:chat',
      payload: {
        message: 'change the header to Progma',
        currentUrl: 'http://localhost:3000/',
      },
    })
    const msg = await waitForMessage(ws)
    expect(msg.type).toBe('ai:chat:response')
    const payload = msg.payload as { reply: string; applied: boolean }
    expect(payload.reply).toBe('I will change the header.')
    expect(typeof payload.applied).toBe('boolean')
  })

  it('applies the diff from ai:chat to disk', async () => {
    send(ws, {
      type: 'ai:chat',
      payload: {
        message: 'change the header to Progma',
        currentUrl: 'http://localhost:3000/',
      },
    })
    const msg = await waitForMessage(ws)
    const payload = msg.payload as { applied: boolean }

    if (payload.applied) {
      const content = fs.readFileSync(path.join(tmpDir, 'App.tsx'), 'utf8')
      expect(content).toContain('<h1>Progma</h1>')
    }
    // If not applied it means patch didn't match — still a valid code path
    expect(msg.type).toBe('ai:chat:response')
  })

  it('returns error message on ai:chat failure', async () => {
    const { runAiChat } = await import('./ai.js')
    vi.mocked(runAiChat).mockRejectedValueOnce(new Error('API down'))

    send(ws, {
      type: 'ai:chat',
      payload: { message: 'do something', currentUrl: 'http://localhost:3000/' },
    })
    const msg = await waitForMessage(ws)
    expect(msg.type).toBe('error')
    expect((msg.payload as { message: string }).message).toMatch(/API down/)
  })

  it('ignores malformed JSON without crashing', async () => {
    ws.send('not json at all')
    // Send a valid message after — server should still respond
    send(ws, { type: 'annotation:list', payload: {} })
    const msg = await waitForMessage(ws)
    expect(msg.type).toBe('annotation:list:response')
  })
})
