const WIKI_HOST_RE = /^([a-z]{2,3}(?:-[a-z]+)?)\.wikipedia\.org$/i;

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.url) return notify("Open a Wikipedia article first.");
  let url;
  try { url = new URL(tab.url); } catch { return notify("No valid URL on this tab."); }

  const m = url.host.match(WIKI_HOST_RE);
  if (!m || !url.pathname.startsWith("/wiki/")) {
    return notify("This isn't a Wikipedia article. Open one and try again.");
  }
  const lang = m[1].toLowerCase();
  const title = decodeURIComponent(url.pathname.slice("/wiki/".length));
  if (!title || title.includes(":")) {
    return notify("Open a regular Wikipedia article (not a special/meta page).");
  }

  try {
    await chrome.tabs.sendMessage(tab.id, {
      type: "toggle-graph-overlay",
      title,
      lang,
    });
  } catch (error) {
    console.error("Wikipedia Knowledge Graph overlay failed", error);
    notify("Reload this Wikipedia tab, then click the extension again.");
  }
});

function notify(message) {
  try {
    chrome.action.setBadgeBackgroundColor({ color: "#d97a7a" });
    chrome.action.setBadgeText({ text: "!" });
    chrome.action.setTitle({ title: `Wikipedia Knowledge Graph\n${message}` });
    setTimeout(() => {
      chrome.action.setBadgeText({ text: "" }).catch(() => {});
      chrome.action.setTitle({ title: "Open Wikipedia Knowledge Graph" }).catch(() => {});
    }, 5000);
  } catch (_) { /* ignore */ }
}

