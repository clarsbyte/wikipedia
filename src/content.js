const HOST_ID = "wiki-knowledge-graph-host";
const WIDTH_KEY = "wiki-graph-overlay-width";
const MIN_WIDTH = 320;
const MAX_WIDTH_RATIO = 0.85;

let shadowRoot;
let panel;
let iframe;
let wrap;
let handle;
let reopenButton;
let currentKey = "";
let panelWidth = clampWidth(Number(localStorage.getItem(WIDTH_KEY)) || Math.min(680, window.innerWidth * 0.42));

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "wiki-graph-ping") return;
  if (message?.type !== "toggle-graph-overlay") return;

  const nextKey = `${message.lang}::${message.title}`;
  ensureOverlay();

  if (panel.dataset.open === "true" && currentKey === nextKey) {
    closeOverlay();
    return;
  }

  currentKey = nextKey;
  iframe.src = chrome.runtime.getURL(
    `graph.html?title=${encodeURIComponent(message.title)}&lang=${encodeURIComponent(message.lang)}&embed=1`
  );
  openOverlay();
});

function clampWidth(w) {
  const max = Math.max(MIN_WIDTH, window.innerWidth * MAX_WIDTH_RATIO);
  return Math.min(Math.max(w, MIN_WIDTH), max);
}

function applyWidth() {
  wrap.style.width = `${panelWidth}px`;
  if (panel.dataset.open === "true") {
    document.documentElement.style.setProperty("--wiki-graph-shift", `${panelWidth}px`);
  }
}

function ensureOverlay() {
  if (shadowRoot && panel && iframe) return;

  let host = document.getElementById(HOST_ID);
  if (!host) {
    host = document.createElement("div");
    host.id = HOST_ID;
    document.documentElement.appendChild(host);
  }

  shadowRoot = host.shadowRoot || host.attachShadow({ mode: "open" });
  shadowRoot.innerHTML = "";

  injectPageShiftStyle();

  const style = document.createElement("style");
  style.textContent = `
    :host { all: initial; }

    .wrap {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      width: 680px;
      z-index: 2147483647;
      pointer-events: none;
    }

    .panel {
      position: absolute;
      inset: 0;
      transform: translateX(100%);
      transition: transform 220ms ease;
      box-shadow: -24px 0 60px rgba(0, 0, 0, 0.45);
      border-left: 1px solid rgba(236, 231, 217, 0.18);
      background: #0a0b10;
      pointer-events: auto;
    }

    .panel[data-open="true"] { transform: translateX(0); }
    .panel:not([data-open="true"]) { box-shadow: none; border-left: none; }
    .panel:not([data-open="true"]) button.close { display: none; }

    iframe {
      display: block;
      width: 100%;
      height: 100%;
      border: 0;
      background: #0a0b10;
    }

    .handle {
      position: absolute;
      top: 0;
      bottom: 0;
      left: -4px;
      width: 8px;
      cursor: ew-resize;
      pointer-events: auto;
      background: transparent;
      z-index: 2;
    }
    .handle::after {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 2px;
      height: 44px;
      background: rgba(236, 231, 217, 0.25);
      border-radius: 2px;
      transition: background 160ms ease;
    }
    .handle:hover::after, .handle.dragging::after { background: #d8b974; }

    button.close {
      position: absolute;
      top: 14px;
      left: -44px;
      width: 32px;
      height: 32px;
      border: 1px solid rgba(236, 231, 217, 0.18);
      background: rgba(17, 19, 28, 0.92);
      color: #ece7d9;
      cursor: pointer;
      font: 400 18px/1 Georgia, serif;
      pointer-events: auto;
    }
    button.close:hover { background: rgba(26, 30, 43, 0.98); }

    button.reopen {
      position: fixed;
      top: 50%;
      right: 0;
      transform: translateY(-50%);
      width: 26px;
      height: 56px;
      border: 1px solid rgba(236, 231, 217, 0.18);
      border-right: none;
      background: rgba(17, 19, 28, 0.92);
      color: #ece7d9;
      cursor: pointer;
      font: 400 16px/1 Georgia, serif;
      pointer-events: auto;
      z-index: 2147483647;
      border-radius: 3px 0 0 3px;
      display: none;
    }
    button.reopen[data-visible="true"] { display: block; }
    button.reopen:hover { background: rgba(26, 30, 43, 0.98); color: #d8b974; }
  `;

  wrap = document.createElement("div");
  wrap.className = "wrap";

  panel = document.createElement("div");
  panel.className = "panel";
  panel.dataset.open = "false";

  handle = document.createElement("div");
  handle.className = "handle";
  handle.setAttribute("aria-label", "Resize graph overlay");
  handle.addEventListener("pointerdown", startResize);

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "close";
  closeButton.setAttribute("aria-label", "Close graph overlay");
  closeButton.textContent = "×";
  closeButton.addEventListener("click", closeOverlay);

  iframe = document.createElement("iframe");
  iframe.setAttribute("title", "Wikipedia Knowledge Graph");

  reopenButton = document.createElement("button");
  reopenButton.type = "button";
  reopenButton.className = "reopen";
  reopenButton.setAttribute("aria-label", "Reopen graph overlay");
  reopenButton.textContent = "‹";
  reopenButton.dataset.visible = "false";
  reopenButton.addEventListener("click", openOverlay);

  panel.append(handle, closeButton, iframe);
  wrap.append(panel);
  shadowRoot.append(style, wrap, reopenButton);

  window.addEventListener("resize", onWindowResize);
  window.addEventListener("message", onIframeMessage);
  document.addEventListener("keydown", onKeyDown, true);

  applyWidth();
}

