// Shared UI pieces: icons, to-do cards, toast and the edit dialogs.
import * as S from './store.js';
import {
  esc, fmtDate, fmtDateTime, todayISO, mondayOf, uid, safeUrl, parseLinks, linksToText, linkLabel,
} from './util.js';

const ICONS = {
  check: '<path d="M5 12l5 5L20 7"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  calPlus: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M12 13v5M9.5 15.5h5"/>',
  next: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"/><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/>',
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  list: '<path d="M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  archive: '<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  subtasks: '<path d="M4 6h4M4 12h4M4 18h4M12 6h8M12 12h8M12 18h8"/>',
};
export const icon = (name, cls = '') =>
  `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;

export const URGENCY = { dringend: 'Dringend', semi: 'Semi-dringend', lang: 'Lange termijn' };
const STATUS = { open: 'Open', waiting: 'Wachten op …', done: 'Klaar' };

export const empty = (text) => `<p class="empty">${esc(text)}</p>`;

export const avatars = (emails) =>
  emails.length
    ? `<span class="avatars">${emails
        .map((e) => `<span class="avatar" title="${esc(S.userName(e))}">${esc(S.initials(e))}</span>`)
        .join('')}</span>`
    : '';

export function linkChips(links) {
  return (links || [])
    .map((l) => {
      const href = safeUrl(l.url);
      return href
        ? `<a class="chip" href="${esc(href)}" target="_blank" rel="noopener">${icon('link')}${esc(linkLabel(l))}</a>`
        : '';
    })
    .join('');
}

/**
 * One to-do row.
 * o.context: show project / list name · o.week: show "next week" and "out of week" buttons
 * o.claim: show "I'll do this" · o.noActions: only the checkbox
 */
export function todoCard(t, o = {}) {
  const today = todayISO();
  const done = t.status === 'done';
  const overdue = !done && t.dueDate && t.dueDate < today;
  const ro = !S.canEdit(t);
  const meta = [];
  if (o.context) {
    const c = S.contextLabel(t);
    if (c) meta.push(`<span class="badge ctx">${esc(c)}</span>`);
  }
  if (t.urgency && URGENCY[t.urgency]) meta.push(`<span class="badge u-${t.urgency}">${URGENCY[t.urgency]}</span>`);
  if (t.dueDate) {
    meta.push(`<span class="badge due ${overdue ? 'late' : ''}">${icon('calendar')}${overdue ? 'Te laat · ' : ''}${fmtDate(t.dueDate)}</span>`);
  }
  if (t.status === 'waiting') {
    meta.push(`<span class="badge wait">${icon('clock')}Wachten op${t.waitingFor ? ': ' + esc(t.waitingFor) : ''}</span>`);
  }
  if (t.subtasks.length) {
    const n = t.subtasks.filter((s) => s.done).length;
    meta.push(`<span class="badge plain">${icon('subtasks')}${n}/${t.subtasks.length}</span>`);
  }
  if (t.links.length) meta.push(`<span class="badge plain">${icon('link')}${t.links.length}</span>`);
  if (done && t.doneBy) {
    meta.push(`<span class="badge plain">${icon('check')}${esc(S.userName(t.doneBy))}, ${fmtDateTime(t.doneAt)}</span>`);
  }
  const who = t.listId ? '' : avatars(t.assignees);

  let actions = '';
  if (!ro && !done && !o.noActions) {
    if (o.week) {
      const st = S.weekStatus(t);
      actions += `<button class="iconbtn" data-action="snooze" title="Naar volgende week">${icon('next')}</button>`;
      if (st.manual && !st.auto) {
        actions += `<button class="iconbtn" data-action="unweek" title="Uit deze week halen">${icon('x')}</button>`;
      }
    } else {
      const inWeek = S.weekStatus(t).in;
      actions += `<button class="iconbtn ${inWeek ? 'on' : ''}" data-action="toggle-week" title="${
        inWeek ? 'Staat in je week' : 'Toevoegen aan deze week'
      }" aria-pressed="${inWeek}">${icon('calPlus')}</button>`;
    }
    if (o.claim) actions += `<button class="btn small" data-action="claim">Ik doe dit</button>`;
  }

  return `<div class="todo${overdue ? ' overdue' : ''}${done ? ' done' : ''}${ro ? ' ro' : ''}" data-id="${esc(t.id)}">`
    + `<button class="check" data-action="toggle-done" ${ro ? 'disabled' : ''} aria-label="${done ? 'Heropenen' : 'Afvinken'}" title="${done ? 'Heropenen' : 'Afvinken'}">${done ? icon('check') : ''}</button>`
    + `<div class="todo-main" data-action="open-todo" role="button" tabindex="0">`
    + `<div class="todo-title">${esc(t.title)}</div>`
    + (meta.length || who ? `<div class="todo-meta">${meta.join('')}${who}</div>` : '')
    + `</div>`
    + (actions ? `<div class="todo-actions">${actions}</div>` : '')
    + `</div>`;
}

