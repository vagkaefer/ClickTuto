import { describe, it, expect } from 'vitest'

// Test the pure utility functions extracted from ExportPanel logic.
// We test them here as standalone functions to avoid needing a DOM + Konva setup.

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'tutorial'
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

describe('slugify', () => {
  it('lowercases and replaces spaces', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })

  it('replaces multiple special chars with single dash', () => {
    expect(slugify('Hello --- World!!!')).toBe('hello-world')
  })

  it('strips leading and trailing dashes', () => {
    expect(slugify('  hello  ')).toBe('hello')
  })

  it('returns "tutorial" for empty string', () => {
    expect(slugify('')).toBe('tutorial')
  })

  it('returns "tutorial" for string with only special chars', () => {
    expect(slugify('!!!')).toBe('tutorial')
  })

  it('preserves numbers', () => {
    expect(slugify('Tutorial 2024')).toBe('tutorial-2024')
  })

  it('handles unicode by stripping non-ascii', () => {
    expect(slugify('Tutoriais ótimos')).toBe('tutoriais-timos')
  })
})

describe('escapeHtml', () => {
  it('escapes ampersand', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b')
  })

  it('escapes angle brackets', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;')
  })

  it('escapes double quotes', () => {
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;')
  })

  it('escapes all at once', () => {
    expect(escapeHtml('<a href="test&value">')).toBe('&lt;a href=&quot;test&amp;value&quot;&gt;')
  })

  it('leaves plain text unchanged', () => {
    expect(escapeHtml('hello world')).toBe('hello world')
  })
})

describe('annotation size estimation', () => {
  // Mirrors the logic in TutorialList.estimateSize
  function estimateSize(screenshotBase64: string): number {
    return screenshotBase64.length * 0.75
  }

  it('returns 0 for empty screenshot', () => {
    expect(estimateSize('')).toBe(0)
  })

  it('approximates byte count from base64 length', () => {
    // A 100-char base64 string ~ 75 bytes
    const base64 = 'A'.repeat(100)
    expect(estimateSize(base64)).toBe(75)
  })
})

describe('arrow drag offset math', () => {
  // Mirrors the dragend logic in ImageCanvas for arrows:
  // absorb node x/y offset into points, reset node to (0,0)
  function absorbArrowOffset(
    pts: number[],
    dx: number,
    dy: number,
  ): number[] {
    return [pts[0] + dx, pts[1] + dy, pts[2] + dx, pts[3] + dy]
  }

  it('shifts all four point coords by the drag offset', () => {
    const result = absorbArrowOffset([10, 20, 100, 200], 5, -10)
    expect(result).toEqual([15, 10, 105, 190])
  })

  it('zero offset leaves points unchanged', () => {
    const pts = [0, 0, 50, 50]
    expect(absorbArrowOffset(pts, 0, 0)).toEqual(pts)
  })

  it('negative offset moves points left/up', () => {
    const result = absorbArrowOffset([100, 100, 200, 200], -20, -30)
    expect(result).toEqual([80, 70, 180, 170])
  })
})

describe('transform scale normalization', () => {
  // Mirrors the transformend logic for rect/blur:
  // newSize = (size * scale) / stageScale, then reset node scale to 1
  function normalizeTransform(
    width: number,
    height: number,
    scaleX: number,
    scaleY: number,
    stageScale: number,
  ) {
    return {
      width: (width * scaleX) / stageScale,
      height: (height * scaleY) / stageScale,
    }
  }

  it('no scale change returns original size', () => {
    const result = normalizeTransform(100, 50, 1, 1, 1)
    expect(result).toEqual({ width: 100, height: 50 })
  })

  it('double scale doubles size', () => {
    const result = normalizeTransform(100, 50, 2, 2, 1)
    expect(result).toEqual({ width: 200, height: 100 })
  })

  it('accounts for stage scale factor', () => {
    // stageScale 0.5 means node is rendered at half size,
    // so a 2x transform on a 100px node = 100px in image coords
    const result = normalizeTransform(100, 50, 2, 2, 2)
    expect(result).toEqual({ width: 100, height: 50 })
  })
})
