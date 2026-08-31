/* ==========================================================================
   Md. Al Amin Tusher — site renderer
   --------------------------------------------------------------------------
   Every visible string on this site is read from content/*.json, which the
   dashboard at /admin/ writes to. Three rules make that safe:

     1. An empty value never blanks the page. If a field is empty the text
        already written in the HTML stays exactly as it is.
     2. Things that are meant to be optional — buttons, the "see all" links,
        references, address line 1 — disappear when their label is emptied.
     3. Every section that matters is already in the HTML before this file
        runs. Search engines, link previews and readers without JavaScript get
        the whole portfolio; this file only keeps it in step with the JSON.

   Adding a new editable field is three steps: add it to content/*.json, add
   it to admin/config.yml, and read it here.
   ========================================================================== */
(() => {
  'use strict';

  /* ---------------------------------------------------------------- helpers */
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* Collapse the stray spaces and newlines the dashboard tends to leave behind. */
  const clean = (v) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '');
  const has   = (v) => clean(v) !== '';

  /* Same, but blank lines survive — long video descriptions are written in
     paragraphs and should stay that way. */
  const paragraphs = (v) => (typeof v === 'string' ? v : '')
    .split(/\n\s*\n/).map(clean).filter(Boolean);

  /* Escape before anything goes into innerHTML, so a quote or an ampersand in
     a headline can never break the markup around it. */
  const esc = (v) => clean(v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const isHttp = (url) => /^https?:\/\//i.test(url);

  /* [words](https://example.com) becomes a link. Runs after escaping, so the
     only markup that can appear is the anchor this function writes. */
  const rich = (v) => esc(v).replace(
    /\[([^\]]+)\]\(([^\s)]+)\)/g,
    (_, text, url) => `<a href="${url}"${isHttp(url) ? ' target="_blank" rel="noopener"' : ''}>${text}</a>`
  );

  /* Bengali needs its own typeface and its own screen-reader voice, and the
     content is bilingual, so each string is tagged from its own characters. */
  const BENGALI = /[ঀ-৿]/;
  const langAttr = (v) => (BENGALI.test(typeof v === 'string' ? v : '') ? ' lang="bn"' : '');

  /* Media paths: the dashboard sometimes saves "/assets/img/x.jpg" with a
     leading slash, which breaks on a project URL like /Tusher-Portfolio/. */
  const media = (v) => {
    const url = clean(v);
    if (!url) return '';
    if (isHttp(url) || url.startsWith('data:')) return url;
    return url.startsWith('/') ? '.' + url : url;
  };

  const linkAttrs = (url) =>
    ` href="${esc(url)}"${isHttp(url) ? ' target="_blank" rel="noopener"' : ''}`;

  /* Write only when the JSON has something to say — otherwise keep the HTML. */
  const setText = (sel, value) => {
    const el = $(sel);
    if (el && has(value)) {
      el.textContent = clean(value);
      if (BENGALI.test(clean(value))) el.setAttribute('lang', 'bn');
      else el.removeAttribute('lang');
    }
    return el;
  };

  const setHTML = (sel, html) => {
    const el = $(sel);
    if (el && html) el.innerHTML = html;
    return el;
  };

  const setAttr = (sel, attr, value) => {
    const el = $(sel);
    if (el && has(value)) el.setAttribute(attr, clean(value));
    return el;
  };

  /* For the optional bits: a label fills the element, an empty label hides it. */
  const setOptional = (sel, label, url) => {
    const el = $(sel);
    if (!el) return null;
    if (!has(label)) { el.hidden = true; return el; }
    el.hidden = false;
    const slot = $('[data-label]', el) || el;
    slot.textContent = clean(label);
    if (has(url) && 'href' in el) el.setAttribute('href', clean(url));
    return el;
  };

  /* A list only replaces what is on the page if it actually has entries. */
  const listOf = (value) => (Array.isArray(value) ? value : []);
  const rows   = (value, keys) => listOf(value)
    .filter((item) => item && keys.some((k) => has(item[k])));
  /* --------------------------------------------------------------- pictures */
  /* tools/optimize-images.sh writes 480/960/1600px versions of every original
     and records their real dimensions in this manifest. Reading it means the
     browser downloads a 40 KB file for a thumbnail instead of a 16 MB one. */
  const PHOTO_SIZES = '(max-width: 940px) 45vw, (max-width: 1320px) 30vw, 340px';
  /* The homepage strip is five squares across, so its tiles are far smaller
     than a gallery frame and must say so — otherwise every one of them
     downloads the 960px copy it has no use for. */
  const STRIP_SIZES = '(max-width: 640px) 31vw, (max-width: 1240px) 18vw, 230px';
  let manifest = {};

  const loadManifest = async () => {
    try {
      const res = await fetch('./assets/img/opt/manifest.json', { cache: 'no-cache' });
      if (res.ok) manifest = (await res.json()) || {};
    } catch (err) {
      /* No manifest, no problem: the originals are still on disk. */
    }
  };

  /* Anything uploaded through the dashboard after the last optimisation run is
     not in the manifest yet, so it falls back to the original file. It works —
     it is just heavier until the script is run again. */
  const imgAttrs = (src, sizes = PHOTO_SIZES) => {
    const entry = manifest[src.replace(/^\.\//, '')];
    const variants = entry ? listOf(entry.v) : [];
    if (!variants.length) return ` src="${esc(src)}"`;
    const srcset = variants.map(([w, , path]) => `${path} ${w}w`).join(', ');
    const fallback = variants[Math.min(1, variants.length - 1)][2];
    return ` src="${esc(fallback)}" srcset="${esc(srcset)}" sizes="${esc(sizes)}"` +
           ` width="${Number(entry.w) || ''}" height="${Number(entry.h) || ''}"`;
  };

  /* ----------------------------------------------------------------- loading */
  /* no-cache, not no-store: the browser still asks whether the file changed,
     so an edit published from the dashboard shows up on the next refresh, but
     an unchanged file costs a 304 rather than a fresh download. */
  const loadJSON = async (name) => {
    try {
      const res = await fetch(`./content/${name}.json`, { cache: 'no-cache' });
      if (!res.ok) return {};
      return (await res.json()) || {};
    } catch (err) {
      console.warn(`[site] could not load content/${name}.json —`, err.message);
      return {};
    }
  };

  const loadAll = async (names) => {
    const results = await Promise.all(names.map(loadJSON));
    return names.reduce((out, name, i) => { out[name] = results[i]; return out; }, {});
  };

  /* ------------------------------------------------------- header and footer */
  function renderChrome(site) {
    const brand = site.brand || {};
    setText('#brand-name', brand.name);

    [['work', 'nav_work'], ['photography', 'nav_photography'], ['video', 'nav_video'],
     ['about', 'nav_about'], ['experience', 'nav_experience'], ['skills', 'nav_skills'],
     ['credentials', 'nav_credentials'], ['contact', 'nav_contact']]
      .forEach(([key, field]) => setText(`[data-nav="${key}"]`, brand[field]));

    const footer = site.footer || {};
    setText('#footer-left', footer.left);
    setText('#footer-right', footer.right);

    const year = $('#year');
    if (year) year.textContent = String(new Date().getFullYear());
  }

  function renderSEO(site) {
    const seo = site.seo || {};
    if (has(seo.title)) document.title = clean(seo.title);
    if (has(seo.description)) setAttr('meta[name="description"]', 'content', seo.description);
  }
  /* -------------------------------------------------------------------- hero */
  const PORTRAIT_SIZES = '(max-width: 880px) 290px, (max-width: 1307px) 36vw, 415px';

  /* Same manifest lookup as imgAttrs, but for an element already on the page. */
  const applyImg = (el, src, sizes) => {
    if (!el || !src) return;
    const entry = manifest[src.replace(/^\.\//, '')];
    const variants = entry ? listOf(entry.v) : [];
    if (!variants.length) {
      /* A freshly uploaded picture has no derivatives and, more to the point,
         no known shape — so the old dimensions have to go with them. */
      ['srcset', 'sizes', 'width', 'height'].forEach((a) => el.removeAttribute(a));
      el.setAttribute('src', src);
      return;
    }
    el.setAttribute('srcset', variants.map(([w, , path]) => `${path} ${w}w`).join(', '));
    el.setAttribute('sizes', sizes);
    el.setAttribute('src', variants[Math.min(1, variants.length - 1)][2]);
    if (entry.w) el.setAttribute('width', String(entry.w));
    if (entry.h) el.setAttribute('height', String(entry.h));
  };

  function renderHero(site, about, profile) {
    const hero = site.hero || {};
    setText('#hero-eyebrow', hero.eyebrow);
    setText('#hero-name', hero.name);
    setText('#hero-tagline', hero.tagline);
    setText('#hero-lead', hero.lead);

    setOptional('#cta-primary', hero.cta_primary, hero.cta_primary_url);
    /* An empty second button URL falls back to the contact email, so the
       address only has to be kept in one place. */
    setOptional('#cta-secondary', hero.cta_secondary,
      has(hero.cta_secondary_url) ? hero.cta_secondary_url
        : (has(profile.email) ? `mailto:${clean(profile.email)}` : ''));

    const facts = listOf(profile.facts).map(clean).filter(Boolean);
    if (facts.length) setHTML('#facts', facts.map((f) => `<li>${esc(f)}</li>`).join(''));

    applyImg($('#portrait-img'), media(about.portrait), PORTRAIT_SIZES);
    setAttr('#portrait-img', 'alt', about.portrait_alt);
  }

  /* ------------------------------------------------------------------- beats */
  function renderBeats(about) {
    setText('#beats-eyebrow', about.beats_eyebrow);

    const beats = rows(about.beats, ['title', 'text']);
    if (!beats.length) return;
    setHTML('#beats', beats.map((beat) => `
      <div class="beat" data-reveal>
        <h3${langAttr(beat.title)}>${esc(beat.title)}</h3>
        <p${langAttr(beat.text)}>${rich(beat.text)}</p>
      </div>`).join(''));
  }

  /* ------------------------------------------------------------------- about */
  function renderAbout(about) {
    setText('#about-eyebrow', about.eyebrow);
    setText('#about-heading', about.heading);

    const paras = listOf(about.paragraphs).map(clean).filter(Boolean);
    if (paras.length) {
      setHTML('#about-prose', paras.map((p) => `<p${langAttr(p)}>${rich(p)}</p>`).join(''));
    }
  }
  /* ----------------------------------------------------------- selected work */
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /* "2025-10-25" reads as "25 Oct 2025". Anything the dashboard's date picker
     did not write is passed through untouched, so "Autumn 2025" still works. */
  const storyDate = (value, cls) => {
    const raw = clean(value);
    if (!raw) return '';
    const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
    const month = parts ? MONTHS[Number(parts[2]) - 1] : '';
    const text = month ? `${Number(parts[3])} ${month} ${parts[1]}` : raw;
    const attr = cls ? ` class="${cls}"` : '';
    return month
      ? `<time${attr} datetime="${esc(raw.slice(0, 10))}">${esc(text)}</time>`
      : `<span${attr}>${esc(text)}</span>`;
  };

  /* The lead card says what kind of thing it is opening. */
  const CTA = {
    interactive: 'Open the interactive',
    report: 'Read the report',
    investigation: 'Read the investigation',
    data: 'Explore the data',
    video: 'Watch the film',
    photo: 'See the photographs',
    'photo essay': 'See the photo essay'
  };
  const ctaLabel = (format) => CTA[clean(format).toLowerCase()] || 'Read the story';

  /* The first story in stories.json is the lead. Reordering in the dashboard is
     all it takes to change which one that is. */
  const storyLede = (story) => {
    const url = clean(story.url);
    const tag = url ? 'a' : 'div';
    return `
      <${tag} class="lede"${url ? linkAttrs(url) : ''} data-reveal>
        <div class="lede-slug">
          ${has(story.outlet) ? `<span class="slug-outlet">${esc(story.outlet)}</span>` : ''}
          ${storyDate(story.date, '')}
          ${has(story.format) ? `<span>${esc(story.format)}</span>` : ''}
        </div>
        <h3${langAttr(story.title)}>${esc(story.title)}</h3>
        <p${langAttr(story.standfirst)}>${esc(story.standfirst)}</p>
        ${url
          ? `<div class="lede-go">${esc(ctaLabel(story.format))} <span class="arrow" aria-hidden="true">&rarr;</span></div>`
          : '<div class="index-pending">Pending</div>'}
      </${tag}>`;
  };

  const storyRow = (story) => {
    const url = clean(story.url);
    const tag = url ? 'a' : 'div';
    return `
        <${tag} class="index-row${url ? '' : ' index-row--nolink'}"${url ? linkAttrs(url) : ''} data-reveal>
          <div class="index-slug">
            ${has(story.outlet) ? `<span class="slug-outlet">${esc(story.outlet)}</span>` : ''}
            ${storyDate(story.date, 'slug-date')}
            ${has(story.format) ? `<span class="slug-format">${esc(story.format)}</span>` : ''}
          </div>
          <div class="index-body">
            <h3${langAttr(story.title)}>${esc(story.title)}</h3>
            <p${langAttr(story.standfirst)}>${esc(story.standfirst)}</p>
          </div>
          ${url
            ? '<div class="index-go" aria-hidden="true">&rarr;</div>'
            : '<div class="index-pending">Pending</div>'}
        </${tag}>`;
  };

  function renderStories(site, stories) {
    const head = site.work || {};
    setText('#work-eyebrow', head.eyebrow);
    setText('#work-heading', head.heading);
    setText('#work-lead', head.lead);

    const items = rows(stories.items, ['title', 'standfirst']);
    if (!items.length) return;

    const rest = items.slice(1);
    setHTML('#story-index', storyLede(items[0]) +
      (rest.length ? `\n<div class="index-list">${rest.map(storyRow).join('')}\n</div>` : ''));
  }
  /* ------------------------------------------------------------- photography */
  /* Five is one full row of the homepage strip, and the video row below it uses
     the same number. The gallery and video pages show everything. */
  const STRIP_COUNT = 5;

  const photoList = (photos) => rows(photos.items, ['image', 'src', 'url', 'title'])
    .map((photo) => {
      const src = media(photo.image || photo.src || photo.url);
      const title = clean(photo.title) || clean(photo.caption) || 'Photograph';
      const meta = [clean(photo.location), clean(photo.year)].filter(Boolean).join(' · ');
      return { src, title, meta, caption: clean(photo.caption), category: clean(photo.category) };
    })
    .filter((photo) => photo.src !== '');

  /* The caption sits over the picture on hover and on keyboard focus; the title
     is the alt text, because that is the description of what is in the frame. */
  const frameInner = (photo, sizes) => `
        <img${imgAttrs(photo.src, sizes)} alt="${esc(photo.title)}" loading="lazy" decoding="async">
        ${photo.caption || photo.meta ? `<span class="frame-cap">
          ${photo.caption ? `<span class="cap-title"${langAttr(photo.caption)}>${esc(photo.caption)}</span>` : ''}
          ${photo.meta ? `<span class="cap-meta">${esc(photo.meta)}</span>` : ''}
        </span>` : ''}`;

  function renderPhotos(site, photos) {
    const head = site.photography || {};
    setText('#photo-eyebrow', head.eyebrow);
    setText('#photo-heading', head.heading);
    setText('#photo-lead', photos.intro);
    setOptional('#photo-link', head.link_label, head.link_url);

    const items = photoList(photos);
    if (!items.length) return;

    /* Each frame on the homepage is a link through to the gallery — which is
       exactly what happens with JavaScript off, too. */
    const href = has(head.link_url) ? clean(head.link_url) : 'photos.html';
    setHTML('#photo-strip', items.slice(0, STRIP_COUNT).map((photo) => `
      <a class="frame" href="${esc(href)}">${frameInner(photo, STRIP_SIZES)}
      </a>`).join(''));
  }

  /* -------------------------------------------------------------------- video */
  const YT = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|shorts\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/;
  const PLAY_SVG =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';

  const videoList = (videos) => rows(videos.items, ['title', 'youtube_id', 'url'])
    .map((video) => {
      const raw = clean(video.youtube_id) || clean(video.url);
      const match = raw.match(YT);
      const id = match ? match[1] : (/^[\w-]{11}$/.test(raw) ? raw : '');
      const thumb = has(video.thumbnail) ? media(video.thumbnail)
        : (id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : '');
      const url = has(video.url) ? media(video.url)
        : (id ? `https://www.youtube.com/watch?v=${id}` : '');
      return {
        url, thumb, id,
        title: clean(video.title),
        year: clean(video.year),
        outlet: clean(video.outlet),
        paras: paragraphs(video.description)
      };
    });

  /* The whole card is the link, so the accessible name is the headline rather
     than a bare image. withText is off on the homepage: one paragraph is a
     teaser — the stylesheet cuts it to three lines there so the row of five
     cards keeps one height — and the full description belongs on the video
     page. */
  const videoCard = (video, withText) => {
    const tag = video.url ? 'a' : 'div';
    const meta = [video.outlet ? `<span class="v-outlet">${esc(video.outlet)}</span>` : '', esc(video.year)]
      .filter(Boolean).join(' · ');
    const body = withText ? video.paras : video.paras.slice(0, 1);
    return `
      <${tag} class="video-card"${video.url ? linkAttrs(video.url) : ''} data-reveal>
        <span class="video-thumb">
          ${video.thumb
            ? `<img src="${esc(video.thumb)}" alt="" width="480" height="360" loading="lazy" decoding="async">`
            : ''}
          <span class="play" aria-hidden="true"><span>${PLAY_SVG}</span></span>
        </span>
        <h3${langAttr(video.title)}>${esc(video.title)}</h3>
        ${meta ? `<p class="v-meta">${meta}</p>` : ''}
        ${body.map((p) => `<p class="v-desc"${langAttr(p)}>${esc(p)}</p>`).join('')}
      </${tag}>`;
  };

  function renderVideos(site, videos) {
    const head = site.video || {};
    setText('#video-eyebrow', head.eyebrow);
    setText('#video-heading', head.heading);
    setText('#video-lead', videos.intro);
    setOptional('#video-link', head.link_label, head.link_url);

    const items = videoList(videos);
    if (!items.length) return;
    setHTML('#video-strip', items.slice(0, STRIP_COUNT).map((video) => videoCard(video, false)).join(''));
  }
  /* --------------------------------------------------------------- experience */
  function renderExperience(site, experience) {
    const head = site.experience || {};
    setText('#exp-eyebrow', head.eyebrow);
    setText('#exp-heading', head.heading);

    const jobs = rows(experience.items, ['role', 'org', 'period']);
    if (!jobs.length) return;

    setHTML('#timeline', jobs.map((job) => {
      const bullets = listOf(job.bullets).map(clean).filter(Boolean);
      return `
      <article class="job${job.current ? ' job--current' : ''}" data-reveal>
        <span class="job-date">${esc(job.period)}</span>
        <h3>${esc(job.role)}${has(job.note) ? ` <span class="job-note">(${esc(job.note)})</span>` : ''}</h3>
        ${has(job.org) ? `<span class="org">${esc(job.org)}</span>` : ''}
        ${bullets.length ? `<ul>${bullets.map((b) => `<li>${rich(b)}</li>`).join('')}</ul>` : ''}
      </article>`;
    }).join(''));
  }

  /* ------------------------------------------------------------------ skills */
  function renderSkills(site, skills) {
    const head = site.skills || {};
    setText('#skills-eyebrow', head.eyebrow);
    setText('#skills-heading', head.heading);

    const groups = rows(skills.groups, ['title', 'items'])
      .map((group) => ({ title: clean(group.title), items: listOf(group.items).map(clean).filter(Boolean) }))
      .filter((group) => group.items.length || group.title);
    if (!groups.length) return;

    setHTML('#skills-grid', groups.map((group) => `
      <div class="skill-group" data-reveal>
        <h3>${esc(group.title)}</h3>
        <ul class="tags">${group.items.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>
      </div>`).join(''));
  }

  /* ------------------------------------------------------------- credentials */
  const credList = (selector, items) => {
    const entries = rows(items, ['title', 'meta', 'result']);
    if (!entries.length) return;
    setHTML(selector, entries.map((entry) => `
      <li>
        <strong>${esc(entry.title)}</strong>
        ${has(entry.meta) ? `<span class="meta">${rich(entry.meta)}</span>` : ''}
        ${has(entry.result) ? `<span class="result">${esc(entry.result)}</span>` : ''}
      </li>`).join(''));
  };

  function renderCredentials(site, credentials) {
    const head = site.credentials || {};
    setText('#cred-eyebrow', head.eyebrow);
    setText('#cred-heading', head.heading);

    setText('#education-label', credentials.education_label);
    setText('#training-label', credentials.training_label);
    setText('#extras-label', credentials.extras_label);

    credList('#education-list', credentials.education);
    credList('#training-list', credentials.training);
    credList('#extras-list', credentials.extras);
  }

  /* ----------------------------------------------------------------- contact */
  const SOCIALS = [
    ['linkedin', 'LinkedIn'], ['twitter', 'X'], ['instagram', 'Instagram'],
    ['facebook', 'Facebook'], ['youtube', 'YouTube'], ['website', 'Website']
  ];

  function renderContact(site, profile) {
    const head = site.contact || {};
    setText('#contact-eyebrow', head.eyebrow);
    setText('#contact-heading', head.heading);
    setText('#contact-lead', head.lead);

    setOptional('#contact-email', profile.email,
      has(profile.email) ? `mailto:${clean(profile.email)}` : '');
    setOptional('#contact-phone', profile.phone_display,
      has(profile.phone) ? `tel:${clean(profile.phone).replace(/[^\d+]/g, '')}` : '');

    setText('#based-label', head.based_in_label);
    const lines = [clean(profile.location_line_1), clean(profile.location_line_2)].filter(Boolean);
    if (lines.length) setHTML('#based-text', lines.map((l) => `<span>${esc(l)}</span>`).join('<br>'));

    setText('#elsewhere-label', head.elsewhere_label);
    const links = SOCIALS
      .map(([key, label]) => ({ label, url: clean(profile[key]) }))
      .filter((link) => link.url !== '');
    if (links.length) {
      setHTML('#socials', links.map((link) => `
        <li><a href="${esc(link.url)}" target="_blank" rel="noopener">${esc(link.label)}</a></li>`).join(''));
    }

    /* References is off unless something is written in it. */
    const refBlock = $('#references-block');
    if (refBlock) {
      if (has(profile.references)) {
        refBlock.hidden = false;
        setText('#references-label', head.references_label);
        setText('#references-text', profile.references);
      } else {
        refBlock.hidden = true;
      }
    }
  }
  /* ------------------------------------------------- photography page (grid) */
  function renderGalleryPage(photos) {
    const grid = $('#masonry');
    if (!grid) return;

    setText('#gallery-intro', photos.intro);

    const all = photoList(photos);
    if (!all.length) return;

    const cats = listOf(photos.categories).map(clean).filter(Boolean)
      .filter((cat) => all.some((photo) => photo.category === cat));

    const filters = $('#filters');
    if (filters && cats.length) {
      filters.innerHTML = [['', 'All'], ...cats.map((c) => [c, c])]
        .map(([value, label], i) => `
          <button class="filter${i === 0 ? ' is-on' : ''}" type="button"
                  data-filter="${esc(value)}" aria-pressed="${i === 0}">${esc(label)}</button>`)
        .join('');
    }

    let shown = all;
    const count = $('#gallery-count');

    const paint = () => {
      grid.innerHTML = shown.map((photo, i) => `
        <button class="frame" type="button" data-index="${i}" aria-label="Open photograph: ${esc(photo.caption || photo.title)}">${frameInner(photo)}
        </button>`).join('');
      /* The count is a live region so that pressing a filter says how many
         frames are left. Writing the same text it already holds would make a
         reader announce it on load for no reason, so that write is skipped. */
      if (!count) return;
      const label = `${shown.length} ${shown.length === 1 ? 'photograph' : 'photographs'}`;
      if (count.textContent.trim() !== label) count.textContent = label;
    };

    paint();

    if (filters) {
      filters.addEventListener('click', (event) => {
        const button = event.target.closest('[data-filter]');
        if (!button) return;
        const value = button.dataset.filter;
        shown = value ? all.filter((photo) => photo.category === value) : all;
        $$('.filter', filters).forEach((el) => {
          const on = el === button;
          el.classList.toggle('is-on', on);
          el.setAttribute('aria-pressed', String(on));
        });
        paint();
      });
    }

    setupLightbox(grid, () => shown);
  }

  /* --------------------------------------------------------------- lightbox */
  /* The largest derivative, not the original — a 16 MB camera file is not a
     web page. */
  const variantsFor = (src) => {
    const entry = manifest[src.replace(/^\.\//, '')];
    return entry ? listOf(entry.v) : [];
  };

  const FOCUSABLE = 'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

  function setupLightbox(grid, getItems) {
    const box = $('#lightbox');
    if (!box) return;

    const img = $('.lb-img', box);
    const title = $('.lb-title', box);
    const meta = $('.lb-meta', box);
    const count = $('.lb-count', box);
    const closeBtn = $('.lb-close', box);
    let at = 0;
    let opener = null;

    const show = (index) => {
      const items = getItems();
      if (!items.length) return;
      at = (index + items.length) % items.length;
      const photo = items[at];
      const variants = variantsFor(photo.src);
      if (variants.length) {
        img.srcset = variants.map(([w, , path]) => `${path} ${w}w`).join(', ');
        img.sizes = '(max-width: 900px) 92vw, 1100px';
        img.src = variants[variants.length - 1][2];
      } else {
        img.removeAttribute('srcset');
        img.removeAttribute('sizes');
        img.src = photo.src;
      }
      img.alt = photo.title;
      title.textContent = photo.caption || photo.title;
      if (BENGALI.test(photo.caption || photo.title)) title.setAttribute('lang', 'bn');
      else title.removeAttribute('lang');
      meta.textContent = photo.meta;
      count.textContent = `${at + 1} / ${items.length}`;
    };

    const open = (index) => {
      opener = document.activeElement;
      show(index);
      box.classList.add('is-open');
      box.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      closeBtn.focus();
    };

    const close = () => {
      box.classList.remove('is-open');
      box.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      img.removeAttribute('srcset');
      img.src = '';
      if (opener && opener.focus) opener.focus();
    };

    grid.addEventListener('click', (event) => {
      const item = event.target.closest('[data-index]');
      if (item) open(Number(item.dataset.index));
    });

    closeBtn.addEventListener('click', close);
    $('.lb-prev', box).addEventListener('click', () => show(at - 1));
    $('.lb-next', box).addEventListener('click', () => show(at + 1));
    box.addEventListener('click', (event) => { if (event.target === box) close(); });

    document.addEventListener('keydown', (event) => {
      if (!box.classList.contains('is-open')) return;
      if (event.key === 'Escape') return close();
      if (event.key === 'ArrowLeft') return show(at - 1);
      if (event.key === 'ArrowRight') return show(at + 1);
      /* Tab must not walk out of the dialog and into the page behind it. */
      if (event.key !== 'Tab') return;
      const stops = $$(FOCUSABLE, box).filter((el) => el.offsetParent !== null);
      if (!stops.length) return;
      const first = stops[0];
      const last = stops[stops.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    });
  }

  /* -------------------------------------------------------------- video page */
  function renderVideoPage(videos) {
    const grid = $('#video-grid');
    if (!grid) return;
    setText('#video-intro', videos.intro);
    const items = videoList(videos);
    if (items.length) grid.innerHTML = items.map((video) => videoCard(video, true)).join('');
  }
  /* ------------------------------------------------------- menu and chrome */
  function setupMenu() {
    const toggle = $('.nav-toggle');
    const nav = $('#primary-nav');
    if (!toggle || !nav) return;

    const setMenu = (open) => {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.body.classList.toggle('nav-locked', open);
    };

    toggle.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));

    /* Tapping a link, pressing Escape, tapping the page behind it, or growing
       the window all close the menu — otherwise the scroll lock can outlive it. */
    nav.addEventListener('click', (event) => {
      if (event.target.closest('a')) setMenu(false);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && nav.classList.contains('is-open')) {
        setMenu(false);
        toggle.focus();
      }
    });

    document.addEventListener('click', (event) => {
      if (!nav.classList.contains('is-open')) return;
      if (nav.contains(event.target) || toggle.contains(event.target)) return;
      setMenu(false);
    });

    addEventListener('resize', () => {
      if (innerWidth > 940 && nav.classList.contains('is-open')) setMenu(false);
    });
  }

  function setupScroll() {
    const header = $('.site-header');
    const bar = $('#progress');
    const toTop = $('#to-top');
    let queued = false;

    const measure = () => {
      queued = false;
      const y = scrollY;
      if (header) header.classList.toggle('is-stuck', y > 8);
      if (bar) {
        const span = document.documentElement.scrollHeight - innerHeight;
        bar.style.transform = `scaleX(${span > 8 ? Math.min(1, y / span) : 0})`;
      }
      if (toTop) toTop.classList.toggle('is-on', y > innerHeight * 0.9);
    };

    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(measure);
    };

    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll, { passive: true });
    measure();

    if (toTop) {
      toTop.addEventListener('click', () => {
        scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' });
        /* Keyboard readers should carry on from the top of the page, not from
           a button that has just scrolled out of sight. */
        const brand = $('.brand');
        if (brand) brand.focus();
      });
    }
  }

  /* The nav tells you where you are in a page this long. */
  function setupSpy() {
    const links = $$('.nav a[data-nav]');
    if (!links.length || !('IntersectionObserver' in window)) return;

    const owners = new Map();
    links.forEach((link) => {
      const href = link.getAttribute('href') || '';
      if (href.charAt(0) !== '#') return;
      const section = document.getElementById(href.slice(1));
      if (section) owners.set(section, link);
    });
    if (!owners.size) return;

    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((link) => link.classList.remove('is-here'));
        const link = owners.get(entry.target);
        if (link) link.classList.add('is-here');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    owners.forEach((_, section) => spy.observe(section));
  }

  /* --------------------------------------------------------------- reveals */
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* The CSS only hides [data-reveal] inside .js-reveal, and this is the one
     place that class is set: synchronously, before the first paint, and only
     when there is an observer standing by to take it off again. Anything that
     hides content has to be certain it can show it again. */
  function armReveals() {
    if (reduced() || !('IntersectionObserver' in window)) return;
    if ($('[data-reveal]')) document.documentElement.classList.add('js-reveal');
  }

  function reveal() {
    const items = $$('[data-reveal]');
    if (!items.length) return;
    if (!document.documentElement.classList.contains('js-reveal')) return;

    const watcher = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        watcher.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

    items.forEach((el) => watcher.observe(el));

    /* An observer that never delivers would leave the page blank. A second
       later, if not one section has been revealed, give up on the animation
       and show everything. */
    setTimeout(() => {
      if ($('[data-reveal].is-in')) return;
      watcher.disconnect();
      document.documentElement.classList.remove('js-reveal');
    }, 1000);
  }

  /* A link into #contact must still land on #contact after hydration has
     changed how tall everything above it is. */
  function landOnHash() {
    const id = location.hash.slice(1);
    if (!id) return;
    const target = document.getElementById(id);
    if (target) target.scrollIntoView({ block: 'start', behavior: 'auto' });
  }
  /* ------------------------------------------------------------------- boot */
  /* Each page asks only for the files it renders. The 404 page wants the
     header and footer and nothing else. */
  const whichPage = () => {
    if (has(document.body.dataset.page)) return clean(document.body.dataset.page);
    if ($('#masonry')) return 'photos';
    if ($('#video-grid')) return 'videos';
    return 'home';
  };

  const PAGES = {
    home: {
      files: ['site', 'profile', 'about', 'stories', 'photos', 'videos',
        'experience', 'skills', 'credentials'],
      render(c) {
        renderChrome(c.site);
        renderSEO(c.site);
        renderHero(c.site, c.about, c.profile);
        renderBeats(c.about);
        renderAbout(c.about);
        renderStories(c.site, c.stories);
        renderPhotos(c.site, c.photos);
        renderVideos(c.site, c.videos);
        renderExperience(c.site, c.experience);
        renderSkills(c.site, c.skills);
        renderCredentials(c.site, c.credentials);
        renderContact(c.site, c.profile);
      },
    },
    photos: {
      files: ['site', 'photos'],
      render(c) { renderChrome(c.site); renderGalleryPage(c.photos); },
    },
    videos: {
      files: ['site', 'videos'],
      render(c) { renderChrome(c.site); renderVideoPage(c.videos); },
    },
    404: {
      files: ['site'],
      render(c) { renderChrome(c.site); },
    },
  };

  async function boot() {
    const page = PAGES[whichPage()] || PAGES.home;

    try {
      const [content] = await Promise.all([loadAll(page.files), loadManifest()]);
      page.render(content);
    } catch (err) {
      /* The HTML already carries the whole page. A failed render costs the
         reader the newest edits, not the site. */
      console.warn('[site] render stopped early —', err.message);
    }

    reveal();
    setupSpy();
    landOnHash();
  }

  /* Chrome that needs no content at all runs immediately; nothing here waits
     on the network. armReveals() has to be one of them — it decides what is
     hidden, so it must run before the browser paints, not after a fetch. */
  armReveals();
  setupMenu();
  setupScroll();
  boot();
})();