export const cards = (arr, o) => arr.map((t) => todoCard(t, o)).join('');

// ---------- toast ----------
let toastTimer;
export function toast(msg, actionLabel, onAction) {
  const el = document.getElementById('toast');
  el.innerHTML = `<span>${esc(msg)}</span>${actionLabel ? `<button class="linkbtn">${esc(actionLabel)}</button>` : ''}`;
  el.classList.add('show');
  if (actionLabel) {
    el.querySelector('button').onclick = () => {
      el.classList.remove('show');
      onAction();
    };
  }
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), actionLabel ? 6000 : 3000);
}

// ---------- dialogs ----------
const dlg = () => document.getElementById('dialog');
const opt = (value, label, current) =>
  `<option value="${esc(value)}"${value === current ? ' selected' : ''}>${esc(label)}</option>`;

function showDialog(html, setup) {
  const d = dlg();
  d.innerHTML = html;
  d.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => d.close()));
  setup(d.querySelector('form'), d);
  d.showModal();
  d.querySelector('[autofocus]')?.focus();
}

export function openTodoDialog(t, defaults = {}) {
  const isNew = !t;
  const todo = structuredClone(t || S.newTodo(defaults));
  const ro = !isNew && !S.canEdit(todo);
  const me = S.state.me;
  const subtasks = todo.subtasks.map((s) => ({ ...s }));

  const place = todo.listId ? `l:${todo.listId}` : `p:${todo.projectId}`;
  const projects = S.activeProjects();
  if (todo.projectId && !projects.some((p) => p.id === todo.projectId)) {
    const p = S.byId('projects', todo.projectId);
    if (p) projects.push(p);
  }
  let placeOpts = `<optgroup label="Projecten">${projects.map((p) => opt(`p:${p.id}`, p.title, place)).join('')}</optgroup>`
    + `<optgroup label="Mijn lijsten">${S.myLists().map((l) => opt(`l:${l.id}`, l.name, place)).join('')}</optgroup>`;
  if (ro) {
    const l = S.byId('lists', todo.listId);
    placeOpts = opt(place, `Lijst van ${S.userName(l?.owner)}: ${l?.name || ''}`, place);
  }
  const cats = S.sortByOrder(S.state.categories).map((c) => opt(c.id, c.name, todo.category)).join('');
  const users = S.state.users;
  const st = S.weekStatus(todo);
  const created = todo.createdBy
    ? `Aangemaakt door ${esc(S.userName(todo.createdBy))}${todo.createdAt ? ' op ' + fmtDateTime(todo.createdAt) : ''}.`
    : '';
  const finished = todo.status === 'done' && todo.doneBy
    ? ` Afgewerkt door ${esc(S.userName(todo.doneBy))} op ${fmtDateTime(todo.doneAt)}.`
    : '';

  showDialog(
    `<form class="dlg" method="dialog" novalidate>
      <header class="dlg-head"><h2>${isNew ? 'Nieuwe to-do' : ro ? 'To-do bekijken' : 'To-do bewerken'}</h2>
        <button type="button" class="iconbtn" data-close aria-label="Sluiten">${icon('x')}</button></header>
      <div class="dlg-body">
        ${ro ? `<p class="note">Dit staat op een persoonlijke lijst van ${esc(S.userName(S.byId('lists', todo.listId)?.owner))}. Je kan het bekijken, niet aanpassen.</p>` : ''}
        <fieldset ${ro ? 'disabled' : ''}>
          <label class="field"><span>Titel</span><input name="title" required autocomplete="off" value="${esc(todo.title)}" ${isNew ? 'autofocus' : ''}></label>
          <div class="row">
            <label class="field"><span>Plaats</span><select name="place">${placeOpts}</select></label>
            <label class="field" data-show="project"><span>Categorie</span><select name="category"><option value="">Zonder categorie</option>${cats}</select></label>
          </div>
          <div class="field" data-show="project"><span>Toegewezen aan</span><div class="checks">${
            users.map((u) => `<label class="chk"><input type="checkbox" name="assignees" value="${esc(u.email)}"${todo.assignees.includes(u.email) ? ' checked' : ''}>${esc(u.name || u.email)}</label>`).join('')
          }</div></div>
          <div class="row">
            <label class="field"><span>Urgentie</span><select name="urgency">${opt('', 'Geen', todo.urgency)}${Object.entries(URGENCY).map(([k, v]) => opt(k, v, todo.urgency)).join('')}</select></label>
            <label class="field"><span>Deadline</span><input type="date" name="dueDate" value="${esc(todo.dueDate)}"></label>
            <label class="field"><span>Status</span><select name="status">${Object.entries(STATUS).map(([k, v]) => opt(k, v, todo.status)).join('')}</select></label>
          </div>
          <label class="field" data-show="waiting"><span>Wachten op</span><input name="waitingFor" autocomplete="off" placeholder="Wie of wat?" value="${esc(todo.waitingFor)}"></label>
          <label class="chk"><input type="checkbox" name="inWeek"${todo.inWeek ? ' checked' : ''}> In mijn week zetten${st.auto ? ' <span class="hint">(staat er al automatisch in: dringend of deadline deze week)</span>' : ''}</label>
          <label class="field"><span>Beschrijving</span><textarea name="description" rows="3">${esc(todo.description)}</textarea></label>
          <div class="field"><span>Subtaken</span><div class="subtasks"></div>
            <input class="add" data-subtask-add placeholder="+ Subtaak toevoegen (Enter)" autocomplete="off"></div>
          <label class="field"><span>Links</span><textarea name="links" rows="2" placeholder="Eén per regel, bv. Offerte | https://…">${esc(linksToText(todo.links))}</textarea></label>
          <label class="field"><span>Notities</span><textarea name="notes" rows="3">${esc(todo.notes)}</textarea></label>
        </fieldset>
        ${created || finished ? `<p class="hint">${created}${finished}</p>` : ''}
      </div>
      <footer class="dlg-foot">
        ${!isNew && !ro ? '<button type="button" class="btn ghost danger" data-delete>Verwijderen</button>' : ''}
        <span class="spacer"></span>
        <button type="button" class="btn ghost" data-close>${ro ? 'Sluiten' : 'Annuleren'}</button>
        ${ro ? '' : '<button type="submit" class="btn primary">Opslaan</button>'}
      </footer>
    </form>`,
    (form, d) => {
      const sync = () => {
        const isProject = form.elements.place.value.startsWith('p:');
        form.querySelectorAll('[data-show="project"]').forEach((el) => { el.hidden = !isProject; });
        form.querySelector('[data-show="waiting"]').hidden = form.elements.status.value !== 'waiting';
      };
      const box = form.querySelector('.subtasks');
      const drawSubtasks = () => {
        box.innerHTML = subtasks
          .map((s, i) => `<div class="subtask"><input type="checkbox" data-st-done="${i}"${s.done ? ' checked' : ''} aria-label="Klaar">`
            + `<input class="st-title" data-st-title="${i}" value="${esc(s.title)}" aria-label="Subtaak">`
            + `<button type="button" class="iconbtn" data-st-remove="${i}" aria-label="Subtaak verwijderen">${icon('x')}</button></div>`)
          .join('');
      };
      box.addEventListener('change', (e) => {
        const i = e.target.dataset.stDone;
        if (i !== undefined) subtasks[i].done = e.target.checked;
      });
      box.addEventListener('input', (e) => {
        const i = e.target.dataset.stTitle;
        if (i !== undefined) subtasks[i].title = e.target.value;
      });
      box.addEventListener('click', (e) => {
        const b = e.target.closest('[data-st-remove]');
        if (b) { subtasks.splice(Number(b.dataset.stRemove), 1); drawSubtasks(); }
      });
      form.querySelector('[data-subtask-add]').addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const v = e.target.value.trim();
        if (!v) return;
        subtasks.push({ id: uid(), title: v, done: false });
        e.target.value = '';
        drawSubtasks();
      });
      form.elements.place.addEventListener('change', sync);
      form.elements.status.addEventListener('change', sync);
      sync();
      drawSubtasks();

      form.querySelector('[data-delete]')?.addEventListener('click', () => {
        if (!confirm(`To-do "${todo.title}" definitief verwijderen?`)) return;
        S.remove('todos', todo.id);
        d.close();
        toast('To-do verwijderd');
      });

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (ro) return d.close();
        const f = new FormData(form);
        const title = String(f.get('title')).trim();
        if (!title) { form.elements.title.focus(); return; }
        const [kind, ref] = String(f.get('place')).split(':');
        const status = String(f.get('status'));
        const next = {
          ...todo,
          title,
          description: String(f.get('description')),
          urgency: String(f.get('urgency')),
          dueDate: String(f.get('dueDate')),
          status,
          waitingFor: status === 'waiting' ? String(f.get('waitingFor')).trim() : '',
          notes: String(f.get('notes')),
          links: parseLinks(f.get('links')),
          subtasks: subtasks.filter((s) => s.title.trim()),
        };
        if (kind === 'p') {
          next.projectId = ref;
          next.listId = '';
          next.category = String(f.get('category'));
          next.assignees = f.getAll('assignees').map(String);
          if (todo.listId && !next.assignees.length) next.assignees = [me]; // moved from my own list
        } else {
          next.listId = ref;
          next.projectId = '';
          next.category = '';
          next.assignees = [];
        }
        if (status === 'done' && todo.status !== 'done') {
          next.doneAt = new Date().toISOString();
          next.doneBy = me;
        }
        if (status !== 'done') { next.doneAt = ''; next.doneBy = ''; }
        if (f.get('inWeek')) {
          if (!todo.inWeek) { next.inWeek = mondayOf(todayISO()); next.snoozeUntil = ''; }
          if (kind === 'p' && !next.assignees.includes(me)) next.assignees.push(me);
        } else {
          next.inWeek = '';
        }
        S.upsert('todos', next);
        d.close();
        toast(isNew ? 'To-do toegevoegd' : 'Opgeslagen');
      });
    },
  );
}

