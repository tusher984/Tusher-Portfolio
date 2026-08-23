/* ==========================================================================
   Dashboard live previews
   --------------------------------------------------------------------------
   Every section in the dashboard shows the real thing on the right, drawn
   with the site's own stylesheet. The markup here mirrors the renderers in
   assets/js/site.js — if you change one, change the other.
   ========================================================================== */
(function () {
  'use strict';

  var CMS = window.CMS;
  var h = window.h || (window.React && window.React.createElement);
  if (!CMS || !h) return;

  /* ---------------------------------------------------------------- helpers */
  function clean(v) {
    if (typeof v === 'string') return v.replace(/\s+/g, ' ').trim();
    if (typeof v === 'number') return String(v);
    return '';
  }
  function has(v) { return clean(v) !== ''; }

  function esc(v) {
    return clean(v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* [words](https://example.com) becomes a link, exactly as on the site. */
  function rich(v) {
    return esc(v).replace(/\[([^\]]+)\]\(([^\s)]+)\)/g, function (_, text, url) {
      return '<a href="' + url + '">' + text + '</a>';
    });
  }

  /* The preview lives in a frame based at /admin/, so a picture saved as
     "assets/img/x.jpg" has to climb one level to be found. */
  function media(v) {
    var url = clean(v);
    if (!url) return '';
    if (/^(https?:|data:)/i.test(url)) return url;
    return '../' + url.replace(/^\/+/, '');
  }

  function list(v) { return Array.isArray(v) ? v : []; }
  function texts(v) { return list(v).map(clean).filter(Boolean); }
  function rows(v, keys) {
    return list(v).filter(function (item) {
      return item && keys.some(function (k) { return has(item[k]); });
    });
  }

  /* A grey line of guidance, for when a field is empty or contradicts itself. */
  function note(text) {
    return '<p class="cms-note">' + esc(text) + '</p>';
  }

  function sectionHead(eyebrow, heading, lead) {
    if (!has(eyebrow) && !has(heading) && !has(lead)) return '';
    return '<div class="section-head">' +
      (has(eyebrow) ? '<p class="eyebrow">' + esc(eyebrow) + '</p>' : '') +
      (has(heading) ? '<h2>' + esc(heading) + '</h2>' : '') +
      (has(lead) ? '<p class="lead">' + rich(lead) + '</p>' : '') +
      '</div>';
  }

  var RULE = '<hr class="cms-rule">';

  /* Decap hands the entry over as an Immutable map; plain data is easier. */
  function toJS(entry) {
    var data = entry && entry.get ? entry.get('data') : null;
    return (data && data.toJS) ? data.toJS() : (data || {});
  }

  function register(name, build) {
    CMS.registerPreviewTemplate(name, function (props) {
      var html;
      try {
        html = build(toJS(props.entry)) || note('Nothing to show yet.');
      } catch (err) {
        html = note('This preview could not be drawn: ' + err.message);
      }
      return h('div', {
        className: 'cms-preview',
        dangerouslySetInnerHTML: { __html: html }
      });
    });
  }

  /* ---------------------------------------- 1 · header, hero & section titles */
  var NAV = ['nav_work', 'nav_photography', 'nav_video', 'nav_skills', 'nav_about', 'nav_contact'];
  var HEADS = ['work', 'photography', 'video', 'experience', 'skills', 'credentials', 'contact'];

  register('site', function (d) {
    var brand = d.brand || {}, hero = d.hero || {}, seo = d.seo || {}, footer = d.footer || {};

    var menu = NAV.map(function (key) { return esc(brand[key]); }).filter(Boolean).join('<span>·</span>');

    var buttons = '';
    if (has(hero.cta_primary)) buttons += '<span class="btn btn--solid">' + esc(hero.cta_primary) + ' &rarr;</span>';
    if (has(hero.cta_secondary)) buttons += '<span class="btn btn--outline">' + esc(hero.cta_secondary) + '</span>';

    var sections = HEADS.map(function (key) {
      var s = d[key] || {};
      var block = sectionHead(s.eyebrow, s.heading, s.lead);
      if (has(s.link_label)) block += '<p><span class="textlink">' + esc(s.link_label) + ' &rarr;</span></p>';
      return block;
    }).filter(Boolean).join(RULE);

    return '' +
      '<div class="cms-bar"><strong>' + (esc(brand.name) || 'Your name') + '</strong>' +
        (menu ? '<nav>' + menu + '</nav>' : '') + '</div>' +

      '<div class="cms-hero">' +
        (has(hero.eyebrow) ? '<p class="eyebrow">' + esc(hero.eyebrow) + '</p>' : '') +
        '<h1>' + (esc(hero.name) || 'Your name') + '</h1>' +
        (has(hero.tagline) ? '<p class="h1-sub">' + esc(hero.tagline) + '</p>' : '') +
        (has(hero.lead) ? '<p class="lead">' + rich(hero.lead) + '</p>' : '') +
        (buttons ? '<div class="hero-actions">' + buttons + '</div>' : '') +
      '</div>' + RULE +

      (sections || note('The section titles are all empty.')) + RULE +

      '<div class="cms-bar cms-bar--foot">' +
        '<span>&copy; ' + new Date().getFullYear() + ' ' + esc(footer.left) + '</span>' +
        '<span>' + esc(footer.right) + '</span>' +
      '</div>' +

      '<p class="cms-label">How Google shows the page</p>' +
      '<div class="cms-serp">' +
        '<span class="serp-url">tusher984.github.io/Tusher-Portfolio</span>' +
        '<span class="serp-title">' + (esc(seo.title) || 'No title set') + '</span>' +
        '<span class="serp-desc">' + (esc(seo.description) || 'No description set') + '</span>' +
      '</div>' +
      (clean(seo.title).length > 65
        ? note('That title is ' + clean(seo.title).length + ' characters. Google usually cuts it off around 60.')
        : '');
  });

  /* ------------------------------------------------ 2 · about & what I cover */
  register('about', function (d) {
    var beats = rows(d.beats, ['title', 'text']);
    var paras = texts(d.paragraphs);

    return '' +
      (has(d.portrait)
        ? '<div class="cms-portrait"><img src="' + esc(media(d.portrait)) + '" alt="' + esc(d.portrait_alt) + '"></div>'
        : note('No portrait uploaded yet.')) +
      (has(d.portrait) && !has(d.portrait_alt)
        ? note('Add a portrait description so screen readers and Google can read the photo.')
        : '') +

      (has(d.beats_eyebrow) ? '<p class="eyebrow">' + esc(d.beats_eyebrow) + '</p>' : '') +
      (beats.length
        ? '<div class="beats">' + beats.map(function (b) {
            return '<div class="beat"><h3>' + esc(b.title) + '</h3><p>' + rich(b.text) + '</p></div>';
          }).join('') + '</div>'
        : note('No "what I cover" cards yet.')) + RULE +

      sectionHead(d.eyebrow, d.heading) +
      (paras.length
        ? '<div class="prose">' + paras.map(function (p) { return '<p>' + rich(p) + '</p>'; }).join('') + '</div>'
        : note('No About paragraphs yet.'));
  });

  /* -------------------------------------------------------- 3 · selected work */
  register('stories', function (d) {
    var items = rows(d.items, ['title', 'standfirst']);
    if (!items.length) return note('No stories yet.');

    return '<div class="index-list">' + items.map(function (s) {
      var linked = has(s.url);
      return '<div class="index-row' + (linked ? '' : ' index-row--nolink') + '">' +
        '<div class="index-slug">' +
          '<span class="slug-outlet">' + esc(s.outlet) + '</span>' +
          (has(s.format) ? '<span class="slug-format">' + esc(s.format) + '</span>' : '') +
        '</div>' +
        '<div class="index-body">' +
          '<h3>' + esc(s.title) + '</h3>' +
          '<p>' + esc(s.standfirst) + '</p>' +
        '</div>' +
        (linked ? '<div class="index-go">&rarr;</div>' : '<div class="index-pending">Pending</div>') +
      '</div>';
    }).join('') + '</div>';
  });

  /* --------------------------------------------------------- 4 · photography */
  register('photos', function (d) {
    var items = rows(d.items, ['image', 'title', 'caption']).map(function (p) {
      return {
        src: media(p.image),
        title: clean(p.title) || clean(p.caption) || 'Photograph',
        caption: clean(p.caption),
        meta: [clean(p.location), clean(p.year)].filter(Boolean).join(' · '),
        category: clean(p.category)
      };
    });

    var missing = items.filter(function (p) { return !p.src; }).length;
    items = items.filter(function (p) { return p.src; });

    var wanted = texts(d.categories);
    var live = wanted.filter(function (c) {
      return items.some(function (p) { return p.category === c; });
    });
    var idle = wanted.filter(function (c) { return live.indexOf(c) === -1; });

    var filters = live.length
      ? '<div class="filters"><button class="filter is-on" type="button">All</button>' +
        live.map(function (c) { return '<button class="filter" type="button">' + esc(c) + '</button>'; }).join('') +
        '</div>'
      : '';

    return '' +
      (has(d.intro) ? '<p class="lead">' + rich(d.intro) + '</p>' : '') +
      filters +
      (idle.length ? note('No photograph uses ' + idle.join(', ') + ' yet, so ' +
        (idle.length > 1 ? 'those buttons' : 'that button') + ' stays hidden.') : '') +
      (missing ? note(missing + ' entr' + (missing > 1 ? 'ies have' : 'y has') + ' no photograph uploaded, so ' +
        (missing > 1 ? 'they are' : 'it is') + ' skipped.') : '') +
      (items.length
        ? '<div class="masonry">' + items.map(function (p) {
            return '<div class="masonry-item">' +
              '<img src="' + esc(p.src) + '" alt="' + esc(p.title) + '">' +
              (p.caption || p.meta
                ? '<span class="masonry-cap">' +
                    (p.caption ? '<span class="cap-title">' + esc(p.caption) + '</span>' : '') +
                    (p.meta ? '<span class="cap-meta">' + esc(p.meta) + '</span>' : '') +
                  '</span>'
                : '') +
            '</div>';
          }).join('') + '</div>'
        : note('No photographs yet.'));
  });

  /* ---------------------------------------------------------------- 5 · video */
  var YT = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|shorts\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/;

  register('videos', function (d) {
    var items = rows(d.items, ['title', 'youtube_id']);
    if (!items.length && !has(d.intro)) return note('No films yet.');

    var unreadable = 0;

    var cards = items.map(function (v) {
      var raw = clean(v.youtube_id);
      var match = raw.match(YT);
      var id = match ? match[1] : (/^[\w-]{11}$/.test(raw) ? raw : '');
      if (!id) unreadable += 1;

      return '<div class="video-card">' +
        '<div class="video-thumb">' +
          (id ? '<img src="https://img.youtube.com/vi/' + esc(id) + '/hqdefault.jpg" alt="' + esc(v.title) + '">' : '') +
          '<div class="play"><span>&#9654;</span></div>' +
        '</div>' +
        '<h3>' + esc(v.title) + '</h3>' +
        (has(v.year) ? '<p class="v-meta">' + esc(v.year) + '</p>' : '') +
        (has(v.description) ? '<p class="v-desc">' + esc(v.description) + '</p>' : '') +
      '</div>';
    }).join('');

    return '' +
      (has(d.intro) ? '<p class="lead">' + rich(d.intro) + '</p>' : '') +
      (unreadable ? note(unreadable + ' YouTube link' + (unreadable > 1 ? 's could' : ' could') +
        ' not be read, so no still picture shows. Paste the whole address from the browser.') : '') +
      (cards ? '<div class="video-grid">' + cards + '</div>' : '');
  });

  /* ----------------------------------------------------------- 6 · experience */
  register('experience', function (d) {
    var jobs = rows(d.items, ['role', 'org', 'period']);
    if (!jobs.length) return note('No positions yet.');

    return '<div class="timeline">' + jobs.map(function (job) {
      var bullets = texts(job.bullets);
      return '<article class="job' + (job.current ? ' job--current' : '') + '">' +
        '<span class="job-date">' + esc(job.period) + '</span>' +
        '<h3>' + esc(job.role) +
          (has(job.note) ? ' <span class="job-note">(' + esc(job.note) + ')</span>' : '') + '</h3>' +
        (has(job.org) ? '<span class="org">' + esc(job.org) + '</span>' : '') +
        (bullets.length ? '<ul>' + bullets.map(function (b) { return '<li>' + rich(b) + '</li>'; }).join('') + '</ul>' : '') +
      '</article>';
    }).join('') + '</div>';
  });

  /* ------------------------------------------------------- 7 · skills & tools */
  register('skills', function (d) {
    var groups = rows(d.groups, ['title', 'items']);
    if (!groups.length) return note('No skill groups yet.');

    return '<div class="skills">' + groups.map(function (g) {
      var items = texts(g.items);
      return '<div class="skill-group">' +
        '<h3>' + esc(g.title) + '</h3>' +
        (items.length
          ? '<ul class="tags">' + items.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul>'
          : '') +
      '</div>';
    }).join('') + '</div>';
  });

  /* ---------------------------------------------------------- 8 · credentials */
  function credColumn(label, items) {
    var entries = rows(items, ['title', 'meta', 'result']);
    if (!entries.length) return '';
    return '<div>' +
      (has(label) ? '<h3>' + esc(label) + '</h3>' : '') +
      '<ul class="cred-list">' + entries.map(function (e) {
        return '<li>' +
          '<strong>' + esc(e.title) + '</strong>' +
          (has(e.meta) ? '<span class="meta">' + rich(e.meta) + '</span>' : '') +
          (has(e.result) ? '<span class="result">' + esc(e.result) + '</span>' : '') +
        '</li>';
      }).join('') + '</ul>' +
    '</div>';
  }

  register('credentials', function (d) {
    var columns =
      credColumn(d.education_label, d.education) +
      credColumn(d.training_label, d.training) +
      credColumn(d.extras_label, d.extras);
    if (!columns) return note('Nothing filled in yet.');
    return '<div class="cred-grid">' + columns + '</div>';
  });

  /* ------------------------------------------- 9 · contact details & socials */
  var SOCIALS = [
    ['linkedin', 'LinkedIn'], ['twitter', 'X'], ['instagram', 'Instagram'],
    ['facebook', 'Facebook'], ['youtube', 'YouTube'], ['website', 'Website']
  ];

  register('profile', function (d) {
    var facts = texts(d.facts);
    var lines = [clean(d.location_line_1), clean(d.location_line_2)].filter(Boolean);
    var links = SOCIALS.filter(function (pair) { return has(d[pair[0]]); });

    return '' +
      (facts.length
        ? '<p class="cms-label">Under the hero</p><ul class="facts">' +
          facts.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('') + '</ul>' + RULE
        : '') +

      '<div class="contact-actions">' +
        (has(d.email) ? '<span class="btn btn--solid">' + esc(d.email) + '</span>' : '') +
        (has(d.phone_display) ? '<span class="btn btn--outline">' + esc(d.phone_display) + '</span>' : '') +
      '</div>' +
      (!has(d.email) ? note('Without an email address the "Get in touch" button has nowhere to go.') : '') +
      (has(d.phone_display) && !has(d.phone)
        ? note('The number is shown but not clickable — fill in "Phone number — for the link" too.') : '') +

      '<div class="contact-meta">' +
        (lines.length ? '<div><h3>Based in</h3><p>' + lines.map(esc).join('<br>') + '</p></div>' : '') +
        (links.length
          ? '<div><h3>Social Media</h3><ul class="socials">' + links.map(function (pair) {
              return '<li><a href="' + esc(d[pair[0]]) + '">' + esc(pair[1]) + '</a></li>';
            }).join('') + '</ul></div>'
          : '') +
        (has(d.references) ? '<div><h3>References</h3><p>' + rich(d.references) + '</p></div>' : '') +
      '</div>' +
      (!links.length ? note('No social links filled in, so that whole column is hidden.') : '') +
      (!has(d.references) ? note('References is empty, so that column is hidden on the page.') : '');
  });

  /* ------------------------------------------------------------------ styling */
  /* The preview pane loads the site's real stylesheet, so what you see is
     what visitors get. The extra rules below only dress the pane itself. */
  var PANE = [
    '.cms-preview { padding: 1.75rem 1.5rem 4rem; max-width: 60rem; margin: 0 auto; }',
    '.cms-preview [data-reveal] { opacity: 1; transform: none; }',
    '.cms-preview img { border-radius: 2px; }',

    '.cms-rule { border: 0; border-top: 1px solid var(--rule); margin: 2.25rem 0; }',

    '.cms-label { font-family: var(--mono); font-size: 0.6875rem; letter-spacing: 0.12em;',
    '  text-transform: uppercase; color: var(--muted); margin: 0 0 0.75rem; }',

    '.cms-note { background: var(--wash); border-left: 2px solid var(--accent);',
    '  color: var(--ink-2); font-size: 0.875rem; line-height: 1.55;',
    '  padding: 0.6rem 0.85rem; margin: 1rem 0; border-radius: 0 2px 2px 0; }',

    '.cms-bar { display: flex; flex-wrap: wrap; gap: 0.75rem 1.25rem; align-items: baseline;',
    '  justify-content: space-between; border-bottom: 1px solid var(--rule);',
    '  padding-bottom: 0.85rem; margin-bottom: 2rem; }',
    '.cms-bar strong { font-family: var(--display); font-size: 1.0625rem; letter-spacing: -0.02em; }',
    '.cms-bar nav { display: flex; flex-wrap: wrap; gap: 0.6rem; color: var(--muted);',
    '  font-size: 0.875rem; }',
    '.cms-bar nav span { color: var(--rule); }',
    '.cms-bar--foot { border-bottom: 0; border-top: 1px solid var(--rule);',
    '  padding: 0.85rem 0 0; margin: 2rem 0 2.5rem; color: var(--muted); font-size: 0.875rem; }',

    '.cms-hero h1 { font-size: clamp(2rem, 5vw, 3.25rem); margin: 0.35rem 0 0.5rem; }',
    '.cms-hero .lead { max-width: 46ch; }',
    '.cms-hero .hero-actions { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 1.5rem; }',

    '.cms-portrait { max-width: 15rem; margin: 0 0 1.75rem; }',

    '.cms-serp { display: block; font-family: Arial, sans-serif; background: var(--paper);',
    '  border: 1px solid var(--rule); border-radius: 6px; padding: 1rem 1.15rem; }',
    '.cms-serp .serp-url { display: block; color: #202124; font-size: 0.8125rem; }',
    '.cms-serp .serp-title { display: block; color: #1a0dab; font-size: 1.25rem;',
    '  line-height: 1.3; margin: 0.15rem 0 0.25rem; }',
    '.cms-serp .serp-desc { display: block; color: #4d5156; font-size: 0.875rem; line-height: 1.58; }'
  ].join('\n');

  try {
    CMS.registerPreviewStyle('https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500&family=IBM+Plex+Mono:wght@400;500&display=swap');
    CMS.registerPreviewStyle('../assets/css/style.css');
    CMS.registerPreviewStyle(PANE, { raw: true });
  } catch (err) {
    console.warn('[admin] preview styles unavailable —', err.message);
  }

})();
