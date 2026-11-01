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
    action: (action, payload) => ipcRenderer.invoke('browser:action', { action, payload }),
    onState: (callback) => subscribe('browser:state', callback),
    onProgress: (callback) => subscribe('browser:progress', callback),
    onHighlight: (callback) => subscribe('browser:highlight', callback),
  },
  offline: {
    save: (id, url) => ipcRenderer.invoke('offline:save', { id, url }),
  },
})