export function openProjectDialog(p, onCreated) {
  const isNew = !p;
  const proj = structuredClone(p || {
    id: uid(), title: '', description: '', trekkers: [S.state.me], dropboxUrl: '', links: [],
    archived: false, createdAt: new Date().toISOString(), createdBy: S.state.me,
  });
  showDialog(
    `<form class="dlg" method="dialog" novalidate>
      <header class="dlg-head"><h2>${isNew ? 'Nieuw project' : 'Project bewerken'}</h2>
        <button type="button" class="iconbtn" data-close aria-label="Sluiten">${icon('x')}</button></header>
      <div class="dlg-body">
        <label class="field"><span>Titel</span><input name="title" required autocomplete="off" value="${esc(proj.title)}" autofocus></label>
        <label class="field"><span>Korte beschrijving</span><textarea name="description" rows="3" placeholder="Waar gaat dit project over? Handig voor wie het project niet kent.">${esc(proj.description)}</textarea></label>
        <div class="field"><span>Trekker(s)</span><div class="checks">${
          S.state.users.map((u) => `<label class="chk"><input type="checkbox" name="trekkers" value="${esc(u.email)}"${proj.trekkers.includes(u.email) ? ' checked' : ''}>${esc(u.name || u.email)}</label>`).join('')
        }</div></div>
        <label class="field"><span>Dropbox-map</span><input name="dropboxUrl" autocomplete="off" placeholder="Plak de link naar de map (Dropbox → Delen → Link kopiëren)" value="${esc(proj.dropboxUrl)}"></label>
        <label class="field"><span>Andere links</span><textarea name="links" rows="2" placeholder="Eén per regel, bv. Draaiboek | https://…">${esc(linksToText(proj.links))}</textarea></label>
      </div>
      <footer class="dlg-foot"><span class="spacer"></span>
        <button type="button" class="btn ghost" data-close>Annuleren</button>
        <button type="submit" class="btn primary">${isNew ? 'Project maken' : 'Opslaan'}</button></footer>
    </form>`,
    (form, d) => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const f = new FormData(form);
        const title = String(f.get('title')).trim();
        if (!title) { form.elements.title.focus(); return; }
        const url = String(f.get('dropboxUrl')).trim();
        S.upsert('projects', {
          ...proj,
          title,
          description: String(f.get('description')).trim(),
          trekkers: f.getAll('trekkers').map(String),
          dropboxUrl: url ? safeUrl(url) || url : '',
          links: parseLinks(f.get('links')),
        });
        d.close();
        if (isNew) onCreated?.(proj.id);
        else toast('Project opgeslagen');
      });
    },
  );
}

