/**
 * SITE CONTENT — edit this file to update what the site shows.
 * No build step: save and refresh the page (or push to GitHub).
 *
 * -----------------------------------------------------------------------
 * 1) FILES — grouped by year > semester > subject > file.
 * -----------------------------------------------------------------------
 * To add a file:
 *   - Drop the real file somewhere under the /files folder, e.g.
 *     files/1-ano/sistemas-arquiteturas/slides-01-intro.pdf
 *   - Add an entry pointing to that path, like the examples below.
 *
 * "type" should be the file extension shown in the little badge
 * (pdf, pptx, docx, zip, md, ipynb, ...). "size" is just a display
 * string — put whatever is accurate/helpful ("2.1 MB").
 *
 * NOTE: the entries below are SAMPLE placeholders using real subject
 * names from the MCA programme, so the layout can be previewed. Swap
 * the "files" arrays for the real materials, and delete this note.
 */

const SITE_DATA = {
  files: {
    years: {
      1: [
        {
          semester: '1st semester',
          subjects: [
            {
              name: 'Sistemas e Arquiteturas de Computadores',
              files: [
                { name: 'slides-01-introducao.pdf', type: 'pdf', size: '2.1 MB', url: 'files/1-ano/sistemas-arquiteturas/slides-01-introducao.pdf' },
                { name: 'exercicios-cache.pdf', type: 'pdf', size: '340 KB', url: 'files/1-ano/sistemas-arquiteturas/exercicios-cache.pdf' },
              ],
            },
            {
              name: 'Dados e Aprendizagem Automática',
              files: [
                { name: 'notas-aula-regressao.md', type: 'md', size: '14 KB', url: 'files/1-ano/aprendizagem-automatica/notas-aula-regressao.md' },
                { name: 'projeto-1-enunciado.pdf', type: 'pdf', size: '210 KB', url: 'files/1-ano/aprendizagem-automatica/projeto-1-enunciado.pdf' },
                { name: 'dataset-exemplo.csv', type: 'csv', size: '1.4 MB', url: 'files/1-ano/aprendizagem-automatica/dataset-exemplo.csv' },
              ],
            },
            {
              name: 'Segurança de Dados',
              files: [
                { name: 'slides-criptografia.pdf', type: 'pdf', size: '1.8 MB', url: 'files/1-ano/seguranca-dados/slides-criptografia.pdf' },
              ],
            },
          ],
        },
        {
          semester: '2nd semester',
          subjects: [
            {
              name: 'Aplicações e Serviços de Computação em Nuvem',
              files: [
                { name: 'lab-01-docker.pdf', type: 'pdf', size: '900 KB', url: 'files/1-ano/computacao-nuvem/lab-01-docker.pdf' },
              ],
            },
          ],
        },
      ],
      // 2nd year has no shared materials yet — shown as an empty state.
      2: [],
    },
  },

  /**
   * -----------------------------------------------------------------------
   * 2) CALENDAR — key academic dates + an optional embedded calendar.
   * -----------------------------------------------------------------------
   * "dates" is a flat list, sorted chronologically, shown as a simple list.
   * "tag" is a short mono label (e.g. "semester", "exams", "deadline").
   *
   * "embedUrl" — paste a public calendar embed URL here (for example an
   * "Embed this calendar" iframe URL from a public Google Calendar) once
   * one exists, and it will render automatically. Leave blank to show a
   * friendly placeholder instead of a broken embed.
   *
   * IMPORTANT: the dates below are illustrative placeholders (typical UMinho
   * master's rhythm), NOT confirmed official dates for this specific
   * edition of MCA. Replace with the dates from the official school
   * calendar before publishing.
   */
  calendar: {
    embedUrl: '',
    dates: [
      { date: '2026-09-14', label: 'Start of 1st semester classes', tag: 'semester' },
      { date: '2026-12-12', label: 'End of 1st semester classes', tag: 'semester' },
      { date: '2027-01-05', label: 'Exam period — época normal (1st sem.)', tag: 'exams' },
      { date: '2027-02-02', label: 'Start of 2nd semester classes', tag: 'semester' },
      { date: '2027-05-22', label: 'End of 2nd semester classes', tag: 'semester' },
      { date: '2027-06-05', label: 'Exam period — época normal (2nd sem.)', tag: 'exams' },
      { date: '2027-07-05', label: 'Exam period — época de recurso', tag: 'exams' },
    ],
  },

  /**
   * -----------------------------------------------------------------------
   * 3) SCHEDULE — the external timetable tool.
   * -----------------------------------------------------------------------
   */
  schedule: {
    toolUrl: 'https://mca.jalves.dev/calendar',
  },
};
