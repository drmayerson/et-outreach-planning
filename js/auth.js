// Sign in with Google (Google Identity Services). The ID token is sent to the Apps Script,
// which checks it with Google and only lets in the e-mail addresses on the 'users' tab.
const KEY = 'planningstool-idtoken';
let waiting = [];
let gisLoaded = null;

function decode(token) {
  const p = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(decodeURIComponent(escape(atob(p))));
}
function valid(token) {
  try {
    return !!token && decode(token).exp * 1000 > Date.now() + 60_000;
  } catch {
    return false;
  }
}
function stored() {
  try { return localStorage.getItem(KEY); } catch { return null; }
}
function store(token) {
  try { localStorage.setItem(KEY, token); } catch { /* ignore */ }
  memToken = token;
}
let memToken = null;

function loadGis() {
  gisLoaded ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Google-aanmelding kon niet geladen worden.'));
    document.head.appendChild(s);
  });
  return gisLoaded;
}

function overlay() {
  let el = document.getElementById('login');
  if (!el) {
    el = document.createElement('div');
    el.id = 'login';
    el.className = 'login-overlay';
    el.innerHTML = `<div class="login-card">
      <h1>Planningstool</h1>
      <p>Meld je aan met je Google-account om verder te gaan.</p>
      <div id="gbtn"></div>
      <p class="hint" id="login-msg"></p>
    </div>`;
    document.body.appendChild(el);
  }
  return el;
}

export function createAuth(clientId) {
  const auth = {
    async init() {
      await loadGis();
      google.accounts.id.initialize({
        client_id: clientId,
        auto_select: true,
        cancel_on_tap_outside: false,
        callback: (r) => {
          store(r.credential);
          document.getElementById('login')?.remove();
          waiting.splice(0).forEach((fn) => fn(r.credential));
        },
      });
    },
    getToken() {
      const t = valid(memToken) ? memToken : stored();
      if (valid(t)) return Promise.resolve(t);
      return new Promise((resolve) => {
        waiting.push(resolve);
        const el = overlay();
        google.accounts.id.renderButton(el.querySelector('#gbtn'), {
          theme: 'outline', size: 'large', text: 'signin_with', locale: 'nl',
        });
        google.accounts.id.prompt();
      });
    },
    clearToken() {
      memToken = null;
      try { localStorage.removeItem(KEY); } catch { /* ignore */ }
    },
    logout() {
      auth.clearToken();
      google.accounts.id.disableAutoSelect();
      location.reload();
    },
  };
  return auth;
}
