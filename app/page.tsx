// Setup checker. Shows which settings are present (never their values) and, if the secret is
// missing, suggests a freshly generated one to paste into Vercel.
import crypto from "node:crypto";

export const dynamic = "force-dynamic";

export default function Home() {
  const hasSecret = (process.env.BRAIN_INBOX_SECRET ?? "").length >= 24;
  const hasToken = Boolean(process.env.GITHUB_TOKEN);
  const repo = process.env.BRAIN_REPO ?? "";
  const suggestion = crypto.randomBytes(24).toString("base64url");
  const row = (ok: boolean, label: string) => (
    <li style={{ margin: "8px 0" }}>{ok ? "✅" : "❌"} {label}</li>
  );
  return (
    <main style={{ fontFamily: "system-ui", maxWidth: 560, margin: "48px auto", padding: 16, lineHeight: 1.5 }}>
      <h1>Brain Inbox</h1>
      <p>This page only checks your setup. Your phone sends captures to <code>/api/inbox</code>.</p>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {row(hasSecret, "BRAIN_INBOX_SECRET is set (24+ characters)")}
        {row(hasToken, "GITHUB_TOKEN is set")}
        {row(/^[\w.-]+\/[\w.-]+$/.test(repo), `BRAIN_REPO is set${repo ? ` (${repo})` : ""}`)}
      </ul>
      {!hasSecret && (
        <p>
          Need a secret? Here is a random one you can use for BRAIN_INBOX_SECRET:
          <br />
          <code style={{ wordBreak: "break-all" }}>{suggestion}</code>
          <br />
          Paste it in Vercel, under Settings → Environment Variables, then redeploy. Keep a copy for the Shortcut.
        </p>
      )}
      {hasSecret && hasToken && repo && <p>All set. Install the Brain Inbox shortcut and send a test capture.</p>}
    </main>
  );
}
