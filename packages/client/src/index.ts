import { fingerprintsMatch } from '@progma/core'
import type { Annotation, ElementFingerprint, ProgmaMessage } from '@progma/core'
import { fingerprintElement } from './fingerprint.js'
import { ProgmaSocket } from './socket.js'
import { CSS } from './styles.js'

const MODAL_W = 380
const MODAL_H = 480 // approximate max height
const MARGIN = 12

function init() {
  const style = document.createElement('style')
  style.textContent = CSS
  document.head.appendChild(style)

  const root = document.createElement('div')
  root.id = 'progma-root'
  document.body.appendChild(root)

  // --- State ---
  let overlayOpen = false
  let hoveredEl: Element | null = null
  let selectedEl: Element | null = null
  let selectedFingerprint: ElementFingerprint | null = null
  let annotations: Annotation[] = []
  // Per-element chat history: domPathHash → array of message DOM nodes
  const elementThreads = new Map<string, HTMLElement[]>()
  let activeThreadKey: string | null = null

  // --- Socket ---
  const socket = new ProgmaSocket()
  socket.connect()
  socket.onMessage(handleServerMessage)
  socket.send({ type: 'annotation:list', payload: {} })

  // --- Build UI ---
  root.innerHTML = `
    <button id="progma-toggle" title="Open Progma">✦</button>

    <div id="progma-overlay" class="hidden">
      <div id="progma-modal">
        <div id="progma-modal-header">
          <span id="progma-title">Progma</span>
          <button id="progma-close" title="Close">✕</button>
        </div>

        <div id="progma-inspect-bar">
          <div id="progma-inspect-hint">Click any element on the page to select it</div>
          <div id="progma-selected-badge" class="hidden">
            <span id="progma-selected-label"></span>
            <button id="progma-deselect" title="Clear selection">✕</button>
          </div>
        </div>

        <div id="progma-chat" class="hidden">
          <div id="progma-messages"></div>
          <div id="progma-input-row">
            <textarea id="progma-input" placeholder="Ask AI to change the selected element…" rows="1"></textarea>
            <button id="progma-send">Send</button>
          </div>
        </div>
      </div>
    </div>
  `

  const toggle = document.getElementById('progma-toggle')!
  const overlay = document.getElementById('progma-overlay')!
  const modal = document.getElementById('progma-modal')!
  const closeBtn = document.getElementById('progma-close')!
  const inspectHint = document.getElementById('progma-inspect-hint')!
  const selectedBadge = document.getElementById('progma-selected-badge')!
  const selectedLabel = document.getElementById('progma-selected-label')!
  const deselectBtn = document.getElementById('progma-deselect')!
  const chat = document.getElementById('progma-chat')!
  const messages = document.getElementById('progma-messages')!
  const input = document.getElementById('progma-input') as HTMLTextAreaElement
  const sendBtn = document.getElementById('progma-send') as HTMLButtonElement

  // --- Open / close overlay ---
  function openOverlay() {
    overlayOpen = true
    overlay.classList.remove('hidden')
    toggle.classList.add('active')
    // Reset modal to top-left until positioned; keeps it off-screen until a click
    modal.style.left = '-9999px'
    modal.style.top = '-9999px'
  }

  function closeOverlay() {
    overlayOpen = false
    overlay.classList.add('hidden')
    toggle.classList.remove('active')
    clearHover()
    clearSelection()
    elementThreads.clear()
  }

  toggle.addEventListener('click', () => overlayOpen ? closeOverlay() : openOverlay())
  closeBtn.addEventListener('click', closeOverlay)

  // --- Element hover highlight ---
  document.addEventListener('mouseover', (e) => {
    if (!overlayOpen) return
    const target = e.target as Element
    if (root.contains(target)) return
    if (target === selectedEl) return
    if (hoveredEl && hoveredEl !== target) hoveredEl.classList.remove('progma-hovered')
    hoveredEl = target
    hoveredEl.classList.add('progma-hovered')
  })

  document.addEventListener('mouseout', (e) => {
    if (!overlayOpen) return
    const target = e.target as Element
    if (root.contains(target)) return
    if (target === selectedEl) return
    target.classList.remove('progma-hovered')
    if (hoveredEl === target) hoveredEl = null
  })

  // --- Click to select element ---
  document.addEventListener('click', (e) => {
    if (!overlayOpen) return
    const target = e.target as Element
    if (root.contains(target)) return
    e.preventDefault()
    e.stopPropagation()

    clearHover()
    selectElement(target, e.clientX, e.clientY)
  }, true)

  function positionModal(cx: number, cy: number) {
    const vw = window.innerWidth
    const vh = window.innerHeight

    // Prefer opening to the right of the cursor; flip left if it would overflow
    let left = cx + MARGIN
    if (left + MODAL_W > vw - MARGIN) left = cx - MODAL_W - MARGIN

    // Prefer opening below the cursor; flip up if it would overflow
    let top = cy + MARGIN
    if (top + MODAL_H > vh - MARGIN) top = cy - MODAL_H - MARGIN

    // Hard-clamp to viewport
    left = Math.max(MARGIN, Math.min(left, vw - MODAL_W - MARGIN))
    top = Math.max(MARGIN, Math.min(top, vh - MODAL_H - MARGIN))

    modal.style.left = `${left}px`
    modal.style.top = `${top}px`
  }

  function saveThread() {
    if (activeThreadKey !== null) {
      elementThreads.set(activeThreadKey, Array.from(messages.children) as HTMLElement[])
    }
  }

  function loadThread(key: string) {
    messages.innerHTML = ''
    const nodes = elementThreads.get(key)
    if (nodes) nodes.forEach(n => messages.appendChild(n))
    messages.scrollTop = messages.scrollHeight
  }

  function selectElement(el: Element, cx: number, cy: number) {
    saveThread()

    if (selectedEl) selectedEl.classList.remove('progma-selected')
    selectedEl = el
    selectedEl.classList.add('progma-selected')
    selectedFingerprint = fingerprintElement(el)

    const tag = el.tagName.toLowerCase()
    const id = el.id ? `#${el.id}` : ''
    const cls = el.classList.length
      ? '.' + Array.from(el.classList).filter(c => !c.startsWith('progma-')).slice(0, 2).join('.')
      : ''
    selectedLabel.textContent = `${tag}${id}${cls}`
    selectedBadge.classList.remove('hidden')
    inspectHint.classList.add('hidden')

    // Load this element's thread
    activeThreadKey = selectedFingerprint.domPathHash
    loadThread(activeThreadKey)

    // Show chat and position modal at cursor
    chat.classList.remove('hidden')
    positionModal(cx, cy)
    input.placeholder = `Ask AI to change <${tag}>…`
    input.focus()
  }

  function clearSelection() {
    saveThread()
    activeThreadKey = null

    if (selectedEl) {
      selectedEl.classList.remove('progma-selected')
      selectedEl = null
    }
    selectedFingerprint = null
    selectedBadge.classList.add('hidden')
    inspectHint.classList.remove('hidden')
    chat.classList.add('hidden')
    messages.innerHTML = ''
    input.placeholder = 'Ask AI to change the selected element…'
  }

  function clearHover() {
    if (hoveredEl) {
      hoveredEl.classList.remove('progma-hovered')
      hoveredEl = null
    }
  }

  deselectBtn.addEventListener('click', clearSelection)

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
        if (applied) addPendingHmrMessage()
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

    const onUpdate = () => { el.textContent = '✓ Updated'; cleanup() }
    const timer = setTimeout(() => { el.textContent = '✓ Applied'; cleanup() }, 5000)
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
        openOverlay()
        addSystemMessage(`📌 ${ann.comment}`)
      })
      document.body.appendChild(pin)
    }
  }

  function findElement(fingerprint: ElementFingerprint): Element | null {
    if (fingerprint.dataProgmaId) {
      const escaped = fingerprint.dataProgmaId.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
      try {
        const el = document.querySelector(`[data-progma-id="${escaped}"]`)
        if (el) return el
      } catch {
        // invalid selector — fall through
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
