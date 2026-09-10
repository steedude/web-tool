import type { DrawStroke } from '~/types/draw.type'

/** 新增線段只補畫尾端；撤銷、更換畫布或 resize 才完整重畫。 */
export function createStrokeRenderer(clear: () => void, draw: (stroke: DrawStroke) => void) {
  let previous: readonly DrawStroke[] | null = null
  let renderedCount = 0
  let version = -1

  return {
    render(strokes: readonly DrawStroke[], boardVersion: number, force = false) {
      if (force || previous !== strokes || version !== boardVersion || strokes.length < renderedCount) {
        clear()
        renderedCount = 0
      }
      for (let index = renderedCount; index < strokes.length; index++)
        draw(strokes[index]!)
      previous = strokes
      renderedCount = strokes.length
      version = boardVersion
    },
  }
}
