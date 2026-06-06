import { fingerprintsMatch } from '@progma/core'
import type { Annotation, ElementFingerprint, ProgmaMessage } from '@progma/core'
import { fingerprintElement } from './fingerprint.js'
import { ProgmaSocket } from './socket.js'
import { CSS } from './styles.js'

function init() {
  // Inject styles
  const style = document.createElement('style')
  style.textContent = CSS
  document.head.appendChild(style)

  const root = document.createElement('div')
  root.id = 'progma-root'
  document.body.appendChild(root)

  // --- State ---
  let panelOpen = false
  let annotateMode = false
  let hoveredEl: Element | null = null
  let pendingFingerprint: ElementFingerprint | null = null
  let selectedFingerprint: ElementFingerprint | null = null
  let annotations: Annotation[] = []

  // --- Socket ---
  const socket = new ProgmaSocket()
  socket.connect()
  socket.onMessage(handleServerMessage)

  // Request annotations on load
  socket.send({ type: 'annotation:list', payload: {} })

  // --- Build UI ---
  root.innerHTML = `
    <button id="progma-toggle" title="Progma">✦</button>

    <div id="progma-panel" class="hidden">
      <div id="progma-panel-header">
        <span>Progma</span>
        <button id="progma-annotate-btn">Annotate</button>
      </div>
      <div id="progma-messages"></div>
      <div id="progma-input-row">
        <textarea id="progma-input" placeholder="Ask AI to change something…" rows="1"></textarea>
        <button id="progma-send">Send</button>
      </div>
    </div>

    <div id="progma-annotation-modal" class="hidden">
      <div id="progma-annotation-box">
        <h3>Add annotation</h3>
        <textarea id="progma-annotation-text" placeholder="Describe what needs to change…"></textarea>
        <div id="progma-annotation-actions">
          <button class="progma-btn-secondary" id="progma-annotation-cancel">Cancel</button>
          <button class="progma-btn-primary" id="progma-annotation-save">Save</button>
        </div>
      </div>
    </div>
  `

  const toggle = document.getElementById('progma-toggle')!
  const panel = document.getElementById('progma-panel')!
  const annotateBtn = document.getElementById('progma-annotate-btn')!
  const messages = document.getElementById('progma-messages')!
  const input = document.getElementById('progma-input') as HTMLTextAreaElement
  const sendBtn = document.getElementById('progma-send') as HTMLButtonElement
  const modal = document.getElementById('progma-annotation-modal')!
  const annotationText = document.getElementById('progma-annotation-text') as HTMLTextAreaElement
  const annotationCancel = document.getElementById('progma-annotation-cancel')!
  const annotationSave = document.getElementById('progma-annotation-save')!

  // --- Toggle panel ---
  toggle.addEventListener('click', () => {
    panelOpen = !panelOpen
    panel.classList.toggle('hidden', !panelOpen)
    toggle.classList.toggle('active', panelOpen)
  })

  // --- Annotate mode ---
  annotateBtn.addEventListener('click', () => {
    annotateMode = !annotateMode
    annotateBtn.classList.toggle('active', annotateMode)
    annotateBtn.textContent = annotateMode ? 'Cancel' : 'Annotate'
    if (!annotateMode && hoveredEl) {
      hoveredEl.classList.remove('progma-highlight')
      hoveredEl = null
    }
  })

  // --- Element hover highlight ---
  document.addEventListener('mouseover', (e) => {
    if (!annotateMode) return
    const target = e.target as Element
    if (root.contains(target)) return
    if (hoveredEl && hoveredEl !== target) {
      hoveredEl.classList.remove('progma-highlight')
    }
    hoveredEl = target
    hoveredEl.classList.add('progma-highlight')
  })

  document.addEventListener('mouseout', (e) => {
    if (!annotateMode) return
    const target = e.target as Element
    if (root.contains(target)) return
    target.classList.remove('progma-highlight')
  })

  // --- Click to annotate ---
  document.addEventListener('click', (e) => {
    if (!annotateMode) return
    const target = e.target as Element
    if (root.contains(target)) return
    e.preventDefault()
    e.stopPropagation()

    pendingFingerprint = fingerprintElement(target)
    target.classList.remove('progma-highlight')
    hoveredEl = null
    annotateMode = false
    annotateBtn.classList.remove('active')
    annotateBtn.textContent = 'Annotate'

    modal.classList.remove('hidden')
    annotationText.value = ''
    annotationText.focus()
  }, true)

  // --- Annotation modal actions ---
  annotationCancel.addEventListener('click', () => {
    modal.classList.add('hidden')
    pendingFingerprint = null
  })

  annotationSave.addEventListener('click', () => {
    if (!pendingFingerprint || !annotationText.value.trim()) return
    socket.send({
      type: 'annotation:save',
      payload: {
        fingerprint: pendingFingerprint,
        comment: annotationText.value.trim(),
      },
    })
    modal.classList.add('hidden')
    pendingFingerprint = null
    addSystemMessage('Annotation saved.')
  })

  // --- AI chat ---
  sendBtn.addEventListener('click', sendMessage)
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  })

  function sendMessage() {
    const text = input.value.trim()
    if (!text) return
    addMessage('user', text)
    input.value = ''
    sendBtn.disabled = true

    socket.send({
      type: 'ai:chat',
      payload: {
        message: text,
        currentUrl: location.href,
        selectedFingerprint: selectedFingerprint ?? undefined,
      },
    })
  }

  // --- Server message handler ---
  function handleServerMessage(msg: ProgmaMessage) {
    switch (msg.type) {
      case 'annotation:list:response':
        annotations = msg.payload as Annotation[]
        renderPins()
        break

      case 'ai:chat:response': {
        sendBtn.disabled = false
        const { reply, applied } = msg.payload as { reply: string; applied?: boolean }
        if (reply) addMessage('ai', reply)
        if (applied) {
          addPendingHmrMessage()
        }
        break
      }

      case 'ai:patch:applied':
        addPendingHmrMessage()
        break

      case 'error': {
        sendBtn.disabled = false
        const { message } = msg.payload as { message: string }
        addSystemMessage(`Error: ${message}`)
        break
      }
    }
  }

  // --- Helpers ---
  function addMessage(role: 'user' | 'ai', text: string) {
    const el = document.createElement('div')
    el.className = `progma-msg ${role}`
    el.textContent = text
    messages.appendChild(el)
    messages.scrollTop = messages.scrollHeight
  }

  function addSystemMessage(text: string) {
    const el = document.createElement('div')
    el.className = 'progma-msg system'
    el.textContent = text
    messages.appendChild(el)
    messages.scrollTop = messages.scrollHeight
  }

  function addPendingHmrMessage() {
    const el = document.createElement('div')
    el.className = 'progma-msg system'
    el.textContent = 'Change applied — waiting for HMR…'
    messages.appendChild(el)
    messages.scrollTop = messages.scrollHeight

    // Vite fires this custom event after each hot update
    const onUpdate = () => {
      el.textContent = '✓ Updated'
      cleanup()
    }
    // Fallback: if HMR doesn't fire within 5s, resolve anyway
    const timer = setTimeout(() => {
      el.textContent = '✓ Applied'
      cleanup()
    }, 5000)

    function cleanup() {
      clearTimeout(timer)
      window.removeEventListener('vite:afterUpdate', onUpdate)
    }

    window.addEventListener('vite:afterUpdate', onUpdate, { once: true })
  }

  function renderPins() {
    document.querySelectorAll('.progma-pin').forEach((p) => p.remove())
    for (const ann of annotations) {
      if (ann.resolved) continue
      const el = findElement(ann.fingerprint)
      if (!el) continue
      const rect = el.getBoundingClientRect()
      const pin = document.createElement('div')
      pin.className = 'progma-pin'
      pin.style.left = `${rect.left + window.scrollX - 8}px`
      pin.style.top = `${rect.top + window.scrollY - 8}px`
      pin.title = ann.comment
      pin.addEventListener('click', () => {
        if (!panelOpen) {
          panelOpen = true
          panel.classList.remove('hidden')
          toggle.classList.add('active')
        }
        addSystemMessage(`📌 ${ann.comment}`)
      })
      document.body.appendChild(pin)
    }
  }

  function findElement(fingerprint: ElementFingerprint): Element | null {
    if (fingerprint.dataProgmaId) {
      // Escape the ID value to prevent CSS selector injection
      const escaped = fingerprint.dataProgmaId.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
      try {
        const el = document.querySelector(`[data-progma-id="${escaped}"]`)
        if (el) return el
      } catch {
        // invalid selector — fall through to fingerprint matching
      }
    }
    const candidates = document.querySelectorAll(fingerprint.tag)
    for (const el of candidates) {
      const fp = fingerprintElement(el)
      if (fingerprintsMatch(fp, fingerprint)) return el
    }
    return null
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
