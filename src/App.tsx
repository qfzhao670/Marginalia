import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  Download,
  ExternalLink,
  FileText,
  Globe2,
  LoaderCircle,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Star,
  Tag,
  Trash2,
  X,
} from 'lucide-react'
import { FormEvent, MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Annotation, AppStore, Bookmark, BrowserState, PageMetadata, ReadStatus } from './types'

type LibraryScope = { type: 'all' } | { type: 'starred' } | { type: 'tag'; tag: string }
type ToastState = { message: string; tone?: 'default' | 'danger' }

const EMPTY_STORE: AppStore = { bookmarks: [], tags: [] }
const EMPTY_BROWSER: BrowserState = { url: '', title: '', canGoBack: false, canGoForward: false, loading: false }

const formatDate = (iso: string) => new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date(iso))

const toBounds = (element: HTMLElement) => {
  const rect = element.getBoundingClientRect()
  return {
    x: Math.round(rect.left),
    y: Math.round(rect.top),
    width: Math.max(0, Math.round(rect.width)),
    height: Math.max(0, Math.round(rect.height)),
  }
}

function App() {
  const [store, setStore] = useState<AppStore>(EMPTY_STORE)
  const [ready, setReady] = useState(false)
  const [view, setView] = useState<'library' | 'reader'>('library')
  const [scope, setScope] = useState<LibraryScope>({ type: 'all' })
  const [status, setStatus] = useState<'all' | ReadStatus>('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<'recent' | 'oldest' | 'title'>('recent')
  const [addOpen, setAddOpen] = useState(false)
  const [tagManagerOpen, setTagManagerOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [editingTagsFor, setEditingTagsFor] = useState<string | null>(null)
  const [cardMenu, setCardMenu] = useState<string | null>(null)
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [notesOpen, setNotesOpen] = useState(true)
  const [browserState, setBrowserState] = useState(EMPTY_BROWSER)
  const [readerMode, setReaderMode] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')
  const [toast, setToast] = useState<ToastState | null>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const hydrated = useRef(false)
  const progressRef = useRef(0)

  const current = useMemo(
    () => store.bookmarks.find((bookmark) => bookmark.id === currentId) ?? null,
    [store.bookmarks, currentId],
  )

  const notify = useCallback((message: string, tone: ToastState['tone'] = 'default') => {
    setToast({ message, tone })
    window.setTimeout(() => setToast(null), 2600)
  }, [])

  useEffect(() => {
    window.marginalia.store.get().then((saved) => {
      setStore(saved)
      hydrated.current = true
      setReady(true)
    }).catch(() => {
      setReady(true)
      notify('无法读取本地资料库', 'danger')
    })
  }, [notify])

  useEffect(() => {
    if (!hydrated.current) return
    const timer = window.setTimeout(() => {
      window.marginalia.store.set(store).catch(() => notify('本地保存失败', 'danger'))
    }, 220)
    return () => window.clearTimeout(timer)
  }, [store, notify])

  useEffect(() => window.marginalia.browser.onState(setBrowserState), [])

  useEffect(() => window.marginalia.browser.onProgress((progress) => {
    progressRef.current = progress
    if (!currentId) return
    setStore((previous) => ({
      ...previous,
      bookmarks: previous.bookmarks.map((bookmark) => bookmark.id === currentId
        ? { ...bookmark, progress, readStatus: progress >= 90 ? 'read' : bookmark.readStatus }
        : bookmark),
    }))
  }), [currentId])

  useEffect(() => window.marginalia.browser.onHighlight((text) => {
    if (!currentId) return
    const annotation: Annotation = {
      id: crypto.randomUUID(),
      type: 'highlight',
      text,
      color: 'clay',
      createdAt: new Date().toISOString(),
    }
    setStore((previous) => ({
      ...previous,
      bookmarks: previous.bookmarks.map((bookmark) => bookmark.id === currentId
        ? { ...bookmark, annotations: [annotation, ...bookmark.annotations] }
        : bookmark),
    }))
    notify('已保存为高亮')
  }), [currentId, notify])

  useEffect(() => {
    if (view !== 'reader' || !current || !viewportRef.current) {
      window.marginalia.browser.hide()
      return
    }
    const element = viewportRef.current
    const sync = () => window.marginalia.browser.resize(toBounds(element))
    window.marginalia.browser.open(current.offlinePath || current.url, toBounds(element)).catch(() => {
      notify('网页无法打开，请检查网络连接', 'danger')
    })
    const observer = new ResizeObserver(sync)
    observer.observe(element)
    window.addEventListener('resize', sync)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', sync)
    }
  }, [view, current?.id, current?.url, current?.offlinePath, notesOpen, notify])

  const updateBookmark = useCallback((id: string, update: Partial<Bookmark>) => {
    setStore((previous) => ({
      ...previous,
      bookmarks: previous.bookmarks.map((bookmark) => bookmark.id === id ? { ...bookmark, ...update } : bookmark),
    }))
  }, [])

  const openBookmark = useCallback((bookmark: Bookmark) => {
    setCurrentId(bookmark.id)
    setView('reader')
    setReaderMode(false)
    setCardMenu(null)
    updateBookmark(bookmark.id, { readStatus: 'read' })
  }, [updateBookmark])

  const goLibrary = useCallback((nextScope: LibraryScope) => {
    setScope(nextScope)
    setView('library')
    setQuery('')
    setCardMenu(null)
  }, [])

  const filtered = useMemo(() => {
    let items = store.bookmarks.filter((bookmark) => {
      if (scope.type === 'starred' && !bookmark.starred) return false
      if (scope.type === 'tag' && !bookmark.tags.includes(scope.tag)) return false
      if (status !== 'all' && bookmark.readStatus !== status) return false
      return true
    })
    return [...items].sort((a, b) => {
      if (sort === 'oldest') return +new Date(a.savedAt) - +new Date(b.savedAt)
      if (sort === 'title') return a.title.localeCompare(b.title, 'zh-CN')
      return +new Date(b.savedAt) - +new Date(a.savedAt)
    })
  }, [store.bookmarks, scope, status, sort])

  const scopeTitle = scope.type === 'all' ? '全部网页' : scope.type === 'starred' ? '收藏夹' : scope.tag
  const counts = {
    all: store.bookmarks.length,
    unread: store.bookmarks.filter((bookmark) => bookmark.readStatus === 'unread').length,
    read: store.bookmarks.filter((bookmark) => bookmark.readStatus === 'read').length,
  }

  const deleteBookmark = (id: string) => {
    if (!window.confirm('删除这个网页？相关笔记和高亮也会删除。')) return
    setStore((previous) => ({ ...previous, bookmarks: previous.bookmarks.filter((bookmark) => bookmark.id !== id) }))
    setCardMenu(null)
    notify('网页已删除')
  }

  const addNote = () => {
    if (!current || !noteDraft.trim()) return
    const annotation: Annotation = {
      id: crypto.randomUUID(),
      type: 'note',
      text: noteDraft.trim(),
      createdAt: new Date().toISOString(),
    }
    updateBookmark(current.id, { annotations: [annotation, ...current.annotations] })
    setNoteDraft('')
  }

  const updateAnnotation = (annotation: Annotation) => {
    if (!current) return
    const next = window.prompt('编辑内容', annotation.text)
    if (next === null || !next.trim()) return
    updateBookmark(current.id, {
      annotations: current.annotations.map((item) => item.id === annotation.id ? { ...item, text: next.trim() } : item),
    })
  }

  const deleteAnnotation = (id: string) => {
    if (!current) return
    updateBookmark(current.id, { annotations: current.annotations.filter((item) => item.id !== id) })
  }

  if (!ready) {
    return <div className="loading-screen"><LoaderCircle className="spin" />正在打开本地资料库</div>
  }

  return (
    <div className="app-shell" onClick={() => cardMenu && setCardMenu(null)}>
      <Sidebar
        store={store}
        scope={scope}
        view={view}
        onNavigate={goLibrary}
        onManageTags={() => setTagManagerOpen(true)}
        onSettings={() => setSettingsOpen(true)}
      />

      {view === 'library' ? (
        <main className="workspace library-workspace">
          <header className="library-toolbar">
            <button className={`search-launch ${query ? 'active' : ''}`} onClick={() => setQuery(' ')} aria-label="打开全局搜索">
              <Search size={20} />
              <span>搜索标题、正文或标签…</span>
              <kbd>⌘ K</kbd>
            </button>
            <button className="button primary" onClick={() => setAddOpen(true)}><Plus size={19} />添加网页</button>
          </header>

          <section className="library-content">
            <div className="library-heading-row">
              <div>
                <p className="context-caption">{scope.type === 'tag' ? '标签' : '本地资料库'}</p>
                <h1>{scopeTitle}</h1>
              </div>
              <label className="sort-control">
                <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} aria-label="网页排序">
                  <option value="recent">最近保存</option>
                  <option value="oldest">最早保存</option>
                  <option value="title">按标题</option>
                </select>
                <ChevronDown size={17} />
              </label>
            </div>
            <div className="status-filters" aria-label="阅读状态筛选">
              <button className={status === 'all' ? 'selected' : ''} onClick={() => setStatus('all')}>全部 <span>{counts.all}</span></button>
              <button className={status === 'unread' ? 'selected' : ''} onClick={() => setStatus('unread')}>未读 <span>{counts.unread}</span></button>
              <button className={status === 'read' ? 'selected' : ''} onClick={() => setStatus('read')}>已读 <span>{counts.read}</span></button>
            </div>

            {filtered.length ? (
              <div className="bookmark-grid">
                {filtered.map((bookmark) => (
                  <BookmarkCard
                    key={bookmark.id}
                    bookmark={bookmark}
                    menuOpen={cardMenu === bookmark.id}
                    onOpen={() => openBookmark(bookmark)}
                    onToggleStar={() => updateBookmark(bookmark.id, { starred: !bookmark.starred })}
                    onToggleMenu={(event) => {
                      event.stopPropagation()
                      setCardMenu(cardMenu === bookmark.id ? null : bookmark.id)
                    }}
                    onEditTags={() => setEditingTagsFor(bookmark.id)}
                    onToggleRead={() => updateBookmark(bookmark.id, { readStatus: bookmark.readStatus === 'read' ? 'unread' : 'read' })}
                    onDelete={() => deleteBookmark(bookmark.id)}
                  />
                ))}
              </div>
            ) : (
              <EmptyLibrary onAdd={() => setAddOpen(true)} />
            )}
          </section>
        </main>
      ) : current ? (
        <main className="workspace reader-workspace">
          <header className="reader-toolbar">
            <div className="nav-actions">
              <button className="icon-button" disabled={!browserState.canGoBack} onClick={() => window.marginalia.browser.action('back')} title="后退"><ArrowLeft /></button>
              <button className="icon-button" disabled={!browserState.canGoForward} onClick={() => window.marginalia.browser.action('forward')} title="前进"><ArrowRight /></button>
              <button className="icon-button" onClick={() => window.marginalia.browser.action('reload')} title="刷新"><RefreshCw className={browserState.loading ? 'spin' : ''} /></button>
            </div>
            <form className="address-field" onSubmit={(event) => {
              event.preventDefault()
              const value = new FormData(event.currentTarget).get('address')?.toString()
              if (value) window.marginalia.browser.action('navigate', value)
            }}>
              <Globe2 size={17} />
              <input name="address" key={browserState.url} defaultValue={browserState.url || current.url} aria-label="网页地址" />
            </form>
            <button className={`button quiet ${readerMode ? 'active' : ''}`} onClick={async () => setReaderMode(Boolean(await window.marginalia.browser.action('reader')))}><BookOpen size={18} />阅读模式</button>
            <button className={`button quiet ${notesOpen ? 'active' : ''}`} onClick={() => setNotesOpen((open) => !open)}><FileText size={18} />笔记</button>
            <button className="button quiet" onClick={() => window.marginalia.browser.action('external')}><ExternalLink size={18} />在外部浏览器打开</button>
            <button className={`button save-state ${current.starred ? 'active' : ''}`} onClick={() => updateBookmark(current.id, { starred: !current.starred })}>
              <Star size={18} fill={current.starred ? 'currentColor' : 'none'} />{current.starred ? '已收藏' : '收藏'}
            </button>
          </header>
          <div className={`reader-body ${notesOpen ? 'with-notes' : ''}`}>
            <div className="browser-viewport" ref={viewportRef} aria-label="内置网页浏览区域">
              <div className="browser-placeholder"><LoaderCircle className="spin" />正在打开 {current.domain}</div>
            </div>
            {notesOpen && (
              <aside className="notes-panel">
                <div className="notes-heading">
                  <div><h2>笔记与高亮</h2><span>{current.annotations.length}</span></div>
                  <button className="icon-button" onClick={() => setNotesOpen(false)} title="关闭笔记栏"><X /></button>
                </div>
                <div className="annotation-list">
                  {current.annotations.length ? current.annotations.map((annotation) => (
                    <article className={`annotation ${annotation.type}`} key={annotation.id}>
                      <header>
                        <span>{annotation.type === 'highlight' ? '高亮' : '笔记'}</span>
                        <div>
                          <button onClick={() => updateAnnotation(annotation)}>编辑</button>
                          <button onClick={() => deleteAnnotation(annotation.id)}>删除</button>
                        </div>
                      </header>
                      <p>{annotation.text}</p>
                    </article>
                  )) : (
                    <div className="empty-notes"><FileText /><p>还没有笔记</p><span>在网页中选中文字并右键，可以保存为高亮。</span></div>
                  )}
                </div>
                <div className="note-composer">
                  <textarea value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} placeholder="写下你的想法…" />
                  <button className="button primary" onClick={addNote} disabled={!noteDraft.trim()}>添加笔记</button>
                </div>
              </aside>
            )}
          </div>
          <div className="reader-progress"><span style={{ width: `${current.progress}%` }} /></div>
        </main>
      ) : null}

      {query && <SearchDialog query={query.trim()} setQuery={setQuery} bookmarks={store.bookmarks} onOpen={openBookmark} />}
      {addOpen && <AddBookmarkDialog store={store} setStore={setStore} onClose={() => setAddOpen(false)} notify={notify} />}
      {tagManagerOpen && <TagManager store={store} setStore={setStore} onClose={() => setTagManagerOpen(false)} notify={notify} />}
      {settingsOpen && <SettingsDialog store={store} onClose={() => setSettingsOpen(false)} />}
      {editingTagsFor && (
        <EditTagsDialog
          bookmark={store.bookmarks.find((item) => item.id === editingTagsFor)!}
          tags={store.tags}
          onSave={(tags) => {
            updateBookmark(editingTagsFor, { tags })
            setEditingTagsFor(null)
            notify('标签已更新')
          }}
          onClose={() => setEditingTagsFor(null)}
        />
      )}
      {toast && <div className={`toast ${toast.tone === 'danger' ? 'danger' : ''}`}><Check size={17} />{toast.message}</div>}
    </div>
  )
}

