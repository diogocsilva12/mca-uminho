/**
 * MCA UMinho — Automated Pull Request Serverless Worker (Cloudflare Workers)
 * 
 * Free serverless microservice that accepts file uploads and calendar date proposals
 * directly from the website and automatically opens Pull Requests on GitHub.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Log in to Cloudflare Dashboard (https://dash.cloudflare.com) -> Workers & Pages.
 * 2. Click "Create Application" -> "Create Worker".
 * 3. Replace the default code with the contents of this file and click "Deploy".
 * 4. Go to Worker Settings -> Variables -> Add Secret:
 *    - Variable name: GITHUB_TOKEN
 *    - Value: A GitHub Personal Access Token (classic with 'repo' scope, or fine-grained
 *             with 'Contents: Read & Write' and 'Pull requests: Read & Write'
 *             on diogocsilva12/mca-uminho).
 * 5. Copy your Worker URL (e.g. https://mca-submissions.<your-subdomain>.workers.dev).
 * 6. Set `submissionApiUrl: 'https://mca-submissions.<your-subdomain>.workers.dev'`
 *    in `assets/data/site-data.js` and push to main.
 */

const REPO_OWNER = "diogocsilva12";
const REPO_NAME = "mca-uminho";
const BASE_BRANCH = "main";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
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
          service: "MCA UMinho Automated Contribution Worker",
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

    const token = env.GITHUB_TOKEN;
    if (!token) {
      return new Response(
        JSON.stringify({
          error: "Worker GITHUB_TOKEN secret is not configured in Cloudflare environment variables.",
        }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(request.url);

    try {
      const data = await request.json();

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
// Handler: File Uploads -> Automated PR
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

  // 1. Get latest commit SHA on main
  const baseSha = await getMainSha(token);

  // 2. Upload each file as a Git Blob
  const treeEntries = [];
  const uploadedFilePaths = [];

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
    uploadedFilePaths.push(filePath);
  }

  // 3. Create Git Tree
  const treeSha = await createTree(baseSha, treeEntries, token);

  // 4. Create Commit
  const commitMessage = `[Material] Add files for ${cleanCourse.toUpperCase()} (${cleanCat})`;
  const commitSha = await createCommit(commitMessage, treeSha, [baseSha], token);

  // 5. Create Branch pointing to the new commit
  await createBranch(branchName, commitSha, token);

  // 6. Create Pull Request
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

// ---------------------------------------------------------------------
// Handler: Calendar Date -> Automated PR
// ---------------------------------------------------------------------

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

  // 1. Fetch current assets/data/site-data.js from main
  const fileData = await getFileContent("assets/data/site-data.js", BASE_BRANCH, token);
  const currentJs = atob(fileData.content.replace(/\s/g, ""));

  // 2. Parse SITE_DATA JSON safely
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

  // 3. Add proposed date and sort chronologically
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

  // 4. Create Git Blob for updated site-data.js
  const base64Content = btoa(unescape(encodeURIComponent(updatedContent)));
  const blobSha = await createBlob(base64Content, token);

  // 5. Create Git Tree & Commit
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

  // 6. Create Branch
  await createBranch(branchName, commitSha, token);

  // 7. Create Pull Request
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

async function getFileContent(path, ref, token) {
  return await ghFetch(`/contents/${path}?ref=${ref}`, {}, token);
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
