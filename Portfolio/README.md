# Md. Al Amin Tusher — portfolio site

A one-page portfolio with a photo gallery, a video gallery, and a content
dashboard so you can add work without editing code. Everything here is plain
HTML, CSS and JavaScript, so it runs on free static hosting with no build step
and nothing to renew.

---

## What's in this folder

| Path | What it is |
| --- | --- |
| `index.html` | The main portfolio page. Your bio and section text live here. |
| `photos.html` | Photo gallery with category filters and a full-screen viewer. |
| `videos.html` | Video gallery. Embeds load only when clicked, so the page stays fast. |
| `404.html` | Shown if someone hits a bad link. |
| `content/*.json` | **Your content.** Stories, photos, videos, contact details. |
| `admin/` | The dashboard. `config.yml` defines what you can edit. |
| `assets/css/style.css` | All styling. Colours and fonts are set at the very top. |
| `assets/js/site.js` | Reads the JSON files and builds the pages. |
| `assets/img/` | Your portrait, share image, favicon, placeholder tiles. |
| `uploads/` | Where photos you upload through the dashboard are saved. |
| `.nojekyll` | Stops GitHub from reprocessing the files. Don't delete it. |

The important idea: **content is separate from code.** To add a story or a
photograph you change a JSON file (or use the dashboard, which changes it for
you). You should rarely need to touch the HTML.

---

## Step 1 — Put it on GitHub

First decide the repository name, because it sets your web address:

- Name it **`YOUR-USERNAME.github.io`** → your site is `https://YOUR-USERNAME.github.io`
- Name it anything else, e.g. **`Portfolio`** → your site is `https://YOUR-USERNAME.github.io/Portfolio/`

The first option gives the cleaner address and is what I'd suggest for a
personal site. Everything in here uses relative paths, so either works.

Create the empty repository on GitHub first (no README, no .gitignore), then
from Terminal:

```bash
cd ~/Documents/GitHub/Portfolio
git init -b main
git add .
git commit -m "Portfolio site"
git remote add origin https://github.com/YOUR-USERNAME/YOUR-USERNAME.github.io.git
git push -u origin main
```

If you'd rather not use Terminal: on the new repository page choose
**uploading an existing file**, then drag in everything from this folder.
One catch — drag the *contents* of the folder, not the folder itself, and note
that `.nojekyll` may be hidden in Finder (press `Cmd + Shift + .` to reveal it).

## Step 2 — Switch on GitHub Pages

In the repository go to **Settings → Pages**. Under *Build and deployment* set
Source to **Deploy from a branch**, branch **main**, folder **/ (root)**, and
save. Give it a minute or two, then load your address. If you named the repo
`YOUR-USERNAME.github.io`, Pages is often already on.

## Step 3 — Replace the two placeholders

Search the project for `YOUR-USERNAME` and you'll find it in three HTML files,
in the social-share tag:

```html
<meta property="og:image" content="https://YOUR-USERNAME.github.io/assets/img/og.jpg">
```

Set it to your real address in `index.html`, `photos.html` and `videos.html`.
This is only what shows as the preview picture when someone shares your link —
the site works fine before you do it.

---

## Step 4 — Turning on the dashboard

The dashboard lives at `/admin/` on your site. It's Decap CMS: it signs you in,
shows friendly forms, and saves your edits straight back into the repository as
ordinary commits. Because GitHub Pages has no server, the login has to be
handled by a free helper service. Two routes, pick one.

> I wasn't able to open these services while building this, so a menu name may
> have shifted since. Treat the steps as the shape of the job and follow each
> service's own current instructions where they differ.

### Route A — easiest: deploy through Netlify

Your code stays on GitHub. Netlify just serves it and handles login, free.

1. Sign in to `netlify.com` with your GitHub account.
2. **Add new site → Import an existing project**, pick this repository.
3. Leave build command empty and publish directory as `/`. Deploy.
4. In the site's settings enable **Identity**, set registration to
   **Invite only**, then under Identity → Services enable **Git Gateway**.
5. Invite your own email address, and accept the invite.
6. In `admin/config.yml`, delete the `backend:` block at the top and uncomment
   the `git-gateway` block just below it.
7. Add this line to `admin/index.html`, just above the closing `</body>`:
   `<script src="https://identity.netlify.com/v1/netlify-identity-widget.js"></script>`

Trade-off: your dashboard-enabled site is then at a `netlify.app` address. The
GitHub Pages copy keeps working as a mirror, but its `/admin/` won't log in.

### Route B — stay entirely on GitHub Pages

Keep the `github` backend already in `config.yml` and give it a login helper:

1. Register a GitHub **OAuth App** (Settings → Developer settings → OAuth Apps).
   You'll get a Client ID and a Client Secret.
2. Deploy a small OAuth relay on Cloudflare Workers (free tier). Search for
   *"Decap CMS OAuth Cloudflare Worker"* — several ready-made ones exist. Give
   it your Client ID and Secret as environment variables.
3. Put the worker's address into `config.yml` as `base_url`, and set
   `repo:` to `YOUR-USERNAME/YOUR-REPO`.
4. Set the OAuth App's callback URL to the one your worker expects.

More fiddly up front, but nothing to maintain afterwards and one address only.

Official reference: **decapcms.org/docs** — check it against these steps.

---

## Step 5 — What still needs your content

Three things are deliberately unfinished, because I didn't want to invent them:

**The story links.** Five real Netra News stories are already listed with their
real headlines, standfirsts and dates, but I only had a screenshot, not the web
addresses. They currently show a small *"Link coming"* marker instead of a
false link. Open each story on Netra News, copy the address, and paste it into
the `url` field. `Inferno Cities` already points at `interactive.netra.news`.

**The photographs.** The gallery shows nine grey placeholder tiles. Replace them
with your own work and write a real caption, location, year and category for
each. Before uploading, resize to about 2000px on the long edge and save under
roughly 500KB — GitHub repositories should stay under a gigabyte, and smaller
files load much faster on a Dhaka mobile connection.

**The videos.** Paste each YouTube video's ID into the `youtube_id` field and
the thumbnail appears automatically, no image upload needed. In
`youtube.com/watch?v=dQw4w9WgXcQ` the ID is the `dQw4w9WgXcQ` part.

---

## Previewing on your own computer

Opening `index.html` by double-clicking will show the page but **empty work and
gallery sections** — browsers block local file reads for security, so the JSON
can't load. Run a tiny local server instead:

```bash
cd ~/Documents/GitHub/Portfolio
python3 -m http.server 8000
```

Then open `http://localhost:8000`. Press `Ctrl + C` to stop it. The site itself
shows a short explanation if it ever hits this, so you won't be left guessing.

## Editing without the dashboard

You don't need the dashboard at all if you'd rather not set it up. GitHub's own
website is already a perfectly good editor with a real login: open a file in
`content/`, click the pencil, make your change, and commit. The site rebuilds in
under a minute. JSON is fussy about two things — every text value needs
straight double quotes around it, and no comma after the final item in a list.

## Changing the look

Every colour, typeface and spacing value is declared once at the top of
`assets/css/style.css` under `:root`. Change `--accent` there and it updates
across all three pages. The teal is carried over from your printed CV so the
two match.

---

## Notes

- The dashboard folder is blocked from search engines in `robots.txt`.
- Your editor's email address is **not** published anywhere. The references line
  says "available on request" — publishing someone else's address invites
  scrapers, and it isn't yours to give out.
- Motion is disabled automatically for anyone who has reduced-motion switched on,
  and the whole site is keyboard-navigable with visible focus rings.
- `index.html` prints cleanly, so the page doubles as a PDF CV via Cmd+P.
