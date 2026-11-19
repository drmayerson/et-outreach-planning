// Shared UI pieces: icons, to-do cards, toast and the dialogs.
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
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
  pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
  box: '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
};
export const icon = (name, cls = '') =>
  `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;

export const URGENCY = { dringend: 'Dringend', semi: 'Semi-dringend', lang: 'Lange termijn' };
const STATUS = { open: 'Open', waiting: 'Wachten op …', done: 'Klaar' };
export const MATERIAL_STATUS = { nodig: 'Nodig', besteld: 'Besteld', klaar: 'Klaar' };

// Project colours: mid-tones that read on light and dark backgrounds.
export const PROJECT_COLORS = {
  teal: '#1f8a96', blauw: '#3b6fd4', paars: '#7d55c7', roze: '#c94f8a', rood: '#d0533f',
  oranje: '#e08a2c', geel: '#c9a227', groen: '#3f9a5a', grijs: '#7a8580',
};
export const colorOf = (p) => PROJECT_COLORS[S.projectColor(p)] || '';
export const colorVar = (p) => (colorOf(p) ? ` style="--pc:${colorOf(p)}"` : '');

/**
 * Quick-add field: type a title and press Enter. Three small buttons set urgency, deadline and "wachten op".
 * attrs: the data-add attributes that say where the to-do goes.
 */
export function quickAdd(attrs, placeholder, focusKey) {
  return `<div class="quickadd">
    <input class="add" placeholder="${esc(placeholder)}" autocomplete="off" ${attrs} data-focus-key="${esc(focusKey)}">
    <span class="qa-opts">
      <button type="button" class="qa-btn" data-qa="urgency" data-value="" title="Urgentie (klik om te wisselen)" aria-label="Urgentie: geen">!</button>
      <label class="qa-btn qa-date" title="Deadline">${icon('calendar')}<span class="qa-date-text"></span><input type="date" data-qa="date" aria-label="Deadline"></label>
      <button type="button" class="qa-btn" data-qa="waiting" aria-pressed="false" title="Wachten op" aria-label="Wachten op">${icon('clock')}</button>
    </span>
  </div>`;
}
/** Options chosen in a quick-add row: {urgency, dueDate, status}. */
export function quickAddOptions(input) {
  const box = input.closest('.quickadd');
  if (!box) return {};
  return {
    urgency: box.querySelector('[data-qa="urgency"]').dataset.value || '',
    dueDate: box.querySelector('[data-qa="date"]').value || '',
    status: box.querySelector('[data-qa="waiting"]').getAttribute('aria-pressed') === 'true' ? 'waiting' : 'open',
  };
}

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

export function eventDateText(ev) {
  return ev.endDate && ev.endDate !== ev.date
    ? `${fmtDate(ev.date, true)} – ${fmtDate(ev.endDate, true)}`
    : fmtDate(ev.date, true);
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
    if (c) meta.push(`<span class="badge ctx"${t.projectId ? colorVar(S.byId('projects', t.projectId)) : ''}>${esc(c)}</span>`);
  }
  if (t.urgency && URGENCY[t.urgency]) meta.push(`<span class="badge u-${t.urgency}">${URGENCY[t.urgency]}</span>`);
  if (t.dueDate) {
    meta.push(`<span class="badge due ${overdue ? 'late' : ''}">${icon('calendar')}${overdue ? 'Te laat · ' : ''}${fmtDate(t.dueDate)}</span>`);
  }
  if (t.status === 'waiting') {
    const follow = t.followUp ? ` · opvolgen ${fmtDate(t.followUp)}` : '';
    meta.push(`<span class="badge wait">${icon('clock')}Wachten op${t.waitingFor ? ': ' + esc(t.waitingFor) : ''}${follow}</span>`);
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
  toastTimer = setTimeout(() => el.classList.remove('show'), actionLabel ? 6000 : 3500);
}

// ---------- dialogs ----------
const dlg = () => document.getElementById('dialog');
const opt = (value, label, current) =>
  `<option value="${esc(value)}"${value === current ? ' selected' : ''}>${esc(label)}</option>`;
const closeBtn = `<button type="button" class="iconbtn" data-close aria-label="Sluiten">${icon('x')}</button>`;

function showDialog(html, setup) {
  const d = dlg();
  d.innerHTML = html;
  d.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => d.close()));
  const form = d.querySelector('form');
  setup(form, d);
  d.showModal();
  d.querySelector('[autofocus]')?.focus();
}

const userChecks = (name, selected) =>
  S.state.users
    .map((u) => `<label class="chk"><input type="checkbox" name="${name}" value="${esc(u.email)}"${selected.includes(u.email) ? ' checked' : ''}>${esc(u.name || u.email)}</label>`)
    .join('');

// ----- to-do -----
export function openTodoDialog(t, defaults = {}) {
  const isNew = !t;
  const todo = structuredClone(t || S.newTodo(defaults));
  const ro = !isNew && !S.canEdit(todo);
  const me = S.state.me;
  const subtasks = todo.subtasks.map((s) => ({ ...s }));

  const place = todo.listId ? `l:${todo.listId}` : `p:${todo.projectId}`;
  const projects = S.activeProjectTree();
  if (todo.projectId && !projects.some((p) => p.id === todo.projectId)) {
    const p = S.byId('projects', todo.projectId);
    if (p) projects.push(p);
  }
  let placeOpts = `<optgroup label="Projecten">${projects.map((p) => opt(`p:${p.id}`, S.projectLabel(p), place)).join('')}</optgroup>`
    + `<optgroup label="Mijn lijsten">${S.myLists().map((l) => opt(`l:${l.id}`, l.name, place)).join('')}</optgroup>`;
  if (ro) {
    const l = S.byId('lists', todo.listId);
    placeOpts = opt(place, `Lijst van ${S.userName(l?.owner)}: ${l?.name || ''}`, place);
  }
  const cats = S.sortByOrder(S.state.categories).map((c) => opt(c.id, c.name, todo.category)).join('');
  const st = S.weekStatus(todo);
  const created = todo.createdBy
    ? `Aangemaakt door ${esc(S.userName(todo.createdBy))}${todo.createdAt ? ' op ' + fmtDateTime(todo.createdAt) : ''}.`
    : '';
  const finished = todo.status === 'done' && todo.doneBy
    ? ` Afgewerkt door ${esc(S.userName(todo.doneBy))} op ${fmtDateTime(todo.doneAt)}.`
    : '';
  const history = [...(todo.history || [])].reverse();

  showDialog(
    `<form class="dlg" method="dialog" novalidate>
      <header class="dlg-head"><h2>${isNew ? 'Nieuwe to-do' : ro ? 'To-do bekijken' : 'To-do bewerken'}</h2>${closeBtn}</header>
      <div class="dlg-body">
        ${ro ? `<p class="note">Dit staat op een persoonlijke lijst van ${esc(S.userName(S.byId('lists', todo.listId)?.owner))}. Je kan het bekijken, niet aanpassen.</p>` : ''}
        <fieldset ${ro ? 'disabled' : ''}>
          <label class="field"><span>Titel</span><input name="title" required autocomplete="off" value="${esc(todo.title)}" ${isNew ? 'autofocus' : ''}></label>
          <div class="row">
            <label class="field"><span>Plaats</span><select name="place">${placeOpts}</select></label>
            <label class="field" data-show="project"><span>Categorie</span><select name="category"><option value="">Zonder categorie</option>${cats}</select></label>
          </div>
          <div class="field" data-show="project"><span>Toegewezen aan</span><div class="checks">${userChecks('assignees', todo.assignees)}</div></div>
          <div class="row">
            <label class="field"><span>Urgentie</span><select name="urgency">${opt('', 'Geen', todo.urgency)}${Object.entries(URGENCY).map(([k, v]) => opt(k, v, todo.urgency)).join('')}</select></label>
            <label class="field"><span>Deadline</span><input type="date" name="dueDate" value="${esc(todo.dueDate)}"></label>
            <label class="field"><span>Status</span><select name="status">${Object.entries(STATUS).map(([k, v]) => opt(k, v, todo.status)).join('')}</select></label>
          </div>
          <div class="row" data-show="waiting">
            <label class="field"><span>Wachten op</span><input name="waitingFor" autocomplete="off" placeholder="Wie of wat?" value="${esc(todo.waitingFor)}"></label>
            <label class="field"><span>Opvolgen op</span><input type="date" name="followUp" value="${esc(todo.followUp)}"></label>
          </div>
          <label class="chk"><input type="checkbox" name="inWeek"${todo.inWeek ? ' checked' : ''}> In mijn week zetten${st.auto ? ' <span class="hint">(staat er al automatisch in)</span>' : ''}</label>
          <div class="field"><span>Subtaken</span><div class="subtasks"></div>
            <input class="add" data-subtask-add placeholder="+ Subtaak toevoegen (Enter)" autocomplete="off"></div>
          <label class="field"><span>Links</span><textarea name="links" rows="2" placeholder="Eén per regel, bv. Offerte | https://…">${esc(linksToText(todo.links))}</textarea></label>
          <label class="field"><span>Notities</span><textarea name="notes" rows="4">${esc([todo.description, todo.notes].filter((x) => x && x.trim()).join('\n\n'))}</textarea></label>
        </fieldset>
        ${created || finished ? `<p class="hint">${created}${finished}</p>` : ''}
        ${history.length ? `<details class="history"><summary>Geschiedenis (${history.length})</summary><ul>${history
          .map((h) => `<li><span class="muted">${fmtDateTime(h.at)} · ${esc(S.userName(h.by))}</span> ${esc(h.text)}</li>`)
          .join('')}</ul></details>` : ''}
      </div>
      <footer class="dlg-foot">
        ${!isNew && !ro ? '<button type="button" class="btn ghost danger" data-delete>Verwijderen</button>' : ''}
        <span class="spacer"></span>
        <button type="button" class="btn ghost" data-close>${ro ? 'Sluiten' : 'Annuleren'}</button>
        ${ro ? '' : '<button type="submit" class="btn primary">Opslaan</button>'}
      </footer>
    </form>`,
    (form, d) => {
      const f$ = form.elements;
      const sync = () => {
        const isProject = f$.place.value.startsWith('p:');
        form.querySelectorAll('[data-show="project"]').forEach((el) => { el.hidden = !isProject; });
        form.querySelector('[data-show="waiting"]').hidden = f$.status.value !== 'waiting';
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
      f$.place.addEventListener('change', () => {
        const [kind, ref] = f$.place.value.split(':');
        if (kind === 'p' && !form.querySelector('[name="assignees"]:checked')) {
          const who = S.defaultAssignees(ref);
          form.querySelectorAll('[name="assignees"]').forEach((c) => { c.checked = who.includes(c.value); });
        }
        sync();
      });
      f$.status.addEventListener('change', sync);
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
        if (!title) { f$.title.focus(); return; }
        const [kind, ref] = String(f.get('place')).split(':');
        const status = String(f.get('status'));
        const next = {
          ...todo,
          title,
          description: '',
          urgency: String(f.get('urgency')),
          dueDate: String(f.get('dueDate')),
          status,
          waitingFor: status === 'waiting' ? String(f.get('waitingFor')).trim() : '',
          followUp: status === 'waiting' ? String(f.get('followUp')) : '',
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

// ----- project -----
export function openProjectDialog(p, onCreated, defaults = {}) {
  const isNew = !p;
  const parentDefault = S.byId('projects', defaults.parentId);
  const proj = structuredClone(p || {
    id: uid(), title: '', description: '', parentId: defaults.parentId || '',
    trekkers: parentDefault ? [...parentDefault.trekkers] : [S.state.me],
    dropboxUrl: '', links: [], events: [], materials: [], contactIds: [],
    archived: false, createdAt: new Date().toISOString(), createdBy: S.state.me,
  });
  const canHaveParent = isNew || !S.hasSubProjects(proj.id);
  const parentOpts = S.activeProjects()
    .filter((x) => x.id !== proj.id)
    .map((x) => opt(x.id, x.title, proj.parentId))
    .join('');
  showDialog(
    `<form class="dlg" method="dialog" novalidate>
      <header class="dlg-head"><h2>${isNew ? (proj.parentId ? 'Nieuw subproject' : 'Nieuw project') : 'Project bewerken'}</h2>${closeBtn}</header>
      <div class="dlg-body">
        <label class="field"><span>Titel</span><input name="title" required autocomplete="off" value="${esc(proj.title)}" autofocus></label>
        <label class="field"><span>Korte beschrijving</span><textarea name="description" rows="3" placeholder="Waar gaat dit project over? Handig voor wie het project niet kent.">${esc(proj.description)}</textarea></label>
        <label class="field"><span>Hoort bij</span><select name="parentId" ${canHaveParent ? '' : 'disabled'}>${opt('', '— (hoofdproject)', proj.parentId)}${parentOpts}</select>
          ${canHaveParent ? '' : '<span class="hint">Dit project heeft zelf subprojecten, dus het blijft een hoofdproject.</span>'}</label>
        <div class="field"><span>Trekker(s)</span><div class="checks">${userChecks('trekkers', proj.trekkers)}</div></div>
        <div class="field"><span>Kleur</span><div class="swatches">
          <label class="swatch none" title="Geen kleur"><input type="radio" name="color" value=""${proj.color ? '' : ' checked'}><span></span></label>
          ${Object.entries(PROJECT_COLORS).map(([k, hex]) => `<label class="swatch" title="${k}" style="--sw:${hex}"><input type="radio" name="color" value="${k}"${proj.color === k ? ' checked' : ''}><span></span></label>`).join('')}
        </div>${proj.parentId ? '<span class="hint">Zonder eigen kleur krijgt een subproject de kleur van het hoofdproject.</span>' : ''}</div>
        <p class="hint">Dropbox-map en andere links voeg je toe in het blok "Links" op de projectpagina.</p>
      </div>
      <footer class="dlg-foot">${isNew ? '' : '<button type="button" class="btn ghost danger" data-delete>Verwijderen</button>'}<span class="spacer"></span>
        <button type="button" class="btn ghost" data-close>Annuleren</button>
        <button type="submit" class="btn primary">${isNew ? 'Maken' : 'Opslaan'}</button></footer>
    </form>`,
    (form, d) => {
      form.querySelector('[data-delete]')?.addEventListener('click', () => {
        const family = S.projectFamilyIds(proj.id);
        const todoIds = S.state.todos.filter((t) => family.includes(t.projectId)).map((t) => t.id);
        const subs = family.length - 1;
        const msg = `Project "${proj.title}"${subs ? ` met ${subs} subproject(en)` : ''} en ${todoIds.length} to-do('s) definitief verwijderen? `
          + 'Archiveren kan ook: dan blijft alles bewaard.';
        if (!confirm(msg)) return;
        if (todoIds.length) S.remove('todos', todoIds);
        S.remove('projects', family);
        d.close();
        location.hash = proj.parentId ? `#/project/${encodeURIComponent(proj.parentId)}` : '#/';
        toast('Project verwijderd');
      });
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const f = new FormData(form);
        const title = String(f.get('title')).trim();
        if (!title) { form.elements.title.focus(); return; }
        S.upsert('projects', {
          ...proj,
          title,
          description: String(f.get('description')).trim(),
          parentId: canHaveParent ? String(f.get('parentId') || '') : '',
          trekkers: f.getAll('trekkers').map(String),
          color: String(f.get('color') || ''),
        });
        d.close();
        if (isNew) onCreated?.(proj.id);
        else toast('Project opgeslagen');
      });
    },
  );
}

