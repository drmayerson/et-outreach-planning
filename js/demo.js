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
    inWeek: '', snoozeUntil: '', order: n * 10, doneAt: '', doneBy: '', archived: false,
    createdAt: now, createdBy: A, updatedAt: now, ...f,
  });
  const project = (f) => ({
    description: '', trekkers: [], dropboxUrl: '', links: [], archived: false,
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
    lists: [
      { id: 'la1', owner: A, name: 'Algemeen', order: 10 },
      { id: 'la2', owner: A, name: 'Ideeën', order: 20 },
      { id: 'lb1', owner: B, name: 'Algemeen', order: 10 },
    ],
    projects: [
      project({
        id: 'p1', title: 'Technopolis-expo', trekkers: [A],
        description: 'Doorlopende stand in Technopolis.',
        dropboxUrl: 'https://www.dropbox.com/home',
      }),
      project({
        id: 'p2', title: 'Nerdland Festival', trekkers: [B],
        description: 'Stand en workshop op het festival (één evenement).',
      }),
      project({
        id: 'p3', title: 'Lesmodules secundair onderwijs', trekkers: [A, B],
        description: 'Ontwikkeling van lesmodules voor het secundair onderwijs.',
      }),
      project({
        id: 'p4', title: 'Schoolbezoeken', trekkers: [B],
        description: 'Overkoepelend project voor alle schoolbezoeken dit schooljaar.',
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
      todo({ projectId: 'p3', category: 'c5', title: 'Module 1: lesfiche afwerken', assignees: [A], urgency: 'dringend' }),
      todo({ projectId: 'p3', category: 'c5', title: 'Feedback leerkrachten verwerken', assignees: [B], urgency: 'lang' }),
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
