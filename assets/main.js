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

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
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

  if (semesters.length === 0) {
    root.innerHTML = `
      <div class="empty-state">
        <h3>No courses available for this year</h3>
        <p>Curriculum information will be published soon.</p>
      </div>`;
    updateSearchStatus(0, 0);
    return;
  }

  // 2nd Year intro banner if on Year 2 and not searching
  if (year === 2 && !currentSearchQuery.trim()) {
    const banner = document.createElement("div");
    banner.className = "year-intro-banner";
    banner.innerHTML = `
      <div class="year-intro-badge">2nd Year Curriculum</div>
      <h3>Specialization &amp; Dissertation Year</h3>
      <p>Year 2 focuses on advanced vertical options (Option II/III &amp; Option IV) in the 1st semester, followed by the research dissertation, capstone project, or industrial internship. Browse the course units below or contribute study materials.</p>
    `;
    root.appendChild(banner);
  }

  let totalVisibleFiles = 0;
  let totalVisibleSubjects = 0;
  const q = currentSearchQuery.trim().toLowerCase();

  semesters.forEach((sem, sIdx) => {
    const block = document.createElement("div");
    block.className = "semester-block";

    const title = document.createElement("div");
    title.className = "semester-title";
    title.textContent = sem.semester;
    block.appendChild(title);

    let semesterHasVisibleSubjects = false;

    sem.subjects.forEach((subject, i) => {
      // Filter files if searching
      const matchingFiles = (subject.files || []).filter((f) => {
        if (!q) return true;
        const inFileName = f.name.toLowerCase().includes(q);
        const inCat = (f.category || "").toLowerCase().includes(q);
        const inExt = f.type.toLowerCase().includes(q);
        const inSubjName = subject.name.toLowerCase().includes(q);
        const inSubjCode = (subject.code || "").toLowerCase().includes(q);
        return inFileName || inCat || inExt || inSubjName || inSubjCode;
      });

      const subjectNameMatches = q && (
        subject.name.toLowerCase().includes(q) ||
        (subject.code || "").toLowerCase().includes(q) ||
        (subject.description || "").toLowerCase().includes(q)
      );

      // If searching and neither files nor subject info match, hide
      if (q && matchingFiles.length === 0 && !subjectNameMatches) {
        return;
      }

      semesterHasVisibleSubjects = true;
      totalVisibleSubjects++;
      totalVisibleFiles += matchingFiles.length;

      const subj = document.createElement("div");
      subj.className = "subject";
      // Open by default if searching, or first subject of first semester, or year 2
      const shouldOpen = q ? true : (sIdx === 0 && i === 0);
      subj.dataset.open = shouldOpen ? "true" : "false";

      let filesHtml = "";

      if (matchingFiles.length > 0) {
        // Group files by category
        const categories = {};
        matchingFiles.forEach((f) => {
          const cat = f.category || "General";
          if (!categories[cat]) categories[cat] = [];
          categories[cat].push(f);
        });

        const catKeys = Object.keys(categories);
        if (catKeys.length > 1) {
          catKeys.forEach((cat) => {
            filesHtml += `
              <div class="category-section">
                <div class="category-heading">${escapeHtml(cat)} <span class="category-count">(${categories[cat].length})</span></div>
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
      } else {
        const semCode = sem.semester.toLowerCase().includes("1st") ? "1-semestre" : "2-semestre";
        filesHtml = `
          <div class="subject-empty-state">
            <div class="subject-empty-text">
              No materials uploaded yet for <strong>${escapeHtml(subject.name)}</strong>.
            </div>
            <button type="button" class="btn btn-secondary btn-sm" 
                    data-open-contribute="file"
                    data-prefill-year="${year}-ano"
                    data-prefill-sem="${semCode}"
                    data-prefill-uc="${subject.code.toLowerCase()}">
              + Add file for this course
            </button>
          </div>`;
      }

      const filesCountLabel = matchingFiles.length > 0 
        ? `<span>${matchingFiles.length} file${matchingFiles.length === 1 ? "" : "s"}</span>`
        : `<span class="empty-count">0 files</span>`;

      subj.innerHTML = `
        <button class="subject-toggle" aria-expanded="${shouldOpen}">
          <div class="subject-title-area">
            ${subject.code ? `<span class="subject-code-pill">${escapeHtml(subject.code)}</span>` : ""}
            <span class="subject-name">${escapeHtml(subject.name)}</span>
          </div>
          <span class="subject-meta">
            ${filesCountLabel}
            <span class="subject-chevron" aria-hidden="true"></span>
          </span>
        </button>
        ${subject.description ? `<p class="subject-desc">${escapeHtml(subject.description)}</p>` : ""}
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

  // Attach preview modal openers on file rows
  attachFileRowEvents(root);

  if (q) {
    updateSearchStatus(totalVisibleFiles, totalVisibleSubjects);
    if (totalVisibleSubjects === 0) {
      root.innerHTML = `
        <div class="empty-state">
          <h3>No results found for "${escapeHtml(currentSearchQuery)}"</h3>
          <p>Try searching for broader keywords, subject acronyms (e.g. AAC, NIC, CPAR), file extensions (e.g. pdf, zip), or categories (e.g. lectures, labs).</p>
        </div>`;
    }
  } else {
    updateSearchStatus(0, 0);
  }
}

function renderFileRow(f) {
  return `
    <div class="file-row" role="button" tabindex="0" 
         data-file-url="${escapeHtml(f.url)}" 
         data-file-name="${escapeHtml(f.name)}" 
         data-file-type="${escapeHtml(f.type)}" 
         data-file-size="${escapeHtml(f.size || "")}">
      <span class="file-ext ext-${escapeHtml(f.type)}">${escapeHtml(f.type)}</span>
      <span class="file-name">${escapeHtml(f.name)}</span>
      ${f.category ? `<span class="file-category-badge">${escapeHtml(f.category)}</span>` : ""}
      <span class="file-size">${escapeHtml(f.size || "")}</span>
      <div class="file-row-actions">
        <button type="button" class="file-action-btn file-preview-btn" title="Preview file">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
          <span>Preview</span>
        </button>
        <a class="file-action-btn file-download-btn" href="${escapeHtml(f.url)}" download="${escapeHtml(f.name)}" title="Download file" onclick="event.stopPropagation()">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <span>Download</span>
        </a>
      </div>
    </div>`;
}

function attachFileRowEvents(container) {
  container.querySelectorAll(".file-row").forEach((row) => {
    const fileData = {
      url: row.dataset.fileUrl,
      name: row.dataset.fileName,
      type: row.dataset.fileType,
      size: row.dataset.fileSize,
    };

    row.addEventListener("click", (e) => {
      // If clicking directly on the download button, let it download without opening preview
      if (e.target.closest(".file-download-btn")) {
        return;
      }
      openFilePreview(fileData);
    });

    row.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openFilePreview(fileData);
      }
    });
  });

  // Also bind any contribute buttons inside subject empty states
  container.querySelectorAll("[data-open-contribute]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openContributeModalWithPrefill({
        tab: btn.dataset.openContribute,
        year: btn.dataset.prefillYear,
        sem: btn.dataset.prefillSem,
        uc: btn.dataset.prefillUc,
      });
    });
  });
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
    <span>Found <strong>${filesCount}</strong> file${filesCount === 1 ? "" : "s"} across <strong>${subjCount}</strong> course${subjCount === 1 ? "" : "s"} matching "<em>${escapeHtml(currentSearchQuery)}</em>"</span>
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
// File Preview Modal
// ---------------------------------------------------------------------

