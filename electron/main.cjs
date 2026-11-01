const { app, BrowserWindow, WebContentsView, ipcMain, shell, Menu } = require('electron')
const fs = require('node:fs/promises')
const path = require('node:path')
const { fileURLToPath, pathToFileURL } = require('node:url')

app.setName('Marginalia')

let mainWindow
let pageView
let lastBounds = { x: 0, y: 0, width: 0, height: 0 }
let highlightCssKey
let activeHighlights = []
let activeConnectorTargets = []
let progressTimer

const DEFAULT_STORE = {
  tags: ['设计', '技术', '阅读'],
  bookmarks: [
    {
      id: 'welcome-1',
      url: 'https://sspai.com/',
      title: '少数派：高效工作，品质生活',
      domain: 'sspai.com',
      description: '发现实用的数字工具、工作方法与生活方式。',
      image: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80',
      tags: ['设计', '阅读'],
      savedAt: '2026-10-31T08:20:00.000Z',
      readStatus: 'unread',
      starred: true,
      progress: 0,
      contentText: '数字工具 工作方法 设计 阅读 效率',
      annotations: [],
    },
    {
      id: 'welcome-2',
      url: 'https://developer.mozilla.org/zh-CN/',
      title: 'MDN Web 文档',
      domain: 'developer.mozilla.org',
      description: '面向 Web 开发者的权威学习资源与技术参考。',
      image: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1200&q=80',
      tags: ['技术'],
      savedAt: '2026-10-30T11:10:00.000Z',
      readStatus: 'read',
      starred: false,
      progress: 64,
      contentText: 'HTML CSS JavaScript Web 开发 技术文档',
      annotations: [],
    },
    {
      id: 'welcome-3',
      url: 'https://www.gutenberg.org/',
      title: 'Project Gutenberg：自由电子书',
      domain: 'gutenberg.org',
      description: '阅读和下载数万本免费的经典电子书。',
      image: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1200&q=80',
      tags: ['阅读'],
      savedAt: '2026-10-28T03:45:00.000Z',
      readStatus: 'unread',
      starred: false,
      progress: 0,
      contentText: '经典 电子书 阅读 文学 图书馆',
      annotations: [],
    },
  ],
}

const dataFile = () => path.join(app.getPath('userData'), 'marginalia-data.json')

async function readStore() {
  try {
    return JSON.parse(await fs.readFile(dataFile(), 'utf8'))
  } catch {
    await writeStore(DEFAULT_STORE)
    return DEFAULT_STORE
  }
}

async function writeStore(store) {
  const file = dataFile()
  await fs.mkdir(path.dirname(file), { recursive: true })
  const temporary = `${file}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`
  await fs.writeFile(temporary, JSON.stringify(store, null, 2), 'utf8')
  await fs.rename(temporary, file)
  return { ok: true }
}

function normalizeUrl(value) {
  if (path.isAbsolute(value)) return pathToFileURL(value).toString()
  if (/^file:\/\//i.test(value)) {
    const localPath = fileURLToPath(value)
    const offlineRoot = path.join(app.getPath('userData'), 'offline')
    if (!localPath.startsWith(offlineRoot + path.sep)) throw new Error('无法打开资料库以外的本地文件')
    return value
  }
  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`
  const url = new URL(candidate)
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('只支持网页地址')
  return url.toString()
}

function decodeEntities(value = '') {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
}

function metaValue(html, names) {
  for (const name of names) {
    const first = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']*)["'][^>]*>`, 'i').exec(html)
    const reverse = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${name}["'][^>]*>`, 'i').exec(html)
    if (first?.[1] || reverse?.[1]) return decodeEntities(first?.[1] || reverse?.[1])
  }
  return ''
}

async function fetchMetadata(input) {
  const url = normalizeUrl(input)
  const response = await fetch(url, {
    redirect: 'follow',
    headers: { 'User-Agent': 'Mozilla/5.0 Marginalia/0.1' },
    signal: AbortSignal.timeout(12000),
  })
  if (!response.ok) throw new Error(`网页返回 ${response.status}`)
  const html = await response.text()
  const finalUrl = response.url || url
  const titleTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] || ''
  const title = metaValue(html, ['og:title', 'twitter:title']) || decodeEntities(titleTag.replace(/\s+/g, ' ').trim()) || new URL(finalUrl).hostname
  const description = metaValue(html, ['og:description', 'description', 'twitter:description']) || '已保存的网页'
  const rawImage = metaValue(html, ['og:image', 'twitter:image'])
  const image = rawImage ? new URL(rawImage, finalUrl).toString() : ''
  const text = decodeEntities(html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 50000))
  return {
    url: finalUrl,
    title: title.slice(0, 180),
    domain: new URL(finalUrl).hostname.replace(/^www\./, ''),
    description: description.slice(0, 360),
    image,
    contentText: text,
  }
}

