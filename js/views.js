// The pages. Each view returns an HTML string; app.js wires up clicks and drag-and-drop.
import * as S from './store.js';
import { esc, todayISO, addDays, mondayOf, fmtDate, weekNumber, safeUrl } from './util.js';
import {
  icon, cards, empty, avatars, eventDateText, colorVar, quickAdd, projectLinks,
} from './ui.js';
import { linkLabel } from './util.js';

export const ui = { showDone: {}, showDoneLists: false, contactQuery: '', exportArchived: false };

export function route() {
  const [name = '', arg = ''] = location.hash.replace(/^#\/?/, '').split('/');
  return { name: name || 'home', arg: decodeURIComponent(arg) };
}

export function renderView(r = route()) {
  switch (r.name) {
    case 'project': return projectView(r.arg);
    case 'week': return weekView();
    case 'lijsten': return listsView(r.arg);
    case 'contacten': return contactsView();
    case 'archief': return archiveView();
    case 'instellingen': return settingsView();
    default: return homeView();
  }
}

// Sortable containers must contain only cards (no whitespace) so CSS :empty shows the drop hint.
const dropZone = (attrs, items, hint = 'Sleep een to-do hierheen') =>
  `<div class="todo-list sortable" ${attrs} data-empty="${esc(hint)}">${items}</div>`;

const projectHref = (id) => `#/project/${encodeURIComponent(id)}`;

function eventRow(ev, withProject) {
  return `<div class="event">
    <span class="event-date">${icon('calendar')}${esc(eventDateText(ev))}</span>
    <span class="event-text">${esc(ev.label || 'Activiteit')}${withProject ? ` · <a href="${projectHref(ev.project.id)}">${esc(S.projectLabel(ev.project))}</a>` : ''}</span>
    ${ev.location ? `<span class="event-loc">${icon('pin')}${esc(ev.location)}</span>` : ''}
  </div>`;
}

// ---------- home ----------
function homeView() {
  const today = todayISO();
  const until = addDays(today, 14);
  const me = S.state.me;
  const open = S.openTodos();
  const relevant = open.filter((t) => S.isMine(t, me) || S.isUnassigned(t));
  const overdue = S.sortTodos(relevant.filter((t) => t.dueDate && t.dueDate < today));
  const soon = S.sortTodos(relevant.filter((t) => t.dueDate && t.dueDate >= today && t.dueDate <= until));
  const unassigned = S.sortTodos(open.filter(S.isUnassigned));
  const events = S.eventsBetween(today, until);
  const projects = S.activeProjects();
  const mine = projects.filter((p) => S.isMyProject(p, me));
  const others = projects.filter((p) => !S.isMyProject(p, me));
  const all = S.sortTodos(open.filter((t) => t.projectId || S.isMine(t, me)));

  const side = `
    ${overdue.length ? `<section class="panel alert"><h2>Te laat <span class="count">${overdue.length}</span></h2>
      <div class="todo-list">${cards(overdue, { context: true })}</div></section>` : ''}
    <section class="panel"><h2>Binnenkort <span class="sub">volgende 14 dagen</span></h2>
      ${events.length ? `<div class="events">${events.map((ev) => eventRow(ev, true)).join('')}</div>` : ''}
      ${soon.length ? `<div class="todo-list">${cards(soon, { context: true })}</div>` : events.length ? '' : empty('Geen deadlines of activiteiten in de komende 14 dagen.')}</section>
    <section class="panel"><h2>Niet toegewezen <span class="count">${unassigned.length}</span></h2>
      ${unassigned.length ? `<div class="todo-list">${cards(unassigned, { context: true, claim: true })}</div>` : empty('Alles is toegewezen.')}</section>
    <section class="panel"><h2>Alle to-do's <span class="count">${all.length}</span></h2>
      <p class="hint">Alle open to-dos van de projecten en je eigen lijsten. Met ${icon('calPlus')} zet je er een in je week.</p>
      ${all.length ? `<div class="todo-list scroll-list">${cards(all, { context: true })}</div>` : empty('Geen open to-dos.')}</section>`;

  return `<div class="home">
    <aside class="home-side">${side}</aside>
    <section class="home-main">
      <div class="page-head"><h1>Mijn projecten</h1><p class="hint">Sleep de tegels om de volgorde te wijzigen.</p></div>
      <div class="tiles sortable-tiles" data-group="projects-mine" data-drop="projects">${mine.map(projectTile).join('')}<button class="tile new" data-action="new-project">${icon('plus')}<span>Nieuw project</span></button></div>
      ${others.length ? `<div class="page-head others-head"><h2>Andere projecten</h2></div>
        <div class="tiles sortable-tiles" data-group="projects-others" data-drop="projects">${others.map(projectTile).join('')}</div>` : ''}
    </section></div>`;
}

function projectTile(p) {
  const today = todayISO();
  const family = S.projectFamilyIds(p.id);
  const subs = S.subProjects(p.id).filter((s) => !s.archived);
  const ts = S.state.todos.filter((t) => family.includes(t.projectId) && S.isOpen(t));
  const late = ts.filter((t) => t.dueDate && t.dueDate < today).length;
  const next = ts.filter((t) => t.dueDate && t.dueDate >= today).sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  const nextEvent = S.eventsBetween(today, '9999-12-31').find((ev) => family.includes(ev.project.id));
  return `<a class="tile${S.projectColor(p) ? ' colored' : ''}" href="${projectHref(p.id)}" data-id="${esc(p.id)}"${colorVar(p)}>
    <h3>${esc(p.title)}</h3>
    ${p.description ? `<p class="desc">${esc(p.description)}</p>` : ''}
    <div class="tile-foot">${avatars(p.trekkers)}
      <span class="stat">${ts.length} open${late ? ` · <b class="late">${late} te laat</b>` : ''}${subs.length ? ` · ${subs.length} sub` : ''}</span></div>
    ${nextEvent ? `<div class="next">${icon('calendar')}${esc(nextEvent.label || 'Activiteit')}: ${fmtDate(nextEvent.date)}</div>` : ''}
    ${next ? `<div class="next">Volgende deadline: ${fmtDate(next.dueDate)}</div>` : ''}
  </a>`;
}

// ---------- project ----------
function subProjectCard(s) {
  const open = S.state.todos.filter((t) => t.projectId === s.id && S.isOpen(t));
  const late = open.filter((t) => t.dueDate && t.dueDate < todayISO()).length;
  return `<a class="subcard${S.projectColor(s) ? ' colored' : ''}" href="${projectHref(s.id)}"${colorVar(s)}>
    <span class="subcard-title">${esc(s.title)}</span>
    <span class="subcard-meta">${avatars(s.trekkers)}<span>${open.length} to-do${open.length === 1 ? '' : "'s"}</span>${late ? `<b class="late">${late} te laat</b>` : ''}</span>
  </a>`;
}

function linksPanel(p) {
  const links = projectLinks(p);
  return `<section class="panel info"><h2>${icon('link')}Links <span class="count">${links.length}</span></h2>
    ${links.length ? `<div class="link-list">${links.map((l, i) => {
      const href = safeUrl(l.url);
      return `<div class="link-row">${icon(/dropbox/i.test(l.url) ? 'folder' : 'link')}
        ${href ? `<a href="${esc(href)}" target="_blank" rel="noopener">${esc(linkLabel(l))}</a>` : `<span>${esc(linkLabel(l))}</span>`}
        <button class="iconbtn" data-action="edit-link" data-index="${i}" title="Link bewerken">${icon('edit')}</button></div>`;
    }).join('')}</div>` : empty('Nog geen links, bv. de Dropbox-map of de website van het evenement.')}
    ${p.archived ? '' : `<button class="linkbtn" data-action="add-link" data-id="${esc(p.id)}">+ Link toevoegen</button>`}
  </section>`;
}

function contactChip(c, projectId) {
  const mail = safeUrl(c.email ? `mailto:${c.email}` : '');
  const tel = c.phone ? `tel:${c.phone.replace(/[^\d+]/g, '')}` : '';
  return `<div class="contact">
    <button class="contact-name linkbtn" data-action="edit-contact" data-id="${esc(c.id)}">${esc(c.name)}</button>
    ${c.organisation || c.role ? `<span class="muted">${esc([c.role, c.organisation].filter(Boolean).join(', '))}</span>` : ''}
    <span class="contact-actions">
      ${mail ? `<a class="iconbtn" href="${esc(mail)}" title="${esc(c.email)}">${icon('mail')}</a>` : ''}
      ${tel ? `<a class="iconbtn" href="${esc(tel)}" title="${esc(c.phone)}">${icon('phone')}</a>` : ''}
      ${projectId ? `<button class="iconbtn" data-action="unlink-contact" data-id="${esc(c.id)}" data-project="${esc(projectId)}" title="Loskoppelen van dit project">${icon('x')}</button>` : ''}
    </span></div>`;
}

function projectView(id) {
  const p = S.byId('projects', id);
  if (!p) return `<div class="crumbs"><a href="#/">← Overzicht</a></div>${empty('Dit project bestaat niet (meer).')}`;
  const parent = S.parentOf(p);
  const subs = parent ? [] : S.subProjects(id).filter((s) => !s.archived);
  const todos = S.state.todos.filter((t) => t.projectId === id && !t.archived);
  const open = todos.filter((t) => t.status !== 'done');
  const done = todos.filter((t) => t.status === 'done').sort((a, b) => (b.doneAt || '').localeCompare(a.doneAt || ''));
  const cats = S.sortByOrder(S.state.categories);
  const known = new Set(cats.map((c) => c.id));
  const groups = [...cats, { id: '', name: 'Zonder categorie' }];
  const archivedNote = p.archived ? ' <span class="tag">Gearchiveerd</span>' : parent?.archived ? ' <span class="tag">Hoofdproject gearchiveerd</span>' : '';

  const groupHtml = groups
    .map((g) => {
      const items = S.sortByOrder(open.filter((t) => (known.has(t.category) ? t.category : '') === g.id));
      if (g.id === '' && !items.length) return '';
      return `<section class="group">
        <h3>${esc(g.name)} <span class="count">${items.length}</span></h3>
        ${dropZone(`data-group="todos" data-drop="cat" data-category="${esc(g.id)}"`, cards(items))}
        ${p.archived ? '' : quickAdd(`data-add="project" data-project="${esc(id)}" data-category="${esc(g.id)}"`, '+ To-do toevoegen', `add-${id}-${g.id}`)}
      </section>`;
    })
    .join('');

  const contacts = S.contactsOf(p);
  const info = `<div class="info-grid">
    <section class="panel info"><h2>${icon('calendar')}Data en locaties <span class="count">${p.events.length}</span></h2>
      ${p.events.length ? `<div class="events">${[...p.events].sort((a, b) => a.date.localeCompare(b.date))
        .map((ev) => `<button class="event editable" data-action="edit-event" data-eid="${esc(ev.id)}">
          <span class="event-date">${esc(eventDateText(ev))}</span>
          <span class="event-text">${esc(ev.label || 'Activiteit')}</span>
          ${ev.location ? `<span class="event-loc">${icon('pin')}${esc(ev.location)}</span>` : ''}</button>`).join('')}</div>` : empty('Nog geen data.')}
      ${p.archived ? '' : `<button class="linkbtn" data-action="add-event" data-id="${esc(id)}">+ Datum toevoegen</button>`}
    </section>
    ${linksPanel(p)}
    <section class="panel info"><h2>${icon('users')}Contactpersonen <span class="count">${contacts.length}</span></h2>
      ${contacts.length ? `<div class="contact-list">${contacts.map((c) => contactChip(c, id)).join('')}</div>` : empty('Nog geen contactpersonen.')}
      <button class="linkbtn" data-action="link-contact" data-id="${esc(id)}">+ Contact koppelen</button>
    </section>
  </div>`;

  return `<div class="crumbs"><a href="#/">← Overzicht</a>${parent ? ` / <a href="${projectHref(parent.id)}">${esc(parent.title)}</a>` : ''}</div>
    <header class="page-head project-head${S.projectColor(p) ? ' colored' : ''}"${colorVar(p)}>
      <div class="head-text">
        <h1>${esc(p.title)}${archivedNote}</h1>
        ${p.description ? `<p class="lead">${esc(p.description)}</p>` : ''}
        <div class="meta-row">
          <span class="muted">Trekker: ${p.trekkers.length ? p.trekkers.map((e) => esc(S.userName(e))).join(', ') : 'nog niemand'}</span>
        </div>
      </div>
      <div class="head-actions">
        <button class="btn" data-action="new-todo" data-project="${esc(id)}">${icon('plus')}To-do</button>
        ${parent ? '' : `<button class="btn" data-action="new-subproject" data-id="${esc(id)}">${icon('plus')}Subproject</button>`}
        <button class="btn ghost" data-action="edit-project" data-id="${esc(id)}">${icon('edit')}Bewerken</button>
        <button class="btn ghost" data-action="template-project" data-id="${esc(id)}" title="Kopie maken als sjabloon">${icon('copy')}Kopie</button>
        <button class="btn ghost" data-action="archive-project" data-id="${esc(id)}">${icon('archive')}${p.archived ? 'Terugzetten' : 'Archiveren'}</button>
      </div>
    </header>
    ${subs.length ? `<section class="subprojects"><h2>Subprojecten <span class="count">${subs.length}</span></h2>
      <div class="subcards">${subs.map(subProjectCard).join('')}</div></section>` : ''}
    ${info}
    <h2 class="section-title">To-do's${subs.length ? ' <span class="sub">algemeen, voor het hele project</span>' : ''}</h2>
    <div class="groups">${groupHtml}</div>
    ${done.length ? `<button class="linkbtn" data-action="toggle-show-done" data-key="${esc(id)}">${ui.showDone[id] ? 'Verberg' : 'Toon'} afgewerkte to-do's (${done.length})</button>
      ${ui.showDone[id] ? `<div class="todo-list done-list">${cards(done)}</div>` : ''}` : ''}`;
}

// ---------- this week ----------
function weekView() {
  const today = todayISO();
  const mon = mondayOf(today);
  const sun = addDays(mon, 6);
  const me = S.state.me;
  const people = [S.user(me) || { email: me, name: S.userName(me) }, ...S.state.users.filter((u) => u.email !== me)];
  const panel = (u) => {
    const mine = u.email === me;
    const items = S.weekItems(u.email);
    const events = S.eventsBetween(mon, sun, u.email);
    return `<section class="panel week-panel${mine ? ' mine' : ''}">
      <h2>${mine ? 'Mijn week' : `Week van ${esc(u.name || u.email)}`} <span class="count">${items.length}</span></h2>
      ${events.length ? `<div class="events week-events">${events.map((ev) => eventRow(ev, true)).join('')}</div>` : ''}
      ${items.length ? `<div class="todo-list">${cards(items, mine ? { context: true, week: true } : { context: true, noActions: true })}</div>` : empty(mine ? 'Geen to-dos gepland deze week.' : 'Geen to-dos gepland.')}
      ${mine ? quickAdd('data-add="week"', '+ Iets toevoegen aan deze week', 'add-week') : ''}
    </section>`;
  };
  return `<header class="page-head"><div class="head-text"><h1>Deze week</h1>
      <p class="lead">Week ${weekNumber(today)} · ${fmtDate(mon, true)} – ${fmtDate(sun, true)}</p>
      <p class="hint">Dringende to-dos, deadlines en opvolgdata van deze week komen er vanzelf in, net als de activiteiten van projecten waarvan je trekker bent. Onafgewerkte items schuiven mee naar volgende week; te late staan bovenaan in rood.</p></div></header>
    <div class="week-grid">${people.map(panel).join('')}</div>`;
}

// ---------- personal lists ----------
function listsView(arg) {
  const me = S.state.me;
  const owner = arg && S.user(arg) ? arg : me;
  const mine = owner === me;
  const tabs = [S.user(me) || { email: me }, ...S.state.users.filter((u) => u.email !== me)]
    .map((u) => `<a class="tab${u.email === owner ? ' on' : ''}" href="#/lijsten/${encodeURIComponent(u.email)}">${
      u.email === me ? 'Mijn lijsten' : `Lijsten van ${esc(u.name || u.email)}`}</a>`)
    .join('');
  const lists = S.myLists(owner);
  const cols = lists
    .map((l) => {
      const items = S.sortByOrder(S.state.todos.filter((t) => t.listId === l.id && !t.archived && (ui.showDoneLists || t.status !== 'done')));
      return `<section class="column">
        <header class="col-head"><h3>${esc(l.name)}</h3><span class="count">${items.filter((t) => t.status !== 'done').length}</span>
          ${mine ? `<button class="iconbtn" data-action="edit-list" data-id="${esc(l.id)}" title="Lijst bewerken">${icon('edit')}</button>` : ''}</header>
        ${mine
          ? dropZone(`data-group="todos" data-drop="list" data-list="${esc(l.id)}"`, cards(items))
          : items.length ? `<div class="todo-list">${cards(items)}</div>` : empty('Leeg.')}
        ${mine ? quickAdd(`data-add="list" data-list="${esc(l.id)}"`, '+ To-do toevoegen', `add-l-${l.id}`) : ''}
      </section>`;
    })
    .join('');
  return `<header class="page-head"><div class="head-text"><h1>Lijsten</h1>
      <p class="hint">${mine
        ? 'Je persoonlijke lijsten. Sleep to-dos tussen lijsten; via een to-do kan je hem ook naar een project verplaatsen.'
        : 'Je kan de lijsten van je collega bekijken, niet aanpassen.'}</p></div>
      <div class="head-actions"><button class="linkbtn" data-action="toggle-show-done-lists">${ui.showDoneLists ? 'Verberg' : 'Toon'} afgewerkte</button></div></header>
    <nav class="tabs">${tabs}</nav>
    <div class="board">${cols}${mine ? `<button class="column new" data-action="new-list">${icon('plus')}Nieuwe lijst</button>` : ''}
      ${!lists.length && !mine ? empty('Nog geen lijsten.') : ''}</div>
    ${mine ? projectListsBoard() : ''}`;
}

/** The to-do list of every active project (yours first), so to-dos can be dragged between lists and projects. */
function projectListsBoard() {
  const me = S.state.me;
  const tops = S.activeProjects();
  const ordered = [...tops.filter((p) => S.isMyProject(p, me)), ...tops.filter((p) => !S.isMyProject(p, me))];
  const tree = ordered.flatMap((p) => [p, ...S.subProjects(p.id).filter((x) => !x.archived)]);
  const cols = tree
    .map((p) => {
      const items = S.sortByOrder(S.state.todos.filter((t) => t.projectId === p.id && !t.archived && (ui.showDoneLists || t.status !== 'done')));
      return `<section class="column project-col${S.projectColor(p) ? ' colored' : ''}"${colorVar(p)}>
        <header class="col-head"><h3><a href="${projectHref(p.id)}" title="Naar het project">${esc(S.projectLabel(p))}</a></h3>
          <span class="count">${items.filter((t) => t.status !== 'done').length}</span></header>
        ${dropZone(`data-group="todos" data-drop="plist" data-project="${esc(p.id)}"`, cards(items))}
        ${quickAdd(`data-add="project" data-project="${esc(p.id)}" data-category=""`, '+ To-do toevoegen', `add-pl-${p.id}`)}
      </section>`;
    })
    .join('');
  return `<h2 class="section-title">Projecten <span class="sub">sleep to-dos tussen je lijsten en projecten; klik op een titel om het project te openen</span></h2>
    <div class="board">${cols || empty('Nog geen projecten.')}</div>`;
}

// ---------- contacts ----------
function contactsView() {
  const q = ui.contactQuery.trim().toLowerCase();
  const all = [...S.state.contacts].sort((a, b) => a.name.localeCompare(b.name, 'nl'));
  const list = q
    ? all.filter((c) => [c.name, c.organisation, c.role, c.email, c.notes].join(' ').toLowerCase().includes(q))
    : all;
  const rows = list
    .map((c) => {
      const projects = S.projectsOfContact(c.id);
      return `<div class="contact-row">
        ${contactChip(c)}
        <span class="contact-projects">${projects.map((p) => `<a class="chip" href="${projectHref(p.id)}">${esc(S.projectLabel(p))}</a>`).join('')}</span>
      </div>`;
    })
    .join('');
  return `<header class="page-head"><div class="head-text"><h1>Contacten</h1>
      <p class="hint">Eén gedeelde lijst. Koppel contacten aan projecten via de projectpagina.</p></div>
      <div class="head-actions"><button class="btn" data-action="new-contact">${icon('plus')}Nieuw contact</button></div></header>
    <input class="search" type="search" placeholder="Zoek op naam, organisatie, functie…" value="${esc(ui.contactQuery)}" data-contact-search data-focus-key="contact-search" autocomplete="off">
    <section class="panel">${rows ? `<div class="contact-table">${rows}</div>` : empty(all.length ? 'Geen contacten gevonden.' : 'Nog geen contacten.')}</section>`;
}

// ---------- archive ----------
function archiveView() {
  const archived = S.state.projects.filter((p) => p.archived).sort((a, b) => S.projectLabel(a).localeCompare(S.projectLabel(b), 'nl'));
  const done = S.state.todos
    .filter((t) => t.status === 'done')
    .sort((a, b) => (b.doneAt || '').localeCompare(a.doneAt || ''))
    .slice(0, 100);
  return `<header class="page-head"><div class="head-text"><h1>Archief</h1>
      <p class="hint">Gearchiveerde projecten en afgewerkte to-dos. Niets gaat verloren; je kan alles terugzetten.</p></div></header>
    <section class="panel"><h2>Gearchiveerde projecten <span class="count">${archived.length}</span></h2>
      ${archived.length ? `<div class="archive-list">${archived.map((p) => `<div class="archive-row">
          <a href="${projectHref(p.id)}">${esc(S.projectLabel(p))}</a>
          <button class="btn small ghost" data-action="archive-project" data-id="${esc(p.id)}">Terugzetten</button></div>`).join('')}</div>`
        : empty('Nog geen gearchiveerde projecten.')}</section>
    <section class="panel"><h2>Laatst afgewerkt</h2>
      ${done.length ? `<div class="todo-list">${cards(done, { context: true })}</div>` : empty('Nog niets afgewerkt.')}</section>`;
}

// ---------- settings ----------
function settingsView() {
  const cats = S.sortByOrder(S.state.categories);
  const demo = S.state.mode === 'demo';
  return `<header class="page-head"><div class="head-text"><h1>Instellingen</h1></div></header>
    <div class="settings">
    <section class="panel"><h2>Exporteren</h2>
      <p>Een Excel-bestand met alle projecten en subprojecten: beschrijving, trekkers, data en locaties, en het aantal to-dos.</p>
      <label class="chk"><input type="checkbox" data-export-archived${ui.exportArchived ? ' checked' : ''}> Ook gearchiveerde projecten</label>
      <p><button class="btn" data-action="export">${icon('download')}Exporteren naar Excel</button></p>
    </section>
    <section class="panel"><h2>Categorieën</h2>
      <p class="hint">Gedeeld voor alle projecten. Sleep om de volgorde te wijzigen; een naam aanpassen werkt meteen.</p>
      <div class="cat-list sortable" data-group="cats" data-drop="cats">${cats.map((c) => `<div class="cat-row" data-id="${esc(c.id)}"><span class="grip" aria-hidden="true">⋮⋮</span><input value="${esc(c.name)}" data-cat-name="${esc(c.id)}" aria-label="Naam categorie" autocomplete="off"><button class="iconbtn" data-action="delete-category" data-id="${esc(c.id)}" title="Categorie verwijderen">${icon('x')}</button></div>`).join('')}</div>
      <input class="add" placeholder="+ Categorie toevoegen" autocomplete="off" data-add="category" data-focus-key="add-cat">
    </section>
    <section class="panel"><h2>Gebruikers</h2>
      <ul class="plain">${S.state.users.map((u) => `<li>${avatars([u.email])} ${esc(u.name || u.email)} <span class="muted">${esc(u.email)}</span></li>`).join('')}</ul>
      <p class="hint">${demo ? 'In demomodus zijn dit voorbeeldgebruikers.' : 'Gebruikers voeg je toe in de Google Sheet, op het tabblad "users".'}</p>
    </section>
    <section class="panel"><h2>Archief</h2><p><a href="#/archief">${icon('archive')} Naar het archief</a></p></section>
    ${demo ? `<section class="panel"><h2>Demomodus</h2>
      <p>De gegevens staan alleen in deze browser. Kies wie je bent om de app vanuit beide standpunten te testen.</p>
      <label class="field inline"><span>Ik ben</span><select data-demo-me>${S.state.users.map((u) => `<option value="${esc(u.email)}"${u.email === S.state.me ? ' selected' : ''}>${esc(u.name)}</option>`).join('')}</select></label>
      <p><button class="btn ghost danger" data-action="reset-demo">Voorbeeldgegevens terugzetten</button></p>
    </section>` : `<section class="panel"><h2>Account</h2><p>Aangemeld als ${esc(S.userName(S.state.me))} (${esc(S.state.me)}).</p>
      <p><button class="btn ghost" data-action="logout">Afmelden</button></p></section>`}
    </div>`;
}
