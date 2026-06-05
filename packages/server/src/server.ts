import http from 'node:http'
import fs from 'node:fs'
import httpProxy from 'http-proxy'
import { WebSocketServer, WebSocket } from 'ws'
import type { ProgmaMessage, AnnotationSavePayload, AiChatPayload } from '@progma/core'
import { AnnotationStore } from './annotations.js'
import { FileIndex } from './file-index.js'
import { runAiChat } from './ai.js'
import { applyDiff } from './patcher.js'

const CLIENT_SCRIPT_PLACEHOLDER = '<!-- __PROGMA_CLIENT__ -->'
const INJECT_SNIPPET = `<script src="/__progma/client.js"></script>`

export interface ProgmaServerOptions {
  port: number
  targetPort: number
  projectRoot: string
  clientBundlePath?: string
}

export class ProgmaServer {
  private proxy: httpProxy
  private httpServer: http.Server
  private wss: WebSocketServer
  private annotations: AnnotationStore
  private fileIndex: FileIndex
  private clients: Set<WebSocket> = new Set()
  private clientScript: string = ''

  constructor(private opts: ProgmaServerOptions) {
    this.annotations = new AnnotationStore(opts.projectRoot)
    this.fileIndex = new FileIndex(opts.projectRoot)
    this.proxy = httpProxy.createProxyServer({ ws: true })
    this.httpServer = http.createServer(this.handleRequest.bind(this))
    this.wss = new WebSocketServer({ noServer: true })
    this.loadClientScript()
    this.setupProxy()
    this.setupWebSocket()
  }

  private loadClientScript() {
    const clientPath = this.opts.clientBundlePath
    if (clientPath && fs.existsSync(clientPath)) {
      this.clientScript = fs.readFileSync(clientPath, 'utf8')
    } else {
      this.clientScript = `console.log('[Progma] client bundle not built yet')`
    }
  }

  private setupProxy() {
    this.proxy.on('error', (_err, _req, res) => {
      if (res instanceof http.ServerResponse) {
        res.writeHead(502)
        res.end('Bad Gateway')
      }
    })
  }

  private setupWebSocket() {
    this.wss.on('connection', (ws) => {
      this.clients.add(ws)
      ws.on('close', () => this.clients.delete(ws))
      ws.on('message', (data) => this.handleWsMessage(ws, data.toString()).catch((err) => {
        console.error('[Progma] WS handler error:', err)
      }))
    })

    this.httpServer.on('upgrade', (req, socket, head) => {
      if (req.url?.startsWith('/__progma/ws')) {
        this.wss.handleUpgrade(req, socket, head, (ws) => {
          this.wss.emit('connection', ws, req)
        })
      } else {
        this.proxy.ws(req, socket, head, {
          target: `ws://localhost:${this.opts.targetPort}`,
        })
        socket.on('error', () => socket.destroy())
      }
    })
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    const url = req.url ?? '/'

    if (url === '/__progma/client.js') {
      res.writeHead(200, { 'Content-Type': 'application/javascript' })
      res.end(this.clientScript)
      return
    }

    if (url.startsWith('/__progma/')) {
      res.writeHead(404)
      res.end('Not found')
      return
    }

    const target = `http://localhost:${this.opts.targetPort}`

    const isHtmlRequest =
      !url.includes('.') ||
      url.endsWith('.html') ||
      req.headers.accept?.includes('text/html')

    if (isHtmlRequest) {
      this.proxyAndInject(req, res, target)
    } else {
      this.proxy.web(req, res, { target })
    }
  }

  private proxyAndInject(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    target: string,
  ) {
    const chunks: Buffer[] = []

    // Buffer the request body so we can retry on error without consuming twice
    const bodyChunks: Buffer[] = []
    req.on('data', (chunk) => bodyChunks.push(chunk))
    req.on('end', () => {
      const body = Buffer.concat(bodyChunks)

      const upstreamReq = http.request(
        {
          hostname: 'localhost',
          port: this.opts.targetPort,
          path: req.url,
          method: req.method,
          headers: { ...req.headers, 'accept-encoding': 'identity' },
        },
        (upstreamRes) => {
          const contentType = upstreamRes.headers['content-type'] ?? ''
          if (!contentType.includes('text/html')) {
            res.writeHead(upstreamRes.statusCode ?? 200, upstreamRes.headers)
            upstreamRes.pipe(res)
            return
          }

          upstreamRes.on('data', (chunk) => chunks.push(chunk))
          upstreamRes.on('end', () => {
            let html = Buffer.concat(chunks).toString('utf8')
            // Replace last </body> to avoid matching </body> inside scripts/comments
            const lastBody = html.lastIndexOf('</body>')
            if (lastBody !== -1) {
              html = html.slice(0, lastBody) + `${INJECT_SNIPPET}\n` + html.slice(lastBody)
            }
            const headers = { ...upstreamRes.headers }
            delete headers['content-encoding']
            delete headers['content-length']
            headers['content-length'] = Buffer.byteLength(html).toString()
            res.writeHead(upstreamRes.statusCode ?? 200, headers)
            res.end(html)
          })
        },
      )

      upstreamReq.on('error', () => {
        this.proxy.web(req, res, { target })
      })

      if (body.length > 0) upstreamReq.write(body)
      upstreamReq.end()
    })
  }

  private async handleWsMessage(ws: WebSocket, raw: string) {
    let msg: ProgmaMessage
    try {
      msg = JSON.parse(raw)
    } catch {
      return
    }

    switch (msg.type) {
      case 'annotation:save': {
        const payload = msg.payload as AnnotationSavePayload
        const annotation = this.annotations.add(payload)
        this.send(ws, { type: 'annotation:list:response', payload: this.annotations.getAll() })
        break
      }

      case 'annotation:list': {
        this.send(ws, { type: 'annotation:list:response', payload: this.annotations.getAll() })
        break
      }

      case 'annotation:resolve': {
        const { id } = msg.payload as { id: string }
        this.annotations.resolve(id)
        this.broadcast({ type: 'annotation:list:response', payload: this.annotations.getAll() })
        break
      }

      case 'ai:chat': {
        const payload = msg.payload as AiChatPayload
        try {
          const { reply, diff } = await runAiChat(payload, this.fileIndex)
          let applied = false
          if (diff) {
            const result = applyDiff(diff, this.fileIndex)
            applied = result.success
            if (!result.success) {
              console.error('[Progma] Patch error:', result.error)
            }
          }
          this.send(ws, { type: 'ai:chat:response', payload: { reply, diff, applied } })
          if (applied) {
            this.broadcast({ type: 'ai:patch:applied', payload: {} })
          }
        } catch (err) {
          this.send(ws, { type: 'error', payload: { message: String(err) } })
        }
        break
      }
    }
  }

  private send(ws: WebSocket, msg: ProgmaMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg))
    }
  }

  private broadcast(msg: ProgmaMessage) {
    const data = JSON.stringify(msg)
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data)
      }
    }
  }

  listen() {
    this.httpServer.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`[Progma] Port ${this.opts.port} is already in use. Try a different port with PROGMA_PORT.`)
        process.exit(1)
      }
      throw err
    })
    this.httpServer.listen(this.opts.port, () => {
      console.log(`[Progma] Proxy running at http://localhost:${this.opts.port}`)
    })
  }

  close() {
    for (const client of this.clients) client.terminate()
    this.wss.close()
    this.httpServer.close()
    this.fileIndex.close()
  }
}

