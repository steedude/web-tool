<script setup lang="ts">
import type { DrawStroke } from '~/types/draw.type'
import { DRAW_CANVAS_CONFIG } from '~/configs/draw.config'

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

function getContext() {
  return canvasRef.value?.getContext('2d') ?? null
}

function resizeCanvas() {
  const canvas = canvasRef.value
  if (!canvas)
    return

  const rect = canvas.getBoundingClientRect()
  const ratio = window.devicePixelRatio || 1
  canvas.width = Math.round(rect.width * ratio)
  canvas.height = Math.round(rect.height * ratio)

  const context = getContext()
  if (!context)
    return

  context.setTransform(ratio, 0, 0, ratio, 0, 0)
  redraw()
}

function drawStroke(stroke: DrawStroke) {
  const canvas = canvasRef.value
  const context = getContext()
  if (!canvas || !context)
    return

  const rect = canvas.getBoundingClientRect()
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.lineWidth = DRAW_CANVAS_CONFIG.lineWidth
  context.strokeStyle = DRAW_CANVAS_CONFIG.lineColor
  context.beginPath()
  context.moveTo(stroke.x0 * rect.width, stroke.y0 * rect.height)
  context.lineTo(stroke.x1 * rect.width, stroke.y1 * rect.height)
  context.stroke()
}

function redraw() {
  const canvas = canvasRef.value
  const context = getContext()
  if (!canvas || !context)
    return

  const rect = canvas.getBoundingClientRect()
  context.clearRect(0, 0, rect.width, rect.height)
  props.strokes.forEach(drawStroke)
}

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

watch(() => props.strokes.length, redraw, { flush: 'post' })
watch(() => props.resetKey, redraw, { flush: 'post' })

onMounted(() => {
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCanvas)
})
</script>

<template>
  <canvas
    ref="canvasRef"
    class="block h-full min-h-[22rem] w-full touch-none bg-white"
    :class="disabled ? 'cursor-not-allowed opacity-70' : 'cursor-crosshair'"
    @pointerdown="startDrawing"
    @pointermove="moveDrawing"
    @pointerup="stopDrawing"
    @pointercancel="stopDrawing"
    @pointerleave="stopDrawing"
  />
</template>
