import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { RecordingState, RecordingOptions, Tutorial } from '../shared/types'
import { getAllTutorials } from '../shared/storage'

function Popup() {
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    currentTutorialId: null,
    stepCount: 0,
    options: { showHighlight: true, showClickDot: false },
  })
  const [tutorials, setTutorials] = useState<Tutorial[]>([])

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_RECORDING_STATE' }, s => {
      if (s) setState(s)
    })
    getAllTutorials().then(setTutorials)
  }, [])

  // MV3 service workers sleep after ~30s of inactivity. Send a no-op ping
  // first to wake the worker, wait for it to be ready, then send the real message.
  async function sendMessage(msg: object): Promise<unknown> {
    // Wake the worker — GET_RECORDING_STATE is idempotent and always safe
    try { await chrome.runtime.sendMessage({ type: 'GET_RECORDING_STATE' }) } catch (_) {}
    return chrome.runtime.sendMessage(msg)
  }

  async function handleStart() {
    const res = await sendMessage({ type: 'START_RECORDING' }) as { tutorialId?: string } | undefined
    if (res?.tutorialId) {
      setState(s => ({ ...s, isRecording: true, currentTutorialId: res.tutorialId!, stepCount: 0 }))
      window.close()
    }
  }

  async function handleStop() {
    const res = await sendMessage({ type: 'STOP_RECORDING' }) as { tutorialId?: string } | undefined
    const tutorialId = res?.tutorialId
    if (tutorialId) await sendMessage({ type: 'OPEN_EDITOR', payload: { tutorialId } })
    window.close()
  }

  async function handleOpenEditor(tutorialId: string) {
    await sendMessage({ type: 'OPEN_EDITOR', payload: { tutorialId } })
    window.close()
  }

  async function toggleOption(key: keyof RecordingOptions) {
    const updated: RecordingOptions = { ...state.options, [key]: !state.options[key] }
    setState(s => ({ ...s, options: updated }))
    await chrome.runtime.sendMessage({ type: 'UPDATE_RECORDING_OPTIONS', payload: updated })
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.logo}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2">
            <path d="M15 15l-2 5L9 9l11 4-5 2z" />
          </svg>
          <span>Click-Tuto</span>
        </div>
      </header>

      <div style={styles.body}>
        {state.isRecording ? (
          <div style={styles.recording}>
            <div style={styles.recordingDot} />
            <div>
              <div style={styles.recordingLabel}>Gravando...</div>
              <div style={styles.recordingCount}>{state.stepCount} passos capturados</div>
            </div>
            <button style={styles.stopBtn} onClick={handleStop}>Parar & Editar</button>
          </div>
        ) : (
          <button style={styles.startBtn} onClick={handleStart}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" fill="currentColor" />
            </svg>
            Iniciar Gravação
          </button>
        )}

        {/* Recording options — always visible */}
        <div style={styles.optionsBox}>
          <div style={styles.optionsTitle}>Opções de gravação</div>
          <Switch
            label="Destacar elemento"
            description="Borda azul ao passar o mouse"
            checked={state.options.showHighlight}
            onChange={() => toggleOption('showHighlight')}
          />
          <Switch
            label="Círculo no clique"
            description="Ripple vermelho onde você clicou"
            checked={state.options.showClickDot}
            onChange={() => toggleOption('showClickDot')}
          />
        </div>

        {tutorials.length > 0 && (
          <div style={styles.tutorialList}>
            <div style={styles.listTitle}>Tutoriais salvos</div>
            {tutorials.slice().reverse().slice(0, 5).map(t => (
              <button key={t.id} style={styles.tutorialItem} onClick={() => handleOpenEditor(t.id)}>
                <span style={styles.tutorialName}>{t.title}</span>
                <span style={styles.tutorialMeta}>{t.steps.length} passos</span>
              </button>
            ))}
            {tutorials.length > 5 && (
              <button style={styles.verTodosBtn} onClick={() => {
                chrome.tabs.create({ url: chrome.runtime.getURL('editor.html') })
                window.close()
              }}>
                Ver todos ({tutorials.length})
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

interface SwitchProps {
  label: string
  description: string
  checked: boolean
  onChange: () => void
}

function Switch({ label, description, checked, onChange }: SwitchProps) {
  return (
    <button style={styles.switchRow} onClick={onChange}>
      <div style={styles.switchText}>
        <span style={styles.switchLabel}>{label}</span>
        <span style={styles.switchDesc}>{description}</span>
      </div>
      <div style={{ ...styles.switchTrack, background: checked ? '#4f46e5' : '#333' }}>
        <div style={{ ...styles.switchThumb, transform: checked ? 'translateX(16px)' : 'translateX(2px)' }} />
      </div>
    </button>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', minHeight: '100px' },
  header: { padding: '14px 16px', borderBottom: '1px solid #222' },
  logo: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: '600', color: '#f0f0f0' },
  body: { padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' },

  startBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px',
    padding: '10px 16px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', width: '100%',
  },

  recording: {
    display: 'flex', alignItems: 'center', gap: '10px',
    background: '#1a1a1a', borderRadius: '8px', padding: '10px 12px',
  },
  recordingDot: {
    width: '10px', height: '10px', borderRadius: '50%', background: '#ff4444',
    flexShrink: 0, animation: 'pulse 1s infinite',
  },
  recordingLabel: { fontSize: '13px', fontWeight: '600', color: '#f0f0f0' },
  recordingCount: { fontSize: '11px', color: '#888', marginTop: '1px' },
  stopBtn: {
    marginLeft: 'auto', background: '#4f46e5', color: '#fff', border: 'none',
    borderRadius: '6px', padding: '6px 10px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap',
  },

  optionsBox: {
    background: '#141414', borderRadius: '8px', border: '1px solid #222',
    padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '2px',
  },
  optionsTitle: { fontSize: '10px', fontWeight: '600', color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' },

  switchRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px 0',
    width: '100%', gap: '12px',
  },
  switchText: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '1px' },
  switchLabel: { fontSize: '13px', color: '#e0e0e0', fontWeight: '500' },
  switchDesc: { fontSize: '11px', color: '#555' },
  switchTrack: {
    width: '36px', height: '20px', borderRadius: '10px', flexShrink: 0,
    position: 'relative', transition: 'background 0.2s',
  },
  switchThumb: {
    position: 'absolute', top: '2px', width: '16px', height: '16px',
    borderRadius: '50%', background: '#fff', transition: 'transform 0.2s',
  },

  tutorialList: { display: 'flex', flexDirection: 'column', gap: '4px' },
  listTitle: { fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' },
  tutorialItem: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: '#1a1a1a', border: 'none', borderRadius: '6px', padding: '8px 10px',
    cursor: 'pointer', width: '100%', color: '#f0f0f0', textAlign: 'left',
  },
  tutorialName: { fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' },
  tutorialMeta: { fontSize: '11px', color: '#666', flexShrink: 0 },
  verTodosBtn: {
    background: 'transparent', border: '1px solid #2a2a2a', color: '#555',
    borderRadius: '6px', padding: '7px 0', fontSize: '12px', cursor: 'pointer',
    width: '100%', marginTop: '2px',
  },
}

const root = createRoot(document.getElementById('root')!)
root.render(<Popup />)
