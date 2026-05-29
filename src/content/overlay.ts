import type { Message, ClickTarget, RecordingOptions } from '../shared/types'

let isRecording = false
let overlay: HTMLDivElement | null = null
let highlight: HTMLDivElement | null = null
let stepCounter: HTMLDivElement | null = null
let stepCount = 0
let options: RecordingOptions = { showHighlight: true, showClickDot: false }

chrome.runtime.onMessage.addListener((message: Message) => {
  if (message.type === 'START_RECORDING') {
    const opts = (message.payload as { options: RecordingOptions } | undefined)?.options
    if (opts) options = opts
    startRecording()
  }
  if (message.type === 'STOP_RECORDING') stopRecording()
  if (message.type === 'UPDATE_RECORDING_OPTIONS') {
    options = message.payload as RecordingOptions
    applyHighlightOption()
  }
})

// Check if already recording on inject
chrome.runtime.sendMessage({ type: 'GET_RECORDING_STATE' }, state => {
  if (state?.isRecording) {
    stepCount = state.stepCount ?? 0
    if (state.options) options = state.options
    startRecording()
  }
})

function startRecording() {
  if (isRecording) return
  isRecording = true
  createOverlayUI()
  document.addEventListener('click', handleClick, true)
  document.addEventListener('mouseover', handleMouseOver, true)
}

function stopRecording() {
  isRecording = false
  document.removeEventListener('click', handleClick, true)
  document.removeEventListener('mouseover', handleMouseOver, true)
  overlay?.remove()
  highlight?.remove()
  stepCounter?.remove()
  overlay = null
  highlight = null
  stepCounter = null
}

function applyHighlightOption() {
  if (!highlight) return
  highlight.style.display = options.showHighlight ? 'block' : 'none'
}

function createOverlayUI() {
  overlay = document.createElement('div')
  overlay.id = 'click-tuto-overlay'
  Object.assign(overlay.style, {
    position: 'fixed',
    top: '12px',
    right: '12px',
    zIndex: '2147483647',
    background: 'rgba(20, 20, 20, 0.92)',
    backdropFilter: 'blur(8px)',
    borderRadius: '10px',
    padding: '10px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontFamily: 'system-ui, sans-serif',
    fontSize: '13px',
    color: '#fff',
    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
    userSelect: 'none',
  })

  const dot = document.createElement('div')
  Object.assign(dot.style, {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#ff4444',
    animation: 'click-tuto-blink 1s infinite',
    flexShrink: '0',
  })

  const label = document.createElement('span')
  label.textContent = 'Gravando...'

  stepCounter = document.createElement('span')
  Object.assign(stepCounter.style, {
    background: 'rgba(255,255,255,0.15)',
    borderRadius: '20px',
    padding: '2px 10px',
    fontSize: '12px',
  })
  updateStepCounter()

  const stopBtn = document.createElement('button')
  stopBtn.textContent = 'Parar & Editar'
  Object.assign(stopBtn.style, {
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '5px 12px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
  })
  stopBtn.addEventListener('click', async e => {
    e.stopPropagation()
    const res = await chrome.runtime.sendMessage({ type: 'STOP_RECORDING' })
    const tutorialId = res?.tutorialId
    if (tutorialId) {
      await chrome.runtime.sendMessage({ type: 'OPEN_EDITOR', payload: { tutorialId } })
    }
    stopRecording()
  })

  const style = document.createElement('style')
  style.textContent = `
    @keyframes click-tuto-blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.2; }
    }
    @keyframes click-tuto-ripple {
      0%   { transform: scale(0.3); opacity: 0.9; }
      100% { transform: scale(2.8); opacity: 0; }
    }
  `
  document.head.appendChild(style)

  overlay.append(dot, label, stepCounter, stopBtn)
  document.body.appendChild(overlay)

  highlight = document.createElement('div')
  highlight.id = 'click-tuto-highlight'
  Object.assign(highlight.style, {
    position: 'fixed',
    zIndex: '2147483646',
    border: '2px solid #4f46e5',
    borderRadius: '4px',
    background: 'rgba(79, 70, 229, 0.08)',
    pointerEvents: 'none',
    display: options.showHighlight ? 'block' : 'none',
    transition: 'top .08s, left .08s, width .08s, height .08s',
  })
  document.body.appendChild(highlight)
}

