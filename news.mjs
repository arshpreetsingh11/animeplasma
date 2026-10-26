const SOURCES = [
  { name: "Anime News Network", url: "https://www.animenewsnetwork.com/all/rss.xml?ann-edition=us" },
  { name: "Crunchyroll News", url: "https://cr-news-api-service.prd.crunchyrollsvc.com/v1/en-US/rss" },
  { name: "MyAnimeList News", url: "https://myanimelist.net/rss/news.xml" }
];

function decode(s = "") {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}
function getTag(block, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = block.match(new RegExp("<" + escaped + "(?:\\s[^>]*)?>([\\s\\S]*?)<\\/" + escaped + "\\s*>", "i"));
  return m ? decode(m[1].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()) : "";
}
function getAttr(block, tagName, attrName) {
  const re = new RegExp("<" + tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b([^>]*)>", "i");
  const match = block.match(re);
  if (!match) return "";
  const a = match[1].match(new RegExp("\\b" + attrName + "=[\\"']([^\\"']+)[\\"']", "i"));
  return a ? decode(a[1]) : "";
}
function parse(xml, source) {
  const items = xml.match(/<(?:item|entry)(?:\s[^>]*)?>[\s\S]*?<\/(?:item|entry)>/gi) || [];
  return items.map(block => {
    const title = getTag(block, "title");
    const link = getTag(block, "link") || getAttr(block, "link", "href") || getTag(block, "guid") || getTag(block, "id");
    const raw = getTag(block, "content:encoded") || getTag(block, "description") || getTag(block, "summary") || getTag(block, "content");
    const image = getAttr(block, "media:thumbnail", "url") || getAttr(block, "media:content", "url") ||
      getAttr(block, "enclosure", "url") || ((raw.match(/<img\b[^>]*>/i) || [""])[0] && ((raw.match(/<img\b[^>]*>/i)||[""])[0].match(/\bsrc=["']([^"']+)/i)||[])[1]) || "";
    const clean = decode(raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
    const date = getTag(block, "pubDate") || getTag(block, "published") || getTag(block, "updated") || getTag(block, "dc:date");
    const cat = /manga|manhwa|chapter|volume/i.test(title) ? "manga" : /movie|film|theatrical/i.test(title) ? "movie" : "anime";
    return { id: link || source.name + title, title, link, image: /^https?:\/\//i.test(image) ? image : "", excerpt: clean.slice(0, 500), date, author: source.name, cat };
  }).filter(x => x.title && /^https?:\/\//i.test(x.link));
}
export default async () => {
  const results = await Promise.allSettled(SOURCES.map(async source => {
    const response = await fetch(source.url, { headers: { "User-Agent": "AnimePlasma/1.0 (+news reader)" }, signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error(`${source.name} returned HTTP ${response.status}`);
    return parse(await response.text(), source);
  }));
  const articles = results.flatMap(r => r.status === "fulfilled" ? r.value : []);
  const unique = [...new Map(articles.map(a => [a.link, a])).values()]
    .sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0)).slice(0, 150);
  return Response.json({ articles, sourcesWorking: results.filter(r => r.status === "fulfilled").length, sourcesTotal: SOURCES.length, updatedAt: new Date().toISOString() }, {
    headers: { "Cache-Control": "public, max-age=60", "Access-Control-Allow-Origin": "*" }
  });
};