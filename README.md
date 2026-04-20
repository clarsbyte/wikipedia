# Wikipedia Knowledge Graph (Vite + React + MV3)

Interactive space-themed knowledge graph of Wikipedia article links.

## Setup

```bash
npm install
npm run build      # production build → dist/
# or
npm run dev        # HMR development build → dist/
```

## Load in Chrome

1. Visit `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select the `dist/` folder
4. Open any Wikipedia article (e.g. `https://en.wikipedia.org/wiki/Mark_Antony`)
5. Click the toolbar icon to toggle the graph sidebar overlay in that tab

## Controls

- **Click node** — expand to show its outgoing links
- **Shift+Click node** — open the actual Wikipedia article in a new tab
- **Drag node** — reposition
- **Wheel** — zoom around cursor
- **Right-drag** — pan

## Project layout

```
manifest.json          MV3 manifest (consumed by @crxjs/vite-plugin)
graph.html             Vite entry for the graph page
vite.config.js         Vite + React + crxjs config
src/
  background.js        Service worker — opens graph.html on icon click
  main.jsx             React entry
  Graph.jsx            HUD + canvas mount
  useGraphEngine.js    Force-directed sim, fetch, render loop, interaction
  styles.css           Space theme
```
