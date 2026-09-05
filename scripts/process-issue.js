const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const REPO_ROOT = path.resolve(__dirname, '..');
const FILES_DIR = path.join(REPO_ROOT, 'files');
const SITE_DATA_PATH = path.join(REPO_ROOT, 'assets', 'data', 'site-data.js');

// Download a file following redirects
function downloadFile(url, destPath, token) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'MCA-Issue-To-PR-Bot',
      }
    };
    if (token) {
      options.headers['Authorization'] = `token ${token}`;
    }

    const client = url.startsWith('https') ? https : http;

    client.get(url, options, (res) => {
      // Handle redirect
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, destPath, token).then(resolve).catch(reject);
      }

      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download ${url}: HTTP ${res.statusCode}`));
      }

      const dir = path.dirname(destPath);
      fs.makedirsSync ? fs.makedirsSync(dir, { recursive: true }) : fs.mkdirSync(dir, { recursive: true });

      const fileStream = fs.createWriteStream(destPath);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });
      fileStream.on('error', (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
    }).on('error', reject);
  });
}

// Parse GitHub Issue markdown form sections
function parseIssueSections(body) {
  const sections = {};
  if (!body) return sections;
  const regex = /###\s+([^\r\n]+)\r?\n\r?\n([\s\S]*?)(?=(?:\r?\n###\s+|$))/g;
  let match;
  while ((match = regex.exec(body)) !== null) {
    const heading = match[1].trim();
    const content = match[2].trim();
    sections[heading] = content;
  }
  return sections;
}

// Extract [filename](url) links from markdown
function extractAttachments(markdown) {
  const attachments = [];
  if (!markdown) return attachments;

  // Regex to match markdown links: [name.ext](url)
  const mdRegex = /!?\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g;
  let match;
  while ((match = mdRegex.exec(markdown)) !== null) {
    const name = match[1].trim();
    const url = match[2].trim();
    // Only capture file attachments (contains dot in name or github assets URL)
    if (name.includes('.') || url.includes('user-attachments') || url.includes('/files/')) {
      attachments.push({ name, url });
    }
  }

  return attachments;
}

const COURSE_MAP = {
  'aac': 'aac',
  'cpar': 'cpar',
  'fced': 'fced',
  'sac': 'sac',
  'dcct': 'dcct',
  'sne': 'sne',
  'vc': 'vc',
  'aded': 'aded',
  'ap': 'ap',
  'chle': 'chle',
  'pced': 'pced',
  'sade': 'sade',
  'nic': 'nic',
  'ds': 'ds',
  'ccas': 'ccas',
  'hphci': 'hphci',
  'odac': 'odac',
  'bsb': 'bsb',
  'cr': 'cr',
  'dml': 'dml',
  'diss': 'diss',
};

function normalizeCourse(raw) {
  if (!raw) return 'aac';
  const lower = raw.toLowerCase();
  for (const [key, code] of Object.entries(COURSE_MAP)) {
    if (lower.includes(key)) return code;
  }
  return 'aac';
}

function normalizeCategory(raw) {
  if (!raw) return 'teoricas';
  const lower = raw.toLowerCase();
  if (lower.includes('lecion') || lower.includes('teoric') || lower.includes('lecture') || lower.includes('slide')) return 'teoricas';
  if (lower.includes('pratic') || lower.includes('lab') || lower.includes('guide') || lower.includes('guiao')) return 'praticas';
  if (lower.includes('trabalho') || lower.includes('assign') || lower.includes('project')) return 'trabalho';
  if (lower.includes('exame') || lower.includes('teste') || lower.includes('exam')) return 'exames';
  if (lower.includes('book') || lower.includes('livro')) return 'books';
  return 'teoricas';
}

async function main() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath || !fs.existsSync(eventPath)) {
    console.error('No GITHUB_EVENT_PATH found.');
    process.exit(1);
  }

  const eventData = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
  const issue = eventData.issue;
  if (!issue) {
    console.error('No issue object found in event data.');
    process.exit(1);
  }

  const issueNumber = issue.number;
  const issueTitle = issue.title || '';
  const issueBody = issue.body || '';
  const token = process.env.GITHUB_TOKEN;

  console.log(`Processing issue #${issueNumber}: "${issueTitle}"`);

  const sections = parseIssueSections(issueBody);
  const labels = (issue.labels || []).map(l => (typeof l === 'string' ? l : l.name));

  const isMaterial = labels.includes('materials') || issueTitle.toLowerCase().includes('[material]');
  const isDate = labels.includes('calendar') || issueTitle.toLowerCase().includes('[date]');

  let prTitle = '';
  let prBody = '';
  let branchName = '';
  let hasChanges = false;

  if (isMaterial) {
    // 1. Study Material Submission
    const rawYear = sections['Academic Year'] || '';
    const rawSem = sections['Semester'] || '';
    const rawCourse = sections['Course Unit'] || '';
    const rawCategory = sections['Material Category'] || '';
    const rawDescription = sections['Material Description / Upload Attachment'] || issueBody;

    const yearFolder = rawYear.includes('2') ? '2-ano' : '1-ano';
    const semFolder = rawSem.includes('2') ? '2-semestre' : '1-semestre';
    const courseFolder = normalizeCourse(rawCourse);
    const categoryFolder = normalizeCategory(rawCategory);

    const targetDir = path.join(FILES_DIR, yearFolder, semFolder, courseFolder, categoryFolder);
    fs.mkdirSync(targetDir, { recursive: true });

    const attachments = extractAttachments(rawDescription);
    console.log(`Found ${attachments.length} attachment(s) in issue description.`);

    if (attachments.length === 0) {
      console.log('No attachments found in issue. Checking for raw URLs...');
      const urlRegex = /(https?:\/\/(?:github\.com\/(?:[^\/]+\/[^\/]+\/files\/|user-attachments\/assets\/)[^\s\)]+))/g;
      let m;
      let urlCount = 0;
      while ((m = urlRegex.exec(rawDescription)) !== null) {
        urlCount++;
        attachments.push({
          name: `material_attachment_${urlCount}.pdf`,
          url: m[1]
        });
      }
    }

    if (attachments.length === 0) {
      console.error('No files found to download from issue description.');
      process.exit(0); // Exit cleanly without failing the action
    }

    const downloadedFiles = [];
    for (const att of attachments) {
      // Clean and sanitize filename
      let filename = path.basename(att.name).replace(/[^a-zA-Z0-9._-]/g, '_');
      if (!filename || filename === '.') filename = 'material.pdf';

      const dest = path.join(targetDir, filename);
      console.log(`Downloading ${att.url} -> ${path.relative(REPO_ROOT, dest)}`);
      try {
        await downloadFile(att.url, dest, token);
        downloadedFiles.push(path.relative(REPO_ROOT, dest));
        hasChanges = true;
      } catch (err) {
        console.error(`Error downloading ${att.name}:`, err);
      }
    }

    if (!hasChanges) {
      console.error('Failed to download any attachments.');
      process.exit(0);
    }

    // Run auto-sync to update site-data.js
    console.log('Running scripts/sync-site-data.js...');
    require('./sync-site-data.js');

    branchName = `contribute/material-issue-${issueNumber}`;
    prTitle = `[Material] Add files for ${courseFolder.toUpperCase()} (${categoryFolder})`;
    prBody = `## Automated Material Contribution from Issue #${issueNumber}

- **Course**: \`${courseFolder.toUpperCase()}\`
- **Year / Semester**: \`${yearFolder} / ${semFolder}\`
- **Category**: \`${categoryFolder}\`
- **Submitted by**: @${issue.user ? issue.user.login : 'contributor'}
- **Source Issue**: #${issueNumber}

### Uploaded Files:
${downloadedFiles.map(f => `- \`${f}\``).join('\n')}

