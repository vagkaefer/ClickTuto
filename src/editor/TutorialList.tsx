import { useEffect, useState } from 'react'
import { getAllTutorials, deleteTutorial } from '../shared/storage'
import type { Tutorial } from '../shared/types'

export function TutorialList() {
  const [tutorials, setTutorials] = useState<Tutorial[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    getAllTutorials().then(all => {
      setTutorials(all.slice().reverse())
      setLoading(false)
    })
  }, [])

  function openEditor(id: string) {
    location.href = `editor.html?tutorial=${id}`
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    await deleteTutorial(id)
    setTutorials(prev => prev.filter(t => t.id !== id))
    setConfirmId(null)
    setDeleting(null)
  }

  function formatDate(ts: number) {
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(ts))
  }

  function estimateSize(t: Tutorial) {
    // Each screenshot is base64 — rough estimate from string length
    const bytes = t.steps.reduce((acc, s) => acc + s.screenshot.length * 0.75, 0)
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  if (loading) {
    return (
      <div style={styles.center}>
        <div style={styles.spinner} />
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.logo}>
          <img src={chrome.runtime.getURL('icons/icon.svg')} width="28" height="28" alt="ClickTuto" />
          <span>ClickTuto</span>
        </div>
        <div style={styles.headerMeta}>
          {tutorials.length} tutorial{tutorials.length !== 1 ? 's' : ''}
        </div>
      </header>

      <main style={styles.main}>
        {tutorials.length === 0 ? (
          <div style={styles.empty}>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#2a2a2a" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
            <p style={styles.emptyTitle}>Nenhum tutorial ainda</p>
            <p style={styles.emptyDesc}>Inicie uma gravação pela extensão para criar seu primeiro tutorial.</p>
          </div>
        ) : (
          <div style={styles.grid}>
            {tutorials.map(t => (
              <div key={t.id} style={styles.card}>
                {/* Thumbnail strip */}
                <div style={styles.thumbStrip} onClick={() => openEditor(t.id)}>
                  {t.steps.slice(0, 3).map((step, i) => (
                    <div key={step.id} style={{ ...styles.thumb, zIndex: 3 - i, marginLeft: i > 0 ? '-18px' : '0' }}>
                      <img src={step.screenshot} style={styles.thumbImg} alt="" />
                    </div>
                  ))}
                  {t.steps.length === 0 && (
                    <div style={{ ...styles.thumb, background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                      </svg>
                    </div>
                  )}
                  <div style={styles.stepCount}>{t.steps.length} passo{t.steps.length !== 1 ? 's' : ''}</div>
                </div>

                {/* Card body */}
                <div style={styles.cardBody}>
                  <div style={styles.cardTitle} onClick={() => openEditor(t.id)}>{t.title || 'Sem título'}</div>
                  <div style={styles.cardMeta}>
                    <span>{formatDate(t.updatedAt)}</span>
                    <span style={styles.dot}>·</span>
                    <span>{estimateSize(t)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div style={styles.cardActions}>
                  <button style={styles.editBtn} onClick={() => openEditor(t.id)}>
                    Editar
                  </button>
                  {confirmId === t.id ? (
                    <div style={styles.confirmRow}>
                      <span style={styles.confirmText}>Tem certeza?</span>
                      <button
                        style={styles.confirmYes}
                        onClick={() => handleDelete(t.id)}
                        disabled={deleting === t.id}
                      >
                        {deleting === t.id ? '...' : 'Deletar'}
                      </button>
                      <button style={styles.confirmNo} onClick={() => setConfirmId(null)}>Cancelar</button>
                    </div>
                  ) : (
                    <button style={styles.deleteBtn} onClick={() => setConfirmId(t.id)} title="Deletar tutorial">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4h6v2" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#0a0a0a', color: '#f0f0f0', fontFamily: 'system-ui, sans-serif' },

  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 28px', borderBottom: '1px solid #1a1a1a', position: 'sticky', top: 0,
    background: '#0a0a0a', zIndex: 10,
  },
  logo: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '17px', fontWeight: '700', color: '#f0f0f0' },
  headerMeta: { fontSize: '13px', color: '#555' },

  main: { padding: '32px 28px', maxWidth: '1100px', margin: '0 auto' },

  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' },
  spinner: { width: '28px', height: '28px', border: '3px solid #222', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 0.7s linear infinite' },

  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', paddingTop: '80px', textAlign: 'center' },
  emptyTitle: { fontSize: '18px', fontWeight: '600', color: '#333' },
  emptyDesc: { fontSize: '14px', color: '#444', maxWidth: '320px', lineHeight: '1.6' },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' },

  card: {
    background: '#111', border: '1px solid #1e1e1e', borderRadius: '12px',
    overflow: 'hidden', display: 'flex', flexDirection: 'column',
    transition: 'border-color 0.15s',
  },

  thumbStrip: {
    display: 'flex', alignItems: 'flex-end', padding: '16px 16px 0',
    cursor: 'pointer', position: 'relative', minHeight: '80px',
  },
  thumb: {
    width: '72px', height: '52px', borderRadius: '6px', overflow: 'hidden',
    border: '2px solid #0a0a0a', flexShrink: 0, position: 'relative',
  },
  thumbImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  stepCount: {
    marginLeft: 'auto', fontSize: '11px', color: '#555',
    background: '#1a1a1a', borderRadius: '20px', padding: '2px 8px',
    alignSelf: 'flex-end', marginBottom: '2px',
  },

  cardBody: { padding: '12px 16px 8px', flex: 1 },
  cardTitle: { fontSize: '15px', fontWeight: '600', color: '#f0f0f0', cursor: 'pointer', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  cardMeta: { fontSize: '11px', color: '#444', display: 'flex', gap: '4px', alignItems: 'center' },
  dot: { color: '#333' },

  cardActions: {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '10px 16px', borderTop: '1px solid #1a1a1a',
  },
  editBtn: {
    flex: 1, background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#ccc',
    borderRadius: '6px', padding: '6px 0', fontSize: '12px', fontWeight: '600',
    cursor: 'pointer',
  },
  deleteBtn: {
    background: 'transparent', border: '1px solid #2a2a2a', color: '#555',
    borderRadius: '6px', padding: '6px 8px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  confirmRow: { display: 'flex', alignItems: 'center', gap: '6px', flex: 1 },
  confirmText: { fontSize: '11px', color: '#f87171', flex: 1 },
  confirmYes: {
    background: '#7f1d1d', border: 'none', color: '#fca5a5',
    borderRadius: '6px', padding: '5px 10px', fontSize: '11px', fontWeight: '600', cursor: 'pointer',
  },
  confirmNo: {
    background: 'transparent', border: '1px solid #2a2a2a', color: '#666',
    borderRadius: '6px', padding: '5px 10px', fontSize: '11px', cursor: 'pointer',
  },
}
