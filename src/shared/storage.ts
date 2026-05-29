import type { Tutorial, TutorialStep, RecordingState } from './types'

const TUTORIALS_KEY = 'click_tuto_tutorials'
const RECORDING_STATE_KEY = 'click_tuto_recording'

export async function saveTutorial(tutorial: Tutorial): Promise<void> {
  const all = await getAllTutorials()
  const idx = all.findIndex(t => t.id === tutorial.id)
  if (idx >= 0) {
    all[idx] = tutorial
  } else {
    all.push(tutorial)
  }
  await chrome.storage.local.set({ [TUTORIALS_KEY]: all })
}

export async function getTutorial(id: string): Promise<Tutorial | null> {
  const all = await getAllTutorials()
  return all.find(t => t.id === id) ?? null
}

export async function getAllTutorials(): Promise<Tutorial[]> {
  const result = await chrome.storage.local.get(TUTORIALS_KEY)
  return (result[TUTORIALS_KEY] as Tutorial[]) ?? []
}

export async function deleteTutorial(id: string): Promise<void> {
  const all = await getAllTutorials()
  await chrome.storage.local.set({ [TUTORIALS_KEY]: all.filter(t => t.id !== id) })
}

export async function addStep(tutorialId: string, step: TutorialStep): Promise<void> {
  const tutorial = await getTutorial(tutorialId)
  if (!tutorial) return
  tutorial.steps.push(step)
  tutorial.updatedAt = Date.now()
  await saveTutorial(tutorial)
}

export async function getRecordingState(): Promise<RecordingState> {
  const result = await chrome.storage.local.get(RECORDING_STATE_KEY)
  return (result[RECORDING_STATE_KEY] as RecordingState) ?? {
    isRecording: false,
    currentTutorialId: null,
    stepCount: 0,
    options: { showHighlight: true, showClickDot: false },
  }
}

export async function setRecordingState(state: RecordingState): Promise<void> {
  await chrome.storage.local.set({ [RECORDING_STATE_KEY]: state })
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