function Sidebar({ store, scope, view, onNavigate, onManageTags, onSettings }: {
  store: AppStore
  scope: LibraryScope
  view: 'library' | 'reader'
  onNavigate: (scope: LibraryScope) => void
  onManageTags: () => void
  onSettings: () => void
}) {
  return (
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">M</span><span>Marginalia</span></div>
      <nav className="primary-nav" aria-label="资料库">
        <button className={view === 'library' && scope.type === 'all' ? 'active' : ''} onClick={() => onNavigate({ type: 'all' })}>
          <Globe2 /><span>全部网页</span><em>{store.bookmarks.length}</em>
        </button>
        <button className={view === 'library' && scope.type === 'starred' ? 'active' : ''} onClick={() => onNavigate({ type: 'starred' })}>
          <Star /><span>收藏夹</span><em>{store.bookmarks.filter((bookmark) => bookmark.starred).length}</em>
        </button>
      </nav>
      <div className="sidebar-divider" />
      <div className="tag-nav">
        <div className="sidebar-label">标签</div>
        {store.tags.map((tagName) => (
          <button key={tagName} className={view === 'library' && scope.type === 'tag' && scope.tag === tagName ? 'active' : ''} onClick={() => onNavigate({ type: 'tag', tag: tagName })}>
            <Tag /><span>{tagName}</span><em>{store.bookmarks.filter((bookmark) => bookmark.tags.includes(tagName)).length}</em>
          </button>
        ))}
        <button className="new-tag" onClick={onManageTags}><Plus /><span>新建标签</span></button>
      </div>
      <button className="settings-button" onClick={onSettings}><Settings /><span>设置</span></button>
    </aside>
  )
}

