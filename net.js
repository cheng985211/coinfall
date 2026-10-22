/* =========================================================
   命途回廊 · COINFALL
   net.js — 联机传输层
   ---------------------------------------------------------
   PeerJS / WebRTC DataChannel：局域网与公网点对点，支持
   房主 + 最多 7 名真人访客（2–4 人组队 / 1v4 等）。
   另有「一键匹配」：通过固定队列房间自动撮合，无需服务器。
   设计：房主权威。访客只发送“意图”，由房主引擎校验后广播状态。
   ========================================================= */
(function (root) {
  'use strict';

  const LS_KEY = 'coinfall.net.config.v1';
  // 本地优先（避免 CDN 被墙），再回退到公共 CDN。
  const PEER_CDN = [
    'assets/vendor/peerjs.min.js',
    'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js',
    'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js'
  ];
  const SUPABASE_CDN = [
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js',
    'https://unpkg.com/@supabase/supabase-js@2.45.4/dist/umd/supabase.js'
  ];

  const MATCH_SLOTS = 12;              // 匹配队列槽位数量
  const MATCH_PREFIX = 'coinfall-q-';  // 队列 Peer ID 前缀
  const DEFAULT_MAX_GUESTS = 7;        // 房主 + 最多 7 名真人（4v4）

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
    match: function () {},
    error: function () {}
  };

  function on(name, fn) {
    if (typeof fn === 'function') handlers[name] = fn;
  }

  function emit(name, payload, meta) {
    try { handlers[name] && handlers[name](payload, meta); } catch (e) { console.error('[net handler]', name, e); }
  }

  const state = {
    role: null,          // host | guest
    transport: null,     // peer | supabase
    code: null,
    passwordHash: '',
    name: '',
    connected: false,
    guests: [],          // 房主侧：{ conn, seat, name, id }
    maxGuests: DEFAULT_MAX_GUESTS,
    guestSeat: 1,
    mode: 'standard',
    peer: null,
    conn: null,
    peerConnectTimer: null,
    supabase: null,
    channel: null,
    heartbeat: null,
    matchmaking: false,
    matchSeats: 2,
    matchSlot: null,
    matchProbe: null,
    matchProbing: false,
    sizes: null,
    started: false
  };

  function reset() {
    if (state.heartbeat) { clearInterval(state.heartbeat); state.heartbeat = null; }
    if (state.matchProbe) { clearInterval(state.matchProbe); state.matchProbe = null; }
    state.matchProbing = false;
    state.matchSlot = null;
    state.matchSeats = 2;
    state.sizes = null;
    if (state.peerConnectTimer) { clearTimeout(state.peerConnectTimer); state.peerConnectTimer = null; }
    try { state.guests.forEach(function (g) { try { g.conn.close(); } catch (e) {} }); } catch (e) {}
    state.guests = [];
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
    state.peer = null;
    state.conn = null;
    state.supabase = null;
    state.channel = null;
    state.started = false;
    state.matchmaking = false;
    state.guestSeat = 1;
  }

  function status(status, message, extra) {
    emit('status', Object.assign({
      status: status,
      message: message || '',
      role: state.role,
      transport: state.transport,
      code: state.code,
      connected: state.connected,
      matchmaking: state.matchmaking,
      started: state.started,
      mode: state.mode,
      maxGuests: state.maxGuests,
      sizes: state.sizes,
      guests: guestList()
    }, extra || {}));
  }

  function guestList() {
    return state.guests.map(function (g) { return { name: g.name, seat: g.seat }; });
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

  function matchPeerId(slot) {
    return MATCH_PREFIX + slot;
  }

  /* ---------------------------------------------------------
     PeerJS 房主（支持多名真人访客）
     --------------------------------------------------------- */
  async function hostPeer(options) {
    reset();
    state.role = 'host';
    state.transport = 'peer';
    state.code = normalizeCode(options.code || generateCode());
    state.passwordHash = hashPassword(options.password || '');
    state.name = options.name || '房主';
    state.mode = options.mode || 'standard';
    state.sizes = options.sizes || null;
    state.maxGuests = Math.max(1, Math.min(DEFAULT_MAX_GUESTS, Number(options.maxGuests) || DEFAULT_MAX_GUESTS));
    status('connecting', '正在向 PeerJS 信令服务器登记房间…');
    await loadScript(PEER_CDN);
    if (!root.Peer) throw new Error('PeerJS 加载失败');

    return new Promise(function (resolve, reject) {
      const peer = new root.Peer(peerIdFor(state.code), peerOptions());
      state.peer = peer;
      let settled = false;

      peer.on('open', function () {
        settled = true;
        status('waiting', '房间已开启，等待执币者入席…');
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
    if (state.guests.length >= state.maxGuests) {
      try { conn.close(); } catch (e) {}
      return;
    }
    const entry = { conn: conn, seat: null, name: null, id: randomId() };
    state.guests.push(entry);
    conn.on('open', function () {
      status('handshake', '有玩家接入，正在核对房间密码…');
    });
    conn.on('data', function (raw) { handlePeerData(entry, raw); });
    conn.on('close', function () { removeGuest(entry, '连接已断开'); });
    conn.on('error', function (err) { emit('error', { message: '连接错误：' + (err.message || err) }); });
  }

  function handlePeerData(entry, raw) {
    const msg = normalizeMessage(raw);
    if (!msg) return;
    if (msg.type === 'hello') {
      if (msg.passwordHash !== state.passwordHash) {
        try { entry.conn.send({ type: 'reject', reason: '密码不正确。回廊不欢迎猜密码的人。' }); } catch (e) {}
        setTimeout(function () { try { entry.conn.close(); } catch (e) {} }, 300);
        status('waiting', '有人尝试加入，但密码错误。');
        return;
      }
      if (state.started) {
        try { entry.conn.send({ type: 'reject', reason: '对局已开始。请让房主开新桌，或重新匹配。' }); } catch (e) {}
        setTimeout(function () { try { entry.conn.close(); } catch (e) {} }, 400);
        status(state.matchmaking ? 'waiting' : 'connected', '对局已开始，拒绝了迟到的加入请求。');
        return;
      }
      if (entry.seat != null) return;
      const seat = nextFreeSeat();
      if (seat == null) {
        try { entry.conn.send({ type: 'reject', reason: '房间已满。这桌没有空位了。' }); } catch (e) {}
        setTimeout(function () { try { entry.conn.close(); } catch (e) {} }, 300);
        return;
      }
      entry.seat = seat;
      entry.name = String(msg.name || '访客').slice(0, 12);
      state.connected = true;
      try {
        entry.conn.send({
          type: 'welcome', seat: seat, code: state.code, hostName: state.name,
          mode: state.mode, transport: 'peer', matchmaking: state.matchmaking,
          maxGuests: state.maxGuests, sizes: state.sizes
        });
      } catch (e) {}
      emit('join', { name: entry.name, seat: seat });
      status('connected', entry.name + ' 已入席（' + guestList().length + ' 名真人）。');
      return;
    }
    emit('message', msg, { fromSeat: entry.seat });
  }

  function removeGuest(entry, reason) {
    const index = state.guests.indexOf(entry);
    if (index < 0) return;
    state.guests.splice(index, 1);
    state.connected = state.guests.length > 0;
    if (entry.seat != null) {
      emit('leave', { name: entry.name || '访客', seat: entry.seat, reason: reason });
    }
    if (state.guests.length === 0 && !state.matchmaking) {
      status('waiting', '所有访客已离开，等待新的执币者…');
    } else {
      status('connected', '还有 ' + state.guests.length + ' 名真人执币者。');
    }
  }

  function nextFreeSeat() {
    const used = {};
    state.guests.forEach(function (g) { if (g.seat != null) used[g.seat] = true; });
    for (let seat = 1; seat <= state.maxGuests; seat++) {
      if (!used[seat]) return seat;
    }
    return null;
  }

  function sendToSeat(seat, msg) {
    const guest = state.guests.find(function (g) { return g.seat === Number(seat); });
    if (guest && guest.conn && guest.conn.open) {
      try { guest.conn.send(msg); return true; } catch (e) { emit('error', { message: '发送失败：' + e.message }); }
    }
    return false;
  }

  function sendRaw(msg) {
    if (state.role === 'host') {
      state.guests.forEach(function (guest) {
        if (guest.conn && guest.conn.open) {
          try { guest.conn.send(msg); } catch (e) { emit('error', { message: '发送失败：' + e.message }); }
        }
      });
      return;
    }
    if (state.conn && state.conn.open) {
      try { state.conn.send(msg); } catch (e) { emit('error', { message: '发送失败：' + e.message }); }
    }
  }

  /* ---------------------------------------------------------
     PeerJS 访客
     --------------------------------------------------------- */
  async function connectToPeer(targetPeerId, options, expectWelcome) {
    await loadScript(PEER_CDN);
    if (!root.Peer) throw new Error('PeerJS 加载失败');

    return new Promise(function (resolve, reject) {
      const peer = new root.Peer(peerOptions());
      state.peer = peer;
      let settled = false;
      let conn = null;
      const timer = setTimeout(function () {
        if (!settled) {
          settled = true;
          try { if (conn) conn.close(); } catch (e) {}
          try { peer.destroy(); } catch (e) {}
          reject(new Error('连接超时。确认房间号正确，且房主仍在等待。'));
        }
      }, 15000);

      function fail(error) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      }

      peer.on('open', function () {
        conn = peer.connect(targetPeerId, { reliable: true, serialization: 'json' });
        state.conn = conn;
        conn.on('open', function () {
          status('handshake', '通道已建立，正在递交暗号…');
          try { conn.send({ type: 'hello', name: options.name || '访客', passwordHash: state.passwordHash, version: 1 }); } catch (e) {}
        });
        conn.on('data', function (raw) {
          const msg = normalizeMessage(raw);
          if (!msg) return;
          if (msg.type === 'welcome') {
            state.mode = msg.mode || state.mode;
            state.sizes = msg.sizes || state.sizes;
            if (msg.maxGuests != null) state.maxGuests = Number(msg.maxGuests);
            state.connected = true;
            state.guestSeat = msg.seat || 1;
            settled = true;
            clearTimeout(timer);
            emit('welcome', msg);
            status('connected', '已入席。等待房主开桌…', { guests: [] });
            resolve({ code: state.code, role: 'guest', transport: 'peer', seat: state.guestSeat, matchmaking: !!msg.matchmaking });
            return;
          }
          if (msg.type === 'reject') {
            const error = new Error(msg.reason || '房主拒绝了连接');
            status('error', error.message);
            fail(error);
            return;
          }
          emit('message', msg, { fromSeat: 0 });
        });
        conn.on('close', function () {
          state.connected = false;
          status('closed', '与房主的连接已断开。');
          emit('leave', { reason: '房主离开了房间' });
        });
        conn.on('error', function (err) {
          const message = '连接错误：' + (err.message || err);
          status('error', message);
          fail(new Error(message));
        });
      });
      peer.on('error', function (err) {
        const msg = peerErrorText(err);
        status('error', msg);
        fail(new Error(msg));
      });

      if (!expectWelcome) {
        // 匹配场景：只要通道建立即可继续（hello/welcome 由上层处理）
        resolve({ pending: true });
      }
    });
  }

  async function joinPeer(options) {
    reset();
    state.role = 'guest';
    state.transport = 'peer';
    state.code = normalizeCode(options.code);
    state.passwordHash = hashPassword(options.password || '');
    state.name = options.name || '访客';
    status('connecting', '正在连接房主的信令节点…');
    return connectToPeer(peerIdFor(state.code), options, true);
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
    const name = state.name || '访客';
    state.connected = false;
    status('waiting', name + ' 已离开，等待新的执币者…');
    emit('leave', { name: name, reason: reason });
  }

  /* ---------------------------------------------------------
     一键匹配（无需服务器的固定槽位队列）
     --------------------------------------------------------- */
  function clampSeats(value, fallback) {
    const n = Number(value);
    if (!isFinite(n)) return fallback;
    return Math.max(2, Math.min(8, Math.round(n)));
  }

  async function quickMatch(options) {
    options = options || {};
    reset();
    state.name = String(options.name || '匹配玩家').slice(0, 12);
    state.passwordHash = hashPassword(options.password || '');
    const seats = clampSeats(options.seats, 2);
    state.matchSeats = seats;
    state.sizes = options.sizes || { a: Math.ceil(seats / 2), b: Math.floor(seats / 2) };
    state.mode = options.mode || 'standard';
    state.maxGuests = Math.max(1, Math.min(DEFAULT_MAX_GUESTS, seats - 1));
    state.matchmaking = true;
    status('connecting', seats > 2 ? ('正在寻找 ' + seats + ' 人同桌的玩家…') : '正在寻找对手…');
    await loadScript(PEER_CDN);
    if (!root.Peer) throw new Error('PeerJS 加载失败');

    // 单一队列：同一座数只排一条队（coinfall-q-<seats>-<k>），先入席、占不到再做房主。
    // 所有人按 k 升序扫描，因此会先把 0 号桌坐满，再开 1 号桌，无需探测互等。
    const TABLES = 4;
    for (let k = 0; k < TABLES; k++) {
      const peerId = MATCH_PREFIX + seats + '-' + k;
      for (let attempt = 0; attempt < 3; attempt++) {
        const joined = await tryJoinMatchSlot(peerId, options);
        if (joined) { stopMatchProbe(); return joined; }
        const hosted = await tryHostMatchSlot(peerId, k, options);
        if (hosted) { stopMatchProbe(); return hosted; }
        await new Promise(function (r) { setTimeout(r, 260); });
      }
    }
    reset();
    throw new Error('匹配队列繁忙，请稍后重试。');
  }

  // 多人同时点击匹配时，可能各自占桌互等。约定「槽位号小者优先」：
  // 占桌者持续向更小的空槽探测，一旦发现更早的房主就放弃自己的桌转为访客。
  function startMatchProbe(ownSlot, options) {
    stopMatchProbe();
    state.matchSlot = ownSlot;
    const startedAt = Date.now();
    state.matchProbe = setInterval(async function () {
      if (!state.matchmaking || state.role !== 'host' || !state.peer) { stopMatchProbe(); return; }
      if (state.guests.length) { stopMatchProbe(); return; }
      if (state.matchProbing) return;
      if (Date.now() - startedAt > 60000) { stopMatchProbe(); return; }
      state.matchProbing = true;
      try {
        for (let slot = 0; slot < ownSlot; slot++) {
          const oldPeer = state.peer;
          const joined = await tryJoinMatchSlot(matchPeerId(slot), options);
          if (joined) {
            try { if (oldPeer && oldPeer !== state.peer) oldPeer.destroy(); } catch (e) { /* ignore */ }
            stopMatchProbe();
            // 让上层把「匹配房主」降级为「匹配访客」，等对方开桌。
            emit('matchdemoted', joined);
            return;
          }
          if (state.role !== 'host' || !state.matchmaking || state.guests.length) {
            stopMatchProbe();
            return;
          }
        }
      } finally {
        state.matchProbing = false;
      }
    }, 1400);
  }

  function stopMatchProbe() {
    if (state.matchProbe) { clearInterval(state.matchProbe); state.matchProbe = null; }
  }

  function markStarted() {
    state.started = true;
    stopMatchProbe();
  }

  function tryHostMatchSlot(peerId, slot, options) {
    return new Promise(function (resolve) {
      let settled = false;
      let peer;
      try { peer = new root.Peer(peerId, peerOptions()); } catch (e) { return resolve(null); }
      const timer = setTimeout(function () {
        if (settled) return;
        settled = true;
        try { peer.destroy(); } catch (e) {}
        resolve(null);
      }, 7000);

      peer.on('open', function () {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        state.peer = peer;
        state.role = 'host';
        state.transport = 'peer';
        state.matchmaking = true;
        state.matchSlot = slot;
        state.code = 'Q-' + String(slot + 1).padStart(2, '0');
        state.connected = false;
        status('waiting', state.matchSeats > 2
          ? ('匹配中：已占好 ' + state.matchSeats + ' 人牌桌，等待其他玩家…')
          : '匹配中：已占好牌桌，等待对手…');
        peer.on('connection', function (conn) { acceptPeerConnection(conn); });
        peer.on('error', function (err) {
          const msg = peerErrorText(err);
          if (err && err.type === 'unavailable-id') return;
          status('error', msg);
          emit('error', { message: msg });
        });
        startHeartbeat();
        resolve({ role: 'host', transport: 'peer', code: state.code, matchmaking: true, slot: slot, seats: state.matchSeats, mode: state.mode, sizes: state.sizes });
      });
      peer.on('error', function (err) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        try { peer.destroy(); } catch (e) {}
        resolve(null);
      });
    });
  }

  function tryJoinMatchSlot(peerId, options) {
    return new Promise(function (resolve) {
      let settled = false;
      let peer = null;
      let conn = null;
      const finish = function (value) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (!value) {
          try { if (conn) conn.close(); } catch (e) {}
          try { if (peer) peer.destroy(); } catch (e) {}
        }
        resolve(value);
      };
      const timer = setTimeout(function () { finish(null); }, 6000);

      try { peer = new root.Peer(peerOptions()); } catch (e) { return finish(null); }
      peer.on('open', function () {
        conn = peer.connect(peerId, { reliable: true, serialization: 'json' });
        conn.on('open', function () {
          try { conn.send({ type: 'hello', name: options.name || '匹配玩家', passwordHash: state.passwordHash || hashPassword(options.password || ''), version: 1, matchmaking: true }); } catch (e) {}
        });
        conn.on('data', function (raw) {
          const msg = normalizeMessage(raw);
          if (!msg) return;
          if (msg.type === 'welcome') {
            state.peer = peer;
            state.conn = conn;
            state.role = 'guest';
            state.transport = 'peer';
            state.matchmaking = true;
            state.code = 'Q-匹配';
            state.guestSeat = msg.seat || 1;
            state.mode = msg.mode || state.mode;
            state.sizes = msg.sizes || state.sizes;
            if (msg.maxGuests != null) state.maxGuests = Number(msg.maxGuests);
            state.connected = true;
            emit('welcome', msg);
            status('connected', '匹配成功，正在入席…', { guests: [] });
            finish({ role: 'guest', transport: 'peer', code: state.code, seat: state.guestSeat, matchmaking: true, seats: state.matchSeats, mode: state.mode, sizes: state.sizes });
            return;
          }
          if (msg.type === 'reject') { finish(null); return; }
          emit('message', msg, { fromSeat: 0 });
        });
        conn.on('close', function () {
          if (!settled) return finish(null);
          state.connected = false;
          status('closed', '与房主的连接已断开。');
          emit('leave', { reason: '房主离开了房间' });
        });
        conn.on('error', function () { finish(null); });
      });
      peer.on('error', function () { finish(null); });
    });
  }

  /* ---------------------------------------------------------
     Supabase Realtime（高级自定义，单访客）
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
    state.maxGuests = 1;
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
          status('waiting', '公网房间已开启，等待执币者…');
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
          status('connected', '已入席。等待房主开桌…', { guests: [] });
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
        emit('message', msg, { fromSeat: 0 });
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
      if (state.connected && state.guests.length) {
        broadcastRaw({ type: 'reject', to: 1, reason: '房间已满。这桌只留一个位置。' });
        return;
      }
      const name = String(msg.name || '访客').slice(0, 12);
      state.guests = [{ name: name, seat: 1, conn: null, id: randomId() }];
      state.connected = true;
      broadcastRaw({
        type: 'welcome', seat: 1, code: state.code, hostName: state.name,
        mode: state.mode, transport: 'supabase', to: 1
      });
      emit('join', { name: name, seat: 1 });
      status('connected', name + ' 已入席。');
      return;
    }
    emit('message', msg, { fromSeat: 1 });
  }

  function syncPresence() {
    if (!state.channel) return;
    const presence = state.channel.presenceState();
    const all = Object.values(presence).flat();
    if (state.role === 'host') {
      const guests = all.filter(function (p) { return p.role === 'guest'; });
      if (!guests.length && state.guests.length) {
        const old = state.guests[0];
        state.guests = [];
        state.connected = false;
        status('waiting', (old.name || '访客') + ' 已离开，等待新的执币者…');
        emit('leave', { name: old.name || '访客', seat: 1, reason: '对方离开' });
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

  async function match(options) {
    options = options || {};
    try {
      return await quickMatch(options);
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

  function sendTo(seat, msg) {
    if (state.transport === 'supabase') {
      broadcastRaw(Object.assign({ to: seat }, msg));
      return true;
    }
    return sendToSeat(seat, msg);
  }

  function sendState(view, seat) {
    const msg = { type: 'state', state: view, seat: seat || 1 };
    if (state.transport === 'supabase') {
      broadcastRaw(Object.assign({ to: seat || 1 }, msg));
    } else if (state.role === 'host' && seat != null) {
      sendToSeat(seat, msg);
    } else {
      sendRaw(msg);
    }
  }

  function leave() {
    stopMatchProbe();
    try {
      if (state.role === 'host' && state.guests.length) {
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
        status(state.matchmaking ? 'waiting' : 'waiting', state.matchmaking ? '匹配中：等待对手入席…' : '等待执币者入席…');
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
      connected: state.connected, guests: guestList(), name: state.name, mode: state.mode,
      matchmaking: state.matchmaking, maxGuests: state.maxGuests,
      sizes: state.sizes, started: state.started, matchSeats: state.matchSeats
    };
  }

  root.CF_NET = {
    config, configure, on, host, join, match, send, sendTo, sendState, leave, reset,
    markStarted, normalizeCode, generateCode, hashPassword, getState, isHost,
    loadConfig, DEFAULT_CONFIG, peers: function () { return guestList(); }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.CF_NET;
})(typeof window !== 'undefined' ? window : globalThis);