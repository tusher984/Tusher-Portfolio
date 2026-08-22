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
    document.querySelectorAll('[data-reveal]').forEach(el => {
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
      console.error('Error loading ' + url, err);
      return null;
    }
  };

  // 2. Load SITE DATA
  loadJSON('./content/site.json').then(data => {
    if (!data) return;
    document.querySelectorAll('[data-t]').forEach(el => {
      const path = el.getAttribute('data-t').split('.');
      let val = data;
      path.forEach(p => { if (val) val = val[p]; });
      if (val && typeof val === 'string' && val.trim() !== '') el.innerHTML = val;
    });
  });

  // 3. Load ABOUT & BEATS
  loadJSON('./content/about.json').then(data => {
    if (!data) return;
    document.querySelectorAll('[data-a]').forEach(el => {
      const key = el.getAttribute('data-a');
      if (data[key]) el.innerHTML = data[key];
    });
    
    const beatsCont = document.getElementById('beats');
    if (beatsCont && data.beats) {
      beatsCont.innerHTML = data.beats.map(beat => `
        <div class="beat" data-reveal>
          <h3>${beat.title}</h3>
          <p>${beat.text}</p>
        </div>
      `).join('');
    }

    const aboutProse = document.getElementById('about-prose');
    if (aboutProse && data.paragraphs) {
      aboutProse.innerHTML = data.paragraphs.map(p => 
        `<p>${p.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')}</p>`
      ).join('');
    }
    revealElements();
  });

  // 4. Load PROFILE (Contact, Socials, Phone, Email)
  loadJSON('./content/profile.json').then(data => {
    if (!data) return;
    document.querySelectorAll('[data-profile]').forEach(el => {
      let key = el.getAttribute('data-profile');
      if (key === 'phone' && data['phone_display']) el.textContent = data['phone_display'];
      else if (data[key] && data[key].trim() !== '') el.textContent = data[key];
    });
    
    document.querySelectorAll('[data-profile-href]').forEach(el => {
      const key = el.getAttribute('data-profile-href');
      if (data[key] && data[key].trim() !== '') {
        if (key === 'email') el.href = 'mailto:' + data[key];
        if (key === 'phone') el.href = 'tel:' + data[key].replace(/\s+/g, '');
      }
    });

    const factsCont = document.getElementById('facts');
    if (factsCont && data.facts) {
      factsCont.innerHTML = data.facts.map(f => `<li>${f}</li>`).join('');
    }

    const socialsCont = document.getElementById('socials');
    if (socialsCont) {
      let html = '';
      if (data.linkedin) html += `<li><a href="${data.linkedin}" target="_blank" rel="noopener">LinkedIn</a></li>`;
      if (data.twitter) html += `<li><a href="${data.twitter}" target="_blank" rel="noopener">X</a></li>`;
      if (data.instagram) html += `<li><a href="${data.instagram}" target="_blank" rel="noopener">Instagram</a></li>`;
      if (data.facebook) html += `<li><a href="${data.facebook}" target="_blank" rel="noopener">Facebook</a></li>`;
      if (html !== '') socialsCont.innerHTML = html;
    }
  });

  // 5. Load CREDENTIALS
  loadJSON('./content/credentials.json').then(data => {
    if (!data) return;
    document.querySelectorAll('[data-c]').forEach(el => {
      const key = el.getAttribute('data-c');
      if (data[key]) el.textContent = data[key];
    });
    
    const eduList = document.getElementById('education-list');
    if (eduList && data.education) {
      eduList.innerHTML = data.education.map(item => `
        <li>
          <strong>${item.title}</strong>
          ${item.meta ? `<span class="meta">${item.meta}</span>` : ''}
          ${item.result ? `<span class="result">${item.result}</span>` : ''}
        </li>
      `).join('');
    }
    
    const trainList = document.getElementById('training-list');
    if (trainList && data.training) {
      trainList.innerHTML = data.training.map(item => `
        <li>
          <strong>${item.title}</strong>
          ${item.meta ? `<span class="meta">${item.meta}</span>` : ''}
          ${item.result ? `<span class="result">${item.result}</span>` : ''}
        </li>
      `).join('');
    }
  });

  // 6. Load EXPERIENCE
  loadJSON('./content/experience.json').then(data => {
    if (!data) return;
    const timeline = document.getElementById('timeline');
    if (timeline && data.items) {
      timeline.innerHTML = data.items.map(job => `
        <article class="job ${job.current ? 'job--current' : ''}" data-reveal>
          <span class="job-date">${job.period}</span>
          <h3>${job.role} ${job.note ? `<span style="color:var(--muted);font-weight:400">(${job.note})</span>` : ''}</h3>
          <span class="org">${job.org}</span>
          ${job.bullets ? `<ul>${job.bullets.map(b => `<li>${b}</li>`).join('')}</ul>` : ''}
        </article>
      `).join('');
      revealElements();
    }
  });

  // 7. Load SKILLS
  loadJSON('./content/skills.json').then(data => {
    if (!data) return;
    const skills = document.querySelector('.skills'); // Changed from ID to class to match current HTML
    if (skills && data.groups) {
      skills.innerHTML = data.groups.map(grp => `
        <div class="skill-group" data-reveal>
          <h3>${grp.title}</h3>
          <ul class="tags">${grp.items.map(item => `<li>${item}</li>`).join('')}</ul>
        </div>
      `).join('');
      revealElements();
    }
  });

  // 8. Load STORIES
  loadJSON('./content/stories.json').then(data => {
    if (!data) return;
    const storyIndex = document.getElementById('story-index');
    if (storyIndex && data.items) {
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
      revealElements();
    }
  });

  // 9. Load PHOTOS (Shows ALL photos with original URL link)
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
          <a href="${fullUrl}" target="_blank" rel="noopener" title="${title}">
            <img src="${imgUrl}" alt="${title}" loading="lazy">
          </a>
        `;
      }).join('');
      revealElements();
    }
  });

  // 10. Load VIDEOS (Shows ALL videos with direct YouTube links)
  loadJSON('./content/videos.json').then(data => {
    if (!data) return;
    const videoStrip = document.getElementById('video-strip');
    if (videoStrip && data.items) {
      const videos = data.items;
      
      videoStrip.innerHTML = videos.map(video => {
        // Extract YouTube ID if full URL is given
        const ytMatch = (video.youtube_id || video.url || '').match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
        const ytId = ytMatch ? ytMatch[1] : (video.youtube_id && video.youtube_id.length === 11 ? video.youtube_id : '');
        
        // Auto-generate YouTube thumbnail if custom thumbnail is missing
        const thumbUrl = (video.thumbnail && video.thumbnail.trim() !== '') 
          ? video.thumbnail 
          : (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : '');

        const videoUrl = video.url || (ytId ? `https://www.youtube.com/watch?v=${ytId}` : '#');

        return `
          <div class="video-card">
            <a class="video-thumb" href="${videoUrl}" target="_blank" rel="noopener">
              <img src="${thumbUrl}" alt="${video.title || 'Video'}" loading="lazy">
              <div class="play"><span>▶</span></div>
            </a>
            <h3>${video.title || ''}</h3>
            <p class="v-meta">${video.year || ''} ${video.outlet ? '· <span class="v-outlet">' + video.outlet + '</span>' : ''}</p>
          </div>
        `;
      }).join('');
      revealElements();
    }
  });

  // Reveal initial elements
  setTimeout(revealElements, 150);
});