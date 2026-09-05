const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const SITE_DATA_PATH = path.join(REPO_ROOT, 'assets', 'data', 'site-data.js');
const FILES_DIR = path.join(REPO_ROOT, 'files');

// Helper to format file sizes
function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getExt(filename) {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : 'file';
}

function getCategory(relPath) {
  const lower = relPath.toLowerCase();
  if (lower.includes('teorica') || lower.includes('slide')) return 'Lectures';
  if (lower.includes('pratica') || lower.includes('lab') || lower.includes('guide') || lower.includes('guiao')) return 'Labs';
  if (lower.includes('trabalho') || lower.includes('assignment') || lower.includes('project')) return 'Assignments';
  if (lower.includes('exame') || lower.includes('teste') || lower.includes('exam')) return 'Exams';
  if (lower.includes('book') || lower.includes('livro')) return 'Books & References';
  if (lower.includes('bvp') || lower.includes('dae')) return 'BVP / DAE';
  return 'General';
}

const CATEGORY_ORDER = {
  'Lectures': 1,
  'Labs': 2,
  'Assignments': 3,
  'Exams': 4,
  'Books & References': 5,
  'BVP / DAE': 6,
  'General': 7,
};

const CURRICULUM = {
  1: {
    '1-semestre': {
      title: '1st Semester',
      courses: [
        { code: 'AAC', dir: 'aac', name: 'Advanced Computer Architectures', desc: 'High-performance computing, vectorization, VTune profiling, SYCL, and GPU acceleration.' },
        { code: 'CPAR', dir: 'cpar', name: 'Parallel Computing', desc: 'Shared and distributed memory parallelism, OpenMP, MPI, GPUs, and memory hierarchy optimization.' },
        { code: 'FCED', dir: 'fced', name: 'High-Performance Computing Tools', desc: 'Linux HPC environments, interconnection networks, file systems, and cluster automation.' },
        { code: 'SAC', dir: 'sac', name: 'Computer Systems & Architectures', desc: 'Option I (alternative to DCCT). Computer organization, memory hierarchy, superscalar execution, and performance measurement with PAPI.' },
        { code: 'DCCT', dir: 'dcct', name: 'Data Classification & Clustering', desc: 'Option I (alternative to SAC). Supervised & unsupervised learning, classification algorithms, cluster analysis.' },
        { code: 'SNE', dir: 'sne', name: 'Numerical Simulation in Engineering', desc: 'Numerical discretization, initial (IVP) and boundary value problems (BVP), DAEs, and finite volumes.' },
        { code: 'VC', dir: 'vc', name: 'Scientific Visualization', desc: 'Scientific data visualization, isosurfaces, direct volume rendering, and analysis with ParaView.' },
      ]
    },
    '2-semestre': {
      title: '2nd Semester',
      courses: [
        { code: 'ADED', dir: 'aded', name: 'High-Performance Data Analysis', desc: 'Large-scale distributed processing with Apache Spark, distributed machine learning, and stream processing.' },
        { code: 'AP', dir: 'ap', name: 'Parallel Algorithms', desc: 'Parallel algorithms for molecular dynamics, matrix multiplication, stencils, graphs, and lock-free algorithms.' },
        { code: 'CHLE', dir: 'chle', name: 'Large-Scale Hybrid Computing', desc: 'Advanced MPI programming, one-sided communication, parallel I/O, scheduling, and supercomputer profiling.' },
        { code: 'PCED', dir: 'pced', name: 'Project in High Performance Computing', desc: 'Development of a research paper and integrative practical project in advanced computing.' },
        { code: 'SADE', dir: 'sade', name: 'Efficient Storage Systems', desc: 'Distributed file systems, storage benchmarking, I/O optimization, and efficient data persistence.' },
      ]
    }
  },
  2: {
    '1-semestre': {
      title: '1st Semester (Specialization & Options)',
      courses: [
        { code: 'NIC', dir: 'nic', name: 'Nature Inspired Computation', desc: 'Option II/III. Bio-inspired algorithms, evolutionary computation, genetic algorithms, swarm intelligence, and optimization.' },
        { code: 'DS', dir: 'ds', name: 'Data Security', desc: 'Option II/III. Cryptographic protocols, privacy-preserving computing, homomorphic encryption, and secure enclave execution.' },
        { code: 'CCAS', dir: 'ccas', name: 'Cloud Computing Applications & Services', desc: 'Option II/III. Cloud-native architectures, container orchestration, microservices, and serverless computing.' },
        { code: 'HPHCI', dir: 'hphci', name: 'High Performance Hybrid Computing Infrastructures', desc: 'Option II/III. Modern hybrid HPC clusters, heterogeneous accelerators (GPUs, TPUs, FPGAs), and interconnects.' },
        { code: 'ODAC', dir: 'odac', name: 'Orchestration of Distributed Advanced Computing', desc: 'Option II/III. Workload orchestration, Kubernetes on HPC, Slurm integration, and distributed workflow automation.' },
        { code: 'BSB', dir: 'bsb', name: 'Bioinformatics & Systems Biology', desc: 'Option IV. Computational genomics, high-throughput biological data analysis, and scalable algorithms in bioinformatics.' },
        { code: 'CR', dir: 'cr', name: 'Computational Rheology', desc: 'Option IV. Complex fluid modeling, non-Newtonian flow simulation, numerical solvers, and high-performance CFD.' },
        { code: 'DML', dir: 'dml', name: 'Data and Machine Learning', desc: 'Option IV. Scalable machine learning pipelines, deep learning optimization, distributed training, and neural networks.' },
        { code: 'DISS', dir: 'diss', name: 'Dissertation / Project / Internship (Part I)', desc: 'Research project definition, literature review, methodology planning, and initial experimental work.' },
      ]
    },
    '2-semestre': {
      title: '2nd Semester (Dissertation Defense)',
      courses: [
        { code: 'DISS', dir: 'diss', name: 'Dissertation / Project / Internship (Part II)', desc: 'Full development, experimental benchmarking, dissertation writing, and final thesis defense.' },
      ]
    }
  }
};

