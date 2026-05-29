import { describe, it, expect } from 'vitest'
import type {
  Annotation,
  ArrowAnnotation,
  BlurAnnotation,
  TextAnnotation,
  HighlightAnnotation,
  CircleAnnotation,
  RecordingOptions,
  TutorialStep,
  Tutorial,
} from '../shared/types'

// These tests verify the type contracts are complete and that
// discriminated union narrowing works as expected at runtime.

describe('Annotation discriminated union', () => {
  it('arrow has x1/y1/x2/y2', () => {
    const ann: ArrowAnnotation = { type: 'arrow', id: '1', x1: 10, y1: 20, x2: 100, y2: 200, color: '#f00', strokeWidth: 3 }
    expect(ann.type).toBe('arrow')
    expect(ann.x1).toBe(10)
  })

  it('blur has x/y/width/height/intensity', () => {
    const ann: BlurAnnotation = { type: 'blur', id: '2', x: 0, y: 0, width: 100, height: 50, intensity: 20 }
    expect(ann.intensity).toBe(20)
  })

  it('text has text/fontSize/color/bgColor', () => {
    const ann: TextAnnotation = { type: 'text', id: '3', x: 5, y: 5, text: 'Hello', fontSize: 14, color: '#fff', bgColor: '#000' }
    expect(ann.text).toBe('Hello')
  })

  it('highlight has color/opacity', () => {
    const ann: HighlightAnnotation = { type: 'highlight', id: '4', x: 0, y: 0, width: 50, height: 30, color: '#ff0', opacity: 0.4 }
    expect(ann.opacity).toBe(0.4)
  })

  it('circle has radius/strokeWidth', () => {
    const ann: CircleAnnotation = { type: 'circle', id: '5', x: 50, y: 50, radius: 25, color: '#00f', strokeWidth: 2 }
    expect(ann.radius).toBe(25)
  })

  it('type guard narrows correctly', () => {
    const anns: Annotation[] = [
      { type: 'arrow', id: 'a', x1: 0, y1: 0, x2: 1, y2: 1, color: '#f00', strokeWidth: 2 },
      { type: 'blur', id: 'b', x: 0, y: 0, width: 10, height: 10, intensity: 5 },
    ]
    const arrows = anns.filter((a): a is ArrowAnnotation => a.type === 'arrow')
    expect(arrows).toHaveLength(1)
    expect(arrows[0].x2).toBe(1)
  })
})

describe('RecordingOptions defaults', () => {
  it('shape is correct', () => {
    const opts: RecordingOptions = { showHighlight: true, showClickDot: false }
    expect(opts.showHighlight).toBe(true)
    expect(opts.showClickDot).toBe(false)
  })
})

describe('TutorialStep shape', () => {
  it('has required fields', () => {
    const step: TutorialStep = {
      id: 'step-1',
      order: 0,
      screenshot: 'data:image/png;base64,abc',
      annotations: [],
      title: 'Click Submit',
      description: 'Click the submit button',
      url: 'https://example.com',
      pageTitle: 'Example',
      timestamp: 1000000,
    }
    expect(step.order).toBe(0)
    expect(step.annotations).toHaveLength(0)
  })

  it('target is optional', () => {
    const step: TutorialStep = {
      id: 's', order: 0, screenshot: '', annotations: [],
      title: '', description: '', url: '', pageTitle: '', timestamp: 0,
    }
    expect(step.target).toBeUndefined()
  })
})

describe('Tutorial shape', () => {
  it('contains steps array', () => {
    const t: Tutorial = {
      id: 't1', title: 'My Tutorial', description: '',
      steps: [], createdAt: 0, updatedAt: 0,
    }
    expect(t.steps).toEqual([])
  })
})
