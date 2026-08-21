# Your website

Live at **https://tusher984.github.io/Tusher-Portfolio/**
Dashboard at **https://tusher984.github.io/Tusher-Portfolio/admin/**

Everything on the site — photos, videos, stories, your bio, experience, skills,
education, contact details and every heading — is edited through the dashboard.
You never need to touch code to change what the site says.

**বাংলায় পড়তে: [README-bn.md](README-bn.md)** — same instructions, in Bengali.

---

## Turning on the login

The dashboard is built and waiting. It needs one thing before GitHub will sign
you in, and there is a way to skip that entirely if you want to start now.

### Option 1 — start editing today, no setup (5 minutes)

This runs the same dashboard on your own computer. No login, no accounts, no
waiting. Open Terminal and run these, from inside your site folder:

```bash
cd ~/Documents/GitHub/Tusher-Portfolio
npx decap-server
```

Leave that running. Open a **second** Terminal window and run:

```bash
cd ~/Documents/GitHub/Tusher-Portfolio
python3 -m http.server 8000
```

Now open **http://localhost:8000/admin/** in your browser and click
**Work with Local Repo**. Everything works — drag photos in, edit text, publish.
Your changes save straight into the files on your computer.

When you are happy, publish them to the web:

```bash
git add -A && git commit -m "Update site" && git push
```

The live site updates about a minute later.

### Option 2 — log in from anywhere (10 minutes, one-time)

Once this is set up you can edit the site from your phone, from a borrowed
laptop, from anywhere, just by visiting `/admin/` and clicking a button.

Open **`admin/login-helper.js`** in this folder. The step-by-step instructions are
written at the top of that file — make a GitHub OAuth app, paste the code into a
free Cloudflare Worker, then put the worker address into `admin/config.yml` where
it says `base_url:`.

I should be straight with you about one thing: I had no internet access while
building your site, so I could not walk through Cloudflare's and GitHub's signup
screens myself. The code is correct and the steps are carefully written, but the
wording of buttons on those websites may have changed.

Two errors and what they mean:

**`DNS_PROBE_FINISHED_NXDOMAIN` on `your-login-helper.workers.dev`** — `base_url`
in `admin/config.yml` is still the placeholder, so the browser was sent to an
address that does not exist. Finish the five steps and replace it. Until you do,
the live `/admin/` page shows those steps instead of a login button, so you cannot
walk into this again.

**The popup opens and shuts without logging you in** — almost always the
**Authorization callback URL** in the GitHub app not exactly matching your worker
address with `/callback` on the end.

### Option 3 — no dashboard at all

You can always edit the site directly on github.com. Go to your repository, click
into `content/`, click any `.json` file, click the pencil icon, edit, and click
Commit. To add photos, open the `uploads` folder and use **Add file → Upload
files**. It is less pleasant than the dashboard but it needs nothing set up and
works from any browser.

---

## Uploading photos

In the dashboard, open **Photographs**, scroll to the Photographs list, click
**Add Photograph**, then drag your image into the Photograph box. Fill in the
title, and a caption describing what is happening — that caption is also what
blind readers hear, so it is worth writing properly.

Set **Category** to one of the filter buttons listed at the top of that same
screen (`Environment`, `Portraits`, `Urban life`, `Reportage`), spelled the same
way, and it will appear under that filter. Add new categories to that list first
if you need one.

The **first four photos in the list** also appear on the homepage, so drag your
strongest work to the top.

One practical thing: shrink big files before uploading. Straight-off-the-camera
JPEGs are often 8–15MB, and a gallery of those takes a long time to load on
mobile data in Bangladesh. Around 2000px on the long edge and under 500KB each
looks identical on screen and loads far faster. Preview in macOS can do this with
Tools → Adjust Size.

## Adding videos

Open **Videos** and click **Add Video**. You have three ways to supply the actual
footage, and the site uses whichever you fill in first:

**YouTube** — paste just the ID, not the whole address. In
`youtube.com/watch?v=dQw4w9WgXcQ` the ID is `dQw4w9WgXcQ`. The thumbnail is
pulled in automatically, so you do not need to upload a cover image.

**Vimeo** — paste the number from the end of the address, e.g. `76979871`.