function BookmarkCard({ bookmark, menuOpen, onOpen, onToggleStar, onToggleMenu, onEditTags, onToggleRead, onDelete }: {
  bookmark: Bookmark
  menuOpen: boolean
  onOpen: () => void
  onToggleStar: () => void
  onToggleMenu: (event: MouseEvent) => void
  onEditTags: () => void
  onToggleRead: () => void
  onDelete: () => void
}) {
  return (
    <article className="bookmark-card" onClick={onOpen} tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && onOpen()}>
      <div className={`bookmark-cover ${bookmark.image ? '' : 'empty'}`}>
        {bookmark.image ? <img src={bookmark.image} alt="" /> : <span>{bookmark.domain.charAt(0).toUpperCase()}</span>}
        {bookmark.progress > 0 && <div className="card-progress"><span style={{ width: `${bookmark.progress}%` }} /></div>}
      </div>
      <div className="card-body">
        <h3>{bookmark.title}</h3>
        <div className="domain">{bookmark.domain}</div>
        <p>{bookmark.description}</p>
        <div className="tag-row">{bookmark.tags.map((tagName) => <span key={tagName}># {tagName}</span>)}</div>
        <footer>
          <span>{formatDate(bookmark.savedAt)} · {bookmark.readStatus === 'read' ? '已读' : '未读'}</span>
          <div>
            <button className={`card-action star ${bookmark.starred ? 'active' : ''}`} onClick={(event) => { event.stopPropagation(); onToggleStar() }} title={bookmark.starred ? '移出收藏夹' : '加入收藏夹'}>
              <Star fill={bookmark.starred ? 'currentColor' : 'none'} />
            </button>
            <button className="card-action" onClick={onToggleMenu} title="更多操作"><MoreHorizontal /></button>
          </div>
        </footer>
      </div>
      {menuOpen && (
        <div className="card-menu" onClick={(event) => event.stopPropagation()}>
          <button onClick={onEditTags}><Tag />编辑标签</button>
          <button onClick={onToggleRead}><Check />标记为{bookmark.readStatus === 'read' ? '未读' : '已读'}</button>
          <button className="danger" onClick={onDelete}><Trash2 />删除</button>
        </div>
      )}
    </article>
  )
}

function EmptyLibrary({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="empty-library">
      <div><FileText /></div>
      <h2>这里还没有网页</h2>
      <p>保存一个网址，Marginalia 会自动抓取标题、摘要和正文。</p>
      <button className="button primary" onClick={onAdd}><Plus />添加网页</button>
    </div>
  )
}

function Modal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className="modal-layer"><div className={`modal ${className}`} role="dialog" aria-modal="true">{children}</div></div>
}