function injectPageShiftStyle() {
  if (document.getElementById("wiki-graph-shift-style")) return;
  const s = document.createElement("style");
  s.id = "wiki-graph-shift-style";
  s.textContent = `
    html.wiki-graph-open {
      margin-right: var(--wiki-graph-shift, 0px) !important;
      transition: margin-right 220ms ease;
    }
  `;
  document.documentElement.appendChild(s);
}

function openOverlay() {
  panel.dataset.open = "true";
  if (reopenButton) reopenButton.dataset.visible = "false";
  applyWidth();
  document.documentElement.classList.add("wiki-graph-open");
}

function closeOverlay() {
  if (!panel) return;
  panel.dataset.open = "false";
  if (reopenButton) reopenButton.dataset.visible = "true";
  document.documentElement.classList.remove("wiki-graph-open");
  document.documentElement.style.setProperty("--wiki-graph-shift", "0px");
}

function onKeyDown(event) {
  if (event.key === "Escape" && panel?.dataset.open === "true") {
    closeOverlay();
  }
}

function onIframeMessage(event) {
  const data = event?.data;
  if (!data || data.type !== "wiki-graph-scroll-to" || typeof data.title !== "string") return;
  console.debug("[wiki-graph] scroll-to", data.title);
  scrollToLink(data.title);
}

function scrollToLink(title) {
  const root = document.getElementById("mw-content-text") || document.body;
  const slug = title.replace(/ /g, "_");
  const slugLc = slug.toLowerCase();
  const titleLc = title.toLowerCase();
  const hrefPrefixes = [`/wiki/${slug}`, `/wiki/${encodeURIComponent(slug)}`];

  const anchors = Array.from(root.querySelectorAll("a[href]"));
  let link = anchors.find((a) => {
    const t = a.getAttribute("title");
    if (t && t.toLowerCase() === titleLc) return true;
    const href = a.getAttribute("href") || "";
    for (const p of hrefPrefixes) {
      if (href === p || href.startsWith(p + "#") || href.startsWith(p + "?")) return true;
    }
    const decoded = safeDecode(href).toLowerCase();
    if (decoded === `/wiki/${slugLc}` ||
        decoded.startsWith(`/wiki/${slugLc}#`) ||
        decoded.startsWith(`/wiki/${slugLc}?`)) return true;
    return false;
  });

  if (!link) {
    console.warn("[wiki-graph] no link found for", title);
    return;
  }
  link.scrollIntoView({ behavior: "smooth", block: "center" });
  flashLink(link);
}

function safeDecode(s) {
  try { return decodeURIComponent(s); } catch (_) { return s; }
}

function flashLink(el) {
  const prev = el.style.cssText;
  el.style.transition = "background-color 200ms ease, box-shadow 200ms ease";
  el.style.backgroundColor = "rgba(216, 185, 116, 0.45)";
  el.style.boxShadow = "0 0 0 3px rgba(216, 185, 116, 0.45)";
  setTimeout(() => { el.style.cssText = prev; }, 1600);
}

function onWindowResize() {
  panelWidth = clampWidth(panelWidth);
  applyWidth();
}

let dragStartX = 0;
let dragStartWidth = 0;

function startResize(event) {
  event.preventDefault();
  dragStartX = event.clientX;
  dragStartWidth = panelWidth;
  handle.classList.add("dragging");
  handle.setPointerCapture(event.pointerId);
  handle.addEventListener("pointermove", onResize);
  handle.addEventListener("pointerup", stopResize);
  handle.addEventListener("pointercancel", stopResize);
}

function onResize(event) {
  const delta = dragStartX - event.clientX;
  panelWidth = clampWidth(dragStartWidth + delta);
  applyWidth();
}

function stopResize(event) {
  handle.classList.remove("dragging");
  try { handle.releasePointerCapture(event.pointerId); } catch (_) {}
  handle.removeEventListener("pointermove", onResize);
  handle.removeEventListener("pointerup", stopResize);
  handle.removeEventListener("pointercancel", stopResize);
  localStorage.setItem(WIDTH_KEY, String(Math.round(panelWidth)));
}
