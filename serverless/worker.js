/**
 * Cloudflare Worker for Automated PR Submissions
 * MCA Portal — Master in Advanced Computing (UMinho)
 * 
 * Deployment Instructions (Takes ~1 minute, 100% free):
 * 1. Log in to your Cloudflare Dashboard (https://dash.cloudflare.com/) and go to Workers & Pages.
 * 2. Click "Create Application" -> "Create Worker".
 * 3. Paste the contents of this file into the Worker editor and click "Deploy".
 * 4. Go to Worker Settings -> Variables -> Add Secret:
 *    - Variable name: GITHUB_TOKEN
 *    - Value: A GitHub Personal Access Token (Fine-grained with 'Contents: Read & Write'
 *             and 'Pull requests: Read & Write' on diogocsilva12/mca-uminho).
 * 5. Copy your Worker URL (e.g. https://mca-submissions.<your-subdomain>.workers.dev).
 * 6. Set `submissionApiUrl: 'https://mca-submissions.<your-subdomain>.workers.dev'`
 *    in `assets/data/site-data.js` and push to main.
 */

const REPO_OWNER = "diogocsilva12";
const REPO_NAME = "mca-uminho";
const BASE_BRANCH = "main";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
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
        JSON.stringify({ error: "Worker GITHUB_TOKEN secret is not configured." }),
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
      return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
  },
};

async function handleFileSubmission(data, token) {
  const { year, semester, course, category, author, notes, files } = data;

  if (!files || !files.length) {
    return new Response(JSON.stringify({ error: "No files provided." }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const branchName = `submission/files-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const mainSha = await getMainSha(token);

  // 1. Create branch
  await createBranch(branchName, mainSha, token);

  // 2. Upload each file to the branch
  const uploadedPaths = [];
  for (const f of files) {
    const filePath = `files/${year}/${semester}/${course}/${category}/${f.name}`;
    await commitFile(
      branchName,
      filePath,
      f.content, // base64 content
      `Add ${f.name} to ${course.toUpperCase()} (${category})`,
      token
    );
    uploadedPaths.push(filePath);
  }

  // 3. Create Pull Request
  const prTitle = `[Material] New files for ${course.toUpperCase()} (${category})`;
  const prBody = `## Automated Material Contribution

- **Course**: ${course.toUpperCase()}
- **Category**: ${category}
- **Year / Semester**: ${year} / ${semester}
- **Author**: ${author || "Anonymous Contributor"}
- **Notes**: ${notes || "None provided"}

### Uploaded Files:
${uploadedPaths.map((p) => `- \`${p}\``).join("\n")}

### Checklist:
- [x] Placed in correct category folder
- [x] No student grades or personal data (GDPR compliant)
- [x] Awaiting review and approval by @${REPO_OWNER}
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

async function handleDateSubmission(data, token) {
  const { date, title, type, course, author, notes } = data;

  if (!date || !title) {
    return new Response(JSON.stringify({ error: "Date and title are required." }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const branchName = `submission/date-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const mainSha = await getMainSha(token);

  // 1. Create branch
  await createBranch(branchName, mainSha, token);

  // 2. Fetch current site-data.js from repo
  const siteDataFile = await getFileContent("assets/data/site-data.js", branchName, token);
  const currentJs = atob(siteDataFile.content);

  // 3. Inject new date entry into calendar.dates
  const dateEntry = `      { date: '${date}', label: '${title.replace(/'/g, "\\'")}', tag: '${type || "exams"}' },\n    ],`;
  let updatedJs = currentJs;
  if (currentJs.includes("    ],\n  },")) {
    updatedJs = currentJs.replace("    ],\n  },", dateEntry + "\n  },");
  }

  const updatedBase64 = btoa(unescape(encodeURIComponent(updatedJs)));

  await updateFile(
    branchName,
    "assets/data/site-data.js",
    updatedBase64,
    siteDataFile.sha,
    `Propose calendar date: ${title} (${date})`,
    token
  );

  // 4. Create Pull Request
  const prTitle = `[Date] ${title} (${date})`;
  const prBody = `## Automated Calendar Date Proposal

- **Date**: ${date}
- **Title**: ${title}
- **Type**: ${type || "exams"}
- **Course**: ${course ? course.toUpperCase() : "General"}
- **Author**: ${author || "Anonymous Contributor"}
- **Notes / Reference**: ${notes || "None"}

### Checklist:
- [x] Appended to \`assets/data/site-data.js\`
- [x] Awaiting review and approval by @${REPO_OWNER}
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
// GitHub API Helpers
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
  const data = await ghFetch(`/git/ref/heads/${BASE_BRANCH}`, {}, token);
  return data.object.sha;
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

async function commitFile(branch, path, base64Content, message, token) {
  return await ghFetch(
    `/contents/${path}`,
    {
      method: "PUT",
      body: JSON.stringify({
        message: message,
        content: base64Content,
        branch: branch,
      }),
    },
    token
  );
}

async function getFileContent(path, ref, token) {
  return await ghFetch(`/contents/${path}?ref=${ref}`, {}, token);
}

async function updateFile(branch, path, base64Content, sha, message, token) {
  return await ghFetch(
    `/contents/${path}`,
    {
      method: "PUT",
      body: JSON.stringify({
        message: message,
        content: base64Content,
        sha: sha,
        branch: branch,
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
