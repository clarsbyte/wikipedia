import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import ForceGraph3D from "react-force-graph-3d";
import * as THREE from "three";
import { forceCollide } from "d3-force-3d";
import SpriteText from "three-spritetext";
import { fetchLinks } from "./wiki.js";

const MAX_NODES = 500;
const LINK_DISTANCE = 110;
const CHARGE_STRENGTH = -220;
const COLLISION_PADDING = 18;

// editorial palette — 4 distinct hues, assigned per node by title hash
const NODE_COLORS = ["#d8b974", "#7a8597", "#c47a6b", "#9bb59a"];
const ROOT_COLOR = "#ece7d9";

function colorFor(title) {
  let h = 0;
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) >>> 0;
  return NODE_COLORS[h % NODE_COLORS.length];
}

export default function Graph() {
  const params = new URLSearchParams(location.search);
  const rootTitle = (params.get("title") || "Mark Antony").replace(/_/g, " ");
  const lang = (params.get("lang") || "en").toLowerCase();
  const embedded = params.get("embed") === "1";

  const fgRef = useRef(null);
  const [graph, setGraph] = useState({ nodes: [], links: [] });
  const [status, setStatus] = useState({ msg: "", error: false });
  const [search, setSearch] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [expandMode, setExpandMode] = useState(true);
  const [helpOpen, setHelpOpen] = useState(true);

  useEffect(() => { document.title = `${rootTitle} — Knowledge Graph`; }, [rootTitle]);

  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!fgRef.current) return;

    fgRef.current.d3Force("link")?.distance(LINK_DISTANCE);
    fgRef.current.d3Force("charge")?.strength(CHARGE_STRENGTH);
    fgRef.current.d3Force(
      "collide",
      forceCollide((node) => {
        const radius = node.depth === 0 ? 5.5 : Math.max(2.2, 4.5 - node.depth * 0.7);
        return radius + COLLISION_PADDING;
      }).iterations(2)
    );
  }, [graph.nodes.length, graph.links.length]);

  // refs for fast lookup
  const nodeMapRef = useRef(new Map());
  const linkSetRef = useRef(new Set());
  const expandingRef = useRef(new Set());

  const resetState = useCallback(() => {
    nodeMapRef.current = new Map();
    linkSetRef.current = new Set();
    expandingRef.current = new Set();
    setGraph({ nodes: [], links: [] });
  }, []);

  const expandNode = useCallback(async (title, depth) => {
    if (expandingRef.current.has(title)) return;
    const node = nodeMapRef.current.get(title);
    if (!node || node.expanded) return;
    if (nodeMapRef.current.size >= MAX_NODES) {
      setStatus({ msg: `Node cap reached (${MAX_NODES}). Reload to keep exploring.`, error: true });
      return;
    }
    expandingRef.current.add(title);
    node.loading = true;
    setStatus({ msg: `Fetching links for "${title}"…`, error: false });

    try {
      const links = await fetchLinks(title, lang);
      const newNodes = [];
      const newLinks = [];
      for (const t of links) {
        if (nodeMapRef.current.size + newNodes.length >= MAX_NODES) break;
        if (!nodeMapRef.current.has(t)) {
          const n = { id: t, title: t, depth: depth + 1, expanded: false };
          nodeMapRef.current.set(t, n);
          newNodes.push(n);
        }
        const a = title, b = t;
        const k = a < b ? `${a}||${b}` : `${b}||${a}`;
        if (!linkSetRef.current.has(k)) {
          linkSetRef.current.add(k);
          newLinks.push({ source: title, target: t });
        }
      }
      node.expanded = true;
      node.loading = false;
      setGraph((g) => ({
        nodes: [...g.nodes, ...newNodes],
        links: [
          ...g.links.map((l) => ({
            source: typeof l.source === "object" ? l.source.id : l.source,
            target: typeof l.target === "object" ? l.target.id : l.target,
          })),
          ...newLinks,
        ],
      }));
      setStatus({ msg: `"${title}" — ${newNodes.length} new of ${links.length}.`, error: false });
    } catch (e) {
      node.loading = false;
      setStatus({ msg: `Failed: "${title}" — ${e.message}`, error: true });
    } finally {
      expandingRef.current.delete(title);
    }
  }, [lang]);

  // bootstrap + reload
  useEffect(() => {
    resetState();
    const root = { id: rootTitle, title: rootTitle, depth: 0, expanded: false };
    nodeMapRef.current.set(rootTitle, root);
    setGraph({ nodes: [root], links: [] });
    expandNode(rootTitle, 0);
  }, [rootTitle, lang, reloadKey, expandNode, resetState]);

  const lcSearch = search.trim().toLowerCase();

  // node 3D object — sphere + always-visible label sprite
  const nodeThreeObject = useCallback((node) => {
    const group = new THREE.Group();
    const color = node.depth === 0 ? ROOT_COLOR : colorFor(node.title);
    const radius = node.depth === 0 ? 5.5 : Math.max(2.2, 4.5 - node.depth * 0.7);

    // matte sphere — no emissive blast
    const geom = new THREE.SphereGeometry(radius, 24, 18);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: lcSearch && !node.title.toLowerCase().includes(lcSearch) ? 0.18 : 0.95,
    });
    const sphere = new THREE.Mesh(geom, mat);
    group.add(sphere);

    // hairline ring for expanded nodes
    if (node.expanded) {
      const ringGeom = new THREE.RingGeometry(radius + 1.2, radius + 1.4, 48);
      const ringMat = new THREE.MeshBasicMaterial({
        color: "#ece7d9", side: THREE.DoubleSide, transparent: true, opacity: 0.35,
      });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      group.add(ring);
    }

    // always-visible label
    const label = new SpriteText(node.title);
    label.fontFace = "Fraunces, Georgia, serif";
    label.fontWeight = node.depth === 0 ? "500" : "400";
    label.color = lcSearch && !node.title.toLowerCase().includes(lcSearch)
      ? "rgba(236,231,217,0.25)"
      : "#ece7d9";
    label.backgroundColor = "rgba(0,0,0,0)";
    label.padding = 2;
    label.textHeight = node.depth === 0 ? 4.5 : 3;
    label.position.set(0, radius + 3, 0);
    label.material.depthWrite = false;
    label.material.depthTest = false;
    label.renderOrder = 10;
    group.add(label);

    return group;
  }, [lcSearch]);

  const handleNodeClick = useCallback((node, event) => {
    if (event?.shiftKey) {
      const url = `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(node.title.replace(/ /g, "_"))}`;
      window.open(url, "_blank", "noopener");
    } else {
      if (expandMode) expandNode(node.title, node.depth);
      if (window.parent !== window) {
        window.parent.postMessage({ type: "wiki-graph-scroll-to", title: node.title }, "*");
      }
    }
  }, [expandNode, lang, expandMode]);

  const linkColor = useCallback((link) => {
    if (lcSearch) {
      const a = (typeof link.source === "object" ? link.source.title : link.source) || "";
      const b = (typeof link.target === "object" ? link.target.title : link.target) || "";
      const hit = a.toLowerCase().includes(lcSearch) || b.toLowerCase().includes(lcSearch);
      return hit ? "rgba(216,185,116,0.45)" : "rgba(236,231,217,0.05)";
    }
    return "rgba(236,231,217,0.18)";
  }, [lcSearch]);

  useEffect(() => {
    const pressed = new Set();
    const isTypingTarget = (el) => {
      if (!el) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
    };
    const onKeyDown = (e) => {
      if (isTypingTarget(e.target)) return;
      const k = e.key.toLowerCase();
      if (["w", "a", "s", "d"].includes(k)) {
        pressed.add(k);
        e.preventDefault();
      }
    };
    const onKeyUp = (e) => pressed.delete(e.key.toLowerCase());

    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (pressed.size === 0) return;
      const fg = fgRef.current;
      if (!fg) return;
      const camera = fg.camera();
      const controls = fg.controls?.();
      const speed = 4;
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
      const up = new THREE.Vector3().copy(camera.up).normalize();
      const move = new THREE.Vector3();
      if (pressed.has("w")) move.add(up);
      if (pressed.has("s")) move.sub(up);
      if (pressed.has("d")) move.add(right);
      if (pressed.has("a")) move.sub(right);
      if (move.lengthSq() === 0) return;
      move.normalize().multiplyScalar(speed);
      camera.position.add(move);
      if (controls?.target) {
        controls.target.add(move);
        controls.update?.();
      }
    };
    raf = requestAnimationFrame(tick);

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  const handleReset = () => {
    fgRef.current?.zoomToFit(800, 80);
  };
  const handleReload = () => setReloadKey((k) => k + 1);

  const counts = useMemo(() => ({
    nodes: graph.nodes.length,
    edges: graph.links.length,
  }), [graph]);

  return (
    <>
      <div className="backdrop" />

      <div className="fg-canvas">
        <ForceGraph3D
          ref={fgRef}
          width={size.w}
          height={size.h}
          graphData={graph}
          backgroundColor="rgba(0,0,0,0)"
          showNavInfo={false}
          nodeLabel={() => ""}
          nodeThreeObject={nodeThreeObject}
          nodeThreeObjectExtend={false}
          linkColor={linkColor}
          linkWidth={0.4}
          linkOpacity={1}
          cooldownTicks={120}
          onNodeClick={handleNodeClick}
          enableNodeDrag={true}
        />
      </div>

      <aside className={`hud${embedded ? " embedded" : ""}`}>
        <div className="hud-eyebrow">Article · {lang}.wikipedia</div>
        <h1 className="hud-title">{rootTitle}</h1>

        <div className="hud-stats">
          <div className="stat">
            <span className="num">{counts.nodes}</span>
            <span className="lbl">Nodes</span>
          </div>
          <div className="stat">
            <span className="num">{counts.edges}</span>
            <span className="lbl">Edges</span>
          </div>
          <div className="stat">
            <span className="num">{nodeMapRef.current ? Array.from(nodeMapRef.current.values()).filter(n => n.expanded).length : 0}</span>
            <span className="lbl">Expanded</span>
          </div>
        </div>

        <input
          type="search"
          placeholder="filter by title…"
          autoComplete="off"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className={`status${status.error ? " error" : ""}`}>{status.msg || "—"}</div>
      </aside>

      <div className="dock dock-br">
        <label className="hud-toggle compact">
          <span>Expand</span>
          <button
            type="button"
            role="switch"
            aria-checked={expandMode}
            className={`switch${expandMode ? " on" : ""}`}
            onClick={() => setExpandMode((v) => !v)}
          >
            <span className="knob" />
          </button>
        </label>
        <div className="hud-actions">
          <button onClick={handleReset}>Recenter</button>
          <button onClick={handleReload}>Reload</button>
        </div>
      </div>

      <div className={`dock dock-bl${helpOpen ? "" : " collapsed"}`}>
        <button
          type="button"
          className="dock-toggle"
          aria-expanded={helpOpen}
          onClick={() => setHelpOpen((v) => !v)}
        >
          {helpOpen ? "Hide controls" : "Controls"}
        </button>
        {helpOpen && (
          <div className="hud-help">
            <kbd>click</kbd> expand · <kbd>shift</kbd>+<kbd>click</kbd> open ↗<br />
            <kbd>drag</kbd> orbit · <kbd>wheel</kbd> zoom · <kbd>right-drag</kbd> pan<br />
            <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move
          </div>
        )}
      </div>

      {!embedded && <div className="corner">Celestial Atlas · v0.2</div>}
    </>
  );
}
