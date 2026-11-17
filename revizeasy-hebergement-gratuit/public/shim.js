/* RevizEasy : couche de compatibilité pour l'hébergement gratuit (hors de Claude).
   Fournit ce que l'application attend : l'IA (via /api/ia, relais Cloudflare + Gemini), la sauvegarde (dans ce navigateur) et un identifiant local.
   Si la page est ouverte dans Claude, window.claude existe déjà et ce fichier ne fait rien. */
(function () {
  if (window.claude) return;
  var LS = window.localStorage;
  function lsGet(k) { try { return LS.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { LS.setItem(k, v); return true; } catch (e) { return false; } }
  function lsDel(k) { try { LS.removeItem(k); } catch (e) {} }

  /* ---------- identifiant local ---------- */
  var uid = lsGet('rz:uid');
  if (!uid) { uid = 'u' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36); lsSet('rz:uid', uid); }
  var user = { id: async function () { return uid; } };

  /* ---------- base de données locale (dans le navigateur de l'élève) ---------- */
  var P = 'rz:doc:';
  function mkDoc(path) {
    var key = P + path;
    return {
      id: path.split('/').pop(),
      get: async function () { var r = lsGet(key), v = r ? JSON.parse(r) : null; return { exists: !!v, id: this.id, data: function () { return v; } }; },
      set: async function (o) { if (!lsSet(key, JSON.stringify(o))) throw new Error('Mémoire du navigateur pleine'); },
      update: async function (o) { var r = lsGet(key); if (!r) throw new Error('introuvable'); var v = JSON.parse(r); for (var k in o) v[k] = o[k]; if (!lsSet(key, JSON.stringify(v))) throw new Error('Mémoire du navigateur pleine'); },
      delete: async function () { lsDel(key); }
    };
  }
  function mkCol(path, ord, lim) {
    return {
      doc: function (id) { return mkDoc(path + '/' + id); },
      orderBy: function (f, dir) { return mkCol(path, [f, dir || 'asc'], lim); },
      limit: function (n) { return mkCol(path, ord, n); },
      get: async function () {
        var pre = P + path + '/', rows = [];
        for (var i = 0; i < LS.length; i++) {
          var k = LS.key(i);
          if (k && k.indexOf(pre) === 0 && k.indexOf('/', pre.length) < 0) { try { rows.push({ id: k.slice(pre.length), v: JSON.parse(LS.getItem(k)) }); } catch (e) {} }
        }
        if (ord) rows.sort(function (a, b) { var x = a.v[ord[0]], y = b.v[ord[0]]; return (x > y ? 1 : x < y ? -1 : 0) * (ord[1] === 'desc' ? -1 : 1); });
        if (lim) rows = rows.slice(0, lim);
        return { docs: rows.map(function (r) { return { id: r.id, exists: true, data: function () { return r.v; } }; }), size: rows.length, empty: !rows.length };
      }
    };
  }
  var db = { doc: mkDoc, collection: function (p) { return mkCol(p); } };

  /* ---------- IA : relais /api/ia (la clé reste côté serveur) ---------- */
  var actifs = 0, file = [];
  function slot() { return new Promise(function (ok) { if (actifs < 2) { actifs++; ok(); } else file.push(ok); }); }
  function libere() { actifs--; var n = file.shift(); if (n) { actifs++; n(); } }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function b64(blob) { return new Promise(function (ok, ko) { var r = new FileReader(); r.onload = function () { ok(String(r.result).split(',')[1]); }; r.onerror = ko; r.readAsDataURL(blob); }); }
  function parse(t) {
    t = String(t || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    try { return JSON.parse(t); } catch (e) {}
    var a = t.indexOf('{'), z = t.lastIndexOf('}'); if (a >= 0 && z > a) return JSON.parse(t.slice(a, z + 1));
    throw new Error('Réponse IA illisible');
  }
  var sample = {
    limits: async function () { return { images: true }; },
    json: async function (prompt, opts) {
      opts = opts || {};
      var imgs = [];
      for (var i = 0; i < (opts.images || []).length && i < 3; i++) { try { imgs.push(opts.images[i] instanceof Blob ? { mime: opts.images[i].type || 'image/jpeg', data: await b64(opts.images[i]) } : opts.images[i]); } catch (e) {} }
      await slot();
      try {
        var lastErr;
        for (var n = 0; n < 5; n++) {
          var r;
          try { r = await fetch('/api/ia', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: String(prompt), tier: opts.modelTier || 'standard', images: imgs }) }); }
          catch (e) { lastErr = new Error('Pas de connexion'); await wait(1500 * (n + 1)); continue; }
          if (r.status === 429 || r.status === 503) { lastErr = new Error('IA très sollicitée, nouvel essai'); await wait(3500 * (n + 1)); continue; }
          var j = null; try { j = await r.json(); } catch (e) {}
          if (!r.ok) throw new Error((j && j.erreur) || ('Erreur ' + r.status));
          return parse(j.text);
        }
        throw lastErr || new Error('IA indisponible');
      } finally { libere(); }
    }
  };

  window.claude = { use: async function (n) { return n === 'sample' ? sample : n === 'db' ? db : n === 'user' ? user : null; } };
})();
