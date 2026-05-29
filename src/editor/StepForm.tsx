import type { TutorialStep } from '../shared/types'

interface Props {
  step: TutorialStep
  onChange: (step: TutorialStep) => void
}

export function StepForm({ step, onChange }: Props) {
  return (
    <div style={styles.container}>
      <div style={styles.section}>
        <label style={styles.label}>Título do passo</label>
        <input
          style={styles.input}
          value={step.title}
          onChange={e => onChange({ ...step, title: e.target.value })}
          placeholder="Ex: Clique no botão Salvar"
        />
      </div>

      <div style={styles.section}>
        <label style={styles.label}>Descrição</label>
        <textarea
          style={styles.textarea}
          value={step.description}
          onChange={e => onChange({ ...step, description: e.target.value })}
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
  container: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  input: {
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: '6px',
    color: '#f0f0f0',
    fontSize: '13px',
    padding: '8px 10px',
    outline: 'none',
    width: '100%',
  },
  textarea: {
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: '6px',
    color: '#f0f0f0',
    fontSize: '13px',
    padding: '8px 10px',
    outline: 'none',
    width: '100%',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  meta: {
    background: '#1a1a1a',
    borderRadius: '6px',
    padding: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  metaRow: {
    display: 'flex',
    gap: '8px',
    fontSize: '12px',
  },
  metaKey: {
    color: '#666',
    width: '36px',
    flexShrink: 0,
  },
  metaVal: {
    color: '#a78bfa',
    fontFamily: 'monospace',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  urlChip: {
    background: '#1a1a1a',
    borderRadius: '6px',
    padding: '6px 8px',
    fontSize: '11px',
    color: '#555',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontFamily: 'monospace',
  },
}
