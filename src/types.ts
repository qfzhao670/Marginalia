export type ReadStatus = 'unread' | 'read'

export type Annotation = {
  id: string
  type: 'note' | 'highlight'
  text: string
  note?: string
  anchor?: string
  color?: 'clay' | 'gold'
  upgraded?: boolean
  createdAt: string
}

export type BrowserHighlightPayload = {
  text: string
  anchor?: string
}

export type BrowserPageScrollPayload = {
  highlightId: string
  occurredAt: number
}

export type BrowserConnectorTarget = {
  id: string
  label: string
  targetY: number
  upgraded?: boolean
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

export type AiConversation = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messages: AiMessage[]
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
  aiConversations?: AiConversation[]
  /** Legacy single-thread storage, migrated when conversations are next changed. */
  aiThread?: AiMessage[]
}

export type TrashedBookmark = Bookmark & {
  deletedAt: string
}

export type AppStore = {
  bookmarks: Bookmark[]
  trash: TrashedBookmark[]
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