// ----- dates & locations -----
export function openEventDialog(project, ev, copyOf) {
  const isNew = !ev;
  const item = ev ? { ...ev } : copyOf || { id: uid(), date: todayISO(), endDate: '', label: '', location: '' };
  showDialog(
    `<form class="dlg small" method="dialog" novalidate>
      <header class="dlg-head"><h2>${copyOf ? 'Kopie van datum' : isNew ? 'Datum toevoegen' : 'Datum bewerken'}</h2>${closeBtn}</header>
      <div class="dlg-body">
        <label class="field"><span>Wat</span><input name="label" autocomplete="off" placeholder="bv. Festival, schoolbezoek, opbouw" value="${esc(item.label)}" autofocus></label>
        <div class="row">
          <label class="field"><span>Datum</span><input type="date" name="date" required value="${esc(item.date)}"></label>
          <label class="field"><span>Tot (optioneel)</span><input type="date" name="endDate" value="${esc(item.endDate)}"></label>
        </div>
        <label class="field"><span>Locatie</span><input name="location" autocomplete="off" placeholder="bv. Technopolis, Mechelen" value="${esc(item.location)}"></label>
        <p class="hint">Deze datum verschijnt in de week van de trekker(s) van het project.</p>
      </div>
      <footer class="dlg-foot">${isNew ? '' : `<button type="button" class="btn ghost danger" data-delete>Verwijderen</button>
        <button type="button" class="btn ghost" data-duplicate>${icon('copy')}Dupliceren</button>`}<span class="spacer"></span>
        <button type="button" class="btn ghost" data-close>Annuleren</button>
        <button type="submit" class="btn primary">Opslaan</button></footer>
    </form>`,
    (form, d) => {
      const fresh = () => S.byId('projects', project.id) || project;
      const start = form.elements.date;
      const end = form.elements.endDate;
      // the end-date picker opens at the start date instead of today
      const prepareEnd = () => {
        end.min = start.value || '';
        if (!end.value && start.value) end.value = start.value;
      };
      end.addEventListener('focus', prepareEnd);
      end.addEventListener('pointerdown', prepareEnd);
      start.addEventListener('change', () => {
        end.min = start.value || '';
        if (end.value && end.value < start.value) end.value = '';
      });
      form.querySelector('[data-delete]')?.addEventListener('click', () => {
        const p = fresh();
        S.upsert('projects', { ...p, events: p.events.filter((x) => x.id !== item.id) });
        d.close();
      });
      form.querySelector('[data-duplicate]')?.addEventListener('click', () => {
        d.close();
        openEventDialog(fresh(), null, { ...item, id: uid() });
      });
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const f = new FormData(form);
        const date = String(f.get('date'));
        if (!date) { form.elements.date.focus(); return; }
        let endDate = String(f.get('endDate'));
        if (endDate && endDate <= date) endDate = '';
        const next = { ...item, date, endDate, label: String(f.get('label')).trim(), location: String(f.get('location')).trim() };
        const p = fresh();
        const events = p.events.some((x) => x.id === item.id)
          ? p.events.map((x) => (x.id === item.id ? next : x))
          : [...p.events, next];
        S.upsert('projects', { ...p, events: events.sort((a, b) => a.date.localeCompare(b.date)) });
        d.close();
      });
    },
  );
}

