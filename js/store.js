// App state, the two storage back-ends (demo in this browser / Google Sheet) and domain rules.
import { uid, todayISO, mondayOf, addDays, fmtDate } from './util.js';
import { demoSeed } from './demo.js';

// Field types per entity: s = text, a = list (stored as JSON), b = yes/no, n = number.
export const SCHEMA = {
  users: { email: 's', name: 's' },
  categories: { id: 's', name: 's', order: 'n' },
  lists: { id: 's', owner: 's', name: 's', order: 'n' },
  contacts: {
    id: 's', name: 's', organisation: 's', role: 's', email: 's', phone: 's', notes: 's',
    createdAt: 's', updatedAt: 's',
  },
  projects: {
    id: 's', title: 's', description: 's', parentId: 's', trekkers: 'a', dropboxUrl: 's', links: 'a',
    events: 'a', materials: 'a', contactIds: 'a',
    archived: 'b', createdAt: 's', createdBy: 's', updatedAt: 's',
  },
  todos: {
    id: 's', title: 's', description: 's', projectId: 's', listId: 's', category: 's',
    assignees: 'a', urgency: 's', status: 's', waitingFor: 's', followUp: 's', dueDate: 's', links: 'a',
    subtasks: 'a', notes: 's', inWeek: 's', snoozeUntil: 's', order: 'n', doneAt: 's',
    doneBy: 's', archived: 'b', history: 'a', createdAt: 's', createdBy: 's', updatedAt: 's',
  },
};
const ENTITIES = Object.keys(SCHEMA);

export const state = {
  ready: false, mode: 'demo', me: '',
  users: [], categories: [], lists: [], contacts: [], projects: [], todos: [],
};

// ---------- change notification ----------
const listeners = new Set();
export const subscribe = (fn) => listeners.add(fn);
export const emit = () => listeners.forEach((fn) => fn());

let pending = 0;
let pendingListener = () => {};
let errorHandler = (err) => console.error(err);
export const onPendingChange = (fn) => { pendingListener = fn; };
export const onSaveError = (fn) => { errorHandler = fn; };
export const isSaving = () => pending > 0;

// ---------- normalisation ----------
export function normalize(entity, o) {
  const out = {};
  for (const [k, t] of Object.entries(SCHEMA[entity])) {
    const v = o[k];
    if (t === 'a') {
      if (Array.isArray(v)) out[k] = v;
      else if (typeof v === 'string' && v.trim()) {
        try {
          const p = JSON.parse(v);
          out[k] = Array.isArray(p) ? p : [];
        } catch {
          out[k] = v.split(',').map((x) => x.trim()).filter(Boolean);
        }
      } else out[k] = [];
    } else if (t === 'b') out[k] = v === true || v === 'true' || v === 'TRUE';
    else if (t === 'n') out[k] = Number(v) || 0;
    else out[k] = v == null ? '' : String(v);
  }
  if (entity === 'users') out.email = out.email.trim().toLowerCase();
  return out;
}

// ---------- loading & saving ----------
let backend = null;
let queue = Promise.resolve();

function applyData(data) {
  for (const e of ENTITIES) state[e] = (data[e] || []).map((o) => normalize(e, o)).filter((o) => o.id || o.email);
  state.me = String(data.me || '').toLowerCase();
  state.scriptVersion = String(data.scriptVersion || '');
  state.ready = true;
  emit();
}

export async function init(b, mode) {
  backend = b;
  state.mode = mode;
  applyData(await b.load());
}

/** Fetch the latest data (e.g. your colleague's changes) unless local edits are still being saved. */
export async function reload() {
  if (!backend || pending) return;
  const data = await backend.load();
  if (!pending) applyData(data);
}

function enqueue(fn) {
  pending++;
  pendingListener(pending);
  queue = queue
    .then(fn)
    .catch((err) => errorHandler(err))
    .finally(() => {
      pending--;
      pendingListener(pending);
    });
}

