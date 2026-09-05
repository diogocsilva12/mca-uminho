# MCA Portal — Automated Submissions Worker

This serverless worker allows any student or visitor to submit study materials and propose calendar dates directly from the web interface without touching GitHub or creating accounts.

When a submission is made, the worker securely creates a new branch on `diogocsilva12/mca-uminho`, commits the files, and opens a Pull Request awaiting review and approval from **@diogocsilva12**.

---

## 1-Minute Free Deployment Guide (Cloudflare Workers)

Cloudflare Workers provides **100,000 requests/day for free**, which is more than enough for student contributions.

### Step 1: Create a Worker
1. Log in to your [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Navigate to **Workers & Pages** -> **Create application** -> **Create Worker**.
3. Name it (e.g., `mca-portal-submissions`) and click **Deploy**.

### Step 2: Paste the Code
1. On your worker page, click **Edit code**.
2. Replace everything in the code editor with the contents of `worker.js`.
3. Click **Deploy**.

### Step 3: Add your GitHub Token Secret
1. Go to your Worker's **Settings** tab -> **Variables and Secrets**.
2. Click **Add** under *Secrets*:
   - **Variable name**: `GITHUB_TOKEN`
   - **Value**: A GitHub Personal Access Token (PAT).
     - *Recommended*: Fine-grained token scoped to repository `diogocsilva12/mca-uminho` with:
       - **Contents**: Read and write
       - **Pull requests**: Read and write
3. Click **Save and deploy**.

### Step 4: Link to Website
1. Copy your worker's public URL (e.g. `https://mca-portal-submissions.<your-name>.workers.dev`).
2. Open `assets/data/site-data.js` and set:
   ```javascript
   config: {
     repoOwner: 'diogocsilva12',
     repoName: 'mca-uminho',
     baseBranch: 'main',
     submissionApiUrl: 'https://mca-portal-submissions.<your-name>.workers.dev',
   }
   ```
3. Commit and push. Automated submissions are now live!
