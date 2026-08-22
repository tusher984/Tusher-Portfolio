document.addEventListener('DOMContentLoaded', () => {
  // 1. Mobile Menu Toggle
  const navToggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('primary-nav');
  if (navToggle && nav) {
    navToggle.addEventListener('click', () => {
      const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', !isExpanded);
      nav.classList.toggle('is-open');
    });
  }

  // Animation Revealer Function
  const revealElements = () => {
    document.querySelectorAll('[data-reveal]:not(.is-in)').forEach(el => {
      el.classList.add('is-in');
    });
  };

  const cacheBuster = '?v=' + new Date().getTime();

  const loadJSON = async (url) => {
    try {
      const res = await fetch(url + cacheBuster);
      if (!res.ok) throw new Error('Not found');
      return await res.json();
    } catch (err) {
      return null;
    }
  };

  // 2. Load STORIES
  loadJSON('./content/stories.json').then(data => {
    if (!data) return;
    const storyIndex = document.getElementById('story-index');
    if (storyIndex && data.items) {
      storyIndex.innerHTML = data.items.map(story => `
        <a class="index-row ${!story.url ? 'index-row--nolink' : ''}" href="${story.url || '#'}" ${story.url ? 'target="_blank" rel="noopener"' : ''}>
          <div class="index-slug">
            <span class="slug-outlet">${story.outlet || ''}</span>
            <span class="slug-format">${story.format || ''}</span>
          </div>
          <div class="index-body">
            <h3>${story.title || ''}</h3>
            <p>${story.standfirst || ''}</p>
          </div>
          ${story.url ? '<div class="index-go" aria-hidden="true">→</div>' : '<div class="index-pending">Pending</div>'}
        </a>
      `).join('');
      setTimeout(revealElements, 100);
    }
  });

  // 3. Load PHOTOS (With broken image path fix)
  loadJSON('./content/photos.json').then(data => {
    if (!data) return;
    const photoStrip = document.getElementById('photo-strip');
    if (photoStrip && data.items) {
      photoStrip.innerHTML = data.items.map(photo => {
        let imgUrl = photo.image || photo.src || photo.url || '';
        
        // FIX: If path starts with /, prepend a dot to make it relative
        if (imgUrl.startsWith('/')) imgUrl = '.' + imgUrl; 

        let fullUrl = photo.url || imgUrl;
        if (fullUrl.startsWith('/')) fullUrl = '.' + fullUrl;

        const title = photo.title || photo.caption || 'Photography';
        return `
          <a href="${fullUrl}" target="_blank" rel="noopener" title="${title}" data-reveal>
            <img src="${imgUrl}" alt="${title}" loading="lazy">
          </a>
        `;
      }).join('');
      setTimeout(revealElements, 100);
    }
  });

  // 4. Load VIDEOS (With broken image/video path fix)
  loadJSON('./content/videos.json').then(data => {
    if (!data) return;
    const videoStrip = document.getElementById('video-strip');
    if (videoStrip && data.items) {
      videoStrip.innerHTML = data.items.map(video => {
        const ytMatch = (video.youtube_id || video.url || '').match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
        const ytId = ytMatch ? ytMatch[1] : (video.youtube_id && video.youtube_id.length === 11 ? video.youtube_id : '');
        
        let thumbUrl = (video.thumbnail && video.thumbnail.trim() !== '') ? video.thumbnail : (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : '');
        
        // FIX: If thumbnail path starts with /, prepend a dot
        if (thumbUrl.startsWith('/')) thumbUrl = '.' + thumbUrl;

        let videoUrl = video.url || (ytId ? `https://www.youtube.com/watch?v=${ytId}` : '#');
        
        // FIX: If video file path starts with /, prepend a dot
        if (videoUrl.startsWith('/')) videoUrl = '.' + videoUrl;

        return `
          <div class="video-card" data-reveal>
            <a class="video-thumb" href="${videoUrl}" target="_blank" rel="noopener">
              <img src="${thumbUrl}" alt="${video.title || 'Video'}" loading="lazy">
              <div class="play"><span>▶</span></div>
            </a>
            <h3>${video.title || ''}</h3>
            <p class="v-meta">${video.year || ''} ${video.outlet ? '· <span class="v-outlet">' + video.outlet + '</span>' : ''}</p>
          </div>
        `;
      }).join('');
      setTimeout(revealElements, 100);
    }
  });

  // Reveal initial elements
  setTimeout(revealElements, 150);
});