export function upsertMany(entity, objs) {
  if (!objs.length) return;
  const now = new Date().toISOString();
  const clean = objs.map((o) => {
    const next = normalize(entity, { ...o, updatedAt: now });
    if (entity === 'todos') addHistory(state.todos.find((x) => x.id === next.id), next, now);
    return next;
  });
  for (const o of clean) {
    const arr = state[entity];
    const i = arr.findIndex((x) => x.id === o.id);
    if (i >= 0) arr[i] = o;
    else arr.push(o);
  }
  emit();
  enqueue(() => backend.saveMany(entity, clean));
}
export const upsert = (entity, obj) => upsertMany(entity, [obj]);

export function remove(entity, ids) {
  const list = [].concat(ids);
  state[entity] = state[entity].filter((x) => !list.includes(x.id));
  emit();
  enqueue(() => backend.removeMany(entity, list));
}

// ---------- back-ends ----------
const DEMO_KEY = 'planningstool-demo-v2';
const DEMO_ME = 'planningstool-demo-me';

export class DemoBackend {
  constructor() { this.mem = null; }
  read() {
    if (this.mem) return this.mem;
    try { this.mem = JSON.parse(localStorage.getItem(DEMO_KEY)); } catch { this.mem = null; }
    return this.mem;
  }
  write() {
    try { localStorage.setItem(DEMO_KEY, JSON.stringify(this.mem)); } catch { /* memory only */ }
  }
  async load() {
    if (!this.read()) { this.mem = demoSeed(); this.write(); }
    for (const e of ENTITIES) this.mem[e] ??= [];
    let me = '';
    try { me = localStorage.getItem(DEMO_ME) || ''; } catch { /* ignore */ }
    if (!this.mem.users.some((u) => u.email === me)) me = this.mem.users[0].email;
    return structuredClone({ ...this.mem, me });
  }
  async saveMany(entity, objs) {
    const d = this.read();
    d[entity] ??= [];
    for (const o of objs) {
      const i = d[entity].findIndex((x) => x.id === o.id);
      if (i >= 0) d[entity][i] = o;
      else d[entity].push(o);
    }
    this.write();
  }
  async removeMany(entity, ids) {
    const d = this.read();
    d[entity] = (d[entity] || []).filter((x) => !ids.includes(x.id));
    this.write();
  }
  static setMe(email) { try { localStorage.setItem(DEMO_ME, email); } catch { /* ignore */ } }
  static reset() { try { localStorage.removeItem(DEMO_KEY); } catch { /* ignore */ } }
}

export class SheetBackend {
  constructor(url, auth) { this.url = url; this.auth = auth; }
  async call(payload, retry = true) {
    const token = await this.auth.getToken();
    let res;
    try {
      res = await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // keeps the request "simple" (no CORS preflight)
        body: JSON.stringify({ ...payload, token }),
      });
    } catch {
      throw new Error('Geen verbinding met de Google Sheet.');
    }
    const j = await res.json().catch(() => ({ ok: false, error: 'Onverwacht antwoord van de server.' }));
    if (!j.ok) {
      if (retry && /aanmelding/i.test(j.error || '')) {
        this.auth.clearToken();
        return this.call(payload, false);
      }
      if (/onbekende tabel/i.test(j.error || '')) {
        throw new Error('het Apps Script is verouderd. Plak de nieuwe Code.gs en maak een nieuwe versie (zie SETUP.md)');
      }
      throw new Error(j.error || 'Serverfout');
    }
    return j.data;
  }
  load() { return this.call({ action: 'load' }); }
  saveMany(entity, objs) { return this.call({ action: 'saveMany', entity, objs }); }
  removeMany(entity, ids) { return this.call({ action: 'removeMany', entity, ids }); }
}

// ---------- lookups ----------
export const byId = (entity, id) => (id ? state[entity].find((x) => x.id === id) : undefined);
export const user = (email) => state.users.find((u) => u.email === email);
export const userName = (email) => user(email)?.name || String(email || '').split('@')[0];
export const initials = (email) =>
  userName(email).split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
