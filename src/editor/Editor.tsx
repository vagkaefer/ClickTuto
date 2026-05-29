import { useEffect, useState, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import { getTutorial, saveTutorial } from '../shared/storage'
import type { Tutorial, TutorialStep } from '../shared/types'
import { StepList } from './StepList'
import { ImageCanvas } from './ImageCanvas'
import { StepForm } from './StepForm'
import { ExportPanel } from './ExportPanel'
import { TutorialList } from './TutorialList'

// Route: no ?tutorial= param → show list; with param → show editor
const tutorialId = new URLSearchParams(location.search).get('tutorial')

function App() {
  if (!tutorialId) return <TutorialList />
  return <Editor tutorialId={tutorialId} />
}

function Editor({ tutorialId }: { tutorialId: string }) {
  const [tutorial, setTutorial] = useState<Tutorial | null>(null)
  const [selectedStep, setSelectedStep] = useState<TutorialStep | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getTutorial(tutorialId).then(t => {
      setTutorial(t)
      if (t?.steps.length) setSelectedStep(t.steps[0])
    })
  }, [tutorialId])

  const updateTutorial = useCallback(async (updated: Tutorial) => {
    setSaving(true)
    setTutorial(updated)
    const sel = updated.steps.find(s => s.id === selectedStep?.id) ?? null
    setSelectedStep(sel)
    await saveTutorial(updated)
    setSaving(false)
  }, [selectedStep?.id])

  const updateStep = useCallback((updatedStep: TutorialStep) => {
    if (!tutorial) return
    const steps = tutorial.steps.map(s => s.id === updatedStep.id ? updatedStep : s)
    updateTutorial({ ...tutorial, steps, updatedAt: Date.now() })
  }, [tutorial, updateTutorial])

  if (!tutorial) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#666', fontFamily: 'system-ui, sans-serif' }}>
        Carregando tutorial...
      </div>
    )
  }

  return (
    <div style={styles.layout}>
      {/* Left sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <button style={styles.backBtn} onClick={() => { location.href = 'editor.html' }} title="Todos os tutoriais">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Tutoriais
          </button>
          <input
            style={styles.titleInput}
            value={tutorial.title}
            onChange={e => updateTutorial({ ...tutorial, title: e.target.value, updatedAt: Date.now() })}
            placeholder="Nome do tutorial"
          />
          {saving && <span style={styles.savingBadge}>salvando...</span>}
        </div>
        <StepList
          steps={tutorial.steps}
          selectedId={selectedStep?.id ?? null}
          onSelect={step => setSelectedStep(step)}
          onReorder={steps => updateTutorial({ ...tutorial, steps, updatedAt: Date.now() })}
          onDelete={stepId => {
            const steps = tutorial.steps.filter(s => s.id !== stepId)
            const reordered = steps.map((s, i) => ({ ...s, order: i }))
            updateTutorial({ ...tutorial, steps: reordered, updatedAt: Date.now() })
          }}
        />
        <div style={styles.sidebarFooter}>
          <ExportPanel tutorial={tutorial} />
        </div>
      </aside>

      {/* Center — canvas */}
      <main style={styles.main}>
        {selectedStep ? (
          <ImageCanvas step={selectedStep} onChange={updateStep} />
        ) : (
          <div style={styles.empty}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 21V9" />
            </svg>
            <p>Selecione um passo para editar</p>
          </div>
        )}
      </main>

      {/* Right sidebar */}
      <aside style={styles.rightSidebar}>
        {selectedStep && <StepForm step={selectedStep} onChange={updateStep} />}
      </aside>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  layout: {
    display: 'grid',
    gridTemplateColumns: '220px 1fr 280px',
    height: '100vh',
    overflow: 'hidden',
  },
  sidebar: {
    background: '#111',
    borderRight: '1px solid #1e1e1e',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  sidebarHeader: {
    padding: '10px 12px',
    borderBottom: '1px solid #1e1e1e',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  backBtn: {
    display: 'flex', alignItems: 'center', gap: '4px',
    background: 'transparent', border: 'none', color: '#555',
    fontSize: '12px', cursor: 'pointer', padding: '2px 0',
    width: 'fit-content',
  },
  titleInput: {
    background: 'transparent',
    border: '1px solid #2a2a2a',
    borderRadius: '6px',
    color: '#f0f0f0',
    fontSize: '13px',
    padding: '6px 8px',
    width: '100%',
    outline: 'none',
  },
  savingBadge: { fontSize: '10px', color: '#666' },
  sidebarFooter: {
    padding: '12px',
    borderTop: '1px solid #1e1e1e',
    marginTop: 'auto',
  },
  main: {
    background: '#0a0a0a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'auto',
    position: 'relative',
  },
  empty: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: '16px', color: '#444', fontSize: '14px',
  },
  rightSidebar: {
    background: '#111',
    borderLeft: '1px solid #1e1e1e',
    overflow: 'auto',
  },
}

const root = createRoot(document.getElementById('root')!)
root.render(<App />)
