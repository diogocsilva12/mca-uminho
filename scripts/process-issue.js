const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const FILES_DIR = path.join(REPO_ROOT, 'files');
const SITE_DATA_PATH = path.join(REPO_ROOT, 'assets', 'data', 'site-data.js');

// Download file using curl -L (follows redirects, handles CDN and SSL)
function downloadFile(url, destPath) {
  const dir = path.dirname(destPath);
  fs.mkdirSync(dir, { recursive: true });
  console.log(`Downloading: ${url} -> ${path.relative(REPO_ROOT, destPath)}`);
  execSync(`curl -sL -A "Mozilla/5.0" "${url}" -o "${destPath}"`, { stdio: 'inherit' });
  if (!fs.existsSync(destPath) || fs.statSync(destPath).size === 0) {
    throw new Error(`Downloaded file is empty or missing: ${destPath}`);
  }
}

// Parse GitHub Issue markdown form sections
function parseIssueSections(body) {
  const sections = {};
  if (!body) return sections;
  const parts = body.split(/^###\s+/m);
  for (const part of parts) {
    if (!part.trim()) continue;
    const lines = part.trim().split(/\r?\n/);
    const heading = lines[0].trim();
    const content = lines.slice(1).join('\n').trim();
    sections[heading] = content;
    sections[heading.toLowerCase()] = content;
  }
  return sections;
}

// Extract [filename](url) links from markdown
function extractAttachments(markdown) {
  const attachments = [];
  if (!markdown) return attachments;

  // 1. Match markdown links: [name.ext](url) or ![name.ext](url)
  const mdRegex = /!?\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g;
  let match;
  while ((match = mdRegex.exec(markdown)) !== null) {
    const name = match[1].trim();
    const url = match[2].trim();
    if (name.includes('.') || url.includes('user-attachments') || url.includes('/files/')) {
      attachments.push({ name, url });
    }
  }

  // 2. Match raw URLs in case markdown brackets were omitted
  if (attachments.length === 0) {
    const rawUrlRegex = /(https?:\/\/(?:github\.com\/(?:[^\/\s]+\/[^\/\s]+\/files\/|user-attachments\/(?:files|assets)\/)[^\s\)]+))/g;
    let m;
    let count = 0;
    while ((m = rawUrlRegex.exec(markdown)) !== null) {
      count++;
      const u = m[1];
      const urlFileName = path.basename(new URL(u).pathname);
      attachments.push({
        name: urlFileName.includes('.') ? urlFileName : `attachment_${count}.pdf`,
        url: u,
      });
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

  console.log(`Processing issue #${issueNumber}: "${issueTitle}"`);

  const sections = parseIssueSections(issueBody);
  const labels = (issue.labels || []).map((l) => (typeof l === 'string' ? l : l.name));

  const isMaterial = labels.includes('materials') || issueTitle.toLowerCase().includes('[material]');
  const isDate = labels.includes('calendar') || issueTitle.toLowerCase().includes('[date]');

  let prTitle = '';
  let prBody = '';
  let branchName = '';
  let hasChanges = false;

  if (isMaterial) {
    // 1. Study Material Submission
    const rawYear = sections['academic year'] || sections['Academic Year'] || '';
    const rawSem = sections['semester'] || sections['Semester'] || '';
    const rawCourse = sections['course unit'] || sections['Course Unit'] || '';
    const rawCategory = sections['material category'] || sections['Material Category'] || '';
    const rawDescription = sections['material description / upload attachment'] || sections['Material Description / Upload Attachment'] || issueBody;

    const yearFolder = rawYear.includes('2') ? '2-ano' : '1-ano';
    const semFolder = rawSem.includes('2') ? '2-semestre' : '1-semestre';
    const courseFolder = normalizeCourse(rawCourse);
    const categoryFolder = normalizeCategory(rawCategory);

    const targetDir = path.join(FILES_DIR, yearFolder, semFolder, courseFolder, categoryFolder);
    fs.mkdirSync(targetDir, { recursive: true });

    const attachments = extractAttachments(rawDescription);
    console.log(`Found ${attachments.length} attachment(s) in issue description.`);

    if (attachments.length === 0) {
      console.error('No files found to download from issue description.');
      process.exit(0);
    }

    const downloadedFiles = [];
    for (const att of attachments) {
      let filename = path.basename(att.name).replace(/[^a-zA-Z0-9._-]/g, '_');
      if (!filename || filename === '.') filename = 'material.pdf';

      const dest = path.join(targetDir, filename);
      try {
        downloadFile(att.url, dest);
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
${downloadedFiles.map((f) => `- \`${f}\``).join('\n')}

Closes #${issueNumber}
`;

  } else if (isDate) {
    // 2. Calendar Date Proposal
    const dateVal = (sections['event date (yyyy-mm-dd)'] || sections['Event Date (YYYY-MM-DD)'] || '').trim();
    const titleVal = (sections['event description'] || sections['Event Description'] || '').trim();
    const rawType = sections['event type'] || sections['Event Type'] || '';

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

    // Safely parse existing site-data.js as object
    const rawSiteData = fs.readFileSync(SITE_DATA_PATH, 'utf8');
    eval(rawSiteData.replace('const SITE_DATA =', 'global.EXISTING_DATA ='));
    const data = global.EXISTING_DATA;

    if (!data || !data.calendar || !Array.isArray(data.calendar.dates)) {
      console.error('Invalid site-data.js format.');
      process.exit(1);
    }

    // Add new date and sort chronologically
    data.calendar.dates.push({
      date: dateVal,
      label: titleVal,
      tag: tag,
    });
    data.calendar.dates.sort((a, b) => (a.date < b.date ? -1 : 1));

    const updatedContent = `/**
 * SITE CONTENT — Master in Advanced Computing (MCA) - UMinho
 * Automatically synced study materials, academic calendar, and class schedule.
 */

const SITE_DATA = ${JSON.stringify(data, null, 2)};
`;

    fs.writeFileSync(SITE_DATA_PATH, updatedContent, 'utf8');
    hasChanges = true;

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

    const delimiter = `DELIMITER_${Date.now()}`;
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `pr_body<<${delimiter}\n${prBody}\n${delimiter}\n`);
    console.log(`Outputs set successfully for branch: ${branchName}`);
  }
}

main().catch((err) => {
  console.error('Fatal error in process-issue.js:', err);
  process.exit(1);
});