// ----- contacts -----
export function openContactDialog(c, onSaved) {
  const isNew = !c;
  const contact = c ? { ...c } : {
    id: uid(), name: '', organisation: '', role: '', email: '', phone: '', notes: '', createdAt: new Date().toISOString(),
  };
  const used = isNew ? [] : S.projectsOfContact(contact.id);
  showDialog(
    `<form class="dlg" method="dialog" novalidate>
      <header class="dlg-head"><h2>${isNew ? 'Nieuw contact' : 'Contact bewerken'}</h2>${closeBtn}</header>
      <div class="dlg-body">
        <label class="field"><span>Naam</span><input name="name" required autocomplete="off" value="${esc(contact.name)}" autofocus></label>
        <div class="row">
          <label class="field"><span>Organisatie</span><input name="organisation" autocomplete="off" value="${esc(contact.organisation)}"></label>
          <label class="field"><span>Functie</span><input name="role" autocomplete="off" value="${esc(contact.role)}"></label>
        </div>
        <div class="row">
          <label class="field"><span>E-mail</span><input type="email" name="email" autocomplete="off" value="${esc(contact.email)}"></label>
          <label class="field"><span>Telefoon</span><input type="tel" name="phone" autocomplete="off" value="${esc(contact.phone)}"></label>
        </div>
        <label class="field"><span>Notities</span><textarea name="notes" rows="2">${esc(contact.notes)}</textarea></label>
        ${used.length ? `<p class="hint">Gekoppeld aan: ${used.map((p) => esc(S.projectLabel(p))).join(', ')}.</p>` : ''}
      </div>
      <footer class="dlg-foot">${isNew ? '' : '<button type="button" class="btn ghost danger" data-delete>Verwijderen</button>'}<span class="spacer"></span>
        <button type="button" class="btn ghost" data-close>Annuleren</button>
        <button type="submit" class="btn primary">Opslaan</button></footer>
    </form>`,
    (form, d) => {
      form.querySelector('[data-delete]')?.addEventListener('click', () => {
        if (!confirm(`Contact "${contact.name}" verwijderen?${used.length ? ` Het wordt ook losgekoppeld van ${used.length} project(en).` : ''}`)) return;
        if (used.length) {
          S.upsertMany('projects', used.map((p) => ({ ...p, contactIds: p.contactIds.filter((id) => id !== contact.id) })));
        }
        S.remove('contacts', contact.id);
        d.close();
      });
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const f = new FormData(form);
        const name = String(f.get('name')).trim();
        if (!name) { form.elements.name.focus(); return; }
        const next = { ...contact, name };
        for (const k of ['organisation', 'role', 'email', 'phone', 'notes']) next[k] = String(f.get(k)).trim();
        S.upsert('contacts', next);
        d.close();
        onSaved?.(next);
      });
    },
  );
}

