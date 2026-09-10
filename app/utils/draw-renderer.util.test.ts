import type { DrawStroke } from '~/types/draw.type'
import { describe, expect, it, vi } from 'vitest'
import { createStrokeRenderer } from './draw-renderer.util'

const stroke = (id: string): DrawStroke => ({ id, x0: 0, y0: 0, x1: 1, y1: 1 })

describe('incremental canvas rendering', () => {
  it('draws each appended segment once, including batched updates', () => {
    const clear = vi.fn()
    const draw = vi.fn()
    const renderer = createStrokeRenderer(clear, draw)
    const strokes: DrawStroke[] = []
    renderer.render(strokes, 0)
    for (let i = 0; i < 1000; i++) {
      strokes.push(stroke(String(i)))
      if (i % 4 === 0)
        renderer.render(strokes, 0)
    }
    renderer.render(strokes, 0)
    expect(clear).toHaveBeenCalledTimes(1)
    expect(draw).toHaveBeenCalledTimes(1000)
  })

  it('repaints after undo, board replacement, reset and resize', () => {
    const clear = vi.fn()
    const draw = vi.fn()
    const renderer = createStrokeRenderer(clear, draw)
    const strokes = [stroke('a'), stroke('b')]
    renderer.render(strokes, 0)
    strokes.pop()
    renderer.render(strokes, 0)
    const replacement = [stroke('c')]
    renderer.render(replacement, 0)
    renderer.render(replacement, 1)
    renderer.render(replacement, 1, true)
    expect(clear).toHaveBeenCalledTimes(5)
    expect(draw.mock.calls.map(([value]) => value.id)).toEqual(['a', 'b', 'a', 'c', 'c', 'c'])
  })
})