function SearchDialog({ query, setQuery, bookmarks, onOpen }: {
  query: string
  setQuery: (query: string) => void
  bookmarks: Bookmark[]
  onOpen: (bookmark: Bookmark) => void
}) {
  const normalized = query.toLocaleLowerCase()
  const titleMatches = query ? bookmarks.filter((item) => item.title.toLocaleLowerCase().includes(normalized)) : []
  const contentMatches = query ? bookmarks.filter((item) => item.description.toLocaleLowerCase().includes(normalized) || item.contentText.toLocaleLowerCase().includes(normalized)).filter((item) => !titleMatches.includes(item)) : []
  const tagMatches = query ? bookmarks.filter((item) => item.tags.some((tagName) => tagName.toLocaleLowerCase().includes(normalized))).filter((item) => !titleMatches.includes(item) && !contentMatches.includes(item)) : []
  const groups = [['标题', titleMatches], ['正文', contentMatches], ['标签', tagMatches]] as const

  return (
    <Modal className="search-modal">
      <div className="modal-title-row"><h2>全局搜索</h2><button className="icon-button" onClick={() => setQuery('')} title="关闭搜索"><X /></button></div>
      <div className="search-input-row">
        <Search />
        <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索标题、正文或标签…" />
        {query && <button onClick={() => setQuery('')} title="清空搜索"><X /></button>}
      </div>
      <p className="field-help">搜索标题、正文和标签</p>
      <div className="search-results">
        {!query && <div className="search-empty">输入关键词开始搜索</div>}
        {query && groups.every(([, items]) => items.length === 0) && <div className="search-empty">没有找到“{query}”</div>}
        {groups.map(([label, items]) => items.length > 0 && (
          <section key={label}>
            <h3>{label} <span>{items.length}</span></h3>
            {items.map((bookmark) => (
              <div className="search-result" key={bookmark.id}>
                <div className="result-image">{bookmark.image ? <img src={bookmark.image} alt="" /> : <Globe2 />}</div>
                <div><strong>{bookmark.title}</strong><span>{bookmark.domain} · {formatDate(bookmark.savedAt)}</span></div>
                <button className="button small" onClick={() => onOpen(bookmark)}>打开</button>
              </div>
            ))}
          </section>
        ))}
      </div>
    </Modal>
  )
}

