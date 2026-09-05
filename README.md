# MCA Portal

Static website for sharing study materials, academic calendar, and class timetables for the **Master in Advanced Computing (MCA)** at **Universidade do Minho**. Plain HTML/CSS/JS — zero build step, zero dependencies.

```
index.html              Study materials page (live search + year and semester navigation)
calendar.html           Academic calendar page & schedule subscription guide
schedule.html           Class timetable page (external tool by João Alves)
assets/favicon.svg      Site icon (SVG)
assets/style.css        Shared stylesheet (light & dark mode support)
assets/main.js          Interactivity, live search, and dynamic rendering
assets/data/site-data.js Database of files, course units, and calendar dates
files/                  Organized repository of study materials
```

## Repository File Structure (`files/`)

All study materials are categorized by curricular year and semester:

```
files/
├── 1-ano/
│   ├── 1-semestre/
│   │   ├── aac/   — Advanced Computer Architectures
│   │   ├── cpar/  — Parallel Computing
│   │   ├── fced/  — High-Performance Computing Tools
│   │   ├── sac/   — Computer Systems and Architectures (Option I)
│   │   ├── dcct/  — Data Classification and Clustering Techniques (Option I)
│   │   ├── sne/   — Numerical Simulation in Engineering
│   │   └── vc/    — Scientific Visualization
│   └── 2-semestre/
│       ├── aded/  — High-Performance Data Analysis
│       ├── ap/    — Parallel Algorithms
│       ├── chle/  — Large-Scale Hybrid Computing
│       ├── pced/  — Project in High Performance Computing
│       └── sade/  — Efficient Storage Systems
└── 2-ano/
    ├── 1-semestre/
    │   ├── nic/   — Nature Inspired Computation (Option II/III)
    │   ├── ds/    — Data Security (Option II/III)
    │   ├── ccas/  — Cloud Computing Applications and Services (Option II/III)
    │   ├── hphci/ — High Performance Hybrid Computing Infrastructures (Option II/III)
    │   ├── odac/  — Orchestration of Distributed Advanced Computing (Option II/III)
    │   ├── bsb/   — Bioinformatics and Systems Biology (Option IV)
    │   ├── cr/    — Computational Rheology (Option IV)
    │   ├── dml/   — Data and Machine Learning (Option IV)
    │   └── diss/  — Dissertation / Project / Internship (Part I)
    └── 2-semestre/
        └── diss/  — Dissertation / Project / Internship (Part II)
```

Inside each course unit, files are organized into `teoricas/` (lectures), `praticas/` (labs), `trabalho/` (assignments), `exames/` (exams), and `books/`.

## Class Timetable Tool & Credits

Special thanks and recognition to **João Alves** for creating and maintaining the MCA schedule and calendar subscription tool:
- Tool: [mca.jalves.dev/calendar](https://mca.jalves.dev/calendar)
- GitHub: [github.com/joaoalves03](https://github.com/joaoalves03)

## Contributing

Direct commits to `main` are restricted. All additions and changes must be submitted via a **Pull Request** and require code owner review (@diogocsilva12).
See [CONTRIBUTING.md](CONTRIBUTING.md) for full guidelines and privacy (GDPR) requirements.

## Deployment to GitHub Pages

1. In the repository, go to **Settings → Pages**.
2. Under "Build and deployment", set **Source** to "Deploy from a branch".
3. Select branch `main` and folder `/ (root)`, then click **Save**.
4. GitHub Pages serves the site at `https://<username>.github.io/<repo>/`.