**Upload a clip** — use the *Or upload a clip* box for an MP4, and add a cover
image, since there is nothing to pull a thumbnail from.

About uploaded clips: keep them under roughly 25MB. GitHub is a code host, not a
video host — it refuses single files over 100MB, and it does not adjust quality
for slow connections the way YouTube does. A 30-second clip is fine. A ten-minute
documentary belongs on YouTube with the ID pasted here.

## Editing the words

**About & beats** holds your bio paragraphs, the portrait photo and the three
"What I cover" cards.

**Experience** is your work history. Each role has a job title, organisation,
dates, and bullet points. Tick *This is my current job* to give it the
highlighted dot on the timeline.

**Skills & tools**, **Education & fellowships** and **Contact details** work the
same way — lists you add to and drag to reorder.

**Headings & wording** covers everything else: the headline at the top, the
opening paragraph, the button labels, every section heading, and your social
links.

Inside any paragraph box you can add a link by writing
`[Netra News](https://netra.news/)`, and make words bold with `**two stars**`
either side. Those two shortcuts are all that is allowed, deliberately — it means
nothing you type can break the page.

---

## Still to fill in

**Four story links.** I built your story list from the screenshot of your Netra
News author page, so I have the headlines and standfirsts but not the addresses.
Four of the six show "Link coming" instead of a link. Open **Selected work**,
paste the real address into each, and they become clickable. I left them unlinked
rather than guessing.

**One story date.** "The bridge that broke the river" has no date, because the
date was not in the screenshot and I would rather show nothing than invent one.

**Nine photographs.** The gallery is currently grey placeholders.

**Three video IDs.** Including "Dhaka's Dying Rivers".

---

## How it is put together

```
index.html          the whole homepage
photos.html         gallery with filters and a lightbox
videos.html         video grid
404.html            shown for a bad address
content/*.json      everything the site says — this is what the dashboard edits
admin/              the dashboard, its settings, and the login helper code
assets/css/         one stylesheet; all colours and fonts are at the very top
assets/js/site.js   reads the JSON files and fills the pages in
uploads/            where dashboard uploads land
.nojekyll           tells GitHub to publish the files exactly as they are
```

Every piece of text on the page exists in two places: in the HTML, and in a JSON
file. The HTML version is what search engines and social media see straight away,
and it is also a safety net — if a JSON file is ever broken or missing, the page
still shows the real content instead of going blank. The JSON version is what the
dashboard edits, and it quietly replaces the HTML when the page loads.

One consequence worth knowing: when you change your bio in the dashboard, the
JSON updates but the copy embedded in `index.html` does not. Visitors see your new
text immediately. Google will pick it up too, since it runs JavaScript, though it
may lag by days. Facebook and LinkedIn link previews read only the static tags, so
those keep showing the original description until someone edits the HTML. For a
bio this rarely matters, but that is the trade-off.

### Colours and fonts

All of them are in one block at the top of `assets/css/style.css`. Change
`--accent` and the whole site changes with it. The teal is taken from your printed
CV so the two match.

### If the page ever looks empty

Opening `index.html` by double-clicking it shows a message about content not
loading. That is normal and not a fault: browsers refuse to let a page opened from
your hard drive read other local files. Run `python3 -m http.server 8000` in the
folder and open `localhost:8000` instead, or just look at the live site.

### A note on the `.nojekyll` file

When you uploaded the folder to GitHub through the browser, that file was silently
dropped — browsers skip files whose names start with a dot. I have put it back. If
you ever re-upload that way, check it is still there, or use `git push` instead.

### Things I decided deliberately

Your editor's email address was in your CV. It is not anywhere on this site; the
references line says "available on request" instead, which is the normal
convention and protects them from scrapers.

Stories without a confirmed link are shown plainly with a "Link coming" marker
rather than pointing at the Netra News homepage, because a link that goes to the
wrong place is worse than no link.

The story list is not sorted by date. It appears in the order you set by dragging,
so the undated story stays where you put it rather than sinking to the bottom and
looking like your oldest work.

### What has not been checked

I verified the structure of this site thoroughly — the files parse, no link points
at anything missing, the escaping holds against injection, every dashboard field
matches a real field in the JSON. But I had no browser available, so nobody has
actually *looked* at the rendered page. Open it and judge the design yourself.
