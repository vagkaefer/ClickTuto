import { useEffect, useRef, useState } from 'react'
import type { TutorialStep } from '../shared/types'

interface Props {
  step: TutorialStep
  onChange: (step: TutorialStep) => void
}

const DEBOUNCE_MS = 3000

export function StepForm({ step, onChange }: Props) {
  const [title, setTitle] = useState(step.title)
  const [description, setDescription] = useState(step.description)
  const [saving, setSaving] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onChangeRef = useRef(onChange)
  const stepRef = useRef(step)

  useEffect(() => { onChangeRef.current = onChange }, [onChange])

  // Sync local fields when the selected step switches
  useEffect(() => {
    setTitle(step.title)
    setDescription(step.description)
    stepRef.current = step
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    setSaving(false)
  }, [step.id]) // eslint-disable-line react-hooks/exhaustive-deps

  function schedule(nextTitle: string, nextDesc: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setSaving(true)
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null
      onChangeRef.current({ ...stepRef.current, title: nextTitle, description: nextDesc })
      setSaving(false)
    }, DEBOUNCE_MS)
  }

  // Flush immediately when the user moves focus away — don't lose the last edit
  function flush(nextTitle: string, nextDesc: string) {
    if (!debounceRef.current) return
    clearTimeout(debounceRef.current)
    debounceRef.current = null
    onChangeRef.current({ ...stepRef.current, title: nextTitle, description: nextDesc })
    setSaving(false)
  }

  return (
    <div style={styles.container}>
      <div style={styles.section}>
        <label style={styles.label}>Título do passo</label>
        <input
          style={styles.input}
          value={title}
          onChange={e => { setTitle(e.target.value); schedule(e.target.value, description) }}
          onBlur={e => flush(e.target.value, description)}
          placeholder="Ex: Clique no botão Salvar"
        />
      </div>

      <div style={styles.section}>
        <div style={styles.labelRow}>
          <label style={styles.label}>Descrição</label>
          {saving && (
            <span style={styles.savingBadge}>
              <span style={styles.spinner} />
              salvando...
            </span>
          )}
        </div>
        <textarea
          style={styles.textarea}
          value={description}
          onChange={e => { setDescription(e.target.value); schedule(title, e.target.value) }}
          onBlur={e => flush(title, e.target.value)}
          placeholder="Explique o que o usuário deve fazer neste passo..."
          rows={4}
        />
      </div>

      {step.target && (
        <div style={styles.section}>
          <label style={styles.label}>Elemento clicado</label>
          <div style={styles.meta}>
            <div style={styles.metaRow}>
              <span style={styles.metaKey}>Tag</span>
              <code style={styles.metaVal}>{step.target.tagName}</code>
            </div>
            {step.target.text && (
              <div style={styles.metaRow}>
                <span style={styles.metaKey}>Texto</span>
                <code style={styles.metaVal}>{step.target.text.slice(0, 30)}</code>
              </div>
            )}
            {step.target.href && (
              <div style={styles.metaRow}>
                <span style={styles.metaKey}>Link</span>
                <code style={styles.metaVal}>{step.target.href.slice(0, 30)}…</code>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={styles.section}>
        <label style={styles.label}>URL</label>
        <div style={styles.urlChip}>{step.url}</div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '16px', display: 'flex', flexDirection: 'column', gap: '18px' },
  section: { display: 'flex', flexDirection: 'column', gap: '6px' },
  labelRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: '11px', fontWeight: '600', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' },
  savingBadge: { display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: '#555' },
  spinner: {
    display: 'inline-block', width: '10px', height: '10px',
    border: '1.5px solid #333', borderTopColor: '#4f46e5',
    borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0,
  },
  input: {
    background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '6px',
    color: '#f0f0f0', fontSize: '13px', padding: '8px 10px', outline: 'none', width: '100%',
  },
  textarea: {
    background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '6px',
    color: '#f0f0f0', fontSize: '13px', padding: '8px 10px', outline: 'none',
    width: '100%', resize: 'vertical', fontFamily: 'inherit',
  },
  meta: { background: '#1a1a1a', borderRadius: '6px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px' },
  metaRow: { display: 'flex', gap: '8px', fontSize: '12px' },
  metaKey: { color: '#666', width: '36px', flexShrink: 0 },
  metaVal: { color: '#a78bfa', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  urlChip: {
    background: '#1a1a1a', borderRadius: '6px', padding: '6px 8px',
    fontSize: '11px', color: '#555', overflow: 'hidden', textOverflow: 'ellipsis',
    whiteSpace: 'nowrap', fontFamily: 'monospace',
  },
}