function scanCourseFiles(courseDirRel) {
  const fullPath = path.join(FILES_DIR, courseDirRel);
  if (!fs.existsSync(fullPath)) return [];

  const results = [];

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue; // ignore .gitkeep, .DS_Store
      const entryPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(entryPath);
      } else if (entry.isFile()) {
        const relToRepo = path.relative(REPO_ROOT, entryPath).replace(/\\/g, '/');
        const relToCourse = path.relative(fullPath, entryPath).replace(/\\/g, '/');
        const stat = fs.statSync(entryPath);
        const ext = getExt(entry.name);
        const category = getCategory(relToCourse);
        results.push({
          name: entry.name,
          type: ext,
          size: formatSize(stat.size),
          url: relToRepo,
          category: category,
        });
      }
    }
  }

  walk(fullPath);

  results.sort((a, b) => {
    const pA = CATEGORY_ORDER[a.category] || 99;
    const pB = CATEGORY_ORDER[b.category] || 99;
    if (pA !== pB) return pA - pB;
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
  });

  return results;
}

function generateSiteData() {
  const existingCode = fs.readFileSync(SITE_DATA_PATH, 'utf8');
  let calendarBlock = null;
  let scheduleBlock = null;
  let configBlock = null;

  try {
    eval(existingCode.replace('const SITE_DATA =', 'global.EXISTING_SITE_DATA ='));
    calendarBlock = global.EXISTING_SITE_DATA.calendar;
    scheduleBlock = global.EXISTING_SITE_DATA.schedule;
    configBlock = global.EXISTING_SITE_DATA.config;
  } catch (e) {
    console.warn('Could not parse existing calendar/schedule, will fallback.', e);
  }

  const yearsData = {};

  for (const yearNum of [1, 2]) {
    yearsData[yearNum] = [];
    const yearDef = CURRICULUM[yearNum];
    for (const [semFolder, semInfo] of Object.entries(yearDef)) {
      const subjects = [];
      for (const course of semInfo.courses) {
        const courseRelPath = `${yearNum}-ano/${semFolder}/${course.dir}`;
        const files = scanCourseFiles(courseRelPath);
        subjects.push({
          code: course.code,
          name: course.name,
          description: course.desc,
          files: files,
        });
      }
      yearsData[yearNum].push({
        semester: semInfo.title,
        subjects: subjects,
      });
    }
  }

  const outputObject = {
    files: {
      years: yearsData,
    },
    calendar: calendarBlock || {
      author: { name: 'João Alves', github: 'https://github.com/joaoalves03', toolUrl: 'https://mca.jalves.dev/calendar' },
      embedUrl: 'https://mca.jalves.dev/calendar',
      dates: [],
    },
    schedule: scheduleBlock || {
      toolUrl: 'https://mca.jalves.dev/calendar',
      author: { name: 'João Alves', github: 'https://github.com/joaoalves03' },
    },
    config: configBlock || {
      repoOwner: 'diogocsilva12',
      repoName: 'mca-uminho',
      baseBranch: 'main',
    },
  };

  const fileContent = `/**
 * SITE CONTENT — Master in Advanced Computing (MCA) - UMinho
 * Automatically synced study materials, academic calendar, and class schedule.
 */

const SITE_DATA = ${JSON.stringify(outputObject, null, 2)};
`;

  fs.writeFileSync(SITE_DATA_PATH, fileContent, 'utf8');
  console.log('Successfully synced assets/data/site-data.js with files on disk!');
}

generateSiteData();
