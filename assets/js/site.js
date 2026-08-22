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

  // 3. Load PHOTOS (Shows ALL photos with original URL link)
  loadJSON('./content/photos.json').then(data => {
    if (!data) return;
    const photoStrip = document.getElementById('photo-strip');
    if (photoStrip && data.items) {
      const photos = data.items; 
      photoStrip.innerHTML = photos.map(photo => {
        const imgUrl = photo.image || photo.src || photo.url;
        const fullUrl = photo.url || imgUrl;
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

  // 4. Load VIDEOS (Shows ALL videos with direct YouTube links)
  loadJSON('./content/videos.json').then(data => {
    if (!data) return;
    const videoStrip = document.getElementById('video-strip');
    if (videoStrip && data.items) {
      const videos = data.items;
      
      videoStrip.innerHTML = videos.map(video => {
        const ytMatch = (video.youtube_id || video.url || '').match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
        const ytId = ytMatch ? ytMatch[1] : (video.youtube_id && video.youtube_id.length === 11 ? video.youtube_id : '');
        const thumbUrl = (video.thumbnail && video.thumbnail.trim() !== '') ? video.thumbnail : (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : '');
        const videoUrl = video.url || (ytId ? `https://www.youtube.com/watch?v=${ytId}` : '#');

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