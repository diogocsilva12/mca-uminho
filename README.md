# MCA site

A small 3-page site for sharing MCA (Universidade do Minho) study materials,
academic calendar and class schedule with new students. Plain HTML/CSS/JS —
no build step, no dependencies to install.

```
index.html              Files page (home)
calendar.html            Academic calendar page
schedule.html            Class schedule page (embeds mca.jalves.dev/calendar)
assets/style.css         All styling
assets/main.js           All interactivity
assets/data/site-data.js Everything you'll actually want to edit
files/                   Put the real shared files here
```

## Editing content

Almost everything you'll want to change lives in **`assets/data/site-data.js`**.
It's a plain JavaScript object with comments explaining each part:

- **`files.years[1]` / `files.years[2]`** — the file listing, grouped by
  semester → subject → file. Right now year 1 is filled with **sample
  placeholder entries** (real subject names, fake files) so you can see the
  layout. Replace them with your real materials:
  1. Copy the real files into `files/`, e.g. `files/1-ano/subject-name/slides.pdf`.
  2. Point each entry's `url` at that path.
  3. Delete the sample-data note at the top of the file once it's real.

  Year 2 is intentionally empty — it shows a "nothing shared yet" message
  until someone adds materials.

- **`calendar.dates`** — the key-dates list on the Calendar page. The dates
  currently there are **illustrative placeholders**, not confirmed official
  dates — swap them for the real ones from the school's official calendar
  before sharing this with anyone.

- **`calendar.embedUrl`** — if you have (or set up) a public calendar you
  want embedded next to the dates list (e.g. a Google Calendar "Secret
  address in iCal format" / embed URL), paste it here. Leave it blank and
  the page shows a clean placeholder instead of a broken embed.

- **`schedule.toolUrl`** — the class-schedule tool. Already set to
  `https://mca.jalves.dev/calendar`.

No other file needs to change for normal content updates.

## Adding real files

Put files anywhere under `files/` (subfolders are fine — they're only for
your own organisation, the site doesn't care about the folder structure,
only about the `url` you put in `site-data.js`). GitHub Pages will serve
them as static downloads automatically.

If any files are large (tens of MB+), consider whether GitHub is the right
place for them — a normal GitHub repository has soft size limits, and huge
binary files make cloning slow for everyone. For a handful of PDFs and
slide decks this is a non-issue.

## Deploying to GitHub Pages

1. Create a new GitHub repository (public, since GitHub Pages on the free
   tier serves public repos) and push this folder's contents to it.
2. In the repo, go to **Settings → Pages**.
3. Under "Build and deployment", set **Source** to "Deploy from a branch",
   pick the `main` branch and the `/ (root)` folder, then save.
4. GitHub gives you a URL like `https://<username>.github.io/<repo>/` a
   minute or two later.

If you'd rather use a custom domain, add a `CNAME` file with the domain
name at the repo root and configure the DNS record GitHub asks for.

## Notes / things left for you to finish

- Real files still need to replace the sample entries described above.
- Real academic dates still need to replace the placeholder ones.
- No calendar embed source is configured yet (`embedUrl` is blank).
- The embedded schedule tool (an `<iframe>` on the Schedule page) may or
  may not render depending on that site's framing policy — the page always
  shows an "Open the schedule tool" button above it either way, so it works
  regardless.
- Everything is in English. If you'd rather it be in Portuguese (or both),
  the copy is plain text spread across the three `.html` files — happy to
  produce a translated version if useful.
