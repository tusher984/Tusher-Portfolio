/* ==========================================================================
   Md. Al Amin Tusher — site behaviour
   All page content is read from /content/*.json so the dashboard can edit it
   without anyone touching HTML.
   ========================================================================== */

(function () {
  "use strict";

  /* ---------- helpers ---------- */

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /** Escape anything coming from JSON before it goes near innerHTML. */
  function esc(value) {
    return String(value == null ? "" : value).replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
    );
  }

  /**
   * Media paths must stay relative so the site works both at
   * username.github.io (root) and username.github.io/repo (subfolder).
   * The CMS may save a leading slash, so strip it.
   */
  function media(path) {
    if (!path) return "";
    if (/^(https?:)?\/\//i.test(path) || path.startsWith("data:")) return path;
    return path.replace(/^\/+/, "");
  }

  /**
   * A deliberately tiny formatting subset for text typed into the dashboard:
   *   [words](https://example.com)  → a link
   *   **words**                     → bold
   * Everything is escaped FIRST, so no HTML typed into the dashboard can ever
   * reach the page. Only these two patterns are then re-introduced, and links
   * are restricted to http, https and mailto.
   */
  function rich(value) {
    return esc(value)
      .replace(
        /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener">$1</a>'
      )
      .replace(/\[([^\]\n]+)\]\((mailto:[^\s)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  }

  /** Read a dotted path like "hero.lead" out of a plain object. */
  function dig(obj, path) {
    return path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
  }

  /**
   * Bind elements to values in a loaded JSON object. Each content file gets its
   * own attribute so two files can never fight over the same element:
   *   data-t  → content/site.json      e.g. data-t="hero.lead"
   *   data-a  → content/about.json     e.g. data-a="heading"
   * Add data-rich to allow the link/bold syntax above.
   * Anything missing from the JSON is left exactly as the HTML has it, so a
   * half-filled file can never blank out the page.
   */
  function bindText(attr, obj, scope) {
    $$("[" + attr + "]", scope || document).forEach((el) => {
      const key = el.getAttribute(attr);
      const value = dig(obj, key);
      if (value == null || value === "") return;
      if (el.hasAttribute("data-rich")) el.innerHTML = rich(value);
      else el.textContent = value;
    });
  }

  function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d)) return String(iso);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  }

  async function loadJSON(name) {
    const res = await fetch("content/" + name + ".json", { cache: "no-cache" });
    if (!res.ok) throw new Error(name + ".json returned " + res.status);
    return res.json();
  }

  /** Shown when fetch() is blocked, which happens on file:// double-click. */
  function showLoadError(container) {
    if (!container) return;
    container.innerHTML =
      '<div class="notice"><strong>Content could not load.</strong> ' +
      "If you opened this file directly from your computer, browsers block " +
      "local file reads for security. Run <code>python3 -m http.server</code> " +
      "in this folder and open <code>localhost:8000</code>, or view the published site.</div>";
  }

  /* ---------- header: shadow on scroll + mobile nav ---------- */

  const header = $(".site-header");
  if (header) {
    const onScroll = () => header.classList.toggle("is-stuck", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  const toggle = $(".nav-toggle");
  const nav = $("#primary-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    nav.addEventListener("click", (e) => {
      if (e.target.tagName === "A") {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------- reveal on scroll ---------- */

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function observeReveals(scope) {
    const targets = $$("[data-reveal]", scope || document).filter((el) => !el.dataset.revealBound);
    if (!targets.length) return;
    if (reduced || !("IntersectionObserver" in window)) {
      targets.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          setTimeout(() => el.classList.add("is-in"), Math.min(i * 70, 280));
          io.unobserve(el);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.06 }
    );
    targets.forEach((el) => {
      el.dataset.revealBound = "1";
      io.observe(el);
    });
  }
  observeReveals();

  /* Failsafe: nothing that carries content should be able to stay invisible.
     If a reveal hasn't fired within 4s, show it regardless. */
  setTimeout(function () {
    $$("[data-reveal]").forEach((el) => el.classList.add("is-in"));
  }, 4000);

  /* ---------- hero load sequence ---------- */

  if (!reduced) {
    $$(".hero [data-seq]").forEach((el, i) => {
      el.style.animationDelay = 90 * i + 60 + "ms";
    });
  }

  /* ======================================================================
     Selected work — the story index
     ====================================================================== */

  async function renderStories() {
    const list = $("#story-index");
    if (!list) return;
    try {
      const data = await loadJSON("stories");
      // Order is whatever you set in the dashboard (drag to reorder), not an
      // automatic date sort — so a story with no date yet stays where you put it.
      const items = data.items || [];
      if (!items.length) {
        list.innerHTML = '<div class="notice">No stories added yet.</div>';
        return;
      }

      list.innerHTML = items
        .map((s) => {
          const hasLink = !!(s.url && s.url.trim());
          const tag = hasLink ? "a" : "div";
          const attrs = hasLink
            ? ' href="' + esc(s.url) + '" target="_blank" rel="noopener"'
            : "";
          const tail = hasLink
            ? '<span class="index-go" aria-hidden="true">' + arrowSVG(20) + "</span>"
            : '<span class="index-pending">Link coming</span>';

          return (
            "<" + tag + ' class="index-row' + (hasLink ? "" : " index-row--nolink") + '"' + attrs + " data-reveal>" +
              '<div class="index-slug">' +
                '<span class="slug-outlet">' + esc(s.outlet || "") + "</span>" +
                "<span>" + esc(formatDate(s.date)) + "</span>" +
                (s.format ? '<span class="slug-format">' + esc(s.format) + "</span>" : "") +
              "</div>" +
              '<div class="index-body">' +
                "<h3>" + esc(s.title) + "</h3>" +
                (s.standfirst ? "<p>" + esc(s.standfirst) + "</p>" : "") +
              "</div>" +
              tail +
            "</" + tag + ">"
          );
        })
        .join("");
      observeReveals(list);
    } catch (err) {
      showLoadError(list);
    }
  }

  function arrowSVG(size) {
    return (
      '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
      '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/></svg>'
    );
  }

  /* ======================================================================
     Photo strip on the home page
     ====================================================================== */

  async function renderPhotoStrip() {
    const strip = $("#photo-strip");
    if (!strip) return;
    try {
      const data = await loadJSON("photos");
      const items = (data.items || []).slice(0, 4);
      strip.innerHTML = items
        .map(
          (p) =>
            '<a href="photos.html" aria-label="' + esc(p.title || "Photograph") + '">' +
            '<img src="' + esc(media(p.image)) + '" alt="' + esc(p.caption || p.title || "") + '" loading="lazy" decoding="async">' +
            "</a>"
        )
        .join("");
    } catch (err) {
      strip.remove();
    }
  }

  /* ======================================================================
     Photo gallery page — filters + lightbox
     ====================================================================== */

  async function renderGallery() {
    const grid = $("#masonry");
    if (!grid) return;

    let items = [];
    try {
      const data = await loadJSON("photos");
      items = data.items || [];
      const intro = $("#gallery-intro");
      if (intro && data.intro) intro.textContent = data.intro;
      buildFilters(data.categories || [], items);
    } catch (err) {
      showLoadError(grid);
      return;
    }

    let visible = items;

    function paint(list) {
      visible = list;
      if (!list.length) {
        grid.innerHTML = '<div class="notice">No photographs in this category yet.</div>';
        return;
      }
      grid.innerHTML = list
        .map(
          (p, i) =>
            '<figure class="shot" role="button" tabindex="0" data-i="' + i + '" data-reveal>' +
            '<img src="' + esc(media(p.image)) + '" alt="' + esc(p.caption || p.title || "") + '" loading="lazy" decoding="async">' +
            "<figcaption>" +
            '<span class="shot-title">' + esc(p.title || "") + "</span>" +
            '<span class="shot-meta">' + esc([p.location, p.year].filter(Boolean).join(" · ")) + "</span>" +
            "</figcaption></figure>"
        )
        .join("");
      observeReveals(grid);
    }

    function buildFilters(cats, all) {
      const bar = $("#filters");
      if (!bar || !cats.length) return;
      const btns = ["All"].concat(cats);
      bar.innerHTML = btns
        .map(
          (c, i) =>
            '<button class="filter" type="button" aria-pressed="' + (i === 0) + '" data-cat="' + esc(c) + '">' +
            esc(c) + "</button>"
        )
        .join("");
      bar.addEventListener("click", (e) => {
        const btn = e.target.closest(".filter");
        if (!btn) return;
        $$(".filter", bar).forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
        const cat = btn.dataset.cat;
        paint(cat === "All" ? all : all.filter((p) => p.category === cat));
      });
    }

    paint(items);

    /* ---- lightbox ---- */

    const lb = $("#lightbox");
    if (!lb) return;
    const lbImg = $(".lb-img", lb);
    const lbTitle = $(".lb-title", lb);
    const lbMeta = $(".lb-meta", lb);
    const lbCount = $(".lb-count", lb);
    let cur = 0;
    let lastFocus = null;

    function open(i) {
      cur = (i + visible.length) % visible.length;
      const p = visible[cur];
      if (!p) return;
      lbImg.src = media(p.image);
      lbImg.alt = p.caption || p.title || "";
      lbTitle.textContent = p.title || "";
      lbMeta.textContent = [p.location, p.year, p.category].filter(Boolean).join(" · ");
      lbCount.textContent = cur + 1 + " / " + visible.length;
      lb.classList.add("is-open");
      lb.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      $(".lb-close", lb).focus();
    }
    function close() {
      lb.classList.remove("is-open");
      lb.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      if (lastFocus) lastFocus.focus();
    }

    grid.addEventListener("click", (e) => {
      const fig = e.target.closest(".shot");
      if (!fig) return;
      lastFocus = fig;
      open(Number(fig.dataset.i));
    });
    grid.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const fig = e.target.closest(".shot");
      if (!fig) return;
      e.preventDefault();
      lastFocus = fig;
      open(Number(fig.dataset.i));
    });

    $(".lb-close", lb).addEventListener("click", close);
    $(".lb-prev", lb).addEventListener("click", () => open(cur - 1));
    $(".lb-next", lb).addEventListener("click", () => open(cur + 1));
    lb.addEventListener("click", (e) => { if (e.target === lb) close(); });
    document.addEventListener("keydown", (e) => {
      if (!lb.classList.contains("is-open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") open(cur - 1);
      if (e.key === "ArrowRight") open(cur + 1);
    });
  }

  /* ======================================================================
     Video page — thumbnails, click to load the embed
     ====================================================================== */

  async function renderVideos() {
    const grid = $("#video-grid");
    if (!grid) return;
    try {
      const data = await loadJSON("videos");
      const items = data.items || [];
      const intro = $("#video-intro");
      if (intro && data.intro) intro.textContent = data.intro;

      if (!items.length) {
        grid.innerHTML = '<div class="notice">No videos added yet.</div>';
        return;
      }

      grid.innerHTML = items
        .map((v, i) => {
          const yt = (v.youtube_id || "").trim();
          const vim = (v.vimeo_id || "").trim();
          const file = media((v.video_file || "").trim());
          const poster = yt
            ? "https://img.youtube.com/vi/" + encodeURIComponent(yt) + "/maxresdefault.jpg"
            : media(v.thumbnail);
          const metaBits =
            '<span class="v-outlet">' + esc(v.outlet || "") + "</span>" +
            (v.year ? " · " + esc(v.year) : "") +
            (v.role ? " · " + esc(v.role) : "");

          // Whichever source is filled in first wins: YouTube, then Vimeo, then
          // an uploaded file. Nothing filled in leaves a plain still image.
          let head;
          if (yt || vim) {
            head =
              '<button class="video-thumb" type="button" data-i="' + i + '"' +
              (yt ? ' data-yt="' + esc(yt) + '"' : ' data-vimeo="' + esc(vim) + '"') +
              ' aria-label="Play ' + esc(v.title || "video") + '">' +
              '<img src="' + esc(poster) + '" alt="" loading="lazy" decoding="async">' +
              '<span class="play"><span>' + playSVG() + "</span></span></button>";
          } else if (file) {
            head =
              '<video class="video-file" controls preload="metadata" playsinline' +
              (poster ? ' poster="' + esc(poster) + '"' : "") +
              '><source src="' + esc(file) + '">' +
              "Your browser cannot play this file." +
              "</video>";
          } else {
            head =
              '<div class="video-thumb" aria-hidden="true">' +
              '<img src="' + esc(poster) + '" alt="" loading="lazy" decoding="async"></div>';
          }

          const title = v.url
            ? '<h3><a href="' + esc(v.url) + '" target="_blank" rel="noopener">' + esc(v.title) + "</a></h3>"
            : "<h3>" + esc(v.title) + "</h3>";

          return (
            '<article class="video-card" data-reveal>' + head + title +
            '<p class="v-meta">' + metaBits + "</p>" +
            (v.description ? "<p>" + rich(v.description) + "</p>" : "") +
            "</article>"
          );
        })
        .join("");

      grid.addEventListener("click", (e) => {
        const btn = e.target.closest(".video-thumb[data-yt], .video-thumb[data-vimeo]");
        if (!btn) return;
        const yt = btn.dataset.yt;
        const vim = btn.dataset.vimeo;
        const frame = document.createElement("iframe");
        frame.src = yt
          ? "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(yt) +
            "?autoplay=1&rel=0&modestbranding=1"
          : "https://player.vimeo.com/video/" + encodeURIComponent(vim) + "?autoplay=1";
        frame.title = esc(btn.getAttribute("aria-label") || "Video player");
        frame.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture";
        frame.allowFullscreen = true;
        btn.replaceWith(frame);
      });

      observeReveals(grid);
    } catch (err) {
      showLoadError(grid);
    }
  }

  function playSVG() {
    return (
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
      '<path d="M8 5.5v13l11-6.5z"/></svg>'
    );
  }

  /* ======================================================================
     Profile details — progressive enhancement.
     The HTML already contains working values, so if this file fails to load
     nothing disappears. It only overwrites what it successfully reads.
     ====================================================================== */

  async function renderProfile() {
    let p;
    try {
      p = await loadJSON("profile");
    } catch (err) {
      return; // keep whatever is already in the HTML
    }

    const setText = (key, value) => {
      if (value == null || value === "") return;
      $$('[data-profile="' + key + '"]').forEach((el) => { el.textContent = value; });
    };

    setText("email", p.email);
    setText("phone", p.phone_display || p.phone);
    setText("location_line_1", p.location_line_1);
    setText("location_line_2", p.location_line_2);
    setText("references", p.references);

    if (p.email) {
      $$('[data-profile-href="email"]').forEach((el) => { el.href = "mailto:" + p.email; });
    }
    if (p.phone) {
      const tel = String(p.phone).replace(/[^\d+]/g, "");
      $$('[data-profile-href="phone"]').forEach((el) => { el.href = "tel:" + tel; });
    }

    const facts = $("#facts");
    if (facts && Array.isArray(p.facts) && p.facts.length) {
      facts.innerHTML = p.facts.map((f) => "<li>" + esc(f) + "</li>").join("");
    }
  }

  /* ======================================================================
     Headings, wording and social links — content/site.json
     ====================================================================== */

  async function renderSite() {
    let s;
    try {
      s = await loadJSON("site");
    } catch (err) {
      return; // HTML already holds the real wording
    }

    bindText("data-t", s);

    const socials = $("#socials");
    if (socials && Array.isArray(s.socials) && s.socials.length) {
      socials.innerHTML = s.socials
        .filter((l) => l && l.label && l.url)
        .map(
          (l) =>
            "<li><a href=\"" + esc(l.url) + '" target="_blank" rel="noopener">' +
            esc(l.label) + "</a></li>"
        )
        .join("");
    }
  }

  /* ======================================================================
     Beats + About — content/about.json
     ====================================================================== */

  async function renderAbout() {
    let a;
    try {
      a = await loadJSON("about");
    } catch (err) {
      return;
    }

    bindText("data-a", a);

    const beats = $("#beats");
    if (beats && Array.isArray(a.beats) && a.beats.length) {
      beats.innerHTML = a.beats
        .map(
          (b) =>
            '<div class="beat" data-reveal><h3>' + esc(b.title || "") + "</h3>" +
            "<p>" + rich(b.text || "") + "</p></div>"
        )
        .join("");
      observeReveals(beats);
    }

    const prose = $("#about-prose");
    if (prose && Array.isArray(a.paragraphs) && a.paragraphs.length) {
      prose.innerHTML = a.paragraphs
        .filter(Boolean)
        .map((p) => "<p>" + rich(p) + "</p>")
        .join("");
    }

    const portrait = $("#portrait-img");
    if (portrait && a.portrait) {
      portrait.src = media(a.portrait);
      if (a.portrait_alt) portrait.alt = a.portrait_alt;
    }
  }

  /* ======================================================================
     Experience timeline — content/experience.json
     ====================================================================== */

  async function renderExperience() {
    const wrap = $("#timeline");
    if (!wrap) return;
    let items;
    try {
      items = (await loadJSON("experience")).items || [];
    } catch (err) {
      return; // keep the hardcoded timeline
    }
    if (!items.length) return;

    wrap.innerHTML = items
      .map((j) => {
        const note = j.note
          ? ' <span style="color:var(--muted);font-weight:400">(' + esc(j.note) + ")</span>"
          : "";
        const bullets = (j.bullets || []).filter(Boolean);
        return (
          '<article class="job' + (j.current ? " job--current" : "") + '" data-reveal>' +
          '<span class="job-date">' + esc(j.period || "") + "</span>" +
          "<h3>" + esc(j.role || "") + note + "</h3>" +
          '<span class="org">' + esc(j.org || "") + "</span>" +
          (bullets.length
            ? "<ul>" + bullets.map((b) => "<li>" + rich(b) + "</li>").join("") + "</ul>"
            : "") +
          "</article>"
        );
      })
      .join("");
    observeReveals(wrap);
  }

  /* ======================================================================
     Skills — content/skills.json
     ====================================================================== */

  async function renderSkills() {
    const wrap = $("#skills");
    if (!wrap) return;
    let groups;
    try {
      groups = (await loadJSON("skills")).groups || [];
    } catch (err) {
      return;
    }
    if (!groups.length) return;

    wrap.innerHTML = groups
      .map(
        (g) =>
          '<div class="skill-group" data-reveal><h3>' + esc(g.title || "") + "</h3>" +
          '<ul class="tags">' +
          (g.items || []).filter(Boolean).map((t) => "<li>" + esc(t) + "</li>").join("") +
          "</ul></div>"
      )
      .join("");
    observeReveals(wrap);
  }

  /* ======================================================================
     Education, fellowships and training — content/credentials.json
     ====================================================================== */

  async function renderCredentials() {
    const eduList = $("#education-list");
    const trainList = $("#training-list");
    if (!eduList && !trainList) return;
    let c;
    try {
      c = await loadJSON("credentials");
    } catch (err) {
      return;
    }

    const rows = (list) =>
      (list || [])
        .filter((r) => r && r.title)
        .map(
          (r) =>
            "<li><strong>" + esc(r.title) + "</strong>" +
            (r.meta ? '<span class="meta">' + esc(r.meta) + "</span>" : "") +
            (r.result ? '<span class="result">' + esc(r.result) + "</span>" : "") +
            "</li>"
        )
        .join("");

    if (eduList && (c.education || []).length) eduList.innerHTML = rows(c.education);
    if (trainList && (c.training || []).length) trainList.innerHTML = rows(c.training);
    bindText("data-c", c);
  }

  /* ======================================================================
     Footer year + boot
     ====================================================================== */

  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  renderProfile();
  renderSite();
  renderAbout();
  renderExperience();
  renderSkills();
  renderCredentials();
  renderStories();
  renderPhotoStrip();
  renderGallery();
  renderVideos();
})();
