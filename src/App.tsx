import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Download,
  ExternalLink,
  FileText,
  Globe2,
  ImageIcon,
  Link2,
  List,
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
import { AnimatePresence, motion } from 'motion/react'
import { FormEvent, MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Annotation, AppStore, Bookmark, BrowserState, PageMetadata, ReadStatus } from './types'

type LibraryScope = { type: 'all' } | { type: 'starred' } | { type: 'tag'; tag: string }
type ToastState = { message: string; tone?: 'default' | 'danger' }

const EMPTY_STORE: AppStore = { bookmarks: [], tags: [] }
const EMPTY_BROWSER: BrowserState = { url: '', title: '', canGoBack: false, canGoForward: false, loading: false }

const formatDate = (iso: string) => new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date(iso))

const formatNoteDate = (iso: string) => {
  const date = new Date(iso)
  const time = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date)
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日　${time}`
}

const toBounds = (element: HTMLElement) => {
  const rect = element.getBoundingClientRect()
  return {
    x: Math.round(rect.left),
    y: Math.round(rect.top),
    width: Math.max(0, Math.round(rect.width)),
    height: Math.max(0, Math.round(rect.height)),
  }
}

const annotationLabels = (annotations: Annotation[]) => {
  let highlightIndex = 0
  let noteIndex = 0
  return annotations.map((annotation) => annotation.type === 'highlight' ? `A${++highlightIndex}` : `B${++noteIndex}`)
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
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [notesOpen, setNotesOpen] = useState(true)
  const [browserState, setBrowserState] = useState(EMPTY_BROWSER)
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

  useEffect(() => window.marginalia.browser.onHighlight(({ text, anchor }) => {
    if (!currentId) return
    const annotation: Annotation = {
      id: crypto.randomUUID(),
      type: 'highlight',
      text,
      note: '',
      anchor,
      color: 'clay',
      createdAt: new Date().toISOString(),
    }
    setStore((previous) => ({
      ...previous,
      bookmarks: previous.bookmarks.map((bookmark) => bookmark.id === currentId
        ? { ...bookmark, annotations: [annotation, ...bookmark.annotations] }
        : bookmark),
    }))
    setNotesOpen(true)
    notify('高亮已保存，可以写笔记了')
  }), [currentId, notify])

  useEffect(() => {
    if (view !== 'reader' || !current) return
    window.marginalia.browser.highlights(current.annotations
      .filter((annotation) => annotation.type === 'highlight')
      .map(({ id, text, anchor }) => ({ id, text, anchor })))
  }, [view, current?.id, current?.annotations])

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

  useEffect(() => {
    if (view !== 'reader' || !current || !notesOpen || !viewportRef.current) {
      window.marginalia.browser.connectors([])
      return
    }

    const viewport = viewportRef.current
    const list = document.querySelector<HTMLElement>('.annotation-list')
    const labels = annotationLabels(current.annotations)
    let frame = 0
    let followFrame = 0

    const sync = () => {
      frame = 0
      const viewportRect = viewport.getBoundingClientRect()
      const listRect = list?.getBoundingClientRect()
      const targets = current.annotations.flatMap((annotation, index) => {
        if (annotation.type !== 'highlight') return []
        const card = document.querySelector<HTMLElement>(`[data-annotation-id="${annotation.id}"]`)
        const badge = card?.querySelector<HTMLElement>('.margin-note-badge')
        if (!badge) return []
        const rect = badge.getBoundingClientRect()
        const centerY = rect.top + rect.height / 2
        if (listRect && (centerY < listRect.top || centerY > listRect.bottom)) return []
        return [{ id: annotation.id, label: labels[index], targetY: centerY - viewportRect.top }]
      })
      window.marginalia.browser.connectors(targets)
    }

    const schedule = () => {
      if (frame) cancelAnimationFrame(frame)
      frame = requestAnimationFrame(sync)
    }

    const observer = new ResizeObserver(schedule)
    observer.observe(viewport)
    if (list) observer.observe(list)
    document.querySelectorAll<HTMLElement>('.margin-note').forEach((card) => observer.observe(card))
    list?.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)

    const startedAt = performance.now()
    const followLayout = () => {
      sync()
      if (performance.now() - startedAt < 420) followFrame = requestAnimationFrame(followLayout)
    }
    followFrame = requestAnimationFrame(followLayout)

    return () => {
      if (frame) cancelAnimationFrame(frame)
      if (followFrame) cancelAnimationFrame(followFrame)
      observer.disconnect()
      list?.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [view, current?.id, current?.annotations, notesOpen])

  const updateBookmark = useCallback((id: string, update: Partial<Bookmark>) => {
    setStore((previous) => ({
      ...previous,
      bookmarks: previous.bookmarks.map((bookmark) => bookmark.id === id ? { ...bookmark, ...update } : bookmark),
    }))
  }, [])

  const openBookmark = useCallback((bookmark: Bookmark) => {
    setCurrentId(bookmark.id)
    setView('reader')
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

  const scopeTitle = scope.type === 'all' ? '资料库' : scope.type === 'starred' ? '收藏' : scope.tag
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

  const updateAnnotation = (annotation: Annotation) => {
    if (!current) return
    const next = window.prompt('编辑内容', annotation.type === 'highlight' ? annotation.note ?? '' : annotation.text)
    if (next === null || !next.trim()) return
    updateBookmark(current.id, {
      annotations: current.annotations.map((item) => item.id === annotation.id
        ? annotation.type === 'highlight' ? { ...item, note: next.trim() } : { ...item, text: next.trim() }
        : item),
    })
  }

  const updateHighlightNote = (id: string, note: string) => {
    if (!current) return
    updateBookmark(current.id, {
      annotations: current.annotations.map((item) => item.id === id ? { ...item, note } : item),
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
    <div className={`app-shell ${view === 'reader' ? 'reader-shell' : ''}`} onClick={() => cardMenu && setCardMenu(null)}>
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
              <span>搜索文章、正文与批注…</span>
              <kbd>⌘ K</kbd>
            </button>
            <button className="button primary save-link" onClick={() => setAddOpen(true)}><Plus size={19} />保存链接</button>
          </header>

          <section className="library-content">
            <div className="library-heading-row">
              <div>
                <p className="context-caption">{scope.type === 'tag' ? '标签视图' : '本地收藏与页边笔记'}</p>
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
              <motion.div className="bookmark-list" layout>
                <AnimatePresence initial={false} mode="popLayout">
                {filtered.map((bookmark) => (
                  <BookmarkCard
                    key={bookmark.id}
                    bookmark={bookmark}
                    menuOpen={cardMenu === bookmark.id}
                    expanded={expandedId === bookmark.id}
                    onOpen={() => openBookmark(bookmark)}
                    onToggleExpanded={() => setExpandedId((id) => id === bookmark.id ? null : bookmark.id)}
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
                </AnimatePresence>
              </motion.div>
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
            <button className={`button quiet ${notesOpen ? 'active' : ''}`} onClick={() => setNotesOpen((open) => !open)}><FileText size={18} />页边笔记</button>
            <button className="button quiet" onClick={() => window.marginalia.browser.action('external')}><ExternalLink size={18} />在浏览器打开</button>
            <button className={`button save-state ${current.starred ? 'active' : ''}`} onClick={() => updateBookmark(current.id, { starred: !current.starred })}>
              <Star size={18} fill={current.starred ? 'currentColor' : 'none'} />{current.starred ? '已收藏' : '收藏'}
            </button>
          </header>
          <div className={`reader-body ${notesOpen ? 'with-notes' : ''}`}>
            <div className="browser-viewport" ref={viewportRef} aria-label="内置网页浏览区域">
              <div className="browser-placeholder"><LoaderCircle className="spin" />正在打开 {current.domain}</div>
            </div>
            {notesOpen && <BrowserNotesPanel bookmark={current} onEdit={updateAnnotation} onDelete={deleteAnnotation} onNoteChange={updateHighlightNote} />}
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
      <AnimatePresence>{toast && <motion.div className={`toast ${toast.tone === 'danger' ? 'danger' : ''}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}><Check size={17} />{toast.message}</motion.div>}</AnimatePresence>
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
          <FileText /><span>资料库</span><em>{store.bookmarks.length}</em>
        </button>
        <button className={view === 'library' && scope.type === 'starred' ? 'active' : ''} onClick={() => onNavigate({ type: 'starred' })}>
          <Star /><span>收藏</span><em>{store.bookmarks.filter((bookmark) => bookmark.starred).length}</em>
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

