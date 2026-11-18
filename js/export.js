// Excel export of projects and sub-projects (descriptions, trekkers, dates). SheetJS loads only when needed.
import * as S from './store.js';
import { todayISO } from './util.js';
import { eventDateText } from './ui.js';

const XLSX_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
let loading = null;

function loadXlsx() {
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = XLSX_URL;
    s.onload = () => resolve(window.XLSX);
    s.onerror = () => {
      loading = null;
      reject(new Error('De Excel-bibliotheek kon niet geladen worden.'));
    };
    document.head.appendChild(s);
  });
  return loading;
}

const names = (emails) => emails.map(S.userName).join(', ');

export async function exportProjects(includeArchived) {
  const XLSX = await loadXlsx();
  const keep = (p) => includeArchived || S.isProjectActive(p);
  const tops = S.state.projects.filter((p) => !p.parentId).sort((a, b) => a.title.localeCompare(b.title, 'nl'));
  const ordered = [];
  for (const p of tops) {
    if (keep(p)) ordered.push(p);
    for (const s of S.subProjects(p.id)) if (keep(s)) ordered.push(s);
  }

  const projectRows = ordered.map((p) => {
    const parent = S.parentOf(p);
    const todos = S.state.todos.filter((t) => t.projectId === p.id && !t.archived);
    return {
      Project: parent ? parent.title : p.title,
      Subproject: parent ? p.title : '',
      Beschrijving: p.description,
      'Trekker(s)': names(p.trekkers),
      'Data en locaties': p.events
        .map((ev) => [eventDateText(ev), ev.label, ev.location].filter(Boolean).join(' · '))
        .join('\n'),
      'Open to-dos': todos.filter((t) => t.status !== 'done').length,
      'Afgewerkte to-dos': todos.filter((t) => t.status === 'done').length,
      Gearchiveerd: S.isProjectActive(p) ? '' : 'ja',
    };
  });

  const eventRows = [];
  for (const p of ordered) {
    const parent = S.parentOf(p);
    for (const ev of p.events) {
      eventRows.push({
        Datum: ev.date,
        Tot: ev.endDate || '',
        Activiteit: ev.label,
        Locatie: ev.location,
        Project: parent ? parent.title : p.title,
        Subproject: parent ? p.title : '',
        'Trekker(s)': names(p.trekkers),
      });
    }
  }
  eventRows.sort((a, b) => a.Datum.localeCompare(b.Datum));

  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.json_to_sheet(projectRows);
  ws1['!cols'] = [{ wch: 30 }, { wch: 28 }, { wch: 50 }, { wch: 22 }, { wch: 50 }, { wch: 11 }, { wch: 15 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Projecten');
  const ws2 = XLSX.utils.json_to_sheet(eventRows.length ? eventRows : [{ Datum: '', Tot: '', Activiteit: '', Locatie: '', Project: '', Subproject: '', 'Trekker(s)': '' }]);
  ws2['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 30 }, { wch: 28 }, { wch: 30 }, { wch: 28 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Data');
  XLSX.writeFile(wb, `planning-projecten-${todayISO()}.xlsx`);
  return projectRows.length;
}
