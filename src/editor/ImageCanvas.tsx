import { useEffect, useRef, useState, useCallback } from 'react'
import Konva from 'konva'
import type { TutorialStep, Annotation, ArrowAnnotation, BlurAnnotation, TextAnnotation, HighlightAnnotation, CircleAnnotation } from '../shared/types'

type Tool = 'select' | 'arrow' | 'blur' | 'text' | 'highlight' | 'circle'

interface Props {
  step: TutorialStep
  onChange: (step: TutorialStep) => void
}

interface DrawState {
  isDrawing: boolean
  startX: number
  startY: number
  currentShape: Konva.Shape | null
}

function genId() {
  return `ann-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function ImageCanvas({ step, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage | null>(null)
  const imageLayerRef = useRef<Konva.Layer | null>(null)
  const annotationLayerRef = useRef<Konva.Layer | null>(null)
  const transformerRef = useRef<Konva.Transformer | null>(null)
  const arrowHandlesRef = useRef<Konva.Circle[]>([])  // endpoint handles for selected arrow
  const srcCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawState = useRef<DrawState>({ isDrawing: false, startX: 0, startY: 0, currentShape: null })
  const stageScale = useRef(1)

  const [tool, setTool] = useState<Tool>('select')
  const [color, setColor] = useState('#ef4444')
  const [annotations, setAnnotations] = useState<Annotation[]>(step.annotations)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Refs so Konva closures always see current values without re-binding
  const toolRef = useRef(tool)
  const colorRef = useRef(color)
  const annotationsRef = useRef(annotations)
  const onChangeRef = useRef(onChange)
  const stepRef = useRef(step)
  const selectedIdRef = useRef(selectedId)

  useEffect(() => { toolRef.current = tool }, [tool])
  useEffect(() => { colorRef.current = color }, [color])
  useEffect(() => { annotationsRef.current = annotations }, [annotations])
  useEffect(() => { onChangeRef.current = onChange }, [onChange])
  useEffect(() => { stepRef.current = step }, [step])
  useEffect(() => { selectedIdRef.current = selectedId }, [selectedId])

  // When step changes externally, sync annotations and deselect
  useEffect(() => {
    setAnnotations(step.annotations)
    setSelectedId(null)
  }, [step.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Deselect when switching away from select tool
  useEffect(() => {
    if (tool !== 'select') {
      setSelectedId(null)
      transformerRef.current?.nodes([])
      if (annotationLayerRef.current) clearArrowHandles(annotationLayerRef.current)
    }
  }, [tool]) // eslint-disable-line react-hooks/exhaustive-deps

  // Build Konva stage once container has real dimensions
  const buildStage = useCallback((cw: number, ch: number) => {
    const img = new Image()
    img.onload = () => {
      if (!containerRef.current) return
      const scale = Math.min((cw - 32) / img.width, (ch - 80) / img.height, 1)
      const w = Math.floor(img.width * scale)
      const h = Math.floor(img.height * scale)
      stageScale.current = scale

      stageRef.current?.destroy()

      const stage = new Konva.Stage({ container: containerRef.current, width: w, height: h })
      stageRef.current = stage

      // Image layer (static, never touched again)
      const imgLayer = new Konva.Layer()
      imageLayerRef.current = imgLayer
      stage.add(imgLayer)
      const konvaImg = new Konva.Image({ image: img, width: w, height: h })
      imgLayer.add(konvaImg)
      imgLayer.draw()

      // Grab source canvas now, while we have it, and store for blur use
      srcCanvasRef.current = konvaImg.toCanvas() as HTMLCanvasElement

      // Annotation layer
      const annLayer = new Konva.Layer()
      annotationLayerRef.current = annLayer
      stage.add(annLayer)

      // Transformer for select mode
      const tr = new Konva.Transformer({
        rotateEnabled: false,
        borderStroke: '#4f46e5',
        borderStrokeWidth: 1,
        anchorStroke: '#4f46e5',
        anchorFill: '#fff',
        anchorSize: 8,
      })
      transformerRef.current = tr
      annLayer.add(tr)

      // Populate existing annotations
      populateLayer(annLayer, annotationsRef.current, scale, tr, srcCanvasRef.current)
      annLayer.draw()

      bindEvents(stage, annLayer, tr, scale)
    }
    img.src = stepRef.current.screenshot
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      if (width > 0 && height > 0) buildStage(width, height)
    })
    observer.observe(containerRef.current)
    const { clientWidth: cw, clientHeight: ch } = containerRef.current
    if (cw > 0 && ch > 0) buildStage(cw, ch)
    return () => {
      observer.disconnect()
      stageRef.current?.destroy()
      stageRef.current = null
    }
  }, [step.id, step.screenshot, buildStage])

  // Sync annotation layer when annotations state changes (undo/clear/external)
  useEffect(() => {
    const layer = annotationLayerRef.current
    const tr = transformerRef.current
    if (!layer || !tr) return
    const scale = stageScale.current
    const prevSelectedId = selectedIdRef.current
    populateLayer(layer, annotations, scale, tr)

    if (prevSelectedId) {
      const node = layer.findOne(`#${prevSelectedId}`)
      if (!node) { tr.nodes([]); setSelectedId(null) }
      else {
        const ann = annotations.find(a => a.id === prevSelectedId)
        if (ann?.type === 'arrow') {
          // Re-attach handles on the freshly rebuilt arrow node
          tr.nodes([])
          clearArrowHandles(layer)
          showArrowHandles(node as Konva.Arrow, ann as ArrowAnnotation, layer)
        } else {
          tr.nodes([node as Konva.Shape])
        }
      }
    }
    layer.batchDraw()
  }, [annotations]) // eslint-disable-line react-hooks/exhaustive-deps

  function populateLayer(layer: Konva.Layer, anns: Annotation[], scale: number, tr: Konva.Transformer, srcCanvas?: HTMLCanvasElement | null) {
    // Preserve transformer and arrow handles — destroy only annotation shapes
    const handles = new Set<Konva.Node>(arrowHandlesRef.current)
    layer.getChildren(node => node !== tr && !handles.has(node)).forEach(n => n.destroy())
    for (const ann of anns) {
      const node = buildNode(ann, scale, srcCanvas ?? srcCanvasRef.current)
      if (!node) continue
      layer.add(node as unknown as Konva.Shape)
    }
    tr.moveToTop()
  }

  function buildNode(ann: Annotation, s: number, srcCanvas: HTMLCanvasElement | null | undefined): Konva.Node | null {
    const commonDrag = { draggable: true, id: ann.id }
    switch (ann.type) {
      case 'arrow': {
        const a = ann as ArrowAnnotation
        return new Konva.Arrow({ ...commonDrag, points: [a.x1 * s, a.y1 * s, a.x2 * s, a.y2 * s], stroke: a.color, strokeWidth: a.strokeWidth, fill: a.color, pointerLength: 10, pointerWidth: 8, hitStrokeWidth: 16 })
      }
      case 'blur': {
        const b = ann as BlurAnnotation
        // Render gaussian blur by cropping the source image into an off-screen canvas
        // and drawing it blurred, then passing the result as a Konva.Image
        const bx = Math.floor(b.x * s)
        const by = Math.floor(b.y * s)
        const bw = Math.ceil(b.width * s)
        const bh = Math.ceil(b.height * s)
        const radius = b.intensity            // reuse intensity field as blur px radius
        const pad = radius * 2                // padding so blur doesn't clip at edges

        const offscreen = document.createElement('canvas')
        offscreen.width = bw
        offscreen.height = bh
        const ctx = offscreen.getContext('2d')!

        if (srcCanvas) {
          ctx.filter = `blur(${radius}px)`
          // Draw slightly outside the target rect so the gaussian doesn't fade at edges
          ctx.drawImage(srcCanvas, bx - pad, by - pad, bw + pad * 2, bh + pad * 2, -pad, -pad, bw + pad * 2, bh + pad * 2)
          ctx.filter = 'none'
        } else {
          // Fallback while source image isn't ready yet
          ctx.fillStyle = 'rgba(10,10,40,0.85)'
          ctx.fillRect(0, 0, bw, bh)
        }

        const blurImg = new Image()
        blurImg.src = offscreen.toDataURL()
        // Explicit hitFunc so the transparent edges don't break click detection
        return new Konva.Image({
          ...commonDrag, image: blurImg, x: bx, y: by, width: bw, height: bh,
          hitFunc(ctx: Konva.Context) {
            ctx.beginPath()
            ctx.rect(0, 0, bw, bh)
            ctx.closePath()
            ctx.fillStrokeShape(this)
          },
        })
      }
      case 'text': {
        const t = ann as TextAnnotation
        const label = new Konva.Label({ ...commonDrag, x: t.x * s, y: t.y * s })
        label.add(new Konva.Tag({ fill: t.bgColor, cornerRadius: 4 }))
        label.add(new Konva.Text({ text: t.text, fontSize: t.fontSize, fill: t.color, padding: 6, fontFamily: 'system-ui' }))
        return label
      }
      case 'highlight': {
        const h = ann as HighlightAnnotation
        return new Konva.Rect({ ...commonDrag, x: h.x * s, y: h.y * s, width: h.width * s, height: h.height * s, fill: h.color, opacity: h.opacity })
      }
      case 'circle': {
        const c = ann as CircleAnnotation
        return new Konva.Circle({ ...commonDrag, x: c.x * s, y: c.y * s, radius: c.radius * s, stroke: c.color, strokeWidth: c.strokeWidth, fill: 'transparent', hitStrokeWidth: 14 })
      }
      default: return null
    }
  }

  function bindEvents(stage: Konva.Stage, annLayer: Konva.Layer, tr: Konva.Transformer, scale: number) {
    // --- SELECT MODE: click to select, drag to move, dragend persists position ---
    stage.on('click tap', (e) => {
      if (toolRef.current !== 'select') return
      const target = e.target

      // Click on stage background or the base screenshot image → deselect
      const isBackground = target === stage ||
        (target instanceof Konva.Image && !target.id())
      if (isBackground) {
        clearArrowHandles(annLayer)
        tr.nodes([])
        setSelectedId(null)
        annLayer.batchDraw()
        return
      }

      const topNode = getTopAnnotationNode(target, annLayer)
      if (!topNode) return

      const annId = topNode.id()
      const ann = annotationsRef.current.find(a => a.id === annId)

      clearArrowHandles(annLayer)

      if (ann?.type === 'arrow') {
        // Arrows: show draggable endpoint handles instead of transformer
        tr.nodes([])
        setSelectedId(annId)
        showArrowHandles(topNode as Konva.Arrow, ann as ArrowAnnotation, annLayer)
        annLayer.batchDraw()
      } else {
        tr.nodes([topNode as Konva.Shape])
        setSelectedId(annId)
        annLayer.batchDraw()
      }
    })

    // Persist position after drag
    annLayer.on('dragend', (e) => {
      const node = e.target
      const annId = node.id()
      if (!annId) return
      const s = stageScale.current
      const current = annotationsRef.current
      const updated = current.map(ann => {
        if (ann.id !== annId) return ann
        if (ann.type === 'arrow') {
          // Konva stores drag offset in node.x()/node.y(); points stay relative to that origin.
          // Absorb the offset into the points and reset node position to (0,0) so
          // the next drag starts clean.
          const arrow = node as Konva.Arrow
          const dx = arrow.x()
          const dy = arrow.y()
          const pts = arrow.points()
          const newPts = [pts[0] + dx, pts[1] + dy, pts[2] + dx, pts[3] + dy]
          arrow.points(newPts)
          arrow.x(0)
          arrow.y(0)
          return { ...ann, x1: newPts[0] / s, y1: newPts[1] / s, x2: newPts[2] / s, y2: newPts[3] / s }
        }
        // Everything else (rect, circle, label) uses x/y directly
        return { ...ann, x: node.x() / s, y: node.y() / s }
      })
      setAnnotations(updated as Annotation[])
      onChangeRef.current({ ...stepRef.current, annotations: updated as Annotation[] })
    })

    // Persist size after transform (resize via handles)
    tr.on('transformend', () => {
      const nodes = tr.nodes()
      if (!nodes.length) return
      const node = nodes[0]
      const annId = node.id()
      const s = stageScale.current
      const current = annotationsRef.current
      const updated = current.map(ann => {
        if (ann.id !== annId) return ann
        if (ann.type === 'highlight' || ann.type === 'blur') {
          // blur is Konva.Image, highlight is Konva.Rect — both expose width/height/scaleX/scaleY
          const r = node as Konva.Rect | Konva.Image
          const scaleX = r.scaleX(); const scaleY = r.scaleY()
          const newW = (r.width() * scaleX) / s
          const newH = (r.height() * scaleY) / s
          r.scaleX(1); r.scaleY(1)
          r.width(newW * s); r.height(newH * s)
          return { ...ann, x: r.x() / s, y: r.y() / s, width: newW, height: newH }
        }
        if (ann.type === 'circle') {
          const c = node as Konva.Circle
          const sc = Math.max(c.scaleX(), c.scaleY())
          const newR = (c.radius() * sc) / s
          c.scaleX(1); c.scaleY(1)
          c.radius(newR * s)
          return { ...ann, x: c.x() / s, y: c.y() / s, radius: newR }
        }
        if (ann.type === 'text') {
          // Label doesn't have width/height — resize by scaling fontSize
          const label = node as Konva.Label
          const sc = Math.max(label.scaleX(), label.scaleY())
          const textNode = label.findOne('Text') as Konva.Text | undefined
          if (textNode) {
            const newSize = Math.max(8, Math.round((ann as TextAnnotation).fontSize * sc))
            textNode.fontSize(newSize)
          }
          label.scaleX(1); label.scaleY(1)
          return { ...ann, x: label.x() / s, y: label.y() / s, fontSize: textNode ? textNode.fontSize() : (ann as TextAnnotation).fontSize }
        }
        return ann
      })
      setAnnotations(updated as Annotation[])
      onChangeRef.current({ ...stepRef.current, annotations: updated as Annotation[] })
      annLayer.batchDraw()
    })

    // --- DRAW MODE ---
    stage.on('mousedown touchstart', () => {
      if (toolRef.current === 'select') return
      const pos = stage.getPointerPosition()
      if (!pos) return
      drawState.current = { isDrawing: true, startX: pos.x, startY: pos.y, currentShape: null }

      if (toolRef.current === 'text') {
        const text = prompt('Texto da anotação:')
        drawState.current.isDrawing = false
        if (!text) return
        commitAnnotation({ type: 'text', id: genId(), x: pos.x / scale, y: pos.y / scale, text, fontSize: 14, color: '#fff', bgColor: colorRef.current })
        setTool('select')
        return
      }

      const c = colorRef.current
      let shape: Konva.Shape | null = null
      if (toolRef.current === 'arrow') shape = new Konva.Arrow({ points: [pos.x, pos.y, pos.x, pos.y], stroke: c, strokeWidth: 3, fill: c, pointerLength: 10, pointerWidth: 8 })
      else if (toolRef.current === 'highlight') shape = new Konva.Rect({ x: pos.x, y: pos.y, width: 0, height: 0, fill: c, opacity: 0.35 })
      else if (toolRef.current === 'blur') shape = new Konva.Rect({ x: pos.x, y: pos.y, width: 0, height: 0, fill: 'rgba(10,10,40,0.85)' })
      else if (toolRef.current === 'circle') shape = new Konva.Circle({ x: pos.x, y: pos.y, radius: 0, stroke: c, strokeWidth: 3, fill: 'transparent' })

      if (shape) { drawState.current.currentShape = shape; annLayer.add(shape) }
    })

    stage.on('mousemove touchmove', () => {
      const ds = drawState.current
      if (!ds.isDrawing || !ds.currentShape) return
      const pos = stage.getPointerPosition()
      if (!pos) return
      const t = toolRef.current
      if (t === 'arrow') { const a = ds.currentShape as Konva.Arrow; const p = a.points(); a.points([p[0], p[1], pos.x, pos.y]) }
      else if (t === 'highlight' || t === 'blur') { const r = ds.currentShape as Konva.Rect; r.width(pos.x - ds.startX); r.height(pos.y - ds.startY) }
      else if (t === 'circle') { const c = ds.currentShape as Konva.Circle; const dx = pos.x - ds.startX; const dy = pos.y - ds.startY; c.radius(Math.sqrt(dx * dx + dy * dy)) }
      annLayer.batchDraw()
    })

    stage.on('mouseup touchend', () => {
      const ds = drawState.current
      if (!ds.isDrawing) return
      ds.isDrawing = false
      if (!ds.currentShape) return
      const t = toolRef.current
      const c = colorRef.current
      const id = genId()
      let ann: Annotation | null = null

      if (t === 'arrow') { const p = (ds.currentShape as Konva.Arrow).points(); ann = { type: 'arrow', id, x1: p[0] / scale, y1: p[1] / scale, x2: p[2] / scale, y2: p[3] / scale, color: c, strokeWidth: 3 } }
      else if (t === 'highlight') { const r = ds.currentShape as Konva.Rect; ann = { type: 'highlight', id, x: r.x() / scale, y: r.y() / scale, width: r.width() / scale, height: r.height() / scale, color: c, opacity: 0.35 } }
      else if (t === 'blur') { const r = ds.currentShape as Konva.Rect; ann = { type: 'blur', id, x: r.x() / scale, y: r.y() / scale, width: r.width() / scale, height: r.height() / scale, intensity: 20 } }
      else if (t === 'circle') { const ci = ds.currentShape as Konva.Circle; ann = { type: 'circle', id, x: ci.x() / scale, y: ci.y() / scale, radius: ci.radius() / scale, color: c, strokeWidth: 3 } }

      ds.currentShape.destroy()
      drawState.current.currentShape = null
      if (ann) {
        commitAnnotation(ann)
        setTool('select')
      }
    })
  }

  function getTopAnnotationNode(target: Konva.Node, layer: Konva.Layer): Konva.Node | null {
    let node: Konva.Node | null = target
    while (node && node.getParent() !== layer) node = node.getParent()
    if (!node || node instanceof Konva.Transformer) return null
    return node
  }

  function clearArrowHandles(layer: Konva.Layer) {
    arrowHandlesRef.current.forEach(h => h.destroy())
    arrowHandlesRef.current = []
    layer.batchDraw()
  }

  function showArrowHandles(arrowNode: Konva.Arrow, ann: ArrowAnnotation, layer: Konva.Layer) {
    const pts = arrowNode.points()

    const makeHandle = (px: number, py: number, isEnd: boolean) => {
      const h = new Konva.Circle({
        x: px, y: py, radius: 7,
        fill: '#fff', stroke: '#4f46e5', strokeWidth: 2,
        draggable: true, name: 'arrow-handle',
      })

      h.on('dragmove', () => {
        // Update arrow live while dragging
        const cur = [...arrowNode.points()]
        if (isEnd) { cur[2] = h.x(); cur[3] = h.y() }
        else       { cur[0] = h.x(); cur[1] = h.y() }
        arrowNode.points(cur)
        layer.batchDraw()
      })

      h.on('dragend', () => {
        const newPts = arrowNode.points()
        const s = stageScale.current
        const updatedAnn: ArrowAnnotation = {
          ...ann,
          x1: newPts[0] / s, y1: newPts[1] / s,
          x2: newPts[2] / s, y2: newPts[3] / s,
        }
        const updated = annotationsRef.current.map(a => a.id === ann.id ? updatedAnn : a)
        // Persist to state — useEffect will re-run populateLayer
        setAnnotations(updated as Annotation[])
        onChangeRef.current({ ...stepRef.current, annotations: updated as Annotation[] })
        // After populateLayer replaces the arrow node, re-attach handles in next frame
        selectedIdRef.current = ann.id
        requestAnimationFrame(() => {
          const fresh = layer.findOne(`#${ann.id}`) as Konva.Arrow | undefined
          if (fresh) {
            clearArrowHandles(layer)
            showArrowHandles(fresh, updatedAnn, layer)
          }
        })
      })

      return h
    }

    const h1 = makeHandle(pts[0], pts[1], false)
    const h2 = makeHandle(pts[2], pts[3], true)
    layer.add(h1)
    layer.add(h2)
    arrowHandlesRef.current = [h1, h2]
    layer.batchDraw()
  }

  function commitAnnotation(ann: Annotation) {
    const updated = [...annotationsRef.current, ann]
    setAnnotations(updated)
    onChangeRef.current({ ...stepRef.current, annotations: updated })
  }

  function deleteSelected() {
    if (!selectedId) return
    const updated = annotationsRef.current.filter(a => a.id !== selectedId)
    transformerRef.current?.nodes([])
    if (annotationLayerRef.current) clearArrowHandles(annotationLayerRef.current)
    setSelectedId(null)
    setAnnotations(updated)
    onChangeRef.current({ ...stepRef.current, annotations: updated })
  }

  function undoLast() {
    const current = annotationsRef.current
    if (!current.length) return
    // If the last one is selected, deselect first
    const last = current[current.length - 1]
    if (selectedId === last.id) { transformerRef.current?.nodes([]); setSelectedId(null) }
    const updated = current.slice(0, -1)
    setAnnotations(updated)
    onChangeRef.current({ ...stepRef.current, annotations: updated })
  }

  function clearAll() {
    transformerRef.current?.nodes([])
    if (annotationLayerRef.current) clearArrowHandles(annotationLayerRef.current)
    setSelectedId(null)
    setAnnotations([])
    onChangeRef.current({ ...stepRef.current, annotations: [] })
  }

  // Delete key removes selected annotation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIdRef.current) {
        // Don't fire if user is typing in an input
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return
        deleteSelected()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const toolDefs: { id: Tool; icon: string; label: string }[] = [
    { id: 'select', icon: '↖', label: 'Selecionar / mover (S)' },
    { id: 'arrow', icon: '→', label: 'Seta (A)' },
    { id: 'highlight', icon: '▭', label: 'Destaque' },
    { id: 'blur', icon: '⬛', label: 'Ocultar' },
    { id: 'text', icon: 'T', label: 'Texto' },
    { id: 'circle', icon: '○', label: 'Círculo' },
  ]

  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ffffff']

  return (
    <div style={styles.wrapper}>
      <div style={styles.toolbar}>
        <div style={styles.toolGroup}>
          {toolDefs.map(t => (
            <button key={t.id} style={{ ...styles.toolBtn, ...(tool === t.id ? styles.toolActive : {}) }} onClick={() => setTool(t.id)} title={t.label}>
              {t.icon}
            </button>
          ))}
        </div>
        <div style={styles.separator} />
        <div style={styles.toolGroup}>
          {colors.map(c => (
            <button key={c} style={{ ...styles.colorBtn, background: c, outline: color === c ? '2px solid #fff' : 'none', outlineOffset: '1px' }} onClick={() => setColor(c)} />
          ))}
        </div>
        <div style={styles.separator} />
        <div style={styles.toolGroup}>
          {selectedId && (
            <button style={{ ...styles.actionBtn, color: '#f87171', borderColor: '#7f1d1d' }} onClick={deleteSelected} title="Deletar selecionado (Del)">🗑</button>
          )}
          <button style={styles.actionBtn} onClick={undoLast} title="Desfazer último (Ctrl+Z)">↩</button>
          <button style={styles.actionBtn} onClick={clearAll} title="Limpar tudo">✕</button>
        </div>
        {selectedId && (
          <div style={styles.hint}>selecionado — arraste ou Del para remover</div>
        )}
      </div>

      <div ref={containerRef} style={{ ...styles.canvas, cursor: tool === 'select' ? 'default' : 'crosshair' }} />
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { display: 'flex', flexDirection: 'column', width: '100%', height: '100%', alignItems: 'center' },
  toolbar: { display: 'flex', alignItems: 'center', gap: '4px', background: '#111', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '6px 10px', margin: '12px 0 8px', flexShrink: 0, flexWrap: 'wrap' },
  toolGroup: { display: 'flex', gap: '4px', alignItems: 'center' },
  separator: { width: '1px', height: '20px', background: '#2a2a2a', margin: '0 4px' },
  toolBtn: { background: 'transparent', border: '1px solid transparent', color: '#aaa', borderRadius: '6px', width: '30px', height: '30px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  toolActive: { background: '#1e1e3a', border: '1px solid #4f46e5', color: '#a78bfa' },
  colorBtn: { width: '18px', height: '18px', borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0 },
  actionBtn: { background: 'transparent', border: '1px solid #2a2a2a', color: '#aaa', borderRadius: '6px', width: '30px', height: '30px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  hint: { fontSize: '11px', color: '#555', marginLeft: '4px' },
  canvas: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', overflow: 'auto', padding: '0 16px 16px' },
}
