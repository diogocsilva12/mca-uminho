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

## How it Works

```
Student on Site (Drag & drop files or date)
               ↓
POST /submit-files or /submit-date
               ↓
Cloudflare Worker (using your secret token)
               ↓
1. Creates branch `contribute/files-...`
2. Pushes files to `files/1-ano/1-semestre/<course>/<category>/...`
3. Updates `assets/data/site-data.js`
4. Opens Pull Request assigned to @diogocsilva12
               ↓
Diogo reviews and clicks "Merge pull request"
```
