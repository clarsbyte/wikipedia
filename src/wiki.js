const MAX_LINKS_PER_NODE = 120;

export async function fetchLinks(title, lang) {
  const base = `https://${lang}.wikipedia.org/w/api.php`;
  const collected = [];
  let plcontinue = null;
  for (let i = 0; i < 3; i++) {
    const u = new URL(base);
    u.searchParams.set("action", "query");
    u.searchParams.set("prop", "links");
    u.searchParams.set("titles", title);
    u.searchParams.set("plnamespace", "0");
    u.searchParams.set("pllimit", "max");
    u.searchParams.set("format", "json");
    u.searchParams.set("origin", "*");
    if (plcontinue) u.searchParams.set("plcontinue", plcontinue);
    const res = await fetch(u.toString());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const pages = data?.query?.pages || {};
    for (const k of Object.keys(pages)) {
      for (const l of (pages[k].links || [])) collected.push(l.title);
    }
    if (collected.length >= MAX_LINKS_PER_NODE) break;
    if (data.continue?.plcontinue) plcontinue = data.continue.plcontinue;
    else break;
  }
  const seen = new Set();
  const out = [];
  for (const t of collected) {
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= MAX_LINKS_PER_NODE) break;
  }
  return out;
}
