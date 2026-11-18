// Entry point: start-up, rendering, navigation, clicks and drag-and-drop.
import { CONFIG } from './config.js';
import * as S from './store.js';
import { createAuth } from './auth.js';
import { renderView, route, ui as viewUi } from './views.js';
import { icon, toast, openTodoDialog, openProjectDialog, openListDialog } from './ui.js';
import { uid, esc, todayISO, mondayOf, addDays } from './util.js';

const app = document.getElementById('app');
const dialog = document.getElementById('dialog');
const demo = !(CONFIG.clientId && CONFIG.apiUrl);
let auth = null;

// ---------- rendering ----------
const NAV = { home: 'home', project: 'home', week: 'week', lijsten: 'lijsten', archief: 'archief', instellingen: 'instellingen' };
const TITLES = { home: 'Overzicht', week: 'Deze week', lijsten: 'Lijsten', archief: 'Archief', instellingen: 'Instellingen' };

function render() {
  if (!S.state.ready) return;
  // keep focus and half-typed text in quick-add fields across re-renders
  const active = document.activeElement;
  const focusKey = app.contains(active) ? active?.dataset?.focusKey : null;
  const typed = focusKey ? active.value : '';

  const r = route();
  app.innerHTML = renderView(r);
  document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('on', a.dataset.nav === NAV[r.name]));
  const projTitle = r.name === 'project' ? S.byId('projects', r.arg)?.title : '';
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
    ? '<div class="banner">Demomodus: de gegevens blijven in deze browser. Koppel de Google Sheet via SETUP.md om samen te werken.</div>'
    : '';
}

// ---------- drag and drop ----------
function mountSortables() {
  if (!window.Sortable) return;
  app.querySelectorAll('.sortable').forEach((el) => {
    window.Sortable.create(el, {
      group: el.dataset.group,
      animation: 150,
      delay: 180,
      delayOnTouchOnly: true,
      handle: el.dataset.drop === 'cats' ? '.grip' : undefined,
      filter: el.dataset.drop === 'cats' ? undefined : 'button, input, a',
      preventOnFilter: false,
      ghostClass: 'drag-ghost',
      onEnd: onSortEnd,
    });
  });
}

function onSortEnd(evt) {
  const todoPatches = [];
  const catPatches = [];
  for (const c of new Set([evt.from, evt.to])) {
    const kind = c.dataset.drop;
    [...c.children].filter((el) => el.dataset.id).forEach((el, i) => {
      const order = (i + 1) * 10;
      if (kind === 'cats') {
        const cat = S.byId('categories', el.dataset.id);
        if (cat && cat.order !== order) catPatches.push({ ...cat, order });
        return;
      }
      const t = S.byId('todos', el.dataset.id);
      if (!t) return;
      const next = { ...t, order };
      if (kind === 'cat') next.category = c.dataset.category;
      if (kind === 'list') { next.listId = c.dataset.list; next.projectId = ''; next.category = ''; next.assignees = []; }
      if (next.order !== t.order || next.category !== t.category || next.listId !== t.listId) todoPatches.push(next);
    });
  }
  if (catPatches.length) S.upsertMany('categories', catPatches);
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

app.addEventListener('click', (e) => {
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
    case 'edit-project': return openProjectDialog(S.byId('projects', id));
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
  switch (inp.dataset.add) {
    case 'project':
      S.upsert('todos', S.newTodo({ title, projectId: inp.dataset.project, category: inp.dataset.category }));
      break;
    case 'list':
      S.upsert('todos', S.newTodo({ title, listId: inp.dataset.list }));
      break;
    case 'week': {
      const l = S.ensureMyList();
      S.upsert('todos', S.newTodo({ title, listId: l.id, inWeek: mondayOf(todayISO()) }));
      toast(`Toegevoegd aan je week (lijst "${l.name}")`);
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
  const catId = e.target.dataset?.catName;
  if (catId) {
    const c = S.byId('categories', catId);
    const name = e.target.value.trim();
    if (c && name && name !== c.name) S.upsert('categories', { ...c, name });
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
