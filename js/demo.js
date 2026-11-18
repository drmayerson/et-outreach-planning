// Sample data for demo mode (stored only in this browser). Dates are relative to today.
import { todayISO, addDays, mondayOf } from './util.js';

export function demoSeed() {
  const today = todayISO();
  const d = (n) => addDays(today, n);
  const mon = mondayOf(today);
  const now = new Date().toISOString();
  const A = 'collega.a@demo';
  const B = 'collega.b@demo';
  let n = 0;
  const todo = (f) => ({
    id: `t${++n}`, title: '', description: '', projectId: '', listId: '', category: '', assignees: [],
    urgency: '', status: 'open', waitingFor: '', dueDate: '', links: [], subtasks: [], notes: '',
    followUp: '', inWeek: '', snoozeUntil: '', order: n * 10, doneAt: '', doneBy: '', archived: false, history: [],
    createdAt: now, createdBy: A, updatedAt: now, ...f,
  });
  const project = (f) => ({
    description: '', parentId: '', trekkers: [], dropboxUrl: '', links: [], events: [], materials: [], contactIds: [],
    archived: false,
    createdAt: now, createdBy: A, updatedAt: now, ...f,
  });

  return {
    users: [
      { email: A, name: 'Collega A' },
      { email: B, name: 'Collega B' },
    ],
    categories: [
      { id: 'c1', name: 'Planning', order: 10 },
      { id: 'c2', name: 'Logistiek', order: 20 },
      { id: 'c3', name: 'Materiaal', order: 30 },
      { id: 'c4', name: 'Communicatie', order: 40 },
      { id: 'c5', name: 'Inhoud', order: 50 },
    ],
    contacts: [
      { id: 'k1', name: 'Sanne Voorbeeld', organisation: 'Technopolis', role: 'Educatief medewerker', email: 'sanne@voorbeeld.be', phone: '', notes: '', createdAt: now, updatedAt: now },
      { id: 'k2', name: 'Tom Voorbeeld', organisation: 'Nerdland', role: 'Programmatie', email: 'tom@voorbeeld.be', phone: '+32 470 00 00 00', notes: 'Liefst bellen.', createdAt: now, updatedAt: now },
      { id: 'k3', name: 'Lies Voorbeeld', organisation: 'Busbedrijf', role: 'Reservaties', email: 'lies@voorbeeld.be', phone: '', notes: '', createdAt: now, updatedAt: now },
    ],
    lists: [
      { id: 'la1', owner: A, name: 'Algemeen', order: 10 },
      { id: 'la2', owner: A, name: 'Ideeën', order: 20 },
      { id: 'lb1', owner: B, name: 'Algemeen', order: 10 },
    ],
    projects: [
      project({
        id: 'p1', title: 'Technopolis-expo', trekkers: [A],
        description: 'Doorlopende stand in Technopolis.',
        dropboxUrl: 'https://www.dropbox.com/home', contactIds: ['k1'],
        events: [{ id: 'e1', date: d(10), endDate: '', label: 'Rondleiding met leerkrachten', location: 'Technopolis, Mechelen' }],
      }),
      project({
        id: 'p2', title: 'Nerdland Festival', trekkers: [B],
        description: 'Stand en workshop op het festival (één evenement).', contactIds: ['k2'],
        events: [{ id: 'e2', date: d(2), endDate: d(3), label: 'Festival', location: 'Gent' }],
        materials: [
          { id: 'm1', name: 'Kartonnen spiegels', qty: '20', status: 'besteld' },
          { id: 'm2', name: 'Roll-up banner', qty: '1', status: 'klaar' },
          { id: 'm3', name: 'Flyers', qty: '500', status: 'nodig' },
        ],
      }),
      project({
        id: 'p3', title: 'Lesmodules secundair onderwijs', trekkers: [A, B],
        description: 'Ontwikkeling van lesmodules voor het secundair onderwijs.',
      }),
      project({
        id: 'p4', title: 'Schoolbezoeken', trekkers: [B],
        description: 'Overkoepelend project voor alle schoolbezoeken dit schooljaar.', contactIds: ['k3'],
      }),
      project({
        id: 'p3a', parentId: 'p3', title: 'Module zwaartekrachtgolven', trekkers: [A],
        description: 'Lesmodule voor de derde graad.',
      }),
      project({
        id: 'p3b', parentId: 'p3', title: 'Module licht en spiegels', trekkers: [B],
        description: 'Lesmodule voor de tweede graad.',
      }),
      project({
        id: 'p4a', parentId: 'p4', title: 'Bezoek Sint-Jozefscollege', trekkers: [B],
        events: [{ id: 'e3', date: d(5), endDate: '', label: 'Bezoek 5de jaar', location: 'Aalst' }],
      }),
      project({
        id: 'p5', title: 'Artikel VVS-magazine', trekkers: [A],
        description: 'Artikel voor het magazine van de VVS.',
      }),
    ],
    todos: [
      todo({ projectId: 'p1', category: 'c2', title: 'Touchscreen laten herstellen', assignees: [A], urgency: 'dringend', dueDate: d(-2) }),
      todo({ projectId: 'p1', category: 'c3', title: 'Nieuwe infofiches laten drukken', assignees: [A], dueDate: d(9) }),
      todo({ projectId: 'p1', category: 'c1', title: 'Rondleidingen met gidsen plannen', dueDate: d(20) }),
      todo({ projectId: 'p2', category: 'c1', title: 'Standaanvraag indienen', assignees: [B], urgency: 'semi', dueDate: d(3) }),
      todo({ projectId: 'p2', category: 'c3', title: 'Workshopmateriaal bestellen', status: 'waiting', waitingFor: 'offerte leverancier' }),
      todo({ projectId: 'p2', category: 'c1', title: 'Shiften verdelen', assignees: [A, B], dueDate: d(12) }),
      todo({ projectId: 'p3a', category: 'c5', title: 'Lesfiche afwerken', assignees: [A], urgency: 'dringend' }),
      todo({ projectId: 'p3a', category: 'c3', title: 'Spiegelmodel laten maken', assignees: [A], status: 'waiting', waitingFor: 'werkplaats', followUp: d(1) }),
      todo({ projectId: 'p3b', category: 'c5', title: 'Feedback leerkrachten verwerken', assignees: [B], urgency: 'lang' }),
      todo({ projectId: 'p4a', category: 'c2', title: 'Lokaal en projector bevestigen', assignees: [B], dueDate: d(4) }),
      todo({ projectId: 'p3', category: 'c1', title: 'Proefles inplannen', dueDate: d(30) }),
      todo({ projectId: 'p4', category: 'c4', title: 'Bevestigingsmail naar scholen sturen', assignees: [B], dueDate: d(1) }),
      todo({ projectId: 'p4', category: 'c2', title: 'Bus reserveren', assignees: [B], status: 'done', doneAt: now, doneBy: B }),
      todo({
        projectId: 'p5', category: 'c5', title: 'Eerste versie schrijven', assignees: [A], dueDate: d(6),
        subtasks: [
          { id: 's1', title: 'Structuur', done: true },
          { id: 's2', title: 'Inleiding', done: false },
          { id: 's3', title: 'Figuren', done: false },
        ],
      }),
      todo({ projectId: 'p5', category: 'c4', title: "Foto's opvragen", urgency: 'lang' }),
      todo({ listId: 'la1', title: 'Reiskosten indienen', inWeek: mon }),
      todo({ listId: 'la1', title: 'Mailbox opruimen' }),
      todo({ listId: 'la2', title: 'Escape room rond zwarte gaten?' }),
      todo({ listId: 'lb1', title: 'Verlof aanvragen', dueDate: d(4), createdBy: B }),
    ],
  };
}
