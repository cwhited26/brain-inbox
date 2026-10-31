# Brain Inbox (companion app for AI Brain Starter)

A tiny private endpoint you own. Your iPhone Shortcut sends captures to it, and it saves each one as a
Markdown file in your brain repo's `inbox/` folder. It runs on Vercel's free plan.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fcwhited26%2Fbrain-inbox&project-name=brain-inbox&repository-name=brain-inbox&env=BRAIN_REPO,GITHUB_TOKEN,BRAIN_INBOX_SECRET&envDescription=Your%20brain%20repo%20(owner%2Fname)%2C%20a%20fine-grained%20GitHub%20token%20for%20that%20repo%20only%2C%20and%20a%20long%20random%20secret&envLink=https%3A%2F%2Fgithub.com%2Fcwhited26%2Fbrain-inbox%2Fblob%2Fmain%2FSETUP.md)

Step-by-step instructions are in the course lesson and in `docs/brain-inbox.md` in your brain.

**API:** `POST /api/inbox` with the header `Authorization: Bearer <BRAIN_INBOX_SECRET>` and a JSON body
`{ input?, url?, text?, note?, tag?, kind?, source? }`.
It returns `{ ok, path, title, message }`. `GET /api/inbox` with the same header is a health check.
