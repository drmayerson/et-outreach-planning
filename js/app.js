// Entry point: start-up, rendering, navigation, clicks and drag-and-drop.
import { CONFIG } from './config.js';
import * as S from './store.js';
import { createAuth } from './auth.js';
import { renderView, route, ui as viewUi } from './views.js';
import {
  toast, openTodoDialog, openProjectDialog, openListDialog, openEventDialog, openContactDialog,
  openLinkContactDialog, openTemplateDialog, openLinkDialog, quickAddOptions, URGENCY,
} from './ui.js';
import { exportProjects } from './export.js';
import { uid, esc, todayISO, mondayOf, addDays, fmtDate } from './util.js';

const app = document.getElementById('app');
const dialog = document.getElementById('dialog');
// "?demo" in the address forces demo mode (handy for trying things without touching the real data)
const demo = new URLSearchParams(location.search).has('demo') || !(CONFIG.clientId && CONFIG.apiUrl);
let auth = null;

// ---------- rendering ----------
const NAV = {
  home: 'home', project: 'home', week: 'week', lijsten: 'lijsten', contacten: 'contacten', archief: 'archief', instellingen: 'instellingen',
};
const TITLES = {
  home: 'Overzicht', week: 'Deze week', lijsten: 'Lijsten', contacten: 'Contacten', archief: 'Archief', instellingen: 'Instellingen',
};

function render() {
  if (!S.state.ready) return;
  // keep focus and half-typed text in quick-add fields across re-renders
  const active = document.activeElement;
  const focusKey = app.contains(active) ? active?.dataset?.focusKey : null;
  const typed = focusKey ? active.value : '';

  const r = route();
  app.innerHTML = renderView(r);
  document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('on', a.dataset.nav === NAV[r.name]));
  const projTitle = r.name === 'project' ? S.projectLabel(S.byId('projects', r.arg)) : '';
  document.title = `${projTitle || TITLES[r.name] || 'Overzicht'} · Planningstool`;
  renderUserChip();
  mountSortables();

  if (focusKey) {
    const el = app.querySelector(`[data-focus-key="${CSS.escape(focusKey)}"]`);
    if (el) { el.value = typed; el.focus(); }
  }
}

function renderUserChip() {
  const chip = document.getElementById('userchip');
  const me = S.state.me;
  chip.innerHTML = demo
    ? `<label class="demo-switch" title="Demomodus: wissel van gebruiker"><span class="sr">Ik ben</span><select data-demo-me>${
        S.state.users.map((u) => `<option value="${esc(u.email)}"${u.email === me ? ' selected' : ''}>${esc(u.name)}</option>`).join('')
      }</select></label>`
    : `<span class="avatar me" title="${esc(me)}">${esc(S.initials(me))}</span><span class="name">${esc(S.userName(me))}</span>`;
}

function renderBanner() {
  const b = document.getElementById('banner');
  b.innerHTML = demo
    ? `<div class="banner">Demomodus: de gegevens blijven in deze browser.${
      CONFIG.apiUrl ? ' <a href="./">Naar de echte gegevens</a>' : ' Koppel de Google Sheet via SETUP.md om samen te werken.'}</div>`
    : '';
}

// ---------- drag and drop ----------
function mountSortables() {
  if (!window.Sortable) return;
  app.querySelectorAll('.sortable, .sortable-tiles').forEach((el) => {
    const kind = el.dataset.drop;
    const opts = {
      group: el.dataset.group,
      animation: 150,
      delay: 180,
      delayOnTouchOnly: true,
      ghostClass: 'drag-ghost',
      onEnd: onSortEnd,
    };
    if (kind === 'cats') opts.handle = '.grip';
    else if (kind === 'projects') opts.draggable = '[data-id]';
    else { opts.filter = 'button, input, a, label'; opts.preventOnFilter = false; }
    window.Sortable.create(el, opts);
  });
}

