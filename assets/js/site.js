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

  // 2. Scroll Animation (Intersection Observer)
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('[data-reveal]').forEach(el => {
    observer.observe(el);
  });

  // 3. Load Selected Works (Stories)
  const storyIndex = document.getElementById('story-index');
  if (storyIndex) {
    fetch('./content/stories.json')
      .then(response => response.json())
      .then(data => {
        storyIndex.innerHTML = data.items.map(story => `
          <a class="index-row ${!story.url ? 'index-row--nolink' : ''}" href="${story.url || '#'}" ${story.url ? 'target="_blank" rel="noopener"' : ''}>
            <div class="index-slug">
              <span class="slug-outlet">${story.outlet}</span>
              <span class="slug-format">${story.format}</span>
            </div>
            <div class="index-body">
              <h3>${story.title}</h3>
              <p>${story.standfirst}</p>
            </div>
            ${story.url ? '<div class="index-go" aria-hidden="true">→</div>' : '<div class="index-pending">Pending</div>'}
          </a>
        `).join('');
      })
      .catch(error => console.error('Error loading stories:', error));
  }

  // 4. Load Photography Teaser (Shows first 4 images)
  const photoStrip = document.getElementById('photo-strip');
  if (photoStrip) {
    fetch('./content/photos.json')
      .then(response => response.json())
      .then(data => {
        const photos = data.items.slice(0, 4); 
        photoStrip.innerHTML = photos.map(photo => `
          <a href="photos.html">
            <img src="${photo.image}" alt="${photo.title}" loading="lazy">
          </a>
        `).join('');
      })
      .catch(error => console.error('Error loading photos:', error));
  }
});