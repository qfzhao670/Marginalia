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
    g[data-upgraded="true"] path { stroke: #b52a35; }
    g[data-upgraded="true"] circle { fill: #b52a35; }
    g[data-upgraded="true"] rect { fill: #b52a35; stroke: #b52a35; filter: drop-shadow(0 2px 5px rgba(120,25,34,.16)); }
    g[data-upgraded="true"] text { fill: #fff; }
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
    .selection-bar {
      position: relative;
      display: inline-flex;
      padding: 3px;
      border: 1px solid #c9d1df;
      border-radius: 6px;
      background: rgba(255, 255, 255, .98);
      box-shadow: 0 8px 22px rgba(20, 33, 61, .14), 0 1px 3px rgba(20, 33, 61, .08);
      pointer-events: auto;
      -webkit-font-smoothing: antialiased;
      animation: highlight-tool-in 140ms cubic-bezier(.2, .8, .2, 1);
    }
    .selection-bar::before,
    .selection-bar::after {
      content: "";
      position: absolute;
      left: 50%;
      top: 100%;
      width: 0;
      height: 0;
      pointer-events: none;
      transform: translateX(-50%);
    }
    .selection-bar::before {
      border: 6px solid transparent;
      border-top-color: #c9d1df;
    }
    .selection-bar::after {
      margin-top: -1px;
      border: 5px solid transparent;
      border-top-color: white;
    }
    button {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 30px;
      padding: 0 9px;
      border: 0;
      border-radius: 4px;
      color: #26344d;
      background: transparent;
      font: 600 12px/1 -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
      cursor: pointer;
      transition: color 120ms ease, background 120ms ease;
    }
    button:hover { color: #244bdb; background: #edf1ff; }
    button + button { border-left: 1px solid #e2e6ed; border-radius: 0 4px 4px 0; }
    .selection-bar[data-placement="below"]::before,
    .selection-bar[data-placement="below"]::after {
      top: auto;
      bottom: 100%;
    }
    .selection-bar[data-placement="below"]::before {
      border-top-color: transparent;
      border-bottom-color: #c9d1df;
    }
    .selection-bar[data-placement="below"]::after {
      margin-top: 0;
      margin-bottom: -1px;
      border-top-color: transparent;
      border-bottom-color: white;
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
  const selectionBar = document.createElement('div')
  selectionBar.className = 'selection-bar'
  const highlightButton = document.createElement('button')
  highlightButton.type = 'button'
  highlightButton.innerHTML = '<i></i><span>高亮</span>'
  const askButton = document.createElement('button')
  askButton.type = 'button'
  askButton.textContent = '问伴航'
  selectionBar.append(highlightButton, askButton)
  shadow.append(style, selectionBar)
  document.documentElement.appendChild(host)

  const aiHost = document.createElement('div')
  aiHost.setAttribute('data-marginalia-ai-companion', '')
  Object.assign(aiHost.style, {
    position: 'fixed',
    zIndex: '2147483646',
    left: '0',
    top: '0',
    visibility: 'hidden',
    pointerEvents: 'none',
  })
  const aiShadow = aiHost.attachShadow({ mode: 'closed' })
  const aiStyle = document.createElement('style')
  aiStyle.textContent = `
    :host { color-scheme: light; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Microsoft YaHei", sans-serif; }
    * { box-sizing: border-box; }
    .companion { position: relative; width: 60px; height: 60px; pointer-events: auto; }
    .orb {
      position: relative;
      display: grid;
      place-items: center;
      width: 60px;
      height: 60px;
      margin-left: auto;
      padding: 0;
      border: 0;
      border-radius: 50%;
      color: white;
      background: transparent;
      box-shadow: 0 14px 34px rgba(20,33,61,.3), 0 3px 9px rgba(20,33,61,.16);
      cursor: grab;
      touch-action: none;
      user-select: none;
      transition: transform 160ms cubic-bezier(.2,.8,.2,1), box-shadow 160ms ease;
    }
    .orb::before {
      content: "";
      position: absolute;
      inset: -5px;
      z-index: -1;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(78,112,255,.3), rgba(47,91,255,0) 68%);
      animation: orb-aura 3.8s ease-in-out infinite;
    }
    .orb::after {
      content: "";
      position: absolute;
      inset: 3px;
      z-index: 2;
      border: 1px solid rgba(255,255,255,.58);
      border-radius: 50%;
      background: linear-gradient(145deg, rgba(255,255,255,.25), transparent 30%, transparent 70%, rgba(9,24,67,.14));
      box-shadow: inset 0 0 0 4px rgba(255,255,255,.055), inset 0 -9px 18px rgba(8,23,68,.2);
      pointer-events: none;
    }
    .orb-canvas { position: absolute; inset: 0; width: 60px; height: 60px; border-radius: 50%; }
    .orb:hover { transform: translateY(-2px) scale(1.035); box-shadow: 0 18px 38px rgba(20,33,61,.34), 0 4px 10px rgba(20,33,61,.18); }
    .orb:active { transform: scale(.98); }
    .companion.dragging .orb { cursor: grabbing; transform: scale(1.055); transition: none; box-shadow: 0 20px 42px rgba(20,33,61,.36); }
    .orb:focus-visible { outline: 2px solid #2f5bff; outline-offset: 3px; }
    button:focus-visible, input:focus-visible, textarea:focus-visible { outline: 2px solid #212121; outline-offset: 3px; }
    .orb-mark { position: relative; z-index: 3; color: rgba(255,255,255,.96); font: 700 22px/1 Georgia, serif; letter-spacing: -.08em; text-shadow: 0 1px 5px rgba(6,22,67,.42); transform: translateX(-1px); pointer-events: none; }
    .orb-note { position: absolute; right: 2px; bottom: 4px; z-index: 4; width: 15px; height: 12px; border: 2px solid #2f5bff; border-radius: 2px; background: #f4e66a; box-shadow: 0 2px 5px rgba(20,33,61,.2); transform: rotate(-7deg); pointer-events: none; }
    .companion.thinking .orb::before { animation-duration: 1.15s; }
    .companion.thinking .orb-note { animation: note-pulse .9s ease-in-out infinite; }
    .panel {
      position: absolute;
      right: 0;
      bottom: 74px;
      display: grid;
      grid-template-rows: auto minmax(0,1fr) auto;
      width: min(680px, calc(100vw - 28px));
      height: min(720px, calc(100vh - 96px));
      overflow: hidden;
      border: 1px solid #e1e1e1;
      border-radius: 22px;
      background: #fff;
      box-shadow: 0 24px 72px rgba(0,0,0,.16), 0 2px 10px rgba(0,0,0,.06);
      opacity: 0;
      visibility: hidden;
      transform: translateY(12px) scale(.975);
      transform-origin: right bottom;
      transition: opacity 170ms ease, transform 190ms cubic-bezier(.2,.8,.2,1), visibility 170ms;
    }
    .companion[data-panel-h="right"] .panel { right: auto; left: 0; transform-origin: left bottom; }
    .companion[data-panel-v="below"] .panel { top: 74px; bottom: auto; transform-origin: right top; }
    .companion[data-panel-h="right"][data-panel-v="below"] .panel { transform-origin: left top; }
    .companion.open .panel { opacity: 1; visibility: visible; transform: translateY(0) scale(1); }
    .companion.open .orb { box-shadow: 0 0 0 4px rgba(47,91,255,.16), 0 12px 30px rgba(20,33,61,.25); }
    .panel-header { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 11px; min-height: 64px; padding: 11px 12px 11px 18px; border-bottom: 1px solid #ececec; background: rgba(255,255,255,.96); }
    .header-glyph { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 50%; color: white; background: #212121; font: 700 14px/1 Georgia, serif; }
    .panel-title { min-width: 0; }
    .panel-title strong { display: block; color: #171717; font-size: 15px; font-weight: 600; line-height: 1.25; }
    .panel-title span { display: block; margin-top: 3px; overflow: hidden; color: #8a8a8a; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
    .header-actions { display: flex; gap: 2px; }
    .icon-button { display: grid; place-items: center; width: 32px; height: 32px; padding: 0; border: 0; border-radius: 8px; color: #777; background: transparent; cursor: pointer; }
    .icon-button:hover { color: #171717; background: #f2f2f2; }
    .icon-button:disabled { opacity: .38; cursor: default; }
    .companion.settings-mode .header-actions .settings { color: #171717; background: #f1f1f1; }
    .companion.settings-mode .header-actions .new-chat, .companion.settings-mode .header-actions .history { display: none; }
    .companion.settings-mode .thread, .companion.settings-mode .composer-shell, .companion.settings-mode .history-view { display: none; }
    .companion.history-mode .header-actions .history { color: #171717; background: #f1f1f1; }
    .companion.history-mode .thread, .companion.history-mode .composer-shell { display: none; }
    .thread { min-height: 0; padding: 24px 30px 34px; overflow: auto; background: #fff; scrollbar-width: thin; scrollbar-color: #d6d6d6 transparent; }
    .welcome { max-width: 460px; margin: 38px auto 0; padding: 0; }
    .welcome h2 { margin: 0; color: #171717; font-size: 26px; font-weight: 600; line-height: 1.28; letter-spacing: -.025em; }
    .welcome p { margin: 10px 0 26px; color: #6b6b6b; font-size: 13px; line-height: 1.65; }
    .quick-actions { display: grid; gap: 8px; }
    .quick-action { display: grid; grid-template-columns: 32px 1fr; align-items: center; gap: 11px; min-height: 54px; padding: 9px 12px; border: 0; border-radius: 14px; color: #2f2f2f; background: #f7f7f7; text-align: left; font: 500 13px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif; cursor: pointer; transition: background 140ms ease; }
    .quick-action:hover { background: #ececec; }
    .quick-action b { display: grid; place-items: center; width: 30px; height: 30px; border: 1px solid #dedede; border-radius: 9px; color: #404040; background: #fff; font-family: Georgia, serif; font-size: 13px; font-weight: 600; }
    .message { position: relative; margin: 0 0 28px; padding: 0; }
    .message.user { display: flex; flex-direction: column; align-items: flex-end; margin: 2px 0 26px; }
    .message-label { display: flex; align-items: center; gap: 8px; margin-bottom: 9px; color: #3f3f3f; font-size: 12px; font-weight: 600; }
    .message.assistant .message-label::before { content: "M"; display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; color: #fff; background: #212121; font: 700 11px/1 Georgia, serif; }
    .message.user .message-label { display: none; }
    .message-body { color: #242424; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; font-size: 14.5px; line-height: 1.72; letter-spacing: .005em; overflow-wrap: anywhere; }
    .message.user .message-body { max-width: 86%; padding: 10px 14px; border-radius: 18px 18px 5px 18px; color: #242424; background: #f2f2f2; line-height: 1.6; white-space: pre-wrap; }
    .message-body > :first-child { margin-top: 0; }
    .message-body > :last-child { margin-bottom: 0; }
    .message-body p { margin: 0 0 14px; }
    .message-body h1, .message-body h2, .message-body h3, .message-body h4 { margin: 22px 0 10px; color: #171717; font-family: inherit; font-weight: 700; line-height: 1.35; }
    .message-body h1 { font-size: 20px; }
    .message-body h2 { font-size: 17px; }
    .message-body h3 { font-size: 15px; }
    .message-body h4 { font-size: 14.5px; }
    .message-body ul, .message-body ol { margin: 8px 0 16px; padding-left: 24px; }
    .message-body li { margin: 6px 0; padding-left: 4px; }
    .message-body li::marker { color: #555; font-weight: 600; }
    .message-body strong { color: #171717; font-weight: 700; }
    .message-body em { color: #454545; }
    .message-body code { padding: 2px 5px; border: 0; border-radius: 5px; color: #242424; background: #ececec; font: 12px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; }
    .message-body pre { margin: 14px 0 16px; padding: 14px 16px; overflow: auto; border: 1px solid #e3e3e3; border-radius: 10px; background: #f7f7f7; }
    .message-body pre code { padding: 0; border: 0; color: #242424; background: transparent; white-space: pre; }
    .message-body blockquote { margin: 12px 0 16px; padding: 8px 12px; border-left: 3px solid #b8b8b8; color: #555; background: #f7f7f7; }
    .message-body blockquote p { margin: 0; }
    .message-body a { color: #212121; text-decoration: underline; text-decoration-color: #8f8f8f; text-underline-offset: 2px; }
    .message-body hr { height: 1px; margin: 14px 0; border: 0; background: #dfe3ea; }
    .message-body table { width: 100%; margin: 14px 0 16px; border-collapse: collapse; font-family: inherit; font-size: 12px; line-height: 1.55; }
    .message-body th, .message-body td { padding: 8px 9px; border: 1px solid #dedede; text-align: left; vertical-align: top; }
    .message-body th { color: #242424; background: #f5f5f5; font-weight: 650; }
    .message-body.streaming::after { content: ""; display: inline-block; width: 6px; height: 13px; margin-left: 2px; vertical-align: -2px; background: #212121; animation: stream-caret .8s steps(1) infinite; }
    .source { display: -webkit-box; max-width: 86%; margin: 7px 0 0; padding: 7px 10px; overflow: hidden; border-radius: 9px; color: #777; background: #fafafa; font-size: 10px; line-height: 1.5; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
    .thinking { display: inline-flex; gap: 4px; padding: 7px 0; }
    .thinking i { width: 5px; height: 5px; border-radius: 50%; background: #555; animation: blink 1s infinite ease-in-out; }
    .thinking i:nth-child(2) { animation-delay: .15s; }.thinking i:nth-child(3) { animation-delay: .3s; }
    .context-banner { display: none; grid-column: 1 / -1; align-items: flex-start; gap: 9px; min-width: 0; margin: 0 0 1px; padding: 8px 10px; border-left: 2px solid #b4b4b4; border-radius: 9px; color: #6b6b6b; background: #e7e7e7; font-size: 10px; line-height: 1.5; }
    .context-banner.visible { display: flex; }
    .context-banner span { display: -webkit-box; flex: 1; min-width: 0; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 3; }
    .context-banner span::before { content: "引用原文"; display: block; margin-bottom: 2px; color: #303030; font-weight: 650; }
    .context-banner button { flex: 0 0 auto; width: 18px; height: 18px; padding: 0; border: 0; border-radius: 4px; color: #6b6b6b; background: transparent; cursor: pointer; }
    .context-banner button:hover { color: #202020; background: #dedede; }
    .composer-shell { padding: 12px 16px 8px; border-top: 0; background: #fff; }
    .composer { display: grid; grid-template-columns: minmax(0,1fr) 36px; align-items: end; gap: 8px; min-height: 58px; margin: 0 0 7px; padding: 10px 10px 10px 14px; border: 1px solid transparent; border-radius: 26px; background: #f4f4f4; box-shadow: none; transition: border-color 140ms ease; }
    .composer:focus-within { border-color: #c7c7c7; background: #f4f4f4; box-shadow: none; }
    textarea { display: block; width: 100%; min-height: 36px; max-height: 120px; padding: 8px 0 7px; resize: none; overflow-y: auto; border: 0; outline: 0 !important; box-shadow: none !important; color: #222; background: transparent; font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif; }
    textarea::placeholder { color: #8c8c8c; }
    .send { display: grid; place-items: center; width: 36px; height: 36px; padding: 0; border: 0; border-radius: 50%; color: white; background: #212121; box-shadow: none; cursor: pointer; }
    .send:hover:not(:disabled) { background: #000; }
    .send svg { width: 17px; height: 17px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .send:disabled { color: #aaa; background: #e7e7e7; cursor: default; }
    .privacy { margin: 0 10px 2px; color: #aaa; font-size: 9px; text-align: center; }
    .history-view { display: none; grid-row: 2 / 4; min-height: 0; flex-direction: column; overflow: hidden; background: #fafafa; }
    .companion.history-mode .history-view { display: flex; }
    .history-heading { padding: 22px 24px 14px; border-bottom: 1px solid #ececec; background: #fff; }
    .history-heading strong { display: block; color: #202020; font-size: 15px; font-weight: 650; }
    .history-heading span { display: block; margin-top: 5px; color: #7b7b7b; font-size: 11px; line-height: 1.5; }
    .history-list { min-height: 0; padding: 10px; overflow: auto; }
    .history-empty { margin: 44px auto; color: #898989; font-size: 12px; text-align: center; }
    .history-row { display: grid; grid-template-columns: minmax(0,1fr) 34px; gap: 5px; margin-bottom: 5px; }
    .history-open { min-width: 0; padding: 11px 13px; border: 1px solid transparent; border-radius: 10px; color: #252525; background: transparent; text-align: left; cursor: pointer; }
    .history-open:hover { border-color: #dedede; background: #fff; }
    .history-open strong, .history-open span { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .history-open strong { font-size: 12px; font-weight: 600; }
    .history-open span { margin-top: 5px; color: #858585; font-size: 10px; }
    .history-delete { align-self: center; width: 30px; height: 30px; padding: 0; border: 0; border-radius: 8px; color: #999; background: transparent; cursor: pointer; }
    .history-delete:hover { color: #a33b32; background: #f8eae8; }
    .settings-view { display: none; grid-row: 2 / 4; min-height: 0; padding: 18px 16px 20px; overflow: auto; background: #fff; }
    .companion.settings-mode .settings-view { display: block; }
    .settings-intro { margin: 0 0 16px; color: #6b6b6b; font-size: 11px; line-height: 1.65; }
    .widget-field { display: block; margin: 12px 0 6px; color: #353535; font-size: 11px; font-weight: 650; }
    .widget-field span { color: #8a8a8a; font-size: 9px; font-weight: 400; }
    .widget-input { width: 100%; height: 40px; padding: 0 10px; border: 1px solid #d0d0d0; border-radius: 8px; outline: 0; color: #242424; background: white; font: 12px/1 -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif; }
    .widget-input:focus { border-color: #8c8c8c; box-shadow: 0 0 0 3px rgba(0,0,0,.06); }
    .widget-secret { position: relative; }
    .widget-secret .widget-input { padding-right: 86px; }
    .key-action { position: absolute; top: 4px; right: 4px; height: 32px; padding: 0 9px; border: 0; border-radius: 4px; color: #666; background: transparent; font: 550 10px/1 -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif; cursor: pointer; }
    .key-action:hover { color: #171717; background: #f0f0f0; }
    .key-action.paste { right: 48px; }
    .key-action[hidden] { display: none; }
    .widget-status { min-height: 18px; margin: 8px 0 0; color: #6b6b6b; font-size: 10px; line-height: 1.5; }
    .widget-status.error { color: #b24337; }
    .widget-save { display: inline-flex; align-items: center; justify-content: center; min-width: 116px; height: 38px; margin-top: 8px; padding: 0 14px; border: 1px solid #212121; border-radius: 8px; color: white; background: #212121; font: 600 11px/1 -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif; cursor: pointer; }
    .widget-save:hover { background: #000; }
    .widget-save:disabled { opacity: .45; cursor: default; }
    @keyframes blink { 0%,80%,100% { opacity: .25; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-2px); } }
    @keyframes stream-caret { 0%,48% { opacity: 1; } 49%,100% { opacity: 0; } }
    @keyframes orb-aura { 0%,100% { opacity: .58; transform: scale(.9); } 50% { opacity: 1; transform: scale(1.09); } }
    @keyframes note-pulse { 0%,100% { transform: rotate(-7deg) scale(1); } 50% { transform: rotate(-2deg) scale(1.12); } }
    @media (max-width: 560px) { .thread { padding: 20px 18px 26px; } .composer-shell { padding-right: 12px; padding-left: 12px; } }
    @media (prefers-reduced-motion: reduce) { .panel, .orb { transition: none; } .thinking i, .orb::before, .orb-note, .message-body.streaming::after { animation: none !important; } }
  `
  const companion = document.createElement('div')
  companion.className = 'companion'
  companion.innerHTML = `
    <section class="panel" role="dialog" aria-label="阅读伴航">
      <header class="panel-header">
        <span class="header-glyph">M</span>
        <div class="panel-title"><strong>阅读伴航</strong><span></span></div>
        <div class="header-actions">
          <button class="icon-button history" type="button" title="历史对话" aria-label="查看历史对话">◷</button>
          <button class="icon-button new-chat" type="button" title="新对话" aria-label="开始新对话">＋</button>
          <button class="icon-button settings" type="button" title="AI 设置" aria-label="打开 AI 设置">⚙</button>
          <button class="icon-button close" type="button" title="收起" aria-label="收起阅读伴航">×</button>
        </div>
      </header>
      <div class="thread"></div>
      <div class="composer-shell">
        <div class="composer"><div class="context-banner"><span></span><button type="button" aria-label="移除引用原文">×</button></div><textarea rows="1" placeholder="问问这篇文章…" aria-label="向阅读伴航提问"></textarea><button class="send" type="button" aria-label="发送"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" /></svg></button></div>
        <p class="privacy">回答基于当前网页；重要信息请回到原文核对</p>
      </div>
      <section class="history-view" aria-label="历史对话">
        <div class="history-heading"><strong>这个网页的对话</strong><span>选择一条历史对话继续追问，或开始一条新对话。</span></div>
        <div class="history-list"></div>
      </section>
      <form class="settings-view">
        <p class="settings-intro">配置 OpenAI-compatible 服务。设置会保存在 Marginalia 本机，不会改变或刷新当前网页。</p>
        <label class="widget-field" for="marginalia-ai-url">服务地址</label>
        <input class="widget-input settings-url" id="marginalia-ai-url" placeholder="http://127.0.0.1:11434/v1" required />
        <label class="widget-field" for="marginalia-ai-model">模型名称</label>
        <input class="widget-input settings-model" id="marginalia-ai-model" placeholder="qwen3:4b" required />
        <label class="widget-field" for="marginalia-ai-key">API Key <span class="key-hint">本地模型可留空</span></label>
        <div class="widget-secret">
          <input class="widget-input settings-key" id="marginalia-ai-key" type="password" placeholder="sk-…" autocomplete="off" />
          <button class="key-action paste" type="button" hidden>粘贴</button>
          <button class="key-action visibility" type="button">显示</button>
        </div>
        <p class="widget-status" role="status"></p>
        <button class="widget-save" type="submit">保存配置</button>
      </form>
    </section>
    <button class="orb" type="button" title="拖动移动，点击打开" aria-label="打开阅读伴航，可拖动" aria-expanded="false"><canvas class="orb-canvas" aria-hidden="true"></canvas><span class="orb-mark">M</span><span class="orb-note"></span></button>
  `
  aiShadow.append(aiStyle, companion)
  document.documentElement.appendChild(aiHost)

  let selectedPayload = null
  let pressingButton = false
  let highlightItems = []
  let connectorTargets = []
  let highlightRanges = new Map()
  let connectorFrame = 0
  let pageScrollFrame = 0
  let pageScrollOccurredAt = 0
  let lastPageInteractionAt = 0
  let aiConversations = []
  let activeConversationId = ''
  let aiMessages = []
  let aiBusy = false
  let busyConversationId = ''
  let pendingSelection = ''

  const aiPanelTitle = companion.querySelector('.panel-title span')
  const aiThread = companion.querySelector('.thread')
  const aiTextarea = companion.querySelector('textarea')
  const aiSend = companion.querySelector('.send')
  const aiOrb = companion.querySelector('.orb')
  const orbCanvas = companion.querySelector('.orb-canvas')
  const aiContext = companion.querySelector('.context-banner')
  const aiContextText = aiContext.querySelector('span')
  const panelHeading = companion.querySelector('.panel-title strong')
  const historyToggle = companion.querySelector('.header-actions .history')
  const newChatButton = companion.querySelector('.header-actions .new-chat')
  const historyList = companion.querySelector('.history-list')
  const settingsToggle = companion.querySelector('.header-actions .settings')
  const settingsForm = companion.querySelector('.settings-view')
  const settingsUrl = companion.querySelector('.settings-url')
  const settingsModel = companion.querySelector('.settings-model')
  const settingsKey = companion.querySelector('.settings-key')
  const settingsKeyHint = companion.querySelector('.key-hint')
  const settingsVisibility = companion.querySelector('.key-action.visibility')
  const settingsPaste = companion.querySelector('.key-action.paste')
  const settingsStatus = companion.querySelector('.widget-status')
  const settingsSave = companion.querySelector('.widget-save')

  const ORB_SIZE = 60
  const VIEWPORT_GUTTER = 12
  let companionX = 0
  let companionY = 0
  let companionRatio = { x: 1, y: 1 }
  let dragState = null
  let suppressOrbClick = false

  const clampCompanionPosition = (x, y) => ({
    x: Math.max(VIEWPORT_GUTTER, Math.min(window.innerWidth - ORB_SIZE - VIEWPORT_GUTTER, x)),
    y: Math.max(VIEWPORT_GUTTER, Math.min(window.innerHeight - ORB_SIZE - VIEWPORT_GUTTER, y)),
  })

  const positionFromRatio = (ratio = companionRatio) => {
    companionRatio = {
      x: Math.max(0, Math.min(1, Number(ratio?.x) || 0)),
      y: Math.max(0, Math.min(1, Number(ratio?.y) || 0)),
    }
    const width = Math.max(1, window.innerWidth - ORB_SIZE - VIEWPORT_GUTTER * 2)
    const height = Math.max(1, window.innerHeight - ORB_SIZE - VIEWPORT_GUTTER * 2)
    companionX = VIEWPORT_GUTTER + width * companionRatio.x
    companionY = VIEWPORT_GUTTER + height * companionRatio.y
    aiHost.style.transform = `translate3d(${Math.round(companionX)}px, ${Math.round(companionY)}px, 0)`
  }

  const updateRatioFromPosition = () => {
    const width = Math.max(1, window.innerWidth - ORB_SIZE - VIEWPORT_GUTTER * 2)
    const height = Math.max(1, window.innerHeight - ORB_SIZE - VIEWPORT_GUTTER * 2)
    companionRatio = {
      x: Math.max(0, Math.min(1, (companionX - VIEWPORT_GUTTER) / width)),
      y: Math.max(0, Math.min(1, (companionY - VIEWPORT_GUTTER) / height)),
    }
  }

  const placePanel = () => {
    const panelWidth = Math.min(680, window.innerWidth - 28)
    const panelHeight = Math.min(720, window.innerHeight - 96)
    const canOpenRight = companionX + panelWidth <= window.innerWidth - VIEWPORT_GUTTER
    const canOpenBelow = companionY + 74 + panelHeight <= window.innerHeight - VIEWPORT_GUTTER
    const canOpenAbove = companionY - 14 - panelHeight >= VIEWPORT_GUTTER
    companion.dataset.panelH = canOpenRight ? 'right' : 'left'
    companion.dataset.panelV = canOpenAbove || !canOpenBelow ? 'above' : 'below'
  }

  const setAiOpen = (open) => {
    if (open) placePanel()
    if (!open && companion.classList.contains('settings-mode')) leaveWidgetSettings()
    if (!open) companion.classList.remove('history-mode')
    companion.classList.toggle('open', open)
    aiOrb.setAttribute('aria-expanded', String(open))
    aiOrb.setAttribute('aria-label', open ? '收起阅读伴航，可拖动' : '打开阅读伴航，可拖动')
    if (open) window.setTimeout(() => aiTextarea.focus(), 190)
  }

  const setSettingsStatus = (message = '', error = false) => {
    settingsStatus.textContent = message
    settingsStatus.classList.toggle('error', error)
  }

  const resetSettingsSecret = () => {
    settingsKey.value = ''
    settingsKey.type = 'password'
    settingsVisibility.textContent = '显示'
    settingsPaste.hidden = true
  }

  const leaveWidgetSettings = () => {
    companion.classList.remove('settings-mode')
    panelHeading.textContent = '阅读伴航'
    settingsToggle.textContent = '⚙'
    settingsToggle.setAttribute('aria-label', '打开 AI 设置')
    settingsToggle.title = 'AI 设置'
    resetSettingsSecret()
    setSettingsStatus()
  }

  const enterWidgetSettings = async () => {
    companion.classList.remove('history-mode')
    companion.classList.add('settings-mode')
    panelHeading.textContent = 'AI 设置'
    settingsToggle.textContent = '←'
    settingsToggle.setAttribute('aria-label', '返回对话')
    settingsToggle.title = '返回对话'
    settingsSave.disabled = true
    setSettingsStatus('正在读取配置…')
    try {
      const config = await ipcRenderer.invoke('ai:config:get')
      settingsUrl.value = config?.baseUrl || ''
      settingsModel.value = config?.model || ''
      settingsKey.dataset.hasKey = String(Boolean(config?.hasApiKey))
      settingsKey.placeholder = config?.hasApiKey ? '••••••••••••' : 'sk-…'
      settingsKeyHint.textContent = config?.hasApiKey ? '已保存' : '本地模型可留空'
      setSettingsStatus()
    } catch {
      setSettingsStatus('无法读取 AI 配置', true)
    } finally {
      settingsSave.disabled = false
    }
  }

  const orbContext = orbCanvas.getContext('2d')
  const reduceOrbMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  let orbPointer = { x: 0, y: 0 }
  let orbPointerTarget = { x: 0, y: 0 }

  const sizeOrbCanvas = () => {
    const density = Math.min(2, window.devicePixelRatio || 1)
    orbCanvas.width = ORB_SIZE * density
    orbCanvas.height = ORB_SIZE * density
    orbContext.setTransform(density, 0, 0, density, 0, 0)
  }

  const drawOrb = (rawTime = 0) => {
    const time = reduceOrbMotion.matches ? 0 : rawTime
    const speed = aiBusy ? .0022 : .00055
    const phase = time * speed
    orbPointer.x += (orbPointerTarget.x - orbPointer.x) * .075
    orbPointer.y += (orbPointerTarget.y - orbPointer.y) * .075
    const centerX = 30 + orbPointer.x * 1.5
    const centerY = 30 + orbPointer.y * 1.5
    orbContext.clearRect(0, 0, ORB_SIZE, ORB_SIZE)
    orbContext.save()
    orbContext.beginPath()
    orbContext.arc(30, 30, 29, 0, Math.PI * 2)
    orbContext.clip()

    const base = orbContext.createLinearGradient(
      5 + Math.cos(phase) * 9,
      5 + Math.sin(phase) * 9,
      55 + Math.sin(phase) * 7,
      55 + Math.cos(phase) * 7,
    )
    base.addColorStop(0, '#14213d')
    base.addColorStop(.4, '#244ce2')
    base.addColorStop(.72, '#2f5bff')
    base.addColorStop(1, '#14213d')
    orbContext.fillStyle = base
    orbContext.fillRect(0, 0, 60, 60)

    orbContext.globalCompositeOperation = 'screen'
    const lights = [
      { x: centerX + Math.cos(phase * 1.4) * 13, y: centerY + Math.sin(phase * 1.1) * 12, r: 21, color: '121,221,255' },
      { x: centerX + Math.cos(phase * .8 + 2.4) * 16, y: centerY + Math.sin(phase * 1.3 + 1.2) * 15, r: 18, color: '77,103,255' },
      { x: centerX + Math.sin(phase * 1.7 + .5) * 10, y: centerY + Math.cos(phase * .9 + 2.1) * 13, r: 13, color: '244,230,106' },
    ]
    for (const light of lights) {
      const glow = orbContext.createRadialGradient(light.x, light.y, 0, light.x, light.y, light.r)
      glow.addColorStop(0, `rgba(${light.color},.55)`)
      glow.addColorStop(.45, `rgba(${light.color},.18)`)
      glow.addColorStop(1, `rgba(${light.color},0)`)
      orbContext.fillStyle = glow
      orbContext.fillRect(light.x - light.r, light.y - light.r, light.r * 2, light.r * 2)
    }

    orbContext.globalCompositeOperation = 'source-over'
    for (let index = 0; index < 3; index += 1) {
      orbContext.save()
      orbContext.translate(centerX, centerY)
      orbContext.rotate(phase * (.38 + index * .11) + index * 1.8)
      orbContext.beginPath()
      orbContext.ellipse(0, 0, 22 - index * 3.4, 10 + index * 2.6, 0, 0, Math.PI * 2)
      orbContext.strokeStyle = `rgba(255,255,255,${.22 - index * .04})`
      orbContext.lineWidth = .75
      orbContext.stroke()
      orbContext.restore()
    }

    for (let index = 0; index < 7; index += 1) {
      const angle = phase * (aiBusy ? 1.9 : .72) + index * .9
      const distance = 18 + (index % 3) * 3
      const x = centerX + Math.cos(angle) * distance
      const y = centerY + Math.sin(angle * 1.13) * distance
      orbContext.beginPath()
      orbContext.arc(x, y, index % 2 ? 1.15 : .75, 0, Math.PI * 2)
      orbContext.fillStyle = index === 5 ? 'rgba(244,230,106,.92)' : 'rgba(255,255,255,.68)'
      orbContext.fill()
    }
    orbContext.restore()
    if (!reduceOrbMotion.matches) window.requestAnimationFrame(drawOrb)
  }

  sizeOrbCanvas()
  window.requestAnimationFrame(drawOrb)

  ipcRenderer.invoke('page:companion-position:get').then((saved) => {
    positionFromRatio(saved || { x: 1, y: 1 })
  }).catch(() => positionFromRatio({ x: 1, y: 1 })).finally(() => {
    aiHost.style.visibility = 'visible'
  })

  const scrollAiToEnd = () => window.requestAnimationFrame(() => {
    aiThread.scrollTop = aiThread.scrollHeight
  })

  const updateContextBanner = () => {
    aiContext.classList.toggle('visible', Boolean(pendingSelection))
    aiContextText.textContent = pendingSelection ? `“${pendingSelection}”` : ''
    aiTextarea.placeholder = pendingSelection ? '针对这段原文提问…' : '问问这篇文章…'
  }

  const safeLink = (value) => {
    try {
      const url = new URL(value, location.href)
      return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? url.href : ''
    } catch {
      return ''
    }
  }

  const appendInlineMarkdown = (parent, value) => {
    const text = String(value || '')
    let index = 0
    let plain = ''
    const flush = () => {
      if (!plain) return
      parent.appendChild(document.createTextNode(plain))
      plain = ''
    }
    const appendDelimited = (marker, tag) => {
      if (!text.startsWith(marker, index)) return false
      flush()
      const start = index + marker.length
      const end = text.indexOf(marker, start)
      const element = document.createElement(tag)
      appendInlineMarkdown(element, text.slice(start, end < 0 ? text.length : end))
      if (element.textContent) parent.appendChild(element)
      index = end < 0 ? text.length : end + marker.length
      return true
    }
    while (index < text.length) {
      if (text[index] === '\\' && index + 1 < text.length) {
        plain += text[index + 1]
        index += 2
        continue
      }
      if (text[index] === '`') {
        flush()
        const end = text.indexOf('`', index + 1)
        const code = document.createElement('code')
        code.textContent = text.slice(index + 1, end < 0 ? text.length : end)
        if (code.textContent) parent.appendChild(code)
        index = end < 0 ? text.length : end + 1
        continue
      }
      if (text.startsWith('![', index) || text[index] === '[') {
        const image = text.startsWith('![', index)
        const labelStart = index + (image ? 2 : 1)
        const labelEnd = text.indexOf(']', labelStart)
        const urlStart = labelEnd >= 0 && text[labelEnd + 1] === '(' ? labelEnd + 2 : -1
        const urlEnd = urlStart >= 0 ? text.indexOf(')', urlStart) : -1
        if (labelEnd >= 0 && urlEnd >= 0) {
          flush()
          const labelText = text.slice(labelStart, labelEnd)
          const href = safeLink(text.slice(urlStart, urlEnd).trim().split(/\s+['\"]/)[0])
          if (!image && href) {
            const link = document.createElement('a')
            link.href = href
            link.target = '_blank'
            link.rel = 'noreferrer noopener'
            appendInlineMarkdown(link, labelText)
            parent.appendChild(link)
          } else {
            appendInlineMarkdown(parent, labelText)
          }
          index = urlEnd + 1
          continue
        }
        flush()
        const visibleEnd = labelEnd < 0 ? text.length : labelEnd
        appendInlineMarkdown(parent, text.slice(labelStart, visibleEnd))
        index = labelEnd < 0 || text[labelEnd + 1] === '(' ? text.length : labelEnd + 1
        continue
      }
      if (appendDelimited('**', 'strong') || appendDelimited('__', 'strong') || appendDelimited('~~', 's') || appendDelimited('*', 'em') || appendDelimited('_', 'em')) continue
      plain += text[index]
      index += 1
    }
    flush()
  }

  const splitTableRow = (line) => line.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim())

  const renderMarkdown = (container, markdown) => {
    const lines = String(markdown || '').replace(/\r\n?/g, '\n').split('\n')
    let index = 0
    let orderedListNumber = 0
    const addInlineBlock = (tag, content) => {
      const element = document.createElement(tag)
      appendInlineMarkdown(element, content)
      container.appendChild(element)
    }
    while (index < lines.length) {
      const line = lines[index]
      if (!line.trim()) {
        index += 1
        continue
      }
      if (/^\s*(?:[-+*]|\d+[.)])\s*$/.test(line)) {
        index += 1
        continue
      }
      const fence = line.match(/^\s*```\s*([^\s`]*)/)
      if (fence) {
        const codeLines = []
        index += 1
        while (index < lines.length && !/^\s*```/.test(lines[index])) codeLines.push(lines[index++])
        if (index < lines.length) index += 1
        const pre = document.createElement('pre')
        const code = document.createElement('code')
        if (fence[1]) code.dataset.language = fence[1]
        code.textContent = codeLines.join('\n')
        pre.appendChild(code)
        container.appendChild(pre)
        continue
      }
      const heading = line.match(/^\s{0,3}(#{1,6})(?:\s+|$)(.*)$/)
      if (heading) {
        orderedListNumber = 0
        addInlineBlock(`h${Math.min(4, heading[1].length)}`, heading[2])
        index += 1
        continue
      }
      if (/^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
        container.appendChild(document.createElement('hr'))
        index += 1
        continue
      }
      if (line.includes('|') && index + 1 < lines.length && /^\s*\|?\s*:?-{3,}/.test(lines[index + 1])) {
        const headings = splitTableRow(line)
        const table = document.createElement('table')
        const thead = document.createElement('thead')
        const headerRow = document.createElement('tr')
        headings.forEach((value) => {
          const cell = document.createElement('th')
          appendInlineMarkdown(cell, value)
          headerRow.appendChild(cell)
        })
        thead.appendChild(headerRow)
        table.appendChild(thead)
        index += 2
        const tbody = document.createElement('tbody')
        while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
          const row = document.createElement('tr')
          splitTableRow(lines[index]).forEach((value) => {
            const cell = document.createElement('td')
            appendInlineMarkdown(cell, value)
            row.appendChild(cell)
          })
          tbody.appendChild(row)
          index += 1
        }
        if (tbody.childNodes.length) table.appendChild(tbody)
        container.appendChild(table)
        continue
      }
      if (/^\s*>/.test(line)) {
        const quoteLines = []
        while (index < lines.length && /^\s*>/.test(lines[index])) quoteLines.push(lines[index++].replace(/^\s*>\s?/, ''))
        const quote = document.createElement('blockquote')
        const paragraph = document.createElement('p')
        appendInlineMarkdown(paragraph, quoteLines.join(' '))
        quote.appendChild(paragraph)
        container.appendChild(quote)
        continue
      }
      const listMatch = line.match(/^\s*(?:([-+*])|(\d+)[.)])\s+(.*)$/)
      if (listMatch) {
        const ordered = Boolean(listMatch[2])
        const list = document.createElement(ordered ? 'ol' : 'ul')
        let itemCount = 0
        let listStart = 1
        if (ordered) {
          const sourceStart = Number(listMatch[2]) || 1
          listStart = sourceStart === 1 && orderedListNumber ? orderedListNumber + 1 : sourceStart
          if (listStart !== 1) list.start = listStart
        }
        while (index < lines.length) {
          const item = lines[index].match(/^\s*(?:([-+*])|(\d+)[.)])\s+(.*)$/)
          if (!item || Boolean(item[2]) !== ordered) break
          const listItem = document.createElement('li')
          appendInlineMarkdown(listItem, item[3])
          list.appendChild(listItem)
          itemCount += 1
          index += 1
        }
        if (ordered) orderedListNumber = listStart + itemCount - 1
        container.appendChild(list)
        continue
      }
      const paragraphLines = [line.trim()]
      index += 1
      while (index < lines.length && lines[index].trim() && !/^\s*(?:```|#{1,6}\s|>|[-+*]\s+|\d+[.)]\s+)/.test(lines[index])) {
        if (lines[index].includes('|') && index + 1 < lines.length && /^\s*\|?\s*:?-{3,}/.test(lines[index + 1])) break
        paragraphLines.push(lines[index].trim())
        index += 1
      }
      addInlineBlock('p', paragraphLines.join(' '))
    }
  }

  const addMessageElement = (message) => {
    const article = document.createElement('article')
    article.className = `message ${message.role}`
    const label = document.createElement('div')
    label.className = 'message-label'
    label.textContent = message.role === 'assistant' ? (message.streaming ? '伴航正在回答' : '伴航') : '你'
    const body = document.createElement('div')
    body.className = 'message-body'
    if (message.role === 'assistant') {
      renderMarkdown(body, message.content)
      body.classList.toggle('streaming', Boolean(message.streaming))
    } else {
      body.textContent = message.content
    }
    article.append(label, body)
    if (message.context?.kind === 'selection' && message.context.excerpt) {
      const source = document.createElement('div')
      source.className = 'source'
      source.textContent = `原文：${message.context.excerpt}`
      article.appendChild(source)
    }
    aiThread.appendChild(article)
  }

  const renderAiThread = () => {
    aiThread.replaceChildren()
    if (!aiMessages.length) {
      const welcome = document.createElement('div')
      welcome.className = 'welcome'
      welcome.innerHTML = `
        <h2>读到哪里，问到哪里。</h2>
        <p>我会以当前网页为依据，帮你概括、解释，也可以接着追问。</p>
        <div class="quick-actions">
          <button class="quick-action" type="button" data-prompt="请总结全文：先用一句话概括主旨，再列出 5 个以内的核心要点，最后说明作者的结论。"><b>Σ</b><span>总结全文</span></button>
          <button class="quick-action" type="button" data-prompt="请梳理这篇文章的论证结构：作者提出了什么问题、用了哪些依据、得出了什么结论？"><b>≡</b><span>梳理核心观点</span></button>
          <button class="quick-action" type="button" data-prompt="请用没有专业背景的人也能理解的方式介绍这篇文章，必要时解释关键术语。"><b>?</b><span>简单讲讲这篇文章</span></button>
        </div>
      `
      welcome.querySelectorAll('.quick-action').forEach((action) => {
        action.addEventListener('click', () => askAi(action.dataset.prompt))
      })
      aiThread.appendChild(welcome)
    } else {
      aiMessages.forEach((message) => {
        if (message.role === 'assistant' && message.streaming && !message.content) return
        addMessageElement(message)
      })
    }
    const activeBusy = aiBusy && busyConversationId === activeConversationId
    const streamingAnswer = aiMessages.find((message) => message.role === 'assistant' && message.streaming)
    if (activeBusy && !streamingAnswer?.content) {
      const thinking = document.createElement('article')
      thinking.className = 'message assistant'
      thinking.innerHTML = '<div class="message-label">伴航正在阅读</div><div class="thinking"><i></i><i></i><i></i></div>'
      aiThread.appendChild(thinking)
    }
    aiSend.disabled = aiBusy
    newChatButton.disabled = aiBusy
    historyToggle.disabled = aiBusy
    companion.classList.toggle('thinking', aiBusy)
    scrollAiToEnd()
  }

  const conversationDate = (value) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    return new Intl.DateTimeFormat('zh-CN', {
      month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(date)
  }

  const renderConversationHistory = () => {
    historyList.replaceChildren()
    const conversations = [...aiConversations].sort((left, right) =>
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    if (!conversations.length) {
      const empty = document.createElement('p')
      empty.className = 'history-empty'
      empty.textContent = '还没有历史对话'
      historyList.appendChild(empty)
      return
    }
    conversations.forEach((conversation) => {
      const row = document.createElement('div')
      row.className = 'history-row'
      const open = document.createElement('button')
      open.type = 'button'
      open.className = 'history-open'
      const title = document.createElement('strong')
      title.textContent = conversation.title || '未命名对话'
      const meta = document.createElement('span')
      meta.textContent = `${conversationDate(conversation.updatedAt)} · ${Math.ceil(conversation.messages.length / 2)} 轮`
      open.append(title, meta)
      open.addEventListener('click', () => {
        activeConversationId = conversation.id
        aiMessages = [...conversation.messages]
        pendingSelection = ''
        updateContextBanner()
        companion.classList.remove('history-mode')
        renderAiThread()
        aiTextarea.focus()
      })
      const remove = document.createElement('button')
      remove.type = 'button'
      remove.className = 'history-delete'
      remove.title = '删除对话'
      remove.setAttribute('aria-label', `删除对话：${conversation.title || '未命名对话'}`)
      remove.textContent = '×'
      remove.addEventListener('click', () => {
        if (!window.confirm(`删除“${conversation.title || '未命名对话'}”？此操作无法撤销。`)) return
        aiConversations = aiConversations.filter((item) => item.id !== conversation.id)
        if (activeConversationId === conversation.id) startNewConversation()
        ipcRenderer.send('page:ai-conversations-change', aiConversations)
        renderConversationHistory()
      })
      row.append(open, remove)
      historyList.appendChild(row)
    })
  }

  const startNewConversation = () => {
    activeConversationId = crypto.randomUUID()
    aiMessages = []
    pendingSelection = ''
    companion.classList.remove('history-mode', 'settings-mode')
    panelHeading.textContent = '阅读伴航'
    updateContextBanner()
    renderAiThread()
  }

  const persistConversation = (conversationId, messages) => {
    const persistedMessages = messages.filter((message) => !message.transient && String(message.content || '').trim()).map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt,
      ...(message.context ? { context: message.context } : {}),
    }))
    const firstUser = persistedMessages.find((message) => message.role === 'user')
    if (!firstUser) return
    const existing = aiConversations.find((conversation) => conversation.id === conversationId)
    const now = new Date().toISOString()
    const conversation = {
      id: conversationId,
      title: firstUser.content.replace(/\s+/g, ' ').trim().slice(0, 36) || '未命名对话',
      createdAt: existing?.createdAt || firstUser.createdAt || now,
      updatedAt: now,
      messages: persistedMessages,
    }
    aiConversations = [conversation, ...aiConversations.filter((item) => item.id !== conversationId)]
    ipcRenderer.send('page:ai-conversations-change', aiConversations)
    renderConversationHistory()
  }

  const requestAiStream = (payload, onChunk) => new Promise((resolve, reject) => {
    const requestId = crypto.randomUUID()
    let timeout
    const matches = (data) => data?.requestId === requestId
    const cleanup = () => {
      window.clearTimeout(timeout)
      ipcRenderer.removeListener('page:ai-stream-chunk', handleChunk)
      ipcRenderer.removeListener('page:ai-stream-done', handleDone)
      ipcRenderer.removeListener('page:ai-stream-error', handleError)
    }
    const handleChunk = (_event, data) => {
      if (!matches(data)) return
      const delta = String(data.delta || '')
      if (delta) onChunk(delta)
    }
    const handleDone = (_event, data) => {
      if (!matches(data)) return
      cleanup()
      resolve(data)
    }
    const handleError = (_event, data) => {
      if (!matches(data)) return
      cleanup()
      reject(new Error(data.message || '模型请求失败'))
    }
    ipcRenderer.on('page:ai-stream-chunk', handleChunk)
    ipcRenderer.on('page:ai-stream-done', handleDone)
    ipcRenderer.on('page:ai-stream-error', handleError)
    timeout = window.setTimeout(() => {
      cleanup()
      reject(new Error('模型响应超时，请稍后重试'))
    }, 125000)
    ipcRenderer.send('page:ai-stream', { ...payload, requestId })
  })

  const askAi = async (rawQuestion, selection = pendingSelection) => {
    const question = String(rawQuestion || '').trim()
    if (!question || aiBusy) return
    if (!activeConversationId) activeConversationId = crypto.randomUUID()
    const conversationId = activeConversationId
    const conversationMessages = aiMessages
    const history = conversationMessages.filter((message) => !message.transient).map(({ role, content }) => ({ role, content }))
    const user = {
      id: crypto.randomUUID(),
      role: 'user',
      content: question,
      createdAt: new Date().toISOString(),
      context: selection ? { kind: 'selection', excerpt: selection } : { kind: 'page' },
    }
    const assistant = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
      streaming: true,
    }
    conversationMessages.push(user, assistant)
    pendingSelection = ''
    updateContextBanner()
    aiTextarea.value = ''
    aiTextarea.style.height = 'auto'
    aiBusy = true
    busyConversationId = conversationId
    persistConversation(conversationId, conversationMessages)
    renderAiThread()
    let renderFrame = 0
    const renderStream = () => {
      if (renderFrame) return
      renderFrame = window.requestAnimationFrame(() => {
        renderFrame = 0
        if (activeConversationId === conversationId) renderAiThread()
      })
    }
    try {
      await requestAiStream({ question, selection, history }, (delta) => {
        assistant.content += delta
        renderStream()
      })
      assistant.streaming = false
      persistConversation(conversationId, conversationMessages)
    } catch (error) {
      const message = error?.message || '暂时无法获得回答，请检查 AI 设置后重试。'
      assistant.streaming = false
      assistant.transient = true
      if (assistant.content.trim()) assistant.content += `\n\n> 回答中断：${message}`
      else assistant.content = message
    } finally {
      if (renderFrame) window.cancelAnimationFrame(renderFrame)
      aiBusy = false
      busyConversationId = ''
      renderAiThread()
      if (companion.classList.contains('open')) aiTextarea.focus()
    }
  }

  const quoteSelectionInComposer = (rawSelection) => {
    const text = String(rawSelection || '').replace(/\s+/g, ' ').trim().slice(0, 5000)
    if (!text) return
    startNewConversation()
    setAiOpen(true)
    if (companion.classList.contains('settings-mode')) leaveWidgetSettings()
    companion.classList.remove('history-mode')
    pendingSelection = text
    updateContextBanner()
    window.setTimeout(() => {
      aiTextarea.focus()
      aiTextarea.setSelectionRange(aiTextarea.value.length, aiTextarea.value.length)
    }, 0)
  }

  aiPanelTitle.textContent = document.title || location.hostname
  aiOrb.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return
    dragState = {
      pointerId: event.pointerId,
      pointerX: event.clientX,
      pointerY: event.clientY,
      originX: companionX,
      originY: companionY,
      moved: false,
    }
    aiOrb.setPointerCapture(event.pointerId)
    companion.classList.add('dragging')
  })
  aiOrb.addEventListener('pointermove', (event) => {
    const rect = aiOrb.getBoundingClientRect()
    orbPointerTarget = {
      x: Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width - .5) * 2)),
      y: Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height - .5) * 2)),
    }
    if (!dragState || dragState.pointerId !== event.pointerId) return
    const dx = event.clientX - dragState.pointerX
    const dy = event.clientY - dragState.pointerY
    if (Math.hypot(dx, dy) > 4) dragState.moved = true
    const next = clampCompanionPosition(dragState.originX + dx, dragState.originY + dy)
    companionX = next.x
    companionY = next.y
    aiHost.style.transform = `translate3d(${Math.round(companionX)}px, ${Math.round(companionY)}px, 0)`
    if (companion.classList.contains('open')) placePanel()
  })
  aiOrb.addEventListener('pointerleave', () => {
    if (!dragState) orbPointerTarget = { x: 0, y: 0 }
  })
  const finishOrbDrag = (event) => {
    if (!dragState || dragState.pointerId !== event.pointerId) return
    suppressOrbClick = dragState.moved
    if (suppressOrbClick) window.setTimeout(() => { suppressOrbClick = false }, 0)
    dragState = null
    companion.classList.remove('dragging')
    orbPointerTarget = { x: 0, y: 0 }
    if (aiOrb.hasPointerCapture(event.pointerId)) aiOrb.releasePointerCapture(event.pointerId)
    updateRatioFromPosition()
    ipcRenderer.invoke('page:companion-position:set', companionRatio).catch(() => {})
  }
  aiOrb.addEventListener('pointerup', finishOrbDrag)
  aiOrb.addEventListener('pointercancel', finishOrbDrag)
  aiOrb.addEventListener('click', () => {
    if (suppressOrbClick) {
      suppressOrbClick = false
      return
    }
    setAiOpen(!companion.classList.contains('open'))
  })
  companion.querySelector('.close').addEventListener('click', () => {
    setAiOpen(false)
  })
  settingsToggle.addEventListener('click', () => {
    if (companion.classList.contains('settings-mode')) leaveWidgetSettings()
    else enterWidgetSettings()
  })
  settingsVisibility.addEventListener('click', async () => {
    const reveal = settingsKey.type === 'password'
    if (reveal && !settingsKey.value && settingsKey.dataset.hasKey === 'true') {
      settingsVisibility.disabled = true
      try {
        const result = await ipcRenderer.invoke('ai:config:reveal')
        settingsKey.value = result?.apiKey || ''
      } catch {
        setSettingsStatus('无法读取已保存的 API Key', true)
        settingsVisibility.disabled = false
        return
      }
      settingsVisibility.disabled = false
    }
    settingsKey.type = reveal ? 'text' : 'password'
    settingsVisibility.textContent = reveal ? '隐藏' : '显示'
    settingsPaste.hidden = !reveal
  })
  settingsPaste.addEventListener('click', async () => {
    try {
      const value = String(await ipcRenderer.invoke('clipboard:read')).trim()
      if (!value) {
        setSettingsStatus('剪贴板里没有可粘贴的内容', true)
        return
      }
      settingsKey.value = value
      setSettingsStatus('已粘贴 API Key')
    } catch {
      setSettingsStatus('无法读取剪贴板', true)
    }
  })
  settingsForm.addEventListener('submit', async (event) => {
    event.preventDefault()
    settingsSave.disabled = true
    settingsSave.textContent = '保存中…'
    setSettingsStatus()
    try {
      const saved = await ipcRenderer.invoke('ai:config:set', {
        baseUrl: settingsUrl.value,
        model: settingsModel.value,
        apiKey: settingsKey.value || undefined,
      })
      settingsKey.dataset.hasKey = String(Boolean(saved?.hasApiKey))
      settingsKeyHint.textContent = saved?.hasApiKey ? '已保存' : '本地模型可留空'
      setSettingsStatus('配置已保存')
    } catch (error) {
      setSettingsStatus(error?.message || '配置保存失败', true)
    } finally {
      settingsSave.disabled = false
      settingsSave.textContent = '保存配置'
    }
  })
  historyToggle.addEventListener('click', () => {
    companion.classList.toggle('history-mode')
    renderConversationHistory()
  })
  newChatButton.addEventListener('click', () => {
    startNewConversation()
    aiTextarea.focus()
  })
  aiContext.querySelector('button').addEventListener('click', () => {
    pendingSelection = ''
    updateContextBanner()
  })
  aiSend.addEventListener('click', () => askAi(aiTextarea.value))
  aiTextarea.addEventListener('input', () => {
    aiTextarea.style.height = 'auto'
    aiTextarea.style.height = `${Math.min(96, aiTextarea.scrollHeight)}px`
  })
  aiTextarea.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      if (event.isComposing || event.keyCode === 229) return
      event.preventDefault()
      askAi(aiTextarea.value)
    }
  })
  ipcRenderer.on('page:ai-conversations', (_event, conversations) => {
    aiConversations = Array.isArray(conversations) ? conversations.filter((conversation) =>
      conversation?.id && Array.isArray(conversation.messages)).map((conversation) => ({
        ...conversation,
        messages: conversation.messages.filter((message) => message?.role && message?.content),
      })) : []
    const activeConversation = aiConversations.find((conversation) => conversation.id === activeConversationId)
    if (activeConversation) {
      aiMessages = [...activeConversation.messages]
    } else if (!activeConversationId) {
      const latestConversation = [...aiConversations].sort((left, right) =>
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())[0]
      if (latestConversation) {
        activeConversationId = latestConversation.id
        aiMessages = [...latestConversation.messages]
      }
    }
    renderConversationHistory()
    renderAiThread()
  })
  ipcRenderer.on('page:quote-selection', (_event, payload) => {
    quoteSelectionInComposer(payload?.text)
  })
  ipcRenderer.send('page:ai-ready')
  renderAiThread()

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
      const group = svgElement('g', {
        'data-highlight-id': item.id,
        'data-upgraded': target.upgraded ? 'true' : 'false',
      })
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

  const visibleHighlight = () => {
    const viewportHeight = Math.max(1, window.innerHeight)
    const viewportCenter = viewportHeight / 2
    let closest = null
    for (const [id, range] of highlightRanges) {
      const visibleRects = Array.from(range.getClientRects())
        .filter((rect) => rect.width > 0 && rect.height > 0 && rect.bottom >= 0 && rect.top <= viewportHeight)
      for (const rect of visibleRects) {
        const centerY = Math.max(0, Math.min(viewportHeight, rect.top + rect.height / 2))
        const distance = Math.abs(centerY - viewportCenter)
        if (!closest || distance < closest.distance) closest = { id, distance }
      }
    }
    return closest ? {
      id: closest.id,
    } : null
  }

  const emitPageScroll = () => {
    pageScrollFrame = 0
    if (pageScrollOccurredAt < lastPageInteractionAt || pageScrollOccurredAt - lastPageInteractionAt > 1500) {
      return
    }
    const highlight = visibleHighlight()
    if (!highlight) return
    ipcRenderer.send('page:scroll', {
      highlightId: highlight.id,
      occurredAt: pageScrollOccurredAt,
    })
  }

  const schedulePageScroll = () => {
    pageScrollOccurredAt = Date.now()
    if (pageScrollFrame) cancelAnimationFrame(pageScrollFrame)
    pageScrollFrame = requestAnimationFrame(emitPageScroll)
  }

  const markPageInteraction = () => {
    lastPageInteractionAt = Date.now()
  }

  window.addEventListener('wheel', markPageInteraction, { capture: true, passive: true })
  window.addEventListener('touchstart', markPageInteraction, { capture: true, passive: true })
  window.addEventListener('touchmove', markPageInteraction, { capture: true, passive: true })
  window.addEventListener('pointerdown', markPageInteraction, { capture: true, passive: true })
  window.addEventListener('pointermove', (event) => {
    if (event.buttons) markPageInteraction()
  }, { capture: true, passive: true })
  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) markPageInteraction()
  }, true)

  ipcRenderer.on('page:highlights', (_event, items) => {
    highlightItems = Array.isArray(items) ? items : []
    highlightRanges = resolveHighlightRanges()
    scheduleConnectorRender()
  })
  ipcRenderer.on('page:focus-highlight', (_event, highlightId) => {
    const focus = (attempt = 0) => {
      const range = highlightRanges.get(String(highlightId || ''))
      const target = range?.startContainer?.parentElement
      if (!range || !target) {
        if (attempt < 8) window.setTimeout(() => focus(attempt + 1), 90)
        return
      }
      target.scrollIntoView({
        block: 'center',
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      })
      window.setTimeout(scheduleConnectorRender, 260)
    }
    focus()
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
    const width = 164
    const left = Math.max(8, Math.min(window.innerWidth - width - 8, rect.left + rect.width / 2 - width / 2))
    const placeAbove = rect.top > 48
    const top = placeAbove ? rect.top - 43 : Math.min(window.innerHeight - 44, rect.bottom + 8)
    selectionBar.dataset.placement = placeAbove ? 'above' : 'below'
    host.style.left = `${Math.round(left)}px`
    host.style.top = `${Math.round(top)}px`
  }

  const holdSelection = (event) => {
    pressingButton = true
    event.preventDefault()
    event.stopPropagation()
  }
  highlightButton.addEventListener('mousedown', holdSelection)
  askButton.addEventListener('mousedown', holdSelection)
  highlightButton.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (selectedPayload) ipcRenderer.send('page:save-highlight', selectedPayload)
    window.getSelection()?.removeAllRanges()
    pressingButton = false
    hide()
  })
  askButton.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (selectedPayload) {
      quoteSelectionInComposer(selectedPayload.text)
    }
    window.getSelection()?.removeAllRanges()
    pressingButton = false
    hide()
  })
  document.addEventListener('mouseup', () => window.setTimeout(showForSelection, 0), true)
  document.addEventListener('mousedown', (event) => {
    if (event.composedPath().includes(host)) return
    hide()
  }, true)
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return
    hide()
    setAiOpen(false)
  }, true)
  window.addEventListener('scroll', () => {
    hide()
    scheduleConnectorRender()
    schedulePageScroll()
  }, true)
  window.addEventListener('resize', () => {
    hide()
    positionFromRatio(companionRatio)
    if (companion.classList.contains('open')) placePanel()
    scheduleConnectorRender()
  })
  window.addEventListener('pagehide', hide)
})