function onSortEnd(evt) {
  const todoPatches = [];
  const catPatches = [];
  const projectPatches = [];
  for (const c of new Set([evt.from, evt.to])) {
    const kind = c.dataset.drop;
    [...c.children].filter((el) => el.dataset.id).forEach((el, i) => {
      const order = (i + 1) * 10;
      if (kind === 'cats') {
        const cat = S.byId('categories', el.dataset.id);
        if (cat && cat.order !== order) catPatches.push({ ...cat, order });
        return;
      }
      if (kind === 'projects') {
        const p = S.byId('projects', el.dataset.id);
        if (p && p.order !== order) projectPatches.push({ ...p, order });
        return;
      }
      const t = S.byId('todos', el.dataset.id);
      if (!t) return;
      const next = { ...t, order };
      if (kind === 'cat') next.category = c.dataset.category;
      if (kind === 'list') { next.listId = c.dataset.list; next.projectId = ''; next.category = ''; next.assignees = []; }
      if (kind === 'plist' && next.projectId !== c.dataset.project) {
        next.projectId = c.dataset.project;
        next.listId = '';
        next.category = '';
        if (t.listId || !t.assignees.length) next.assignees = S.defaultAssignees(next.projectId);
      }
      if (next.order !== t.order || next.category !== t.category || next.listId !== t.listId || next.projectId !== t.projectId) {
        todoPatches.push(next);
      }
    });
  }
  if (catPatches.length) S.upsertMany('categories', catPatches);
  if (projectPatches.length) S.upsertMany('projects', projectPatches);
  if (todoPatches.length) S.upsertMany('todos', todoPatches);
}

// ---------- actions ----------
function toggleDone(t) {
  if (!t || !S.canEdit(t)) return;
  const done = t.status !== 'done';
  S.upsert('todos', {
    ...t,
    status: done ? 'done' : 'open',
    doneAt: done ? new Date().toISOString() : '',
    doneBy: done ? S.state.me : '',
  });
  if (done) toast('Afgevinkt', 'Ongedaan maken', () => S.upsert('todos', t));
}

function toggleWeek(t) {
  const me = S.state.me;
  const st = S.weekStatus(t);
  const mon = mondayOf(todayISO());
  if (st.in) {
    if (st.manual && !st.auto) {
      S.upsert('todos', { ...t, inWeek: '' });
      toast('Uit je week gehaald');
    } else {
      toast('Staat automatisch in je week (dringend of deadline deze week). Gebruik daar "naar volgende week".');
    }
    return;
  }
  const next = { ...t, inWeek: t.inWeek && t.inWeek <= mon ? t.inWeek : mon, snoozeUntil: '' };
  let msg = 'Toegevoegd aan je week';
  if (!t.listId && !t.assignees.includes(me)) {
    next.assignees = [...t.assignees, me];
    msg = 'Aan jou toegewezen en toegevoegd aan je week';
  }
  S.upsert('todos', next);
  toast(msg);
}

function snooze(t) {
  const nextMon = addDays(mondayOf(todayISO()), 7);
  S.upsert('todos', { ...t, snoozeUntil: nextMon, inWeek: t.inWeek ? nextMon : '' });
  toast('Verschoven naar volgende week', 'Ongedaan maken', () => S.upsert('todos', t));
}

const goProject = (id) => { location.hash = `#/project/${encodeURIComponent(id)}`; };

const URG_CYCLE = ['', 'dringend', 'semi', 'lang'];
const URG_SHORT = { '': '!', dringend: 'Dringend', semi: 'Semi', lang: 'Lang' };

function handleQuickAddClick(e) {
  const dateBox = e.target.closest('.qa-date');
  if (dateBox) {
    const input = dateBox.querySelector('input');
    if (e.target !== input) e.preventDefault();
    try { input.showPicker(); } catch { input.focus(); }
    return true;
  }
  const b = e.target.closest('[data-qa]');
  if (!b) return false;
  if (b.dataset.qa === 'urgency') {
    const next = URG_CYCLE[(URG_CYCLE.indexOf(b.dataset.value || '') + 1) % URG_CYCLE.length];
    b.dataset.value = next;
    b.textContent = URG_SHORT[next];
    b.className = `qa-btn${next ? ` set u-${next}` : ''}`;
    b.setAttribute('aria-label', `Urgentie: ${next ? URGENCY[next] : 'geen'}`);
  } else if (b.dataset.qa === 'waiting') {
    const on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(on));
    b.classList.toggle('set', on);
  }
  b.closest('.quickadd').querySelector('input.add').focus();
  return true;
}

