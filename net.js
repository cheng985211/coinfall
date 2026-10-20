/* =========================================================
   命途回廊 · COINFALL
   net.js — 联机传输层
   ---------------------------------------------------------
   LAN  : PeerJS / WebRTC DataChannel（公共信令或自建 PeerServer）
   PUBLIC: Supabase Realtime Broadcast + Presence（免费版）
   设计：房主权威。访客只发送“意图”，由房主引擎校验后广播状态。
   ========================================================= */
(function (root) {
  'use strict';

  const LS_KEY = 'coinfall.net.config.v1';
  const PEER_CDN = [
    'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js',
    'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js'
  ];
  const SUPABASE_CDN = [
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js',
    'https://unpkg.com/@supabase/supabase-js@2.45.4/dist/umd/supabase.js'
  ];

  const DEFAULT_CONFIG = {
    peer: { host: '', port: 443, secure: true, path: '/', key: 'peerjs' },
    supabase: { url: '', anonKey: '' }
  };

  function loadConfig() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          peer: Object.assign({}, DEFAULT_CONFIG.peer, parsed.peer || {}),
          supabase: Object.assign({}, DEFAULT_CONFIG.supabase, parsed.supabase || {})
        };
      }
    } catch (e) { /* ignore */ }
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  }

  const config = loadConfig();

  function configure(patch) {
    if (patch && patch.peer) Object.assign(config.peer, patch.peer);
    if (patch && patch.supabase) Object.assign(config.supabase, patch.supabase);
    try { localStorage.setItem(LS_KEY, JSON.stringify(config)); } catch (e) { /* ignore */ }
    return config;
  }

  /* ---------------------------------------------------------
     工具
     --------------------------------------------------------- */
  function normalizeCode(input) {
    let raw = String(input || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (raw.startsWith('CF')) raw = raw.slice(2);
    raw = raw.slice(0, 4);
    return 'CF-' + (raw || '0000');
  }

  function generateCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    const bytes = new Uint8Array(4);
    if (root.crypto && root.crypto.getRandomValues) root.crypto.getRandomValues(bytes);
    else for (let i = 0; i < 4; i++) bytes[i] = Math.floor(Math.random() * 256);
    for (let i = 0; i < 4; i++) out += alphabet[bytes[i] % alphabet.length];
    return 'CF-' + out;
  }

  // 仅作房间门槛，不是密码学级安全。公网敏感场景请改用服务端鉴权。
  function hashPassword(password) {
    const str = String(password || '');
    let h1 = 0x811c9dc5;
    let h2 = 0x9e3779b9;
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i);
      h1 ^= c;
      h1 = Math.imul(h1, 0x01000193) >>> 0;
      h2 = Math.imul(h2 ^ c, 0x85ebca6b) >>> 0;
    }
    return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
  }

  function loadScript(urls) {
    return new Promise(function (resolve, reject) {
      let index = 0;
      function next() {
        if (index >= urls.length) return reject(new Error('资源加载失败，请检查网络'));
        const url = urls[index++];
        const existing = document.querySelector('script[src="' + url + '"]');
        if (existing && existing.dataset.loaded === '1') return resolve();
        const script = document.createElement('script');
        script.src = url;
        script.async = true;
        script.onload = function () { script.dataset.loaded = '1'; resolve(); };
        script.onerror = function () { script.remove(); next(); };
        document.head.appendChild(script);
      }
      next();
    });
  }

  const handlers = {
    status: function () {},
    message: function () {},
    join: function () {},
    leave: function () {},
    welcome: function () {},
    error: function () {}
  };

  function on(name, fn) {
    if (typeof fn === 'function') handlers[name] = fn;
  }

  function emit(name, payload) {
    try { handlers[name] && handlers[name](payload); } catch (e) { console.error('[net handler]', name, e); }
  }

  const state = {
    role: null,          // host | guest
    transport: null,     // peer | supabase
    code: null,
    passwordHash: '',
    name: '',
    connected: false,
    guest: null,
    guestSeat: 1,
    mode: 'standard',
    peer: null,
    conn: null,
    supabase: null,
    channel: null,
    heartbeat: null,
    started: false
  };

  function reset() {
    if (state.heartbeat) { clearInterval(state.heartbeat); state.heartbeat = null; }
    try { if (state.conn) state.conn.close(); } catch (e) { /* ignore */ }
    try { if (state.peer) state.peer.destroy(); } catch (e) { /* ignore */ }
    try {
      if (state.channel && state.supabase) state.supabase.removeChannel(state.channel);
    } catch (e) { /* ignore */ }
    state.role = null;
    state.transport = null;
    state.code = null;
    state.passwordHash = '';
    state.connected = false;
    state.guest = null;
    state.peer = null;
    state.conn = null;
    state.supabase = null;
    state.channel = null;
    state.started = false;
  }

  function status(status, message, extra) {
    emit('status', Object.assign({
      status: status,
      message: message || '',
      role: state.role,
      transport: state.transport,
      code: state.code,
      connected: state.connected
    }, extra || {}));
  }

  function peerOptions() {
    const p = config.peer || {};
    if (!p.host) return { debug: 1 };
    return {
      debug: 1,
      host: p.host,
      port: Number(p.port) || 443,
      secure: p.secure !== false,
      path: p.path || '/',
      key: p.key || 'peerjs'
    };
  }

  function peerIdFor(code) {
    return 'coinfall-v1-' + normalizeCode(code).replace('-', '').toLowerCase();
  }

  /* ---------------------------------------------------------
     PeerJS 房主
     --------------------------------------------------------- */
  async function hostPeer(options) {
    reset();
    state.role = 'host';
    state.transport = 'peer';
    state.code = normalizeCode(options.code || generateCode());
    state.passwordHash = hashPassword(options.password || '');
    state.name = options.name || '房主';
    state.mode = options.mode || 'standard';
    status('connecting', '正在向 PeerJS 信令服务器登记房间…');
    await loadScript(PEER_CDN);
    if (!root.Peer) throw new Error('PeerJS 加载失败');

    return new Promise(function (resolve, reject) {
      const peer = new root.Peer(peerIdFor(state.code), peerOptions());
      state.peer = peer;
      let settled = false;

      peer.on('open', function () {
        settled = true;
        status('waiting', '房间已开启，等待另一位执币者…');
        startHeartbeat();
        resolve({ code: state.code, role: 'host', transport: 'peer' });
      });
      peer.on('connection', function (conn) { acceptPeerConnection(conn); });
      peer.on('error', function (err) {
        const msg = peerErrorText(err);
        status('error', msg);
        emit('error', { message: msg, raw: err });
        if (!settled) { settled = true; reject(new Error(msg)); }
      });
      peer.on('disconnected', function () { status('reconnecting', '与信令服务器断线，正在重连…'); try { peer.reconnect(); } catch (e) {} });
    });
  }

  function acceptPeerConnection(conn) {
    if (state.conn && state.conn.open) {
      try { conn.close(); } catch (e) {}
      return;
    }
    state.conn = conn;
    conn.on('open', function () {
      status('handshake', '有玩家接入，正在核对房间密码…');
      // 等待访客 hello
    });
    conn.on('data', function (raw) { handlePeerData(raw); });
    conn.on('close', function () { handleGuestLeave('连接已断开'); });
    conn.on('error', function (err) { emit('error', { message: '连接错误：' + (err.message || err) }); });
  }

  function handlePeerData(raw) {
    const msg = normalizeMessage(raw);
    if (!msg) return;
    if (msg.type === 'hello') {
      if (msg.passwordHash !== state.passwordHash) {
        sendRaw({ type: 'reject', reason: '密码不正确。回廊不欢迎猜密码的人。' });
        setTimeout(function () { try { state.conn.close(); } catch (e) {} }, 300);
        status('waiting', '有人尝试加入，但密码错误。');
        return;
      }
      state.guest = { name: msg.name || '访客', seat: state.guestSeat };
      state.connected = true;
      sendRaw({
        type: 'welcome', seat: state.guestSeat, code: state.code, hostName: state.name,
        mode: state.mode, transport: 'peer'
      });
      emit('join', { name: state.guest.name, seat: state.guestSeat });
      emit('welcome', { seat: state.guestSeat, code: state.code, hostName: state.name });
      status('connected', state.guest.name + ' 已入席。');
      return;
    }
    emit('message', msg);
  }

  function sendRaw(msg) {
    if (state.conn && state.conn.open) {
      try { state.conn.send(msg); } catch (e) { emit('error', { message: '发送失败：' + e.message }); }
    }
  }

  /* ---------------------------------------------------------
     PeerJS 访客
     --------------------------------------------------------- */
  async function joinPeer(options) {
    reset();
    state.role = 'guest';
    state.transport = 'peer';
    state.code = normalizeCode(options.code);
    state.passwordHash = hashPassword(options.password || '');
    state.name = options.name || '访客';
    status('connecting', '正在连接房主的信令节点…');
    await loadScript(PEER_CDN);
    if (!root.Peer) throw new Error('PeerJS 加载失败');

    return new Promise(function (resolve, reject) {
      const peer = new root.Peer(peerOptions());
      state.peer = peer;
      let settled = false;
      const timer = setTimeout(function () {
        if (!settled) { settled = true; reject(new Error('连接超时。确认房间号正确，且房主仍在等待。')); }
      }, 15000);

      peer.on('open', function () {
        const conn = peer.connect(peerIdFor(state.code), { reliable: true, serialization: 'json' });
        state.conn = conn;
        conn.on('open', function () {
          status('handshake', '通道已建立，正在递交暗号…');
          sendRaw({ type: 'hello', name: state.name, passwordHash: state.passwordHash, version: 1 });
        });
        conn.on('data', function (raw) {
          const msg = normalizeMessage(raw);
          if (!msg) return;
          if (msg.type === 'welcome') {
            state.connected = true;
            state.guestSeat = msg.seat || 1;
            settled = true;
            clearTimeout(timer);
            emit('welcome', msg);
            status('connected', '已入席。等待房主开桌…');
            resolve({ code: state.code, role: 'guest', transport: 'peer', seat: state.guestSeat });
            return;
          }
          if (msg.type === 'reject') {
            settled = true;
            clearTimeout(timer);
            const error = new Error(msg.reason || '房主拒绝了连接');
            status('error', error.message);
            reject(error);
            return;
          }
          emit('message', msg);
        });
        conn.on('close', function () {
          state.connected = false;
          status('closed', '与房主的连接已断开。');
          emit('leave', { reason: '房主离开了房间' });
        });
        conn.on('error', function (err) {
          const message = '连接错误：' + (err.message || err);
          status('error', message);
          if (!settled) { settled = true; clearTimeout(timer); reject(new Error(message)); }
        });
      });
      peer.on('error', function (err) {
        const msg = peerErrorText(err);
        status('error', msg);
        if (!settled) { settled = true; clearTimeout(timer); reject(new Error(msg)); }
      });
    });
  }

  function peerErrorText(err) {
    const type = err && err.type;
    const map = {
      'peer-unavailable': '找不到这个房间。确认房间号，且房主还在等待。',
      'unavailable-id': '房间号已被占用，请重新生成。',
      'network': '信令服务器无响应，请检查网络。',
      'server-error': 'PeerJS 信令服务器暂时不可用。',
      'browser-incompatible': '当前浏览器不支持 WebRTC。'
    };
    return map[type] || ('联机错误：' + ((err && err.message) || type || '未知错误'));
  }

  function handleGuestLeave(reason) {
    const name = state.guest ? state.guest.name : '访客';
    state.guest = null;
    state.connected = false;
    status('waiting', name + ' 已离开，等待新的执币者…');
    emit('leave', { name: name, reason: reason });
  }

  /* ---------------------------------------------------------
     Supabase Realtime
     --------------------------------------------------------- */
  async function supabaseClient() {
    if (state.supabase) return state.supabase;
    if (!config.supabase.url || !config.supabase.anonKey) {
      throw new Error('尚未配置 Supabase 项目地址与 anon key。请在设置 → 联机配置中填写。');
    }
    await loadScript(SUPABASE_CDN);
    const factory = root.supabase;
    if (!factory || !factory.createClient) throw new Error('Supabase SDK 加载失败');
    state.supabase = factory.createClient(config.supabase.url, config.supabase.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    return state.supabase;
  }

  async function hostSupabase(options) {
    reset();
    state.role = 'host';
    state.transport = 'supabase';
    state.code = normalizeCode(options.code || generateCode());
    state.passwordHash = hashPassword(options.password || '');
    state.name = options.name || '房主';
    state.mode = options.mode || 'standard';
    status('connecting', '正在连接 Supabase Realtime…');
    const client = await supabaseClient();
    const channel = client.channel('coinfall-room-' + state.code, {
      config: { broadcast: { self: false }, presence: { key: 'host-' + randomId() } }
    });
    state.channel = channel;

    return new Promise(function (resolve, reject) {
      let settled = false;
      const timer = setTimeout(function () {
        if (!settled) { settled = true; reject(new Error('Supabase 连接超时。检查 URL / anon key 与 Realtime 是否开启。')); }
      }, 15000);

      channel.on('broadcast', { event: 'msg' }, function (payload) {
        const msg = payload && payload.payload;
        if (!msg) return;
        if (msg.to && msg.to !== 'host' && msg.to !== 0) return;
        handleSupabaseMessage(msg);
      });
      channel.on('presence', { event: 'sync' }, function () {
        syncPresence();
      });
      channel.subscribe(async function (subStatus) {
        if (subStatus === 'SUBSCRIBED') {
          settled = true;
          clearTimeout(timer);
          await channel.track({ name: state.name, role: 'host', seat: 0, at: Date.now() });
          status('waiting', '公网房间已开启，等待另一位执币者…');
          upsertRoom().catch(function () {});
          resolve({ code: state.code, role: 'host', transport: 'supabase' });
        } else if (subStatus === 'CHANNEL_ERROR' || subStatus === 'TIMED_OUT') {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            reject(new Error('Supabase 频道连接失败。请确认项目已启用 Realtime。'));
          }
          status('error', 'Supabase 频道连接中断。');
        }
      });
    });
  }

  async function joinSupabase(options) {
    reset();
    state.role = 'guest';
    state.transport = 'supabase';
    state.code = normalizeCode(options.code);
    state.passwordHash = hashPassword(options.password || '');
    state.name = options.name || '访客';
    status('connecting', '正在接入公网频道…');
    const client = await supabaseClient();
    const channel = client.channel('coinfall-room-' + state.code, {
      config: { broadcast: { self: false }, presence: { key: 'guest-' + randomId() } }
    });
    state.channel = channel;

    return new Promise(function (resolve, reject) {
      let settled = false;
      const timer = setTimeout(function () {
        if (!settled) {
          settled = true;
          reject(new Error('房主没有响应。确认房间号、密码与房主是否在线。'));
        }
      }, 15000);

      channel.on('broadcast', { event: 'msg' }, function (payload) {
        const msg = payload && payload.payload;
        if (!msg) return;
        if (msg.to && msg.to !== state.guestSeat && msg.to !== 'guest') return;
        if (msg.type === 'welcome') {
          state.connected = true;
          state.guestSeat = msg.seat || 1;
          settled = true;
          clearTimeout(timer);
          if (state.channel) state.channel.track({ name: state.name, role: 'guest', seat: state.guestSeat, at: Date.now() }).catch(function () {});
          emit('welcome', msg);
          status('connected', '已入席。等待房主开桌…');
          resolve({ code: state.code, role: 'guest', transport: 'supabase', seat: state.guestSeat });
          return;
        }
        if (msg.type === 'reject') {
          settled = true;
          clearTimeout(timer);
          const error = new Error(msg.reason || '房主拒绝了连接');
          status('error', error.message);
          reject(error);
          return;
        }
        emit('message', msg);
      });
      channel.on('presence', { event: 'sync' }, function () {
        const presence = channel.presenceState();
        const host = Object.values(presence).flat().find(function (p) { return p.role === 'host'; });
        if (!host && state.connected) {
          status('closed', '房主已离开。');
          emit('leave', { reason: '房主已离开' });
        }
      });
      channel.subscribe(function (subStatus) {
        if (subStatus === 'SUBSCRIBED') {
          channel.track({ name: state.name, role: 'guest', seat: 1, at: Date.now() }).catch(function () {});
          broadcastRaw({ type: 'hello', name: state.name, passwordHash: state.passwordHash, version: 1, to: 'host' });
          status('handshake', '已进入频道，正在向房主递交暗号…');
        } else if (subStatus === 'CHANNEL_ERROR' || subStatus === 'TIMED_OUT') {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            reject(new Error('无法连接该公网频道。'));
          }
        }
      });
    });
  }

  function handleSupabaseMessage(msg) {
    if (msg.type === 'hello') {
      if (msg.passwordHash !== state.passwordHash) {
        broadcastRaw({ type: 'reject', to: 1, reason: '密码不正确。回廊不欢迎猜密码的人。' });
        return;
      }
      if (state.connected && state.guest) {
        broadcastRaw({ type: 'reject', to: 1, reason: '房间已满。这桌只留一个位置。' });
        return;
      }
      state.guest = { name: msg.name || '访客', seat: 1 };
      state.connected = true;
      broadcastRaw({
        type: 'welcome', seat: 1, code: state.code, hostName: state.name,
        mode: state.mode, transport: 'supabase', to: 1
      });
      emit('join', { name: state.guest.name, seat: 1 });
      emit('welcome', { seat: 1, code: state.code, hostName: state.name });
      status('connected', state.guest.name + ' 已入席。');
      return;
    }
    emit('message', msg);
  }

  function syncPresence() {
    if (!state.channel) return;
    const presence = state.channel.presenceState();
    const all = Object.values(presence).flat();
    if (state.role === 'host') {
      const guest = all.find(function (p) { return p.role === 'guest'; });
      if (!guest && state.guest) {
        const old = state.guest;
        state.guest = null;
        state.connected = false;
        status('waiting', old.name + ' 已离开，等待新的执币者…');
        emit('leave', { name: old.name, reason: '对方离开' });
      }
    }
  }

  async function upsertRoom() {
    if (!state.supabase || !state.code) return;
    try {
      await state.supabase.from('coinfall_rooms').upsert({
        code: state.code,
        host_name: state.name,
        mode: state.mode,
        status: 'open',
        updated_at: new Date().toISOString()
      }, { onConflict: 'code' });
    } catch (e) { /* 表不存在时忽略；Broadcast 仍可用 */ }
  }

  function broadcastRaw(msg) {
    if (!state.channel) return;
    const payload = Object.assign({}, msg);
    if (state.role === 'host' && !payload.to) payload.to = 1;
    if (state.role === 'guest') payload.to = payload.to || 'host';
    payload.from = state.name;
    payload.at = Date.now();
    state.channel.send({ type: 'broadcast', event: 'msg', payload: payload }).catch(function (e) {
      emit('error', { message: '公网发送失败：' + (e.message || e) });
    });
  }

  /* ---------------------------------------------------------
     通用 API
     --------------------------------------------------------- */
  function normalizeMessage(raw) {
    let msg = raw;
    if (typeof raw === 'string') {
      try { msg = JSON.parse(raw); } catch (e) { return null; }
    }
    if (!msg || typeof msg !== 'object' || !msg.type) return null;
    return msg;
  }

  async function host(options) {
    options = options || {};
    try {
      if (options.transport === 'supabase') return await hostSupabase(options);
      return await hostPeer(options);
    } catch (err) {
      status('error', err.message || String(err));
      emit('error', { message: err.message || String(err) });
      throw err;
    }
  }

  async function join(options) {
    options = options || {};
    try {
      if (options.transport === 'supabase') return await joinSupabase(options);
      return await joinPeer(options);
    } catch (err) {
      status('error', err.message || String(err));
      emit('error', { message: err.message || String(err) });
      throw err;
    }
  }

  function send(msg) {
    if (state.transport === 'supabase') {
      broadcastRaw(msg);
      return;
    }
    sendRaw(msg);
  }

  function sendState(view, seat) {
    const msg = { type: 'state', state: view, seat: seat || 1 };
    if (state.transport === 'supabase') {
      broadcastRaw(Object.assign({ to: seat || 1 }, msg));
    } else {
      sendRaw(msg);
    }
  }

  function leave() {
    try {
      if (state.role === 'host' && state.guest) {
        send({ type: 'bye', reason: '房主关闭了房间' });
      } else if (state.role === 'guest') {
        send({ type: 'bye', reason: '访客离开了房间' });
      }
    } catch (e) { /* ignore */ }
    if (state.supabase && state.code) {
      try {
        state.supabase.from('coinfall_rooms').update({ status: 'closed', updated_at: new Date().toISOString() }).eq('code', state.code).then(function () {}, function () {});
      } catch (e) { /* ignore */ }
    }
    setTimeout(function () { reset(); }, 120);
  }

  function startHeartbeat() {
    if (state.heartbeat) clearInterval(state.heartbeat);
    state.heartbeat = setInterval(function () {
      if (state.role === 'host' && !state.connected) {
        // 保持信令活跃；PeerJS 自身有心跳，这里只更新 UI。
        status('waiting', '等待另一位执币者…');
      }
    }, 25000);
  }

  function randomId() {
    return Math.random().toString(36).slice(2, 9);
  }

  function isHost() { return state.role === 'host'; }
  function getState() {
    return {
      role: state.role, transport: state.transport, code: state.code,
      connected: state.connected, guest: state.guest, name: state.name, mode: state.mode
    };
  }

  root.CF_NET = {
    config, configure, on, host, join, send, sendState, leave, reset,
    normalizeCode, generateCode, hashPassword, getState, isHost,
    loadConfig, DEFAULT_CONFIG
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.CF_NET;
})(typeof window !== 'undefined' ? window : globalThis);