function BookmarkCard({ bookmark, menuOpen, expanded, onOpen, onToggleExpanded, onToggleStar, onToggleMenu, onEditTags, onToggleRead, onDelete }: {
  bookmark: Bookmark
  menuOpen: boolean
  expanded: boolean
  onOpen: () => void
  onToggleExpanded: () => void
  onToggleStar: () => void
  onToggleMenu: (event: MouseEvent) => void
  onEditTags: () => void
  onToggleRead: () => void
  onDelete: () => void
}) {
  const annotation = bookmark.annotations[0]
  return (
    <motion.article
      className={`bookmark-card ${expanded ? 'expanded' : ''}`}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: .985 }}
      transition={{ layout: { type: 'spring', stiffness: 380, damping: 36 }, opacity: { duration: .16 } }}
    >
      <button className={`bookmark-cover ${bookmark.image ? '' : 'empty'}`} onClick={onOpen} aria-label={`打开 ${bookmark.title}`}>
        {bookmark.image ? <img src={bookmark.image} alt="" /> : <span>{bookmark.domain.charAt(0).toUpperCase()}</span>}
      </button>
      <div className="card-body">
        <div className="entry-source">
          <span className="source-mark" aria-hidden="true">{bookmark.domain.charAt(0).toUpperCase()}</span>
          <span className="domain">{bookmark.domain}</span>
          <span className={`read-dot ${bookmark.readStatus}`} aria-hidden="true" />
          <span className="read-state">{bookmark.readStatus === 'read' ? '已读' : '未读'}</span>
        </div>
        <button className="entry-title" onClick={onOpen}><h3>{bookmark.title}</h3></button>
        <p>{bookmark.description}</p>
        <div className="entry-detail-row">
          <div className="tag-row">{bookmark.tags.map((tagName) => <span key={tagName}># {tagName}</span>)}</div>
          <div className="entry-meta">
            <span className="entry-date">保存于 {formatDate(bookmark.savedAt)}</span>
            {bookmark.progress > 0 && <span className="progress-value">已阅读 {Math.round(bookmark.progress)}%</span>}
          </div>
        </div>
        {bookmark.progress > 0 && <div className="entry-progress" aria-label={`阅读进度 ${Math.round(bookmark.progress)}%`}><span style={{ width: `${bookmark.progress}%` }} /></div>}
      </div>
      <div className="entry-actions">
        <button className={`card-action note-toggle ${expanded ? 'active' : ''}`} onClick={onToggleExpanded} title={expanded ? '收起批注预览' : '展开批注预览'} aria-label={expanded ? '收起批注预览' : '展开批注预览'}>
          <FileText />{bookmark.annotations.length > 0 && <span>{bookmark.annotations.length}</span>}
        </button>
        <button className={`card-action star ${bookmark.starred ? 'active' : ''}`} onClick={onToggleStar} title={bookmark.starred ? '移出收藏' : '加入收藏'} aria-label={bookmark.starred ? '移出收藏' : '加入收藏'}>
          <Star fill={bookmark.starred ? 'currentColor' : 'none'} />
        </button>
        <button className="card-action" onClick={onToggleMenu} title="更多操作" aria-label="更多操作"><MoreHorizontal /></button>
      </div>
      {menuOpen && (
        <div className="card-menu" onClick={(event) => event.stopPropagation()}>
          <button onClick={onEditTags}><Tag />编辑标签</button>
          <button onClick={onToggleRead}><Check />标记为{bookmark.readStatus === 'read' ? '未读' : '已读'}</button>
          <button className="danger" onClick={onDelete}><Trash2 />删除</button>
        </div>
      )}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div className="annotation-preview" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ type: 'spring', stiffness: 360, damping: 34 }}>
            <div className="preview-rail" />
            <div className="preview-label"><span>A1</span>页边摘录</div>
            <blockquote>{annotation?.type === 'highlight' ? annotation.note || '这条高亮还没有笔记。' : annotation?.text || bookmark.description}</blockquote>
            <p className="preview-note">{annotation?.type === 'highlight' ? '高亮关联笔记' : annotation ? '我的笔记' : '等待第一条笔记'}</p>
            <button className="button small" onClick={onOpen}>进入阅读</button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  )
}


