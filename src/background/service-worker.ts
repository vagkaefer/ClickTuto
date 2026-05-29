import {
  saveTutorial,
  addStep,
  getRecordingState,
  setRecordingState,
  generateId,
} from '../shared/storage'
import type { Message, Tutorial, TutorialStep, ClickTarget, RecordingOptions } from '../shared/types'

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  handleMessage(message).then(sendResponse).catch(err => {
    console.error('[click-tuto background] error:', err)
    sendResponse({ error: String(err) })
  })
  return true // keep channel open for async response
})

async function handleMessage(message: Message): Promise<unknown> {
  switch (message.type) {
    case 'GET_RECORDING_STATE':
      return getRecordingState()

    case 'START_RECORDING': {
      const tutorialId = generateId()
      const tutorial: Tutorial = {
        id: tutorialId,
        title: 'Novo Tutorial',
        description: '',
        steps: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      await saveTutorial(tutorial)
      const prevState = await getRecordingState()
      await setRecordingState({
        isRecording: true,
        currentTutorialId: tutorialId,
        stepCount: 0,
        // Preserve options from previous session if they exist
        options: prevState.options ?? { showHighlight: true, showClickDot: false },
      })
      const newState = await getRecordingState()
      await notifyAllTabs({ type: 'START_RECORDING', payload: { options: newState.options } })
      return { tutorialId }
    }

    case 'STOP_RECORDING': {
      const state = await getRecordingState()
      await setRecordingState({ isRecording: false, currentTutorialId: null, stepCount: 0, options: state.options })
      await notifyAllTabs({ type: 'STOP_RECORDING' })
      return { tutorialId: state.currentTutorialId }
    }

    case 'UPDATE_RECORDING_OPTIONS': {
      const state = await getRecordingState()
      const options = message.payload as RecordingOptions
      await setRecordingState({ ...state, options })
      await notifyAllTabs({ type: 'UPDATE_RECORDING_OPTIONS', payload: options })
      return { ok: true }
    }

    case 'CAPTURE_SCREENSHOT': {
      const state = await getRecordingState()
      if (!state.isRecording || !state.currentTutorialId) return { error: 'Not recording' }

      const payload = message.payload as { target: ClickTarget; url: string; pageTitle: string }
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
      const tab = tabs[0]
      if (!tab?.id) return { error: 'No active tab' }

      // Hide the recording overlay before capturing, restore after
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => {
        const el = document.getElementById('click-tuto-overlay')
        const hl = document.getElementById('click-tuto-highlight')
        if (el) el.style.visibility = 'hidden'
        if (hl) hl.style.visibility = 'hidden'
      }})

      // Give the browser one frame to repaint before capturing
      await new Promise(r => setTimeout(r, 60))

      const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId!, {
        format: 'png',
        quality: 95,
      })

      await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => {
        const el = document.getElementById('click-tuto-overlay')
        const hl = document.getElementById('click-tuto-highlight')
        if (el) el.style.visibility = 'visible'
        if (hl) hl.style.visibility = 'visible'
      }})

      const step: TutorialStep = {
        id: generateId(),
        order: state.stepCount,
        screenshot: dataUrl,
        annotations: [],
        title: `Passo ${state.stepCount + 1}`,
        description: '',
        target: payload.target,
        url: payload.url,
        pageTitle: payload.pageTitle,
        timestamp: Date.now(),
      }

      await addStep(state.currentTutorialId, step)
      await setRecordingState({
        ...state,
        stepCount: state.stepCount + 1,
      })

      return { stepId: step.id, order: step.order }
    }

    case 'OPEN_EDITOR': {
      const payload = message.payload as { tutorialId: string } | undefined
      const state = await getRecordingState()
      const id = payload?.tutorialId ?? state.currentTutorialId
      if (!id) return { error: 'No tutorial id' }
      const url = chrome.runtime.getURL(`editor.html?tutorial=${id}`)
      await chrome.tabs.create({ url })
      return { ok: true }
    }

    default:
      return { error: 'Unknown message type' }
  }
}

async function notifyAllTabs(message: Message): Promise<void> {
  const tabs = await chrome.tabs.query({})
  await Promise.allSettled(
    tabs
      .filter(t => t.id !== undefined)
      .map(t => chrome.tabs.sendMessage(t.id!, message).catch(() => {}))
  )
}
