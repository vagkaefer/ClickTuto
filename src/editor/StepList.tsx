import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import type { TutorialStep } from '../shared/types'

interface Props {
  steps: TutorialStep[]
  selectedId: string | null
  onSelect: (step: TutorialStep) => void
  onReorder: (steps: TutorialStep[]) => void
  onDelete: (stepId: string) => void
}

export function StepList({ steps, selectedId, onSelect, onReorder, onDelete }: Props) {
  function handleDragEnd(result: DropResult) {
    if (!result.destination) return
    const reordered = Array.from(steps)
    const [moved] = reordered.splice(result.source.index, 1)
    reordered.splice(result.destination.index, 0, moved)
    onReorder(reordered.map((s, i) => ({ ...s, order: i })))
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="steps">
        {provided => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            style={styles.list}
          >
            {steps.map((step, index) => (
              <Draggable key={step.id} draggableId={step.id} index={index}>
                {(drag, snapshot) => (
                  <div
                    ref={drag.innerRef}
                    {...drag.draggableProps}
                    style={{
                      ...styles.item,
                      ...(selectedId === step.id ? styles.selected : {}),
                      ...(snapshot.isDragging ? styles.dragging : {}),
                      ...drag.draggableProps.style,
                    }}
                    onClick={() => onSelect(step)}
                  >
                    <div {...drag.dragHandleProps} style={styles.handle}>
                      <GripIcon />
                    </div>
                    <div style={styles.thumb}>
                      <img
                        src={step.screenshot}
                        style={styles.thumbImg}
                        alt={`Passo ${index + 1}`}
                      />
                      <span style={styles.order}>{index + 1}</span>
                    </div>
                    <div style={styles.info}>
                      <div style={styles.stepTitle}>{step.title || `Passo ${index + 1}`}</div>
                      {step.description && (
                        <div style={styles.stepDesc}>{step.description.slice(0, 40)}…</div>
                      )}
                    </div>
                    <button
                      style={styles.deleteBtn}
                      onClick={e => { e.stopPropagation(); onDelete(step.id) }}
                      title="Remover passo"
                    >
                      ×
                    </button>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  )
}

function GripIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="#444">
      <circle cx="4" cy="3" r="1" /><circle cx="8" cy="3" r="1" />
      <circle cx="4" cy="6" r="1" /><circle cx="8" cy="6" r="1" />
      <circle cx="4" cy="9" r="1" /><circle cx="8" cy="9" r="1" />
    </svg>
  )
}

const styles: Record<string, React.CSSProperties> = {
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 8px',
    borderRadius: '6px',
    cursor: 'pointer',
    background: 'transparent',
    border: '1px solid transparent',
    transition: 'background 0.15s',
  },
  selected: {
    background: '#1a1a2e',
    border: '1px solid #4f46e5',
  },
  dragging: {
    background: '#1e1e2e',
    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
  },
  handle: {
    cursor: 'grab',
    opacity: 0.4,
    flexShrink: 0,
  },
  thumb: {
    position: 'relative',
    width: '40px',
    height: '28px',
    flexShrink: 0,
    borderRadius: '3px',
    overflow: 'hidden',
    background: '#000',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  order: {
    position: 'absolute',
    bottom: '1px',
    right: '2px',
    fontSize: '9px',
    color: '#fff',
    background: 'rgba(0,0,0,0.7)',
    borderRadius: '2px',
    padding: '0 2px',
  },
  info: {
    flex: 1,
    overflow: 'hidden',
  },
  stepTitle: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#e0e0e0',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  stepDesc: {
    fontSize: '10px',
    color: '#666',
    marginTop: '2px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  deleteBtn: {
    background: 'transparent',
    border: 'none',
    color: '#555',
    fontSize: '16px',
    cursor: 'pointer',
    padding: '0 2px',
    lineHeight: 1,
    flexShrink: 0,
  },
}