export function openLinkContactDialog(project) {
  const linked = new Set(project.contactIds);
  const all = [...S.state.contacts].sort((a, b) => a.name.localeCompare(b.name, 'nl'));
  const link = (id) => {
    const p = S.byId('projects', project.id);
    if (p && !p.contactIds.includes(id)) S.upsert('projects', { ...p, contactIds: [...p.contactIds, id] });
  };
  const row = (c) => {
    const isLinked = linked.has(c.id);
    const sub = [c.role, c.organisation].filter(Boolean).join(', ');
    return `<button type="button" class="pick-row" data-pick="${esc(c.id)}" ${isLinked ? 'disabled' : ''}
      data-search="${esc([c.name, c.organisation, c.role, c.email].join(' ').toLowerCase())}">
      <span class="pick-name">${esc(c.name)}</span>${sub ? `<span class="muted">${esc(sub)}</span>` : ''}
      ${isLinked ? '<span class="tag">al gekoppeld</span>' : ''}</button>`;
  };
  showDialog(
    `<form class="dlg" method="dialog" novalidate>
      <header class="dlg-head"><h2>Contact koppelen</h2>${closeBtn}</header>
      <div class="dlg-body">
        <button type="button" class="pick-row new" data-new>${icon('plus')}<span class="pick-name">Nieuw contact</span></button>
        ${all.length > 6 ? '<input class="search" type="search" placeholder="Zoeken…" data-pick-search autocomplete="off" autofocus>' : ''}
        <div class="pick-list">${all.map(row).join('') || '<p class="hint">Nog geen contacten.</p>'}</div>
      </div>
      <footer class="dlg-foot"><span class="spacer"></span><button type="button" class="btn ghost" data-close>Sluiten</button></footer>
    </form>`,
    (form, d) => {
      form.querySelector('[data-new]').addEventListener('click', () => {
        d.close();
        openContactDialog(null, (c) => link(c.id));
      });
      form.querySelector('.pick-list').addEventListener('click', (e) => {
        const b = e.target.closest('[data-pick]');
        if (!b || b.disabled) return;
        link(b.dataset.pick);
        d.close();
        toast('Contact gekoppeld');
      });
      form.querySelector('[data-pick-search]')?.addEventListener('input', (e) => {
        const q = e.target.value.trim().toLowerCase();
        form.querySelectorAll('[data-pick]').forEach((b) => { b.hidden = !!q && !b.dataset.search.includes(q); });
      });
      form.addEventListener('submit', (e) => e.preventDefault());
    },
  );
}

