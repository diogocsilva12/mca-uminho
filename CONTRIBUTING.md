# Contribution Guidelines — MCA UMinho

To ensure that the repository remains reliable, well-organized, and compliant with student privacy, the following contribution rules apply:

## Repository Rules

1. **No direct commits to `main` branch**:
   - The `main` branch is protected. All new content, fixes, and additions must be submitted from a separate branch (e.g., `feature/new-material`, `update/exam-dates`).

2. **Mandatory Pull Requests**:
   - Create a feature branch branching off `main`, add your changes, and open a **Pull Request (PR)**.
   - PRs automatically trigger CI workflows to validate file paths, syntax, and verify the absence of confidential data.

3. **Review and Approval Required**:
   - All Pull Requests require **at least 1 approving review** from the administrator and Code Owner (**@diogocsilva12**) before they can be merged into `main`.

4. **Privacy & Data Protection (GDPR)**:
   - Strictly no individual student grades, pautas, student numbers/names, or private evaluation results may be uploaded.
   - Only general course materials are allowed: assignment briefs, exam problem sets, lecture slides, lab guides, and public study notes.

5. **Directory Organization**:
   - Files must be placed strictly within the proper directory hierarchy:
     `files/<year>/<semester>/<subject-code>/<category>/`
     (Categories: `teoricas/`, `praticas/`, `trabalho/`, `exames/`, `books/`).
   - Register new files in `assets/data/site-data.js` so they display on the website.
