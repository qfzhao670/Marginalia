const { ipcRenderer } = require('electron')

window.addEventListener('DOMContentLoaded', () => {
  const svgNamespace = 'http://www.w3.org/2000/svg'
  const connectorHost = document.createElement('div')
  connectorHost.setAttribute('data-marginalia-connectors', '')
  Object.assign(connectorHost.style, {
    position: 'fixed',
    zIndex: '2147483645',
    inset: '0',
    overflow: 'hidden',
    pointerEvents: 'none',
  })
  const connectorShadow = connectorHost.attachShadow({ mode: 'closed' })
  const connectorStyle = document.createElement('style')
  connectorStyle.textContent = `
    :host { display: block; width: 100%; height: 100%; }
    svg { display: block; width: 100%; height: 100%; overflow: hidden; }
    path { fill: none; stroke: #2f5bff; stroke-width: 1.25; stroke-linecap: round; stroke-linejoin: round; vector-effect: non-scaling-stroke; }
    circle { fill: #2f5bff; }
    rect { fill: rgba(255,255,255,.99); stroke: #aebdf7; stroke-width: 1; filter: drop-shadow(0 2px 5px rgba(20,33,61,.12)); vector-effect: non-scaling-stroke; }
    text {
      fill: #244bdb;
      font: 650 11px/1 -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
      text-anchor: middle;
      dominant-baseline: central;
      -webkit-font-smoothing: antialiased;
    }
  `
  const connectorSvg = document.createElementNS(svgNamespace, 'svg')
  connectorSvg.setAttribute('aria-hidden', 'true')
  connectorShadow.append(connectorStyle, connectorSvg)
  document.documentElement.appendChild(connectorHost)

  const host = document.createElement('div')
  host.setAttribute('data-marginalia-selection-tools', '')
  Object.assign(host.style, {
    position: 'fixed',
    zIndex: '2147483647',
    display: 'none',
    pointerEvents: 'none',
    left: '0',
    top: '0',
  })

  const shadow = host.attachShadow({ mode: 'closed' })
  const style = document.createElement('style')
  style.textContent = `
    :host { color-scheme: light; }
    button {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 7px;
      height: 34px;
      padding: 0 12px 0 10px;
      border: 1px solid #c9d1df;
      border-radius: 6px;
      color: #26344d;
      background: rgba(255, 255, 255, .98);
      box-shadow: 0 8px 22px rgba(20, 33, 61, .14), 0 1px 3px rgba(20, 33, 61, .08);
      font: 600 12px/1 -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
      cursor: pointer;
      pointer-events: auto;
      -webkit-font-smoothing: antialiased;
      animation: highlight-tool-in 140ms cubic-bezier(.2, .8, .2, 1);
      transition: color 120ms ease, border-color 120ms ease, box-shadow 120ms ease, transform 120ms ease;
    }
    button::before,
    button::after {
      content: "";
      position: absolute;
      left: 50%;
      top: 100%;
      width: 0;
      height: 0;
      pointer-events: none;
      transform: translateX(-50%);
    }
    button::before {
      border: 6px solid transparent;
      border-top-color: #c9d1df;
    }
    button::after {
      margin-top: -1px;
      border: 5px solid transparent;
      border-top-color: white;
    }
    button:hover {
      color: #244bdb;
      border-color: #91a7f8;
      box-shadow: 0 9px 24px rgba(35, 67, 174, .16), 0 1px 3px rgba(20, 33, 61, .07);
      transform: translateY(-1px);
    }
    button:hover::before { border-top-color: #91a7f8; }
    button:active { transform: translateY(0) scale(.98); }
    button[data-placement="below"]::before,
    button[data-placement="below"]::after {
      top: auto;
      bottom: 100%;
    }
    button[data-placement="below"]::before {
      border-top-color: transparent;
      border-bottom-color: #c9d1df;
    }
    button[data-placement="below"]::after {
      margin-top: 0;
      margin-bottom: -1px;
      border-top-color: transparent;
      border-bottom-color: white;
    }
    button[data-placement="below"]:hover::before {
      border-top-color: transparent;
      border-bottom-color: #91a7f8;
    }
    i {
      position: relative;
      width: 14px;
      height: 8px;
      border-radius: 1px;
      background: #f4e66a;
      box-shadow: inset 0 0 0 1px rgba(20, 33, 61, .1);
      transform: rotate(-3deg);
    }
    i::after {
      content: "";
      position: absolute;
      right: -2px;
      bottom: -3px;
      left: 2px;
      height: 2px;
      border-radius: 999px;
      background: #2f5bff;
      opacity: .85;
    }
    @keyframes highlight-tool-in {
      from { opacity: 0; transform: translateY(4px) scale(.96); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @media (prefers-reduced-motion: reduce) {
      button { animation: none; transition: none; }
    }
  `
  const button = document.createElement('button')
  button.type = 'button'
  button.innerHTML = '<i></i><span>高亮</span>'
  shadow.append(style, button)
  document.documentElement.appendChild(host)

  let selectedPayload = null
  let pressingButton = false
  let highlightItems = []
  let connectorTargets = []
  let highlightRanges = new Map()
  let connectorFrame = 0

  const resolveNodePath = (path) => {
    let node = document.body
    for (const index of path || []) {
      node = node?.childNodes?.[index]
      if (!node) return null
    }
    return node
  }

  const resolveHighlightRanges = () => {
    const ranges = new Map()
    if (!document.body) return ranges
    const used = new WeakMap()
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement
        if (!parent || !node.data.trim()) return NodeFilter.FILTER_REJECT
        if (parent.closest('script, style, noscript, textarea, input, [contenteditable="true"]')) return NodeFilter.FILTER_REJECT
        return NodeFilter.FILTER_ACCEPT
      },
    })
    const nodes = []
    while (walker.nextNode()) nodes.push(walker.currentNode)

    for (const item of highlightItems) {
      let range = null
      if (item.anchor) {
        try {
          const anchor = JSON.parse(item.anchor)
          const startNode = resolveNodePath(anchor.startPath)
          const endNode = resolveNodePath(anchor.endPath)
          if (startNode && endNode) {
            const anchored = document.createRange()
            anchored.setStart(startNode, anchor.startOffset)
            anchored.setEnd(endNode, anchor.endOffset)
            if (anchored.toString().replace(/\s+/g, ' ').trim() === item.text) range = anchored
          }
        } catch {}
      }
      if (!range) {
        for (const node of nodes) {
          const from = used.get(node) || 0
          const start = node.data.indexOf(item.text, from)
          if (start < 0) continue
          range = document.createRange()
          range.setStart(node, start)
          range.setEnd(node, start + item.text.length)
          used.set(node, start + item.text.length)
          break
        }
      }
      if (range) ranges.set(item.id, range)
    }
    return ranges
  }

  const svgElement = (name, attributes = {}) => {
    const element = document.createElementNS(svgNamespace, name)
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value))
    return element
  }

  const rangeBlockRect = (range) => {
    const node = range.endContainer
    const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement
    const block = element?.closest('p, li, blockquote, figcaption, dd, dt, h1, h2, h3, h4, h5, h6')
    if (!block) return null
    const rect = block.getBoundingClientRect()
    return rect.width >= 80 && rect.height > 0 ? rect : null
  }

  const renderConnectors = () => {
    connectorFrame = 0
    connectorSvg.replaceChildren()
    const width = window.innerWidth
    const height = window.innerHeight
    connectorSvg.setAttribute('viewBox', `0 0 ${width} ${height}`)
    const targets = new Map(connectorTargets.map((target) => [target.id, target]))

    for (const item of highlightItems) {
      const target = targets.get(item.id)
      const range = highlightRanges.get(item.id)
      if (!target || !range || target.targetY < 0 || target.targetY > height) continue
      const rects = Array.from(range.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0)
      const rect = rects.at(-1)
      if (!rect || rect.bottom < 0 || rect.top > height) continue

      const sourceY = Math.max(8, Math.min(height - 8, rect.top + rect.height / 2))
      const targetY = Math.max(8, Math.min(height - 8, target.targetY))
      const blockRect = rangeBlockRect(range)
      const readingEdge = blockRect ? blockRect.right : Math.max(...rects.map((itemRect) => itemRect.right))
      let dotX = Math.min(width - 54, Math.max(rect.right + 8, readingEdge + 10))
      let badgeX = dotX + 9
      if (badgeX + 34 > width - 14) {
        badgeX = Math.max(8, width - 54)
        dotX = badgeX - 9
      }
      const pathStart = badgeX + 34
      const bendX = Math.max(pathStart + 14, width - 42)
      const group = svgElement('g', { 'data-highlight-id': item.id })
      const path = svgElement('path', {
        d: `M ${pathStart} ${sourceY} H ${bendX} C ${width - 13} ${sourceY}, ${width - 29} ${targetY}, ${width + 1} ${targetY}`,
      })
      const dot = svgElement('circle', { cx: dotX, cy: sourceY, r: 3.25 })
      const badge = svgElement('rect', { x: badgeX, y: sourceY - 11, width: 34, height: 22, rx: 4 })
      const label = svgElement('text', { x: badgeX + 17, y: sourceY + .5 })
      label.textContent = target.label
      group.append(path, dot, badge, label)
      connectorSvg.appendChild(group)
    }
    connectorHost.dataset.connectorCount = String(connectorSvg.childElementCount)
  }

  const scheduleConnectorRender = () => {
    if (connectorFrame) cancelAnimationFrame(connectorFrame)
    connectorFrame = requestAnimationFrame(renderConnectors)
  }

  ipcRenderer.on('page:highlights', (_event, items) => {
    highlightItems = Array.isArray(items) ? items : []
    highlightRanges = resolveHighlightRanges()
    scheduleConnectorRender()
  })
  ipcRenderer.on('page:connector-targets', (_event, items) => {
    connectorTargets = Array.isArray(items) ? items : []
    scheduleConnectorRender()
  })

  const hide = () => {
    host.style.display = 'none'
    selectedPayload = null
  }

  const nodePath = (node) => {
    const path = []
    let current = node
    while (current && current !== document.body) {
      const parent = current.parentNode
      if (!parent) return null
      path.unshift(Array.prototype.indexOf.call(parent.childNodes, current))
      current = parent
    }
    return current === document.body ? path : null
  }

  const selectionAnchor = (range) => {
    const startPath = nodePath(range.startContainer)
    const endPath = nodePath(range.endContainer)
    if (!startPath || !endPath) return undefined
    return JSON.stringify({
      startPath,
      startOffset: range.startOffset,
      endPath,
      endOffset: range.endOffset,
    })
  }

  const showForSelection = () => {
    if (pressingButton) return
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed || !selection.rangeCount) {
      hide()
      return
    }
    const range = selection.getRangeAt(0)
    const text = selection.toString().replace(/\s+/g, ' ').trim().slice(0, 1000)
    if (!text || !document.body.contains(range.commonAncestorContainer)) {
      hide()
      return
    }
    const rect = range.getBoundingClientRect()
    if (!rect.width && !rect.height) {
      hide()
      return
    }
    selectedPayload = { text, anchor: selectionAnchor(range) }
    host.style.display = 'block'
    const width = 76
    const left = Math.max(8, Math.min(window.innerWidth - width - 8, rect.left + rect.width / 2 - width / 2))
    const placeAbove = rect.top > 48
    const top = placeAbove ? rect.top - 43 : Math.min(window.innerHeight - 44, rect.bottom + 8)
    button.dataset.placement = placeAbove ? 'above' : 'below'
    host.style.left = `${Math.round(left)}px`
    host.style.top = `${Math.round(top)}px`
  }

  button.addEventListener('mousedown', (event) => {
    pressingButton = true
    event.preventDefault()
    event.stopPropagation()
  })
  button.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (selectedPayload) ipcRenderer.send('page:save-highlight', selectedPayload)
    window.getSelection()?.removeAllRanges()
    pressingButton = false
    hide()
  })
  document.addEventListener('mouseup', () => window.setTimeout(showForSelection, 0), true)
  document.addEventListener('mousedown', (event) => {
    if (event.composedPath().includes(host)) return
    hide()
  }, true)
  document.addEventListener('keydown', (event) => event.key === 'Escape' && hide(), true)
  window.addEventListener('scroll', () => {
    hide()
    scheduleConnectorRender()
  }, true)
  window.addEventListener('resize', () => {
    hide()
    scheduleConnectorRender()
  })
  window.addEventListener('pagehide', hide)
})