// ----- project links (Dropbox folder, event page, …) -----
/** Links of a project; an old separate Dropbox link is shown as the first one. */
export function projectLinks(p) {
  const links = [...p.links];
  if (p.dropboxUrl && !links.some((l) => l.url === p.dropboxUrl)) links.unshift({ label: 'Dropbox-map', url: p.dropboxUrl });
  return links;
}

export function openLinkDialog(project, index) {
  const isNew = index === undefined || index === null;
  const current = projectLinks(project);
  const item = isNew ? { label: '', url: '' } : { ...current[index] };
  showDialog(
    `<form class="dlg small" method="dialog" novalidate>
      <header class="dlg-head"><h2>${isNew ? 'Link toevoegen' : 'Link bewerken'}</h2>${closeBtn}</header>
      <div class="dlg-body">
        <label class="field"><span>Titel</span><input name="label" autocomplete="off" placeholder="bv. Dropbox-map, website evenement" value="${esc(item.label)}" autofocus></label>
        <label class="field"><span>Website</span><input name="url" autocomplete="off" placeholder="https://…" value="${esc(item.url)}"></label>
      </div>
      <footer class="dlg-foot">${isNew ? '' : '<button type="button" class="btn ghost danger" data-delete>Verwijderen</button>'}<span class="spacer"></span>
        <button type="button" class="btn ghost" data-close>Annuleren</button>
        <button type="submit" class="btn primary">Opslaan</button></footer>
    </form>`,
    (form, d) => {
      const save = (links) => {
        const p = S.byId('projects', project.id) || project;
        S.upsert('projects', { ...p, links, dropboxUrl: '' }); // the Dropbox link now lives in the list
      };
      form.querySelector('[data-delete]')?.addEventListener('click', () => {
        save(current.filter((_, i) => i !== index));
        d.close();
      });
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const f = new FormData(form);
        const url = safeUrl(String(f.get('url')).trim());
        if (!url) { form.elements.url.focus(); toast('Vul een geldige website in.'); return; }
        const next = { label: String(f.get('label')).trim(), url };
        save(isNew ? [...current, next] : current.map((l, i) => (i === index ? next : l)));
        d.close();
      });
    },
  );
}

