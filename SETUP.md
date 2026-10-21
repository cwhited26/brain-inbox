# Brain Inbox: capture from your iPhone straight into your brain

**What you get:** tap Share → **Brain Inbox** in any app, or hold the Action Button and talk. The capture
lands in your private brain repo under `inbox/`, with the link's title and description already filled
in. Later, tell Grok Bot "process my inbox".

**Setup takes about 20 minutes. There's no coding and no Mac, and everything runs on free plans** (GitHub free, Vercel Hobby).

1. **Make a GitHub key that only opens your brain** (5 min). Use the link in the lesson, then:
   - Under **Repository access**, choose **Only select repositories**, then pick your brain repo.
   - Contents is already set to **Read and write**.
   - Click **Generate token** and copy it. You'll paste it in step 2.
2. **Deploy your inbox** (5 min). Click **Deploy to Vercel** in the lesson. Sign in with GitHub and fill in the three boxes:
   - `BRAIN_REPO`: `yourname/your-brain-repo`
   - `GITHUB_TOKEN`: the key from step 1
   - `BRAIN_INBOX_SECRET`: a long random password. iPhone's Passwords app can suggest one.
     Save it in Passwords as "Brain Inbox".
3. **Check it.** Open your new site (`https://<project>.vercel.app`). All three lines should show ✅.
4. **Install the shortcut** (3 min). Open the iCloud link from the lesson on your iPhone and tap **Add Shortcut**.
   It asks two questions: your site address and your secret.
5. **Action Button** (1 min). Go to Settings → Action Button → Shortcut → **Brain Inbox**.
6. **Test it.** Share any web page to Brain Inbox and you'll see "Saved: <title>". Then ask Grok Bot:
   "process my inbox".

**If something goes wrong:**
- **"unauthorized"**: the secret in the shortcut doesn't match Vercel. Fix it in the shortcut's settings.
- **"GitHub token expired"**: make a new key (step 1), paste it in Vercel → Settings → Environment Variables,
  then redeploy.
- **"repo not found"**: check `BRAIN_REPO` spelling, and make sure the key covers that repo.
