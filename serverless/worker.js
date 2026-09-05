/**
 * MCA UMinho — Automated Pull Request & Admin Management Worker (Cloudflare Workers)
 * 
 * Free serverless microservice supporting:
 * 1. Public Visitor Contributions: Accepts file uploads and calendar date proposals,
 *    automatically creating branches and opening Pull Requests for review.
 * 2. Admin Management (Diogo): Allows authenticated admin to upload files directly to main,
 *    delete files from main, and edit/delete/reorder calendar dates in site-data.js directly.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Cloudflare Dashboard -> Workers & Pages -> mca-contributions.
 * 2. Edit Code -> Paste this file -> Deploy.
 * 3. Settings -> Variables and Secrets -> GITHUB_TOKEN (your Personal Access Token).
 * 4. (Optional) Settings -> Variables and Secrets -> ADMIN_PASSWORD (custom password for admin.html).
 *    If ADMIN_PASSWORD is not set, your GITHUB_TOKEN serves as the admin password!
 */

const REPO_OWNER = "diogocsilva12";
const REPO_NAME = "mca-uminho";
const BASE_BRANCH = "main";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Key",
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (request.method === "GET") {
      return new Response(
        JSON.stringify({
          status: "online",
          service: "MCA UMinho Automated Contribution & Admin Worker",
          repo: `${REPO_OWNER}/${REPO_NAME}`,
        }),
        {
          status: 200,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Robust token lookup (supports exact, trimmed, case-insensitive, or global bindings)
    let token = null;
    if (env && typeof env === "object") {
      if (env.GITHUB_TOKEN) token = env.GITHUB_TOKEN;
      if (!token) {
        for (const [k, v] of Object.entries(env)) {
          const normalized = k.trim().toLowerCase().replace(/[-_]/g, "");
          if (normalized === "githubtoken" || normalized === "githubpat" || normalized === "ghp") {
            token = v;
            break;
          }
        }
      }
    }
    if (!token && typeof GITHUB_TOKEN !== "undefined") {
      token = GITHUB_TOKEN;
    }

    if (!token) {
      const boundKeys = env && typeof env === "object" ? Object.keys(env) : [];
      const keysInfo = boundKeys.length ? `[${boundKeys.map((k) => `"${k}"`).join(", ")}]` : "(none detected)";
      return new Response(
        JSON.stringify({
          error: `Worker GITHUB_TOKEN secret is not detected. Bound environment keys: ${keysInfo}. Please check that the secret is named GITHUB_TOKEN and that you clicked "Deploy" after adding it in Cloudflare Settings -> Variables.`,
        }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(request.url);

    try {
      const data = await request.json().catch(() => ({}));

      // Admin Routes
      if (url.pathname.endsWith("/admin/verify")) {
        return handleAdminVerify(request, env, token);
      }
      if (url.pathname.endsWith("/admin/upload-files")) {
        return await handleAdminUploadFiles(request, env, token, data);
      }
      if (url.pathname.endsWith("/admin/delete-file")) {
        return await handleAdminDeleteFile(request, env, token, data);
      }
      if (url.pathname.endsWith("/admin/save-calendar")) {
        return await handleAdminSaveCalendar(request, env, token, data);
      }

      // Public Visitor Routes (Creates PR)
      if (url.pathname.endsWith("/submit-date")) {
        return await handleDateSubmission(data, token);
      } else {
        return await handleFileSubmission(data, token);
      }
    } catch (err) {
      return new Response(
        JSON.stringify({ error: err.message || "Internal server error" }),
        {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }
  },
};

// ---------------------------------------------------------------------
// Admin Authentication Helper
// ---------------------------------------------------------------------

function isAuthorizedAdmin(request, env, token) {
  const authHeader = request.headers.get("Authorization") || "";
  let key = "";
  if (authHeader.startsWith("Bearer ")) {
    key = authHeader.substring(7).trim();
  } else {
    key = request.headers.get("X-Admin-Key") || "";
  }

  if (!key) return false;

  // 1. Matches custom ADMIN_PASSWORD in Cloudflare
  if (env && env.ADMIN_PASSWORD && key === env.ADMIN_PASSWORD) return true;

  // 2. Matches the GITHUB_TOKEN itself
  if (key === token) return true;

  return false;
}

function handleAdminVerify(request, env, token) {
  if (!isAuthorizedAdmin(request, env, token)) {
    return new Response(JSON.stringify({ error: "Invalid admin password or token." }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ success: true, user: REPO_OWNER }), {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------
// Admin Actions: Commit directly to main
// ---------------------------------------------------------------------

async function handleAdminUploadFiles(request, env, token, data) {
  if (!isAuthorizedAdmin(request, env, token)) {
    return new Response(JSON.stringify({ error: "Unauthorized." }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const { year, semester, course, category, files } = data;
  if (!files || !files.length) {
    return new Response(JSON.stringify({ error: "No files provided." }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const cleanYear = year === "2-ano" ? "2-ano" : "1-ano";
  const cleanSem = semester === "2-semestre" ? "2-semestre" : "1-semestre";
  const cleanCourse = (course || "aac").toLowerCase().replace(/[^a-z0-9_-]/g, "");
  const cleanCat = (category || "teoricas").toLowerCase().replace(/[^a-z0-9_-]/g, "");

  const baseSha = await getMainSha(token);
  const treeEntries = [];
  const uploaded = [];

  for (const f of files) {
    let cleanName = (f.name || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `files/${cleanYear}/${cleanSem}/${cleanCourse}/${cleanCat}/${cleanName}`;

    const blobSha = await createBlob(f.content, token); // content is base64
    treeEntries.push({
      path: filePath,
      mode: "100644",
      type: "blob",
      sha: blobSha,
    });
    uploaded.push(filePath);
  }

  const treeSha = await createTree(baseSha, treeEntries, token);
  const commitMsg = `[Admin] Upload ${uploaded.length} file(s) to ${cleanCourse.toUpperCase()} (${cleanCat})`;
  const commitSha = await createCommit(commitMsg, treeSha, [baseSha], token);

  // Directly update main reference
  await updateBranchRef(BASE_BRANCH, commitSha, token);

  return new Response(
    JSON.stringify({
      success: true,
      commit_sha: commitSha,
      files: uploaded,
    }),
    { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
  );
}

async function handleAdminDeleteFile(request, env, token, data) {
  if (!isAuthorizedAdmin(request, env, token)) {
    return new Response(JSON.stringify({ error: "Unauthorized." }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const { path: filePath } = data;
  if (!filePath) {
    return new Response(JSON.stringify({ error: "File path is required." }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Get current file sha on main
  const fileData = await getFileContent(filePath, BASE_BRANCH, token);
  if (!fileData || !fileData.sha) {
    return new Response(JSON.stringify({ error: `File not found on ${BASE_BRANCH}: ${filePath}` }), {
      status: 404,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const commitMsg = `[Admin] Delete ${filePath}`;
  await deleteFile(filePath, fileData.sha, commitMsg, token);

  return new Response(
    JSON.stringify({
      success: true,
      deleted: filePath,
    }),
    { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
  );
}

async function handleAdminSaveCalendar(request, env, token, data) {
  if (!isAuthorizedAdmin(request, env, token)) {
    return new Response(JSON.stringify({ error: "Unauthorized." }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const { dates } = data;
  if (!Array.isArray(dates)) {
    return new Response(JSON.stringify({ error: "Invalid dates array." }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Fetch current site-data.js from main
  const fileData = await getFileContent("assets/data/site-data.js", BASE_BRANCH, token);
  const currentJs = atob(fileData.content.replace(/\s/g, ""));

  let siteDataObject;
  try {
    const jsonStr = currentJs.replace(/^[\s\S]*?const\s+SITE_DATA\s*=\s*/, "").replace(/;\s*$/, "");
    siteDataObject = JSON.parse(jsonStr);
  } catch (err) {
    return new Response(JSON.stringify({ error: "Failed to parse site-data.js" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  siteDataObject.calendar = siteDataObject.calendar || {};
  siteDataObject.calendar.dates = dates;
  siteDataObject.calendar.dates.sort((a, b) => (a.date < b.date ? -1 : 1));

  const updatedContent = `/**
 * SITE CONTENT — Master in Advanced Computing (MCA) - UMinho
 * Automatically synced study materials, academic calendar, and class schedule.
 */

const SITE_DATA = ${JSON.stringify(siteDataObject, null, 2)};
`;

  const base64Content = btoa(unescape(encodeURIComponent(updatedContent)));
  const commitMsg = `[Admin] Update academic calendar dates (${dates.length} events)`;

  await updateFile(
    "assets/data/site-data.js",
    base64Content,
    fileData.sha,
    commitMsg,
    token
  );

  return new Response(
    JSON.stringify({
      success: true,
      count: dates.length,
    }),
    { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
  );
}

// ---------------------------------------------------------------------
// Visitor Public Handlers (Creates Pull Request)
// ---------------------------------------------------------------------

async function handleFileSubmission(data, token) {
  const { year, semester, course, category, author, notes, files } = data;

  if (!files || !files.length) {
    return new Response(JSON.stringify({ error: "No files provided." }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Validate GDPR: Reject student grade sheets or exam score rankings
  for (const f of files) {
    const lower = (f.name || "").toLowerCase();
    if (lower.includes("pauta") || lower.includes("grade") || lower.includes("classificac")) {
      return new Response(
        JSON.stringify({
          error: `File "${f.name}" cannot be accepted. Uploading student grades or personal information is strictly prohibited (GDPR).`,
        }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }
  }

  const cleanYear = year === "2-ano" ? "2-ano" : "1-ano";
  const cleanSem = semester === "2-semestre" ? "2-semestre" : "1-semestre";
  const cleanCourse = (course || "aac").toLowerCase().replace(/[^a-z0-9_-]/g, "");
  const cleanCat = (category || "teoricas").toLowerCase().replace(/[^a-z0-9_-]/g, "");

  const branchName = `contribute/files-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const baseSha = await getMainSha(token);
  const treeEntries = [];
  const uploadedFilePaths = [];

  for (const f of files) {
    let cleanName = (f.name || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `files/${cleanYear}/${cleanSem}/${cleanCourse}/${cleanCat}/${cleanName}`;

    const blobSha = await createBlob(f.content, token);
    treeEntries.push({
      path: filePath,
      mode: "100644",
      type: "blob",
      sha: blobSha,
    });
    uploadedFilePaths.push(filePath);
  }

  const treeSha = await createTree(baseSha, treeEntries, token);
  const commitMessage = `[Material] Add files for ${cleanCourse.toUpperCase()} (${cleanCat})`;
  const commitSha = await createCommit(commitMessage, treeSha, [baseSha], token);

  await createBranch(branchName, commitSha, token);

  const prTitle = `[Material] Add files for ${cleanCourse.toUpperCase()} (${cleanCat})`;
  const prBody = `## Automated Study Material Contribution

- **Course**: \`${cleanCourse.toUpperCase()}\`
- **Curricular Year**: \`${cleanYear}\`
- **Semester**: \`${cleanSem}\`
- **Category**: \`${cleanCat}\`
- **Contributor**: ${author ? `@${author}` : "Anonymous Student"}
- **Notes**: ${notes || "Submitted via web portal"}

### Uploaded Files:
${uploadedFilePaths.map((p) => `- \`${p}\``).join("\n")}

### Security & Verification:
- [x] Files placed in \`${cleanYear}/${cleanSem}/${cleanCourse}/${cleanCat}/\`
- [x] GDPR validation passed (no student grade sheets)
- [x] Awaiting review and approval by @${REPO_OWNER}
`;

  const pr = await createPullRequest(prTitle, branchName, prBody, token);

  return new Response(
    JSON.stringify({
      success: true,
      pr_url: pr.html_url,
      pr_number: pr.number,
      branch: branchName,
      files_count: uploadedFilePaths.length,
    }),
    { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
  );
}

async function handleDateSubmission(data, token) {
  const { date, title, type, author, notes } = data;

  if (!date || !title) {
    return new Response(JSON.stringify({ error: "Date and title are required." }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const branchName = `contribute/date-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const baseSha = await getMainSha(token);

  const fileData = await getFileContent("assets/data/site-data.js", BASE_BRANCH, token);
  const currentJs = atob(fileData.content.replace(/\s/g, ""));

  let siteDataObject;
  try {
    const jsonStr = currentJs.replace(/^[\s\S]*?const\s+SITE_DATA\s*=\s*/, "").replace(/;\s*$/, "");
    siteDataObject = JSON.parse(jsonStr);
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Failed to parse site-data.js on main branch." }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  if (!siteDataObject.calendar || !Array.isArray(siteDataObject.calendar.dates)) {
    siteDataObject.calendar = siteDataObject.calendar || {};
    siteDataObject.calendar.dates = [];
  }

  siteDataObject.calendar.dates.push({
    date: date.trim(),
    label: title.trim(),
    tag: type || "exams",
  });
  siteDataObject.calendar.dates.sort((a, b) => (a.date < b.date ? -1 : 1));

  const updatedContent = `/**
 * SITE CONTENT — Master in Advanced Computing (MCA) - UMinho
 * Automatically synced study materials, academic calendar, and class schedule.
 */

const SITE_DATA = ${JSON.stringify(siteDataObject, null, 2)};
`;

  const base64Content = btoa(unescape(encodeURIComponent(updatedContent)));
  const blobSha = await createBlob(base64Content, token);

  const treeSha = await createTree(baseSha, [
    {
      path: "assets/data/site-data.js",
      mode: "100644",
      type: "blob",
      sha: blobSha,
    },
  ], token);

  const commitMessage = `[Date] ${title} (${date})`;
  const commitSha = await createCommit(commitMessage, treeSha, [baseSha], token);

  await createBranch(branchName, commitSha, token);

  const prTitle = `[Date] ${title} (${date})`;
  const prBody = `## Automated Academic Calendar Proposal

- **Event Date**: \`${date}\`
- **Event Title**: ${title}
- **Event Type**: \`${type || "exams"}\`
- **Contributor**: ${author ? `@${author}` : "Anonymous Student"}
- **Source / Notes**: ${notes || "None provided"}

### Changes:
- Appended to academic calendar in \`assets/data/site-data.js\` (sorted chronologically).
- Awaiting review and merge by @${REPO_OWNER}.
`;

  const pr = await createPullRequest(prTitle, branchName, prBody, token);

  return new Response(
    JSON.stringify({
      success: true,
      pr_url: pr.html_url,
      pr_number: pr.number,
      branch: branchName,
    }),
    { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
  );
}

// ---------------------------------------------------------------------
// GitHub Git Database API Helpers
// ---------------------------------------------------------------------

async function ghFetch(endpoint, options = {}, token) {
  const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}${endpoint}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github.v3+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "MCA-Portal-Worker",
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`GitHub API error (${res.status}): ${errText}`);
  }

  return await res.json();
}

async function getMainSha(token) {
  const ref = await ghFetch(`/git/ref/heads/${BASE_BRANCH}`, {}, token);
  return ref.object.sha;
}

async function createBlob(base64Content, token) {
  const data = await ghFetch(
    "/git/blobs",
    {
      method: "POST",
      body: JSON.stringify({
        content: base64Content,
        encoding: "base64",
      }),
    },
    token
  );
  return data.sha;
}

async function createTree(baseSha, treeEntries, token) {
  const data = await ghFetch(
    "/git/trees",
    {
      method: "POST",
      body: JSON.stringify({
        base_tree: baseSha,
        tree: treeEntries,
      }),
    },
    token
  );
  return data.sha;
}

async function createCommit(message, treeSha, parents, token) {
  const data = await ghFetch(
    "/git/commits",
    {
      method: "POST",
      body: JSON.stringify({
        message: message,
        tree: treeSha,
        parents: parents,
      }),
    },
    token
  );
  return data.sha;
}

async function createBranch(branchName, sha, token) {
  return await ghFetch(
    "/git/refs",
    {
      method: "POST",
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: sha,
      }),
    },
    token
  );
}

async function updateBranchRef(branchName, sha, token) {
  return await ghFetch(
    `/git/refs/heads/${branchName}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        sha: sha,
        force: false,
      }),
    },
    token
  );
}

async function getFileContent(path, ref, token) {
  return await ghFetch(`/contents/${path}?ref=${ref}`, {}, token);
}

async function updateFile(path, base64Content, sha, message, token) {
  return await ghFetch(
    `/contents/${path}`,
    {
      method: "PUT",
      body: JSON.stringify({
        message: message,
        content: base64Content,
        sha: sha,
        branch: BASE_BRANCH,
      }),
    },
    token
  );
}

async function deleteFile(path, sha, message, token) {
  return await ghFetch(
    `/contents/${path}`,
    {
      method: "DELETE",
      body: JSON.stringify({
        message: message,
        sha: sha,
        branch: BASE_BRANCH,
      }),
    },
    token
  );
}

async function createPullRequest(title, branch, body, token) {
  return await ghFetch(
    "/pulls",
    {
      method: "POST",
      body: JSON.stringify({
        title: title,
        head: branch,
        base: BASE_BRANCH,
        body: body,
      }),
    },
    token
  );
}