export const sortByOrder = (arr) =>
  [...arr].sort((a, b) => a.order - b.order || String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
const byTitle = (a, b) => a.title.localeCompare(b.title, 'nl');
export const myLists = (email = state.me) => sortByOrder(state.lists.filter((l) => l.owner === email));

// ---------- projects & sub-projects ----------
export const parentOf = (p) => byId('projects', p?.parentId);
export const subProjects = (id) => state.projects.filter((p) => p.parentId === id).sort(byTitle);
export const hasSubProjects = (id) => state.projects.some((p) => p.parentId === id);

/** A project is active when neither it nor its parent is archived. */
export function isProjectActive(p) {
  if (!p || p.archived) return false;
  const parent = parentOf(p);
  return !parent || !parent.archived;
}
/** Top-level projects for the home page. */
export const activeProjects = () => state.projects.filter((p) => !p.parentId && !p.archived).sort(byTitle);
/** All active projects, each followed by its sub-projects (for pickers). */
export function activeProjectTree() {
  const out = [];
  for (const p of activeProjects()) {
    out.push(p);
    out.push(...subProjects(p.id).filter((s) => !s.archived));
  }
  return out;
}
export function projectLabel(p) {
  if (!p) return '';
  const parent = parentOf(p);
  return parent ? `${parent.title} › ${p.title}` : p.title;
}
/** The project itself plus its sub-projects. */
export const projectFamilyIds = (id) => [id, ...state.projects.filter((p) => p.parentId === id).map((p) => p.id)];

/** Dated activities of active projects, overlapping [from, to]. With email: only projects that person leads. */
export function eventsBetween(from, to, email) {
  const out = [];
  for (const p of state.projects) {
    if (!isProjectActive(p)) continue;
    if (email && !p.trekkers.includes(email)) continue;
    for (const ev of p.events) {
      if (!ev.date) continue;
      const end = ev.endDate || ev.date;
      if (ev.date <= to && end >= from) out.push({ ...ev, project: p });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export const contactsOf = (p) =>
  (p.contactIds || []).map((id) => byId('contacts', id)).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name, 'nl'));
export const projectsOfContact = (id) => state.projects.filter((p) => p.contactIds.includes(id)).sort(byTitle);

// ---------- to-dos ----------
export function newTodo(fields = {}) {
  return {
    id: uid(), title: '', status: 'open', urgency: '', assignees: [], subtasks: [], links: [],
    createdAt: new Date().toISOString(), createdBy: state.me, order: Date.now(), ...fields,
  };
}

/** Make sure the current user has at least one personal list (for quick-adding to "this week"). */
export function ensureMyList() {
  const lists = myLists();
  if (lists.length) return lists[0];
  const l = { id: uid(), owner: state.me, name: 'Algemeen', order: 10 };
  upsert('lists', l);
  return l;
}

export function isOpen(t) {
  if (t.status === 'done' || t.archived) return false;
  if (t.projectId) return isProjectActive(byId('projects', t.projectId));
  return true;
}
export const openTodos = () => state.todos.filter(isOpen);

/** A personal to-do belongs to the list owner; a project to-do to its assignees. */
export function isMine(t, email = state.me) {
  if (t.listId) return byId('lists', t.listId)?.owner === email;
  return t.assignees.includes(email);
}
export const isUnassigned = (t) => !t.listId && !!t.projectId && t.assignees.length === 0;

/** Personal lists can only be changed by their owner; everything shared can be changed by everyone. */
export const canEdit = (t) => !t.listId || byId('lists', t.listId)?.owner === state.me;

export function contextLabel(t) {
  if (t.projectId) return projectLabel(byId('projects', t.projectId));
  if (t.listId) {
    const l = byId('lists', t.listId);
    return l ? `Lijst: ${l.name}` : '';
  }
  return '';
}

/**
 * Is t in this week's view of `email`?
 * auto    = "dringend", a due date up to Sunday (overdue included), or a "wachten op" follow-up date up to Sunday
 * manual  = added by hand this week or earlier (unfinished items roll over)
 * snoozed = pushed to next week
 */
export function weekStatus(t, email = state.me, today = todayISO()) {
  if (!isOpen(t) || !isMine(t, email)) return { in: false, manual: false, auto: false, snoozed: false };
  const mon = mondayOf(today);
  const sun = addDays(mon, 6);
  const snoozed = !!t.snoozeUntil && t.snoozeUntil > today;
  const manual = !!t.inWeek && t.inWeek <= mon;
  const auto = t.urgency === 'dringend'
    || (!!t.dueDate && t.dueDate <= sun)
    || (t.status === 'waiting' && !!t.followUp && t.followUp <= sun);
  return { in: !snoozed && (manual || auto), manual, auto, snoozed };
}

const URG_RANK = { dringend: 0, semi: 1, '': 2, lang: 3 };
export function sortTodos(arr, today = todayISO()) {
  return [...arr].sort((a, b) => {
    const la = a.dueDate && a.dueDate < today ? 0 : 1;
    const lb = b.dueDate && b.dueDate < today ? 0 : 1;
    if (la !== lb) return la - lb;
    const da = a.dueDate || '9999';
    const db = b.dueDate || '9999';
    if (da !== db) return da.localeCompare(db);
    return (URG_RANK[a.urgency] ?? 2) - (URG_RANK[b.urgency] ?? 2) || a.order - b.order;
  });
}

export const weekItems = (email) => sortTodos(state.todos.filter((t) => weekStatus(t, email).in));

// ---------- to-do history ----------
const STATUS_NL = { open: 'open', waiting: 'wachten op', done: 'klaar' };
const URG_NL = { dringend: 'dringend', semi: 'semi-dringend', lang: 'lange termijn', '': 'geen' };
const d = (s) => (s ? fmtDate(s, true) : '–');
const names = (emails) => emails.map(userName).join(', ') || 'niemand';

function describeChange(prev, next) {
  if (!prev) return ['aangemaakt'];
  const out = [];
  if (prev.title !== next.title) out.push('titel gewijzigd');
  if (prev.status !== next.status) out.push(`status: ${STATUS_NL[prev.status] || prev.status} → ${STATUS_NL[next.status] || next.status}`);
  if (prev.dueDate !== next.dueDate) out.push(`deadline: ${d(prev.dueDate)} → ${d(next.dueDate)}`);
  if (prev.urgency !== next.urgency) out.push(`urgentie: ${URG_NL[prev.urgency] ?? prev.urgency} → ${URG_NL[next.urgency] ?? next.urgency}`);
  if ([...prev.assignees].sort().join() !== [...next.assignees].sort().join()) out.push(`toegewezen aan ${names(next.assignees)}`);
  if (prev.projectId !== next.projectId || prev.listId !== next.listId) out.push(`verplaatst naar ${contextLabel(next) || '–'}`);
  else if (prev.category !== next.category) out.push(`categorie: ${byId('categories', next.category)?.name || 'zonder categorie'}`);
  if (next.waitingFor && prev.waitingFor !== next.waitingFor) out.push(`wachten op: ${next.waitingFor}`);
  if (prev.followUp !== next.followUp) out.push(`opvolgen: ${d(next.followUp)}`);
  if (prev.snoozeUntil !== next.snoozeUntil && next.snoozeUntil) out.push('naar volgende week geschoven');
  else if (prev.inWeek !== next.inWeek) out.push(next.inWeek ? 'in de week gezet' : 'uit de week gehaald');
  if (prev.description !== next.description) out.push('beschrijving gewijzigd');
  if (prev.notes !== next.notes) out.push('notities gewijzigd');
  if (JSON.stringify(prev.subtasks) !== JSON.stringify(next.subtasks)) out.push('subtaken gewijzigd');
  if (JSON.stringify(prev.links) !== JSON.stringify(next.links)) out.push('links gewijzigd');
  return out;
}

function addHistory(prev, next, now) {
  const changes = describeChange(prev, next);
  const base = prev ? prev.history : next.history;
  next.history = changes.length
    ? [...base, { at: now, by: state.me, text: changes.join(' · ') }].slice(-30)
    : base;
}
