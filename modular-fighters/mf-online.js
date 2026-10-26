/* =========================================================
   Modular Fighters — ONLINE (Firebase Realtime Database)
   Random-opponent queue with matchmaking, and the leaderboard.
   The Firebase compat SDK is loaded on first use, so the game does not depend on it.
   Config: window.MF_FIREBASE_CONFIG (mf-firebase-config.js); databaseURL empty = off.

   Data (all under mf/):
     queue/<qid>        { name, char, room, t (server time), match? }   one per waiting player,
                        removed on disconnect; room = the 4-char PeerJS room that player hosts
     matches/<mid>      { a, b, aName, bName, aChar, bChar, room, t, accept: {<qid>: true}, declined?: qid }
     leaderboard/<key>  { name, wins, losses, t }

   Matchmaking: every queued client watches the queue; the OLDEST waiting entry pairs itself
   with the next one (a transaction on that entry's `match` field wins or loses the race),
   writes the match and marks both entries. Both sides then get "matched", answer with
   accept() / decline(); two accepts -> "start" (a = host of the PeerJS room, b joins it).

   Exposes window.MFOnline:
     configured() -> bool
     init() -> Promise                     loads the SDK, connects
     enqueue({name, char, room}, onEvent) -> Promise<qid>
     dequeue()                             leave the queue / drop a pending match
     accept() / decline()                  answer the current match
     reportResult({name, won}) -> Promise  leaderboard, one call per finished online match
     leaderboard(limit) -> Promise<[{name, wins, losses}]> sorted
     onEvent(type, data):
       "matched"          {foeName, foeChar, host}
       "start"            {room, host, foeName, foeChar}
       "match_cancelled"  {byMe:bool, foeGone:bool}
       "error"            key: "online_off" | "online_load" | "online_net"
   ========================================================= */
