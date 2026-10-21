import type { Enrichment } from "./enrich";

export type CaptureInput = {
  kind: "url" | "text" | "voice";
  url?: string;
  text?: string;
  note?: string;
  tag?: string;
  source?: string; // share-sheet | action-button | siri | widget
};

const yamlSafe = (s = "") => JSON.stringify(s.replace(/\s+/g, " ").trim());

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "capture";
}

export function buildMarkdown(c: CaptureInput, e: Enrichment, capturedAt: Date): string {
  const fm = [
    "---",
    `source: ${yamlSafe(`ios-${c.source ?? "shortcut"}`)}`,
    `kind: ${c.kind}`,
    `tag: ${yamlSafe(c.tag)}`,
    `captured_at: ${capturedAt.toISOString()}`,
    ...(c.url ? [`url: ${yamlSafe(c.url)}`] : []),
    ...(e.title ? [`title: ${yamlSafe(e.title)}`] : []),
    "---",
    "",
  ];
  const body: string[] = [];
  if (e.title) body.push(`# ${e.title}`, "");
  if (c.url) body.push(`URL: ${c.url}`, "");
  if (e.siteName || e.author) body.push(`Source: ${[e.siteName, e.author].filter(Boolean).join(" — ")}`, "");
  if (e.postText) body.push("## Post", "", e.postText, "");
  if (e.description) body.push("## Description", "", e.description, "");
  if (e.summary) body.push("## Summary", "", e.summary, "");
  if (c.text) body.push(c.kind === "voice" ? "## Dictated note" : "## Shared text", "", c.text.trim(), "");
  if (c.note) body.push("## My note", "", c.note.trim(), "");
  if (!e.title && !e.description && !e.postText && c.url && !c.text && !c.note) {
    body.push("_(Enrichment unavailable — link-only capture. Consolidate accepts short inbox files.)_", "");
  }
  return fm.concat(body).join("\n");
}
