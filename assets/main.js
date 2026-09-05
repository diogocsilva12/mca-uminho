// ---------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------

function setActiveNav() {
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach((link) => {
    const href = link.getAttribute('href');
    if (href === path || (path === '' && href === 'index.html')) {
      link.setAttribute('aria-current', 'page');
    }
  });
}

function formatDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ---------------------------------------------------------------------
// Files page
// ---------------------------------------------------------------------

function renderFiles(year) {
  const root = document.getElementById('files-root');
  if (!root) return;
  root.innerHTML = '';

  const semesters = SITE_DATA.files.years[year] || [];

  if (semesters.length === 0 || semesters.every((s) => s.subjects.length === 0)) {
    root.innerHTML = `
      <div class="empty-state">
        <h3>No shared materials yet for this year</h3>
        <p>Nobody has added notes for this year yet — you could be the first. If you have slides, summaries or exercises worth passing on, open a pull request on the repository, or drop them to whoever maintains this page.</p>
      </div>`;
    return;
  }

  semesters.forEach((sem) => {
    const block = document.createElement('div');
    block.className = 'semester-block';

    const title = document.createElement('div');
    title.className = 'semester-title';
    title.textContent = sem.semester;
    block.appendChild(title);

    sem.subjects.forEach((subject, i) => {
      const subj = document.createElement('div');
      subj.className = 'subject';
      subj.dataset.open = i === 0 ? 'true' : 'false';

      const fileCount = subject.files.length;
      subj.innerHTML = `
        <button class="subject-toggle" aria-expanded="${i === 0}">
          <span class="subject-name">${subject.name}</span>
          <span class="subject-meta">
            <span>${fileCount} file${fileCount === 1 ? '' : 's'}</span>
            <span class="subject-chevron" aria-hidden="true"></span>
          </span>
        </button>
        <div class="subject-files">
          ${subject.files
            .map(
              (f) => `
            <a class="file-row" href="${f.url}" download>
              <span class="file-ext">${f.type}</span>
              <span class="file-name">${f.name}</span>
              <span class="file-size">${f.size}</span>
            </a>`
            )
            .join('')}
        </div>`;

      const toggle = subj.querySelector('.subject-toggle');
      toggle.addEventListener('click', () => {
        const open = subj.dataset.open === 'true';
        subj.dataset.open = String(!open);
        toggle.setAttribute('aria-expanded', String(!open));
      });

      block.appendChild(subj);
    });

    root.appendChild(block);
  });
}

function initYearSwitch() {
  const buttons = document.querySelectorAll('[data-year-switch] button');
  if (!buttons.length) return;

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      buttons.forEach((b) => b.setAttribute('aria-pressed', 'false'));
      btn.setAttribute('aria-pressed', 'true');
      renderFiles(Number(btn.dataset.year));
    });
  });

  const initial = document.querySelector('[data-year-switch] button[aria-pressed="true"]');
  renderFiles(initial ? Number(initial.dataset.year) : 1);
}

// ---------------------------------------------------------------------
// Calendar page
// ---------------------------------------------------------------------

function renderCalendarDates() {
  const root = document.getElementById('date-list-root');
  if (!root) return;

  const dates = SITE_DATA.calendar.dates.slice().sort((a, b) => (a.date < b.date ? -1 : 1));
  const today = new Date().toISOString().slice(0, 10);

  root.innerHTML = dates
    .map((d) => {
      const isPast = d.date < today;
      return `
      <div class="date-row" style="${isPast ? 'opacity:0.5' : ''}">
        <time datetime="${d.date}">${formatDate(d.date)}</time>
        <div>
          <div class="date-label">${d.label}</div>
          <span class="date-tag">${d.tag}</span>
        </div>
      </div>`;
    })
    .join('');
}

function renderCalendarEmbed() {
  const slot = document.getElementById('calendar-embed-slot');
  if (!slot) return;

  if (SITE_DATA.calendar.embedUrl) {
    slot.innerHTML = `<iframe src="${SITE_DATA.calendar.embedUrl}" loading="lazy" title="Master calendar"></iframe>`;
  } else {
    slot.innerHTML = `
      <div class="embed-placeholder">
        No calendar embed configured yet.<br>
        Add a public calendar URL to <code>embedUrl</code> in <code>assets/data/site-data.js</code>.
      </div>`;
  }
}

// ---------------------------------------------------------------------
// Schedule page
// ---------------------------------------------------------------------

function initScheduleLinks() {
  document.querySelectorAll('[data-schedule-url]').forEach((el) => {
    if (el.tagName === 'IFRAME') {
      el.src = SITE_DATA.schedule.toolUrl;
    } else {
      el.href = SITE_DATA.schedule.toolUrl;
    }
  });
  document.querySelectorAll('[data-schedule-url-label]').forEach((el) => {
    el.textContent = SITE_DATA.schedule.toolUrl;
  });
}

// ---------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  setActiveNav();
  initYearSwitch();
  renderCalendarDates();
  renderCalendarEmbed();
  initScheduleLinks();
});