(function () {
  'use strict';

  var SDK = [
    'https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.14.1/firebase-database-compat.js'
  ];
  var ANSWER_MS = 20000;        // a match not answered in time counts as declined

  var db = null, initP = null;
  var me = null;                // { id, ref, name, char, room }
  var state = 'idle';           // idle | waiting | matched | started
  var onEvent = null;
  var queueRef = null, queueCb = null;
  var mineCb = null, matchRef = null, matchCb = null, foeRef = null, foeCb = null;
  var match = null;             // { id, a, b, room, foeId, foeName, foeChar, host }
  var answerTimer = 0;
  var session = 0;

  function cfg() { return window.MF_FIREBASE_CONFIG || null; }
  function configured() { var c = cfg(); return !!(c && c.databaseURL); }
  function emit(type, data) { if (typeof onEvent === 'function') { try { onEvent(type, data); } catch (e) { if (window.console) console.error(e); } } }

  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = function () { res(); };
      s.onerror = function () { rej(new Error('online_load')); };
      document.head.appendChild(s);
    });
  }
  function init() {
    if (db) return Promise.resolve();
    if (initP) return initP;
    if (!configured()) return Promise.reject(new Error('online_off'));
    initP = (window.firebase ? Promise.resolve() : loadScript(SDK[0]).then(function () { return loadScript(SDK[1]); }))
      .then(function () {
        if (!window.firebase) throw new Error('online_load');
        if (!firebase.apps.length) firebase.initializeApp(cfg());
        db = firebase.database();
      })
      .catch(function (e) { initP = null; throw e; });
    return initP;
  }
  function ts() { return firebase.database.ServerValue.TIMESTAMP; }

  /* ---------------- queue ---------------- */
  function enqueue(opts, cb) {
    onEvent = cb;
    var mySession = ++session;
    return init().then(function () {
      if (mySession !== session) return null;
      dequeueLocal();
      me = { name: String(opts.name || '').slice(0, 12), char: String(opts.char || 'osc'), room: String(opts.room || '') };
      return addEntry(mySession);
    }).catch(function (e) {
      emit('error', e && e.message === 'online_off' ? 'online_off' : (e && e.message === 'online_load' ? 'online_load' : 'online_net'));
      throw e;
    });
  }
  // (re)create our queue entry: a new key and a new timestamp = the end of the line
  function addEntry(mySession) {
    var ref = db.ref('mf/queue').push();
    me.id = ref.key; me.ref = ref;
    state = 'waiting';
    return ref.set({ name: me.name, char: me.char, room: me.room, t: ts() }).then(function () {
      if (mySession !== session) return null;
      ref.onDisconnect().remove();
      watchMine(mySession);
      watchQueue(mySession);
      return me.id;
    });
  }
  function watchQueue(mySession) {
    if (queueRef) queueRef.off('value', queueCb);
    queueRef = db.ref('mf/queue');
    queueCb = function (snap) {
      if (mySession !== session || state !== 'waiting' || !me) return;
      var list = [];
      snap.forEach(function (ch) {
        var v = ch.val();
        if (v && !v.match && v.room) list.push({ id: ch.key, t: v.t || 0, name: v.name || '', char: v.char || 'osc', room: v.room });
      });
      list.sort(function (a, b) { return (a.t - b.t) || (a.id < b.id ? -1 : 1); });
      if (list.length >= 2 && list[0].id === me.id) pair(list[1], mySession);
    };
    queueRef.on('value', queueCb);
  }
  // the oldest waiting player pairs with the next one; the transaction on the other entry decides the race
  function pair(other, mySession) {
    var mid = db.ref('mf/matches').push().key;
    db.ref('mf/queue/' + other.id).transaction(function (cur) {
      if (!cur || cur.match) return;      // gone or already taken: abort
      cur.match = mid;
      return cur;
    }).then(function (res) {
      if (mySession !== session || !me || state !== 'waiting') return;
      if (!res.committed) return;
      var v = res.snapshot.val();
      if (!v || v.match !== mid) return;
      var rec = { a: me.id, b: other.id, aName: me.name, bName: other.name, aChar: me.char, bChar: other.char, room: me.room, t: ts() };
      var upd = {};
      upd['mf/matches/' + mid] = rec;
      upd['mf/queue/' + me.id + '/match'] = mid;
      return db.ref().update(upd);
    }).catch(function () { /* the queue watcher will try again */ });
  }
  function watchMine(mySession) {
    mineCb = function (snap) {
      if (mySession !== session || !me) return;
      var v = snap.val();
      if (!v) return;                     // removed by us
      if (v.match && state === 'waiting') openMatch(v.match, mySession);
    };
    me.ref.on('value', mineCb);
  }
  function openMatch(mid, mySession) {
    state = 'matched';
    db.ref('mf/matches/' + mid).once('value').then(function (snap) {
      if (mySession !== session || state !== 'matched') return;
      var m = snap.val();
      if (!m || !m.a || !m.b) { clearMatchField(); state = 'waiting'; return; }
      var host = m.a === me.id;
      match = { id: mid, a: m.a, b: m.b, room: m.room, host: host,
        foeId: host ? m.b : m.a, foeName: host ? (m.bName || '') : (m.aName || ''), foeChar: host ? (m.bChar || 'osc') : (m.aChar || 'osc') };
      matchRef = db.ref('mf/matches/' + mid);
      matchCb = function (s) { onMatchValue(s.val(), mySession); };
      matchRef.on('value', matchCb);
      foeRef = db.ref('mf/queue/' + match.foeId);
      foeCb = function (s) { if (mySession === session && match && !s.exists()) cancelled(false, true, mySession); };
      foeRef.on('value', foeCb);
      clearTimeout(answerTimer);
      answerTimer = setTimeout(function () { if (mySession === session && state === 'matched') decline(); }, ANSWER_MS);
      emit('matched', { foeName: match.foeName, foeChar: match.foeChar, host: host });
    });
  }
  function onMatchValue(m, mySession) {
    if (mySession !== session || !match) return;
    if (!m) { cancelled(false, true, mySession); return; }
    if (m.declined) { cancelled(m.declined === me.id, false, mySession); return; }
    var acc = m.accept || {};
    if (acc[m.a] && acc[m.b] && state === 'matched') started(mySession);
  }
  function accept() {
    if (state !== 'matched' || !match) return;
    clearTimeout(answerTimer);
    var upd = {}; upd['accept/' + me.id] = true;
    matchRef.update(upd).catch(function () { emit('error', 'online_net'); });
  }
  function decline() {
    if (state !== 'matched' || !match) return;
    clearTimeout(answerTimer);
    matchRef.update({ declined: me.id }).catch(function () { emit('error', 'online_net'); });
  }
  // a declined / abandoned match: the decliner goes to the end of the line, the other stays
  function cancelled(byMe, foeGone, mySession) {
    if (!match) return;
    var m = match;
    stopMatchWatch();
    match = null;
    if (byMe) {
      // new entry = new timestamp = end of the line
      me.ref.off('value', mineCb);
      me.ref.onDisconnect().cancel();
      me.ref.remove();
      db.ref('mf/matches/' + m.id).remove();
      state = 'waiting';
      addEntry(mySession).catch(function () { emit('error', 'online_net'); });
    } else {
      clearMatchField();
      state = 'waiting';
      if (foeGone) db.ref('mf/matches/' + m.id).remove();
    }
    emit('match_cancelled', { byMe: byMe, foeGone: foeGone });
  }
  function clearMatchField() {
    if (me && me.ref) me.ref.child('match').remove();
  }
  function started(mySession) {
    state = 'started';
    var m = match;
    stopMatchWatch();
    if (queueRef) { queueRef.off('value', queueCb); queueRef = null; }
    if (me && me.ref) { me.ref.off('value', mineCb); me.ref.onDisconnect().cancel(); me.ref.remove(); }
    db.ref('mf/matches/' + m.id).remove();
    match = null;
    emit('start', { room: m.room, host: m.host, foeName: m.foeName, foeChar: m.foeChar });
  }
  function stopMatchWatch() {
    clearTimeout(answerTimer); answerTimer = 0;
    if (matchRef) { matchRef.off('value', matchCb); matchRef = null; }
    if (foeRef) { foeRef.off('value', foeCb); foeRef = null; }
  }
  function dequeueLocal() {
    stopMatchWatch();
    if (queueRef) { queueRef.off('value', queueCb); queueRef = null; }
    if (me && me.ref) {
      me.ref.off('value', mineCb);
      try { me.ref.onDisconnect().cancel(); } catch (e) { /* ignore */ }
      me.ref.remove();
    }
    if (match) db.ref('mf/matches/' + match.id).remove();
    match = null; me = null;
    state = 'idle';
  }
  function dequeue() {
    session++;
    if (db) dequeueLocal();
    onEvent = null;
  }

  /* ---------------- leaderboard ---------------- */
  function keyFor(name) {
    return String(name || '').trim().toLowerCase().replace(/[.#$\[\]\/]/g, '_').slice(0, 12) || '_';
  }
  function reportResult(opts) {
    var name = String(opts && opts.name || '').trim().slice(0, 12);
    if (!name) return Promise.resolve();
    var won = !!(opts && opts.won);
    return init().then(function () {
      return db.ref('mf/leaderboard/' + keyFor(name)).transaction(function (cur) {
        cur = cur || { name: name, wins: 0, losses: 0 };
        cur.name = name;
        if (won) cur.wins = (cur.wins || 0) + 1; else cur.losses = (cur.losses || 0) + 1;
        cur.t = Date.now();
        return cur;
      });
    });
  }
  function leaderboard(limit) {
    limit = limit || 50;
    return init().then(function () {
      return db.ref('mf/leaderboard').orderByChild('wins').limitToLast(limit).once('value');
    }).then(function (snap) {
      var rows = [];
      snap.forEach(function (ch) { var v = ch.val(); if (v && v.name) rows.push({ name: v.name, wins: v.wins || 0, losses: v.losses || 0 }); });
      rows.sort(function (a, b) {
        if (b.wins !== a.wins) return b.wins - a.wins;
        var ra = a.wins / Math.max(1, a.wins + a.losses), rb = b.wins / Math.max(1, b.wins + b.losses);
        if (rb !== ra) return rb - ra;
        return a.losses - b.losses;
      });
      return rows;
    });
  }

  window.MFOnline = {
    configured: configured, init: init,
    enqueue: enqueue, dequeue: dequeue, accept: accept, decline: decline,
    reportResult: reportResult, leaderboard: leaderboard
  };
  Object.defineProperty(window.MFOnline, 'state', { get: function () { return state; } });
})();