export function openListDialog(l) {
  const isNew = !l;
  const list = l ? { ...l } : { id: uid(), owner: S.state.me, name: '', order: (S.myLists().length + 1) * 10 };
  const count = S.state.todos.filter((t) => t.listId === list.id).length;
  showDialog(
    `<form class="dlg small" method="dialog" novalidate>
      <header class="dlg-head"><h2>${isNew ? 'Nieuwe lijst' : 'Lijst bewerken'}</h2>
        <button type="button" class="iconbtn" data-close aria-label="Sluiten">${icon('x')}</button></header>
      <div class="dlg-body"><label class="field"><span>Naam</span><input name="name" required autocomplete="off" value="${esc(list.name)}" autofocus></label></div>
      <footer class="dlg-foot">${isNew ? '' : '<button type="button" class="btn ghost danger" data-delete>Lijst verwijderen</button>'}
        <span class="spacer"></span><button type="button" class="btn ghost" data-close>Annuleren</button>
        <button type="submit" class="btn primary">Opslaan</button></footer>
    </form>`,
    (form, d) => {
      form.querySelector('[data-delete]')?.addEventListener('click', () => {
        const msg = count
          ? `Lijst "${list.name}" en de ${count} to-do's erop definitief verwijderen?`
          : `Lijst "${list.name}" verwijderen?`;
        if (!confirm(msg)) return;
        const ids = S.state.todos.filter((t) => t.listId === list.id).map((t) => t.id);
        if (ids.length) S.remove('todos', ids);
        S.remove('lists', list.id);
        d.close();
      });
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = String(new FormData(form).get('name')).trim();
        if (!name) return;
        S.upsert('lists', { ...list, name });
        d.close();
      });
    },
  );
}
