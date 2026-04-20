# Learnings

<!-- Auto-maintained by Clean Agent. New entries are appended under the current date. -->

## 2026-04-19

- (synthesizer) [storage] Store bookmarks in localStorage under the chrome-extension:// origin to share state between the graph view and dedicated pages without needing background script communication.
- (synthesizer) [build-config] Expose new HTML pages (like bookmarks.html) in manifest.json and vite.config.js to ensure they're accessible as extension pages and built correctly.
- (synthesizer) [ux-pattern] Use visual state toggling (☆ ↔ ★) for bookmark buttons to provide immediate, clear feedback on whether the current item is saved.
- (synthesizer) [build-config] Multi-entry Vite projects require explicit Rollup input configuration in vite.config.js for each HTML entry point to be bundled separately.
- (synthesizer) [manifest] Browser extension web_accessible_resources must list new HTML files to make them loadable as extension pages.
- (synthesizer) [state-management] Persistent UI state (bookmarks) should be managed in the top-level component and passed down; paired save/load handlers keep state in sync with storage.
- (synthesizer) [extension-storage] localStorage persists across extension contexts (graph view and bookmarks page) when accessed from the same chrome-extension:// origin, enabling bookmark state sharing without background scripts.
- (synthesizer) [extension-build] Expose new extension pages (bookmarks.html) in manifest.json web_accessible_resources and add them as separate Rollup build inputs in vite.config.js to make them available as full-page views.
- (synthesizer) [extension-navigation] Opening extension pages in new tabs uses window.open() with the full chrome-extension:// URL, not relative paths, to navigate outside the current view context.
