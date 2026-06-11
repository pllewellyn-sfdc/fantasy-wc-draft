# Deploying to GitHub Pages

A click-by-click walkthrough. You will not need to use a terminal.

## What you'll end up with

A public URL of the form
`https://<your-username>.github.io/fantasy-wc-draft/` that you can
share in your group chat. Every push you make to the repo
re-publishes the site within about 90 seconds.

## One-time setup (about 5 minutes)

### 1. Create a GitHub account

1. Go to https://github.com.
2. Click **Sign up** (top right) and follow the prompts. Username,
   email, password.
3. Verify your email when GitHub sends the confirmation.

If you already have an account, sign in.

### 2. Create a new repository

1. Go to https://github.com/new.
2. **Repository name:** `fantasy-wc-draft` (use this exact name; the
   workflow uses it to set the URL prefix).
3. Leave the description blank or fill it in.
4. **Public** (required for free GitHub Pages).
5. Leave every other checkbox **unchecked** (no README, no
   .gitignore, no license — we already have those).
6. Click the green **Create repository** button at the bottom.

### 3. Upload the project files

You should now be looking at an empty repository page. Near the
middle there is a line that says "Get started by creating a new file
or **uploading an existing file**". Click **uploading an existing
file**.

1. Open Finder (or your file manager) and navigate to the
   `fantasy-wc-draft` folder this assistant created for you.
2. Select **all** the contents of the folder. On macOS, open the
   folder, press `Cmd+A`, then drag the whole selection onto the
   GitHub upload area in your browser.
   - **Important:** drag the contents of the folder, not the folder
     itself. The repo's root should contain `package.json`,
     `index.html`, `src/`, `.github/`, etc.
   - **Hidden files:** the `.github/` folder and `.gitignore` start
     with a dot. On macOS, press `Cmd+Shift+.` in Finder to make
     hidden files visible before selecting and dragging.
3. Wait for the upload progress bars to finish.
4. Scroll down. In the **Commit changes** box, the default message
   is fine. Make sure **Commit directly to the main branch** is
   selected.
5. Click the green **Commit changes** button.

You'll now see your files listed in the repo, and the **Actions**
tab at the top will already be running a build (yellow dot next to
the latest commit).

### 4. Turn on GitHub Pages

1. Click the **Settings** tab (top of the repo page, far right).
2. In the left sidebar, click **Pages** (under "Code and automation").
3. Under **Build and deployment** → **Source**, choose
   **GitHub Actions** from the dropdown.
4. That's it. There is no save button on this page.

### 5. Watch the first deploy finish

1. Click the **Actions** tab at the top.
2. You'll see a workflow run called "Deploy to GitHub Pages". Click
   into it.
3. The two jobs ("build" then "deploy") take about 90 seconds
   together. Wait for both to show green checkmarks.
4. When deploy finishes, click into the **deploy** job. The very
   top of the right-hand panel shows a URL like
   `https://<your-username>.github.io/fantasy-wc-draft/`. That is
   your public site.
5. Open it. You should see the leaderboard with all 8 players at
   zero points.

You're live. Send the URL to your group chat.

## Updating scores after the tournament starts

You have two options:

### Option A — edit in the browser, share via Export/Import (easiest)

1. Open your deployed URL.
2. Use the **Groups** or **Knockouts** tab to enter scores. The
   Leaderboard updates live.
3. When you want to share the latest state, click **Export** in the
   header. A file called `fantasy-wc-draft.json` downloads.
4. Drop that file in your group chat.
5. Anyone who wants the latest opens the URL, clicks **Import**,
   and picks the JSON file you sent.

This works because every visitor's browser keeps its own private
copy in localStorage. The Export/Import flow is how you share a
canonical snapshot.

### Option B — push the JSON to GitHub so the URL itself shows the latest

If you'd rather have the deployed URL always show the latest scores
(no Import step for viewers), commit the updated JSON back to the
repo:

1. After editing scores in the browser, click **Export**. You'll get
   `fantasy-wc-draft.json`.
2. Rename the downloaded file to `data.json`.
3. Go to your GitHub repo, navigate into `src/data/`, click
   `data.json`, then click the pencil icon (Edit this file).
4. Click the **Upload** button (or paste the contents of your new
   `data.json` in over the old contents).
5. Scroll down, write a short commit message ("update Mexico vs
   South Africa"), click **Commit changes**.
6. Wait ~90 seconds for the Actions workflow to redeploy. Reload
   the URL.

For Option B to work for visitors who already loaded the site, ask
them to use the **Reset** button once. Reset clears their local
copy and the page falls back to the freshly deployed JSON.

## Troubleshooting

**The Actions tab shows a red X.** Click into the failed run, expand
the failed step, and read the error. The most common cause is the
repo name not matching `fantasy-wc-draft`. If you used a different
name, edit `vite.config.ts` line `base: process.env.VITE_BASE || '/'`
to hard-code your repo path, e.g.
`base: process.env.VITE_BASE || '/my-repo-name/'`.

**The page loads but assets 404.** Same cause as above.

**My friends see different scores than me.** That's expected with
Option A. Each browser has its own state. Use Export/Import or
switch to Option B.

**I don't want it public.** GitHub Pages requires a public repo on
the free tier. If you need it private, GitHub Pro is $4/month and
allows private Pages.
