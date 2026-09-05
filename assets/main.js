// ---------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------

function setActiveNav() {
  const path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a").forEach((link) => {
    const href = link.getAttribute("href");
    if (href === path || (path === "" && href === "index.html")) {
      link.setAttribute("aria-current", "page");
    }
  });
}

function formatDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// ---------------------------------------------------------------------
// Files page
// ---------------------------------------------------------------------

let currentYear = 1;
let currentSearchQuery = "";

function renderFiles(year) {
  currentYear = year;
  const root = document.getElementById("files-root");
  if (!root) return;
  root.innerHTML = "";

  const semesters = SITE_DATA.files.years[year] || [];

  if (semesters.length === 0 || semesters.every((s) => s.subjects.length === 0)) {
    root.innerHTML = `
      <div class="empty-state">
        <h3>No study materials shared yet for this year</h3>
        <p>No materials have been submitted for this year yet. If you have lecture notes, problem sets, or lab guides to share with your peers, please open a Pull Request on the repository.</p>
      </div>`;
    updateSearchStatus(0, 0);
    return;
  }

  let totalVisibleFiles = 0;
  let totalVisibleSubjects = 0;
  const q = currentSearchQuery.trim().toLowerCase();

  semesters.forEach((sem) => {
    const block = document.createElement("div");
    block.className = "semester-block";

    const title = document.createElement("div");
    title.className = "semester-title";
    title.textContent = sem.semester;
    block.appendChild(title);

    let semesterHasVisibleSubjects = false;

    sem.subjects.forEach((subject, i) => {
      // Filter files if searching
      const matchingFiles = subject.files.filter((f) => {
        if (!q) return true;
        const inFileName = f.name.toLowerCase().includes(q);
        const inCat = (f.category || "").toLowerCase().includes(q);
        const inExt = f.type.toLowerCase().includes(q);
        const inSubjName = subject.name.toLowerCase().includes(q);
        const inSubjCode = (subject.code || "").toLowerCase().includes(q);
        return inFileName || inCat || inExt || inSubjName || inSubjCode;
      });

      if (q && matchingFiles.length === 0) {
        return;
      }

      semesterHasVisibleSubjects = true;
      totalVisibleSubjects++;
      totalVisibleFiles += matchingFiles.length;

      const subj = document.createElement("div");
      subj.className = "subject";
      const shouldOpen = q ? true : (i === 0);
      subj.dataset.open = shouldOpen ? "true" : "false";

      // Group files by category
      const categories = {};
      matchingFiles.forEach((f) => {
        const cat = f.category || "General";
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(f);
      });

      const catKeys = Object.keys(categories);
      let filesHtml = "";

      if (catKeys.length > 1) {
        catKeys.forEach((cat) => {
          filesHtml += `
            <div class="category-section">
              <div class="category-heading">${cat} <span class="category-count">(${categories[cat].length})</span></div>
              <div class="category-files">
                ${categories[cat].map(renderFileRow).join("")}
              </div>
            </div>`;
        });
      } else {
        filesHtml = `
          <div class="category-files">
            ${matchingFiles.map(renderFileRow).join("")}
          </div>`;
      }

      subj.innerHTML = `
        <button class="subject-toggle" aria-expanded="${shouldOpen}">
          <div class="subject-title-area">
            ${subject.code ? `<span class="subject-code-pill">${subject.code}</span>` : ""}
            <span class="subject-name">${subject.name}</span>
          </div>
          <span class="subject-meta">
            <span>${matchingFiles.length} file${matchingFiles.length === 1 ? "" : "s"}</span>
            <span class="subject-chevron" aria-hidden="true"></span>
          </span>
        </button>
        ${subject.description ? `<p class="subject-desc">${subject.description}</p>` : ""}
        <div class="subject-files">
          ${filesHtml}
        </div>`;

      const toggle = subj.querySelector(".subject-toggle");
      toggle.addEventListener("click", () => {
        const open = subj.dataset.open === "true";
        subj.dataset.open = String(!open);
        toggle.setAttribute("aria-expanded", String(!open));
      });

      block.appendChild(subj);
    });

    if (semesterHasVisibleSubjects) {
      root.appendChild(block);
    }
  });

  if (q) {
    updateSearchStatus(totalVisibleFiles, totalVisibleSubjects);
    if (totalVisibleFiles === 0) {
      root.innerHTML = `
        <div class="empty-state">
          <h3>No files found matching "${escapeHtml(currentSearchQuery)}"</h3>
          <p>Try searching for broader keywords, subject names, file formats (e.g. pdf, zip), or categories (e.g. lectures, labs, exams).</p>
        </div>`;
    }
  } else {
    updateSearchStatus(0, 0);
  }
}

