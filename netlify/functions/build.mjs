import { getStore } from "@netlify/blobs";
import { readToken, json } from "../lib.mjs";
export const config = { path: "/api/build" };

const grab = (html) => ({
  title: (html.match(/<title>([^<]*)/i) || [])[1] || "",
  ld: [...html.matchAll(/<script[^>]+ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1].trim()).join("\n").slice(0, 6000),
  text: html.replace(/<(script|style|svg)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 8000),
  links: [...html.matchAll(/<a[^>]+href="([^"#]+)"[^>]*>([^<]{2,40})</gi)].slice(0, 40).map((m) => m[2].trim() + " -> " + m[1]),
});

const ask = async (page, url, a) => {
  const prompt = `Build a compact agent-friendly layer for this website. Reply with JSON only.
Shape: {"name":"","about":"one sentence","items":[{"id":"","name":"","price":0,"in_stock":true,"url":""}],"actions":[{"name":"","does":"","url":""}],"never":["things an agent must not do"]}
Keep it under 3000 characters. Only use what is on the page. Do not invent anything.
Site: ${url}
Owner says it is a: ${a.type}. Visitors mostly want to: ${a.tasks}. Agents must never: ${a.never}.
Title: ${page.title}
Structured data: ${page.ld}
Links: ${page.links.join("; ")}
Text: ${page.text}`;
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-sonnet-5-5", max_tokens: 1500, messages: [{ role: "user", content: prompt }] }),
  });
  const d = await r.json();
  return JSON.parse(d.content[0].text.replace(/```json|```/g, "").trim());
};

export default async (req) => {
  const email = readToken(req);
  if (!email) return json({ error: "Log in first." }, 401);
  const { url, answers } = await req.json();
  let res;
  try {
    res = await fetch(url, { headers: { "user-agent": "BifaceBot/0.1" }, redirect: "follow" });
  } catch {
    return json({ error: "Could not open that link." }, 400);
  }
  const page = grab(await res.text());
  let layer;
  try {
    layer = await ask(page, url, answers);
  } catch {
    layer = { name: page.title, about: page.text.slice(0, 160), items: [], actions: [], never: [] };
  }
  layer.site = url;
  const body = JSON.stringify(layer);
  const id = Math.random().toString(36).slice(2, 10);
  await getStore("layers").set(id, body, { metadata: { email } });
  const host = new URL(req.url).origin;
  return json({
    id,
    bytes: Buffer.byteLength(body),
    layerUrl: host + "/l/" + id + ".json",
    snippet: `<link rel="alternate" type="application/json" href="${host}/l/${id}.json">`,
  });
};
