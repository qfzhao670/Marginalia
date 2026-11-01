export type ReadStatus = 'unread' | 'read'

export type Annotation = {
  id: string
  type: 'note' | 'highlight'
  text: string
  color?: 'clay' | 'gold'
  createdAt: string
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
