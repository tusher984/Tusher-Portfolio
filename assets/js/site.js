/* ==========================================================================
   Md. Al Amin Tusher — site renderer
   --------------------------------------------------------------------------
   Every visible string on this site is read from content/*.json, which the
   dashboard at /admin/ writes to. Two rules make that safe:

     1. An empty value never blanks the page. If a field is empty the text
        already written in the HTML stays exactly as it is.
     2. Things that are meant to be optional — buttons, the "see all" links,
        references, address line 1 — disappear when their label is emptied.

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

  /* Media paths: the dashboard sometimes saves "/assets/img/x.jpg" with a
     leading slash, which breaks on a project URL like /Tusher-Portfolio/. */
  const media = (v) => {
    const url = clean(v);
    if (!url) return '';
    if (isHttp(url) || url.startsWith('data:')) return url;
    return url.startsWith('/') ? '.' + url : url;
  };

  /* Write only when the JSON has something to say — otherwise keep the HTML. */
  const setText = (sel, value) => {
    const el = $(sel);
    if (el && has(value)) el.textContent = clean(value);
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

  /* ----------------------------------------------------------------- loading */
  /* The timestamp is deliberate: it means an edit published from the dashboard
     shows up on the very next refresh instead of waiting for a cache to expire. */
  const loadJSON = async (name) => {
    try {
      const res = await fetch(`./content/${name}.json?v=${Date.now()}`, { cache: 'no-store' });
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
     ['skills', 'nav_skills'], ['about', 'nav_about'], ['contact', 'nav_contact']]
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

    setAttr('#portrait-img', 'src', media(about.portrait));
    setAttr('#portrait-img', 'alt', about.portrait_alt);
  }

  /* ------------------------------------------------------------------- beats */
  function renderBeats(about) {
    setText('#beats-eyebrow', about.beats_eyebrow);

    const beats = rows(about.beats, ['title', 'text']);
    if (!beats.length) return;
    setHTML('#beats', beats.map((beat) => `
      <div class="beat" data-reveal>
        <h3>${esc(beat.title)}</h3>
        <p>${rich(beat.text)}</p>
      </div>`).join(''));
  }

  /* ------------------------------------------------------------------- about */
  function renderAbout(about) {
    setText('#about-eyebrow', about.eyebrow);
    setText('#about-heading', about.heading);

    const paras = listOf(about.paragraphs).map(clean).filter(Boolean);
    if (paras.length) setHTML('#about-prose', paras.map((p) => `<p>${rich(p)}</p>`).join(''));
  }

  /* ----------------------------------------------------------- selected work */
  function renderStories(site, stories) {
    const head = site.work || {};
    setText('#work-eyebrow', head.eyebrow);
    setText('#work-heading', head.heading);
    setText('#work-lead', head.lead);

    const items = rows(stories.items, ['title', 'standfirst']);
    if (!items.length) return;

    setHTML('#story-index', items.map((story) => {
      const url = clean(story.url);
      const linked = url !== '';
      const tag = linked ? 'a' : 'div';
      const attrs = linked
        ? ` href="${esc(url)}"${isHttp(url) ? ' target="_blank" rel="noopener"' : ''}`
        : '';
      return `
      <${tag} class="index-row${linked ? '' : ' index-row--nolink'}"${attrs}>
        <div class="index-slug">
          <span class="slug-outlet">${esc(story.outlet)}</span>
          ${has(story.format) ? `<span class="slug-format">${esc(story.format)}</span>` : ''}
        </div>
        <div class="index-body">
          <h3>${esc(story.title)}</h3>
          <p>${esc(story.standfirst)}</p>
        </div>
        ${linked
          ? '<div class="index-go" aria-hidden="true">&rarr;</div>'
          : '<div class="index-pending">Pending</div>'}
      </${tag}>`;
    }).join(''));
  }

  /* ------------------------------------------------------------- photography */
  const photoList = (photos) => rows(photos.items, ['image', 'src', 'url', 'title'])
    .map((photo) => {
      const src = media(photo.image || photo.src || photo.url);
      const title = clean(photo.title) || clean(photo.caption) || 'Photograph';
      const meta = [clean(photo.location), clean(photo.year)].filter(Boolean).join(' · ');
      return { src, title, meta, caption: clean(photo.caption), category: clean(photo.category) };
    })
    .filter((photo) => photo.src !== '');

  function renderPhotos(site, photos) {
    const head = site.photography || {};
    setText('#photo-eyebrow', head.eyebrow);
    setText('#photo-heading', head.heading);
    setText('#photo-lead', photos.intro);
    setOptional('#photo-link', head.link_label, head.link_url);

    const items = photoList(photos);
    if (!items.length) return;
    setHTML('#photo-strip', items.map((photo, i) => `
      <a href="${esc(photo.src)}" target="_blank" rel="noopener"
         title="${esc(photo.title)}" data-reveal data-photo="${i}">
        <img src="${esc(photo.src)}" alt="${esc(photo.title)}" loading="lazy" decoding="async">
      </a>`).join(''));
  }

  /* -------------------------------------------------------------------- video */
  const YT = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|shorts\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/;

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
        description: clean(video.description)
      };
    });

  const videoCard = (video, withText) => {
    const linkOpen = video.url
      ? `<a class="video-thumb" href="${esc(video.url)}"${isHttp(video.url) ? ' target="_blank" rel="noopener"' : ''}>`
      : '<div class="video-thumb">';
    const linkClose = video.url ? '</a>' : '</div>';
    const meta = [video.year, video.outlet ? `<span class="v-outlet">${esc(video.outlet)}</span>` : '']
      .filter(Boolean).join(' · ');
    return `
      <div class="video-card" data-reveal>
        ${linkOpen}
          ${video.thumb
            ? `<img src="${esc(video.thumb)}" alt="${esc(video.title) || 'Video'}" loading="lazy" decoding="async">`
            : ''}
          <div class="play"><span aria-hidden="true">&#9654;</span></div>
        ${linkClose}
        <h3>${esc(video.title)}</h3>
        ${meta ? `<p class="v-meta">${meta}</p>` : ''}
        ${withText && video.description ? `<p class="v-desc">${esc(video.description)}</p>` : ''}
      </div>`;
  };

  function renderVideos(site, videos) {
    const head = site.video || {};
    setText('#video-eyebrow', head.eyebrow);
    setText('#video-heading', head.heading);
    setText('#video-lead', videos.intro);
    setOptional('#video-link', head.link_label, head.link_url);

    const items = videoList(videos);
    if (!items.length) return;
    setHTML('#video-strip', items.map((video) => videoCard(video, false)).join(''));
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

    const paint = () => {
      grid.innerHTML = shown.map((photo, i) => `
        <button class="masonry-item" type="button" data-index="${i}" aria-label="Open ${esc(photo.title)}">
          <img src="${esc(photo.src)}" alt="${esc(photo.title)}" loading="lazy" decoding="async">
          ${photo.caption || photo.meta ? `
          <span class="masonry-cap">
            ${photo.caption ? `<span class="cap-title">${esc(photo.caption)}</span>` : ''}
            ${photo.meta ? `<span class="cap-meta">${esc(photo.meta)}</span>` : ''}
          </span>` : ''}
        </button>`).join('');
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
  function setupLightbox(grid, getItems) {
    const box = $('#lightbox');
    if (!box) return;

    const img = $('.lb-img', box);
    const title = $('.lb-title', box);
    const meta = $('.lb-meta', box);
    const count = $('.lb-count', box);
    let at = 0;
    let opener = null;

    const show = (index) => {
      const items = getItems();
      if (!items.length) return;
      at = (index + items.length) % items.length;
      const photo = items[at];
      img.src = photo.src;
      img.alt = photo.title;
      title.textContent = photo.caption || photo.title;
      meta.textContent = photo.meta;
      count.textContent = `${at + 1} / ${items.length}`;
    };

    const open = (index) => {
      opener = document.activeElement;
      show(index);
      box.classList.add('is-open');
      box.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      $('.lb-close', box).focus();
    };

    const close = () => {
      box.classList.remove('is-open');
      box.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      img.src = '';
      if (opener && opener.focus) opener.focus();
    };

    grid.addEventListener('click', (event) => {
      const item = event.target.closest('[data-index]');
      if (item) open(Number(item.dataset.index));
    });

    $('.lb-close', box).addEventListener('click', close);
    $('.lb-prev', box).addEventListener('click', () => show(at - 1));
    $('.lb-next', box).addEventListener('click', () => show(at + 1));
    box.addEventListener('click', (event) => { if (event.target === box) close(); });

    document.addEventListener('keydown', (event) => {
      if (!box.classList.contains('is-open')) return;
      if (event.key === 'Escape') close();
      if (event.key === 'ArrowLeft') show(at - 1);
      if (event.key === 'ArrowRight') show(at + 1);
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

  /* ------------------------------------------------------------- page motion */
  function behaviours() {
    /* Mobile menu */
    const toggle = $('.nav-toggle');
    const nav = $('#primary-nav');
    if (toggle && nav) {
      toggle.addEventListener('click', () => {
        const open = nav.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', String(open));
      });
      nav.addEventListener('click', (event) => {
        if (event.target.tagName === 'A') {
          nav.classList.remove('is-open');
          toggle.setAttribute('aria-expanded', 'false');
        }
      });
    }

    /* The header grows a hairline rule once the page has scrolled. */
    const header = $('.site-header');
    if (header) {
      const onScroll = () => header.classList.toggle('is-stuck', window.scrollY > 8);
      addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }
  }

  /* Reveal on scroll, with everything shown at once if the browser cannot
     observe intersections. */
  const revealAll = () => $$('[data-reveal]').forEach((el) => el.classList.add('is-in'));

  function reveal() {
    if (!('IntersectionObserver' in window)) return revealAll();
    const seen = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        seen.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    $$('[data-reveal]:not(.is-in)').forEach((el) => seen.observe(el));
  }

  /* -------------------------------------------------------------------- boot */
  const whichPage = () => {
    if (document.body.dataset.page) return document.body.dataset.page;
    if ($('#masonry')) return 'photos';
    if ($('#video-grid')) return 'videos';
    return 'home';
  };

  async function boot() {
    behaviours();
    reveal();

    const page = whichPage();

    if (page === 'home') {
      const c = await loadAll(['site', 'about', 'profile', 'stories', 'photos',
                               'videos', 'experience', 'skills', 'credentials']);
      renderSEO(c.site);
      renderChrome(c.site);
      renderHero(c.site, c.about, c.profile);
      renderBeats(c.about);
      renderStories(c.site, c.stories);
      renderPhotos(c.site, c.photos);
      renderVideos(c.site, c.videos);
      renderAbout(c.about);
      renderExperience(c.site, c.experience);
      renderSkills(c.site, c.skills);
      renderCredentials(c.site, c.credentials);
      renderContact(c.site, c.profile);
    } else if (page === 'photos') {
      const c = await loadAll(['site', 'photos']);
      renderChrome(c.site);
      renderGalleryPage(c.photos);
    } else if (page === 'videos') {
      const c = await loadAll(['site', 'videos']);
      renderChrome(c.site);
      renderVideoPage(c.videos);
    }

    reveal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
