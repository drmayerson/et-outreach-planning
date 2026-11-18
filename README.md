# Planningstool

Planning app for a two-person outreach and education team: shared projects with to-dos by category,
personal lists, a "this week" view and a home page with deadline warnings. The interface is in Dutch.

- **App:** <https://drmayerson.github.io/et-outreach-planning/>
- **Without setup** it runs in demo mode with sample data, stored only in your browser.
- **To work together**, connect a Google Sheet: see [SETUP.md](SETUP.md).

## How it is built

- Plain HTML, CSS and JavaScript modules, no build step; GitHub Pages serves the folder as is.
- Drag and drop: [SortableJS](https://github.com/SortableJS/Sortable) from cdnjs.
- Data: a Google Sheet behind a Google Apps Script web app ([`apps-script/Code.gs`](apps-script/Code.gs)),
  with Sign in with Google. Only addresses on the Sheet's `users` tab get in.

| File | What it does |
| --- | --- |
| `index.html`, `css/style.css` | Page shell and styles (light and dark) |
| `js/app.js` | Start-up, navigation, clicks, drag and drop |
| `js/views.js` | The pages: overview, project, this week, lists, archive, settings |
| `js/ui.js` | To-do cards, dialogs, toast |
| `js/store.js` | Data, saving, and the rules (what lands in "this week", warnings) |
| `js/auth.js` | Google sign-in |
| `js/demo.js` | Sample data for demo mode |
| `js/config.js` | Client ID and Apps Script URL (empty = demo mode) |

## Run locally

```bash
python -m http.server 8080
```

Then open <http://localhost:8080>.

## Version 1 scope

Projects, to-dos with categories, urgency, status ("wachten op"), deadlines, subtasks, links and notes;
personal lists with drag and drop; moving to-dos between lists and projects; "this week" (urgent items and
items due this week land there automatically, unfinished ones roll over); home page with overdue and
14-day warnings and unassigned to-dos; archive.

## Version 1.1

Sub-projects (one level; the parent shows its general to-dos and a count per sub-project); dates and locations
per project, shown in the trekker's week and on the home page; a material list per project
(nodig / besteld / klaar); a shared contact list linked to projects; a follow-up date for "wachten op";
a change history per to-do; copying a project as a template (dates, urgency and statuses cleared);
Excel export of projects, sub-projects, descriptions and dates. `?demo` forces demo mode.
The Apps Script now creates new data tabs by itself.
