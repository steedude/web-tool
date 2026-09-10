<script setup lang="ts">
import type { DrawStroke } from '~/types/draw.type'
import { DRAW_CANVAS_CONFIG } from '~/configs/draw.config'
import { createStrokeRenderer } from '~/utils/draw-renderer.util'

const props = defineProps<{
  disabled: boolean
  resetKey: number
  strokes: DrawStroke[]
}>()

const emit = defineEmits<{
  stroke: [stroke: DrawStroke]
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const drawing = ref(false)
const activeStrokeId = ref('')
const lastPoint = ref<{ x: number, y: number } | null>(null)
let canvasSize = { width: 0, height: 0 }
let frame: number | null = null
let resizeObserver: ResizeObserver | null = null
const renderer = createStrokeRenderer(
  () => getContext()?.clearRect(0, 0, canvasSize.width, canvasSize.height),
  drawStroke,
)

function scheduleRender() {
  if (frame !== null)
    return
  frame = requestAnimationFrame(() => {
    frame = null
    renderer.render(props.strokes, props.resetKey)
  })
}

function getContext() {
  return canvasRef.value?.getContext('2d') ?? null
}

function resizeCanvas() {
  const canvas = canvasRef.value
  if (!canvas)
    return

  const rect = canvas.getBoundingClientRect()
  canvasSize = { width: rect.width, height: rect.height }
  const ratio = window.devicePixelRatio || 1
  canvas.width = Math.round(rect.width * ratio)
  canvas.height = Math.round(rect.height * ratio)

  const context = getContext()
  if (!context)
    return

  context.setTransform(ratio, 0, 0, ratio, 0, 0)
  renderer.render(props.strokes, props.resetKey, true)
}

function drawStroke(stroke: DrawStroke) {
  const canvas = canvasRef.value
  const context = getContext()
  if (!canvas || !context)
    return

  const rect = canvasSize
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.lineWidth = DRAW_CANVAS_CONFIG.lineWidth
  context.strokeStyle = DRAW_CANVAS_CONFIG.lineColor
  context.beginPath()
  context.moveTo(stroke.x0 * rect.width, stroke.y0 * rect.height)
  context.lineTo(stroke.x1 * rect.width, stroke.y1 * rect.height)
  context.stroke()
}

// 將視窗座標轉成 canvas 內的 0～1 比例，讓不同螢幕能重畫在相同相對位置。
function getNormalizedPoint(event: PointerEvent) {
  const canvas = canvasRef.value
  if (!canvas)
    return null

  const rect = canvas.getBoundingClientRect()
  return {
    x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
    y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
  }
}

function startDrawing(event: PointerEvent) {
  if (props.disabled)
    return

  drawing.value = true
  activeStrokeId.value = crypto.randomUUID()
  lastPoint.value = getNormalizedPoint(event)
  canvasRef.value?.setPointerCapture(event.pointerId)
}

function moveDrawing(event: PointerEvent) {
  if (!drawing.value || props.disabled)
    return

  const point = getNormalizedPoint(event)
  const previous = lastPoint.value
  if (!point || !previous)
    return

  const stroke: DrawStroke = {
    id: activeStrokeId.value,
    x0: previous.x,
    x1: point.x,
    y0: previous.y,
    y1: point.y,
  }
  lastPoint.value = point
  emit('stroke', stroke)
}

function stopDrawing() {
  drawing.value = false
  activeStrokeId.value = ''
  lastPoint.value = null
}

watch([() => props.strokes, () => props.strokes.length, () => props.resetKey], scheduleRender, { flush: 'post' })
watch(() => props.disabled, stopDrawing)

onMounted(() => {
  resizeCanvas()
  resizeObserver = new ResizeObserver(resizeCanvas)
  if (canvasRef.value)
    resizeObserver.observe(canvasRef.value)
  window.addEventListener('resize', resizeCanvas)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  if (frame !== null)
    cancelAnimationFrame(frame)
  window.removeEventListener('resize', resizeCanvas)
})
</script>

<template>
  <canvas
    ref="canvasRef"
    class="block h-full min-h-88 w-full touch-none bg-white"
    :class="disabled ? 'cursor-not-allowed opacity-70' : 'cursor-crosshair'"
    @pointerdown="startDrawing"
    @pointermove="moveDrawing"
    @pointerup="stopDrawing"
    @pointercancel="stopDrawing"
    @pointerleave="stopDrawing"
  />
</template>