function AnnotationCard({ annotation, label, tags, onEdit, onDelete, onNoteChange, focusNote = false, cardRef }: {
  annotation: Annotation
  label: string
  tags: string[]
  onEdit: () => void
  onDelete: () => void
  onNoteChange: (note: string) => void
  focusNote?: boolean
  cardRef?: (element: HTMLElement | null) => void
}) {
  const appendToHighlightNote = (value: string) => {
    const current = annotation.note ?? ''
    const separator = current && !current.endsWith('\n') ? '\n' : ''
    onNoteChange(`${current}${separator}${value}`)
  }

  const addImageLink = () => {
    const url = window.prompt('输入图片地址')?.trim()
    if (url) appendToHighlightNote(`![图片](${url})`)
  }

  const addLink = () => {
    const url = window.prompt('输入链接地址')?.trim()
    if (url) appendToHighlightNote(url)
  }

  return (
    <motion.article ref={cardRef} data-annotation-id={annotation.id} className={`margin-note ${annotation.type}`} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <span className="margin-note-link" aria-hidden="true" />
      <header>
        <span className="margin-note-badge">{label}</span>
        <time>{formatNoteDate(annotation.createdAt)}</time>
        <button onClick={onEdit} title="编辑笔记"><MoreHorizontal /></button>
      </header>
      {annotation.type === 'highlight' ? (
        <label className="highlight-note-editor">
          <span><span className="highlight-link-state"><i />关联网页高亮</span><em>自动保存</em></span>
          <textarea aria-label={`${label} 的笔记`} autoFocus={focusNote && !annotation.note} value={annotation.note ?? ''} onChange={(event) => onNoteChange(event.target.value)} placeholder="写下你的笔记…" />
        </label>
      ) : <p>{annotation.text}</p>}
      <footer>
        {annotation.type === 'highlight' ? (
          <div className="note-tools">
            <button onClick={addImageLink} title="插入图片链接"><ImageIcon /></button>
            <button onClick={addLink} title="插入链接"><Link2 /></button>
            <button onClick={() => appendToHighlightNote('• ')} title="插入项目符号"><List /></button>
          </div>
        ) : <div className="note-tags">{tags.slice(0, 3).map((tagName) => <span key={tagName}>#{tagName}</span>)}</div>}
        <button className="delete-note" onClick={onDelete} title="删除笔记"><Trash2 /></button>
      </footer>
    </motion.article>
  )
}

function EmptyNotes() {
  return <div className="empty-notes"><FileText /><p>还没有页边笔记</p><span>在网页中拖动选中文字，再点击浮出的“高亮”。</span></div>
}

function BrowserNotesPanel({ bookmark, onEdit, onDelete, onNoteChange }: {
  bookmark: Bookmark
  onEdit: (annotation: Annotation) => void
  onDelete: (id: string) => void
  onNoteChange: (id: string, note: string) => void
}) {
  const labels = annotationLabels(bookmark.annotations)
  return (
    <aside className="notes-panel">
      <div className="annotation-list">
        {bookmark.annotations.length ? bookmark.annotations.map((annotation, index) => (
          <AnnotationCard
            key={annotation.id}
            annotation={annotation}
            label={labels[index]}
            tags={bookmark.tags}
            onEdit={() => onEdit(annotation)}
            onDelete={() => onDelete(annotation.id)}
            onNoteChange={(note) => onNoteChange(annotation.id, note)}
            focusNote={index === 0}
          />
        )) : <EmptyNotes />}
      </div>
    </aside>
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
