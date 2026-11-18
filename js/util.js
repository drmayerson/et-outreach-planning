// Small helpers: ids, escaping, dates (all dates are local 'YYYY-MM-DD' strings).

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function iso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const todayISO = () => iso(new Date());

export function parseISO(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s, n) {
  const d = parseISO(s);
  d.setDate(d.getDate() + n);
  return iso(d);
}

/** Monday of the week that contains date s. */
export function mondayOf(s) {
  const d = parseISO(s);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return iso(d);
}

export function weekNumber(s) {
  const d = parseISO(s);
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - y0) / 86400000 + 1) / 7);
}

/** 'vandaag', 'morgen', 'gisteren' or 'ma 18 nov'. */
export function fmtDate(s, plain = false) {
  if (!s) return '';
  const today = todayISO();
  if (!plain) {
    if (s === today) return 'vandaag';
    if (s === addDays(today, 1)) return 'morgen';
    if (s === addDays(today, -1)) return 'gisteren';
  }
  return parseISO(s)
    .toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric', month: 'short' })
    .replace(/\.$/, '');
}

export function fmtDateTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Only http(s) and mailto links; adds https:// when the protocol is missing. */
export function safeUrl(u) {
  let s = String(u || '').trim();
  if (!s) return '';
  if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = 'https://' + s;
  try {
    const x = new URL(s);
    return ['http:', 'https:', 'mailto:'].includes(x.protocol) ? x.href : '';
  } catch {
    return '';
  }
}

/** Textarea lines 'Label | url' or 'url' → [{label, url}]. */
export function parseLinks(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const i = line.lastIndexOf('|');
      const label = i >= 0 ? line.slice(0, i).trim() : '';
      const url = i >= 0 ? line.slice(i + 1).trim() : line;
      return { label, url };
    })
    .filter((l) => safeUrl(l.url));
}

export const linksToText = (links) =>
  (links || []).map((l) => (l.label ? `${l.label} | ${l.url}` : l.url)).join('\n');

export function linkLabel(l) {
  if (l.label) return l.label;
  try {
    return new URL(safeUrl(l.url)).hostname.replace(/^www\./, '');
  } catch {
    return l.url;
  }
}
