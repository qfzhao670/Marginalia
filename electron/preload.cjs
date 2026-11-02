const { contextBridge, ipcRenderer } = require('electron')

const subscribe = (channel, callback) => {
  const handler = (_event, payload) => callback(payload)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}

contextBridge.exposeInMainWorld('marginalia', {
  store: {
    get: () => ipcRenderer.invoke('store:get'),
    set: (store) => ipcRenderer.invoke('store:set', store),
  },
  metadata: {
    fetch: (url) => ipcRenderer.invoke('metadata:fetch', url),
  },
  browser: {
    open: (url, bounds) => ipcRenderer.invoke('browser:open', { url, bounds }),
    resize: (bounds) => ipcRenderer.invoke('browser:resize', bounds),
    hide: () => ipcRenderer.invoke('browser:hide'),
    highlights: (items) => ipcRenderer.invoke('browser:highlights', items),
    connectors: (items) => ipcRenderer.invoke('browser:connectors', items),
    aiThread: (messages) => ipcRenderer.invoke('browser:ai-thread', messages),
    action: (action, payload) => ipcRenderer.invoke('browser:action', { action, payload }),
    onState: (callback) => subscribe('browser:state', callback),
    onProgress: (callback) => subscribe('browser:progress', callback),
    onHighlight: (callback) => subscribe('browser:highlight', callback),
    onAiExchange: (callback) => subscribe('browser:ai-exchange', callback),
    onAiClear: (callback) => subscribe('browser:ai-clear', callback),
    onAiReady: (callback) => subscribe('browser:ai-ready', callback),
  },
  ai: {
    getConfig: () => ipcRenderer.invoke('ai:config:get'),
    revealKey: () => ipcRenderer.invoke('ai:config:reveal'),
    setConfig: (config) => ipcRenderer.invoke('ai:config:set', config),
  },
  clipboard: {
    readText: () => ipcRenderer.invoke('clipboard:read'),
  },
  offline: {
    save: (id, url) => ipcRenderer.invoke('offline:save', { id, url }),
  },
})
