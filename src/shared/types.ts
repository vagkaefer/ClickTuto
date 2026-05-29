export type AnnotationType = 'arrow' | 'blur' | 'text' | 'highlight' | 'circle'

export interface ArrowAnnotation {
  type: 'arrow'
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
  strokeWidth: number
}

export interface BlurAnnotation {
  type: 'blur'
  id: string
  x: number
  y: number
  width: number
  height: number
  intensity: number
}

export interface TextAnnotation {
  type: 'text'
  id: string
  x: number
  y: number
  text: string
  fontSize: number
  color: string
  bgColor: string
}

export interface HighlightAnnotation {
  type: 'highlight'
  id: string
  x: number
  y: number
  width: number
  height: number
  color: string
  opacity: number
}

export interface CircleAnnotation {
  type: 'circle'
  id: string
  x: number
  y: number
  radius: number
  color: string
  strokeWidth: number
}

export type Annotation =
  | ArrowAnnotation
  | BlurAnnotation
  | TextAnnotation
  | HighlightAnnotation
  | CircleAnnotation

export interface ClickTarget {
  selector: string
  tagName: string
  text: string
  href?: string
  x: number
  y: number
  width: number
  height: number
}

export interface TutorialStep {
  id: string
  order: number
  screenshot: string
  annotations: Annotation[]
  title: string
  description: string
  target?: ClickTarget
  url: string
  pageTitle: string
  timestamp: number
}

export interface Tutorial {
  id: string
  title: string
  description: string
  steps: TutorialStep[]
  createdAt: number
  updatedAt: number
}

export type MessageType =
  | 'START_RECORDING'
  | 'STOP_RECORDING'
  | 'STEP_CAPTURED'
  | 'GET_RECORDING_STATE'
  | 'OPEN_EDITOR'
  | 'CAPTURE_SCREENSHOT'
  | 'UPDATE_RECORDING_OPTIONS'

export interface Message {
  type: MessageType
  payload?: unknown
}

export interface RecordingOptions {
  showHighlight: boolean
  showClickDot: boolean
}

export interface RecordingState {
  isRecording: boolean
  currentTutorialId: string | null
  stepCount: number
  options: RecordingOptions
}
