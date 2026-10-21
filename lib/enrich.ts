// enrich.ts — turn a bare URL into enough context for `brain consolidate` (title + description
// + optional AI summary). Every step is best-effort with short timeouts; capture never fails
// because enrichment failed.

export type Enrichment = {
  title?: string;
  description?: string;
  siteName?: string;
  author?: string;
  postText?: string;
  summary?: string;
};

const UA = "Mozilla/5.0 (compatible; BrainInbox/1.0; +https://github.com/brain-inbox)";

async function fetchWithTimeout(url: string, ms: number, init?: RequestInit): Promise<Response | null> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(ms), redirect: "follow" });
  } catch {
    return null;
  }
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
}

function meta(html: string, key: string): string | undefined {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${key}["']`,
    "i",
  );
  const m = html.match(re);
  const v = m?.[1] ?? m?.[2];
  return v ? decode(v) : undefined;
}

function isX(url: URL): boolean {
  return /(^|\.)(x|twitter)\.com$/i.test(url.hostname);
}

/** X/Twitter pages are JS-only; the public oEmbed endpoint returns the post text without auth. */
async function enrichX(url: string): Promise<Enrichment> {
  const res = await fetchWithTimeout(
    `https://publish.twitter.com/oembed?omit_script=1&url=${encodeURIComponent(url)}`,
    4000,
  );
  if (!res?.ok) return {};
  const j = (await res.json().catch(() => ({}))) as { html?: string; author_name?: string };
  const p = j.html?.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1];
  const postText = p ? decode(p.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")) : undefined;
  return { siteName: "X", author: j.author_name, postText, title: j.author_name ? `Post by ${j.author_name}` : undefined };
}

async function enrichHtml(url: string): Promise<Enrichment & { bodyText?: string }> {
  const res = await fetchWithTimeout(url, 5000, { headers: { "user-agent": UA, accept: "text/html" } });
  if (!res?.ok || !(res.headers.get("content-type") ?? "").includes("html")) return {};
  const html = (await res.text()).slice(0, 400_000);
  const title = meta(html, "og:title") ?? (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ? decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)![1]) : undefined);
  const bodyText = decode(
    html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<nav[\s\S]*?<\/nav>|<footer[\s\S]*?<\/footer>/gi, " ").replace(/<[^>]+>/g, " "),
  ).slice(0, 6000);
  return {
    title,
    description: meta(html, "og:description") ?? meta(html, "description") ?? meta(html, "twitter:description"),
    siteName: meta(html, "og:site_name"),
    author: meta(html, "author"),
    bodyText,
  };
}

/** Optional 2–3 sentence summary via OpenAI (OPENAI_API_KEY already exists on the dashboard project). */
async function summarize(input: string): Promise<string | undefined> {
  const key = process.env.OPENAI_API_KEY;
  if (!key || process.env.BRAIN_INBOX_SUMMARY !== "on" || input.length < 200) return undefined;
  const res = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", 8000, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.BRAIN_INBOX_SUMMARY_MODEL ?? "gpt-4o-mini",
      max_tokens: 220,
      messages: [
        { role: "system", content: "Summarize the page for a personal knowledge inbox in 2-3 plain sentences: what it is and the key idea. No preamble." },
        { role: "user", content: input.slice(0, 6000) },
      ],
    }),
  });
  if (!res?.ok) return undefined;
  const j = (await res.json().catch(() => ({}))) as { choices?: { message?: { content?: string } }[] };
  return j.choices?.[0]?.message?.content?.trim() || undefined;
}

export async function enrichUrl(raw: string): Promise<Enrichment> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return {};
  }
  if (!/^https?:$/.test(url.protocol)) return {};
  if (isX(url)) {
    const x = await enrichX(url.toString());
    return x;
  }
  const page = await enrichHtml(url.toString());
  const { bodyText, ...rest } = page;
  const summary = await summarize([rest.title, rest.description, bodyText].filter(Boolean).join("\n\n"));
  return { ...rest, ...(summary ? { summary } : {}) };
}
