import type { ProtozoanMessage } from '@protozoan/core'

type MessageHandler = (msg: ProtozoanMessage) => void

export class ProtozoanSocket {
  private ws: WebSocket | null = null
  private handlers: MessageHandler[] = []
  private queue: string[] = []

  connect() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws'
    this.ws = new WebSocket(`${proto}://${location.host}/__protozoan/ws`)

    this.ws.addEventListener('open', () => {
      this.queue.forEach((msg) => this.ws!.send(msg))
      this.queue = []
    })

    this.ws.addEventListener('message', (e) => {
      try {
        const msg: ProtozoanMessage = JSON.parse(e.data)
        this.handlers.forEach((h) => h(msg))
      } catch {}
    })

    this.ws.addEventListener('error', () => {
      // error is always followed by close; let the close handler reconnect
    })

    this.ws.addEventListener('close', () => {
      setTimeout(() => this.connect(), 2000)
    })
  }

  send(msg: ProtozoanMessage) {
    const data = JSON.stringify(msg)
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data)
    } else {
      this.queue.push(data)
    }
  }

  onMessage(handler: MessageHandler) {
    this.handlers.push(handler)
  }
}