function renderFileRow(f) {
  return `
    <a class="file-row" href="${f.url}" download target="_blank" rel="noopener">
      <span class="file-ext ext-${f.type}">${f.type}</span>
      <span class="file-name">${escapeHtml(f.name)}</span>
      ${f.category ? `<span class="file-category-badge">${escapeHtml(f.category)}</span>` : ""}
      <span class="file-size">${f.size}</span>
      <span class="file-download-icon" aria-hidden="true" title="Download">↓</span>
    </a>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function updateSearchStatus(filesCount, subjCount) {
  const statusEl = document.getElementById("search-status");
  if (!statusEl) return;

  if (!currentSearchQuery.trim()) {
    statusEl.style.display = "none";
    statusEl.innerHTML = "";
    return;
  }

  statusEl.style.display = "flex";
  statusEl.innerHTML = `
    <span>Found <strong>${filesCount}</strong> file${filesCount === 1 ? "" : "s"} across <strong>${subjCount}</strong> subject${subjCount === 1 ? "" : "s"} matching "<em>${escapeHtml(currentSearchQuery)}</em>"</span>
    <button type="button" class="btn-clear-inline" onclick="clearSearch()">Clear search</button>
  `;
}

function clearSearch() {
  const searchInput = document.getElementById("file-search-input");
  const clearBtn = document.getElementById("clear-search-btn");
  if (searchInput) searchInput.value = "";
  if (clearBtn) clearBtn.style.display = "none";
  currentSearchQuery = "";
  renderFiles(currentYear);
}

function initSearch() {
  const searchInput = document.getElementById("file-search-input");
  const clearBtn = document.getElementById("clear-search-btn");
  if (!searchInput) return;

  searchInput.addEventListener("input", () => {
    currentSearchQuery = searchInput.value;
    if (clearBtn) {
      clearBtn.style.display = currentSearchQuery ? "inline-block" : "none";
    }
    renderFiles(currentYear);
  });

  if (clearBtn) {
    clearBtn.addEventListener("click", clearSearch);
  }
}

function initToggleAll() {
  const btn = document.getElementById("toggle-all-btn");
  if (!btn) return;

  let expanded = false;
  btn.addEventListener("click", () => {
    expanded = !expanded;
    document.querySelectorAll(".subject").forEach((subj) => {
      subj.dataset.open = String(expanded);
      const toggle = subj.querySelector(".subject-toggle");
      if (toggle) toggle.setAttribute("aria-expanded", String(expanded));
    });
    btn.textContent = expanded ? "Collapse all" : "Expand all";
  });
}

function initYearSwitch() {
  const buttons = document.querySelectorAll("[data-year-switch] button");
  if (!buttons.length) return;

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.setAttribute("aria-pressed", "false"));
      btn.setAttribute("aria-pressed", "true");
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
  const root = document.getElementById("date-list-root");
  if (!root) return;

  const dates = SITE_DATA.calendar.dates.slice().sort((a, b) => (a.date < b.date ? -1 : 1));
  const today = new Date().toISOString().slice(0, 10);

  root.innerHTML = dates
    .map((d) => {
      const isPast = d.date < today;
      return `
      <div class="date-row" style="${isPast ? "opacity:0.45" : ""}">
        <time datetime="${d.date}">${formatDate(d.date)}</time>
        <div>
          <div class="date-label">${d.label}</div>
          <span class="date-tag date-tag-${d.tag}">${d.tag}</span>
        </div>
      </div>`;
    })
    .join("");
}

function renderCalendarEmbed() {
  const slot = document.getElementById("calendar-embed-slot");
  if (!slot) return;

  slot.innerHTML = `
    <div class="calendar-subscription-card">
      <div class="sub-steps">
        <div class="sub-step">
          <div class="sub-step-num">1</div>
          <div class="sub-step-text">
            <strong>Select your course units</strong>
            <p>Open the tool built by João Alves and choose your year and elective courses.</p>
          </div>
        </div>
        <div class="sub-step">
          <div class="sub-step-num">2</div>
          <div class="sub-step-text">
            <strong>Copy subscription URL</strong>
            <p>The generator creates a tailored live iCal feed link for your exact class schedule.</p>
          </div>
        </div>
        <div class="sub-step">
          <div class="sub-step-num">3</div>
          <div class="sub-step-text">
            <strong>Add to your calendar</strong>
            <p>Subscribe in Google Calendar, Apple Calendar, or Outlook for automatic updates.</p>
          </div>
        </div>
      </div>
      <div class="sub-card-actions">
        <a class="btn btn-primary" href="https://mca.jalves.dev/calendar" target="_blank" rel="noopener">
          Open Schedule Tool ↗
        </a>
        <a class="btn btn-secondary" href="https://github.com/joaoalves03" target="_blank" rel="noopener">
          João Alves on GitHub ↗
        </a>
      </div>
    </div>`;
}

// ---------------------------------------------------------------------
// Schedule page
// ---------------------------------------------------------------------

function initScheduleLinks() {
  document.querySelectorAll("[data-schedule-url]").forEach((el) => {
    if (el.tagName === "IFRAME") {
      el.src = SITE_DATA.schedule.toolUrl;
    } else {
      el.href = SITE_DATA.schedule.toolUrl;
    }
  });
  document.querySelectorAll("[data-schedule-url-label]").forEach((el) => {
    el.textContent = SITE_DATA.schedule.toolUrl;
  });
}

// ---------------------------------------------------------------------
// Contribution feature & Modal
// ---------------------------------------------------------------------

function initContributeModal() {
  if (!document.getElementById("contribute-modal")) {
    const modal = document.createElement("div");
    modal.id = "contribute-modal";
    modal.className = "modal-overlay";
    modal.style.display = "none";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "modal-title");

    modal.innerHTML = `
      <div class="modal-card">
        <div class="modal-header">
          <h2 id="modal-title">Contribute Content</h2>
          <button type="button" class="modal-close-btn" id="modal-close-btn" aria-label="Close">✕</button>
        </div>
        <div class="modal-content">
          <div class="modal-notice">
            <strong>Quality &amp; Safety Policy:</strong>
            All contributions automatically create a <strong>Pull Request</strong> on a new branch. The repository owner (<strong>@diogocsilva12</strong>) must review and approve each PR before changes are merged into the main branch.
          </div>

          <div class="modal-tabs" role="tablist">
            <button type="button" class="modal-tab-btn active" id="tab-btn-file" data-tab="file">Add File</button>
            <button type="button" class="modal-tab-btn" id="tab-btn-date" data-tab="date">Propose Date (Exam / Presentation)</button>
          </div>

          <!-- Tab 1: File submission -->
          <div id="tab-content-file" class="tab-pane">
            <div class="form-row">
              <div class="form-group">
                <label for="contrib-year">Year</label>
                <select id="contrib-year">
                  <option value="1-ano">1st Year</option>
                  <option value="2-ano">2nd Year</option>
                </select>
              </div>
              <div class="form-group">
                <label for="contrib-sem">Semester</label>
                <select id="contrib-sem">
                  <option value="1-semestre">1st Semester</option>
                  <option value="2-semestre">2nd Semester</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="contrib-uc">Course Unit</label>
                <select id="contrib-uc"></select>
              </div>
              <div class="form-group">
                <label for="contrib-cat">Category</label>
                <select id="contrib-cat">
                  <option value="teoricas">Lectures (slides, notes)</option>
                  <option value="praticas">Labs (exercises, code)</option>
                  <option value="trabalho">Assignments (project briefs)</option>
                  <option value="exames">Exams (past tests)</option>
                  <option value="books">Books &amp; References</option>
                </select>
              </div>
            </div>

            <div class="target-folder-box">
              <span class="folder-label">Target repository folder:</span>
              <code id="target-folder-path">files/1-ano/1-semestre/aac/teoricas/</code>
            </div>

            <div class="modal-actions">
              <a id="btn-github-upload" class="btn btn-primary" href="#" target="_blank" rel="noopener">
                Upload via GitHub (Creates PR) ↗
              </a>
              <div class="modal-alt-link">
                Don't have a GitHub account? <a id="link-issue-file" href="https://github.com/diogocsilva12/mca-uminho/issues/new?template=submit_material.yml" target="_blank" rel="noopener">Submit request with attachment via Issue ↗</a>
              </div>
            </div>
          </div>

          <!-- Tab 2: Date submission -->
          <div id="tab-content-date" class="tab-pane" style="display:none;">
            <div class="form-group">
              <label for="contrib-date-val">Event Date</label>
              <input type="date" id="contrib-date-val">
            </div>

            <div class="form-group">
              <label for="contrib-date-title">Event Description</label>
              <input type="text" id="contrib-date-title" placeholder="e.g. CPAR Normal Exam or AAC WA2 Presentation">
            </div>

            <div class="form-group">
              <label for="contrib-date-type">Event Type</label>
              <select id="contrib-date-type">
                <option value="exams">Exam / Test</option>
                <option value="presentation">Presentation / Defense</option>
                <option value="deadline">Assignment Deadline</option>
                <option value="semester">Semester Milestone</option>
              </select>
            </div>

            <div class="modal-actions">
              <a id="btn-propose-date-pr" class="btn btn-primary" href="https://github.com/diogocsilva12/mca-uminho/edit/main/assets/data/site-data.js" target="_blank" rel="noopener">
                Propose on GitHub (Edit site-data.js via PR) ↗
              </a>
              <div class="modal-alt-link">
                Prefer using an issue form? <a id="link-issue-date" href="https://github.com/diogocsilva12/mca-uminho/issues/new?template=propose_date.yml" target="_blank" rel="noopener">Submit proposal via Issue ↗</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const ucMapping = {
      "1-semestre": [
        { code: "aac", name: "AAC — Advanced Computer Architectures" },
        { code: "cpar", name: "CPAR — Parallel Computing" },
        { code: "fced", name: "FCED — High-Performance Computing Tools" },
        { code: "sac", name: "SAC — Computer Systems and Architectures" },
        { code: "sne", name: "SNE — Numerical Simulation in Engineering" },
        { code: "vc", name: "VC — Scientific Visualization" },
      ],
      "2-semestre": [
        { code: "aded", name: "ADED — High-Performance Data Analysis" },
        { code: "ap", name: "AP — Parallel Algorithms" },
        { code: "chle", name: "CHLE — Large-Scale Hybrid Computing" },
        { code: "pced", name: "PCED — High-Performance Computing Project" },
        { code: "sade", name: "SADE — Efficient Data Storage Systems" },
      ],
    };

    function updateUcDropdown() {
      const sem = document.getElementById("contrib-sem").value;
      const ucSelect = document.getElementById("contrib-uc");
      const ucs = ucMapping[sem] || ucMapping["1-semestre"];
      ucSelect.innerHTML = ucs.map(u => `<option value="${u.code}">${u.name}</option>`).join("");
      updateUploadLink();
    }

    function updateUploadLink() {
      const year = document.getElementById("contrib-year").value;
      const sem = document.getElementById("contrib-sem").value;
      const uc = document.getElementById("contrib-uc").value;
      const cat = document.getElementById("contrib-cat").value;
      const path = `files/${year}/${sem}/${uc}/${cat}/`;
      
      const pathEl = document.getElementById("target-folder-path");
      if (pathEl) pathEl.textContent = path;

      const uploadBtn = document.getElementById("btn-github-upload");
      if (uploadBtn) {
        uploadBtn.href = `https://github.com/diogocsilva12/mca-uminho/upload/main/${path}`;
      }
    }

    document.getElementById("contrib-sem").addEventListener("change", updateUcDropdown);
    document.getElementById("contrib-year").addEventListener("change", updateUploadLink);
    document.getElementById("contrib-uc").addEventListener("change", updateUploadLink);
    document.getElementById("contrib-cat").addEventListener("change", updateUploadLink);

    updateUcDropdown();

    const tabFileBtn = document.getElementById("tab-btn-file");
    const tabDateBtn = document.getElementById("tab-btn-date");
    const tabFileContent = document.getElementById("tab-content-file");
    const tabDateContent = document.getElementById("tab-content-date");

    function switchTab(tab) {
      if (tab === "date") {
        tabDateBtn.classList.add("active");
        tabFileBtn.classList.remove("active");
        tabDateContent.style.display = "block";
        tabFileContent.style.display = "none";
      } else {
        tabFileBtn.classList.add("active");
        tabDateBtn.classList.remove("active");
        tabFileContent.style.display = "block";
        tabDateContent.style.display = "none";
      }
    }

    tabFileBtn.addEventListener("click", () => switchTab("file"));
    tabDateBtn.addEventListener("click", () => switchTab("date"));

    const closeBtn = document.getElementById("modal-close-btn");
    closeBtn.addEventListener("click", () => { modal.style.display = "none"; });
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.style.display = "none";
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.style.display !== "none") {
        modal.style.display = "none";
      }
    });

    const dateInput = document.getElementById("contrib-date-val");
    const titleInput = document.getElementById("contrib-date-title");
    const typeSelect = document.getElementById("contrib-date-type");
    const linkIssueDate = document.getElementById("link-issue-date");

    function updateDateIssueLink() {
      const t = titleInput.value || "";
      const titleParam = encodeURIComponent(t ? `[Date] ${t}` : "[Date] New Date Proposal");
      linkIssueDate.href = `https://github.com/diogocsilva12/mca-uminho/issues/new?template=propose_date.yml&title=${titleParam}`;
    }

    dateInput.addEventListener("input", updateDateIssueLink);
    titleInput.addEventListener("input", updateDateIssueLink);
    typeSelect.addEventListener("change", updateDateIssueLink);
  }

  document.querySelectorAll("[data-open-contribute]").forEach(btn => {
    btn.addEventListener("click", () => {
      const modal = document.getElementById("contribute-modal");
      if (modal) {
        modal.style.display = "flex";
        const targetTab = btn.getAttribute("data-open-contribute");
        if (targetTab === "date") {
          const tabDateBtn = document.getElementById("tab-btn-date");
          if (tabDateBtn) tabDateBtn.click();
        } else {
          const tabFileBtn = document.getElementById("tab-btn-file");
          if (tabFileBtn) tabFileBtn.click();
        }
      }
    });
  });
}

// ---------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  setActiveNav();
  initYearSwitch();
  initSearch();
  initToggleAll();
  renderCalendarDates();
  renderCalendarEmbed();
  initScheduleLinks();
  initContributeModal();
});