Closes #${issueNumber}
`;

  } else if (isDate) {
    // 2. Calendar Date Proposal
    const dateVal = sections['Event Date (YYYY-MM-DD)'] || '';
    const titleVal = sections['Event Description'] || '';
    const rawType = sections['Event Type'] || '';

    let tag = 'exams';
    const lowerType = rawType.toLowerCase();
    if (lowerType.includes('present') || lowerType.includes('defense')) tag = 'presentation';
    else if (lowerType.includes('deadline') || lowerType.includes('assign')) tag = 'deadline';
    else if (lowerType.includes('semest') || lowerType.includes('milestone')) tag = 'semester';

    if (!dateVal || !titleVal) {
      console.error('Date or Title missing from issue.');
      process.exit(0);
    }

    console.log(`Adding calendar date: ${dateVal} - ${titleVal} [${tag}]`);

    const rawSiteData = fs.readFileSync(SITE_DATA_PATH, 'utf8');
    const newEntry = `      { date: '${dateVal}', label: '${titleVal.replace(/'/g, "\\'")}', tag: '${tag}' },\n    ],`;
    let updatedSiteData = rawSiteData;

    if (rawSiteData.includes('    ],\n  },')) {
      updatedSiteData = rawSiteData.replace('    ],\n  },', newEntry + '\n  },');
      fs.writeFileSync(SITE_DATA_PATH, updatedSiteData, 'utf8');
      hasChanges = true;
    } else {
      console.error('Could not find insertion point for calendar date in site-data.js');
      process.exit(0);
    }

    branchName = `contribute/date-issue-${issueNumber}`;
    prTitle = `[Date] ${titleVal} (${dateVal})`;
    prBody = `## Automated Calendar Date Proposal from Issue #${issueNumber}

- **Date**: \`${dateVal}\`
- **Description**: ${titleVal}
- **Type**: \`${tag}\`
- **Submitted by**: @${issue.user ? issue.user.login : 'contributor'}
- **Source Issue**: #${issueNumber}

Closes #${issueNumber}
`;
  } else {
    console.log('Issue is neither study material nor date proposal. Skipping.');
    process.exit(0);
  }

  // Set GitHub Action step outputs
  if (hasChanges && process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `has_changes=true\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `branch_name=${branchName}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `pr_title=${prTitle.replace(/\n/g, ' ')}\n`);

    // Write multiline PR body to output
    const delimiter = `DELIMITER_${Date.now()}`;
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `pr_body<<${delimiter}\n${prBody}\n${delimiter}\n`);
    console.log(`Outputs set successfully for branch: ${branchName}`);
  }
}

main().catch((err) => {
  console.error('Fatal error in process-issue.js:', err);
  process.exit(1);
});
