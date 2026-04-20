import React, { useState, useCallback } from "react";

export const BOOKMARKS_KEY = "wiki-graph-bookmarks";

function loadBookmarks() {
  try {
    return JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || "[]");
  } catch {
    return [];
  }
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric",
  });
}

export default function Bookmarks() {
  const [bookmarks, setBookmarks] = useState(loadBookmarks);

  const remove = useCallback((title, lang) => {
    setBookmarks((prev) => {
      const next = prev.filter((b) => !(b.title === title && b.lang === lang));
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    localStorage.setItem(BOOKMARKS_KEY, "[]");
    setBookmarks([]);
  }, []);

  const openGraph = useCallback((title, lang) => {
    const url = chrome.runtime.getURL(
      `graph.html?title=${encodeURIComponent(title)}&lang=${encodeURIComponent(lang)}`
    );
    window.open(url, "_blank");
  }, []);

  return (
    <>
      <div className="backdrop" />
      <div className="bookmarks-page">
        <header className="bookmarks-header">
          <div className="hud-eyebrow">Celestial Atlas</div>
          <h1 className="hud-title">Bookmarks</h1>
          {bookmarks.length > 0 && (
            <button type="button" className="clear-btn" onClick={clearAll}>
              Clear all
            </button>
          )}
        </header>

        {bookmarks.length === 0 ? (
          <div className="bookmarks-empty">
            <span className="empty-star">☆</span>
            <p>No bookmarks yet.</p>
            <p className="empty-hint">
              Open a Wikipedia article, launch the graph, and click ★ to save it here.
            </p>
          </div>
        ) : (
          <ul className="bookmarks-list">
            {bookmarks.map((b) => (
              <li key={`${b.lang}::${b.title}`} className="bookmark-card">
                <div className="bookmark-meta">
                  <span className="bookmark-lang">{b.lang}.wikipedia</span>
                  {b.addedAt && (
                    <span className="bookmark-date">{formatDate(b.addedAt)}</span>
                  )}
                </div>
                <div className="bookmark-title">{b.title}</div>
                <div className="bookmark-actions">
                  <button
                    type="button"
                    className="bookmark-action primary"
                    onClick={() => openGraph(b.title, b.lang)}
                  >
                    Open Graph
                  </button>
                  <button
                    type="button"
                    className="bookmark-action"
                    onClick={() => remove(b.title, b.lang)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