// ----- copy as template -----
export function openTemplateDialog(project, onCreated) {
  const subs = S.subProjects(project.id);
  showDialog(
    `<form class="dlg small" method="dialog" novalidate>
      <header class="dlg-head"><h2>Kopie als sjabloon</h2>${closeBtn}</header>
      <div class="dlg-body">
        <p>Maakt een nieuw project met dezelfde to-dos, categorieën, trekkers, contacten, links en materiaallijst. Alle to-dos staan weer open; deadlines, urgentie en data worden leeggemaakt.</p>
        <label class="field"><span>Titel van het nieuwe project</span><input name="title" required autocomplete="off" value="${esc(project.title)} (kopie)" autofocus></label>
        ${subs.length ? `<label class="chk"><input type="checkbox" name="withSubs" checked> Ook de ${subs.length} subproject(en) kopiëren</label>` : ''}
      </div>
      <footer class="dlg-foot"><span class="spacer"></span>
        <button type="button" class="btn ghost" data-close>Annuleren</button>
        <button type="submit" class="btn primary">Kopie maken</button></footer>
    </form>`,
    (form, d) => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const f = new FormData(form);
        const title = String(f.get('title')).trim();
        if (!title) return;
        const now = new Date().toISOString();
        const newProjects = [];
        const newTodos = [];
        const copy = (src, parentId, newTitle) => {
          const id = uid();
          newProjects.push({
            ...src, id, parentId, title: newTitle, archived: false, createdAt: now, createdBy: S.state.me,
            events: [],
            materials: src.materials.map((m) => ({ ...m, id: uid(), status: 'nodig' })),
          });
          for (const t of S.state.todos.filter((x) => x.projectId === src.id && !x.archived)) {
            newTodos.push(S.newTodo({
              ...t, id: uid(), projectId: id, status: 'open', urgency: '', dueDate: '', followUp: '', waitingFor: '',
              inWeek: '', snoozeUntil: '', doneAt: '', doneBy: '', history: [],
              subtasks: t.subtasks.map((s) => ({ ...s, done: false })),
              createdAt: now, createdBy: S.state.me,
            }));
          }
          return id;
        };
        const newId = copy(project, project.parentId, title);
        if (f.get('withSubs')) for (const s of subs) copy(s, newId, s.title);
        S.upsertMany('projects', newProjects);
        if (newTodos.length) S.upsertMany('todos', newTodos);
        d.close();
        toast(`Kopie gemaakt: ${newTodos.length} to-do('s)`);
        onCreated?.(newId);
      });
    },
  );
}

// ----- personal list -----
export function openListDialog(l) {
  const isNew = !l;
  const list = l ? { ...l } : { id: uid(), owner: S.state.me, name: '', order: (S.myLists().length + 1) * 10 };
  const count = S.state.todos.filter((t) => t.listId === list.id).length;
  showDialog(
    `<form class="dlg small" method="dialog" novalidate>
      <header class="dlg-head"><h2>${isNew ? 'Nieuwe lijst' : 'Lijst bewerken'}</h2>${closeBtn}</header>
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
