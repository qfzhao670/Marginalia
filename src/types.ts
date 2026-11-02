export type ReadStatus = 'unread' | 'read'

export type Annotation = {
  id: string
  type: 'note' | 'highlight'
  text: string
  note?: string
  anchor?: string
  color?: 'clay' | 'gold'
  createdAt: string
}

export type BrowserHighlightPayload = {
  text: string
  anchor?: string
}

export type BrowserConnectorTarget = {
  id: string
  label: string
  targetY: number
}

export type AiMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  context?: {
    kind: 'page' | 'selection'
    excerpt?: string
  }
}

export type AiConfig = {
  baseUrl: string
  model: string
  hasApiKey: boolean
}

export type Bookmark = {
  id: string
  url: string
  title: string
  domain: string
  description: string
  image: string
  tags: string[]
  savedAt: string
  readStatus: ReadStatus
  starred: boolean
  progress: number
  contentText: string
  offlinePath?: string
  annotations: Annotation[]
  aiThread?: AiMessage[]
}

export type AppStore = {
  bookmarks: Bookmark[]
  tags: string[]
}

export type PageMetadata = {
  url: string
  title: string
  domain: string
  description: string
  image: string
  contentText: string
}

export type BrowserState = {
  url: string
  title: string
  canGoBack: boolean
  canGoForward: boolean
  loading: boolean
}

export type ViewBounds = { x: number; y: number; width: number; height: number }
