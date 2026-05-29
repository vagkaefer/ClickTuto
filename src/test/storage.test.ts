import { describe, it, expect } from 'vitest'
import {
  saveTutorial,
  getTutorial,
  getAllTutorials,
  deleteTutorial,
  addStep,
  getRecordingState,
  setRecordingState,
  generateId,
} from '../shared/storage'
import type { Tutorial, TutorialStep, RecordingState } from '../shared/types'

function makeTutorial(overrides: Partial<Tutorial> = {}): Tutorial {
  return {
    id: generateId(),
    title: 'Test Tutorial',
    description: '',
    steps: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  }
}

function makeStep(overrides: Partial<TutorialStep> = {}): TutorialStep {
  return {
    id: generateId(),
    order: 0,
    screenshot: 'data:image/png;base64,abc',
    annotations: [],
    title: 'Step 1',
    description: '',
    url: 'https://example.com',
    pageTitle: 'Example',
    timestamp: Date.now(),
    ...overrides,
  }
}

describe('storage — tutorial CRUD', () => {
  it('saves and retrieves a tutorial', async () => {
    const t = makeTutorial({ title: 'My Tutorial' })
    await saveTutorial(t)
    const retrieved = await getTutorial(t.id)
    expect(retrieved?.title).toBe('My Tutorial')
  })

  it('returns null for unknown id', async () => {
    const result = await getTutorial('nonexistent-id')
    expect(result).toBeNull()
  })

  it('updates existing tutorial on re-save', async () => {
    const t = makeTutorial({ title: 'Original' })
    await saveTutorial(t)
    await saveTutorial({ ...t, title: 'Updated' })
    const all = await getAllTutorials()
    expect(all).toHaveLength(1)
    expect(all[0].title).toBe('Updated')
  })

  it('saves multiple tutorials independently', async () => {
    const a = makeTutorial({ title: 'A' })
    const b = makeTutorial({ title: 'B' })
    await saveTutorial(a)
    await saveTutorial(b)
    const all = await getAllTutorials()
    expect(all).toHaveLength(2)
    expect(all.map(t => t.title).sort()).toEqual(['A', 'B'])
  })

  it('deletes a tutorial and leaves others intact', async () => {
    const a = makeTutorial({ title: 'A' })
    const b = makeTutorial({ title: 'B' })
    await saveTutorial(a)
    await saveTutorial(b)
    await deleteTutorial(a.id)
    const all = await getAllTutorials()
    expect(all).toHaveLength(1)
    expect(all[0].title).toBe('B')
  })

  it('deleting unknown id does not throw', async () => {
    await saveTutorial(makeTutorial())
    await expect(deleteTutorial('ghost-id')).resolves.toBeUndefined()
    expect(await getAllTutorials()).toHaveLength(1)
  })
})

describe('storage — addStep', () => {
  it('appends a step to existing tutorial', async () => {
    const t = makeTutorial()
    await saveTutorial(t)
    const step = makeStep({ title: 'Click here' })
    await addStep(t.id, step)
    const updated = await getTutorial(t.id)
    expect(updated?.steps).toHaveLength(1)
    expect(updated?.steps[0].title).toBe('Click here')
  })

  it('does nothing for unknown tutorialId', async () => {
    await expect(addStep('ghost', makeStep())).resolves.toBeUndefined()
  })

  it('updates updatedAt when step is added', async () => {
    const before = Date.now()
    const t = makeTutorial({ updatedAt: before - 1000 })
    await saveTutorial(t)
    await addStep(t.id, makeStep())
    const updated = await getTutorial(t.id)
    expect(updated!.updatedAt).toBeGreaterThanOrEqual(before)
  })
})

describe('storage — recording state', () => {
  it('returns default state when nothing is stored', async () => {
    const state = await getRecordingState()
    expect(state.isRecording).toBe(false)
    expect(state.currentTutorialId).toBeNull()
    expect(state.stepCount).toBe(0)
    expect(state.options.showHighlight).toBe(true)
    expect(state.options.showClickDot).toBe(false)
  })

  it('persists and retrieves recording state', async () => {
    const newState: RecordingState = {
      isRecording: true,
      currentTutorialId: 'abc-123',
      stepCount: 5,
      options: { showHighlight: false, showClickDot: true },
    }
    await setRecordingState(newState)
    const retrieved = await getRecordingState()
    expect(retrieved).toEqual(newState)
  })
})

describe('generateId', () => {
  it('generates unique ids', () => {
    const ids = Array.from({ length: 100 }, generateId)
    expect(new Set(ids).size).toBe(100)
  })

  it('id contains timestamp prefix', () => {
    const before = Date.now()
    const id = generateId()
    const ts = parseInt(id.split('-')[0])
    expect(ts).toBeGreaterThanOrEqual(before)
  })
})