let previewModalEl = null;

function initPreviewModal() {
  if (previewModalEl) return;

  previewModalEl = document.createElement("div");
  previewModalEl.id = "file-preview-modal";
  previewModalEl.className = "modal-overlay";
  previewModalEl.style.display = "none";
  previewModalEl.setAttribute("role", "dialog");
  previewModalEl.setAttribute("aria-modal", "true");
  previewModalEl.setAttribute("aria-labelledby", "preview-file-name");

  previewModalEl.innerHTML = `
    <div class="preview-modal-card">
      <div class="preview-modal-header">
        <div class="preview-header-info">
          <span id="preview-file-ext" class="file-ext"></span>
          <span id="preview-file-name" class="file-name"></span>
          <span id="preview-file-size" class="file-size"></span>
        </div>
        <div class="preview-header-actions">
          <a id="preview-open-tab-btn" class="file-action-btn" href="#" target="_blank" rel="noopener" title="Open file in new tab">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
            <span>Open in Tab</span>
          </a>
          <a id="preview-download-btn" class="file-action-btn file-download-btn" href="#" download title="Download file">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>Download</span>
          </a>
          <button type="button" class="modal-close-btn" id="preview-close-btn" aria-label="Close preview">✕</button>
        </div>
      </div>
      <div class="preview-modal-body" id="preview-modal-body">
        <div class="preview-loading">
          <div class="preview-spinner"></div>
          <span>Loading preview...</span>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(previewModalEl);

  const closeBtn = previewModalEl.querySelector("#preview-close-btn");
  closeBtn.addEventListener("click", closeFilePreview);

  previewModalEl.addEventListener("click", (e) => {
    if (e.target === previewModalEl) closeFilePreview();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && previewModalEl.style.display !== "none") {
      closeFilePreview();
    }
  });
}

function closeFilePreview() {
  if (!previewModalEl) return;
  previewModalEl.style.display = "none";
  const body = previewModalEl.querySelector("#preview-modal-body");
  if (body) body.innerHTML = "";
}

function openFilePreview(file) {
  initPreviewModal();

  const extEl = previewModalEl.querySelector("#preview-file-ext");
  const nameEl = previewModalEl.querySelector("#preview-file-name");
  const sizeEl = previewModalEl.querySelector("#preview-file-size");
  const tabBtn = previewModalEl.querySelector("#preview-open-tab-btn");
  const downBtn = previewModalEl.querySelector("#preview-download-btn");
  const body = previewModalEl.querySelector("#preview-modal-body");

  const ext = (file.type || "file").toLowerCase();
  extEl.className = `file-ext ext-${ext}`;
  extEl.textContent = ext;
  nameEl.textContent = file.name;
  sizeEl.textContent = file.size ? `(${file.size})` : "";

  tabBtn.href = file.url;
  downBtn.href = file.url;
  downBtn.setAttribute("download", file.name);

  previewModalEl.style.display = "flex";

  // PDF Preview
  if (ext === "pdf") {
    body.innerHTML = `
      <iframe class="preview-pdf-frame" src="${file.url}#toolbar=1" title="${escapeHtml(file.name)}"></iframe>
    `;
    return;
  }

  // Image Preview
  if (["png", "jpg", "jpeg", "svg", "gif", "webp"].includes(ext)) {
    body.innerHTML = `
      <div class="preview-image-wrap">
        <img src="${file.url}" alt="${escapeHtml(file.name)}">
      </div>
    `;
    return;
  }

  // Code & Text Previews
  const codeExts = ["c", "cpp", "cu", "h", "py", "sh", "txt", "m", "file", "md", "json", "yml", "yaml"];
  if (codeExts.includes(ext)) {
    body.innerHTML = `
      <div class="preview-loading">
        <div class="preview-spinner"></div>
        <span>Loading text content...</span>
      </div>
    `;

    fetch(file.url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => {
        const lines = text.split("\n").length;
        body.innerHTML = `
          <div class="preview-code-wrap">
            <div class="preview-code-header">
              <span>${ext.toUpperCase()} Source · ${lines} lines · ${file.size || ""}</span>
              <button type="button" class="file-action-btn" id="btn-copy-code">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                <span id="copy-btn-text">Copy code</span>
              </button>
            </div>
            <pre class="preview-code-content"><code>${escapeHtml(text)}</code></pre>
          </div>
        `;

        const copyBtn = body.querySelector("#btn-copy-code");
        const copyText = body.querySelector("#copy-btn-text");
        copyBtn.addEventListener("click", () => {
          navigator.clipboard.writeText(text).then(() => {
            copyText.textContent = "Copied!";
            setTimeout(() => { copyText.textContent = "Copy code"; }, 2000);
          }).catch(() => {
            copyText.textContent = "Error copying";
          });
        });
      })
      .catch((err) => {
        body.innerHTML = `
          <div class="preview-unsupported-card">
            <div class="unsupported-icon">📄</div>
            <h3>Unable to fetch code preview inline</h3>
            <p>Your browser security settings or offline file protocol blocked inline fetching. You can open or download the file directly.</p>
            <div style="display:flex; gap:10px; margin-top:10px;">
              <a class="btn btn-primary btn-sm" href="${file.url}" target="_blank" rel="noopener">Open in Tab ↗</a>
              <a class="btn btn-secondary btn-sm" href="${file.url}" download="${escapeHtml(file.name)}">Download</a>
            </div>
          </div>
        `;
      });
    return;
  }

  // Jupyter Notebook (.ipynb)
  if (ext === "ipynb") {
    body.innerHTML = `
      <div class="preview-loading">
        <div class="preview-spinner"></div>
        <span>Rendering Jupyter Notebook...</span>
      </div>
    `;

    fetch(file.url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((nb) => {
        let cellsHtml = "";
        const cells = nb.cells || [];
        cells.forEach((cell, idx) => {
          const rawSource = Array.isArray(cell.source) ? cell.source.join("") : (cell.source || "");
          if (cell.cell_type === "markdown") {
            cellsHtml += `
              <div class="notebook-cell">
                <div class="notebook-cell-markdown">${escapeHtml(rawSource).replace(/\n/g, "<br>")}</div>
              </div>`;
          } else if (cell.cell_type === "code") {
            let outputText = "";
            if (cell.outputs && cell.outputs.length) {
              cell.outputs.forEach((out) => {
                if (out.text) {
                  outputText += (Array.isArray(out.text) ? out.text.join("") : out.text);
                } else if (out.data && out.data["text/plain"]) {
                  const plain = out.data["text/plain"];
                  outputText += (Array.isArray(plain) ? plain.join("") : plain);
                }
              });
            }
            cellsHtml += `
              <div class="notebook-cell">
                <div class="notebook-cell-prompt">In [${cell.execution_count ?? " "}]:</div>
                <pre class="notebook-cell-code"><code>${escapeHtml(rawSource)}</code></pre>
                ${outputText ? `<pre class="notebook-cell-output">${escapeHtml(outputText)}</pre>` : ""}
              </div>`;
          }
        });

        body.innerHTML = `
          <div class="preview-notebook-wrap">
            <div class="preview-code-header">
              <span>Jupyter Notebook · ${cells.length} cells</span>
            </div>
            ${cellsHtml || "<p>Notebook is empty.</p>"}
          </div>
        `;
      })
      .catch(() => {
        body.innerHTML = `
          <div class="preview-unsupported-card">
            <div class="unsupported-icon">📓</div>
            <h3>Jupyter Notebook Preview</h3>
            <p>Download this notebook or open it in JupyterLab / VS Code to run interactive cells.</p>
            <div style="display:flex; gap:10px; margin-top:10px;">
              <a class="btn btn-primary btn-sm" href="${file.url}" download="${escapeHtml(file.name)}">Download Notebook (.ipynb)</a>
              <a class="btn btn-secondary btn-sm" href="${file.url}" target="_blank" rel="noopener">Raw JSON ↗</a>
            </div>
          </div>
        `;
      });
    return;
  }

  // ZIP / PPTX / Binary / Fallback
  const icon = ext === "zip" ? "📦" : (ext === "pptx" ? "📊" : "📁");
  body.innerHTML = `
    <div class="preview-unsupported-card">
      <div class="unsupported-icon">${icon}</div>
      <h3>${escapeHtml(file.name)}</h3>
      <p>Direct in-browser preview is not available for <strong>.${ext.toUpperCase()}</strong> files (${file.size || "Unknown size"}).</p>
      <div style="display:flex; gap:10px; margin-top:10px;">
        <a class="btn btn-primary btn-sm" href="${file.url}" download="${escapeHtml(file.name)}">Download ${ext.toUpperCase()}</a>
        <a class="btn btn-secondary btn-sm" href="${file.url}" target="_blank" rel="noopener">Open Directly ↗</a>
      </div>
    </div>
  `;
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
          <div class="date-label">${escapeHtml(d.label)}</div>
          <span class="date-tag date-tag-${escapeHtml(d.tag)}">${escapeHtml(d.tag)}</span>
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
// Contribution feature & Modal with Drag-and-Drop and Automated PR
// ---------------------------------------------------------------------

const UC_MAPPING = {
  "1-ano": {
    "1-semestre": [
      { code: "aac", name: "AAC — Advanced Computer Architectures" },
      { code: "cpar", name: "CPAR — Parallel Computing" },
      { code: "fced", name: "FCED — High-Performance Computing Tools" },
      { code: "sac", name: "SAC — Computer Systems & Architectures (Option I)" },
      { code: "dcct", name: "DCCT — Data Classification & Clustering (Option I)" },
      { code: "sne", name: "SNE — Numerical Simulation in Engineering" },
      { code: "vc", name: "VC — Scientific Visualization" },
    ],
    "2-semestre": [
      { code: "aded", name: "ADED — High-Performance Data Analysis" },
      { code: "ap", name: "AP — Parallel Algorithms" },
      { code: "chle", name: "CHLE — Large-Scale Hybrid Computing" },
      { code: "pced", name: "PCED — Project in High Performance Computing" },
      { code: "sade", name: "SADE — Efficient Storage Systems" },
    ],
  },
  "2-ano": {
    "1-semestre": [
      { code: "nic", name: "NIC — Nature Inspired Computation (Option II/III)" },
      { code: "ds", name: "DS — Data Security (Option II/III)" },
      { code: "ccas", name: "CCAS — Cloud Computing Applications & Services (Option II/III)" },
      { code: "hphci", name: "HPHCI — High Performance Hybrid Computing Infrastructures (Option II/III)" },
      { code: "odac", name: "ODAC — Orchestration of Distributed Advanced Computing (Option II/III)" },
      { code: "bsb", name: "BSB — Bioinformatics & Systems Biology (Option IV)" },
      { code: "cr", name: "CR — Computational Rheology (Option IV)" },
      { code: "dml", name: "DML — Data and Machine Learning (Option IV)" },
      { code: "diss", name: "DISS — Dissertation / Project / Internship (Part I)" },
    ],
    "2-semestre": [
      { code: "diss", name: "DISS — Dissertation / Project / Internship (Part II)" },
    ],
  },
};

// Helper: read a File object into a base64-encoded string
function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result;
      const base64 = res.substring(res.indexOf(",") + 1);
      resolve(base64);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

function initContributeModal() {
  if (document.getElementById("contribute-modal")) return;

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
          <strong>Quality &amp; Review Policy:</strong>
          Submissions automatically create a Pull Request on a separate branch. The repository maintainer (<strong>@diogocsilva12</strong>) will review and approve changes before merging into <code>main</code>.
        </div>

        <div class="modal-tabs" id="contrib-tabs" role="tablist">
          <button type="button" class="modal-tab-btn active" id="tab-btn-file" data-tab="file">Upload Files</button>
          <button type="button" class="modal-tab-btn" id="tab-btn-date" data-tab="date">Propose Date (Exams &amp; Deadlines)</button>
        </div>

        <!-- Form Panels Container -->
        <div id="contrib-forms-wrapper">
          <!-- Tab 1: File submission -->
          <div id="tab-content-file" class="tab-pane">
            <div class="form-row">
              <div class="form-group">
                <label for="contrib-year">Curricular Year</label>
                <select id="contrib-year">
                  <option value="1-ano">1st Year</option>
                  <option value="2-ano">2nd Year</option>
                </select>
              </div>
              <div class="form-group">
                <label for="contrib-sem">Semester</label>
                <select id="contrib-sem"></select>
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

            <div class="form-group">
              <label for="contrib-author">Your Name / GitHub Handle <span style="font-size:0.76rem; color:var(--ink-faint); font-weight:normal;">(optional, for credits)</span></label>
              <input type="text" id="contrib-author" placeholder="e.g. Diogo Silva or @diogocsilva12">
            </div>

            <div class="target-folder-box">
              <span class="folder-label">Destination repository path:</span>
              <code id="target-folder-path">files/1-ano/1-semestre/aac/teoricas/</code>
            </div>

            <!-- Drag & Drop Zone -->
            <div id="dropzone-area" class="dropzone-area">
              <div class="dropzone-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
              <div class="dropzone-title">Drag &amp; drop files here, or <span class="dropzone-browse">browse from PC</span></div>
              <div class="dropzone-hint">PDFs, code (.c, .cu, .py), notebooks (.ipynb), slides, zips</div>
              <input type="file" id="file-picker-input" multiple style="display: none;">
            </div>

            <!-- Staged Files List -->
            <div id="staged-files-container" class="staged-files-container" style="display: none;">
              <div class="staged-files-header">
                <span id="staged-files-count">0 files selected</span>
                <button type="button" id="btn-clear-staged" class="staged-file-remove" style="font-size:0.75rem; text-decoration:underline;">Clear all</button>
              </div>
              <div id="staged-files-list" class="staged-files-list"></div>
            </div>

            <div class="modal-actions">
              <button type="button" id="btn-submit-files" class="btn btn-primary" disabled>
                Submit Files &amp; Open PR
              </button>
              <div class="modal-alt-link">
                Prefer manual submission? <a id="btn-github-upload-fallback" href="https://github.com/diogocsilva12/mca-uminho/upload/main/files/" target="_blank" rel="noopener">Open folder on GitHub ↗</a> or <a href="https://github.com/diogocsilva12/mca-uminho/issues/new?template=submit_material.yml" target="_blank" rel="noopener">Submit via Issue ↗</a>
              </div>
            </div>
          </div>

          <!-- Tab 2: Date submission -->
          <div id="tab-content-date" class="tab-pane" style="display:none;">
            <div class="form-row">
              <div class="form-group">
                <label for="contrib-date-val">Event Date *</label>
                <input type="date" id="contrib-date-val" required>
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
            </div>

            <div class="form-group">
              <label for="contrib-date-title">Event Title / Course *</label>
              <input type="text" id="contrib-date-title" placeholder="e.g. CPAR Normal Exam or AAC WA2 Presentation">
            </div>

            <div class="form-group">
              <label for="contrib-date-author">Your Name / GitHub Handle <span style="font-size:0.76rem; color:var(--ink-faint); font-weight:normal;">(optional)</span></label>
              <input type="text" id="contrib-date-author" placeholder="e.g. João Alves or @joaoalves03">
            </div>

            <div class="target-folder-box">
              <span class="folder-label">Destination in repository:</span>
              <code>assets/data/site-data.js &rarr; calendar.dates</code>
            </div>

            <div class="modal-actions">
              <button type="button" id="btn-submit-date" class="btn btn-primary" disabled>
                Propose Date &amp; Open PR
              </button>
              <div class="modal-alt-link">
                Prefer using an issue form? <a id="link-issue-date" href="https://github.com/diogocsilva12/mca-uminho/issues/new?template=propose_date.yml" target="_blank" rel="noopener">Submit proposal via Issue ↗</a>
              </div>
            </div>
          </div>
        </div>

        <!-- Submission Progress View -->
        <div id="contrib-progress" class="submission-progress-view" style="display: none;">
          <div class="preview-spinner"></div>
          <h3 id="progress-heading">Creating Pull Request...</h3>
          <div id="progress-step-text" class="submission-step-log">Preparing files...</div>
          <p style="font-size:0.82rem; color:var(--ink-faint); margin:0;">Automating branch creation and committing directly to repository.</p>
        </div>

        <!-- Submission Result View -->
        <div id="contrib-result" class="submission-result-view" style="display: none;"></div>

        <!-- Settings Drawer (Worker URL / GitHub Token) -->
        <details class="token-setup-banner" id="api-settings-details">
          <summary style="font-size:0.8rem; font-weight:500; cursor:pointer; color:var(--ink-soft); user-select:none;">
            ⚙️ Connection &amp; API Settings
          </summary>
          <div style="margin-top:10px; font-size:0.8rem; color:var(--ink-soft); line-height:1.45;">
            <p style="margin:0 0 8px;">
              By default, requests are dispatched via the secure Cloudflare Worker backend. Alternatively, you can store a personal GitHub token locally in this browser.
            </p>
            <div class="form-group" style="margin-bottom:8px;">
              <label for="cfg-worker-url" style="font-size:0.75rem;">Cloudflare Worker API URL (optional):</label>
              <input type="text" id="cfg-worker-url" placeholder="https://mca-submissions.<subdomain>.workers.dev" style="padding:5px 8px; font-size:0.78rem;">
            </div>
            <div class="form-group" style="margin-bottom:8px;">
              <label for="cfg-github-token" style="font-size:0.75rem;">GitHub Token (stored in local browser only):</label>
              <input type="password" id="cfg-github-token" placeholder="ghp_... or fine-grained token" style="padding:5px 8px; font-size:0.78rem;">
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <button type="button" id="btn-save-settings" class="btn btn-secondary btn-sm" style="padding:4px 10px; font-size:0.78rem;">Save Settings</button>
              <span id="settings-save-feedback" style="font-size:0.76rem; color:#1b873f; display:none;">Saved!</span>
            </div>
          </div>
        </details>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // -------------------------------------------------------------------
  // Dropdown synchronization
  // -------------------------------------------------------------------
  function updateSemesterDropdown() {
    const year = document.getElementById("contrib-year").value;
    const semSelect = document.getElementById("contrib-sem");
    if (year === "2-ano") {
      semSelect.innerHTML = `
        <option value="1-semestre">1st Sem (Options &amp; Specialization)</option>
        <option value="2-semestre">2nd Sem (Dissertation Defense)</option>
      `;
    } else {
      semSelect.innerHTML = `
        <option value="1-semestre">1st Semester</option>
        <option value="2-semestre">2nd Semester</option>
      `;
    }
    updateUcDropdown();
  }

  function updateUcDropdown() {
    const year = document.getElementById("contrib-year").value;
    const sem = document.getElementById("contrib-sem").value;
    const ucSelect = document.getElementById("contrib-uc");
    const yearMapping = UC_MAPPING[year] || UC_MAPPING["1-ano"];
    const ucs = yearMapping[sem] || yearMapping["1-semestre"];
    ucSelect.innerHTML = ucs.map((u) => `<option value="${u.code}">${escapeHtml(u.name)}</option>`).join("");
    updateTargetPath();
  }

  function updateTargetPath() {
    const year = document.getElementById("contrib-year").value;
    const sem = document.getElementById("contrib-sem").value;
    const uc = document.getElementById("contrib-uc").value;
    const cat = document.getElementById("contrib-cat").value;
    const path = `files/${year}/${sem}/${uc}/${cat}/`;

    const pathEl = document.getElementById("target-folder-path");
    if (pathEl) pathEl.textContent = path;

    const uploadFallback = document.getElementById("btn-github-upload-fallback");
    if (uploadFallback) {
      uploadFallback.href = `https://github.com/diogocsilva12/mca-uminho/upload/main/${path}`;
    }
  }

  document.getElementById("contrib-year").addEventListener("change", updateSemesterDropdown);
  document.getElementById("contrib-sem").addEventListener("change", updateUcDropdown);
  document.getElementById("contrib-uc").addEventListener("change", updateTargetPath);
  document.getElementById("contrib-cat").addEventListener("change", updateTargetPath);

  updateSemesterDropdown();

  // -------------------------------------------------------------------
  // Modal Tabs
  // -------------------------------------------------------------------
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

  // -------------------------------------------------------------------
  // Close triggers
  // -------------------------------------------------------------------
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

  // -------------------------------------------------------------------
  // Staged Files & Drag-and-Drop Management
  // -------------------------------------------------------------------
  let stagedFiles = [];
  const dropzoneArea = document.getElementById("dropzone-area");
  const filePickerInput = document.getElementById("file-picker-input");
  const stagedContainer = document.getElementById("staged-files-container");
  const stagedCount = document.getElementById("staged-files-count");
  const stagedList = document.getElementById("staged-files-list");
  const clearStagedBtn = document.getElementById("btn-clear-staged");
  const submitFilesBtn = document.getElementById("btn-submit-files");

  function refreshStagedFilesUI() {
    if (stagedFiles.length === 0) {
      stagedContainer.style.display = "none";
      submitFilesBtn.disabled = true;
      stagedList.innerHTML = "";
      return;
    }

    stagedContainer.style.display = "block";
    submitFilesBtn.disabled = false;
    stagedCount.textContent = `${stagedFiles.length} file${stagedFiles.length === 1 ? "" : "s"} staged`;

    stagedList.innerHTML = stagedFiles.map((item, idx) => `
      <div class="staged-file-item" data-file-idx="${idx}">
        <span class="file-ext ext-${escapeHtml(item.ext)}">${escapeHtml(item.ext)}</span>
        <span class="staged-file-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>
        <span class="staged-file-size">${escapeHtml(item.formattedSize)}</span>
        <button type="button" class="staged-file-remove" data-remove-idx="${idx}" title="Remove file">✕</button>
      </div>
    `).join("");

    stagedList.querySelectorAll("[data-remove-idx]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const removeIdx = parseInt(btn.dataset.removeIdx, 10);
        stagedFiles.splice(removeIdx, 1);
        refreshStagedFilesUI();
      });
    });
  }

  function handleAddFiles(filesList) {
    if (!filesList || !filesList.length) return;

    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];
      // Check if file is already staged
      const exists = stagedFiles.some((f) => f.name === file.name && f.file.size === file.size);
      if (!exists) {
        const parts = file.name.split(".");
        const ext = parts.length > 1 ? parts.pop().toLowerCase() : "file";
        stagedFiles.push({
          file: file,
          name: file.name,
          ext: ext,
          formattedSize: formatFileSize(file.size),
        });
      }
    }
    refreshStagedFilesUI();
  }

  dropzoneArea.addEventListener("click", () => filePickerInput.click());
  filePickerInput.addEventListener("change", () => {
    handleAddFiles(filePickerInput.files);
    filePickerInput.value = ""; // reset for next selection
  });

  dropzoneArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzoneArea.classList.add("drag-active");
  });

  dropzoneArea.addEventListener("dragleave", () => {
    dropzoneArea.classList.remove("drag-active");
  });

  dropzoneArea.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzoneArea.classList.remove("drag-active");
    if (e.dataTransfer && e.dataTransfer.files) {
      handleAddFiles(e.dataTransfer.files);
    }
  });

  clearStagedBtn.addEventListener("click", () => {
    stagedFiles = [];
    refreshStagedFilesUI();
  });

  // -------------------------------------------------------------------
  // Date Form Validation & Button State
  // -------------------------------------------------------------------
  const dateValInput = document.getElementById("contrib-date-val");
  const dateTitleInput = document.getElementById("contrib-date-title");
  const dateTypeSelect = document.getElementById("contrib-date-type");
  const submitDateBtn = document.getElementById("btn-submit-date");
  const linkIssueDate = document.getElementById("link-issue-date");

  function validateDateForm() {
    const valid = dateValInput.value.trim() !== "" && dateTitleInput.value.trim() !== "";
    submitDateBtn.disabled = !valid;

    const t = dateTitleInput.value.trim();
    const titleParam = encodeURIComponent(t ? `[Date] ${t}` : "[Date] New Date Proposal");
    if (linkIssueDate) {
      linkIssueDate.href = `https://github.com/diogocsilva12/mca-uminho/issues/new?template=propose_date.yml&title=${titleParam}`;
    }
  }

  dateValInput.addEventListener("input", validateDateForm);
  dateTitleInput.addEventListener("input", validateDateForm);
  dateTypeSelect.addEventListener("change", validateDateForm);

  // -------------------------------------------------------------------
  // Settings Management (Worker URL / GitHub Token)
  // -------------------------------------------------------------------
  const cfgWorkerInput = document.getElementById("cfg-worker-url");
  const cfgTokenInput = document.getElementById("cfg-github-token");
  const btnSaveSettings = document.getElementById("btn-save-settings");
  const settingsFeedback = document.getElementById("settings-save-feedback");

  if (cfgWorkerInput) {
    cfgWorkerInput.value = localStorage.getItem("mca_worker_url") || (SITE_DATA.config && SITE_DATA.config.submissionApiUrl) || "";
  }
  if (cfgTokenInput) {
    cfgTokenInput.value = localStorage.getItem("mca_github_token") || (SITE_DATA.config && SITE_DATA.config.githubToken) || "";
  }

  btnSaveSettings.addEventListener("click", () => {
    const workerVal = cfgWorkerInput.value.trim();
    const tokenVal = cfgTokenInput.value.trim();

    if (workerVal) localStorage.setItem("mca_worker_url", workerVal);
    else localStorage.removeItem("mca_worker_url");

    if (tokenVal) localStorage.setItem("mca_github_token", tokenVal);
    else localStorage.removeItem("mca_github_token");

    settingsFeedback.style.display = "inline";
    setTimeout(() => { settingsFeedback.style.display = "none"; }, 2500);
  });

  // -------------------------------------------------------------------
  // Automated PR Submission Handler
  // -------------------------------------------------------------------
  const formsWrapper = document.getElementById("contrib-forms-wrapper");
  const tabsNav = document.getElementById("contrib-tabs");
  const progressView = document.getElementById("contrib-progress");
  const progressStep = document.getElementById("progress-step-text");
  const progressHeading = document.getElementById("progress-heading");
  const resultView = document.getElementById("contrib-result");

  function showProgress(stepText, heading = "Creating Pull Request...") {
    formsWrapper.style.display = "none";
    tabsNav.style.display = "none";
    resultView.style.display = "none";
    progressView.style.display = "flex";
    progressHeading.textContent = heading;
    progressStep.textContent = stepText;
  }

  function showResultSuccess(result, isDate = false) {
    progressView.style.display = "none";
    formsWrapper.style.display = "none";
    tabsNav.style.display = "none";
    resultView.style.display = "flex";

    const prNumber = result.pr_number ? `#${result.pr_number}` : "New PR";
    const prUrl = result.pr_url || `https://github.com/diogocsilva12/mca-uminho/pulls`;

    resultView.innerHTML = `
      <div class="result-icon">🎉</div>
      <h3>Pull Request Created!</h3>
      <div class="result-pr-pill">${prNumber}</div>
      <p>
        ${isDate 
          ? "Your calendar event proposal was committed to branch <code>" + escapeHtml(result.branch) + "</code> and sent as a Pull Request."
          : "Your files were committed to branch <code>" + escapeHtml(result.branch) + "</code> and sent as a Pull Request."}
      </p>
      <p style="font-size:0.82rem; color:var(--ink-faint); margin-top:2px;">
        The repository maintainer (<strong>@diogocsilva12</strong>) has been notified to review and merge it into <code>main</code>.
      </p>
      <div class="result-actions">
        <a href="${prUrl}" target="_blank" rel="noopener" class="btn btn-primary">
          View Pull Request on GitHub ↗
        </a>
        <button type="button" id="btn-reset-modal" class="btn btn-secondary">
          Submit Another
        </button>
      </div>
    `;

    document.getElementById("btn-reset-modal").addEventListener("click", resetModalToForm);

    // Reset staged files and inputs
    stagedFiles = [];
    refreshStagedFilesUI();
    dateValInput.value = "";
    dateTitleInput.value = "";
    validateDateForm();
  }

  function showResultError(errorMsg, type) {
    progressView.style.display = "none";
    formsWrapper.style.display = "none";
    tabsNav.style.display = "none";
    resultView.style.display = "flex";

    const isNoBackend = errorMsg.includes("NO_BACKEND_CONFIGURED");

    resultView.innerHTML = `
      <div class="result-icon">${isNoBackend ? "⚙️" : "⚠️"}</div>
      <h3>${isNoBackend ? "Connection Setup Required" : "Submission Failed"}</h3>
      <p>
        ${isNoBackend 
          ? "To send automated Pull Requests directly from the site, the repository owner (<strong>@diogocsilva12</strong>) can deploy the Cloudflare Worker in <code>serverless/worker.js</code> (takes 1 minute, 100% free), or you can input a GitHub token in settings below."
          : escapeHtml(errorMsg)}
      </p>
      <div class="result-actions">
        <button type="button" id="btn-back-to-form" class="btn btn-secondary">
          Back to Form
        </button>
        <button type="button" id="btn-open-settings" class="btn btn-secondary">
          Configure Settings
        </button>
        <a href="https://github.com/diogocsilva12/mca-uminho/issues/new?template=${type === 'date' ? 'propose_date.yml' : 'submit_material.yml'}" target="_blank" rel="noopener" class="btn btn-primary">
          Submit via GitHub Issue ↗
        </a>
      </div>
    `;

    document.getElementById("btn-back-to-form").addEventListener("click", resetModalToForm);
    document.getElementById("btn-open-settings").addEventListener("click", () => {
      resetModalToForm();
      const details = document.getElementById("api-settings-details");
      if (details) details.open = true;
    });
  }

  function resetModalToForm() {
    progressView.style.display = "none";
    resultView.style.display = "none";
    formsWrapper.style.display = "block";
    tabsNav.style.display = "flex";
  }

  // File submit button click
  submitFilesBtn.addEventListener("click", async () => {
    if (stagedFiles.length === 0) return;

    const year = document.getElementById("contrib-year").value;
    const sem = document.getElementById("contrib-sem").value;
    const uc = document.getElementById("contrib-uc").value;
    const cat = document.getElementById("contrib-cat").value;
    const author = document.getElementById("contrib-author").value.trim();

    showProgress("Reading and encoding files...", "Uploading Files & Creating PR...");

    try {
      const filePayloads = [];
      for (let i = 0; i < stagedFiles.length; i++) {
        const item = stagedFiles[i];
        progressStep.textContent = `Reading ${item.name} (${i + 1}/${stagedFiles.length})...`;
        const base64Content = await readFileAsBase64(item.file);
        filePayloads.push({
          name: item.name,
          content: base64Content,
        });
      }

      progressStep.textContent = "Connecting to GitHub & creating Pull Request...";

      const result = await dispatchSubmissionPR({
        type: "files",
        year: year,
        semester: sem,
        course: uc,
        category: cat,
        author: author,
        files: filePayloads,
      }, (stepMsg) => {
        progressStep.textContent = stepMsg;
      });

      showResultSuccess(result, false);
    } catch (err) {
      showResultError(err.message, "file");
    }
  });

  // Date submit button click
  submitDateBtn.addEventListener("click", async () => {
    const dateVal = dateValInput.value.trim();
    const titleVal = dateTitleInput.value.trim();
    const typeVal = dateTypeSelect.value;
    const authorVal = document.getElementById("contrib-date-author").value.trim();

    if (!dateVal || !titleVal) return;

    showProgress("Connecting to GitHub...", "Proposing Calendar Date...");

    try {
      const result = await dispatchSubmissionPR({
        type: "date",
        date: dateVal,
        title: titleVal,
        typeVal: typeVal,
        author: authorVal,
      }, (stepMsg) => {
        progressStep.textContent = stepMsg;
      });

      showResultSuccess(result, true);
    } catch (err) {
      showResultError(err.message, "date");
    }
  });

  // Global triggers for any [data-open-contribute] button in page or header
  document.querySelectorAll("[data-open-contribute]").forEach((btn) => {
    btn.addEventListener("click", () => {
      openContributeModalWithPrefill({
        tab: btn.getAttribute("data-open-contribute"),
        year: btn.getAttribute("data-prefill-year"),
        sem: btn.getAttribute("data-prefill-sem"),
        uc: btn.getAttribute("data-prefill-uc"),
      });
    });
  });
}

