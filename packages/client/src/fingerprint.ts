import { hashString } from '@protozoan/core'
import type { ElementFingerprint } from '@protozoan/core'

function buildDomPath(el: Element): string {
  const parts: string[] = []
  let current: Element | null = el
  while (current && current !== document.body) {
    const tag = current.tagName.toLowerCase()
    const parent = current.parentElement
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (c) => c.tagName === current!.tagName,
      )
      const index = siblings.indexOf(current)
      parts.unshift(index > 0 ? `${tag}[${index}]` : tag)
    } else {
      parts.unshift(tag)
    }
    current = parent
  }
  return parts.join('>')
}

export function fingerprintElement(el: Element): ElementFingerprint {
  const domPath = buildDomPath(el)
  const domPathHash = hashString(domPath)
  const textSnippet = (el.textContent ?? '').trim().slice(0, 80)
  const rect = el.getBoundingClientRect()

  return {
    tag: el.tagName.toLowerCase(),
    domPathHash,
    textSnippet,
    boundingBox: {
      x: Math.round(rect.left),
      y: Math.round(rect.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    },
    dataProtozoanId: (el as HTMLElement).dataset?.protozoanId,
  }
}