function AddBookmarkDialog({ store, setStore, onClose, notify }: {
  store: AppStore
  setStore: React.Dispatch<React.SetStateAction<AppStore>>
  onClose: () => void
  notify: (message: string, tone?: ToastState['tone']) => void
}) {
  const [url, setUrl] = useState('')
  const [metadata, setMetadata] = useState<PageMetadata | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [offline, setOffline] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [showNewTag, setShowNewTag] = useState(false)

  const loadPreview = useCallback(async (value: string) => {
    if (!value.trim()) return
    setLoading(true)
    setError('')
    try {
      setMetadata(await window.marginalia.metadata.fetch(value.trim()))
    } catch (reason) {
      setMetadata(null)
      setError(reason instanceof Error ? reason.message : '无法读取这个网页')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!/^https?:\/\//i.test(url)) return
    const timer = window.setTimeout(() => loadPreview(url), 700)
    return () => window.clearTimeout(timer)
  }, [url, loadPreview])

  const createTag = () => {
    const value = newTag.trim()
    if (!value) return
    setStore((previous) => ({ ...previous, tags: previous.tags.includes(value) ? previous.tags : [...previous.tags, value] }))
    setSelectedTags((previous) => previous.includes(value) ? previous : [...previous, value])
    setNewTag('')
    setShowNewTag(false)
  }

  const save = async (event: FormEvent) => {
    event.preventDefault()
    let page = metadata
    if (!page) {
      try { page = await window.marginalia.metadata.fetch(url) }
      catch { setError('请先输入可以访问的网页地址'); return }
    }
    if (store.bookmarks.some((bookmark) => bookmark.url === page!.url)) {
      setError('这个网页已经保存过了')
      return
    }
    const id = crypto.randomUUID()
    const bookmark: Bookmark = {
      id,
      ...page,
      tags: selectedTags,
      savedAt: new Date().toISOString(),
      readStatus: 'unread',
      starred: false,
      progress: 0,
      annotations: [],
    }
    setStore((previous) => ({ ...previous, bookmarks: [bookmark, ...previous.bookmarks] }))
    onClose()
    notify('网页已保存')
    if (offline) {
      try {
        const result = await window.marginalia.offline.save(id, page.url)
        setStore((previous) => ({
          ...previous,
          bookmarks: previous.bookmarks.map((item) => item.id === id ? { ...item, offlinePath: result.path } : item),
        }))
        notify('离线副本已保存')
      } catch {
        notify('网页已保存，但离线副本下载失败', 'danger')
      }
    }
  }

  return (
    <Modal className="add-modal">
      <form onSubmit={save}>
        <h2>添加网页</h2>
        <label className="field-label" htmlFor="url">网页地址</label>
        <div className="url-input"><input id="url" autoFocus value={url} onChange={(event) => setUrl(event.target.value)} onBlur={() => !metadata && loadPreview(url)} placeholder="https://example.com/article" />{loading && <LoaderCircle className="spin" />}</div>
        {error && <p className="field-error">{error}</p>}
        {metadata && (
          <div className="page-preview">
            <div className="preview-image">{metadata.image ? <img src={metadata.image} alt="" /> : <Globe2 />}</div>
            <div><h3>{metadata.title}</h3><span>{metadata.domain}</span><p>{metadata.description}</p></div>
          </div>
        )}
        <div className="field-label">标签</div>
        <div className="tag-picker">
          {store.tags.map((tagName) => (
            <button type="button" key={tagName} className={selectedTags.includes(tagName) ? 'selected' : ''} onClick={() => setSelectedTags((previous) => previous.includes(tagName) ? previous.filter((tag) => tag !== tagName) : [...previous, tagName])}>
              {selectedTags.includes(tagName) && <Check />} {tagName}
            </button>
          ))}
          {!showNewTag ? <button type="button" className="new" onClick={() => setShowNewTag(true)}><Plus />新建标签</button> : (
            <div className="inline-new-tag"><input autoFocus value={newTag} onChange={(event) => setNewTag(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && (event.preventDefault(), createTag())} /><button type="button" onClick={createTag}>添加</button></div>
          )}
        </div>
        <label className="toggle-row">
          <input type="checkbox" checked={offline} onChange={(event) => setOffline(event.target.checked)} />
          <span className="toggle" />
          <span><strong>保存离线副本</strong><small>断网时也可以阅读</small></span>
        </label>
        <div className="modal-actions"><button type="button" className="button" onClick={onClose}>取消</button><button className="button primary" disabled={!url.trim() || loading}>保存网页</button></div>
      </form>
    </Modal>
  )
}

function EditTagsDialog({ bookmark, tags, onSave, onClose }: { bookmark: Bookmark; tags: string[]; onSave: (tags: string[]) => void; onClose: () => void }) {
  const [selected, setSelected] = useState(bookmark.tags)
  return (
    <Modal className="compact-modal">
      <div className="modal-title-row"><h2>编辑标签</h2><button className="icon-button" onClick={onClose}><X /></button></div>
      <p className="modal-subtitle">{bookmark.title}</p>
      <div className="tag-picker large">{tags.map((tagName) => <button key={tagName} className={selected.includes(tagName) ? 'selected' : ''} onClick={() => setSelected((previous) => previous.includes(tagName) ? previous.filter((item) => item !== tagName) : [...previous, tagName])}>{selected.includes(tagName) && <Check />}{tagName}</button>)}</div>
      <div className="modal-actions"><button className="button" onClick={onClose}>取消</button><button className="button primary" onClick={() => onSave(selected)}>保存更改</button></div>
    </Modal>
  )
}

function TagManager({ store, setStore, onClose, notify }: { store: AppStore; setStore: React.Dispatch<React.SetStateAction<AppStore>>; onClose: () => void; notify: (message: string, tone?: ToastState['tone']) => void }) {
  const [selected, setSelected] = useState(store.tags[0] || '')
  const [name, setName] = useState(selected)
  const [filter, setFilter] = useState('')
  const [newTag, setNewTag] = useState('')
  const choose = (tagName: string) => { setSelected(tagName); setName(tagName) }
  const create = () => {
    const value = newTag.trim()
    if (!value || store.tags.includes(value)) return
    setStore((previous) => ({ ...previous, tags: [...previous.tags, value] }))
    setNewTag(''); choose(value); notify('标签已创建')
  }
  const rename = () => {
    const value = name.trim()
    if (!selected || !value || (value !== selected && store.tags.includes(value))) return
    setStore((previous) => ({
      tags: previous.tags.map((tagName) => tagName === selected ? value : tagName),
      bookmarks: previous.bookmarks.map((bookmark) => ({ ...bookmark, tags: bookmark.tags.map((tagName) => tagName === selected ? value : tagName) })),
    }))
    setSelected(value); notify('标签已更新')
  }
  const remove = () => {
    if (!selected || !window.confirm(`删除标签“${selected}”？网页不会被删除。`)) return
    setStore((previous) => ({
      tags: previous.tags.filter((tagName) => tagName !== selected),
      bookmarks: previous.bookmarks.map((bookmark) => ({ ...bookmark, tags: bookmark.tags.filter((tagName) => tagName !== selected) })),
    }))
    const next = store.tags.find((tagName) => tagName !== selected) || ''
    choose(next); notify('标签已删除')
  }
  const related = store.bookmarks.filter((bookmark) => bookmark.tags.includes(selected))
  return (
    <Modal className="tag-manager-modal">
      <div className="modal-title-row"><h2>标签管理</h2><button className="icon-button" onClick={onClose} title="关闭标签管理"><X /></button></div>
      <div className="tag-manager-body">
        <div className="tag-manager-list">
          <div className="mini-search"><Search /><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="搜索标签…" /></div>
          {store.tags.filter((tagName) => tagName.includes(filter)).map((tagName) => <button key={tagName} className={selected === tagName ? 'active' : ''} onClick={() => choose(tagName)}><Tag /><span>{tagName}</span><em>{store.bookmarks.filter((bookmark) => bookmark.tags.includes(tagName)).length}</em></button>)}
          <div className="create-tag-row"><input value={newTag} onChange={(event) => setNewTag(event.target.value)} placeholder="新标签名称" onKeyDown={(event) => event.key === 'Enter' && create()} /><button onClick={create}><Plus /></button></div>
        </div>
        <div className="tag-manager-detail">
          {selected ? <>
            <label className="field-label">标签名称</label>
            <input className="text-field" value={name} onChange={(event) => setName(event.target.value)} />
            <h3>相关网页 <span>({related.length})</span></h3>
            <div className="related-pages">{related.map((bookmark) => <div key={bookmark.id}><div>{bookmark.image ? <img src={bookmark.image} alt="" /> : <Globe2 />}</div><span><strong>{bookmark.title}</strong><small>{bookmark.domain}</small></span></div>)}</div>
            <div className="tag-manager-actions"><button className="button primary" onClick={rename}>保存更改</button><button className="button danger" onClick={remove}><Trash2 />删除标签</button></div>
            <p className="danger-help">删除标签不会删除网页</p>
          </> : <div className="search-empty">新建一个标签开始整理网页</div>}
        </div>
      </div>
    </Modal>
  )
}

function SettingsDialog({ store, onClose }: { store: AppStore; onClose: () => void }) {
  const exportData = () => {
    const blob = new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `marginalia-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(link.href)
  }
  return (
    <Modal className="settings-modal">
      <div className="modal-title-row"><h2>设置</h2><button className="icon-button" onClick={onClose}><X /></button></div>
      <section className="settings-section"><h3>本地资料库</h3><p>收藏、标签、阅读进度和笔记都保存在这台电脑上。</p><div className="storage-stat"><span>{store.bookmarks.length}</span> 个网页 <i /> <span>{store.tags.length}</span> 个标签</div></section>
      <section className="settings-section"><h3>数据备份</h3><p>导出 JSON 文件，可以保存你的收藏和全部笔记。</p><button className="button" onClick={exportData}><Download />导出数据</button></section>
    </Modal>
  )
}

export default App