app.addEventListener('click', (e) => {
  if (handleQuickAddClick(e)) return;
  const el = e.target.closest('[data-action]');
  if (!el || !app.contains(el)) return;
  const card = el.closest('.todo');
  const t = card ? S.byId('todos', card.dataset.id) : null;
  const id = el.dataset.id;
  switch (el.dataset.action) {
    case 'toggle-done': return toggleDone(t);
    case 'open-todo': return t && openTodoDialog(t);
    case 'toggle-week': return t && toggleWeek(t);
    case 'snooze': return t && snooze(t);
    case 'unweek': S.upsert('todos', { ...t, inWeek: '' }); return toast('Uit je week gehaald');
    case 'claim':
      S.upsert('todos', { ...t, assignees: [S.state.me] });
      return toast('Aan jou toegewezen');
    case 'new-todo': return openTodoDialog(null, { projectId: el.dataset.project });
    case 'new-project': return openProjectDialog(null, goProject);
    case 'new-subproject': return openProjectDialog(null, goProject, { parentId: id });
    case 'edit-project': return openProjectDialog(S.byId('projects', id));
    case 'template-project': return openTemplateDialog(S.byId('projects', id), goProject);
    case 'add-event': return openEventDialog(S.byId('projects', id));
    case 'edit-event': {
      const p = S.byId('projects', route().arg);
      const ev = p?.events.find((x) => x.id === el.dataset.eid);
      return ev && openEventDialog(p, ev);
    }
    case 'mat-cycle':
    case 'mat-delete': {
      const p = S.byId('projects', route().arg);
      const mid = el.closest('[data-mid]')?.dataset.mid;
      if (!p || !mid) return;
      const order = ['nodig', 'besteld', 'klaar'];
      const materials = el.dataset.action === 'mat-delete'
        ? p.materials.filter((m) => m.id !== mid)
        : p.materials.map((m) => (m.id === mid ? { ...m, status: order[(order.indexOf(m.status) + 1) % order.length] } : m));
      return S.upsert('projects', { ...p, materials });
    }
    case 'link-contact': return openLinkContactDialog(S.byId('projects', id));
    case 'add-link': return openLinkDialog(S.byId('projects', id));
    case 'edit-link': {
      const p = S.byId('projects', route().arg);
      return p && openLinkDialog(p, Number(el.dataset.index));
    }
    case 'unlink-contact': {
      const p = S.byId('projects', el.dataset.project);
      if (p) S.upsert('projects', { ...p, contactIds: p.contactIds.filter((x) => x !== id) });
      return;
    }
    case 'new-contact': return openContactDialog(null);
    case 'edit-contact': return openContactDialog(S.byId('contacts', id));
    case 'export':
      el.disabled = true;
      exportProjects(viewUi.exportArchived)
        .then((n) => toast(`Excel-bestand gemaakt met ${n} project(en)`))
        .catch((err) => toast(err.message))
        .finally(() => { el.disabled = false; });
      return;
    case 'archive-project': {
      const p = S.byId('projects', id);
      if (!p) return;
      if (!p.archived && !confirm(`Project "${p.title}" archiveren? Het verdwijnt van het overzicht maar blijft in het archief.`)) return;
      S.upsert('projects', { ...p, archived: !p.archived });
      return toast(p.archived ? 'Project teruggezet' : 'Project gearchiveerd');
    }
    case 'toggle-show-done':
      viewUi.showDone[el.dataset.key] = !viewUi.showDone[el.dataset.key];
      return render();
    case 'toggle-show-done-lists':
      viewUi.showDoneLists = !viewUi.showDoneLists;
      return render();
    case 'new-list': return openListDialog(null);
    case 'edit-list': return openListDialog(S.byId('lists', id));
    case 'delete-category': {
      const c = S.byId('categories', id);
      const n = S.state.todos.filter((x) => x.category === id).length;
      if (!c || !confirm(`Categorie "${c.name}" verwijderen?${n ? ` De ${n} to-do's erin komen onder "Zonder categorie".` : ''}`)) return;
      return S.remove('categories', id);
    }
    case 'reset-demo':
      if (!confirm('Alle demogegevens in deze browser vervangen door de voorbeeldgegevens?')) return;
      S.DemoBackend.reset();
      return location.reload();
    case 'logout': return auth?.logout();
  }
});

app.addEventListener('keydown', (e) => {
  // keyboard: Enter/Space on a card opens it
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.todo-main')) {
    e.preventDefault();
    const t = S.byId('todos', e.target.closest('.todo').dataset.id);
    if (t) openTodoDialog(t);
    return;
  }
  const inp = e.target.closest('input[data-add]');
  if (!inp || e.key !== 'Enter') return;
  e.preventDefault();
  const title = inp.value.trim();
  if (!title) return;
  inp.value = '';
  const opts = quickAddOptions(inp);
  switch (inp.dataset.add) {
    case 'project': {
      const t = S.newTodo({ title, projectId: inp.dataset.project, category: inp.dataset.category, ...opts });
      S.upsert('todos', t);
      if (S.weekStatus(t).in) toast('Toegevoegd, en staat in je week');
      else if (opts.dueDate && S.weekStatus(t, t.assignees[0]).in) toast(`Toegevoegd, en staat in de week van ${S.userName(t.assignees[0])}`);
      break;
    }
    case 'list':
      S.upsert('todos', S.newTodo({ title, listId: inp.dataset.list, ...opts }));
      break;
    case 'week': {
      const l = S.ensureMyList();
      S.upsert('todos', S.newTodo({ title, listId: l.id, inWeek: mondayOf(todayISO()), ...opts }));
      toast(`Toegevoegd aan je week (lijst "${l.name}")`);
      break;
    }
    case 'material': {
      const p = S.byId('projects', inp.dataset.project);
      if (p) S.upsert('projects', { ...p, materials: [...p.materials, { id: uid(), name: title, qty: '', status: 'nodig' }] });
      break;
    }
    case 'category': {
      const max = Math.max(0, ...S.state.categories.map((c) => c.order));
      S.upsert('categories', { id: uid(), name: title, order: max + 10 });
      break;
    }
  }
});

document.addEventListener('change', (e) => {
  if (e.target.matches('[data-demo-me]')) {
    S.DemoBackend.setMe(e.target.value);
    location.reload();
  }
  if (e.target.matches('[data-qa="date"]')) {
    const box = e.target.closest('.qa-date');
    box.querySelector('.qa-date-text').textContent = e.target.value ? fmtDate(e.target.value) : '';
    box.classList.toggle('set', !!e.target.value);
  }
  if (e.target.matches('[data-export-archived]')) viewUi.exportArchived = e.target.checked;
  const matId = e.target.dataset?.matQty;
  if (matId) {
    const p = S.byId('projects', route().arg);
    if (p) S.upsert('projects', { ...p, materials: p.materials.map((m) => (m.id === matId ? { ...m, qty: e.target.value.trim() } : m)) });
  }
  const catId = e.target.dataset?.catName;
  if (catId) {
    const c = S.byId('categories', catId);
    const name = e.target.value.trim();
    if (c && name && name !== c.name) S.upsert('categories', { ...c, name });
  }
});

app.addEventListener('input', (e) => {
  if (e.target.matches('[data-contact-search]')) {
    viewUi.contactQuery = e.target.value;
    render();
  }
});

// ---------- start ----------
function showFatal(msg) {
  app.innerHTML = `<div class="panel alert fatal"><h2>Er ging iets mis</h2><p>${esc(msg)}</p>
    <p><button class="btn" onclick="location.reload()">Opnieuw proberen</button></p></div>`;
}

async function start() {
  renderBanner();
  S.onSaveError((err) => {
    toast(`Opslaan mislukt: ${err.message}. De gegevens worden opnieuw geladen.`);
    S.reload().catch(() => {});
  });
  S.onPendingChange((n) => document.body.classList.toggle('saving', n > 0));
  S.subscribe(render);
  window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });

  try {
    if (demo) {
      await S.init(new S.DemoBackend(), 'demo');
    } else {
      auth = createAuth(CONFIG.clientId);
      await auth.init();
      await S.init(new S.SheetBackend(CONFIG.apiUrl, auth), 'sheet');
      if (!S.state.scriptVersion) {
        document.getElementById('banner').innerHTML = '<div class="banner">Het Apps Script is verouderd: contacten kunnen nog niet bewaard worden. '
          + 'Plak de nieuwe <a href="https://github.com/drmayerson/et-outreach-planning/blob/main/apps-script/Code.gs" target="_blank" rel="noopener">Code.gs</a> '
          + 'en kies Implementeren → Implementaties beheren → Bewerken → Nieuwe versie.</div>';
      }
      // pick up your colleague's changes
      const refresh = () => {
        if (document.visibilityState === 'visible' && !dialog.open) S.reload().catch(() => {});
      };
      setInterval(refresh, 60_000);
      document.addEventListener('visibilitychange', refresh);
    }
  } catch (err) {
    console.error(err);
    showFatal(err.message || String(err));
  }
}

start();