function emitBrowserState() {
  if (!mainWindow || !pageView || pageView.webContents.isDestroyed()) return
  mainWindow.webContents.send('browser:state', {
    url: pageView.webContents.getURL(),
    title: pageView.webContents.getTitle(),
    canGoBack: pageView.webContents.navigationHistory.canGoBack(),
    canGoForward: pageView.webContents.navigationHistory.canGoForward(),
    loading: pageView.webContents.isLoading(),
  })
}

function startProgressTracking() {
  clearInterval(progressTimer)
  progressTimer = setInterval(async () => {
    if (!pageView || pageView.webContents.isDestroyed() || !mainWindow) return
    try {
      const progress = await pageView.webContents.executeJavaScript(`(() => {
        const root = document.scrollingElement || document.documentElement;
        const max = Math.max(1, root.scrollHeight - root.clientHeight);
        return Math.max(0, Math.min(100, Math.round((root.scrollTop / max) * 100)));
      })()`, true)
      mainWindow.webContents.send('browser:progress', progress)
    } catch {}
  }, 900)
}

async function applyPageHighlights(items = activeHighlights) {
  activeHighlights = Array.isArray(items) ? items : []
  if (!pageView || pageView.webContents.isDestroyed() || pageView.webContents.isLoading()) return 0
  try {
    if (!highlightCssKey) {
      highlightCssKey = await pageView.webContents.insertCSS(`
        html, body {
          scrollbar-width: none !important;
        }
        html::-webkit-scrollbar,
        body::-webkit-scrollbar {
          width: 0 !important;
          height: 0 !important;
          display: none !important;
        }
        ::highlight(marginalia-saved-highlight) {
          background-color: #f4e66a;
          color: inherit;
          text-decoration: underline;
          text-decoration-color: rgba(47, 91, 255, .42);
          text-decoration-thickness: 1px;
          text-underline-offset: 2px;
        }
      `)
    }
    const highlights = activeHighlights.map(({ id, text, anchor }) => ({ id, text: String(text || '').trim(), anchor })).filter(({ text }) => text)
    const applied = await pageView.webContents.executeJavaScript(`(() => {
      if (!window.CSS?.highlights || typeof window.Highlight === 'undefined') return 0;
      const items = ${JSON.stringify(highlights)};
      const ranges = [];
      const used = new WeakMap();
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const parent = node.parentElement;
          if (!parent || !node.data.trim()) return NodeFilter.FILTER_REJECT;
          if (parent.closest('script, style, noscript, textarea, input, [contenteditable="true"]')) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      const resolvePath = (path) => {
        let node = document.body;
        for (const index of path || []) {
          node = node?.childNodes?.[index];
          if (!node) return null;
        }
        return node;
      };
      for (const item of items) {
        if (item.anchor) {
          try {
            const anchor = JSON.parse(item.anchor);
            const startNode = resolvePath(anchor.startPath);
            const endNode = resolvePath(anchor.endPath);
            if (startNode && endNode) {
              const range = document.createRange();
              range.setStart(startNode, anchor.startOffset);
              range.setEnd(endNode, anchor.endOffset);
              if (range.toString().replace(/\\s+/g, ' ').trim() === item.text) {
                ranges.push(range);
                continue;
              }
            }
          } catch {}
        }
        for (const node of nodes) {
          const from = used.get(node) || 0;
          const start = node.data.indexOf(item.text, from);
          if (start < 0) continue;
          const range = document.createRange();
          range.setStart(node, start);
          range.setEnd(node, start + item.text.length);
          ranges.push(range);
          used.set(node, start + item.text.length);
          break;
        }
      }
      CSS.highlights.delete('marginalia-saved-highlight');
      if (ranges.length) CSS.highlights.set('marginalia-saved-highlight', new Highlight(...ranges));
      return ranges.length;
    })()`, true)
    pageView.webContents.send('page:highlights', highlights)
    return applied
  } catch {
    return 0
  }
}

function sendConnectorTargets(items = activeConnectorTargets) {
  activeConnectorTargets = Array.isArray(items) ? items : []
  if (!pageView || pageView.webContents.isDestroyed() || pageView.webContents.isLoading()) return
  pageView.webContents.send('page:connector-targets', activeConnectorTargets)
}