function updateStepCounter() {
  if (stepCounter) stepCounter.textContent = `${stepCount} passos`
}

function isClickTutoUI(el: HTMLElement): boolean {
  return el.id === 'click-tuto-overlay' ||
    el.id === 'click-tuto-highlight' ||
    !!el.closest('#click-tuto-overlay') ||
    !!el.closest('#click-tuto-highlight')
}

function handleMouseOver(e: MouseEvent) {
  if (!isRecording || !highlight || !options.showHighlight) return
  const target = e.target as HTMLElement
  if (isClickTutoUI(target)) {
    highlight.style.display = 'none'
    return
  }
  const rect = target.getBoundingClientRect()
  Object.assign(highlight.style, {
    display: 'block',
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  })
}

function handleClick(e: MouseEvent) {
  if (!isRecording) return
  const target = e.target as HTMLElement
  if (isClickTutoUI(target)) return

  // Do NOT block the original click — let the site handle it normally.
  // We capture the screenshot after a short delay so the site's UI has already
  // responded to the click (e.g. modals open, selections change, etc.).

  const rect = target.getBoundingClientRect()
  const anchor = target.closest('a') as HTMLAnchorElement | null
  const clickTarget: ClickTarget = {
    selector: getSelector(target),
    tagName: target.tagName.toLowerCase(),
    text: target.textContent?.trim().slice(0, 100) ?? '',
    href: anchor?.href || (target as HTMLAnchorElement).href || undefined,
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height,
  }

  if (options.showClickDot) {
    spawnClickDot(e.clientX, e.clientY)
  }

  // Small delay: let the browser process the click and repaint before we capture
  setTimeout(() => {
    chrome.runtime.sendMessage({
      type: 'CAPTURE_SCREENSHOT',
      payload: { target: clickTarget, url: location.href, pageTitle: document.title },
    }, response => {
      if (!response?.error) {
        stepCount++
        updateStepCounter()
        flashConfirmation(rect)
      }
    })
  }, 120)
}

function spawnClickDot(cx: number, cy: number) {
  const size = 48
  const dot = document.createElement('div')
  Object.assign(dot.style, {
    position: 'fixed',
    left: `${cx - size / 2}px`,
    top: `${cy - size / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '50%',
    background: 'rgba(239, 68, 68, 0.45)',
    border: '2px solid rgba(239, 68, 68, 0.8)',
    zIndex: '2147483645',
    pointerEvents: 'none',
    animation: 'click-tuto-ripple 0.55s ease-out forwards',
  })
  document.body.appendChild(dot)
  setTimeout(() => dot.remove(), 600)
}

function flashConfirmation(rect: DOMRect) {
  const flash = document.createElement('div')
  Object.assign(flash.style, {
    position: 'fixed',
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    border: '2px solid #22c55e',
    borderRadius: '4px',
    background: 'rgba(34, 197, 94, 0.18)',
    zIndex: '2147483646',
    pointerEvents: 'none',
    transition: 'opacity 0.4s ease',
  })
  document.body.appendChild(flash)
  setTimeout(() => { flash.style.opacity = '0' }, 200)
  setTimeout(() => flash.remove(), 650)
}


function getSelector(el: HTMLElement): string {
  if (el.id) return `#${el.id}`
  const parts: string[] = []
  let cur: HTMLElement | null = el
  while (cur && cur !== document.body) {
    let part = cur.tagName.toLowerCase()
    if (cur.className) part += '.' + Array.from(cur.classList).slice(0, 2).join('.')
    parts.unshift(part)
    cur = cur.parentElement
  }
  return parts.join(' > ')
}
