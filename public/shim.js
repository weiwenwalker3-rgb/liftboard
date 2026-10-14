/* Liftboard runtime shim.
 * The prototype talked to a small `window.claude` host (db + user). This file
 * provides the same surface on top of the Next.js API routes, so the app script
 * runs unchanged. Signed out (or API unreachable) => use() resolves null and the
 * app stays in its local-only mode. */
(function () {
  var POLL_COLLECTION_MS = 6000, POLL_STATE_MS = 15000;

  function api(url, opts) {
    return fetch(url, Object.assign({ credentials: "same-origin", cache: "no-store" }, opts)).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) { var e = new Error(j.error || "Request failed"); e.code = j.error || String(r.status); e.body = j; throw e; }
        return j;
      });
    });
  }

  var mePromise = null;
  function whoami() { return mePromise || (mePromise = api("/api/me").catch(function () { return { user: null }; })); }

  function every(fn, ms) {
    var stopped = false, t = null;
    function tick() { if (stopped) return; if (!document.hidden) fn(); t = setTimeout(tick, ms); }
    fn();
    t = setTimeout(tick, ms);
    document.addEventListener("visibilitychange", function () { if (!document.hidden && !stopped) fn(); });
    return function () { stopped = true; clearTimeout(t); };
  }

  var pending = 0, wseq = 0, rev = null, stateCb = null;

  function makeDb(myId) {
    return {
      doc: function (path) {
        return {
          set: function (data) {
            var isState = /\/state$/.test(path);
            pending++; wseq++;
            return api("/api/db", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: path, data: data, base: isState ? rev : undefined }) })
              .then(function (r) { if (isState){ lastState = JSON.stringify(data); if (r && r.rev) rev = r.rev; } })
              .catch(function (e) {
                // Another device or tab saved first: keep its version instead of overwriting it, and tell the app.
                if (isState && e && e.code === "conflict" && e.body){
                  rev = e.body.rev || null;
                  if (e.body.data){ lastState = JSON.stringify(e.body.data); if (stateCb) stateCb({ exists: true, metadata: { hasPendingWrites: false }, data: function () { return e.body.data; } }); }
                  try { window.dispatchEvent(new CustomEvent("lb:conflict")); } catch (x) {}
                  return;
                }
                throw e;
              })
              .finally(function () { pending--; wseq++; });
          },
          onSnapshot: function (cb, errCb) {
            var isState = /\/state$/.test(path);
            var isCol = false;
            if (isState) stateCb = cb;
            var seen = null;
            var stop = every(function () {
              var startSeq = wseq;
              api("/api/db?doc=state").then(function (r) {
                if (pending > 0 || startSeq !== wseq) return;
                if (isState) rev = r.rev || null;
                var js = JSON.stringify(r.data);
                if (seen === js || (isState && js === lastState && seen !== null)) { seen = js; return; }
                seen = js; lastState = js;
                cb({ exists: !!r.exists, metadata: { hasPendingWrites: false }, data: function () { return r.data; } });
              }).catch(function (e) { if (errCb) errCb(e); });
            }, POLL_STATE_MS);
            return stop;
          },
        };
      },
      collection: function (name) {
        return {
          onSnapshot: function (cb, errCb) {
            var seen = null;
            return every(function () {
              api("/api/db?col=" + encodeURIComponent(name)).then(function (r) {
                var js = JSON.stringify(r.docs);
                if (js === seen) return;
                seen = js;
                cb({ docs: Object.keys(r.docs).map(function (id) { return { id: id, data: function () { return r.docs[id]; } }; }) });
              }).catch(function (e) { if (errCb) errCb(e); });
            }, POLL_COLLECTION_MS);
          },
        };
      },
    };
  }
  var lastState = null;

  window.claude = {
    use: function (name) {
      return whoami().then(function (w) {
        if (!w || !w.user) return null;
        if (name === "db") return makeDb(w.user.id);
        if (name === "user") {
          return {
            id: function () { return Promise.resolve(w.user.id); },
            me: function () { return Promise.resolve({ name: w.user.name, avatarUrl: "" }); },
            can: function () { return Promise.resolve(true); },
            profiles: function (ids) {
              return api("/api/profiles?ids=" + encodeURIComponent(ids.join(",")));
            },
          };
        }
        return null;
      });
    },
  };
})();