// ---------------------------------------------------------------------
// Dispatch Submission Engine (Worker API or Direct GitHub Client API)
// ---------------------------------------------------------------------

async function dispatchSubmissionPR(payload, onStep) {
  const workerUrl = localStorage.getItem("mca_worker_url") || (SITE_DATA.config && SITE_DATA.config.submissionApiUrl) || "";
  const token = localStorage.getItem("mca_github_token") || (SITE_DATA.config && SITE_DATA.config.githubToken) || "";

  // 1. If Worker is configured, dispatch via Worker
  if (workerUrl && workerUrl.startsWith("http")) {
    if (onStep) onStep("Dispatching request to Cloudflare Worker proxy...");
    const endpoint = payload.type === "date" ? `${workerUrl.replace(/\/$/, "")}/submit-date` : `${workerUrl.replace(/\/$/, "")}/submit-files`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || `Server responded with HTTP ${res.status}`);
    }
    return data;
  }

  // 2. If Personal Access Token is configured, dispatch via GitHub REST API directly
  if (token) {
    return await dispatchDirectGitHubPR(payload, token, onStep);
  }

  // 3. Neither configured
  throw new Error("NO_BACKEND_CONFIGURED");
}

// Direct GitHub REST API executor (uses personal access token from localStorage)
async function dispatchDirectGitHubPR(payload, token, onStep) {
  const owner = (SITE_DATA.config && SITE_DATA.config.repoOwner) || "diogocsilva12";
  const repo = (SITE_DATA.config && SITE_DATA.config.repoName) || "mca-uminho";
  const baseBranch = (SITE_DATA.config && SITE_DATA.config.baseBranch) || "main";

  async function gh(endpoint, opts = {}) {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}${endpoint}`, {
      ...opts,
      headers: {
        Accept: "application/vnd.github.v3+json",
        Authorization: `Bearer ${token}`,
        ...(opts.headers || {}),
      },
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`GitHub API Error (${res.status}): ${err}`);
    }
    return await res.json();
  }

  if (onStep) onStep("Getting current repository head...");
  const baseRef = await gh(`/git/ref/heads/${baseBranch}`);
  const baseSha = baseRef.object.sha;

  const branchPrefix = payload.type === "date" ? "submission/date" : "submission/files";
  const branchName = `${branchPrefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  if (onStep) onStep(`Creating branch ${branchName}...`);
  await gh("/git/refs", {
    method: "POST",
    body: JSON.stringify({
      ref: `refs/heads/${branchName}`,
      sha: baseSha,
    }),
  });

  if (payload.type === "files") {
    const uploadedPaths = [];
    for (let i = 0; i < payload.files.length; i++) {
      const f = payload.files[i];
      const filePath = `files/${payload.year}/${payload.semester}/${payload.course}/${payload.category}/${f.name}`;
      if (onStep) onStep(`Committing ${f.name} (${i + 1}/${payload.files.length})...`);
      await gh(`/contents/${filePath}`, {
        method: "PUT",
        body: JSON.stringify({
          message: `Add ${f.name} to ${payload.course.toUpperCase()} (${payload.category})`,
          content: f.content,
          branch: branchName,
        }),
      });
      uploadedPaths.push(filePath);
    }

    if (onStep) onStep("Opening Pull Request on GitHub...");
    const prTitle = `[Material] New files for ${payload.course.toUpperCase()} (${payload.category})`;
    const prBody = `## Automated Material Contribution

- **Course**: ${payload.course.toUpperCase()}
- **Category**: ${payload.category}
- **Year / Semester**: ${payload.year} / ${payload.semester}
- **Author**: ${payload.author || "Anonymous Contributor"}

### Uploaded Files:
${uploadedPaths.map((p) => `- \`${p}\``).join("\n")}

### Checklist:
- [x] Placed in correct category folder
- [x] No student grades or personal data (GDPR compliant)
- [x] Awaiting review and approval by @${owner}
`;

    const pr = await gh("/pulls", {
      method: "POST",
      body: JSON.stringify({
        title: prTitle,
        head: branchName,
        base: baseBranch,
        body: prBody,
      }),
    });

    return {
      success: true,
      pr_url: pr.html_url,
      pr_number: pr.number,
      branch: branchName,
    };
  } else if (payload.type === "date") {
    if (onStep) onStep("Updating site-data.js on branch...");
    const siteDataFile = await gh(`/contents/assets/data/site-data.js?ref=${branchName}`);
    const currentJs = atob(siteDataFile.content);

    const dateEntry = `      { date: '${payload.date}', label: '${payload.title.replace(/'/g, "\\'")}', tag: '${payload.typeVal || "exams"}' },\n    ],`;
    let updatedJs = currentJs;
    if (currentJs.includes("    ],\n  },")) {
      updatedJs = currentJs.replace("    ],\n  },", dateEntry + "\n  },");
    }

    const updatedBase64 = btoa(unescape(encodeURIComponent(updatedJs)));

    await gh("/contents/assets/data/site-data.js", {
      method: "PUT",
      body: JSON.stringify({
        message: `Propose calendar date: ${payload.title} (${payload.date})`,
        content: updatedBase64,
        sha: siteDataFile.sha,
        branch: branchName,
      }),
    });

    if (onStep) onStep("Opening Pull Request on GitHub...");
    const prTitle = `[Date] ${payload.title} (${payload.date})`;
    const prBody = `## Automated Calendar Date Proposal

- **Date**: ${payload.date}
- **Title**: ${payload.title}
- **Type**: ${payload.typeVal || "exams"}
- **Author**: ${payload.author || "Anonymous Contributor"}

### Checklist:
- [x] Appended to \`assets/data/site-data.js\`
- [x] Awaiting review and approval by @${owner}
`;

    const pr = await gh("/pulls", {
      method: "POST",
      body: JSON.stringify({
        title: prTitle,
        head: branchName,
        base: baseBranch,
        body: prBody,
      }),
    });

    return {
      success: true,
      pr_url: pr.html_url,
      pr_number: pr.number,
      branch: branchName,
    };
  }
}

function openContributeModalWithPrefill(opts = {}) {
  const modal = document.getElementById("contribute-modal");
  if (!modal) return;
  modal.style.display = "flex";

  const targetTab = opts.tab || "file";
  if (targetTab === "date") {
    const tabDateBtn = document.getElementById("tab-btn-date");
    if (tabDateBtn) tabDateBtn.click();
  } else {
    const tabFileBtn = document.getElementById("tab-btn-file");
    if (tabFileBtn) tabFileBtn.click();

    const yearSelect = document.getElementById("contrib-year");
    const semSelect = document.getElementById("contrib-sem");
    const ucSelect = document.getElementById("contrib-uc");

    if (opts.year && yearSelect) {
      yearSelect.value = opts.year;
      yearSelect.dispatchEvent(new Event("change"));
    }

    if (opts.sem && semSelect) {
      semSelect.value = opts.sem;
      semSelect.dispatchEvent(new Event("change"));
    }

    if (opts.uc && ucSelect) {
      ucSelect.value = opts.uc;
      ucSelect.dispatchEvent(new Event("change"));
    }
  }
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
  initPreviewModal();
});
