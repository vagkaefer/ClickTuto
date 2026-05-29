import { useState } from 'react'
import Konva from 'konva'
import type { Tutorial, TutorialStep } from '../shared/types'

interface Props {
  tutorial: Tutorial
}

export function ExportPanel({ tutorial }: Props) {
  const [exporting, setExporting] = useState<string | null>(null)
  const [includeUrl, setIncludeUrl] = useState(false)

  // Renders a step's screenshot + annotations into a PNG data URL
  async function renderStepImage(step: TutorialStep): Promise<{ dataUrl: string; width: number; height: number }> {
    return new Promise(resolve => {
      const img = new Image()
      img.onload = () => {
        const w = img.width
        const h = img.height
        const container = document.createElement('div')
        Object.assign(container.style, { position: 'fixed', top: '-9999px', left: '-9999px', width: `${w}px`, height: `${h}px` })
        document.body.appendChild(container)

        const stage = new Konva.Stage({ container, width: w, height: h })
        const layer = new Konva.Layer()
        stage.add(layer)
        layer.add(new Konva.Image({ image: img, width: w, height: h }))

        for (const ann of step.annotations) {
          if (ann.type === 'arrow') {
            layer.add(new Konva.Arrow({ points: [ann.x1, ann.y1, ann.x2, ann.y2], stroke: ann.color, strokeWidth: ann.strokeWidth, fill: ann.color, pointerLength: 10, pointerWidth: 8 }))
          } else if (ann.type === 'highlight') {
            layer.add(new Konva.Rect({ x: ann.x, y: ann.y, width: ann.width, height: ann.height, fill: ann.color, opacity: ann.opacity }))
          } else if (ann.type === 'blur') {
            layer.add(new Konva.Rect({ x: ann.x, y: ann.y, width: ann.width, height: ann.height, fill: 'rgba(10,10,40,0.85)' }))
          } else if (ann.type === 'circle') {
            layer.add(new Konva.Circle({ x: ann.x, y: ann.y, radius: ann.radius, stroke: ann.color, strokeWidth: ann.strokeWidth, fill: 'transparent' }))
          } else if (ann.type === 'text') {
            const label = new Konva.Label({ x: ann.x, y: ann.y })
            label.add(new Konva.Tag({ fill: ann.bgColor, cornerRadius: 4 }))
            label.add(new Konva.Text({ text: ann.text, fontSize: ann.fontSize, fill: ann.color, padding: 6 }))
            layer.add(label)
          }
        }

        layer.draw()
        const dataUrl = stage.toDataURL({ pixelRatio: 1 })
        stage.destroy()
        container.remove()
        resolve({ dataUrl, width: w, height: h })
      }
      img.src = step.screenshot
    })
  }

  // Export as ZIP: markdown file + images folder
  async function exportMarkdown() {
    setExporting('MD')
    const JSZip = (await import('jszip')).default
    const zip = new JSZip()
    const imgFolder = zip.folder('images')!
    const lines: string[] = []
    const slug = slugify(tutorial.title)

    lines.push(`# ${tutorial.title}`)
    if (tutorial.description) lines.push(`\n${tutorial.description}`)
    lines.push('')

    for (let i = 0; i < tutorial.steps.length; i++) {
      const step = tutorial.steps[i]
      const { dataUrl } = await renderStepImage(step)
      const imgName = `step-${String(i + 1).padStart(2, '0')}.png`
      const base64 = dataUrl.split(',')[1]
      imgFolder.file(imgName, base64, { base64: true })

      lines.push(`## Passo ${i + 1}: ${step.title}`)
      if (step.description) lines.push(`\n${step.description}\n`)
      lines.push(`![${step.title}](images/${imgName})`)
      if (includeUrl) lines.push(`\n*${safeUrl(step.url)}*`)
      lines.push('')
    }

    zip.file(`${slug}.md`, lines.join('\n'))
    const blob = await zip.generateAsync({ type: 'blob' })
    downloadBlob(`${slug}.zip`, blob)
    setExporting(null)
  }

  // Export as self-contained HTML
  async function exportHTML() {
    setExporting('HTML')
    const steps: string[] = []

    for (let i = 0; i < tutorial.steps.length; i++) {
      const step = tutorial.steps[i]
      const { dataUrl } = await renderStepImage(step)
      steps.push(`
      <div class="step">
        <div class="step-header">
          <span class="step-badge">Passo ${i + 1}</span>
          <h2 class="step-title">${escapeHtml(step.title)}</h2>
        </div>
        ${step.description ? `<p class="step-desc">${escapeHtml(step.description)}</p>` : ''}
        <img src="${dataUrl}" alt="${escapeHtml(step.title)}" class="step-img" />
        ${includeUrl ? `<div class="step-meta"><a href="${escapeHtml(safeUrl(step.url))}" target="_blank" rel="noopener noreferrer">${escapeHtml(step.url)}</a></div>` : ''}
      </div>`)
    }

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" /><title>${escapeHtml(tutorial.title)}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:system-ui,sans-serif;max-width:860px;margin:48px auto;padding:0 24px;color:#1a1a1a;background:#f8f8f8}
  h1{font-size:30px;margin-bottom:6px;color:#111}
  .tutorial-desc{color:#666;margin-bottom:48px;font-size:15px}
  .step{margin-bottom:52px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);border:1px solid #e8e8e8}
  .step-header{display:flex;align-items:center;gap:12px;padding:16px 20px 10px}
  .step-badge{background:#4f46e5;color:#fff;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;white-space:nowrap}
  .step-title{font-size:17px;font-weight:600;color:#111}
  .step-desc{font-size:14px;color:#555;padding:0 20px 14px;line-height:1.7}
  .step-img{width:100%;display:block;border-top:1px solid #f0f0f0}
  .step-meta{padding:8px 20px;font-size:11px;color:#bbb;border-top:1px solid #f5f5f5}
  .step-meta a{color:#bbb;text-decoration:none}
</style>
</head>
<body>
<h1>${escapeHtml(tutorial.title)}</h1>
${tutorial.description ? `<p class="tutorial-desc">${escapeHtml(tutorial.description)}</p>` : ''}
${steps.join('')}
</body></html>`

    downloadText(`${slugify(tutorial.title)}.html`, html, 'text/html')
    setExporting(null)
  }

  // Export as PDF with proper image aspect ratio and clean layout
  async function exportPDF() {
    setExporting('PDF')
    const { jsPDF } = await import('jspdf')
    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
    const pageW = pdf.internal.pageSize.getWidth()   // 210
    const pageH = pdf.internal.pageSize.getHeight()  // 297
    const margin = 16
    const contentW = pageW - margin * 2              // 178

    // Cover: title
    pdf.setFontSize(24)
    pdf.setTextColor(17, 17, 17)
    pdf.text(tutorial.title, margin, 26)

    if (tutorial.description) {
      pdf.setFontSize(11)
      pdf.setTextColor(100, 100, 100)
      pdf.text(pdf.splitTextToSize(tutorial.description, contentW), margin, 36)
    }

    // Divider line
    pdf.setDrawColor(230, 230, 230)
    pdf.line(margin, 44, pageW - margin, 44)

    let y = 52

    for (let i = 0; i < tutorial.steps.length; i++) {
      const step = tutorial.steps[i]
      const { dataUrl, width: imgPxW, height: imgPxH } = await renderStepImage(step)

      // Compute image height in mm preserving aspect ratio
      const imgMmH = Math.round((imgPxH / imgPxW) * contentW)

      // Estimate text block height (badge + title + optional desc)
      const titleLines = pdf.splitTextToSize(step.title, contentW - 30)
      const descLines = step.description ? pdf.splitTextToSize(step.description, contentW) : []
      const textBlockH = 8 + titleLines.length * 6 + (descLines.length ? descLines.length * 5 + 3 : 0) + 6
      const totalH = textBlockH + imgMmH + 8

      // Page break if needed
      if (y + totalH > pageH - margin) {
        pdf.addPage()
        y = margin + 8
      }

      // Step badge
      pdf.setFillColor(79, 70, 229)
      pdf.roundedRect(margin, y, 24, 6.5, 2, 2, 'F')
      pdf.setFontSize(8)
      pdf.setTextColor(255, 255, 255)
      pdf.text(`Passo ${i + 1}`, margin + 2.5, y + 4.4)
      y += 10

      // Title
      pdf.setFontSize(13)
      pdf.setTextColor(17, 17, 17)
      pdf.text(titleLines, margin, y)
      y += titleLines.length * 6 + 2

      // Description
      if (descLines.length) {
        pdf.setFontSize(9.5)
        pdf.setTextColor(90, 90, 90)
        pdf.text(descLines, margin, y)
        y += descLines.length * 5 + 3
      }

      // Page break before image if it doesn't fit
      if (y + imgMmH > pageH - margin) {
        pdf.addPage()
        y = margin
      }

      // Image with border
      pdf.setDrawColor(220, 220, 220)
      pdf.roundedRect(margin, y, contentW, imgMmH, 2, 2, 'S')
      pdf.addImage(dataUrl, 'PNG', margin, y, contentW, imgMmH)
      y += imgMmH + 14

      // Thin separator between steps
      if (i < tutorial.steps.length - 1 && y < pageH - margin - 10) {
        pdf.setDrawColor(240, 240, 240)
        pdf.line(margin, y - 6, pageW - margin, y - 6)
      }
    }

    pdf.save(`${slugify(tutorial.title)}.pdf`)
    setExporting(null)
  }

  return (
    <div style={styles.container}>
      <div style={styles.label}>Exportar tutorial</div>

      <button style={styles.toggleRow} onClick={() => setIncludeUrl(v => !v)}>
        <span style={styles.toggleLabel}>Incluir URL dos passos</span>
        <div style={{ ...styles.track, background: includeUrl ? '#4f46e5' : '#2a2a2a' }}>
          <div style={{ ...styles.thumb, transform: includeUrl ? 'translateX(14px)' : 'translateX(2px)' }} />
        </div>
      </button>

      <div style={styles.buttons}>
        <button style={styles.btn} onClick={exportMarkdown} disabled={!!exporting} title="ZIP com .md + imagens">
          {exporting === 'MD' ? '...' : 'MD'}
        </button>
        <button style={styles.btn} onClick={exportHTML} disabled={!!exporting} title="HTML auto-contido">
          {exporting === 'HTML' ? '...' : 'HTML'}
        </button>
        <button style={styles.btn} onClick={exportPDF} disabled={!!exporting} title="PDF com layout limpo">
          {exporting === 'PDF' ? '...' : 'PDF'}
        </button>
      </div>
      {exporting && <div style={styles.loading}>Gerando {exporting}…</div>}
    </div>
  )
}

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'tutorial'
}

function escapeHtml(str: string) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function safeUrl(url: string): string {
  try {
    const { protocol } = new URL(url)
    return protocol === 'http:' || protocol === 'https:' ? url : '#'
  } catch {
    return '#'
  }
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function downloadText(filename: string, content: string, mime: string) {
  downloadBlob(filename, new Blob([content], { type: mime }))
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '11px', fontWeight: '600', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' },
  toggleRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 0', width: '100%',
  },
  toggleLabel: { fontSize: '12px', color: '#999' },
  track: { width: '32px', height: '18px', borderRadius: '9px', flexShrink: 0, position: 'relative', transition: 'background 0.2s' },
  thumb: { position: 'absolute', top: '2px', width: '14px', height: '14px', borderRadius: '50%', background: '#fff', transition: 'transform 0.2s' },
  buttons: { display: 'flex', gap: '6px' },
  btn: { flex: 1, background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#ccc', borderRadius: '6px', padding: '6px 0', fontSize: '11px', fontWeight: '600', cursor: 'pointer', letterSpacing: '0.05em' },
  loading: { fontSize: '11px', color: '#666', textAlign: 'center' },
}
