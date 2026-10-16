/* =========================================================
   Modular Fighters — NETWORK (PeerJS)
   Architecture copied from ../sessionguide-app.html:
   - PeerJS 1.5.4 from unpkg (index.html must include
     <script src="https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js"></script>)
   - host peer id = PREFIX + 4-char room code; guest peer id random
   - host = state authority; two players only
   - "disconnected" -> peer.reconnect(); guest conn close -> retry with backoff
   Exposes window.MFNet:
     create(onEvent) -> Promise<code>
     join(code, onEvent) -> Promise
     send(msg)   msg is a JSON-able object, passed to conn.send as is
     leave()
     isHost, connected
     onEvent(type, data): "peer_joined" | "peer_left" | "msg" | "error"
       error data (string key): "no_peerjs" | "not_found" | "full" | "timeout" |
                                "network" | "host_error" | "peer_error"
   ========================================================= */
(function(){
"use strict";

var PREFIX = "mf-";
var CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
var JOIN_TIMEOUT_MS = 8000;

var peer = null;       // our Peer
var guestConn = null;  // host side: the single accepted guest
var hostConn = null;   // guest side: connection to host
var role = null;       // "host" | "guest" | null
var code = null;
var onEvent = null;
var retryTimer = null;
var retryDelay = 1200;
var session = 0;       // bumps on leave(); stale callbacks compare against it

function makeCode(){
  var s=""; for(var i=0;i<4;i++) s += CODE_CHARS[Math.floor(Math.random()*CODE_CHARS.length)];
  return s;
}
function emit(type, data){
  if(typeof onEvent === "function"){ try{ onEvent(type, data); }catch(err){} }
}
function parse(raw){
  try{ return typeof raw==="string" ? JSON.parse(raw) : raw; }catch(err){ return null; }
}
function peerReady(){ return typeof Peer !== "undefined"; }
function mapError(err){
  var t = err && err.type;
  if(t==="peer-unavailable") return "not_found";
  if(t==="network" || t==="disconnected" || t==="server-error" || t==="socket-error" || t==="socket-closed") return "network";
  if(t==="browser-incompatible" || t==="ssl-unavailable" || t==="webrtc") return "network";
  return "peer_error";
}
function normCode(c){
  return String(c||"").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,4);
}

/* ---------------- host ---------------- */
function create(cb){
  leave();
  onEvent = cb;
  var mySession = session;
  return new Promise(function(resolve, reject){
    if(!peerReady()){ emit("error","no_peerjs"); reject(new Error("no_peerjs")); return; }
    hostRoom(0, mySession, resolve, reject);
  });
}
function hostRoom(attempt, mySession, resolve, reject){
  code = makeCode();
  role = "host";
  var p = new Peer(PREFIX + code, {debug:0});
  peer = p;
  var opened = false;
  p.on("open", function(){
    if(mySession!==session) return;
    opened = true;
    resolve(code);
  });
  p.on("connection", function(c){
    if(mySession!==session){ try{ c.close(); }catch(err){} return; }
    if(guestConn && guestConn.open){
      /* two players only: reject with {t:"full"} then close */
      c.on("open", function(){
        try{ c.send({t:"full"}); }catch(err){}
        setTimeout(function(){ try{ c.close(); }catch(err){} }, 300);
      });
      return;
    }
    guestConn = c;
    c.on("open", function(){
      if(mySession!==session) return;
      emit("peer_joined", {});
    });
    c.on("data", function(raw){
      if(mySession!==session) return;
      var m = parse(raw); if(!m) return;
      emit("msg", m);
    });
    c.on("close", function(){
      if(guestConn===c){ guestConn = null; if(mySession===session) emit("peer_left", {}); }
    });
    c.on("error", function(){
      if(guestConn===c){ guestConn = null; if(mySession===session) emit("peer_left", {}); }
    });
  });
  p.on("disconnected", function(){
    if(mySession!==session) return;
    try{ p.reconnect(); }catch(err){}
  });
  p.on("error", function(err){
    if(mySession!==session) return;
    if(err && err.type==="unavailable-id" && (attempt||0) < 5){
      try{ p.destroy(); }catch(e2){}
      hostRoom((attempt||0)+1, mySession, resolve, reject); return;
    }
    var key = opened ? mapError(err) : "host_error";
    emit("error", key);
    if(!opened) reject(new Error(key));
  });
}

/* ---------------- guest ---------------- */
function join(c, cb){
  leave();
  onEvent = cb;
  var mySession = session;
  return new Promise(function(resolve, reject){
    if(!peerReady()){ emit("error","no_peerjs"); reject(new Error("no_peerjs")); return; }
    var want = normCode(c);
    if(want.length!==4){ emit("error","not_found"); reject(new Error("not_found")); return; }
    code = want;
    role = "guest";
    var settled = false;
    var timer = setTimeout(function(){
      if(settled || mySession!==session) return;
      settled = true;
      emit("error","timeout");
      leave();
      reject(new Error("timeout"));
    }, JOIN_TIMEOUT_MS);
    function ok(){ if(settled) return; settled = true; clearTimeout(timer); resolve(); }
    function fail(key){
      if(settled) return; settled = true; clearTimeout(timer);
      leave();
      reject(new Error(key));
    }
    var p = new Peer({debug:0});
    peer = p;
    p.on("open", function(){ if(mySession===session) connectHost(mySession, ok, fail); });
    p.on("disconnected", function(){
      if(mySession!==session) return;
      try{ p.reconnect(); }catch(err){}
    });
    p.on("error", function(err){
      if(mySession!==session) return;
      var key = mapError(err);
      emit("error", key);
      if(!settled){ fail(key); return; }
      scheduleRetry(mySession);
    });
  });
}
function connectHost(mySession, ok, fail){
  if(!peer || role!=="guest" || mySession!==session) return;
  var c = peer.connect(PREFIX + code, {reliable:true});
  hostConn = c;
  var wasOpen = false;
  c.on("open", function(){
    if(mySession!==session) return;
    wasOpen = true;
    retryDelay = 1200;
    emit("peer_joined", {});
    if(ok) ok();
  });
  c.on("data", function(raw){
    if(mySession!==session) return;
    var m = parse(raw); if(!m) return;
    if(m.t==="full"){
      emit("error","full");
      var s = session;
      leave();
      if(fail && s===mySession) fail("full");
      return;
    }
    emit("msg", m);
  });
  c.on("close", function(){
    if(mySession!==session || hostConn!==c) return;
    hostConn = null;
    if(wasOpen) emit("peer_left", {});
    scheduleRetry(mySession);
  });
  c.on("error", function(){
    if(mySession!==session || hostConn!==c) return;
    hostConn = null;
    if(wasOpen) emit("peer_left", {});
    scheduleRetry(mySession);
  });
}
function scheduleRetry(mySession){
  if(role!=="guest" || mySession!==session) return;
  clearTimeout(retryTimer);
  retryTimer = setTimeout(function(){
    if(mySession!==session) return;
    retryDelay = Math.min(retryDelay*1.6, 8000);
    if(peer && peer.disconnected && !peer.destroyed){ try{ peer.reconnect(); }catch(err){} }
    if(hostConn && hostConn.open) return;
    connectHost(mySession, null, null);
  }, retryDelay);
}

/* ---------------- common ---------------- */
function activeConn(){
  return role==="host" ? guestConn : hostConn;
}
function send(msg){
  var c = activeConn();
  if(!c || !c.open) return false;
  try{ c.send(msg); return true; }catch(err){ return false; }
}
function leave(){
  session++;
  clearTimeout(retryTimer); retryTimer = null;
  retryDelay = 1200;
  if(guestConn){ try{ guestConn.close(); }catch(err){} guestConn = null; }
  if(hostConn){ try{ hostConn.close(); }catch(err){} hostConn = null; }
  if(peer){ try{ peer.destroy(); }catch(err){} peer = null; }
  role = null; code = null;
}

var MFNet = {
  create: create,
  join: join,
  send: send,
  leave: leave
};
Object.defineProperty(MFNet, "isHost", { get: function(){ return role==="host"; } });
Object.defineProperty(MFNet, "connected", { get: function(){ var c = activeConn(); return !!(c && c.open); } });
Object.defineProperty(MFNet, "code", { get: function(){ return code; } });
window.MFNet = MFNet;
})();
