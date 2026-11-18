/**
 * Planningstool – back-end in Google Apps Script.
 *
 * Bind this script to the Google Sheet that holds the data (Extensions → Apps Script),
 * set the script property CLIENT_ID, run setup() once and deploy it as a web app
 * (Execute as: Me · Who has access: Anyone). See SETUP.md in the repository.
 *
 * Every request carries a Google ID token. The script checks it with Google, checks that
 * it was issued for our CLIENT_ID and that the e-mail address is on the 'users' tab.
 */

var ENTITIES = ['categories', 'lists', 'projects', 'todos'];
var DEFAULT_CATEGORIES = ['Planning', 'Logistiek', 'Materiaal', 'Communicatie', 'Inhoud'];

// ---------- one-time setup: select "setup" in the toolbar and click Run ----------

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error('Dit script hangt niet aan een Google Sheet. Open de Sheet en kies daar Extensies → Apps Script, en plak de code daar.');
  }
  var users = ss.getSheetByName('users') || ss.insertSheet('users');
  if (users.getLastRow() === 0) {
    users.getRange(1, 1, 1, 2).setValues([['email', 'name']]);
    var me = Session.getActiveUser().getEmail();
    if (me) users.getRange(2, 1, 1, 2).setValues([[me, me.split('@')[0]]]);
  }
  ENTITIES.forEach(function (name) { ensureSheet_(name); });
  if (readTable_('categories').length === 0) {
    saveMany_('categories', DEFAULT_CATEGORIES.map(function (n, i) {
      return { id: 'c' + (i + 1), name: n, order: (i + 1) * 10 };
    }));
  }
  SpreadsheetApp.flush();
  var clientId = PropertiesService.getScriptProperties().getProperty('CLIENT_ID');
  Logger.log('Tabbladen klaar in "' + ss.getName() + '": users, ' + ENTITIES.join(', ') + '.');
  Logger.log(clientId
    ? 'CLIENT_ID is ingesteld.'
    : 'Let op: CLIENT_ID ontbreekt nog (Project Settings → Script properties).');
  Logger.log('Voeg je collega toe op het tabblad "users" (e-mail + naam).');
}

// ---------- web app entry points ----------

function doGet() {
  return json_({ ok: true, data: 'Planningstool API werkt.' });
}

function doPost(e) {
  try {
    var req = JSON.parse(e.postData.contents);
    var email = verify_(req.token);
    var data;
    switch (req.action) {
      case 'load':
        data = loadAll_(email);
        break;
      case 'saveMany':
        data = saveMany_(req.entity, req.objs || []);
        break;
      case 'removeMany':
        data = removeMany_(req.entity, req.ids || []);
        break;
      default:
        throw new Error('Onbekende actie: ' + req.action);
    }
    return json_({ ok: true, data: data });
  } catch (err) {
    return json_({ ok: false, error: String((err && err.message) || err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ---------- auth ----------

function verify_(token) {
  if (!token) throw new Error('Niet aangemeld.');
  var cache = CacheService.getScriptCache();
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token);
  var key = 'tok_' + Utilities.base64EncodeWebSafe(digest).slice(0, 40);
  var email = cache.get(key);
  if (!email) {
    var res = UrlFetchApp.fetch(
      'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token),
      { muteHttpExceptions: true }
    );
    if (res.getResponseCode() !== 200) throw new Error('Aanmelding verlopen, meld je opnieuw aan.');
    var info = JSON.parse(res.getContentText());
    var clientId = PropertiesService.getScriptProperties().getProperty('CLIENT_ID');
    if (!clientId || info.aud !== clientId) throw new Error('Aanmelding hoort niet bij deze app (controleer CLIENT_ID).');
    if (String(info.email_verified) !== 'true') throw new Error('E-mailadres niet bevestigd bij Google.');
    email = String(info.email).toLowerCase();
    var ttl = Math.max(1, Math.min(600, Number(info.exp) - Math.floor(Date.now() / 1000)));
    cache.put(key, email, ttl);
  }
  var allowed = readTable_('users').some(function (u) {
    return String(u.email).trim().toLowerCase() === email;
  });
  if (!allowed) throw new Error('Geen toegang voor ' + email + '. Vraag om toegevoegd te worden op het tabblad "users".');
  return email;
}

// ---------- data ----------

function loadAll_(email) {
  var out = { me: email, users: readTable_('users') };
  ENTITIES.forEach(function (name) { out[name] = readTable_(name); });
  return out;
}

function ensureSheet_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1).setValue('id');
    sh.setFrozenRows(1);
  }
  return sh;
}

/** All rows as objects with text values (the app converts them back to lists, numbers, …). */
function readTable_(name) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh || sh.getLastRow() === 0) return [];
  var values = sh.getDataRange().getDisplayValues();
  var headers = values[0];
  var rows = [];
  for (var r = 1; r < values.length; r++) {
    if (values[r][0] === '') continue;
    var o = {};
    for (var c = 0; c < headers.length; c++) if (headers[c]) o[headers[c]] = values[r][c];
    rows.push(o);
  }
  return rows;
}

function ser_(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function checkEntity_(entity) {
  if (ENTITIES.indexOf(entity) < 0) throw new Error('Onbekende tabel: ' + entity);
}

function saveMany_(entity, objs) {
  checkEntity_(entity);
  if (!objs.length) return 0;
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = ensureSheet_(entity);
    var headers = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0].map(String);
    var missing = [];
    objs.forEach(function (o) {
      Object.keys(o).forEach(function (k) {
        if (headers.indexOf(k) < 0 && missing.indexOf(k) < 0) missing.push(k);
      });
    });
    if (missing.length) {
      sh.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]);
      headers = headers.concat(missing);
    }
    var last = sh.getLastRow();
    var ids = last > 1 ? sh.getRange(2, 1, last - 1, 1).getDisplayValues().map(function (r) { return r[0]; }) : [];
    objs.forEach(function (o) {
      var row = headers.map(function (h) { return ser_(o[h]); });
      var i = ids.indexOf(String(o.id));
      var rowNumber = i >= 0 ? i + 2 : sh.getLastRow() + 1;
      var range = sh.getRange(rowNumber, 1, 1, headers.length);
      range.setNumberFormat('@'); // keep dates and numbers as typed text
      range.setValues([row]);
      if (i < 0) ids.push(String(o.id));
    });
    return objs.length;
  } finally {
    lock.releaseLock();
  }
}

function removeMany_(entity, ids) {
  checkEntity_(entity);
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = ensureSheet_(entity);
    var last = sh.getLastRow();
    if (last < 2) return 0;
    var col = sh.getRange(2, 1, last - 1, 1).getDisplayValues().map(function (r) { return r[0]; });
    var removed = 0;
    for (var i = col.length - 1; i >= 0; i--) {
      if (ids.indexOf(col[i]) >= 0) {
        sh.deleteRow(i + 2);
        removed++;
      }
    }
    return removed;
  } finally {
    lock.releaseLock();
  }
}
