export interface ElementFingerprint {
  tag: string
  domPathHash: string
  textSnippet: string
  boundingBox: { x: number; y: number; width: number; height: number }
  dataProtozoanId?: string
}

export interface Annotation {
  id: string
  fingerprint: ElementFingerprint
  comment: string
  filePath?: string
  resolved: boolean
  createdAt: string
  updatedAt: string
}

export interface ProtozoanMessage {
  type: ProtozoanMessageType
  payload: unknown
}

export type ProtozoanMessageType =
  | 'annotation:save'
  | 'annotation:list'
  | 'annotation:list:response'
  | 'annotation:resolve'
  | 'ai:chat'
  | 'ai:chat:response'
  | 'ai:patch:applied'
  | 'error'

export interface AiChatPayload {
  message: string
  currentUrl: string
  selectedFingerprint?: ElementFingerprint
}

export interface AiChatResponsePayload {
  reply: string
  diff?: string
  applied?: boolean
}

export interface AnnotationSavePayload {
  fingerprint: ElementFingerprint
  comment: string
  filePath?: string
}
