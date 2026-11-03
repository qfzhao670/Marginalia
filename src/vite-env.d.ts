/// <reference types="vite/client" />

import type { AiConfig, AiConversation, AppStore, BrowserConnectorTarget, BrowserHighlightPayload, BrowserPageScrollPayload, BrowserState, PageMetadata, ViewBounds } from './types'

declare global {
  interface Window {
    marginalia: {
      store: {
        get: () => Promise<AppStore>
        set: (store: AppStore) => Promise<{ ok: boolean }>
      }
      metadata: {
        fetch: (url: string) => Promise<PageMetadata>
      }
      browser: {
        open: (url: string, bounds: ViewBounds) => Promise<BrowserState>
        resize: (bounds: ViewBounds) => Promise<void>
        hide: () => Promise<void>
        highlights: (items: Array<{ id: string; text: string; anchor?: string }>) => Promise<number>
        connectors: (items: BrowserConnectorTarget[]) => Promise<boolean>
        aiConversations: (conversations: AiConversation[]) => Promise<boolean>
        action: (action: string, payload?: string) => Promise<unknown>
        onState: (callback: (state: BrowserState) => void) => () => void
        onProgress: (callback: (progress: number) => void) => () => void
        onHighlight: (callback: (highlight: BrowserHighlightPayload) => void) => () => void
        onPageScroll: (callback: (scroll: BrowserPageScrollPayload) => void) => () => void
        onAiConversationsChange: (callback: (conversations: AiConversation[]) => void) => () => void
        onAiReady: (callback: () => void) => () => void
      }
      ai: {
        getConfig: () => Promise<AiConfig>
        revealKey: () => Promise<{ apiKey: string }>
        setConfig: (config: { baseUrl: string; model: string; apiKey?: string }) => Promise<AiConfig>
      }
      clipboard: {
        readText: () => Promise<string>
      }
      offline: {
        save: (id: string, url: string) => Promise<{ path: string }>
        remove: (id: string) => Promise<{ ok: boolean }>
      }
    }
  }
}

export {}