function ensurePageView() {
  if (pageView && !pageView.webContents.isDestroyed()) return pageView
  pageView = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, 'page-preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  mainWindow.contentView.addChildView(pageView)
  pageView.webContents.setWindowOpenHandler(({ url }) => {
    try {
      pageView.webContents.loadURL(normalizeUrl(url))
    } catch {
      shell.openExternal(url).catch(() => {})
    }
    return { action: 'deny' }
  })
  pageView.webContents.on('will-navigate', (event, targetUrl) => {
    const protocol = new URL(targetUrl).protocol
    if (['http:', 'https:', 'file:'].includes(protocol)) return
    event.preventDefault()
  })
  pageView.webContents.on('did-start-loading', emitBrowserState)
  pageView.webContents.on('did-stop-loading', () => {
    highlightCssKey = undefined
    emitBrowserState()
    applyPageHighlights().then(() => sendConnectorTargets()).catch(() => {})
  })
  pageView.webContents.on('did-navigate', emitBrowserState)
  pageView.webContents.on('did-navigate-in-page', emitBrowserState)
  pageView.webContents.on('page-title-updated', emitBrowserState)
  pageView.webContents.on('context-menu', (_event, params) => {
    const selection = params.selectionText?.trim()
    if (!selection) return
    Menu.buildFromTemplate([
      { role: 'copy', label: '复制' },
    ]).popup({ window: mainWindow })
  })
  return pageView
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1060,
    minHeight: 680,
    backgroundColor: '#f7f5ef',
    title: 'Marginalia',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  const devUrl = process.env.VITE_DEV_SERVER_URL
  if (devUrl) mainWindow.loadURL(devUrl)
  else mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'renderer', 'index.html'))
  mainWindow.on('closed', () => {
    clearInterval(progressTimer)
    mainWindow = undefined
    pageView = undefined
  })
}

ipcMain.handle('store:get', readStore)
ipcMain.handle('store:set', (_event, store) => writeStore(store))
ipcMain.handle('metadata:fetch', (_event, url) => fetchMetadata(url))

ipcMain.handle('browser:open', async (_event, { url, bounds }) => {
  const view = ensurePageView()
  lastBounds = bounds
  view.setBounds(bounds)
  const normalized = normalizeUrl(url)
  if (view.webContents.getURL() !== normalized) await view.webContents.loadURL(normalized)
  startProgressTracking()
  emitBrowserState()
  return {
    url: view.webContents.getURL(),
    title: view.webContents.getTitle(),
    canGoBack: view.webContents.navigationHistory.canGoBack(),
    canGoForward: view.webContents.navigationHistory.canGoForward(),
    loading: view.webContents.isLoading(),
  }
})

ipcMain.handle('browser:resize', (_event, bounds) => {
  lastBounds = bounds
  if (pageView && !pageView.webContents.isDestroyed()) pageView.setBounds(bounds)
})

ipcMain.handle('browser:highlights', (_event, items) => applyPageHighlights(items))

ipcMain.handle('browser:connectors', (event, items) => {
  if (!mainWindow || event.sender !== mainWindow.webContents) return false
  const targets = Array.isArray(items) ? items.map((item) => ({
    id: String(item?.id || '').slice(0, 100),
    label: String(item?.label || '').slice(0, 8),
    targetY: Number.isFinite(item?.targetY) ? item.targetY : 0,
  })).filter(({ id, label }) => id && label) : []
  sendConnectorTargets(targets)
  return true
})

ipcMain.on('page:save-highlight', async (event, payload) => {
  if (!pageView || event.sender !== pageView.webContents || !mainWindow) return
  const text = String(payload?.text || '').replace(/\s+/g, ' ').trim().slice(0, 1000)
  if (!text) return
  const anchor = typeof payload?.anchor === 'string' ? payload.anchor.slice(0, 8000) : undefined
  const highlight = { id: `pending-${Date.now()}`, text, anchor }
  await applyPageHighlights([...activeHighlights, highlight])
  mainWindow.webContents.send('browser:highlight', { text, anchor })
})

ipcMain.handle('browser:hide', () => {
  clearInterval(progressTimer)
  activeConnectorTargets = []
  if (pageView && !pageView.webContents.isDestroyed()) pageView.setBounds({ x: 0, y: 0, width: 0, height: 0 })
})

ipcMain.handle('browser:action', async (_event, { action, payload }) => {
  if (!pageView || pageView.webContents.isDestroyed()) return false
  const history = pageView.webContents.navigationHistory
  if (action === 'back' && history.canGoBack()) history.goBack()
  if (action === 'forward' && history.canGoForward()) history.goForward()
  if (action === 'reload') pageView.webContents.reload()
  if (action === 'navigate' && payload) await pageView.webContents.loadURL(normalizeUrl(payload))
  if (action === 'external') await shell.openExternal(pageView.webContents.getURL())
  emitBrowserState()
  return true
})

ipcMain.handle('offline:save', async (_event, { id, url }) => {
  const directory = path.join(app.getPath('userData'), 'offline', String(id).replace(/[^a-z0-9_-]/gi, ''))
  await fs.mkdir(directory, { recursive: true })
  const destination = path.join(directory, 'index.html')
  const hidden = new BrowserWindow({ show: false, webPreferences: { sandbox: true } })
  try {
    await hidden.loadURL(normalizeUrl(url))
    await hidden.webContents.savePage(destination, 'HTMLComplete')
    return { path: destination }
  } finally {
    hidden.destroy()
  }
})

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
