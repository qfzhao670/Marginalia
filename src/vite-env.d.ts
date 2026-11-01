/// <reference types="vite/client" />

import type { AppStore, BrowserState, PageMetadata, ViewBounds } from './types'

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
        action: (action: string, payload?: string) => Promise<unknown>
        onState: (callback: (state: BrowserState) => void) => () => void
        onProgress: (callback: (progress: number) => void) => () => void
        onHighlight: (callback: (text: string) => void) => () => void
      }
      offline: {
        save: (id: string, url: string) => Promise<{ path: string }>
      }
    }
  }
}

export {}
