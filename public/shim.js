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
        if (!r.ok) { var e = new Error(j.error || "Request failed"); e.code = j.error || String(r.status); throw e; }
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

  var pending = 0, wseq = 0;

  function makeDb(myId) {
    return {
      doc: function (path) {
        return {
          set: function (data) {
            pending++; wseq++;
            return api("/api/db", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: path, data: data }) })
              .then(function () { if (/\/state$/.test(path)) lastState = JSON.stringify(data); })
              .finally(function () { pending--; wseq++; });
          },
          onSnapshot: function (cb, errCb) {
            var isState = /\/state$/.test(path);
            var isCol = false;
            var seen = null;
            var stop = every(function () {
              var startSeq = wseq;
              api("/api/db?doc=state").then(function (r) {
                if (pending > 0 || startSeq !== wseq) return;
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
