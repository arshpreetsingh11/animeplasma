import { getStore } from "@netlify/blobs";

const store = getStore("anime-plasma-community");
const json = (data, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const validId = id => typeof id === "string" && id.length > 0 && id.length < 1500 && /^https?:\/\//i.test(id);

export default async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "GET,POST,OPTIONS" } });
  if (request.method === "GET") {
    const id = new URL(request.url).searchParams.get("articleId") || "";
    if (!validId(id)) return json({ error: "Invalid articleId" }, 400);
    const data = await store.get(`article:${id}`, { type: "json" }) || { likes: 0, voters: [], comments: [] };
    const cookie = request.headers.get("x-nf-client-connection-ip") || "anonymous";
    return json({ likes: data.likes || 0, liked: (data.voters || []).includes(cookie), comments: (data.comments || []).slice(-100) });
  }
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  if (!validId(body.articleId)) return json({ error: "Invalid articleId" }, 400);
  const key = `article:${body.articleId}`;
  const data = await store.get(key, { type: "json" }) || { likes: 0, voters: [], comments: [] };
  if (body.action === "like") {
    const voter = request.headers.get("x-nf-client-connection-ip") || crypto.randomUUID();
    data.voters = data.voters || [];
    const at = data.voters.indexOf(voter);
    if (at >= 0) { data.voters.splice(at, 1); data.likes = Math.max(0, (data.likes || 0) - 1); }
    else { data.voters.push(voter); data.likes = (data.likes || 0) + 1; }
    // Keep storage bounded. This is a lightweight anonymous demo, not abuse-proof voting.
    if (data.voters.length > 5000) data.voters = data.voters.slice(-5000);
    await store.setJSON(key, data);
    return json({ likes: data.likes, liked: at < 0, comments: data.comments || [] });
  }
  if (body.action === "comment") {
    const text = typeof body.text === "string" ? body.text.trim().slice(0, 500) : "";
    if (!text) return json({ error: "Comment cannot be empty" }, 400);
    data.comments = data.comments || [];
    data.comments.push({ text, createdAt: new Date().toISOString() });
    data.comments = data.comments.slice(-100);
    await store.setJSON(key, data);
    return json({ comments: data.comments, likes: data.likes || 0 });
  }
  return json({ error: "Unknown action" }, 400);
};