# Automated PR Serverless Worker Setup

This microservice enables visitors and students on the **MCA UMinho Portal** to upload files and propose calendar dates directly from the web interface without touching GitHub. The microservice creates a new branch, commits the files to the designated folder, updates `site-data.js`, and opens a Pull Request assigned to `@diogocsilva12`.

---

## ⚡ 1-Minute Cloudflare Worker Deployment (100% Free)

1. Go to the [Cloudflare Dashboard](https://dash.cloudflare.com/) and navigate to **Workers & Pages**.
2. Click **Create application** &rarr; **Create Worker**.
3. Name your worker (e.g. `mca-contributions`) and click **Deploy**.
4. Click **Edit code**:
   - Delete the starter code.
   - Copy & paste the entire contents of [`serverless/worker.js`](./worker.js).
   - Click **Deploy**.
5. Configure your GitHub Token:
   - Go to Worker **Settings** &rarr; **Variables and Secrets**.
   - Under **Secrets**, click **Add secret**.
   - **Variable name**: `GITHUB_TOKEN`
   - **Value**: A GitHub Personal Access Token (PAT) with `repo` permissions (or fine-grained with *Contents: Read & Write* and *Pull requests: Read & Write* on `diogocsilva12/mca-uminho`).
   - Click **Deploy / Save**.
6. Copy your Worker URL (e.g., `https://mca-contributions.<your-subdomain>.workers.dev`).
7. In `assets/data/site-data.js`, set `submissionApiUrl`:
   ```javascript
   config: {
     repoOwner: 'diogocsilva12',
     repoName: 'mca-uminho',
     baseBranch: 'main',
     submissionApiUrl: 'https://mca-contributions.<your-subdomain>.workers.dev'
   }
   ```
8. Commit and push to `main`. Done!

---

## 🔒 Admin Dashboard Access (`admin.html`)

For maintainer management (uploading files directly to `main`, deleting files, editing calendar dates):

1. Access `admin.html` (e.g. `https://diogocsilva12.github.io/mca-uminho/admin.html` or local).
2. Enter your password:
   - **By default**: Use the exact same `GITHUB_TOKEN` you generated.
   - **(Optional) Custom password**: In Cloudflare Worker **Settings** &rarr; **Variables and Secrets**, add a secret named `ADMIN_PASSWORD` with any password you want (e.g. `mySecretPass123`) and click **Deploy**.
3. In the Admin Dashboard:
   - **File Manager**: Select course and category, drag and drop files/folders directly to `main`, or click `🗑️ Delete` next to any file.
   - **Calendar Manager**: Edit exam dates, event titles, and categories inline, delete passed events, add new ones, and click `💾 Save All Calendar Changes to Main`.
   - All admin changes commit directly to `main` without waiting for pull requests.

---

## How it Works

```
Public Students & Visitors                    Diogo (@diogocsilva12)
           ↓                                            ↓
Drags file or proposes date                  Logs into admin.html
           ↓                                            ↓
POST /submit-files or /submit-date           POST /admin/upload-files
           ↓                                 POST /admin/delete-file
Cloudflare Worker (mca-contributions)        POST /admin/save-calendar
           ↓                                            ↓
Opens Pull Request on GitHub                 Commits directly to `main`!
           ↓                                            ↓
Diogo reviews and merges                     Website updates immediately!
```

