// POST /api/inbox — Brain Inbox capture from the iPhone (Share Sheet, Action Button, Siri).
// Auth: `Authorization: Bearer <BRAIN_INBOX_SECRET>` (constant-time compare).
// Writes inbox/YYYY-MM/<stamp>-<slug>.md into BRAIN_REPO via the GitHub Contents API using
// a fine-grained PAT (GITHUB_TOKEN: Contents read/write on the buyer's brain repo only).
// Body (JSON): { url?, text?, note?, tag?, kind?: "url"|"text"|"voice", source? }
// The shortcut can also just send the raw share input as `input`; we split URL vs text here.

import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import { enrichUrl, type Enrichment } from "@/lib/enrich";
import { buildMarkdown, slugify, type CaptureInput } from "@/lib/markdown";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const Body = z.object({
  input: z.string().max(20000).optional(),
  url: z.string().max(2000).optional(),
  text: z.string().max(20000).optional(),
  note: z.string().max(5000).optional(),
  tag: z.string().max(200).optional(),
  kind: z.enum(["url", "text", "voice"]).optional(),
  source: z.string().max(40).optional(),
});

function authorized(req: NextRequest): boolean {
  const secret = process.env.BRAIN_INBOX_SECRET ?? "";
  const header = req.headers.get("authorization") ?? "";
  const given = header.replace(/^Bearer\s+/i, "").trim() || req.headers.get("x-brain-inbox-secret") || "";
  if (secret.length < 24 || !given) return false;
  const a = crypto.createHash("sha256").update(given).digest();
  const b = crypto.createHash("sha256").update(secret).digest();
  return crypto.timingSafeEqual(a, b);
}

const URL_RE = /https?:\/\/[^\s<>"']+/i;
const blank = (s?: string) => (s && s.trim() ? s.trim() : undefined);

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  const b = parsed.data;

  // Normalize: Shortcuts often sends the share input as one string.
  let url = blank(b.url);
  let text = blank(b.text);
  const input = blank(b.input);
  if (input) {
    const m = input.match(URL_RE);
    if (!url && m) url = m[0];
    const rest = m ? input.replace(m[0], "").trim() : input;
    if (!text && rest && rest !== url) text = rest;
  }
  if (!url && text && URL_RE.test(text) && text.match(URL_RE)![0] === text) {
    url = text;
    text = undefined;
  }
  if (!url && !text && !blank(b.note)) {
    return NextResponse.json({ ok: false, error: "nothing to capture" }, { status: 400 });
  }

  const capture: CaptureInput = {
    kind: b.kind ?? (url ? "url" : "text"),
    url,
    text,
    note: blank(b.note),
    tag: blank(b.tag),
    source: blank(b.source) ?? "shortcut",
  };

  const enrichment: Enrichment = url ? await enrichUrl(url) : {};
  const now = new Date();
  const md = buildMarkdown(capture, enrichment, now);

  const repo = (process.env.BRAIN_REPO ?? "").trim();
  const branch = process.env.BRAIN_INBOX_BRANCH ?? "main";
  const token = process.env.GITHUB_TOKEN;
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) return NextResponse.json({ ok: false, error: "BRAIN_REPO must look like yourname/your-brain" }, { status: 500 });
  if (!token) return NextResponse.json({ ok: false, error: "server missing GITHUB_TOKEN" }, { status: 500 });

  const stamp = now.toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15); // 20261021-153800
  const label = slugify(enrichment.title ?? capture.tag ?? (url ? new URL(url).hostname : text ?? "note"));
  const path = `${(process.env.INBOX_DIR ?? "inbox").replace(/\/+$/, "")}/${now.toISOString().slice(0, 7)}/${stamp}-${crypto.randomBytes(2).toString("hex")}-${label}.md`;

  const gh = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "brain-inbox",
    },
    body: JSON.stringify({
      message: `[${now.toISOString().slice(0, 10)}] Brain Inbox: phone capture (${capture.kind})`,
      content: Buffer.from(md, "utf8").toString("base64"),
      branch,
    }),
  });
  if (!gh.ok) {
    const status = gh.status;
    // 401 = PAT expired/revoked — the #1 way this silently dies. Make it loud in the Shortcut.
    const hint = status === 401 ? "GitHub token expired or revoked — rotate GITHUB_TOKEN" : status === 404 ? "repo not found or token lacks access" : "github write failed";
    console.error("[brain-inbox] github", status, await gh.text().catch(() => ""));
    return NextResponse.json({ ok: false, error: hint }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    path,
    title: enrichment.title ?? null,
    message: `Saved: ${enrichment.title ?? url ?? (text ?? "").slice(0, 60)}`,
  });
}

// GET /api/inbox — authenticated health check for the Shortcut "Test" step.
export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ ok: true, repo: (process.env.BRAIN_REPO ?? "").trim(), token: Boolean(process.env.GITHUB_TOKEN) });
}
