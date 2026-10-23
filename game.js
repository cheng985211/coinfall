/* =========================================================
   星杯赛场 · COINFALL
   game.js — 规则引擎 + 界面控制器 + 音频 + 视觉特效
   ---------------------------------------------------------
   引擎绝对权威（联机时仅房主运行），状态为纯 JSON，可序列化广播。
   ========================================================= */
(function (root) {
  'use strict';

  const D = root.CF_DATA;
  const AI = root.CF_AI;
  const NET = root.CF_NET;
  const ENGINE = (function () {
    const HAND_MAX = 6;
    const SHIELD_MAX = 5;

    const RULES = {
      standard: { hp: 5, chars: 1, teamSize: 1, deck: 15, mult: 1, rerolls: 1, switchChars: false },
      ai: { hp: 5, chars: 1, teamSize: 1, deck: 15, mult: 1, rerolls: 1, switchChars: false },
      brawl: { hp: 5, chars: 2, teamSize: 1, deck: 15, mult: 1, rerolls: 1, switchChars: true },
      endless: { hp: 5, chars: 1, teamSize: 1, deck: 16, mult: 2, rerolls: 0, switchChars: false },
      random: { hp: 5, chars: 1, teamSize: 1, deck: 22, mult: 1, rerolls: 1, switchChars: false },
      custom: { hp: 5, chars: 1, teamSize: 1, deck: 10, mult: 1, rerolls: 1, switchChars: false },
      team: { hp: 5, chars: 1, teamSize: 2, deck: 12, mult: 1, rerolls: 1, switchChars: false, maxCards: 1, dynamicTeams: true },
      quick: { hp: 3, chars: 1, teamSize: 1, deck: 13, mult: 1, rerolls: 1, switchChars: false },
      story: { hp: 5, chars: 1, teamSize: 1, deck: 15, mult: 1, rerolls: 1, switchChars: false },
      mirror: { hp: 5, chars: 1, teamSize: 1, deck: 15, mult: 1, rerolls: 1, switchChars: false, mirror: true },
      frenzy: { hp: 5, chars: 1, teamSize: 1, deck: 18, mult: 1, rerolls: 1, switchChars: false, maxCards: 3, multiPlay: true },
      sudden: { hp: 1, chars: 1, teamSize: 1, deck: 10, mult: 1, rerolls: 1, switchChars: false, healToShield: true },
      chain: { hp: 5, chars: 1, teamSize: 1, deck: 16, mult: 1, rerolls: 1, switchChars: false, chain: 3 },
      chaos: { hp: 5, chars: 1, teamSize: 1, deck: 18, mult: 1, rerolls: 1, switchChars: false, chaos: true },
      'random-rules': { hp: 5, chars: 1, teamSize: 1, deck: 15, mult: 1, rerolls: 1, switchChars: false, randomRules: true },
      draft: { hp: 5, chars: 1, teamSize: 1, deck: 12, mult: 1, rerolls: 1, switchChars: false, draft: true },
      'double-stakes': { hp: 5, chars: 1, teamSize: 1, deck: 15, mult: 2, rerolls: 1, switchChars: false }
    };

    // v2.1 random-rules 法则池（1..6）
    const RANDOM_RULES = {
      1: '正面成功时额外造成 1 点伤害',
      2: '反面也触发正面效果',
      3: '本回合每名角色可打出 2 张技能卡',
      4: '本回合第一张技能卡伤害 +1',
      5: '本回合治疗与护盾数值 +1',
      6: '本回合开始双方各抽 1 张牌'
    };

    let gameSeq = 0;

    function uid(prefix) {
      return (prefix || 'id') + '-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 100000).toString(36);
    }

    function shuffle(arr, rng) {
      const out = arr.slice();
      const random = rng || Math.random;
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        const tmp = out[i]; out[i] = out[j]; out[j] = tmp;
      }
      return out;
    }

    function cloneCard(card) {
      return Object.assign({}, card, { uid: uid('card') });
    }

    function randomDeck(size, rng) {
      const pool = shuffle(D.CARDS, rng);
      const out = [];
      for (let i = 0; i < size; i++) out.push(cloneCard(pool[i % pool.length]));
      return out;
    }

    function deckFromIds(ids, fallbackSize, rng) {
      const picked = (ids || []).map(function (id) { return D.byId.card(id); }).filter(Boolean);
      if (picked.length >= 10) return picked.slice(0, 10).map(cloneCard);
      return randomDeck(fallbackSize || 15, rng);
    }

    // v2.1 draft 轮抽赌局：从全卡池按类别均衡 A-B-A-B 交替组 12 张卡组（每方 6）。
    // 返回 { a:[card...], b:[card...] }，供战前展示与重抽。
    function buildDraftDeck(rng) {
      rng = rng || Math.random;
      function poolOf(cat) { return shuffle(D.CARDS.filter(function (c) { return c.category === cat; }), rng); }
      var attack = poolOf('attack'), defense = poolOf('defense'), control = poolOf('control');
      function take(arr, n) { return arr.splice(0, n); }
      // 每方近似 6 攻击 / 3 防御 / 3 控制 = 12
      var aAttack = take(attack, 6), bAttack = take(attack, 6);
      var aDef = take(defense, 3), bDef = take(defense, 3);
      var aCtl = take(control, 3), bCtl = take(control, 3);
      var a = [].concat(aAttack, aDef, aCtl).map(cloneCard);
      var b = [].concat(bAttack, bDef, bCtl).map(cloneCard);
      return { a: a, b: b };
    }

    function createUnit(char, options) {
      options = options || {};
      const hp = options.hp || (char.hp || 5);
      return {
        charId: char.id,
        name: char.name,
        title: char.title || '',
        style: char.style,
        role: char.role,
        hp: hp,
        maxHp: hp,
        shield: char.passive && char.passive.key === 'startShield' ? 1 : 0,
        activeUsesLeft: options.activeUses != null ? options.activeUses : (char.active ? char.active.uses : 1),
        activeName: char.active ? char.active.name : '主动技',
        activeDesc: char.active ? char.active.desc : '',
        activeEffects: char.active ? char.active.effects : {},
        passiveKey: char.passive ? char.passive.key : '',
        passiveName: char.passive ? char.passive.name : '',
        passiveDesc: char.passive ? char.passive.desc : '',
        defeated: false,
        flags: {}
      };
    }

    function createPlayer(opts) {
      const player = {
        id: opts.id,
        seat: opts.seat,
        team: opts.team,
        teamIndex: opts.teamIndex || 1,
        name: opts.name,
        isHuman: !!opts.isHuman,
        isAI: !!opts.isAI,
        aiLevel: opts.aiLevel || 'normal',
        isTeammate: !!opts.isTeammate,
        chars: opts.chars || [],
        active: 0,
        hand: [],
        deck: opts.deck || [],
        discard: [],
        rerolls: opts.rerolls == null ? 1 : opts.rerolls,
        maxRerolls: opts.rerolls == null ? 1 : opts.rerolls,
        chokeNext: 0,
        sealNext: false,
        sealedThisTurn: false,
        blessNext: false,
        rerollBoost: false,
        activeUsedThisTurn: false,
        cardPlayed: false,
        cardsPlayedThisTurn: 0,
        chain: 0,
        switchedThisTurn: false,
        selectedTarget: null,
        turnFlags: {},
        stats: { damageDealt: 0, damageTaken: 0, healed: 0, cardsPlayed: 0, flips: 0, wins: 0, rerolls: 0 },
        orders: [],
        trust: opts.isTeammate ? 6 : null,
        mood: opts.isTeammate ? 62 : null,
        personaId: opts.personaId || null,
        blindNext: false,
        blindThisTurn: false,
        manaBurnNext: false,
        puppetNext: false
      };
      if (player.isAI) AI.initPlayer(player);
      return player;
    }

    function createGame(config, options) {
      options = options || {};
      config = config || {};
      const modeId = config.modeId || 'standard';
      const rules = RULES[modeId] || RULES.standard;
      const rng = config.rng || null;
      const online = options.online || null;
      const game = {
        id: 'game-' + (++gameSeq),
        modeId: modeId,
        modeName: (D.byId.mode(modeId) || {}).name || '标准对战',
        rules: Object.assign({}, rules),
        effectMultiplier: rules.mult,
        noReroll: rules.mult === 2 && modeId === 'endless',
        turn: 1,
        round: 1,
        currentIndex: 0,
        order: [],
        players: [],
        phase: 'idle',
        pending: null,
        over: null,
        events: [],
        eventSeq: 0,
        log: [],
        chat: [],
        theme: config.theme || 'abyss',
        story: null,
        onlineRole: online ? online.role : null,
        viewerId: online ? online.viewerId : 'p0',
        createdAt: Date.now(),
        rng: rng
      };

      const onlineGuest = online && online.guestName ? online.guestName : null;
      const onlineGuests = online
        ? (Array.isArray(online.guests) && online.guests.length
          ? online.guests
          : (onlineGuest ? [{ name: onlineGuest, seat: 1 }] : []))
        : [];
      const guestNames = {};
      onlineGuests.forEach(function (g) {
        const seat = Number(g && g.seat);
        if (seat > 0) guestNames[seat] = String((g && g.name) || '访客').slice(0, 12);
      });
      const hpMult = config.hpMultiplier || 1;
      const hp = Math.round(rules.hp * hpMult);

      function pickChar(requestedId, usedIds) {
        if (requestedId && D.byId.character(requestedId) && (!usedIds || usedIds.indexOf(requestedId) < 0)) return D.byId.character(requestedId);
        const pool = D.CHARACTERS.filter(function (c) { return !usedIds || usedIds.indexOf(c.id) < 0; });
        return pool[Math.floor((rng ? rng() : Math.random()) * pool.length)] || D.CHARACTERS[0];
      }

      function makeUnits(count, primaryId, secondaryId, usedIds, boss) {
        const units = [];
        for (let i = 0; i < count; i++) {
          if (boss && i === 0) {
            units.push(createUnit(boss, { hp: boss.hp, activeUses: boss.active.uses }));
          } else {
            const char = pickChar(i === 0 ? primaryId : secondaryId, usedIds);
            usedIds.push(char.id);
            units.push(createUnit(char, { hp: hp }));
          }
        }
        return units;
      }

      const used = [];
      const clampTeam = function (value, fallback) {
        const n = Number(value);
        if (!isFinite(n)) return fallback;
        return Math.max(1, Math.min(4, Math.round(n)));
      };
      let teamA = 1;
      let teamB = 1;
      if (rules.dynamicTeams && modeId !== 'story') {
        teamA = clampTeam(config.teamA != null ? config.teamA : config.teamSizeA, 2);
        teamB = clampTeam(config.teamB != null ? config.teamB : config.teamSizeB, 2);
      }
      game.teamSizes = { A: teamA, B: teamB };

      // 生成座次：A1, B1, A2, B2, …，人数不等时多出的席位排在最后。
      const seats = [];
      let aCount = 0, bCount = 0, seatIndex = 0;
      while (aCount < teamA || bCount < teamB) {
        if (aCount < teamA) {
          seats.push({ seat: seatIndex++, team: 'A', teamIndex: aCount + 1 });
          aCount += 1;
        }
        if (bCount < teamB) {
          seats.push({ seat: seatIndex++, team: 'B', teamIndex: bCount + 1 });
          bCount += 1;
        }
      }

      // 剧情模式：一号位玩家对 Boss。
      let bossUnit = null;
      if (modeId === 'story') {
        const chapterIndex = config.storyChapter || 0;
        const chapter = D.STORY.chapters[chapterIndex] || D.STORY.chapters[0];
        const boss = D.BOSSES[chapterIndex] || D.BOSSES[0];
        game.story = { chapterIndex: chapterIndex, chapter: chapter };
        bossUnit = createUnit(boss, { hp: chapter.hp, activeUses: chapter.bossActive.uses });
      }

      const p0Chars = makeUnits(rules.chars === 2 ? 2 : 1, config.charId, config.charId2, used, null);
      const p0Deck = (rules.draft && config.draftDeckIdsA && config.draftDeckIdsA.length)
        ? deckFromIds(config.draftDeckIdsA, rules.deck, rng)
        : (config.deckMode === 'custom' && (config.deckIds || []).length >= 10
        ? deckFromIds(config.deckIds, rules.deck, rng)
        : randomDeck(rules.deck, rng));

      function charsForSeat(spec) {
        if (modeId === 'story' && spec.team === 'B') return [bossUnit];
        if (spec.team === 'B' && spec.teamIndex === 1 && rules.mirror) {
          return p0Chars.map(function (u) {
            const source = D.byId.character(u.charId) || D.CHARACTERS[0];
            return createUnit(source, { hp: rules.hp });
          });
        }
        if (spec.team === 'A' && spec.teamIndex === 1) return p0Chars;
        if (rules.chars === 2) return makeUnits(2, spec.team === 'A' && spec.teamIndex === 2 ? config.allyCharId : null, null, used, null);
        const requested = spec.team === 'A' && spec.teamIndex === 2 ? config.allyCharId : null;
        return makeUnits(1, requested, null, used, null);
      }

      game.players = seats.map(function (spec) {
        const chars = charsForSeat(spec);
        const guestName = guestNames[spec.seat] != null ? guestNames[spec.seat] : null;
        const isGuestSeat = guestName != null;
        const isMirrorSeat = spec.team === 'B' && spec.teamIndex === 1;
        const localP1 = !!(options.localHumanP1 && isMirrorSeat && !isGuestSeat && teamA === 1 && teamB === 1 && modeId !== 'story');
        const human = spec.seat === 0 || isGuestSeat || localP1;
        let name;
        if (spec.seat === 0) name = config.playerName || '无名执币者';
        else if (guestName) name = guestName;
        else if (localP1) name = '玩家二';
        else name = (chars[0] && chars[0].name) || (spec.team === 'A' ? '队友' : '敌方');
        let deck;
        if (spec.seat === 0) deck = p0Deck;
        else if (isMirrorSeat && rules.mirror) deck = p0Deck.map(function (c) { return cloneCard(c); });
        else if (rules.draft && config.draftDeckIdsB && config.draftDeckIdsB.length) deck = deckFromIds(config.draftDeckIdsB, rules.deck, rng);
        else deck = randomDeck(rules.deck + (isGuestSeat && teamA === 1 && teamB === 1 && modeId !== 'team' ? 2 : 0), rng);

        const player = createPlayer({
          id: 'p' + spec.seat,
          seat: spec.seat,
          team: spec.team,
          teamIndex: spec.teamIndex,
          name: name,
          isHuman: human,
          isAI: !human,
          isTeammate: spec.team === 'A' && spec.teamIndex > 1,
          aiLevel: modeId === 'story' && spec.team === 'B' ? 'hard' : (spec.team === 'A' ? (config.allyLevel || 'hard') : (config.aiLevel || 'normal')),
          chars: chars,
          deck: deck,
          rerolls: rules.rerolls
        });
        if (modeId === 'story' && spec.team === 'B') {
          player.name = chars[0].name;
          player.chars[0].isBoss = true;
        }
        return player;
      });

      const p0 = game.players[0];
      const p1 = game.players[1];
      game.order = game.players.map(function (p) { return p.id; });
      p0.viewerTeam = 'A';
      game.mirror = !!rules.mirror;
      game.viewerId = options.online && options.online.viewerId ? options.online.viewerId : 'p0';

      // 初始手牌：每人 3 张
      const coinSkin = config.coinSkin || 'bronze';
      game.coinSkin = coinSkin;
      game.players.forEach(function (p, idx) {
        p.coinSkin = coinSkin;
        p.flags = p.flags || {};
        p.flags.boneUsed = false;
        drawCards(game, p, 3, { initial: true, silent: true });
        // 硬币皮肤：obsidian 开局多抽 1 张；jade 开局 +1 盾
        if (coinSkin === 'obsidian') drawCards(game, p, 1, { initial: true, silent: true });
        // 初始角色护盾被动
        p.chars.forEach(function (u) {
          if (u.passiveKey === 'startShield') u.shield = Math.max(u.shield, 1);
        });
        // v3.1 被动：fastHands 快手——开局多抽 1 张
        const fhUnit = activeUnit(p);
        if (fhUnit && fhUnit.passiveKey === 'fastHands') {
          drawCards(game, p, 1, { initial: true, silent: true });
        }
        if (coinSkin === 'jade') {
          const au = activeUnit(p);
          if (au) au.shield = Math.min(5, au.shield + 1);
        }
      });

      // 先手默认 p0；若 p0 是访客视角则仍由房主先手
      game.currentIndex = 0;
      game.phase = 'action';
      addLog(game, '赛场开桌。八大赛区的目光落在这一局上。', 'system');
      addChat(game, 'system', '星杯赛场已开桌。每回合一张技能卡，硬币决定正或反。', 'system');
      beginTurn(game, true);
      return game;
    }

    function playerById(game, id) {
      return game.players.find(function (p) { return p.id === id; });
    }

    function currentPlayer(game) {
      return playerById(game, game.order[game.currentIndex]);
    }

    function activeUnit(player) {
      if (!player) return null;
      return player.chars[player.active] || player.chars.find(function (u) { return u.hp > 0; }) || null;
    }

    function playerAlive(player) {
      return !!player && player.chars.some(function (u) { return u.hp > 0; });
    }

    function teamAlive(game, team) {
      return game.players.some(function (p) { return p.team === team && playerAlive(p); });
    }

    function enemiesOf(game, player) {
      return game.players.filter(function (p) {
        return p.team !== player.team && playerAlive(p);
      });
    }

    function alliesOf(game, player) {
      return game.players.filter(function (p) {
        return p.id !== player.id && p.team === player.team && playerAlive(p);
      });
    }

    function resolveTarget(game, actor, requestedId) {
      const enemies = enemiesOf(game, actor);
      if (!enemies.length) return null;
      if (requestedId) {
        const found = enemies.find(function (p) { return p.id === requestedId; });
        if (found) return found;
      }
      if (actor.selectedTarget) {
        const found = enemies.find(function (p) { return p.id === actor.selectedTarget; });
        if (found) return found;
      }
      if (game.phase === 'action' || game.phase === 'flip') {
        const sorted = enemies.slice().sort(function (a, b) {
          const au = activeUnit(a), bu = activeUnit(b);
          return (au ? au.hp : 0) - (bu ? bu.hp : 0);
        });
        return sorted[0];
      }
      return enemies[0];
    }

    function setTarget(game, actorId, targetId) {
      const actor = playerById(game, actorId);
      if (!actor) return false;
      const target = enemiesOf(game, actor).find(function (p) { return p.id === targetId; });
      if (!target) return false;
      actor.selectedTarget = targetId;
      addEvent(game, { type: 'target', actorId: actorId, targetId: targetId });
      return true;
    }

    function nextRandom(game) {
      if (game.rng) return game.rng();
      if (root.crypto && root.crypto.getRandomValues) {
        const arr = new Uint32Array(1);
        root.crypto.getRandomValues(arr);
        return arr[0] / 4294967296;
      }
      return Math.random();
    }

    function flipCoin(game) {
      return nextRandom(game) < 0.5;
    }

    function drawCards(game, player, count, opts) {
      opts = opts || {};
      const drawn = [];
      for (let i = 0; i < count; i++) {
        if (player.hand.length >= HAND_MAX) break;
        if (!player.deck.length) {
          if (player.discard.length) {
            player.deck = shuffle(player.discard, game.rng);
            player.discard = [];
            addLog(game, player.name + ' 的弃牌堆洗回牌库。', 'system');
          } else break;
        }
        const card = player.deck.shift();
        if (!card) break;
        player.hand.push(card);
        drawn.push(card);
      }
      if (drawn.length && !opts.silent) {
        addEvent(game, { type: 'draw', playerId: player.id, count: drawn.length });
        addLog(game, player.name + ' 抽了 ' + drawn.length + ' 张牌。', 'draw');
      }
      return drawn;
    }

    function discardRandom(game, player, count) {
      const lost = [];
      for (let i = 0; i < count; i++) {
        if (!player.hand.length) break;
        const idx = Math.floor(nextRandom(game) * player.hand.length);
        const card = player.hand.splice(idx, 1)[0];
        player.discard.push(card);
        lost.push(card);
      }
      if (lost.length) {
        addEvent(game, { type: 'discard', playerId: player.id, count: lost.length, names: lost.map(function (c) { return c.name; }) });
        addLog(game, player.name + ' 弃掉了 ' + lost.length + ' 张牌。', 'control');
        // v3.1 被动：deckThief 顺手牵羊——对手弃牌时，本阵营对应玩家抽 1（每回合限 2 次）
        game.players.forEach(function (e) {
          if (!playerAlive(e)) return;
          if (e.team === player.team) return;
          const eu = activeUnit(e);
          if (!eu || eu.passiveKey !== 'deckThief') return;
          e.turnFlags = e.turnFlags || {};
          e.turnFlags.deckThiefCount = e.turnFlags.deckThiefCount || 0;
          for (let k = 0; k < lost.length && e.turnFlags.deckThiefCount < 2; k++) {
            drawCards(game, e, 1);
            e.turnFlags.deckThiefCount += 1;
            addEvent(game, { type: 'passive', playerId: e.id, name: '顺手牵羊', text: '对手弃牌，抽 1 张牌' });
          }
        });
      }
      return lost;
    }

    function addLog(game, text, kind) {
      game.log.push({ id: uid('log'), turn: game.turn, text: text, kind: kind || 'system', at: Date.now() });
      if (game.log.length > 90) game.log.shift();
    }

    // v2.1.2 AI 人设音色：assets/audio/voice/ai/{personaId}-{key}.wav，缺失静默，同 key ≥3s 限流
    var aiVoiceLast = {};
    function aiVoice(personaId, key) {
      try {
        if (SETTINGS.aiVoice === false) return;
        if (SETTINGS.voiceEnabled === false) return;
        var now = Date.now();
        var k = personaId + ':' + key;
        if (aiVoiceLast[k] && now - aiVoiceLast[k] < 3000) return;
        aiVoiceLast[k] = now;
        var url = 'assets/audio/voice/ai/' + personaId + '-' + key + '.wav';
        if (root.CF_FILE_AUDIO && root.CF_FILE_AUDIO.playOne) root.CF_FILE_AUDIO.playOne(url, 0.7);
      } catch (e) {}
    }

    function addChat(game, speaker, text, kind, playerId, personaId) {      if (!text) return;
      game.chat.push({
        id: uid('chat'), speaker: speaker, text: String(text).slice(0, 160),
        kind: kind || 'system', playerId: playerId || null,
        persona: personaId || (AI.getPersona ? AI.getPersona().id : null) || null, at: Date.now()
      });
      if (game.chat.length > 60) game.chat.shift();
    }

    function addEvent(game, event) {
      game.eventSeq += 1;
      event.seq = game.eventSeq;
      event.at = Date.now();
      game.events.push(event);
      if (game.events.length > 80) game.events.shift();
    }

    function beginTurn(game, first) {
      const p = currentPlayer(game);
      if (!p || !playerAlive(p)) {
        advanceToNext(game);
        return;
      }

      // 灼烧伤害：回合开始时受到伤害
      if (p.burnNext && p.burnNext > 0) {
        const bu = activeUnit(p);
        if (bu && bu.hp > 0) {
          const burnDmg = p.burnNext;
          dealDamage(game, null, p, burnDmg, { direct: true, unit: bu });
          addLog(game, p.name + ' 受到灼烧，损失 ' + burnDmg + ' 点生命。', 'damage');
          addEvent(game, { type: 'burn', targetId: p.id, amount: burnDmg });
        }
        p.burnNext = 0;
        // v2.0 修复：灼烧可能直接终结对局，此时不得继续执行回合初始化
        if (game.phase === 'over' || game.over) return;
      }

      p.turnFlags = {};
      p.activeUsedThisTurn = false;
      p.cardPlayed = false;
      p.cardsPlayedThisTurn = 0;
      p.switchedThisTurn = false;
      p.sealedThisTurn = !!p.sealNext;
      p.sealNext = false;
      // v2.2 blind：致盲（与封印独立，也禁主动技）
      p.blindThisTurn = !!p.blindNext;
      p.blindNext = false;
      // v2.0 状态钩：蓄力/血价/狂注 在回合开始清零
      p.pendingDamageBonus = 0;
      // 虚弱：上回合被上的 weakNext 在本回合生效（ outgoing 伤害 -1 ），随后清零
      p.weakThisTurn = p.weakNext || 0;
      p.weakNext = 0;
      // 振奋：下回合可额外打出 1 张
      p.turnMaxCards = (game.rules.maxCards || 1) + (p.nextTurnEnergize ? 1 : 0);
      p.nextTurnEnergize = false;
      // v2.2 manaBurn：下回合少打一张牌
      if (p.manaBurnNext) {
        p.turnMaxCards = Math.max(1, p.turnMaxCards - 1);
        p.manaBurnNext = false;
      }
      // 本回合已打出类别（combo 用）
      p.playedCategories = p.playedCategories || {};
      p.orders = (p.orders || []).filter(function (o) { return o.status === 'accepted' && (!o.expiresTurn || o.expiresTurn >= game.turn); });

      // v2.1 random-rules 乱序法则：每回合开始 roll 一条当回合法则
      if (game.rules.randomRules && !first) {
        game.turnRule = 1 + Math.floor(Math.random() * 6);
        game.turnRuleText = RANDOM_RULES[game.turnRule];
        addEvent(game, { type: 'rule', turn: game.turn, rule: game.turnRule, text: game.turnRuleText });
        addLog(game, '本回合法则：' + game.turnRuleText, 'system');
        if (game.turnRule === 6) {
          game.players.forEach(function (pl) { if (playerAlive(pl)) drawCards(game, pl, 1, { silent: true }); });
          addLog(game, '法则：双方各抽 1 张牌。', 'draw');
        }
      }
      // 法则③：本回合每人可打 2 张技能卡
      if (game.turnRule === 3) p.turnMaxCards = Math.max(p.turnMaxCards, 2);
      // 法则⑤：治疗与护盾数值 +1
      game.ruleHealBonus = (game.turnRule === 5) ? 1 : 0;

      // 混沌换手：每个新回合开始时，所有玩家弃掉手牌并重新抽至 3 张。
      if (game.rules.chaos && !first && game.round > 1 && game.lastChaosRound !== game.round) {
        game.lastChaosRound = game.round;
        game.players.forEach(function (actor) {
          if (!playerAlive(actor)) return;
          const discarded = actor.hand.length;
          actor.discard = actor.discard.concat(actor.hand);
          actor.hand = [];
          drawCards(game, actor, 3, { silent: true });
          if (discarded) addLog(game, '混沌洗牌：' + actor.name + ' 换掉了 ' + discarded + ' 张手牌。', 'control');
        });
        addEvent(game, { type: 'chaos', round: game.round });
        addLog(game, '第 ' + game.round + ' 轮开始，所有人的手牌被赛场重新洗过。', 'system');
      }

      let drawTo = Math.max(0, 3 - (p.chokeNext || 0));
      const choke = p.chokeNext || 0;
      p.chokeNext = 0;
      if (!first && p.hand.length < drawTo) {
        const count = drawTo - p.hand.length;
        const drawn = drawCards(game, p, count);
        if (choke) addLog(game, p.name + ' 受到干扰，本回合只能补至 ' + drawTo + ' 张。', 'control');
        if (drawn.length) addLog(game, p.name + ' 补牌至 ' + p.hand.length + ' 张。', 'draw');
      }

      // v3.1 被动：fastHands 快手——每回合开始时若手牌少于 2 张，补到 2 张
      const fhUnit2 = activeUnit(p);
      if (!first && fhUnit2 && fhUnit2.passiveKey === 'fastHands' && p.hand.length < 2) {
        const need = 2 - p.hand.length;
        const fhDrawn = drawCards(game, p, need);
        if (fhDrawn.length) {
          addEvent(game, { type: 'passive', playerId: p.id, name: '快手', text: '手牌不足 2 张，补到 2 张' });
          addLog(game, p.name + ' 的快手补牌到手，现在有 ' + p.hand.length + ' 张。', 'draw');
        }
      }

      const unit = activeUnit(p);
      if (unit && unit.passiveKey === 'regen' && unit.hp <= 2 && !unit.flags.regenUsed) {
        unit.flags.regenUsed = true;
        healUnit(game, p, unit, 1, '被动·回春');
        addEvent(game, { type: 'passive', playerId: p.id, name: '回春', text: '回合开始回复 1 点生命' });
      }

      game.phase = 'action';
      addLog(game, '第 ' + game.turn + ' 回合 · ' + p.name + ' 的行动。', 'turn');
      addEvent(game, { type: 'turn', playerId: p.id, turn: game.turn, round: game.round });
      if (p.sealedThisTurn) addLog(game, p.name + ' 被封印，无法使用主动技。', 'control');
    }

    function endTurn(game, playerId) {
      if (game.phase === 'over') return { ok: false, reason: '对局已结束' };
      const p = currentPlayer(game);
      if (!p || p.id !== playerId) return { ok: false, reason: '还没轮到你' };
      if (game.phase === 'flip') return { ok: false, reason: '硬币尚未落定' };
      if (game.pending && !game.pending.resolved) return { ok: false, reason: '技能尚未结算' };
      checkVictory(game);
      if (game.phase === 'over') return { ok: true, over: game.over };
      // v2.0 被动：luckySeven 幸运转——回合结束时若本回合未打出技能卡，抽 1
      const endUnit = activeUnit(p);
      if (endUnit && endUnit.passiveKey === 'luckySeven' && (p.cardsPlayedThisTurn || 0) === 0 && playerAlive(p)) {
        drawCards(game, p, 1);
        addEvent(game, { type: 'passive', playerId: p.id, name: '幸运转', text: '未出牌，抽 1 张牌' });
        addLog(game, p.name + ' 的幸运转动了一下，补到 1 张牌。', 'draw');
      }
      // v2.1 被动：underdogDraw 死线——回合结束时若自身生命低于对手，抽 1
      if (endUnit && endUnit.passiveKey === 'underdogDraw' && playerAlive(p)) {
        var opp = null;
        for (var oi = 0; oi < game.players.length; oi++) {
          var pl = game.players[oi];
          if (pl.id !== p.id && playerAlive(pl) && activeUnit(pl)) { opp = pl; break; }
        }
        var oppUnit = opp ? activeUnit(opp) : null;
        if (oppUnit && endUnit.hp < oppUnit.hp) {
          drawCards(game, p, 1);
          addEvent(game, { type: 'passive', playerId: p.id, name: '死线', text: '生命低于对手，抽 1 张牌' });
          addLog(game, p.name + ' 在死线上补到 1 张牌。', 'draw');
        }
      }
      game.pending = null;
      advanceToNext(game);
      return { ok: true };
    }

    function advanceToNext(game) {
      if (game.phase === 'over') return;
      const start = game.currentIndex;
      let guard = 0;
      do {
        game.currentIndex = (game.currentIndex + 1) % game.order.length;
        if (game.currentIndex === 0) game.round += 1;
        guard++;
        const p = currentPlayer(game);
        if (p && playerAlive(p)) break;
      } while (guard < game.order.length * 2);
      game.turn += 1;
      beginTurn(game, false);
    }

    function forceAdvanceAfterReveal(game) {
      if (game.phase !== 'reveal') return false;
      if (game.over) return false;
      const pendingActor = game.pending ? playerById(game, game.pending.actorId) : null;
      const maxCards = game.rules.maxCards || 1;
      if (game.rules.multiPlay && pendingActor && playerAlive(pendingActor) && (pendingActor.cardsPlayedThisTurn || 0) < maxCards) {
        game.pending = null;
        game.phase = 'action';
        addLog(game, pendingActor.name + ' 的回合继续，还可以打出 ' + (maxCards - pendingActor.cardsPlayedThisTurn) + ' 张技能卡。', 'turn');
        addEvent(game, { type: 'extraAction', playerId: pendingActor.id, remaining: maxCards - pendingActor.cardsPlayedThisTurn });
        return true;
      }
      game.pending = null;
      advanceToNext(game);
      return true;
    }

    function outgoingDamage(game, actor, base, effect) {
      let amount = base;
      const unit = activeUnit(actor);
      if (!unit) return amount;
      if (unit.passiveKey === 'firstStrike' && !unit.flags.firstStrikeUsed) {
        unit.flags.firstStrikeUsed = true;
        amount += 1;
        addEvent(game, { type: 'passive', playerId: actor.id, name: '先手', text: '第一击伤害 +1' });
      }
      if (unit.passiveKey === 'bloodlust' && unit.hp <= 2) {
        amount += 1;
        addEvent(game, { type: 'passive', playerId: actor.id, name: '血勇', text: '低血伤害 +1' });
      }
      if (unit.passiveKey === 'houseEdge') amount += 1;
      if (game.rules.chain && actor.chain > 0) {
        const bonus = Math.min(3, actor.chain);
        amount += bonus;
        addEvent(game, { type: 'passive', playerId: actor.id, name: '连锁', text: '连锁 ' + bonus + ' 层，伤害 +' + bonus });
      }
      if (actor.rerollBoost) {
        actor.rerollBoost = false;
        amount += 1;
        addEvent(game, { type: 'passive', playerId: actor.id, name: '重抛余波', text: '重抛后伤害 +1' });
      }
      // v2.0：蓄力(power)/血价(bloodPrice)/狂注(highRoller) 累计的下次伤害加成，一次性消耗
      if (actor.pendingDamageBonus && actor.pendingDamageBonus > 0) {
        amount += actor.pendingDamageBonus;
        addLog(game, actor.name + ' 的蓄力炸开，伤害 +' + actor.pendingDamageBonus + '。', 'action');
        actor.pendingDamageBonus = 0;
      }
      // v2.0：熔心硬币皮肤——本回合打出的第一张攻击牌伤害 +1
      if (actor.coinSkin === 'molten' && !actor.turnFlags.moltenUsed && effect && effect.__moltenAttack) {
        actor.turnFlags.moltenUsed = true;
        amount += 1;
        addEvent(game, { type: 'passive', playerId: actor.id, name: '熔心', text: '首张攻击牌伤害 +1' });
      }
      // v2.0：虚弱——本回合造成的伤害 -1（最少为原始伤害本身，不低于 0）
      if (actor.weakThisTurn && actor.weakThisTurn > 0) {
        amount = Math.max(0, amount - actor.weakThisTurn);
      }
      return amount;
    }

    function dealDamage(game, source, targetPlayer, raw, opts) {
      opts = opts || {};
      let target = opts.unit && opts.unit.hp > 0 ? opts.unit : activeUnit(targetPlayer);
      if (!target || target.hp <= 0) return 0;
      let amount = Math.max(0, Math.round(raw));
      if (!amount) return 0;

      // v2.2 redirectDamage：本回合受到的下一次伤害转移给对手（这里即来源）
      if (!opts.isThorns && !opts.direct && targetPlayer.turnFlags && targetPlayer.turnFlags.redirectActive && source && source.id !== targetPlayer.id) {
        targetPlayer.turnFlags.redirectActive = false;
        addLog(game, targetPlayer.name + ' 将这记伤害转移回了 ' + source.name + '！', 'shield');
        addEvent(game, { type: 'redirect', targetId: targetPlayer.id, sourceId: source.id, amount: amount });
        return dealDamage(game, targetPlayer, source, amount, {});
      }

      // v3.1 被动：counterPierce 反刺——每回合第一次受到无视护盾的攻击时，免疫该伤害并反弹 2
      if (opts.pierce && target.passiveKey === 'counterPierce' && !targetPlayer.turnFlags.counterPierceUsed) {
        targetPlayer.turnFlags.counterPierceUsed = true;
        addEvent(game, { type: 'passive', playerId: targetPlayer.id, name: '反刺', text: '免疫穿透伤害并反弹 2 点' });
        addLog(game, target.name + ' 的反刺格住了这记穿透，弹回 2 点伤害。', 'damage');
        if (source && source.id !== targetPlayer.id) {
          dealDamage(game, targetPlayer, source, 2, { isThorns: true });
        }
        return 0;
      }

      if (!opts.direct) {
        if (target.passiveKey === 'voidArmor') {
          amount = Math.max(1, amount - 1);
          addEvent(game, { type: 'passive', playerId: targetPlayer.id, name: '空页护甲', text: '伤害 -1' });
        }
        if (target.passiveKey === 'ironhide' && !targetPlayer.turnFlags.ironhideUsed) {
          targetPlayer.turnFlags.ironhideUsed = true;
          amount = Math.max(1, amount - 1);
          addEvent(game, { type: 'passive', playerId: targetPlayer.id, name: '铁壁', text: '本回合首次伤害 -1' });
        }
        // v2.0：守卫(guard) 本回合第一次受到的伤害 -1
        if (targetPlayer.turnFlags.guardActive && !targetPlayer.turnFlags.guardUsed) {
          targetPlayer.turnFlags.guardUsed = true;
          amount = Math.max(1, amount - 1);
          addEvent(game, { type: 'passive', playerId: targetPlayer.id, name: '守卫', text: '本回合首次伤害 -1' });
        }
        // v2.0：霜晶硬币皮肤——每回合第一次受到的伤害 -1（最少 1）
        if (targetPlayer.coinSkin === 'frost' && !targetPlayer.turnFlags.frostUsed) {
          targetPlayer.turnFlags.frostUsed = true;
          amount = Math.max(1, amount - 1);
          addEvent(game, { type: 'passive', playerId: targetPlayer.id, name: '霜甲', text: '本回合首次伤害 -1' });
        }
      }

      let blocked = 0;
      if (!opts.pierce && !opts.direct) {
        blocked = Math.min(target.shield, amount);
        target.shield -= blocked;
        amount -= blocked;
      }
      const before = target.hp;
      target.hp = Math.max(0, target.hp - amount);
      // v2.0：龙骨硬币皮肤——每局一次，受到致命伤害时保留 1 点生命
      if (target.hp <= 0 && targetPlayer.coinSkin === 'bone' && !targetPlayer.flags.boneUsed && !opts.isThorns) {
        targetPlayer.flags.boneUsed = true;
        target.hp = 1;
        addLog(game, target.name + ' 的龙骨余命发动，死里逃生，保留 1 点生命。', 'shield');
        addEvent(game, { type: 'passive', playerId: targetPlayer.id, name: '龙骨余命', text: '濒死保留 1 点生命' });
      }
      // v2.2 rebirth：本局第一次濒死时不死，回 1 血
      if (target.hp <= 0 && targetPlayer.flags && targetPlayer.flags.rebirthReady && !opts.isThorns) {
        targetPlayer.flags.rebirthReady = false;
        target.hp = 1;
        addLog(game, target.name + ' 的重生之光包裹了他，死里逃生，保留 1 点生命。', 'heal');
        addEvent(game, { type: 'rebirth', playerId: targetPlayer.id });
      }
      const lost = before - target.hp;
      if (lost > 0) {
        targetPlayer.stats.damageTaken += lost;
        if (source && source.id !== targetPlayer.id) source.stats.damageDealt += lost;
        targetPlayer.turnFlags.tookDamage = true;
        // v2.0：血价被动——自身每受到 1 点伤害，本回合下一次造成的伤害 +1（可叠加）
        if (target.passiveKey === 'bloodPrice') {
          targetPlayer.pendingDamageBonus = (targetPlayer.pendingDamageBonus || 0) + lost;
        }
        // v2.1 被动：hitToShield 吸热——每回合第一次受到伤害时获得 1 护盾
        if (target.passiveKey === 'hitToShield' && !targetPlayer.turnFlags.hitToShieldUsed) {
          targetPlayer.turnFlags.hitToShieldUsed = true;
          shieldUnit(game, targetPlayer, target, 1);
          addEvent(game, { type: 'passive', playerId: targetPlayer.id, name: '吸热', text: '首次受击，获得 1 护盾' });
        }
      }
      addEvent(game, {
        type: 'damage', sourceId: source ? source.id : null, targetId: targetPlayer.id,
        unitName: target.name, amount: lost, blocked: blocked, hpAfter: target.hp,
        shieldAfter: target.shield, direct: !!opts.direct, piercing: !!opts.pierce
      });
      if (lost > 0) {
        addLog(game, target.name + ' 受到 ' + lost + ' 点伤害' + (blocked ? '（护盾吸收 ' + blocked + '）' : '') + '，剩余 ' + target.hp + ' 生命。', 'damage');
      } else if (blocked) {
        addLog(game, target.name + ' 的护盾吸收了 ' + blocked + ' 点伤害。', 'shield');
      }

      if (target.hp <= 0) defeatUnit(game, targetPlayer, target, source);

      if (lost > 0 && !opts.isThorns && source && target.hp > 0 || (lost > 0 && !opts.isThorns && source && target.hp <= 0)) {
        if (target.passiveKey === 'thorns' && !targetPlayer.turnFlags.thornsUsed) {
          targetPlayer.turnFlags.thornsUsed = true;
          addEvent(game, { type: 'passive', playerId: targetPlayer.id, name: '反震', text: '反弹 1 点伤害' });
          addLog(game, target.name + ' 的义体反震了 ' + (source ? source.name : '对手') + '。', 'damage');
          dealDamage(game, targetPlayer, source, 1, { isThorns: true });
        }
        // v2.0：反射——本回合第一次受击时对来源造成等量伤害
        if (source && source.id !== targetPlayer.id && targetPlayer.turnFlags.reflectActive && !targetPlayer.turnFlags.reflectUsed) {
          targetPlayer.turnFlags.reflectUsed = true;
          addEvent(game, { type: 'passive', playerId: targetPlayer.id, name: '反射', text: '反弹 ' + lost + ' 点伤害' });
          addLog(game, target.name + ' 的反射刃弹回 ' + lost + ' 点伤害。', 'damage');
          dealDamage(game, targetPlayer, source, lost, { isThorns: true });
        }
        // v2.2 mirror：本回合第一次受到的伤害原封反弹（无视护盾/直伤减免）
        if (source && source.id !== targetPlayer.id && targetPlayer.turnFlags.mirrorActive && !targetPlayer.turnFlags.mirrorUsed) {
          targetPlayer.turnFlags.mirrorUsed = true;
          addEvent(game, { type: 'mirror', playerId: targetPlayer.id, amount: lost });
          addLog(game, target.name + ' 的镜面将 ' + lost + ' 点伤害原封反弹给 ' + source.name + '！', 'damage');
          dealDamage(game, targetPlayer, source, lost, { isThorns: true, direct: true });
        }
      }
      return lost;
    }

    function defeatUnit(game, player, unit, source) {
      if (unit.hp > 0 || unit.defeated) return;
      unit.defeated = true;
      addLog(game, unit.name + ' 倒下了。', 'damage');
      addEvent(game, { type: 'defeat', playerId: player.id, unitName: unit.name, sourceId: source ? source.id : null });
      const next = player.chars.findIndex(function (u) { return u.hp > 0; });
      if (next >= 0) {
        if (player.chars[player.active] === unit) {
          player.active = next;
          addEvent(game, { type: 'switch', playerId: player.id, active: next, auto: true });
          addLog(game, player.name + ' 换上了 ' + player.chars[next].name + '。', 'turn');
        }
      } else {
        addLog(game, player.name + ' 已无可用角色。', 'system');
      }
      // v2.0：收割被动——任意角色阵亡时，己方灰誓者回复 2 点生命
      game.players.forEach(function (pl) {
        if (!playerAlive(pl)) return;
        const au = activeUnit(pl);
        if (au && au.passiveKey === 'grimHarvest' && au.hp > 0) {
          healUnit(game, pl, au, 2, '收割');
          addEvent(game, { type: 'passive', playerId: pl.id, name: '收割', text: '有角色阵亡，回复 2 点生命' });
        }
      });
      checkVictory(game);
    }

    function healUnit(game, player, unit, amount, label) {
      amount = amount + (game.ruleHealBonus || 0);
      if (game.rules.healToShield) {
        const gained = shieldUnit(game, player, unit, amount);
        if (gained) addLog(game, unit.name + ' 的治疗转化为 ' + gained + ' 点护盾。', 'shield');
        return gained;
      }
      const before = unit.hp;
      unit.hp = Math.min(unit.maxHp, unit.hp + amount);
      const healed = unit.hp - before;
      if (healed > 0) {
        player.stats.healed += healed;
        addEvent(game, { type: 'heal', playerId: player.id, amount: healed, hpAfter: unit.hp, label: label || '治疗' });
        addLog(game, unit.name + ' 回复 ' + healed + ' 点生命。', 'heal');
      }
      return healed;
    }

    function shieldUnit(game, player, unit, amount) {
      amount = amount + (game.ruleHealBonus || 0);
      const before = unit.shield;
      unit.shield = Math.min(SHIELD_MAX, unit.shield + amount);
      const gained = unit.shield - before;
      if (gained > 0) {
        addEvent(game, { type: 'shield', playerId: player.id, amount: gained, shieldAfter: unit.shield });
        addLog(game, unit.name + ' 获得 ' + gained + ' 点护盾。', 'shield');
      }
      return gained;
    }

    function applyEffects(game, actor, target, effects, sourceLabel, opts) {
      opts = opts || {};
      if (!effects) return;
      const mult = game.effectMultiplier || 1;
      const actorUnit = activeUnit(actor);
      const targetResolved = target || resolveTarget(game, actor);
      const n = function (v) { return v ? v * mult : 0; };

      if (effects.strip) {
        const tu = targetResolved ? activeUnit(targetResolved) : null;
        if (tu && tu.shield > 0) {
          const removed = tu.shield;
          tu.shield = 0;
          addEvent(game, { type: 'strip', targetId: targetResolved.id, amount: removed });
          addLog(game, actor.name + ' 击碎了 ' + tu.name + ' 的 ' + removed + ' 点护盾。', 'control');
        }
      }

      if (effects.dmg && targetResolved) {
        let amount = outgoingDamage(game, actor, n(effects.dmg), effects);
        if (opts.extraDamage) amount += opts.extraDamage;
        dealDamage(game, actor, targetResolved, amount, { pierce: !!effects.pierce });
      }

      // 新增：吸血 — 造成伤害并回复等量生命（赤红硬币皮肤：数值 +1）
      if (effects.lifesteal && targetResolved) {
        let amount = outgoingDamage(game, actor, n(effects.lifesteal), effects);
        if (actor.coinSkin === 'bloodmoon') amount += 1;
        dealDamage(game, actor, targetResolved, amount, {});
        const au = activeUnit(actor);
        if (au) healUnit(game, actor, au, amount, '吸血');
        addLog(game, actor.name + ' 吸取了 ' + targetResolved.name + ' 的生命力。', 'heal');
      }

      // 新增：偷盾 — 夺取对手全部护盾
      if (effects.stealShield && targetResolved) {
        const tu = activeUnit(targetResolved);
        const au = activeUnit(actor);
        if (tu && tu.shield > 0 && au) {
          const stolen = tu.shield;
          tu.shield = 0;
          shieldUnit(game, actor, au, stolen);
          addLog(game, actor.name + ' 夺取了 ' + stolen + ' 点护盾。', 'heal');
          addEvent(game, { type: 'strip', targetId: targetResolved.id, amount: stolen });
        }
      }

      if (effects.discard && targetResolved) discardRandom(game, targetResolved, n(effects.discard));
      if (effects.choke && targetResolved) {
        targetResolved.chokeNext += n(effects.choke);
        addEvent(game, { type: 'status', targetId: targetResolved.id, status: 'choke', amount: targetResolved.chokeNext });
        addLog(game, targetResolved.name + ' 下回合补牌受限。', 'control');
      }
      if (effects.seal && targetResolved) {
        targetResolved.sealNext = true;
        addEvent(game, { type: 'status', targetId: targetResolved.id, status: 'seal' });
        addLog(game, targetResolved.name + ' 的主动技被封印。', 'control');
      }
      if (effects.bless) {
        actor.blessNext = true;
        addEvent(game, { type: 'status', targetId: actor.id, status: 'bless' });
        addLog(game, actor.name + ' 的下一次抛币必定成功。', 'heal');
      }
      // 新增：双重祝福 — 接下来两次抛币必定成功
      if (effects.bless2) {
        actor.blessNext = true;
        actor.blessCount = 2;
        addEvent(game, { type: 'status', targetId: actor.id, status: 'bless' });
        addLog(game, actor.name + ' 的接下来两次抛币必定成功。', 'heal');
      }
      // 新增：灼烧 — 对手下回合开始时受到伤害
      if (effects.hpBurn && targetResolved) {
        targetResolved.burnNext = (targetResolved.burnNext || 0) + n(effects.hpBurn);
        addEvent(game, { type: 'status', targetId: targetResolved.id, status: 'burn', amount: targetResolved.burnNext });
        addLog(game, targetResolved.name + ' 被灼烧，下回合开始时将受到伤害。', 'damage');
      }
      if (effects.heal && actorUnit) healUnit(game, actor, actorUnit, n(effects.heal), sourceLabel);
      if (effects.shield && actorUnit) shieldUnit(game, actor, actorUnit, n(effects.shield));
      if (effects.draw) drawCards(game, actor, n(effects.draw));
      if (effects.oppHeal && targetResolved) {
        const tu = activeUnit(targetResolved);
        if (tu) healUnit(game, targetResolved, tu, n(effects.oppHeal), '对手恢复');
      }
      if (effects.oppShield && targetResolved) {
        const tu = activeUnit(targetResolved);
        if (tu) shieldUnit(game, targetResolved, tu, n(effects.oppShield));
      }
      if (effects.oppDraw && targetResolved) drawCards(game, targetResolved, n(effects.oppDraw));
      if (effects.selfDiscard) discardRandom(game, actor, n(effects.selfDiscard));
      // v2.1 被动：lootOnDiscard 打劫——自己弃牌时抽 1（每回合限 1）
      if (effects.selfDiscard && activeUnit(actor) && activeUnit(actor).passiveKey === 'lootOnDiscard' && !actor.turnFlags.lootUsed) {
        actor.turnFlags.lootUsed = true;
        drawCards(game, actor, 1);
        addEvent(game, { type: 'passive', playerId: actor.id, name: '打劫', text: '弃牌时抽 1 张牌' });
      }
      // v2.1 主动技效果键 nextDmg：本回合下一次伤害 +N（已受伤则 +N+1，用于过载回响）
      if (effects.nextDmg) {
        var bonus = n(effects.nextDmg) + (actor.turnFlags.tookDamage ? 1 : 0);
        actor.pendingDamageBonus = (actor.pendingDamageBonus || 0) + bonus;
        addEvent(game, { type: 'status', targetId: actor.id, status: 'power' });
        addLog(game, actor.name + ' 蓄力，本回合下一次伤害 +' + bonus + '。', 'action');
      }
      // v2.0 新效果键
      if (effects.power) {
        actor.pendingDamageBonus = (actor.pendingDamageBonus || 0) + n(effects.power);
        addEvent(game, { type: 'status', targetId: actor.id, status: 'power' });
        addLog(game, actor.name + ' 蓄力，本回合下一次伤害 +' + n(effects.power) + '。', 'action');
      }
      if (effects.weak && targetResolved) {
        targetResolved.weakNext = (targetResolved.weakNext || 0) + n(effects.weak);
        addEvent(game, { type: 'status', targetId: targetResolved.id, status: 'weak', amount: targetResolved.weakNext });
        addLog(game, targetResolved.name + ' 被虚弱，下回合伤害 -' + n(effects.weak) + '。', 'control');
      }
      if (effects.guard && actorUnit) {
        actor.turnFlags.guardActive = true;
        addEvent(game, { type: 'status', targetId: actor.id, status: 'guard' });
        addLog(game, actor.name + ' 展开守卫，本回合首次受到的伤害 -1。', 'shield');
      }
      if (effects.reflect && actorUnit) {
        actor.turnFlags.reflectActive = true;
        addEvent(game, { type: 'status', targetId: actor.id, status: 'reflect' });
        addLog(game, actor.name + ' 架起反射刃，本回合首次受击时反弹伤害。', 'shield');
      }
      if (effects.energize) {
        actor.nextTurnEnergize = true;
        addEvent(game, { type: 'status', targetId: actor.id, status: 'energize' });
        addLog(game, actor.name + ' 振奋，下回合可额外打出 1 张技能卡。', 'action');
      }
      if (effects.selfDmg) {
        const tu = activeUnit(actor);
        if (tu) dealDamage(game, null, actor, n(effects.selfDmg), { direct: true, unit: tu });
      }

      // ============ v2.2 新效果键 ============
      // copySkill: 复制对手上一张打出的牌的正面效果（不抛币直接生效）
      if (effects.copySkill) {
        try {
          var oppTeam = actor.team === 'A' ? 'B' : 'A';
          var last = game.lastCard && game.lastCard[oppTeam];
          if (last && last.posEffects) {
            var copied = Object.assign({}, last.posEffects);
            // 去掉可能导致递归/偷取类键，避免连锁
            delete copied.copySkill;
            delete copied.stealBuff;
            addLog(game, actor.name + ' 复制了「' + last.name + '」的正面效果。', 'action');
            addEvent(game, { type: 'status', targetId: actor.id, status: 'copySkill', cardName: last.name });
            applyEffects(game, actor, targetResolved, copied, '复制·' + last.name);
          } else {
            addLog(game, actor.name + ' 想要复制，但对手还没出过牌。', 'control');
          }
        } catch (e) {}
      }
      // redirectDamage: 本回合受到的下一次伤害转移给对手
      if (effects.redirectDamage && actorUnit) {
        actor.turnFlags.redirectActive = true;
        addEvent(game, { type: 'status', targetId: actor.id, status: 'redirect' });
        addLog(game, actor.name + ' 架起转移，本回合下一次受到的伤害将转移给对手。', 'shield');
      }
      // rebirth: 本局第一次濒死时不死，回 1 血
      if (effects.rebirth && actorUnit) {
        actor.flags = actor.flags || {};
        actor.flags.rebirthReady = true;
        addEvent(game, { type: 'status', targetId: actor.id, status: 'rebirth' });
        addLog(game, actor.name + ' 获得一次重生机会，本局第一次濒死时保留 1 点生命。', 'heal');
      }
      // puppet: 对手下一张牌的目标由你选
      if (effects.puppet && targetResolved) {
        targetResolved.puppetNext = true;
        targetResolved.puppetCasterId = actor.id;
        addEvent(game, { type: 'status', targetId: targetResolved.id, status: 'puppet' });
        addLog(game, targetResolved.name + ' 被傀儡线缠住，下一张牌的目标将由对手指定。', 'control');
      }
      // swapHp: 与目标交换当前 HP（差 ≤3 时才能用）
      if (effects.swapHp && targetResolved) {
        var aUnit = activeUnit(actor);
        var tUnit = activeUnit(targetResolved);
        if (aUnit && tUnit && Math.abs(aUnit.hp - tUnit.hp) <= 3) {
          var tmp = aUnit.hp;
          aUnit.hp = tUnit.hp;
          tUnit.hp = tmp;
          addLog(game, actor.name + ' 与 ' + targetResolved.name + ' 交换了生命！', 'action');
          addEvent(game, { type: 'swapHp', targetId: targetResolved.id, actorId: actor.id });
        } else {
          addLog(game, actor.name + ' 想交换生命，但双方血量差超过 3，没有生效。', 'control');
        }
      }
      // blind: 对手下回合不能用主动技（与 seal 独立）
      if (effects.blind && targetResolved) {
        targetResolved.blindNext = true;
        addEvent(game, { type: 'status', targetId: targetResolved.id, status: 'blind' });
        addLog(game, targetResolved.name + ' 被致盲，下回合无法使用主动技。', 'control');
      }
      // peek: 显示对手手牌（下回合前可见）
      if (effects.peek) {
        game.peekUntilTurn = (game.turn || 1) + 1;
        game.peekViewerId = actor.id;
        addEvent(game, { type: 'status', targetId: actor.id, status: 'peek' });
        addLog(game, actor.name + ' 窥见了对手的手牌。', 'action');
      }
      // manaBurn: 对手下回合少打一张牌
      if (effects.manaBurn && targetResolved) {
        targetResolved.manaBurnNext = true;
        addEvent(game, { type: 'status', targetId: targetResolved.id, status: 'manaBurn' });
        addLog(game, targetResolved.name + ' 被抽干法力，下回合少打一张牌。', 'control');
      }
      // mirror: 本回合第一次受到的伤害原封反弹
      if (effects.mirror && actorUnit) {
        actor.turnFlags.mirrorActive = true;
        addEvent(game, { type: 'status', targetId: actor.id, status: 'mirror' });
        addLog(game, actor.name + ' 架起镜面，本回合第一次受到的伤害将原封反弹。', 'shield');
      }
      // stealBuff: 偷取对手所有护盾和正面 buff
      if (effects.stealBuff && targetResolved) {
        var tUnit2 = activeUnit(targetResolved);
        var aUnit2 = activeUnit(actor);
        if (tUnit2 && aUnit2) {
          var stolenShield = tUnit2.shield;
          if (stolenShield > 0) {
            tUnit2.shield = 0;
            shieldUnit(game, actor, aUnit2, stolenShield);
          }
          // 转移正面 buff
          if (targetResolved.blessNext) { actor.blessNext = true; targetResolved.blessNext = false; }
          if (targetResolved.nextTurnEnergize) { actor.nextTurnEnergize = true; targetResolved.nextTurnEnergize = false; }
          actor.pendingDamageBonus = (actor.pendingDamageBonus || 0) + (targetResolved.pendingDamageBonus || 0);
          targetResolved.pendingDamageBonus = 0;
          if (targetResolved.turnFlags && targetResolved.turnFlags.guardActive) { actor.turnFlags.guardActive = true; }
          if (targetResolved.turnFlags && targetResolved.turnFlags.reflectActive) { actor.turnFlags.reflectActive = true; }
          addLog(game, actor.name + ' 偷走了 ' + targetResolved.name + ' 的护盾与增益！', 'heal');
          addEvent(game, { type: 'stealBuff', targetId: targetResolved.id, actorId: actor.id, shield: stolenShield });
        }
      }
      // ============ /v2.2 新效果键 ============

      if (actorUnit && actorUnit.hp <= 0) defeatUnit(game, actor, actorUnit, null);
      checkVictory(game);
    }

    function triggerFlipPassives(game, actor, success) {
      const unit = activeUnit(actor);
      if (!unit) return;
      if (success) {
        if (unit.passiveKey === 'onFlipWinShield' && !actor.turnFlags.winShieldUsed) {
          actor.turnFlags.winShieldUsed = true;
          shieldUnit(game, actor, unit, 1);
          addEvent(game, { type: 'passive', playerId: actor.id, name: '正面回响', text: '抛币成功获得 1 护盾' });
        }
        if (unit.passiveKey === 'onFlipWinDraw' && !actor.turnFlags.winDrawUsed) {
          actor.turnFlags.winDrawUsed = true;
          drawCards(game, actor, 1);
          addEvent(game, { type: 'passive', playerId: actor.id, name: '窥隙', text: '抛币成功抽 1 张牌' });
        }
        // v2.0 被动：highRoller 狂注——本回合第一次抛币成功后，下一次伤害 +1
        if (unit.passiveKey === 'highRoller' && !actor.turnFlags.highRollerUsed) {
          actor.turnFlags.highRollerUsed = true;
          actor.pendingDamageBonus = (actor.pendingDamageBonus || 0) + 1;
          addEvent(game, { type: 'passive', playerId: actor.id, name: '狂注', text: '本回合下一次伤害 +1' });
        }
        // 硬币皮肤：amethyst 正面抽1；jade 正面+1盾；gold 成功后15%免费再抛(抽1)
        if (actor.coinSkin === 'amethyst' && !actor.turnFlags.amethystUsed) {
          actor.turnFlags.amethystUsed = true;
          drawCards(game, actor, 1);
          addEvent(game, { type: 'passive', playerId: actor.id, name: '紫晶', text: '正面抽 1 张牌' });
        }
        if (actor.coinSkin === 'jade' && !actor.turnFlags.jadeUsed) {
          actor.turnFlags.jadeUsed = true;
          shieldUnit(game, actor, unit, 1);
          addEvent(game, { type: 'passive', playerId: actor.id, name: '翡翠', text: '正面获得 1 护盾' });
        }
        if (actor.coinSkin === 'gold' && nextRandom(game) < 0.15) {
          drawCards(game, actor, 1);
          addLog(game, '黄金财运发动，免费再掷出一次好运：抽 1 张牌。', 'coin');
          addEvent(game, { type: 'passive', playerId: actor.id, name: '黄金', text: '免费再抛一次' });
        }
        // v2.1 random-rules 法则①：正面成功时额外造成 1 点伤害
        if (game.turnRule === 1) {
          const opp = resolveTarget(game, actor);
          if (opp) dealDamage(game, actor, opp, 1, {});
        }
      } else {
        if (unit.passiveKey === 'onFlipLoseShield' && !actor.turnFlags.loseShieldUsed) {
          actor.turnFlags.loseShieldUsed = true;
          shieldUnit(game, actor, unit, 1);
          addEvent(game, { type: 'passive', playerId: actor.id, name: '反面余温', text: '抛币失败获得 1 护盾' });
        }
        // v2.0 被动：onFlipLoseDraw 反面进账——每回合第一次抛币失败抽1
        if (unit.passiveKey === 'onFlipLoseDraw' && !actor.turnFlags.loseDrawUsed) {
          actor.turnFlags.loseDrawUsed = true;
          drawCards(game, actor, 1);
          addEvent(game, { type: 'passive', playerId: actor.id, name: '反面进账', text: '抛币失败抽 1 张牌' });
        }
        // 硬币皮肤：silver 反面+1盾
        if (actor.coinSkin === 'silver' && !actor.turnFlags.silverUsed) {
          actor.turnFlags.silverUsed = true;
          shieldUnit(game, actor, unit, 1);
          addEvent(game, { type: 'passive', playerId: actor.id, name: '白银', text: '反面获得 1 护盾' });
        }
      }
    }

    function playCard(game, playerId, handIndex, targetId) {
      if (game.phase !== 'action') return { ok: false, reason: '现在不能出牌' };
      const actor = currentPlayer(game);
      if (!actor || actor.id !== playerId) return { ok: false, reason: '还没轮到你' };
      const maxCards = actor.turnMaxCards || game.rules.maxCards || 1;
      if ((actor.cardsPlayedThisTurn || 0) >= maxCards) {
        return { ok: false, reason: maxCards > 1 ? ('本回合最多打出 ' + maxCards + ' 张技能卡') : '每回合只能打出一张技能卡' };
      }
      const card = actor.hand[handIndex];
      if (!card) return { ok: false, reason: '没有这张牌' };
      // v2.2 puppet：对手下一张牌的目标由傀儡施法者指定
      let effectiveTargetId = targetId;
      if (actor.puppetNext) {
        const caster = actor.puppetCasterId ? playerById(game, actor.puppetCasterId) : null;
        if (caster && caster.selectedTarget) effectiveTargetId = caster.selectedTarget;
        actor.puppetNext = false;
        actor.puppetCasterId = null;
        addLog(game, actor.name + ' 被傀儡线操控，这张牌的目标被强制改写。', 'control');
      }
      const target = resolveTarget(game, actor, effectiveTargetId);
      if (!target) return { ok: false, reason: '没有可选目标' };
      if (effectiveTargetId) setTarget(game, actor.id, effectiveTargetId);

      actor.hand.splice(handIndex, 1);
      actor.cardsPlayedThisTurn = (actor.cardsPlayedThisTurn || 0) + 1;
      actor.cardPlayed = actor.cardsPlayedThisTurn >= maxCards;
      actor.stats.cardsPlayed += 1;
      actor.stats.flips += 1;
      // v2.0 combo：记录本回合已打出类别（resolve 时判定同类加成）
      actor.playedCategories = actor.playedCategories || {};
      actor.playedCategories[card.category] = (actor.playedCategories[card.category] || 0) + 1;
      game.pending = {
        id: uid('flip'),
        actorId: actor.id,
        card: card,
        targetId: target.id,
        result: null,
        guessed: null,
        blessed: !!actor.blessNext,
        rerolled: false,
        canReroll: !game.noReroll && actor.rerolls > 0 && !actor.blessNext,
        resolved: false,
        createdAt: Date.now()
      };
      if (actor.blessNext) {
        actor.blessNext = false;
        game.pending.result = true;
        game.pending.guessed = 'head';
        addLog(game, actor.name + ' 的命运祝福生效，硬币直接停在正面。', 'coin');
      }
      game.phase = 'flip';
      // v2.2 猜币：先记录出牌，不立即抛结果，等玩家/AI 猜完正反面再开
      addEvent(game, { type: 'card', playerId: actor.id, cardId: card.id, name: card.name, result: null, blessed: game.pending.blessed, awaitingGuess: true });
      addLog(game, actor.name + ' 打出「' + card.name + '」。请猜正面或反面。', 'card');
      // 记录最近一张打出的牌（copySkill 用）
      game.lastCard = game.lastCard || {};
      game.lastCard[actor.team] = { card: card, actorId: actor.id, name: card.name, posEffects: card.posEffects };

      // 被动：onPlayDraw / onStyleDraw / 法则④（保留原逻辑）
      if (activeUnit(actor) && activeUnit(actor).passiveKey === 'onPlayDraw' && !actor.turnFlags.playDrawUsed) {
        actor.turnFlags.playDrawUsed = true;
        drawCards(game, actor, 1);
        addEvent(game, { type: 'passive', playerId: actor.id, name: '连锁', text: '出牌后抽 1 张牌' });
      }
      // v2.1 被动：onStyleDraw 代笔——每回合第一次打出风格牌抽 1
      if (card.category === 'style' && activeUnit(actor) && activeUnit(actor).passiveKey === 'onStyleDraw' && !actor.turnFlags.styleDrawUsed) {
        actor.turnFlags.styleDrawUsed = true;
        drawCards(game, actor, 1);
        addEvent(game, { type: 'passive', playerId: actor.id, name: '代笔', text: '打出风格牌，抽 1 张牌' });
      }
      // v2.1 random-rules：法则④本回合第一张技能卡伤害 +1
      if (game.turnRule === 4 && !(actor.turnFlags.firstCardDmgApplied)) {
        actor.turnFlags.firstCardDmgApplied = true;
        actor.pendingDamageBonus = (actor.pendingDamageBonus || 0) + 1;
      }
      return { ok: true, state: game, pending: game.pending };
    }

    // v2.2 猜币：根据 AI 人设自动选边
    function autoGuessByPersona(game, actor) {
      try {
        var pid = (actor && actor.personaId) || (AI.getPersonaId ? AI.getPersonaId() : 'hotaru');
        // 热血 → 爱猜正面；沉稳/冷面/酷哥 → 偏反面；其他 → 随机
        if (pid === 'hotaru') return 'head';
        if (pid === 'sen' || pid === 'ren' || pid === 'kurome') return 'tail';
        return Math.random() < 0.5 ? 'head' : 'tail';
      } catch (e) { return 'head'; }
    }

    // v2.2 猜币：玩家/AI 在抛币前选择正反面，选完才抛币
    function submitGuess(game, playerId, guess) {
      if (game.phase !== 'flip') return { ok: false, reason: '现在不能猜' };
      const pending = game.pending;
      if (!pending || pending.actorId !== playerId) return { ok: false, reason: '没有待猜的硬币' };
      if (pending.resolved) return { ok: false, reason: '已经结算过了' };
      if (pending.result != null) return { ok: false, reason: '硬币已经抛过了' };
      if (guess !== 'head' && guess !== 'tail') return { ok: false, reason: '请猜正面或反面' };
      pending.guessed = guess;
      if (pending.blessed) {
        pending.result = true;
      } else {
        pending.result = flipCoin(game);
        game.coinStats = game.coinStats || { head: 0, tail: 0 };
        game.coinStats[pending.result ? 'head' : 'tail']++;
        const total = game.coinStats.head + game.coinStats.tail;
        if (total % 20 === 0) {
          console.log('[coin] heads/tails =', game.coinStats.head, '/', game.coinStats.tail, 'ratio=', (game.coinStats.head / total).toFixed(3));
        }
      }
      addEvent(game, { type: 'guess', playerId: playerId, guessed: guess, result: pending.result });
      const actor = playerById(game, playerId);
      if (actor) addLog(game, actor.name + ' 猜了' + (guess === 'head' ? '正面' : '反面') + '。', 'coin');
      return { ok: true, result: pending.result, guessed: guess, pending: pending };
    }

    function resolveFlip(game, playerId, choice) {
      const pending = game.pending;
      if (!pending || pending.actorId !== playerId) return { ok: false, reason: '没有待结算的抛币' };
      if (pending.resolved) return { ok: false, reason: '已经结算过了' };
      const actor = playerById(game, playerId);
      if (!actor) return { ok: false, reason: '角色不存在' };
      const card = pending.card;

      // AI/自动化路径：如果玩家还没猜（result 为 null），按人设自动猜并抛币
      if (pending.result == null) {
        if (!pending.guessed) pending.guessed = autoGuessByPersona(game, actor);
        pending.result = pending.blessed ? true : flipCoin(game);
        game.coinStats = game.coinStats || { head: 0, tail: 0 };
        game.coinStats[pending.result ? 'head' : 'tail']++;
        const total = game.coinStats.head + game.coinStats.tail;
        if (total % 20 === 0) {
          console.log('[coin] heads/tails =', game.coinStats.head, '/', game.coinStats.tail, 'ratio=', (game.coinStats.head / total).toFixed(3));
        }
      } else if (!pending.guessed) {
        pending.guessed = autoGuessByPersona(game, actor);
      }

      if (choice === 'reroll') {
        if (game.noReroll) return { ok: false, reason: '本模式没有重抛' };
        if (!pending.canReroll || pending.rerolled) return { ok: false, reason: '重抛已用尽' };
        actor.rerolls -= 1;
        actor.stats.rerolls += 1;
        pending.rerolled = true;
        pending.canReroll = false;
        pending.result = flipCoin(game);
        pending.blessed = false;
        if (activeUnit(actor) && activeUnit(actor).passiveKey === 'onRerollBoost') {
          actor.rerollBoost = true;
          addEvent(game, { type: 'passive', playerId: actor.id, name: '重抛余波', text: '本回合下一次伤害 +1' });
        }
        addEvent(game, { type: 'reroll', playerId: actor.id, result: pending.result });
        addLog(game, actor.name + ' 重抛命运，重新抛币：' + (pending.result ? '正面。' : '反面。'), 'coin');
        // fall through to settle (reroll 后直接进入结算，与原逻辑一致)
      }

      // 接受结果
      pending.resolved = true;
      const success = !!pending.result;
      triggerFlipPassives(game, actor, success);
      addEvent(game, { type: 'flipResult', playerId: actor.id, result: success, cardName: card.name, blessed: pending.blessed, rerolled: pending.rerolled, guessed: pending.guessed });
      addLog(game, '硬币落定：' + (success ? '正面 · 技能成立。' : '反面 · 技能反噬。') + (pending.guessed ? '（你猜的' + (pending.guessed === 'head' ? '正面' : '反面') + '）' : ''), 'coin');
      // v2.1 random-rules 法则②：反面也触发正面效果
      let useSuccess = success;
      if (!success && game.turnRule === 2) {
        useSuccess = true;
        addLog(game, '法则「反面转正」生效，反面亦按正面结算。', 'system');
      }
      // 克隆 effects，避免直接改 card 数据；同时叠加猜币加成
      let effects = Object.assign({}, useSuccess ? card.posEffects : card.negEffects);
      const target = playerById(game, pending.targetId) || resolveTarget(game, actor);
      addLog(game, '「' + card.name + '」' + (success ? '正面' : '负面') + '：' + (success ? card.posText : card.negText), success ? 'action' : 'damage');

      // v2.2 猜币加成
      if (pending.guessed) {
        const guessCorrect = (pending.guessed === 'head') === success;
        if (guessCorrect) {
          let boosted = false;
          if (effects.dmg) { effects.dmg += 1; boosted = true; }
          if (effects.heal) { effects.heal += 1; boosted = true; }
          if (effects.draw) { effects.draw += 1; boosted = true; }
          if (!boosted) {
            const au = activeUnit(actor);
            if (au) shieldUnit(game, actor, au, 1);
          }
          addLog(game, actor.name + ' 猜中了！命运额外倾斜。', 'coin');
          addEvent(game, { type: 'guessHit', playerId: actor.id, guessed: pending.guessed });
        } else {
          if (effects.selfDmg) effects.selfDmg += 1;
          if (effects.discard) effects.discard += 1;
          if (effects.oppHeal) effects.oppHeal += 1;
          if (effects.oppShield) effects.oppShield += 1;
          if (effects.oppDraw) effects.oppDraw += 1;
          addLog(game, actor.name + ' 猜错了，反噬加重。', 'damage');
          addEvent(game, { type: 'guessMiss', playerId: actor.id, guessed: pending.guessed });
        }
      }

      // v2.0 combo：本回合已打出过同类卡时，正面追加同类加成
      let comboBonus = null;
      if (success && card.combo && (actor.playedCategories[card.category] || 0) > 1) {
        const eff = Object.assign({}, effects);
        if (card.category === 'attack' || card.category === 'risk') eff.dmg = (eff.dmg || 0) + 1;
        else eff.draw = (eff.draw || 0) + 1;
        comboBonus = eff;
        addLog(game, '同连组合发动，「' + card.name + '」效果强化。', 'action');
        addEvent(game, { type: 'combo', playerId: actor.id, category: card.category });
      }
      // v2.0 molten 标记：攻击类正面牌触发熔心首攻加成
      if (success && (card.category === 'attack' || card.category === 'risk') && effects.dmg) {
        effects.__moltenAttack = true;
      }
      applyEffects(game, actor, target, comboBonus || effects, card.name);
      if (game.rules.chain && !game.over) {
        if (success) {
          actor.chain = Math.min(3, (actor.chain || 0) + 1);
          addEvent(game, { type: 'chain', playerId: actor.id, value: actor.chain, delta: 1 });
          addLog(game, actor.name + ' 的连锁升至 ' + actor.chain + ' 层，下一次攻击 +' + actor.chain + ' 伤害。', 'coin');
        } else {
          const debt = actor.chain || 0;
          actor.chain = 0;
          addEvent(game, { type: 'chain', playerId: actor.id, value: 0, delta: -debt });
          if (debt > 0) {
            addLog(game, actor.name + ' 的连锁断裂，承受 ' + debt + ' 点反噬。', 'damage');
            dealDamage(game, null, actor, debt, { direct: true });
          }
        }
      }
      actor.discard.push(card);
      if (game.over) game.phase = 'over';
      else game.phase = 'reveal';
      if (game.pending) game.pending.resolved = true;
      addEvent(game, { type: 'resolve', playerId: actor.id, success: success, cardName: card.name });
      return { ok: true, success: success, result: success, over: game.over };
    }

    function useActive(game, playerId, targetId) {
      if (game.phase !== 'action') return { ok: false, reason: '现在不能使用主动技' };
      const actor = currentPlayer(game);
      if (!actor || actor.id !== playerId) return { ok: false, reason: '还没轮到你' };
      if (actor.activeUsedThisTurn) return { ok: false, reason: '本回合已经使用过主动技' };
      if (actor.sealedThisTurn) return { ok: false, reason: '主动技被封印' };
      if (actor.blindThisTurn) return { ok: false, reason: '主动技被致盲' };
      const unit = activeUnit(actor);
      if (!unit || unit.activeUsesLeft <= 0) return { ok: false, reason: '主动技次数已用尽' };
      const target = resolveTarget(game, actor, targetId);
      if (targetId) setTarget(game, actor.id, targetId);
      actor.activeUsedThisTurn = true;
      unit.activeUsesLeft -= 1;
      addEvent(game, { type: 'active', playerId: actor.id, name: unit.activeName, targetId: target ? target.id : null });
      addLog(game, actor.name + ' 发动角色主动技「' + unit.activeName + '」。', 'active');
      applyEffects(game, actor, target, unit.activeEffects, unit.activeName);
      // v3.1 被动：momentum 乘胜追击——每回合第一次用主动技后，本回合下一次伤害 +1
      if (unit.passiveKey === 'momentum' && !actor.turnFlags.momentumUsed) {
        actor.turnFlags.momentumUsed = true;
        actor.pendingDamageBonus = (actor.pendingDamageBonus || 0) + 1;
        addEvent(game, { type: 'passive', playerId: actor.id, name: '乘胜追击', text: '主动技后下次伤害 +1' });
        addLog(game, actor.name + ' 的乘胜追击溃荡，本回合下一次伤害 +1。', 'action');
      }
      if (!game.over) game.phase = 'action';
      return { ok: true, over: game.over };
    }

    function switchCharacter(game, playerId, index) {
      if (game.phase !== 'action') return { ok: false, reason: '现在不能切换' };
      const actor = currentPlayer(game);
      if (!actor || actor.id !== playerId) return { ok: false, reason: '还没轮到你' };
      if (!actor.chars || actor.chars.length < 2) return { ok: false, reason: '没有可切换的角色' };
      if (actor.switchedThisTurn) return { ok: false, reason: '本回合已经切换过' };
      const next = actor.chars[index];
      if (!next || next.hp <= 0 || index === actor.active) return { ok: false, reason: '无法切换到该角色' };
      actor.active = index;
      actor.switchedThisTurn = true;
      addEvent(game, { type: 'switch', playerId: actor.id, active: index, auto: false });
      addLog(game, actor.name + ' 切换角色：' + next.name + ' 上场。', 'turn');
      return { ok: true };
    }

    function checkVictory(game) {
      if (game.phase === 'over') return true;
      const teams = {};
      game.players.forEach(function (p) { teams[p.team] = teams[p.team] || playerAlive(p); });
      const alive = Object.keys(teams).filter(function (t) { return teams[t]; });
      if (alive.length <= 1) {
        game.phase = 'over';
        game.pending = null;
        const winnerTeam = alive[0] || null;
        game.over = {
          winnerTeam: winnerTeam,
          winnerId: winnerTeam ? (game.players.find(function (p) { return p.team === winnerTeam; }) || {}).id : null,
          reason: winnerTeam ? '对方全员倒下，审判结束。' : '双方同时倒下，赛场收走了这一局。',
          turn: game.turn,
          at: Date.now()
        };
        game.players.forEach(function (p) {
          if (p.team === winnerTeam) p.stats.wins += 1;
        });
        addLog(game, winnerTeam ? ('队伍 ' + winnerTeam + ' 赢下星杯审判。') : '平局。赛场没有赢家。', 'system');
        addEvent(game, { type: 'victory', team: winnerTeam, reason: game.over.reason });
        return true;
      }
      return false;
    }

    /* -------------------------------------------------------
       序列化：隐藏对手手牌与牌库
       ------------------------------------------------------- */
    function serializeFor(game, viewerId) {
      const clone = JSON.parse(JSON.stringify(game));
      clone.rng = null;
      clone.viewerId = viewerId;
      const viewer = game.players.find(function (p) { return p.id === viewerId; });
      clone.players.forEach(function (p) {
        p.handCount = p.hand.length;
        p.deckCount = p.deck.length;
        p.discardCount = p.discard.length;
        if (p.id !== viewerId) {
          p.hand = p.hand.map(function (c, i) {
            return { id: c.id, uid: 'hidden-' + i, name: '未知卡牌', category: c.category, categoryName: c.categoryName, style: c.style, styleName: c.styleName, rarity: c.rarity, hidden: true };
          });
          p.deck = [];
          p.discard = p.discard.map(function (c, i) { return { id: c.id, uid: 'hidden-d-' + i, name: '未知卡牌', hidden: true }; });
          if (!viewer || p.team !== viewer.team) p.orders = [];
        } else {
          p.deck = [];
          p.discard = [];
        }
      });
      if (clone.story) {
        clone.story = { chapterIndex: game.story.chapterIndex, chapter: game.story.chapter };
      }
      return clone;
    }

    /* -------------------------------------------------------
       随机开局辅助
       ------------------------------------------------------- */
    function randomSetup(modeId, extra) {
      const mode = D.byId.mode(modeId);
      const chars = D.randomCharacters(modeId === 'brawl' ? 4 : (mode && mode.id === 'team' ? 8 : 2));
      const deck = shuffle(D.CARDS).slice(0, modeId === 'custom' ? 10 : 15).map(function (c) { return c.id; });
      return Object.assign({
        modeId: modeId,
        playerName: '无名执币者',
        charId: chars[0].id,
        charId2: (chars[1] || chars[0]).id,
        allyCharId: (chars[2] || chars[0]).id,
        deckMode: 'random',
        deckIds: deck,
        aiLevel: 'normal',
        theme: chars[0].style,
        storyChapter: 0,
        teamA: 2,
        teamB: 2
      }, extra || {});
    }

    return {
      RULES, createGame, playerById, currentPlayer, activeUnit, playerAlive, teamAlive,
      enemiesOf, alliesOf, resolveTarget, setTarget, drawCards, discardRandom, addLog, addChat, addEvent,
      beginTurn, endTurn, forceAdvanceAfterReveal, playCard, resolveFlip, submitGuess, useActive, switchCharacter,
      checkVictory, serializeFor, flipCoin, randomSetup, randomDeck, cloneCard, shuffle,
      buildDraftDeck,
      HAND_MAX, SHIELD_MAX
    };
  })();

  root.CF_ENGINE = ENGINE;

  if (typeof document === 'undefined') {
    if (typeof module !== 'undefined' && module.exports) module.exports = ENGINE;
    return;
  }

  /* =========================================================
     以下为界面控制器
     ========================================================= */
  const $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  const $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  const esc = function (text) {
    return String(text == null ? '' : text).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  };
  const SETTINGS_KEY = 'coinfall.settings.v1';
  const SETUP_KEY = 'coinfall.setup.v1';

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? Object.assign({}, fallback, JSON.parse(raw)) : Object.assign({}, fallback);
    } catch (e) { return Object.assign({}, fallback); }
  }

  const SETTINGS = readJSON(SETTINGS_KEY, {
    music: true, sfx: true, voice: true, voiceEnabled: true, reducedMotion: false, hideHints: false,
    coinSkin: 'bronze', voicePack: 'house',
    bgmTrack: 'theme', bgmVolume: 0.45,
    ambient: false, ambientTheme: 'theme', ambientVolume: 0.35,
    homeBg: 'menu', battleBg: 'theme',
    aiTimeoutMs: 30000, aiThink: false,
    aiPersona: 'hotaru', aiVoice: true
  });
  SETTINGS.aiPersona = SETTINGS.aiPersona || 'hotaru';
  if (SETTINGS.aiVoice === undefined) SETTINGS.aiVoice = true;
  if (SETTINGS.voiceEnabled === undefined) SETTINGS.voiceEnabled = true;
  try { if (root.CF_AI && root.CF_AI.setPersona) root.CF_AI.setPersona(SETTINGS.aiPersona); } catch (e) {}
  SETTINGS.bgmVolume = Math.max(0, Math.min(1, Number(SETTINGS.bgmVolume)));
  if (isNaN(SETTINGS.bgmVolume)) SETTINGS.bgmVolume = 0.45;
  SETTINGS.ambientVolume = Math.max(0, Math.min(1, Number(SETTINGS.ambientVolume)));
  if (isNaN(SETTINGS.ambientVolume)) SETTINGS.ambientVolume = 0.35;
  SETTINGS.homeBg = SETTINGS.homeBg || 'menu';
  SETTINGS.battleBg = SETTINGS.battleBg || 'theme';
  SETTINGS.bgmTrack = SETTINGS.bgmTrack || 'theme';
  SETTINGS.ambientTheme = SETTINGS.ambientTheme || 'theme';

  function saveSettings() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(SETTINGS)); } catch (e) {}
  }

  function applyCoinSkin() {
    var skin = SETTINGS.coinSkin || 'bronze';
    document.documentElement.dataset.coinSkin = skin;
    // 把真实硬币贴图铺到所有硬币面（hero-coin / battle-coin / flip-coin）
    var fronts = document.querySelectorAll('.coin__face--front, .hero-coin__face--front');
    var backs = document.querySelectorAll('.coin__face--back, .hero-coin__face--back');
    for (var i = 0; i < fronts.length; i++) {
      fronts[i].style.backgroundImage = 'url("' + coinUrl(skin, 'front') + '")';
      fronts[i].classList.add('coin__face--img');
    }
    for (var j = 0; j < backs.length; j++) {
      backs[j].style.backgroundImage = 'url("' + coinUrl(skin, 'back') + '")';
      backs[j].classList.add('coin__face--img');
    }
  }

  function coinUrl(skin, side) {
    skin = skin || SETTINGS.coinSkin || 'bronze';
    return 'assets/art/coins/' + skin + '-' + (side === 'back' ? 'back' : 'front') + '.jpg';
  }

  // v2.1 技能名播报词表（key → 中文，用于 UI/图鉴）。wav 文件位于 assets/audio/voice/say/{key}.wav。
  const SAY_LABELS = {
    play: '出牌', zhao: '正面', mei: '反面', damage: '伤害', heal: '治疗', shield: '护盾',
    draw: '抽牌', discard: '弃牌', burn: '灼烧', drain: '吸血', steal: '夺盾', stun: '眩晕',
    seal: '封印', win: '胜利', lose: '失败', reroll: '重掷', power: '强化', weak: '弱化',
    guard: '警戒', reflect: '反弹', energize: '蓄能', fall: '陨落',
    attack: '攻击牌', defend: '防御牌', control: '控制牌', risk: '风险牌', style: '签名牌', settle: '结算',
    tongsha: '断罪', rongzhu: '熔铸', xueyue: '赤红', zhongxie: '中邪', yiti: '一体', shiyue: '蚀月',
    qiangxu: '抢跑', zuolun: '作轮', tulong: '屠龙', qiangpao: '强跑', rongke: '熔壳', guozai: '过载'
  };
  // 主动技 id → say key（v2.1 §1.2 的 12 个主动技播报词）。未列出的不播。
  const ACTIVE_SAY_KEYS = {
    'active-tongsha': 'tongsha', 'active-rongzhu': 'rongzhu', 'active-xueyue': 'xueyue',
    'active-zhongxie': 'zhongxie', 'active-yiti': 'yiti', 'active-shiyue': 'shiyue',
    'active-qiangxu': 'qiangxu', 'active-zuolun': 'zuolun', 'active-tulong': 'tulong',
    'active-qiangpao': 'qiangpao', 'active-rongke': 'rongke', 'active-guozai': 'guozai'
  };

  function skinCardGridHTML() {
    const skin = SETTINGS.coinSkin || 'bronze';
    const list = D.COIN_SKINS || [];
    return '<div class="skin-grid">' + list.map(function (s) {
      return '<button type="button" class="skin-card' + (s.id === skin ? ' is-active' : '') + '" data-skin="' + esc(s.id) + '">' +
        '<img src="' + coinUrl(s.id, 'front') + '" alt="' + esc(s.name) + '" loading="lazy">' +
        '<span class="skin-card__name">' + esc(s.name) + '</span>' +
        '<span class="skin-card__trait">' + esc(s.trait) + '</span>' +
      '</button>';
    }).join('') + '</div>';
  }

  const DEFAULT_SETUP = {
    modeId: 'standard',
    playerName: '无名执币者',
    charMode: 'specified',
    charId: 'cth-01',
    charId2: 'stm-01',
    allyCharId: 'wa-02',
    teamA: 2,
    teamB: 2,
    charStyleFilter: 'all',
    deckMode: 'random',
    customDeck: [],
    theme: 'abyss',
    opponent: 'ai',
    aiLevel: 'normal',
    storyChapter: 0,
    hpMultiplier: 1
  };
  const S = {
    setup: readJSON(SETUP_KEY, DEFAULT_SETUP),
    screen: 'home',
    game: null,
    viewGame: null,
    viewerId: 'p0',
    selectedCardIndex: null,
    lastEventSeq: 0,
    overlayKey: '',
    overlayRevealed: false,
    overlayTimer: null,
    advanceTimer: null,
    aiTimer: null,
    aiBusy: false,
    overShown: false,
    currentConfig: null,
    online: { role: null, code: null, transport: null, guests: [], connected: false, status: '', seat: 1, matchmaking: false, hostName: '', guestSeat: 1 },
    lobby: { transport: 'peer', roomVisible: false, hosting: false },
    archive: { tab: 'characters', query: '', style: 'all', role: 'all', category: 'all' },
    deckBuilder: { query: '', category: 'all', selected: [] },
    audioTheme: null,
    lastChatCount: 0,
    netReady: false
  };
  if (S.setup.customDeck.length > 10) S.setup.customDeck = S.setup.customDeck.slice(0, 10);
  if (!D.byId.character(S.setup.charId)) S.setup.charId = 'cth-01';
  if (!D.byId.character(S.setup.charId2)) S.setup.charId2 = 'stm-01';
  if (!D.byId.character(S.setup.allyCharId)) S.setup.allyCharId = 'wa-02';
  S.setup.teamA = Math.max(1, Math.min(4, Number(S.setup.teamA) || 2));
  S.setup.teamB = Math.max(1, Math.min(4, Number(S.setup.teamB) || 2));

  function persistSetup() {
    try { localStorage.setItem(SETUP_KEY, JSON.stringify(S.setup)); } catch (e) {}
  }

  /* =========================================================
     音频引擎：程序化 BGM / 音效 / 语音
     ========================================================= */
  const Audio = (function () {
    let ctx = null;
    let master = null;
    let musicGain = null;
    let sfxGain = null;
    let bgmTimer = null;
    let nextNote = 0;
    let step = 0;
    let currentTheme = null;
    let fileBgmTrack = null;
    let ambientTimer = null;
    let ambientGain = null;
    let ambientNoise = null;
    let ambientTheme = null;
    let ambientNext = 0;
    let duckTimer = null;         // BGM 闪避恢复计时器
    let duckRestoreTarget = null; // 闪避结束后 musicGain 要回到的目标值
    let specialAmbient = null;    // 特殊氛围音（风/雨/星空/滴答）句柄

    function ensure() {
      if (!SETTINGS.music && !SETTINGS.sfx && !SETTINGS.voice) return null;
      if (ctx) return ctx;
      const Ctx = root.AudioContext || root.webkitAudioContext;
      if (!Ctx) return null;
      ctx = new Ctx();
      master = ctx.createGain();
      master.gain.value = 0.8;
      master.connect(ctx.destination);
      musicGain = ctx.createGain();
      musicGain.gain.value = SETTINGS.music ? 0.18 * (SETTINGS.bgmVolume / 0.45) : 0;
      musicGain.connect(master);
      sfxGain = ctx.createGain();
      sfxGain.gain.value = SETTINGS.sfx ? 0.42 : 0;
      sfxGain.connect(master);
      return ctx;
    }

    function unlock() {
      const c = ensure();
      if (c && c.state === 'suspended') c.resume().catch(function () {});
    }

    function setMuted() {
      if (!ctx) return;
      musicGain.gain.setTargetAtTime(SETTINGS.music ? 0.18 * (SETTINGS.bgmVolume == null ? 1 : SETTINGS.bgmVolume / 0.45) : 0, ctx.currentTime, 0.05);
      sfxGain.gain.setTargetAtTime(SETTINGS.sfx ? 0.42 : 0, ctx.currentTime, 0.05);
      if (ambientGain) ambientGain.gain.setTargetAtTime(SETTINGS.ambient ? 0.22 * SETTINGS.ambientVolume : 0, ctx.currentTime, 0.3);
      if (!SETTINGS.music) stopBgm();
      else if (!bgmTimer && currentTheme) startBgm(currentTheme, true);
      if (!SETTINGS.ambient) stopAmbient();
      else if (currentTheme) startAmbient(currentTheme, true);
    }

    // 合成一个带通振荡音包络：30ms 淡入 + 50ms 淡出，避免硬切爆音
    function tone(freq, duration, type, gain, when, destination) {
      if (!ctx) return;
      const t0 = when || ctx.currentTime;
      const peak = gain || 0.08;
      const attack = 0.03;   // 淡入 30ms
      const release = 0.05;  // 淡出 50ms
      const hold = Math.max(0.001, duration - release);
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      env.gain.setValueAtTime(0.0001, t0);
      env.gain.exponentialRampToValueAtTime(peak, t0 + attack);
      env.gain.setValueAtTime(peak, t0 + hold);
      env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      osc.connect(env);
      env.connect(destination || sfxGain);
      osc.start(t0);
      osc.stop(t0 + duration + 0.05);
    }

    // 合成一段带通噪声：同样套 30ms 淡入 / 50ms 淡出包络
    function noise(duration, gain, when, filterFreq, destination) {
      if (!ctx) return;
      const t0 = when || ctx.currentTime;
      const len = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = filterFreq || 1200;
      filter.Q.value = 0.9;
      const env = ctx.createGain();
      const peak = gain || 0.05;
      env.gain.setValueAtTime(0.0001, t0);
      env.gain.exponentialRampToValueAtTime(peak, t0 + 0.03);
      env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      src.connect(filter); filter.connect(env); env.connect(destination || sfxGain);
      src.start(t0);
    }

    // 当前选中硬币皮肤（带兜底），供音效按皮肤变调、粒子取色
    function currentCoinSkin() {
      try {
        var id = SETTINGS.coinSkin || 'bronze';
        var list = (typeof D !== 'undefined' && D.COIN_SKINS) || [];
        for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
      } catch (e) {}
      return { id: 'bronze', playbackRate: 1, glow: '#d8b878', particle: '#d8b878' };
    }

    // BGM 闪避：重要 SFX 出现时把 BGM 临时压到 40%，1 秒后平滑恢复
    function duckMusic() {
      if (!ctx || !SETTINGS.music) return;
      try {
        var target = 0.18 * ((SETTINGS.bgmVolume == null ? 1 : SETTINGS.bgmVolume / 0.45));
        if (musicGain) {
          duckRestoreTarget = target;
          musicGain.gain.cancelScheduledValues(ctx.currentTime);
          musicGain.gain.setTargetAtTime(target * 0.4, ctx.currentTime, 0.08);
        }
        try { if (root.CFFileAudio && root.CFFileAudio.setBgmVolume) root.CFFileAudio.setBgmVolume((SETTINGS.bgmVolume || 0.45) * 0.4); } catch (e) {}
        if (duckTimer) clearTimeout(duckTimer);
        duckTimer = setTimeout(function () {
          try {
            if (musicGain && duckRestoreTarget != null) {
              musicGain.gain.cancelScheduledValues(ctx.currentTime);
              musicGain.gain.setTargetAtTime(duckRestoreTarget, ctx.currentTime, 0.4);
            }
            try { if (root.CFFileAudio && root.CFFileAudio.setBgmVolume) root.CFFileAudio.setBgmVolume(SETTINGS.bgmVolume || 0.45); } catch (e) {}
          } catch (e) {}
        }, 1000);
      } catch (e) {}
    }

    // 需要触发 BGM 闪避的重要 SFX 名单
    var DUCK_SFX = { coin: 1, damage: 1, fail: 1, victory: 1, defeat: 1 };

    function sfx(name) {
      if (!SETTINGS.sfx) return;
      // 重要 SFX 触发 BGM 闪避（无论走文件还是合成路径都生效）
      if (DUCK_SFX[name]) { try { duckMusic(); } catch (e) {} }
      // 文件优先：存在真实音效文件则播放，跳过程序化合成（404 自动回退）
      try {
        if (root.CFFileAudio && root.CF_ASSETS && root.CFFileAudio.playOne(root.CF_ASSETS.sfxUrl(name), 0.9)) return;
      } catch (e) { /* 回退合成 */ }
      const c = ensure();
      if (!c) return;
      if (c.state === 'suspended') c.resume().catch(function () {});
      const t = c.currentTime;
      switch (name) {
        case 'click': tone(520, 0.06, 'sine', 0.035, t); break;
        case 'card':
          noise(0.16, 0.035, t, 2400);
          tone(330, 0.12, 'triangle', 0.04, t + 0.02);
          break;
        case 'coin': {
          // 硬币声按皮肤变调：playbackRate > 1 更亮更脆，< 1 更低沉
          var skin = currentCoinSkin();
          var pr = Number(skin.playbackRate) || 1;
          tone(880 * pr, 0.16, 'sine', 0.06, t);
          tone(1320 * pr, 0.22, 'sine', 0.035, t + 0.04);
          // 熔心皮肤额外加一段火苗噪声尾巴
          if (skin.id === 'molten') {
            noise(0.35, 0.03, t, 720);
            tone(170, 0.28, 'triangle', 0.018, t);
          }
          break;
        }
        case 'success':
          [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) { tone(f, 0.5, 'sine', 0.07, t + i * 0.065); });
          noise(0.3, 0.025, t, 3800);
          break;
        case 'fail':
          tone(110, 0.42, 'sawtooth', 0.075, t);
          tone(82.41, 0.55, 'sine', 0.08, t + 0.05);
          noise(0.25, 0.035, t, 320);
          break;
        case 'damage':
          noise(0.22, 0.095, t, 520);
          tone(72, 0.28, 'sawtooth', 0.08, t);
          break;
        case 'heal':
          [392, 523.25, 659.25].forEach(function (f, i) { tone(f, 0.38, 'sine', 0.045, t + i * 0.07); });
          break;
        case 'shield':
          tone(220, 0.3, 'triangle', 0.05, t);
          tone(440, 0.4, 'sine', 0.04, t + 0.05);
          break;
        case 'active':
          [196, 246.94, 293.66, 392].forEach(function (f, i) { tone(f, 0.6, 'triangle', 0.055, t + i * 0.06); });
          break;
        case 'victory':
          [392, 523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) { tone(f, 0.9, 'sine', 0.075, t + i * 0.12); });
          break;
        case 'defeat':
          [196, 164.81, 130.81, 98].forEach(function (f, i) { tone(f, 0.9, 'sine', 0.065, t + i * 0.16); });
          break;
        case 'chat':
          tone(660, 0.08, 'sine', 0.025, t);
          tone(880, 0.08, 'sine', 0.02, t + 0.06);
          break;
        default: tone(440, 0.08, 'sine', 0.03, t);
      }
    }

    function resolveBgmTrack(themeId) {
      var track = SETTINGS.bgmTrack || 'theme';
      if (track === 'off') return null;
      if (track === 'theme') return themeId || currentTheme || 'abyss';
      return track;
    }

    function startBgm(themeId, force) {
      if (!SETTINGS.music) { currentTheme = resolveBgmTrack(themeId) || themeId; return; }
      var track = resolveBgmTrack(themeId);
      if (!track) { stopBgm(); currentTheme = null; return; }
      if (!force && currentTheme === track && (bgmTimer || fileBgmTrack === track)) return;
      // 文件优先：存在真实循环 BGM 则接管
      try {
        if (root.CFFileAudio && root.CF_ASSETS) {
          var bgmFile = track === 'menu' ? root.CF_ASSETS.menuBgmUrl() : root.CF_ASSETS.bgmUrl(track);
          if (root.CFFileAudio.playBgm(bgmFile, SETTINGS.bgmVolume)) {
            stopSynthBgm();
            currentTheme = track;
            fileBgmTrack = track;
            return;
          }
        }
      } catch (e) { /* 回退程序化 */ }
      const style = D.STYLES[track] || D.STYLES.abyss;
      const profile = style.bgm || D.STYLES.abyss.bgm;
      const c = ensure();
      if (!c) return;
      stopBgm();
      currentTheme = track;
      step = 0;
      nextNote = c.currentTime + 0.1;
      const beat = 60 / profile.tempo;
      const scale = profile.scale;
      const rootNote = profile.root;
      const play = function () {
        if (!ctx) return;
        while (nextNote < ctx.currentTime + 0.5) {
          const degree = scale[step % scale.length];
          const octave = Math.floor(step / scale.length) % 2;
          const freq = rootNote * Math.pow(2, octave + degree / 12);
          // 低音铺底
          if (step % 4 === 0) tone(rootNote / 2, beat * 3.4, 'sine', 0.035, nextNote, musicGain);
          // 主旋律
          tone(freq, beat * 0.9, profile.wave, 0.035, nextNote, musicGain);
          // 高频回声
          if (step % 4 === 2) tone(freq * 2, beat * 0.35, 'sine', 0.014, nextNote + beat * 0.5, musicGain);
          step++;
          nextNote += beat * (step % 8 === 7 ? 1.35 : 0.85);
        }
      };
      play();
      bgmTimer = setInterval(play, 120);
    }

    function stopSynthBgm() {
      if (bgmTimer) { clearInterval(bgmTimer); bgmTimer = null; }
    }

    function stopBgm() {
      stopSynthBgm();
      fileBgmTrack = null;
      try { if (root.CFFileAudio) root.CFFileAudio.stopBgmFile(); } catch (e) {}
    }

    function setBgmVolume(v) {
      SETTINGS.bgmVolume = Math.max(0, Math.min(1, Number(v)));
      if (isNaN(SETTINGS.bgmVolume)) SETTINGS.bgmVolume = 0.45;
      try { if (root.CFFileAudio) root.CFFileAudio.setBgmVolume(SETTINGS.bgmVolume); } catch (e) {}
      if (ctx && musicGain) musicGain.gain.setTargetAtTime(SETTINGS.music ? 0.18 * (SETTINGS.bgmVolume / 0.45) : 0, ctx.currentTime, 0.08);
    }

    function refreshBgm() {
      if (!SETTINGS.music) { stopBgm(); currentTheme = resolveBgmTrack(S.battleTheme || currentTheme || 'abyss'); return; }
      startBgm(S.battleTheme || currentTheme || 'abyss', true);
    }

    /* ---------------------------------------------------------
       背景氛围音（程序化，无音频文件依赖）
       --------------------------------------------------------- */
    function resolveAmbientTheme(themeId) {
      var track = SETTINGS.ambientTheme || 'theme';
      if (track === 'off') return null;
      if (track === 'theme') return themeId || currentTheme || 'abyss';
      return track;
    }

    // 生成一段指定时长的循环噪声 buffer（white=true 白噪，否则棕噪）
    function makeLoopNoise(c, seconds, white) {
      var len = Math.floor(c.sampleRate * seconds);
      var buf = c.createBuffer(1, len, c.sampleRate);
      var d = buf.getChannelData(0);
      var last = 0;
      for (var i = 0; i < len; i++) {
        var w = Math.random() * 2 - 1;
        if (white) { d[i] = w; }
        else { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; }
      }
      return buf;
    }

    // 特殊氛围音：风 / 雨 / 星空嗡嗡 / 机械滴答（全部 Web Audio 合成，无文件依赖）
    function startSpecialAmbient(theme, c, g) {
      var nodes = [];
      var loop = function (buf, type, freq, q, gainVal) {
        var src = c.createBufferSource();
        src.buffer = buf; src.loop = true;
        var f = c.createBiquadFilter();
        f.type = type; f.frequency.value = freq; f.Q.value = q || 0.7;
        var eg = c.createGain(); eg.gain.value = gainVal;
        src.connect(f); f.connect(eg); eg.connect(g);
        src.start();
        nodes.push(src);
        return { src: src, filter: f, gain: eg };
      };

      if (theme === 'wind') {
        // 旷野低鸣：棕噪 + 低通，截止频率缓慢起伏
        var w = loop(makeLoopNoise(c, 3, false), 'lowpass', 420, 0.6, 0.9);
        var lfo = c.createOscillator(); lfo.frequency.value = 0.08;
        var lfoG = c.createGain(); lfoG.gain.value = 180;
        lfo.connect(lfoG); lfoG.connect(w.filter.frequency); lfo.start();
        nodes.push(lfo);
      } else if (theme === 'rain') {
        // 淅沥雨声：白噪 + 带通偏高频，加一点高频沙粒
        loop(makeLoopNoise(c, 2, true), 'bandpass', 2800, 0.5, 0.55);
        loop(makeLoopNoise(c, 2, true), 'highpass', 6200, 0.5, 0.18);
      } else if (theme === 'star') {
        // 星空嗡嗡：两个微微失谐的低频正弦拍频，加零星高频铃音
        var s1 = c.createOscillator(); s1.type = 'sine'; s1.frequency.value = 110;
        var s2 = c.createOscillator(); s2.type = 'sine'; s2.frequency.value = 110.7;
        var sg = c.createGain(); sg.gain.value = 0.05;
        s1.connect(sg); s2.connect(sg); sg.connect(g);
        s1.start(); s2.start();
        nodes.push(s1, s2);
        ambientNext = c.currentTime + 1.5;
        ambientTimer = setInterval(function () {
          if (!ctx || !ambientGain) return;
          if (ctx.currentTime < ambientNext - 0.3) return;
          var now = ctx.currentTime;
          ambientNext = now + 3 + Math.random() * 6;
          var f = 880 + Math.random() * 660;
          tone(f, 2.2, 'sine', 0.012 * SETTINGS.ambientVolume, now, ambientGain);
        }, 1200);
      } else if (theme === 'clock') {
        // 机械滴答：每 0.85s 一次短促高频 "tick"，音量很低
        ambientNext = c.currentTime + 0.2;
        ambientTimer = setInterval(function () {
          if (!ctx || !ambientGain) return;
          if (ctx.currentTime < ambientNext - 0.3) return;
          var now = ctx.currentTime;
          ambientNext = now + 0.85;
          // 短而硬的 tick：高通噪声 + 三角波短音
          noise(0.04, 0.05 * SETTINGS.ambientVolume, now, 3600, ambientGain);
          tone(1800, 0.03, 'triangle', 0.025 * SETTINGS.ambientVolume, now, ambientGain);
        }, 400);
      }
      specialAmbient = { nodes: nodes };
    }

    function startAmbient(themeId, force) {
      if (!SETTINGS.ambient) { stopAmbient(); return; }
      var theme = resolveAmbientTheme(themeId);
      if (!theme) { stopAmbient(); return; }
      if (!force && ambientTimer && ambientTheme === theme) return;
      var c = ensure();
      if (!c) return;
      stopAmbient();
      ambientTheme = theme;
      var g = ensureAmbientGain();
      if (!g) return;
      g.gain.setTargetAtTime(0.22 * SETTINGS.ambientVolume, c.currentTime, 1.4);

      // 特殊氛围音模式（风/雨/星空/滴答）走独立合成路径
      if (theme === 'wind' || theme === 'rain' || theme === 'star' || theme === 'clock') {
        try { startSpecialAmbient(theme, c, g); } catch (e) {}
        return;
      }

      var profile = (D.STYLES[theme] || D.STYLES.abyss).bgm || {};
      // 低频风声 / 空间底噪
      var noiseBuf = c.createBuffer(1, Math.floor(c.sampleRate * 2), c.sampleRate);
      var data = noiseBuf.getChannelData(0);
      var last = 0;
      for (var i = 0; i < data.length; i++) {
        var white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.2;
      }
      var src = c.createBufferSource();
      src.buffer = noiseBuf;
      src.loop = true;
      var filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = profile.ambientFilter || 480;
      filter.Q.value = 0.8;
      var drone = c.createOscillator();
      drone.type = 'sine';
      drone.frequency.value = (profile.root || 110) / 2;
      var droneGain = c.createGain();
      droneGain.gain.value = 0.05;
      src.connect(filter); filter.connect(g);
      drone.connect(droneGain); droneGain.connect(g);
      src.start(); drone.start();
      ambientNoise = { src: src, drone: drone, filter: filter };
      ambientNext = c.currentTime + 2;
      ambientTimer = setInterval(function () {
        if (!ctx || !ambientGain) return;
        if (ctx.currentTime < ambientNext - 0.5) return;
        var now = ctx.currentTime;
        ambientNext = now + 4 + Math.random() * 7;
        var scale = profile.scale || [0, 3, 5, 7, 10, 12];
        var freq = (profile.root || 110) * 2 * Math.pow(2, (scale[Math.floor(Math.random() * scale.length)] || 0) / 12);
        tone(freq, 2.4, 'sine', 0.02 * SETTINGS.ambientVolume, now, ambientGain);
        if (Math.random() < 0.5) tone(freq * 1.5, 1.6, 'triangle', 0.012 * SETTINGS.ambientVolume, now + 0.4, ambientGain);
      }, 1500);
    }

    function ensureAmbientGain() {
      if (!ctx) return null;
      if (!ambientGain) {
        ambientGain = ctx.createGain();
        ambientGain.gain.value = SETTINGS.ambient ? 0.22 * SETTINGS.ambientVolume : 0;
        ambientGain.connect(master);
      }
      return ambientGain;
    }

    function stopAmbient() {
      if (ambientTimer) { clearInterval(ambientTimer); ambientTimer = null; }
      if (ambientNoise) {
        try { ambientNoise.src.stop(); } catch (e) {}
        try { ambientNoise.drone.stop(); } catch (e) {}
        ambientNoise = null;
      }
      if (specialAmbient) {
        (specialAmbient.nodes || []).forEach(function (n) { try { n.stop(); } catch (e) {} });
        specialAmbient = null;
      }
      if (ambientGain && ctx) ambientGain.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
      ambientTheme = null;
    }

    function setAmbientVolume(v) {
      SETTINGS.ambientVolume = Math.max(0, Math.min(1, Number(v)));
      if (isNaN(SETTINGS.ambientVolume)) SETTINGS.ambientVolume = 0.35;
      if (ambientGain && ctx) ambientGain.gain.setTargetAtTime(SETTINGS.ambient ? 0.22 * SETTINGS.ambientVolume : 0, ctx.currentTime, 0.2);
    }

    function setAmbientEnabled(on) {
      SETTINGS.ambient = !!on;
      if (on) startAmbient(S.battleTheme || currentTheme || 'abyss', true);
      else stopAmbient();
    }

    function refreshAmbient() {
      if (!SETTINGS.ambient) { stopAmbient(); return; }
      startAmbient(S.battleTheme || currentTheme || 'abyss', true);
    }

    /* ---------------------------------------------------------
       语音系统（v2.1）：全部真人 wav 文件，缺失即静默，无 TTS 兜底
       --------------------------------------------------------- */
    // 技能名播报：播放 assets/audio/voice/say/{key}.wav，缺词静默。
    function say(key) {
      if (!SETTINGS.voice || !key) return;
      try {
        if (root.CFFileAudio) root.CFFileAudio.playOne('assets/audio/voice/say/' + key + '.wav', 0.9);
      } catch (e) { /* 缺词静默 */ }
    }

    // 角色台词：只播真人录音文件，缺失静默。
    function voice(charId, scene) {
      if (!SETTINGS.voice || !charId) return;
      try {
        if (root.CFFileAudio && root.CF_ASSETS) {
          root.CFFileAudio.playOne(root.CF_ASSETS.charVoiceUrl(charId, scene), 0.85);
        }
      } catch (e) { /* 缺词静默 */ }
    }

    // 旁白人声：播 assets/audio/voice/narrator/{pack}-{line}.wav，缺失静默。
    function narrator(line) {
      if (!SETTINGS.voice || !line) return;
      var pack = SETTINGS.voicePack || 'house';
      try {
        if (root.CFFileAudio) root.CFFileAudio.playOne('assets/audio/voice/narrator/' + pack + '-' + line + '.wav', 0.9);
      } catch (e) { /* 缺词静默 */ }
    }

    // 剧情语音：assets/audio/voice/story/{key}.wav，缺失静默。
    function storyVoice(key) {
      if (!SETTINGS.voice || !key) return;
      try {
        if (root.CFFileAudio && root.CF_ASSETS) {
          root.CFFileAudio.playOne(root.CF_ASSETS.storyVoiceUrl(key), 0.9);
        }
      } catch (e) { /* 缺词静默 */ }
    }

    // 试听旁白音色包：直接播 narrator/{pack}-open.wav，缺失静默。
    function previewNarrator(pack) {
      pack = pack || SETTINGS.voicePack || 'house';
      try {
        if (root.CFFileAudio) root.CFFileAudio.playOne('assets/audio/voice/narrator/' + pack + '-open.wav', 0.9);
      } catch (e) { /* 缺词静默 */ }
    }

    function toggle() {
      const next = !(SETTINGS.music || SETTINGS.sfx || SETTINGS.voice);
      SETTINGS.music = next; SETTINGS.sfx = next; SETTINGS.voice = next;
      saveSettings();
      unlock();
      setMuted();
      if (next && !bgmTimer) startBgm(S.battleTheme || currentTheme || 'abyss', true);
      if (next && SETTINGS.ambient) startAmbient(S.battleTheme || currentTheme || 'abyss', true);
      if (!next) { stopBgm(); stopAmbient(); }
      updateAudioButton();
      return next;
    }

    // v2.2 预加载所有 sfx wav，避免首次播放卡顿
    function preloadSfx() {
      try {
        if (!root.CF_ASSETS || !root.CF_ASSETS.SFX_NAMES) return;
        root.CF_ASSETS.SFX_NAMES.forEach(function (name) {
          try {
            var a = new Audio(root.CF_ASSETS.sfxUrl(name));
            a.preload = 'auto';
            // 不播放，仅加载到浏览器缓存
          } catch (e) {}
        });
      } catch (e) {}
    }

    return {
      unlock, sfx, startBgm, stopBgm, say, voice, narrator, storyVoice, toggle, setMuted, ensure,
      refreshBgm, refreshAmbient, setBgmVolume, setAmbientVolume, setAmbientEnabled,
      startAmbient, stopAmbient, previewNarrator, currentCoinSkin, duckMusic, preloadSfx
    };
  })();

  function updateAudioButton() {
    $$('[data-action="toggle-audio"]').forEach(function (btn) {
      const on = SETTINGS.music || SETTINGS.sfx || SETTINGS.voice;
      btn.classList.toggle('is-muted', !on);
      btn.setAttribute('aria-pressed', String(on));
      btn.title = on ? '声音已开启' : '声音已关闭';
    });
  }

  /* =========================================================
     背景粒子
     ========================================================= */
  const FX = (function () {
    let canvas, ctx, raf, particles = [], w = 0, h = 0, dpr = 1;
    let theme = D.STYLES.abyss;
    let running = true;
    // [perf] 预解析主题色 rgb，避免每帧每粒子做字符串拼接
    let themeRGB = { r: 232, g: 184, b: 109 };

    function init() {
      canvas = $('#fx-canvas');
      if (!canvas) return;
      ctx = canvas.getContext('2d');
      cacheThemeRGB();
      resize();
      window.addEventListener('resize', resize);
      spawn();
      loop();
    }

    function resize() {
      if (!canvas) return;
      // [perf] 粒子只是 0.4–2px 的小点，1.5x 采样足够，避免全屏 2x 像素填充
      dpr = Math.min(1.5, root.devicePixelRatio || 1);
      w = root.innerWidth; h = root.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function setTheme(themeId) {
      theme = D.STYLES[themeId] || D.STYLES.abyss;
      cacheThemeRGB();
      document.documentElement.dataset.theme = theme.id;
      applyBackground();
      try { Audio.refreshAmbient(); } catch (e) {}
      spawn();
    }

    function cacheThemeRGB() {
      var hx = String(theme && theme.color || '#e8b86d').replace('#', '');
      themeRGB = {
        r: parseInt(hx.slice(0, 2), 16),
        g: parseInt(hx.slice(2, 4), 16),
        b: parseInt(hx.slice(4, 6), 16)
      };
    }

    function resolveBgUrl(isBattle) {
      var settings = (typeof SETTINGS !== 'undefined' && SETTINGS) || {};
      if (isBattle) {
        var battle = settings.battleBg || 'theme';
        if (battle === 'theme') return root.CF_ASSETS ? root.CF_ASSETS.bgUrl(theme.id) : '';
        if (battle === 'battle-bg') return 'assets/art/bg/battle-bg.jpg';
        return root.CF_ASSETS ? root.CF_ASSETS.bgUrl(battle) : '';
      }
      var home = settings.homeBg || 'menu';
      if (home === 'menu') return root.CF_ASSETS ? root.CF_ASSETS.menuBgUrl() : '';
      return root.CF_ASSETS ? root.CF_ASSETS.bgUrl(home) : '';
    }

    function applyBackground() {
      try {
        var layer = document.getElementById('bg-layer');
        if (!layer) return;
        var screen = (typeof S !== 'undefined' && S.screen) || 'home';
        var url = resolveBgUrl(screen === 'battle');
        if (url) layer.style.backgroundImage = 'url("' + url + '")';
        layer.classList.toggle('bg-layer--battle', screen === 'battle');
        layer.classList.toggle('bg-layer--realm', screen !== 'battle' && (SETTINGS.homeBg || 'menu') !== 'menu');
      } catch (e) {}
    }

    function spawn() {
      // [perf] 粒子数下调，视觉密度几乎不变但每帧绘制量减少约一半
      const count = Math.min(32, Math.max(14, Math.floor(w / 46)));
      particles = [];
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.8 + 0.4,
          vx: (Math.random() - 0.5) * 0.18,
          vy: -Math.random() * 0.22 - 0.03,
          alpha: Math.random() * 0.5 + 0.1,
          phase: Math.random() * Math.PI * 2
        });
      }
    }

    function loop() {
      if (!ctx) return;
      const reduce = SETTINGS.reducedMotion || (root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
      ctx.clearRect(0, 0, w, h);
      const t = Date.now() / 1000;
      // [perf] 整帧只设一次 fillStyle，透明度交给 globalAlpha，
      // 避免每帧为每个粒子拼接一次 rgba() 字符串。
      ctx.fillStyle = 'rgb(' + themeRGB.r + ',' + themeRGB.g + ',' + themeRGB.b + ')';
      particles.forEach(function (p) {
        if (!reduce) {
          p.x += p.vx; p.y += p.vy;
          if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
          if (p.x < -10) p.x = w + 10;
          if (p.x > w + 10) p.x = -10;
        }
        ctx.globalAlpha = p.alpha * (0.55 + 0.45 * Math.sin(t * 0.8 + p.phase));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      // 缓慢的星线
      if (!reduce) {
        ctx.globalAlpha = 0.05;
        ctx.strokeStyle = 'rgb(' + themeRGB.r + ',' + themeRGB.g + ',' + themeRGB.b + ')';
        ctx.lineWidth = 1;
        for (let i = 0; i < 2; i++) {
          const y = ((t * (6 + i * 3)) % (h + 200)) - 100;
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y - 120); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      raf = requestAnimationFrame(loop);
    }

    function hexToRgba(hex, alpha) {
      const hx = String(hex || '#e8b86d').replace('#', '');
      const r = parseInt(hx.slice(0, 2), 16), g = parseInt(hx.slice(2, 4), 16), b = parseInt(hx.slice(4, 6), 16);
      return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
    }

    function stop() { running = false; if (raf) cancelAnimationFrame(raf); }
    return { init, setTheme, applyBackground, refresh: applyBackground, resolveBgUrl, resize, stop, current: function () { return theme; } };
  })();

  /* =========================================================
     通用 UI
     ========================================================= */
  function toast(message, kind) {
    const rootEl = $('#toast-root');
    if (!rootEl) return;
    const node = document.createElement('div');
    node.className = 'toast toast--' + (kind || 'info');
    node.innerHTML = '<span>' + esc(message) + '</span>';
    rootEl.appendChild(node);
    setTimeout(function () { node.classList.add('is-out'); }, 3000);
    setTimeout(function () { node.remove(); }, 3400);
  }

  function openModal(html, options) {
    options = options || {};
    const modal = $('#modal-root');
    modal.hidden = false;
    modal.className = 'modal-root is-open ' + (options.className || '');
    modal.innerHTML = '<div class="modal-backdrop" data-close-modal></div><div class="modal-dialog ' + (options.dialogClass || '') + '" role="dialog" aria-modal="true">' +
      '<button class="modal-close" data-close-modal aria-label="关闭">×</button>' + html + '</div>';
    document.body.classList.add('has-modal');
    Audio.sfx('click');
    return modal;
  }

  function closeModal() {
    const modal = $('#modal-root');
    modal.classList.remove('is-open');
    modal.hidden = true;
    modal.innerHTML = '';
    document.body.classList.remove('has-modal');
  }

  function copyText(text) {
    const value = String(text || '');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value).then(function () { toast('已复制到剪贴板', 'success'); }, function () { fallbackCopy(value); });
    } else fallbackCopy(value);
  }

  function fallbackCopy(value) {
    const ta = document.createElement('textarea');
    ta.value = value; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast('已复制到剪贴板', 'success'); }
    catch (e) { toast('复制失败，请手动选择文本', 'error'); }
    ta.remove();
  }

  function styleVars(styleId) {
    const s = D.STYLES[styleId] || D.STYLES.abyss;
    return '--style-color:' + s.color + ';--style-color2:' + s.color2 + ';--style-ink:' + s.ink + ';';
  }

  function portraitHTML(char, options) {
    options = options || {};
    const style = D.STYLES[char.style] || D.STYLES.abyss;
    const initial = (char.name || '?').replace(/[·\s]/g, '').slice(-1);
    // 真实立绘：存在则叠加在 CSS 程序化人像之上；加载失败自动移除，不破坏原有占位
    let imgTag = '';
    try {
      if (root.CF_ASSETS && char.id) {
        imgTag = '<img class="portrait__img" src="' + root.CF_ASSETS.portraitUrl(char.id) + '" alt="' + esc(char.name || '') + '" aria-hidden="true" onerror="this.remove();this.parentNode.classList.remove(\'has-media\')">';
      }
    } catch (e) {}
    return '<div class="portrait ' + (imgTag ? 'has-media ' : '') + (options.className || '') + '" style="' + styleVars(char.style) + '">' +
      imgTag +
      '<div class="portrait__aurora"></div>' +
      '<div class="portrait__rings"><i></i><i></i><i></i></div>' +
      '<span class="portrait__glyph">' + style.glyph + '</span>' +
      '<span class="portrait__initial">' + esc(initial) + '</span>' +
      '<span class="portrait__scan"></span>' +
      '<span class="portrait__realm">' + esc(style.realm) + '</span>' +
      '</div>';
  }

  function cardArtHTML(card) {
    const style = D.STYLES[card.style] || D.STYLES.abyss;
    const cat = D.CATEGORIES[card.category] || D.CATEGORIES.attack;
    // 真实卡面插画：存在则铺满卡绘区；缺失保留 CSS 程序化卡面
    let imgTag = '';
    try {
      if (root.CF_ASSETS && card.id) {
        imgTag = '<img class="card-art__img" src="' + root.CF_ASSETS.cardUrl(card.id) + '" alt="" aria-hidden="true" onerror="this.remove()">';
      }
    } catch (e) {}
    return '<div class="card-art" style="' + styleVars(card.style) + ';--cat-color:' + cat.color + '">' +
      imgTag +
      '<span class="card-art__ring"></span><span class="card-art__ring card-art__ring--two"></span>' +
      '<span class="card-art__glyph">' + style.glyph + '</span>' +
      '<span class="card-art__mark">' + cat.glyph + '</span>' +
      '<span class="card-art__realm">' + esc(style.realm) + '</span>' +
      '<span class="card-art__line"></span>' +
      '<span class="card-art__dust"></span>' +
      '</div>';
  }

  function fateCardHTML(card, options) {
    options = options || {};
    const classes = ['fate-card', 'fate-card--' + card.category, options.className || ''];
    if (options.selected) classes.push('is-selected');
    if (options.disabled) classes.push('is-disabled');
    return '<button class="' + classes.join(' ') + '" data-card-id="' + card.id + '" data-rarity="' + card.rarity + '"' + (options.index != null ? ' data-hand-index="' + options.index + '"' : '') + (options.disabled ? ' disabled' : '') + ' type="button" style="' + styleVars(card.style) + ';--rarity:' + card.rarityColor + '" aria-label="' + esc(card.name) + '">' +
      '<span class="fate-card__rarity" title="' + esc(card.rarityName) + '"></span>' +
      cardArtHTML(card) +
      '<span class="fate-card__body">' +
        '<span class="fate-card__meta"><span>' + esc(card.categoryName) + '</span><span>' + esc(card.styleName) + '</span></span>' +
        '<strong class="fate-card__name">' + esc(card.name) + '</strong>' +
        '<span class="fate-card__effect fate-card__effect--pos"><i>正</i>' + esc(card.posText) + '</span>' +
        '<span class="fate-card__effect fate-card__effect--neg"><i>反</i>' + esc(card.negText) + '</span>' +
      '</span>' +
      '<span class="fate-card__shine"></span>' +
      '</button>';
  }

  function modeCardHTML(mode) {
    return '<button class="mode-card" data-mode="' + mode.id + '" style="--mode-accent:' + mode.accent + '" type="button">' +
      '<span class="mode-card__top"><span class="mode-card__icon"><img src="assets/art/ui/icons/mode-' + mode.id + '.png" alt="" loading="lazy"></span><span class="mode-card__en">' + esc(mode.en) + '</span>' + (mode.fun ? '<span class="mode-card__fun">娱乐</span>' : '') + '</span>' +
      '<strong>' + esc(mode.name) + '</strong>' +
      '<span class="mode-card__tagline">' + esc(mode.tagline) + '</span>' +
      '<span class="mode-card__badges">' + mode.badges.map(function (b) { return '<i>' + esc(b) + '</i>'; }).join('') + '</span>' +
      '<span class="mode-card__arrow">进入 <b>↗</b></span>' +
      '</button>';
  }

  /* =========================================================
     路由与首页
     ========================================================= */
  function showScreen(name) {
    S.screen = name;
    $$('.screen').forEach(function (screen) { screen.classList.toggle('is-active', screen.id === 'screen-' + name); });
    document.body.dataset.screen = name;
    document.body.classList.toggle('in-battle', name === 'battle');
    $('#site-header').hidden = name === 'battle';
    if (name !== 'battle') {
      $$('.main-nav .nav-link').forEach(function (b) { b.classList.toggle('is-active', b.dataset.nav === name); });
    }
    applyCoinSkin();
    FX.applyBackground();
    window.scrollTo({ top: 0, behavior: SETTINGS.reducedMotion ? 'auto' : 'smooth' });
    if (name === 'home') {
      FX.setTheme('abyss');
      Audio.startBgm('abyss');
      Audio.refreshAmbient();
    } else if (name !== 'battle' && name !== 'setup') {
      Audio.startBgm(S.battleTheme || 'abyss');
      Audio.refreshAmbient();
    }
    if (name === 'collection') renderArchive();
    if (name === 'world') renderWorld();
    if (name === 'codex') renderCodex();
    if (name === 'lobby') renderLobby();
  }

  function navigate(name, options) {
    Audio.unlock();
    Audio.sfx('click');
    if (name === 'setup') {
      if (options && options.modeId) openSetup(options.modeId);
      else showScreen('setup');
    } else {
      showScreen(name);
    }
  }

  function renderHome() {
    $('#stat-chars').textContent = D.CHARACTERS.length;
    $('#stat-cards').textContent = D.CARDS.length;
    $('#stat-modes').textContent = D.MODES.length;
    const coreModes = D.MODES.filter(function (m) { return !m.fun; });
    const funModes = D.MODES.filter(function (m) { return m.fun; });
    $('#mode-grid').innerHTML = coreModes.map(modeCardHTML).join('');
    const funGrid = $('#fun-mode-grid');
    if (funGrid) funGrid.innerHTML = funModes.map(modeCardHTML).join('');

    $('#realm-strip').innerHTML = D.STYLE_ORDER.map(function (id, index) {
      const s = D.STYLES[id];
      return '<button class="realm-card" data-realm="' + id + '" style="' + styleVars(id) + '" type="button">' +
        '<span class="realm-card__index">0' + (index + 1) + '</span>' +
        '<span class="realm-card__glyph">' + s.glyph + '</span>' +
        '<span class="realm-card__name">' + esc(s.realm) + '</span>' +
        '<span class="realm-card__style">' + esc(s.name) + '</span>' +
        '<span class="realm-card__tagline">' + esc(s.tagline) + '</span>' +
        '<span class="realm-card__arrow">↗</span>' +
        '</button>';
    }).join('');

    const companions = D.CHARACTERS.filter(function (c) { return c.role === '功能' || c.role === '赌徒'; });
    const pick = companions[new Date().getDate() % companions.length];
    const quoteEl = $('#companion-quote');
    if (quoteEl && pick) {
      quoteEl.innerHTML = '“你满血还让我奶？我的牌不是矿泉水。”<cite>—— ' + esc(pick.name) + '</cite>';
    }
  }

  function enterTable() {
    const target = $('#modes-section');
    if (target) target.scrollIntoView({ behavior: SETTINGS.reducedMotion ? 'auto' : 'smooth', block: 'start' });
    Audio.sfx('click');
    if (!S.setup.modeId) S.setup.modeId = 'standard';
  }

  /* =========================================================
     战前配置
     ========================================================= */
  function openSetup(modeId) {
    const mode = D.byId.mode(modeId) || D.MODES[0];
    if (mode.scene === 'lobby') {
      S.lobby.transport = mode.transport || 'peer';
      showScreen('lobby');
      return;
    }
    S.setup.modeId = modeId;
    if (modeId === 'story') S.setup.opponent = 'ai';
    persistSetup();
    renderSetup();
    showScreen('setup');
    Audio.startBgm(S.setup.theme || 'abyss');
    FX.setTheme(S.setup.theme || 'abyss');
  }

  function filteredCharacters() {
    const filter = S.setup.charStyleFilter || 'all';
    return D.CHARACTERS.filter(function (c) { return filter === 'all' || c.style === filter; });
  }

  function characterCardHTML(char, selected, compact) {
    const style = D.STYLES[char.style];
    return '<button class="character-card ' + (selected ? 'is-selected' : '') + (compact ? ' character-card--compact' : '') + '" data-char-id="' + char.id + '" type="button" style="' + styleVars(char.style) + '">' +
      portraitHTML(char, { className: 'portrait--card' }) +
      '<span class="character-card__info">' +
        '<span class="character-card__top"><i class="role-dot" style="background:' + char.roleColor + '"></i>' + esc(char.role) + ' · ' + esc(style.name) + '</span>' +
        '<strong>' + esc(char.name) + '</strong>' +
        '<span class="character-card__title">' + esc(char.title) + '</span>' +
        (compact ? '' : '<span class="character-card__passive"><b>被动</b>' + esc(char.passive.name) + '：' + esc(char.passive.desc) + '</span>' +
          '<span class="character-card__active"><b>主动</b>' + esc(char.active.name) + ' ×' + char.active.uses + '</span>') +
      '</span>' +
      '<span class="character-card__check">✓</span>' +
      '</button>';
  }

  function renderSetup() {
    const mode = D.byId.mode(S.setup.modeId) || D.MODES[0];
    $('#setup-title').textContent = mode.name;
    $('#setup-desc').textContent = mode.desc;
    $('#setup-badges').innerHTML = mode.badges.map(function (b) { return '<span>' + esc(b) + '</span>'; }).join('');
    $('#setup-eyebrow').textContent = mode.en;
    $('#player-name').value = S.setup.playerName;

    // 可见性
    $('#brawl-second-panel').hidden = S.setup.modeId !== 'brawl';
    $('#team-size-panel').hidden = S.setup.modeId !== 'team';
    $('#team-mate-panel').hidden = S.setup.modeId !== 'team' || S.setup.teamA <= 1;
    $('#story-field').hidden = S.setup.modeId !== 'story';
    if (S.setup.modeId === 'team') renderTeamSizes();
    const opponentFields = $('#opponent-fields');
    if (S.setup.modeId === 'story') {
      opponentFields.hidden = true;
    } else if (S.setup.modeId === 'team') {
      opponentFields.hidden = false;
      $('#opponent-select').closest('label').hidden = true;
      $('#opponent-select').value = 'ai';
    } else {
      opponentFields.hidden = false;
      $('#opponent-select').closest('label').hidden = false;
    }

    $$('#char-mode-seg button').forEach(function (b) { b.classList.toggle('is-active', b.dataset.charMode === S.setup.charMode); });
    $$('#deck-mode-seg button').forEach(function (b) { b.classList.toggle('is-active', b.dataset.deckMode === S.setup.deckMode); });
    $$('#hp-multiplier-seg button').forEach(function (b) { b.classList.toggle('is-active', Number(b.dataset.hpMult) === (S.setup.hpMultiplier || 1)); });
    $('#opponent-select').value = S.setup.opponent || 'ai';
    $('#ai-level-select').value = S.setup.aiLevel || 'normal';

    // 角色筛选
    $('#char-style-filter').innerHTML = '<button data-char-style="all" class="' + (S.setup.charStyleFilter === 'all' ? 'is-active' : '') + '">全部</button>' +
      D.STYLE_ORDER.map(function (id) {
        return '<button data-char-style="' + id + '" class="' + (S.setup.charStyleFilter === id ? 'is-active' : '') + '" style="--filter-color:' + D.STYLES[id].color + '">' + D.STYLES[id].glyph + ' ' + esc(D.STYLES[id].name) + '</button>';
      }).join('');

    const chars = filteredCharacters();
    const randomMode = S.setup.charMode === 'random';
    $('#character-grid').innerHTML = chars.map(function (c) {
      return characterCardHTML(c, !randomMode && c.id === S.setup.charId, false);
    }).join('');
    $('#character-grid').classList.toggle('is-random-mode', randomMode);

    const selected = D.byId.character(S.setup.charId) || D.CHARACTERS[0];
    $('#char-selection-note').innerHTML = randomMode
      ? '<span class="note-icon">◈</span> 随机英雄：开桌时从 44 名角色中抽取。' + (S.setup.modeId === 'brawl' ? '大乱斗会抽取两名。' : '')
      : '<span class="note-icon">◉</span> 已选择 <strong>' + esc(selected.name) + '</strong> · ' + esc(selected.role) + ' · ' + esc(selected.passive.name) + ' / ' + esc(selected.active.name);

    if (S.setup.modeId === 'brawl') {
      $('#second-character-grid').innerHTML = D.CHARACTERS.map(function (c) {
        return characterCardHTML(c, !randomMode && c.id === S.setup.charId2, true);
      }).join('');
    }

    if (S.setup.modeId === 'team') renderAllyPreview();
    renderThemeGrid();
    renderDeckSummary();
    renderStoryChapters();
    renderSummary();
    bindSetupInputs();
  }

  function renderTeamSizes() {
    const a = S.setup.teamA || 1;
    const b = S.setup.teamB || 1;
    $$('#team-size-a [data-size]').forEach(function (btn) {
      btn.classList.toggle('is-active', Number(btn.dataset.size) === a);
      btn.setAttribute('aria-pressed', String(Number(btn.dataset.size) === a));
    });
    $$('#team-size-b [data-size]').forEach(function (btn) {
      btn.classList.toggle('is-active', Number(btn.dataset.size) === b);
      btn.setAttribute('aria-pressed', String(Number(btn.dataset.size) === b));
    });
    $('#team-size-badge').textContent = a + 'v' + b;
    const allyText = a > 1 ? ('你 + ' + (a - 1) + ' 名 AI 队友') : '你独自上桌';
    $('#team-size-note').innerHTML = '<span class="note-icon">⚖</span> ' + allyText + '，对抗 ' + b + ' 名 AI 对手。' +
      (a === b ? '人头对等，胜负只看硬币。' : '人数不对等：多的一方会多一个行动席，谨慎选择。');
  }

  function renderAllyPreview() {
    const ally = D.byId.character(S.setup.allyCharId) || D.CHARACTERS[0];
    $('#ally-preview').innerHTML =
      '<div class="ally-preview__portrait">' + portraitHTML(ally, { className: 'portrait--ally' }) + '</div>' +
      '<div class="ally-preview__copy">' +
        '<span class="eyebrow">AI CO-SIGNER · ' + esc(D.STYLES[ally.style].name) + '</span>' +
        '<h3>' + esc(ally.name) + '</h3>' +
        '<p>' + esc(ally.temper) + '</p>' +
        '<div class="ally-tags"><span>' + esc(ally.role) + '</span><span>被动 · ' + esc(ally.passive.name) + '</span><span>主动 · ' + esc(ally.active.name) + '</span></div>' +
        '<p class="microcopy">在战局中直接输入：“集火 B1”“先保命”“给我治疗”“开主动技”。它会判断是否合理，并用自己的脾气回应。</p>' +
      '</div>';
  }

  function renderThemeGrid() {
    $('#theme-grid').innerHTML = D.STYLE_ORDER.map(function (id) {
      const s = D.STYLES[id];
      return '<button class="theme-chip ' + (S.setup.theme === id ? 'is-selected' : '') + '" data-theme="' + id + '" style="' + styleVars(id) + '" type="button">' +
        '<span>' + s.glyph + '</span><strong>' + esc(s.realm) + '</strong><small>' + esc(s.name) + '</small></button>';
    }).join('');
  }

  function deckPool() {
    return D.CARDS;
  }

  function renderDeckSummary() {
    const custom = S.setup.deckMode === 'custom';
    $('#deck-count').textContent = custom ? (S.setup.customDeck.length + ' / 10') : '随机 15';
    const ids = custom ? S.setup.customDeck : [];
    const cards = ids.map(function (id) { return D.byId.card(id); }).filter(Boolean);
    if (!custom) {
      $('#deck-summary').innerHTML = '<div class="deck-random"><span class="deck-random__glyph">✦</span><div><strong>全卡池随机抽取</strong><p>开局从 190 张技能卡中随机生成 15 张牌库，弃牌会洗回。适合熟悉不同流派。</p></div></div>';
    } else if (!cards.length) {
      $('#deck-summary').innerHTML = '<div class="deck-empty"><span>▤</span><p>还没有选牌。打开编辑器，从 190 张技能卡中挑 10 张。</p><button class="btn btn--secondary btn--sm" data-action="open-deck-builder">开始构筑</button></div>';
    } else {
      const counts = {};
      cards.forEach(function (c) { counts[c.categoryName] = (counts[c.categoryName] || 0) + 1; });
      $('#deck-summary').innerHTML = '<div class="deck-mini-list">' + cards.map(function (c) {
        return '<span class="deck-mini" title="' + esc(c.name) + '" style="' + styleVars(c.style) + '"><i>' + (D.CATEGORIES[c.category] || {}).glyph + '</i>' + esc(c.name) + '</span>';
      }).join('') + '</div>' +
        '<div class="deck-counts">' + Object.keys(counts).map(function (k) { return '<span>' + esc(k) + ' ×' + counts[k] + '</span>'; }).join('') + '</div>';
    }
  }

  function renderStoryChapters() {
    if (S.setup.modeId !== 'story') return;
    $('#story-chapter-grid').innerHTML = D.STORY.chapters.map(function (ch, i) {
      const boss = D.BOSSES[i];
      return '<button class="story-chip ' + (S.setup.storyChapter === i ? 'is-selected' : '') + '" data-story="' + i + '" style="' + styleVars(ch.style) + '" type="button">' +
        '<span class="story-chip__chapter">' + esc(ch.chapter) + '</span>' +
        '<strong>' + esc(ch.title) + '</strong>' +
        '<span>' + esc(ch.realm) + ' · Boss ' + ch.hp + ' HP</span>' +
        '<small>' + esc(boss.name) + '</small>' +
        '</button>';
    }).join('');
  }

  function renderSummary() {
    const mode = D.byId.mode(S.setup.modeId) || D.MODES[0];
    const random = S.setup.charMode === 'random';
    const char = random ? null : (D.byId.character(S.setup.charId) || D.CHARACTERS[0]);
    const theme = D.STYLES[S.setup.theme] || D.STYLES.abyss;
    $('#summary-mode').textContent = mode.en;
    $('#summary-portrait').innerHTML = char
      ? portraitHTML(char, { className: 'portrait--summary' })
      : '<div class="summary-random" style="' + styleVars(theme.id) + '"><span>?</span><strong>随机英雄</strong><small>开桌时抽取</small></div>';
    const rows = [];
    rows.push(['模式', mode.name + (S.setup.modeId === 'story' ? ' · ' + D.STORY.chapters[S.setup.storyChapter].title : '')]);
    rows.push(['角色', char ? char.name : '随机抽取']);
    if (S.setup.modeId === 'brawl' && !random) rows.push(['第二角色', (D.byId.character(S.setup.charId2) || {}).name || '随机']);
    if (S.setup.modeId === 'team') {
      rows.push(['队伍规模', S.setup.teamA + 'v' + S.setup.teamB]);
      if (S.setup.teamA > 1) {
        rows.push(['队友', (D.byId.character(S.setup.allyCharId) || {}).name || '随机']);
        if (S.setup.teamA > 2) rows.push(['其余队友', (S.setup.teamA - 2) + ' 名 AI 自动补位']);
      }
    }
    const deckSize = (ENGINE.RULES[S.setup.modeId] || {}).deck || 15;
    const deckLabel = S.setup.deckMode === 'custom' ? S.setup.customDeck.length + ' 张自定义' : ('随机 ' + deckSize + ' 张');
    rows.push(['卡组', deckLabel]);
    rows.push(['场景', theme.realm + ' · ' + theme.name]);
    if (S.setup.modeId !== 'story') {
      rows.push(['对手', S.setup.opponent === 'local' ? '本地双人' : (S.setup.modeId === 'team' ? 'AI 队伍' : 'AI · ' + ({ easy: '简单', normal: '普通', hard: '困难' }[S.setup.aiLevel] || '普通'))]);
    }
    $('#summary-rows').innerHTML = rows.map(function (r) { return '<div><span>' + esc(r[0]) + '</span><strong>' + esc(r[1]) + '</strong></div>'; }).join('');
    const tips = [
      '合理使用整局一次的重抛，别在第一枚硬币上就把命运花光。',
      '护盾可以挡住伤害，但不能挡住直接伤害与自伤。',
      '2v2 中，点击敌方角色可切换目标；也可以直接命令队友集火。',
      '每回合最多打出一张技能卡。主动技不占出牌次数，但有使用上限。',
      '低血量时，治疗与护盾的期望收益高于硬拼。'
    ];
    $('#summary-tip').textContent = tips[Math.floor(Math.random() * tips.length)];
    $('#start-match').textContent = S.setup.modeId === 'story' ? '进入 ' + D.STORY.chapters[S.setup.storyChapter].title : '开桌';
    // v2.1 draft 轮抽赌局战前卡组预览 + 重抽一次
    if (S.setup.modeId === 'draft') {
      if (!S.setup.draftDeck) { S.setup.draftDeck = ENGINE.buildDraftDeck(Math.random); S.setup.draftRerolls = 1; }
      var prev = $('#draft-preview');
      if (!prev) {
        prev = document.createElement('div');
        prev.id = 'draft-preview';
        prev.className = 'draft-preview';
        var sm = $('#summary-tip');
        if (sm && sm.parentNode) sm.parentNode.insertBefore(prev, sm);
      }
      var groups = {};
      S.setup.draftDeck.a.forEach(function (c) { (groups[c.category] = groups[c.category] || []).push(c.name); });
      var html = '<h4>你的轮抽卡组（12 张）</h4><div class="draft-preview__grid">';
      Object.keys(groups).forEach(function (cat) {
        html += '<div class="draft-preview__cat"><b>' + (D.CATEGORIES[cat] ? D.CATEGORIES[cat].name : cat) + '</b><span>' + groups[cat].join('、') + '</span></div>';
      });
      html += '</div><button type="button" class="btn btn--secondary btn--sm" id="draft-reroll"' + ((S.setup.draftRerolls || 0) <= 0 ? ' disabled' : '') + '>重抽一次（' + (S.setup.draftRerolls || 0) + ' 次剩余）</button>';
      prev.innerHTML = html;
      var rr = $('#draft-reroll');
      if (rr) rr.onclick = function () {
        if ((S.setup.draftRerolls || 0) <= 0) return;
        S.setup.draftRerolls -= 1;
        S.setup.draftDeck = ENGINE.buildDraftDeck(Math.random);
        renderSummary();
      };
    } else {
      var old = $('#draft-preview');
      if (old) old.remove();
    }
  }

  function bindSetupInputs() {
    const nameInput = $('#player-name');
    nameInput.oninput = function () { S.setup.playerName = nameInput.value.slice(0, 12) || '无名执币者'; persistSetup(); };
    $('#opponent-select').onchange = function (e) { S.setup.opponent = e.target.value; persistSetup(); renderSummary(); };
    $('#ai-level-select').onchange = function (e) { S.setup.aiLevel = e.target.value; persistSetup(); renderSummary(); };
  }

  function openDeckBuilder() {
    S.deckBuilder.query = '';
    S.deckBuilder.category = 'all';
    S.deckBuilder.selected = (S.setup.customDeck || []).slice(0, 10);
    renderDeckBuilder();
  }

  function renderDeckBuilder() {
    const selected = S.deckBuilder.selected;
    const categories = Object.keys(D.CATEGORIES);
    const filtered = D.CARDS.filter(function (c) {
      const q = S.deckBuilder.query.toLowerCase();
      return (S.deckBuilder.category === 'all' || c.category === S.deckBuilder.category) &&
        (!q || (c.name + c.posText + c.negText + c.styleName + c.categoryName).toLowerCase().indexOf(q) >= 0);
    });
    const selectedCards = selected.map(function (id) { return D.byId.card(id); }).filter(Boolean);
    const html =
      '<div class="deck-builder">' +
        '<div class="modal-head"><div><div class="eyebrow">DECK BUILDER</div><h2>构筑你的十张命运</h2><p>正面与负面同时存在。别只挑好的一面。</p></div>' +
          '<div class="deck-builder__count"><strong>' + selected.length + '</strong><span>/ 10</span></div></div>' +
        '<div class="deck-builder__toolbar">' +
          '<div class="segmented deck-cat-tabs"><button data-deck-cat="all" class="' + (S.deckBuilder.category === 'all' ? 'is-active' : '') + '">全部</button>' +
            categories.map(function (k) { return '<button data-deck-cat="' + k + '" class="' + (S.deckBuilder.category === k ? 'is-active' : '') + '">' + D.CATEGORIES[k].name + '</button>'; }).join('') +
          '</div>' +
          '<input id="deck-search" class="search-inline" placeholder="搜索卡牌…" value="' + esc(S.deckBuilder.query) + '">' +
        '</div>' +
        '<div class="deck-builder__selected" id="deck-selected-tray">' +
          (selectedCards.length ? selectedCards.map(function (c, i) {
            return '<button class="deck-pick-mini" data-remove-deck="' + c.id + '" style="' + styleVars(c.style) + '" title="移除 ' + esc(c.name) + '"><i>' + (D.CATEGORIES[c.category] || {}).glyph + '</i><span>' + esc(c.name) + '</span><b>×</b></button>';
          }).join('') : '<span class="deck-tray-empty">从下方选择 10 张技能卡</span>') +
        '</div>' +
        '<div class="deck-builder__grid">' + filtered.map(function (c) {
          const on = selected.indexOf(c.id) >= 0;
          return '<button class="deck-pick ' + (on ? 'is-picked' : '') + '" data-pick-deck="' + c.id + '" style="' + styleVars(c.style) + ';--rarity:' + c.rarityColor + '">' +
            '<span class="deck-pick__art"><i>' + (D.STYLES[c.style] || {}).glyph + '</i></span>' +
            '<span class="deck-pick__body"><strong>' + esc(c.name) + '</strong><small>' + esc(c.categoryName) + ' · ' + esc(c.rarityName) + '</small>' +
            '<span class="deck-pick__pos">' + esc(c.posText) + '</span><span class="deck-pick__neg">' + esc(c.negText) + '</span></span>' +
            '<span class="deck-pick__check">✓</span></button>';
        }).join('') + '</div>' +
        '<div class="modal-actions"><button class="btn btn--quiet" data-close-modal>取消</button><button class="btn btn--primary" id="save-deck" ' + (selected.length === 10 ? '' : 'disabled') + '>保存卡组（' + selected.length + '/10）</button></div>' +
      '</div>';
    openModal(html, { dialogClass: 'modal-dialog--wide' });

    const search = $('#deck-search');
    if (search) {
      search.oninput = function () {
        S.deckBuilder.query = search.value;
        const pos = search.selectionStart;
        renderDeckBuilder();
        const next = $('#deck-search');
        if (next) { next.focus(); next.setSelectionRange(pos, pos); }
      };
    }
    $$('[data-deck-cat]').forEach(function (b) {
      b.onclick = function () { S.deckBuilder.category = b.dataset.deckCat; renderDeckBuilder(); };
    });
    $$('[data-pick-deck]').forEach(function (b) {
      b.onclick = function () {
        const id = b.dataset.pickDeck;
        const idx = S.deckBuilder.selected.indexOf(id);
        if (idx >= 0) S.deckBuilder.selected.splice(idx, 1);
        else if (S.deckBuilder.selected.length < 10) S.deckBuilder.selected.push(id);
        else toast('卡组最多 10 张。先移除一张。', 'warning');
        Audio.sfx('click');
        renderDeckBuilder();
      };
    });
    $$('[data-remove-deck]').forEach(function (b) {
      b.onclick = function () {
        const id = b.dataset.removeDeck;
        S.deckBuilder.selected = S.deckBuilder.selected.filter(function (x) { return x !== id; });
        renderDeckBuilder();
      };
    });
    const save = $('#save-deck');
    if (save) save.onclick = function () {
      if (S.deckBuilder.selected.length !== 10) return;
      S.setup.customDeck = S.deckBuilder.selected.slice();
      S.setup.deckMode = 'custom';
      persistSetup();
      closeModal();
      renderSetup();
      toast('卡组已保存：10 张命运已装订。', 'success');
    };
  }

  function randomDeckSelection() {
    const pool = D.CARDS.slice();
    const ids = [];
    for (let i = 0; i < 10; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      ids.push(pool.splice(idx, 1)[0].id);
    }
    S.setup.customDeck = ids;
    S.setup.deckMode = 'custom';
    persistSetup();
    renderDeckSummary();
    renderSummary();
    toast('已随机抽取 10 张自定义卡组。', 'success');
  }

  function startLocalMatch() {
    const mode = D.byId.mode(S.setup.modeId);
    if (S.setup.deckMode === 'custom' && S.setup.customDeck.length !== 10) {
      toast('自定义卡组需要正好 10 张。', 'error');
      openDeckBuilder();
      return;
    }
    let charIds = [S.setup.charId, S.setup.charId2];
    if (S.setup.charMode === 'random') {
      const random = D.randomCharacters(S.setup.modeId === 'brawl' ? 4 : 4);
      charIds = [random[0].id, random[1].id];
    }
    // v2.1 draft 轮抽赌局：开赛前自动轮抽组牌；战前可「重抽一次」
    if (S.setup.modeId === 'draft') {
      if (!S.setup.draftDeck || (S.setup.draftRerolls || 0) === 0 || S.setup.draftRolled) {
        // 首次或已重抽：用当前已生成的牌组；否则不重生成
      }
      if (!S.setup.draftDeck) {
        S.setup.draftDeck = ENGINE.buildDraftDeck(Math.random);
        S.setup.draftRerolls = 1;
      }
    }
    const config = {
      modeId: S.setup.modeId,
      playerName: S.setup.playerName || '无名执币者',
      charId: charIds[0],
      charId2: charIds[1],
      allyCharId: S.setup.allyCharId,
      deckMode: S.setup.deckMode,
      deckIds: S.setup.customDeck,
      draftDeckIdsA: S.setup.draftDeck ? S.setup.draftDeck.a.map(function (c) { return c.id; }) : null,
      draftDeckIdsB: S.setup.draftDeck ? S.setup.draftDeck.b.map(function (c) { return c.id; }) : null,
      theme: S.setup.theme,
      aiLevel: S.setup.aiLevel,
      opponent: S.setup.opponent,
      storyChapter: S.setup.storyChapter,
      teamA: S.setup.teamA,
      teamB: S.setup.teamB,
      hpMultiplier: S.setup.hpMultiplier || 1
    };
    S.currentConfig = config;
    const game = ENGINE.createGame(config, {
      localHumanP1: S.setup.opponent === 'local' && S.setup.modeId !== 'story' && S.setup.modeId !== 'team'
    });
    S.game = game;
    // v2.1.2 AI 人格开场问候（队友）
    try {
      var mate = game.players.find(function (p) { return p.id !== 'p0' && p.team === game.players[0].team && p.isAI; });
      if (mate) {
        ENGINE.addChat(game, mate.name, AI.personaGreeting(), 'ally', mate.id, AI.getPersonaId());
        aiVoice(AI.getPersonaId(), 'greet');
      }
    } catch (e) {}
    S.viewGame = null;
    S.online = { role: null, code: null, transport: null, guests: [], connected: false, status: '', seat: 1, matchmaking: false };
    S.viewerId = 'p0';
    S.lastEventSeq = game.eventSeq;
    S.overShown = false;
    S.aiBusy = false;
    S.selectedCardIndex = null;
    S.overlayKey = '';
    S.currentConfig = config;
    S.battleTheme = S.setup.theme;
    S.allyFocus = null;
    showScreen('battle');
    Audio.startBgm(S.setup.theme);
    FX.setTheme(S.setup.theme);
    try { Audio.narrator('open'); } catch (e) {}
    // 出场台词：玩家角色登场呼喝（延迟一拍，等音频解锁）
    try {
      var enterPlayer = game.players.find(function (p) { return p.id === 'p0'; });
      var enterChar = enterPlayer ? D.byId.character(enterPlayer.charId) : null;
      if (enterChar && enterChar.id) {
        setTimeout(function () { Audio.voice(enterChar.id, 'enter'); }, 350);
      }
    } catch (e) {}
    const firstAlly = game.players.find(function (p) { return p.team === 'A' && p.id !== 'p0' && p.isAI; });
    if (firstAlly) {
      S.allyFocus = firstAlly.id;
      ENGINE.addChat(game, firstAlly.name, '我坐你旁边。要打谁、要守谁，直接说。别用那种命令下属的口气。', 'ally', firstAlly.id);
    }
    renderBattle();
    maybeRunAI();
  }

  /* =========================================================
     图鉴
     ========================================================= */
  function renderArchive() {
    const tab = S.archive.tab;
    $$('#archive-tabs button').forEach(function (b) { b.classList.toggle('is-active', b.dataset.archiveTab === tab); });
    const styleSelect = $('#archive-style-filter');
    if (!styleSelect.options.length || styleSelect.options.length === 1) {
      styleSelect.innerHTML = '<option value="all">全部八大赛区</option>' + D.STYLE_ORDER.map(function (id) {
        return '<option value="' + id + '">' + D.STYLES[id].name + '</option>';
      }).join('');
    }
    styleSelect.value = S.archive.style;

    if (tab === 'characters') {
      $('#archive-filters').innerHTML = '<span class="filter-label">定位</span>' + ['all'].concat(Object.keys(D.ROLE_META)).map(function (r) {
        const label = r === 'all' ? '全部' : r;
        return '<button data-archive-role="' + (r === 'all' ? 'all' : r) + '" class="' + (S.archive.role === r ? 'is-active' : '') + '">' + label + '</button>';
      }).join('');
    } else {
      $('#archive-filters').innerHTML = '<span class="filter-label">类别</span>' +
        '<button data-archive-category="all" class="' + (S.archive.category === 'all' ? 'is-active' : '') + '">全部</button>' +
        Object.keys(D.CATEGORIES).map(function (k) {
          return '<button data-archive-category="' + k + '" class="' + (S.archive.category === k ? 'is-active' : '') + '">' + D.CATEGORIES[k].name + '</button>';
        }).join('');
    }

    const q = S.archive.query.trim().toLowerCase();
    let items;
    if (tab === 'characters') {
      items = D.CHARACTERS.filter(function (c) {
        const styleOk = S.archive.style === 'all' || c.style === S.archive.style;
        const roleOk = S.archive.role === 'all' || c.role === S.archive.role;
        const text = (c.name + c.title + c.role + c.styleName + c.bio + c.passive.name + c.active.name + c.temper).toLowerCase();
        return styleOk && roleOk && (!q || text.indexOf(q) >= 0);
      });
      $('#archive-count').textContent = '显示 ' + items.length + ' / ' + D.CHARACTERS.length + ' 名角色';
      $('#archive-grid').className = 'archive-grid archive-grid--characters';
      $('#archive-grid').innerHTML = items.map(function (c) {
        return '<button class="archive-char" data-open-char="' + c.id + '" type="button" style="' + styleVars(c.style) + '">' +
          portraitHTML(c, { className: 'portrait--archive' }) +
          '<span class="archive-char__body"><span class="archive-char__meta">' + esc(c.styleName) + ' · ' + esc(c.role) + '</span><strong>' + esc(c.name) + '</strong><span>' + esc(c.title) + '</span>' +
          '<small>被动 · ' + esc(c.passive.name) + '</small><small>主动 · ' + esc(c.active.name) + '</small></span></button>';
      }).join('');
    } else {
      items = D.CARDS.filter(function (c) {
        const styleOk = S.archive.style === 'all' || c.style === S.archive.style;
        const catOk = S.archive.category === 'all' || c.category === S.archive.category;
        const text = (c.name + c.categoryName + c.styleName + c.posText + c.negText + c.rarityName).toLowerCase();
        return styleOk && catOk && (!q || text.indexOf(q) >= 0);
      });
      $('#archive-count').textContent = '显示 ' + items.length + ' / ' + D.CARDS.length + ' 张技能卡';
      $('#archive-grid').className = 'archive-grid archive-grid--cards';
      $('#archive-grid').innerHTML = items.map(function (c) { return '<div class="archive-card-wrap">' + fateCardHTML(c) + '</div>'; }).join('');
      $$('#archive-grid .fate-card').forEach(function (el) {
        el.onclick = function () { openCardDetail(el.dataset.cardId); };
      });
    }
  }

  function openCharacterDetail(id) {
    const c = D.byId.character(id);
    if (!c) return;
    const style = D.STYLES[c.style];
    openModal('<div class="detail-sheet" style="' + styleVars(c.style) + '">' +
      '<div class="detail-sheet__visual">' + portraitHTML(c, { className: 'portrait--detail' }) + '</div>' +
      '<div class="detail-sheet__body">' +
        '<div class="eyebrow">' + esc(style.realm) + ' · ' + esc(c.role) + '</div>' +
        '<h2>' + esc(c.name) + '</h2><p class="detail-title">' + esc(c.title) + '</p>' +
        '<p class="detail-bio">' + esc(c.bio) + '</p>' +
        '<div class="detail-grid">' +
          '<div><span>生命</span><strong>' + c.hp + '</strong></div>' +
          '<div><span>被动</span><strong>' + esc(c.passive.name) + '</strong><small>' + esc(c.passive.desc) + '</small></div>' +
          '<div><span>主动 · ' + c.active.uses + ' 次</span><strong>' + esc(c.active.name) + '</strong><small>' + esc(c.active.desc) + '</small></div>' +
        '</div>' +
        '<blockquote class="detail-quote">“' + esc(c.quote) + '”</blockquote>' +
        '<div class="prompt-box prompt-box--collapsed">' +
          '<button type="button" class="text-btn prompt-box__toggle">高级：复制生图提示词</button>' +
          '<div class="prompt-box__body" style="display:none"><p>' + esc(c.artPrompt) + '</p><button class="text-btn" data-copy-prompt="' + esc(c.artPrompt) + '">复制提示词</button></div>' +
        '</div>' +
      '</div></div>', { dialogClass: 'modal-dialog--wide' });
    const copyBtn = $('[data-copy-prompt]');
    if (copyBtn) copyBtn.onclick = function () { copyText(copyBtn.dataset.copyPrompt); };
    const toggleBtn = document.querySelector('.prompt-box--collapsed .prompt-box__toggle');
    if (toggleBtn) toggleBtn.onclick = function () {
      const body = toggleBtn.parentElement.querySelector('.prompt-box__body');
      if (body) body.style.display = (body.style.display === 'none') ? '' : 'none';
    };
  }

  function openCardDetail(id) {
    const c = D.byId.card(id);
    if (!c) return;
    openModal('<div class="detail-sheet detail-sheet--card" style="' + styleVars(c.style) + '">' +
      '<div class="detail-sheet__visual">' + fateCardHTML(c, { className: 'fate-card--detail' }) + '</div>' +
      '<div class="detail-sheet__body">' +
        '<div class="eyebrow">' + esc(c.categoryName) + ' · ' + esc(c.styleName) + ' · ' + esc(c.rarityName) + '</div>' +
        '<h2>' + esc(c.name) + '</h2>' +
        '<div class="effect-block effect-block--pos"><span>正面 · 判定成功</span><p>' + esc(c.posText) + '</p></div>' +
        '<div class="effect-block effect-block--neg"><span>反面 · 判定失败</span><p>' + esc(c.negText) + '</p></div>' +
        '<p class="detail-bio">' + esc(c.flavor) + '</p>' +
        '<div class="prompt-box prompt-box--collapsed">' +
          '<button type="button" class="text-btn prompt-box__toggle">高级：复制生图提示词</button>' +
          '<div class="prompt-box__body" style="display:none"><p>' + esc(c.artPrompt) + '</p><button class="text-btn" data-copy-prompt="' + esc(c.artPrompt) + '">复制提示词</button></div>' +
        '</div>' +
      '</div></div>', { dialogClass: 'modal-dialog--wide' });
    const copyBtn = $('[data-copy-prompt]');
    if (copyBtn) copyBtn.onclick = function () { copyText(copyBtn.dataset.copyPrompt); };
    const toggleBtn = document.querySelector('.prompt-box--collapsed .prompt-box__toggle');
    if (toggleBtn) toggleBtn.onclick = function () {
      const body = toggleBtn.parentElement.querySelector('.prompt-box__body');
      if (body) body.style.display = (body.style.display === 'none') ? '' : 'none';
    };
  }

  /* =========================================================
     知识库 Codex
     ========================================================= */
  function renderCodex() {
    const content = $('#codex-content');
    if (!content) return;

    // 绑定tab切换
    $$('#codex-nav [data-codex-tab]').forEach(function (btn) {
      btn.onclick = function () {
        $$('#codex-nav [data-codex-tab]').forEach(function (b) { b.classList.toggle('active', b === btn); });
        renderCodexTab(btn.dataset.codexTab, content);
      };
    });

    // 默认渲染第一个tab
    const firstTab = $('#codex-nav [data-codex-tab]');
    if (firstTab) renderCodexTab(firstTab.dataset.codexTab, content);
  }

  function renderCodexTab(tab, content) {
    const CX = (root.CF_CODEX) || null;
    const A = root.CF_ASSETS || null;
    const port = function (id) { return A ? A.portraitUrl(id) : 'assets/art/portraits/' + id + '.webp'; };
    const cardImg = function (id) { return A ? A.cardUrl(id) : 'assets/art/cards/' + id + '.jpg'; };
    const bgImg = function (id) { return A ? A.bgUrl(id) : 'assets/art/bg/' + id + '.jpg'; };

    if (tab === 'world') {
      const W = CX ? CX.world : D.WORLD;
      let html = '<div class="codex-section"><h2>' + esc(W.title || '世界观总纲') + '</h2>' +
        '<p>' + esc(W.lead || W.premise || '') + '</p><p>' + esc(W.premise || '') + '</p>';
      if (W.laws) {
        html += '<h3>核心法则</h3><ul>' + W.laws.map(function (law) {
          return '<li><strong>' + esc(law.title) + '</strong>：' + esc(law.text) + '</li>';
        }).join('') + '</ul>';
      }
      if (W.factions) {
        html += '<h3>势力</h3><div class="codex-grid">' + W.factions.map(function (f) {
          return '<div class="codex-card"><h4>' + esc(f.mark) + ' ' + esc(f.name) + '</h4><p>' + esc(f.text) + '</p></div>';
        }).join('') + '</div>';
      }
      if (W.timeline) {
        html += '<h3>年表</h3><ul>' + W.timeline.map(function (t) {
          return '<li><strong>' + esc(t.era) + '</strong>：' + esc(t.text) + '</li>';
        }).join('') + '</ul>';
      }
      if (W.glossary) {
        html += '<h3>术语表</h3><div class="codex-grid">' + W.glossary.map(function (g) {
          return '<div class="codex-card"><h4>' + esc(g.term) + '</h4><p>' + esc(g.text) + '</p></div>';
        }).join('') + '</div>';
      }
      if (W.endings) {
        html += '<h3>结局</h3><div class="codex-grid">' + W.endings.map(function (e) {
          return '<div class="codex-card"><h4>' + esc(e.name) + '</h4><p>' + esc(e.text) + '</p></div>';
        }).join('') + '</div>';
      }
      content.innerHTML = html + '</div>';
    } else if (tab === 'realms') {
      let html = '<div class="codex-section"><h2>八大赛区设定</h2>';
      if (CX && CX.realms) {
        html += '<div class="codex-realm-grid">';
        Object.keys(CX.realms).forEach(function (id) {
          const r = CX.realms[id];
          const title = r.name || (D.STYLES[id] && D.STYLES[id].name) || id;
          const overview = r.overview || r.lore || r.desc || '';
          const firstSentence = (String(overview).match(/[^。！？\n]+[。！？\n]?/) || [''])[0];
          const tagline = r.tagline || firstSentence;
          const body = String(overview).split(/\n+/).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');
          html += '<div class="codex-realm-card">' +
            '<div class="codex-realm-card__head" style="background-image:url(\'' + bgImg(id) + '\')"></div>' +
            '<div class="codex-realm-card__body"><h4>' + esc(title) + '</h4>' +
            '<p style="font-size:12px">' + esc(tagline) + '</p>' +
            '<div style="font-size:12px;opacity:.8;margin-top:4px;line-height:1.7">' + body + '</div>' +
            '</div></div>';
        });
        html += '</div>';
      } else {
        html += '<div class="codex-grid">' + D.STYLE_ORDER.map(function (id) {
          const s = D.STYLES[id];
          return '<div class="codex-card"><h4>' + s.glyph + ' ' + esc(s.name) + ' · ' + esc(s.realm) + '</h4><p>' + esc(s.tagline) + '</p></div>';
        }).join('') + '</div>';
      }
      content.innerHTML = html + '</div>';
    } else if (tab === 'heroes') {
      let html = '<div class="codex-section"><h2>英雄背景</h2><p>点击英雄展开完整传记。</p>';
      if (CX && CX.heroes) {
        html += D.CHARACTERS.map(function (c) {
          const h = CX.heroes[c.id];
          if (!h) return '';
          return '<div class="codex-char-row">' +
            '<img src="' + port(c.id) + '" alt="' + esc(c.name) + '" loading="lazy" onerror="this.style.opacity=.2">' +
            '<div><h4>' + esc(c.name) + ' <small style="opacity:.6">' + esc(c.role || '') + '</small></h4>' +
            '<p style="font-size:12px">' + esc(h.bio || c.bio || '') + '</p>' +
            '<details class="codex-char-detail"><summary>展开完整传记</summary>' +
              (h.story ? '<p><strong>生平：</strong>' + esc(h.story) + '</p>' : '') +
              (h.nameOrigin ? '<p><strong>名号由来：</strong>' + esc(h.nameOrigin) + '</p>' : '') +
              (h.skillOrigin ? '<p><strong>技能由来：</strong>' + esc(h.skillOrigin) + '</p>' : '') +
              (h.relations ? '<p><strong>关系：</strong></p><ul>' + h.relations.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') +
              (h.quote ? '<p><em>「' + esc(h.quote) + '」</em></p>' : '') +
            '</details></div></div>';
        }).join('');
      } else {
        html += '<div class="codex-grid">' + D.CHARACTERS.map(function (c) {
          const s = D.STYLES[c.style] || D.STYLES.abyss;
          return '<div class="codex-card" style="border-left:3px solid ' + s.color + '"><h4>' + esc(c.name) + '</h4><p>' + esc(c.bio || '') + '</p></div>';
        }).join('') + '</div>';
      }
      content.innerHTML = html + '</div>';
    } else if (tab === 'cards') {
      let html = '<div class="codex-section"><h2>卡牌来历</h2>';
      if (CX && CX.cards) {
        html += '<div class="codex-grid">' + D.CARDS.map(function (c) {
          const o = CX.cards[c.id];
          return '<div class="codex-card" style="display:flex;gap:8px">' +
            '<img src="' + cardImg(c.id) + '" alt="" style="width:44px;height:60px;object-fit:cover;border-radius:4px" loading="lazy" onerror="this.style.opacity=.2">' +
            '<div><h4>' + esc(c.name) + '</h4>' +
            '<p style="font-size:11px;opacity:.7">' + esc(c.cat || '') + ' · ' + esc(c.desc || c.effect || '') + '</p>' +
            (o ? '<details class="codex-char-detail"><summary>来历</summary><p>' + esc(o.origin) + '</p>' + (o.echo ? '<p style="opacity:.7">' + esc(o.echo) + '</p>' : '') + '</details>' : '') +
            '</div></div>';
        }).join('') + '</div>';
      } else {
        html += '<div class="codex-grid">' + D.CARDS.slice(0, 30).map(function (c) {
          return '<div class="codex-card"><h4>' + esc(c.name) + '</h4><p>' + esc(c.desc || c.effect || '') + '</p>';
        }).join('') + '</div>';
      }
      content.innerHTML = html + '</div>';
    } else if (tab === 'rules') {
      const R = CX ? CX.rules : null;
      let html = '<div class="codex-section"><h2>玩法规则</h2>';
      if (R) {
        html += '<p>' + esc(R.intro || '') + '</p>';
        html += '<h3>胜利条件</h3><p>' + esc(R.win || '') + '</p>';
        if (R.turnFlow) { html += '<h3>回合流程</h3><ul>' + R.turnFlow.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'; }
        if (R.coinRules) { html += '<h3>硬币机制</h3><ul>' + R.coinRules.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'; }
        if (R.skins) { html += '<h3>硬币皮肤特性</h3><div class="codex-grid">' + R.skins.map(function (s) { return '<div class="codex-card"><h4>' + esc(s.name) + '</h4><p>' + esc(s.trait) + '</p></div>'; }).join('') + '</div>'; }
        if (R.statusEffects) { html += '<h3>状态效果表</h3><div class="codex-grid">' + R.statusEffects.map(function (s) { return '<div class="codex-card"><h4>' + esc(s.name) + '</h4><p>' + esc(s.desc) + '</p></div>'; }).join('') + '</div>'; }
        if (R.modes) { html += '<h3>模式一览</h3><ul class="codex-modes">' + R.modes.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ul>'; }
      } else {
        html += '<h3>胜利条件</h3><ul><li>将对方所有角色生命打到 0 即获胜。</li></ul>' +
          '<h3>回合流程</h3><ul><li>抽牌阶段补牌至 3 张。</li><li>行动阶段每回合打一张牌。</li><li>抛币判定正/反。</li><li>重抛整局一次。</li></ul>';
      }
      content.innerHTML = html + '</div>';
    }
  }

  /* =========================================================
     世界观
     ========================================================= */
  function renderWorld() {
    const W = D.WORLD;
    $('#world-lead').textContent = W.lead;
    $('#world-quote').innerHTML = '“' + esc(W.premise) + '”';
    const sections = [
      { id: 'world-cosmology', label: '总纲', title: '赛场是什么' },
      { id: 'world-realms', label: '八大赛区', title: '八个正在失去结局的世界' },
      { id: 'world-factions', label: '势力', title: '牌桌旁的七双手' },
      { id: 'world-timeline', label: '年表', title: '从初掷到决赛' },
      { id: 'world-law', label: '法则', title: '赛场的七条铁律' },
      { id: 'world-companion', label: '队友', title: '会反驳你的 AI 队友' },
      { id: 'world-glossary', label: '术语', title: '赌桌上的黑话' },
      { id: 'world-endings', label: '结局', title: '硬币可能落向的三面' }
    ];
    $('#world-nav').innerHTML = sections.map(function (s) {
      return '<button data-world-jump="' + s.id + '">' + esc(s.label) + '<small>' + esc(s.title) + '</small></button>';
    }).join('');
    $$('#world-nav button').forEach(function (b) {
      b.onclick = function () {
        const el = document.getElementById(b.dataset.worldJump);
        if (el) el.scrollIntoView({ behavior: SETTINGS.reducedMotion ? 'auto' : 'smooth', block: 'start' });
      };
    });

    const html = [];
    html.push('<section class="world-section" id="world-cosmology"><div class="world-section__head"><span>01</span><div><div class="eyebrow">COSMOLOGY</div><h2>赛场是什么</h2></div></div>' +
      '<p class="world-para world-para--lead">' + esc(W.premise) + '</p>' +
      '<div class="world-callout"><span>“</span><p>八个世界不是被毁灭，而是被要求提前交稿。冠军要的从来不是死亡，是一个不会再产生分支的结局。</p></div></section>');

    html.push('<section class="world-section" id="world-realms"><div class="world-section__head"><span>02</span><div><div class="eyebrow">THE EIGHT REALMS</div><h2>八大赛区</h2></div></div><div class="world-realms">' +
      D.STYLE_ORDER.map(function (id, i) {
        const s = D.STYLES[id];
        return '<article class="world-realm" style="' + styleVars(id) + '">' +
          '<div class="world-realm__top"><span class="world-realm__glyph">' + s.glyph + '</span><span class="world-realm__index">0' + (i + 1) + '</span></div>' +
          '<span class="eyebrow">' + esc(s.name) + ' · ' + esc(s.en) + '</span>' +
          '<h3>' + esc(s.realm) + '</h3><p>' + esc(s.lore) + '</p>' +
          '<div class="world-realm__crisis"><span>当前危机</span><p>' + esc(s.crisis) + '</p></div>' +
          '<div class="world-realm__art">ART · ' + esc(s.art) + '</div>' +
          '</article>';
      }).join('') + '</div></section>');

    html.push('<section class="world-section" id="world-factions"><div class="world-section__head"><span>03</span><div><div class="eyebrow">FACTIONS</div><h2>势力</h2></div></div><div class="faction-grid">' +
      W.factions.map(function (f) {
        return '<article class="faction-card faction-card--' + f.tone + '"><span class="faction-mark">' + esc(f.mark) + '</span><div><h3>' + esc(f.name) + '</h3><p>' + esc(f.text) + '</p></div></article>';
      }).join('') + '</div></section>');

    html.push('<section class="world-section" id="world-timeline"><div class="world-section__head"><span>04</span><div><div class="eyebrow">TIMELINE</div><h2>年表</h2></div></div><div class="timeline">' +
      W.timeline.map(function (t, i) {
        return '<div class="timeline__item"><span class="timeline__dot"></span><span class="timeline__era">' + esc(t.era) + '</span><p>' + esc(t.text) + '</p></div>';
      }).join('') + '</div></section>');

    html.push('<section class="world-section" id="world-law"><div class="world-section__head"><span>05</span><div><div class="eyebrow">THE LAWS</div><h2>七条铁律</h2></div></div><div class="law-grid">' +
      W.laws.map(function (l, i) {
        return '<article class="law-card"><span>' + String(i + 1).padStart(2, '0') + '</span><h3>' + esc(l.title) + '</h3><p>' + esc(l.text) + '</p></article>';
      }).join('') + '</div></section>');

    html.push('<section class="world-section" id="world-companion"><div class="world-section__head"><span>06</span><div><div class="eyebrow">THE CO-SIGNERS</div><h2>队友协议</h2></div></div>' +
      '<div class="companion-lore"><div class="companion-lore__copy"><h3>' + esc(W.companionCodex.subtitle) + '</h3><p>' + esc(W.companionCodex.text) + '</p>' +
      '<div class="protocol-list">' + W.companionCodex.rules.map(function (r, i) { return '<div><span>' + String(i + 1).padStart(2, '0') + '</span><p>' + esc(r) + '</p></div>'; }).join('') + '</div></div>' +
      '<div class="companion-lore__example"><span class="eyebrow">LIVE EXAMPLE</span>' +
      '<div class="demo-chat demo-chat--player"><b>你</b><p>给我治疗。</p></div>' +
      '<div class="demo-chat demo-chat--ally"><b>齿轮医师·薇拉</b><p>你满血，我满血。奶空气吗？我的牌不是矿泉水。</p></div>' +
      '<div class="demo-chat demo-chat--player"><b>你</b><p>先保命，上盾，等他们过来。</p></div>' +
      '<div class="demo-chat demo-chat--ally"><b>齿轮医师·薇拉</b><p>行，这回合我守。别把我卖了。</p></div>' +
      '<small>队友会读取真实战场状态，不是关键词自动回复。</small></div></div></section>');

    html.push('<section class="world-section" id="world-glossary"><div class="world-section__head"><span>07</span><div><div class="eyebrow">GLOSSARY</div><h2>术语</h2></div></div><div class="glossary">' +
      W.glossary.map(function (g) { return '<div><strong>' + esc(g.term) + '</strong><p>' + esc(g.text) + '</p></div>'; }).join('') + '</div></section>');

    html.push('<section class="world-section" id="world-endings"><div class="world-section__head"><span>08</span><div><div class="eyebrow">THE THREE SIDES</div><h2>结局</h2></div></div><div class="ending-grid">' +
      W.endings.map(function (e, i) {
        return '<article class="ending-card"><span>' + (i === 2 ? '?' : (i === 0 ? '正' : '反')) + '</span><h3>' + esc(e.name) + '</h3><p>' + esc(e.text) + '</p></article>';
      }).join('') + '</div></section>');

    $('#world-content').innerHTML = html.join('');
  }

  /* =========================================================
     联机大厅
     ========================================================= */
  function initNetwork() {
    NET.on('status', function (payload) {
      S.online.status = payload.message || payload.status;
      if (payload.role) S.online.role = payload.role;
      if (payload.transport) S.online.transport = payload.transport;
      if (payload.code) S.online.code = payload.code;
      if (payload.matchmaking != null) S.online.matchmaking = !!payload.matchmaking;
      if (Array.isArray(payload.guests)) S.online.guests = payload.guests.slice();
      if (payload.status === 'connected') S.online.connected = true;
      if (payload.status === 'waiting') S.online.connected = S.online.guests.length > 0;
      if (payload.status === 'error') {
        S.online.connected = false;
        toast(payload.message, 'error');
      }
      if (S.screen === 'lobby' || S.screen === 'battle') renderLobby();
    });
    NET.on('join', function (payload) {
      if (!payload) return;
      const guests = (S.online.guests || []).filter(function (g) { return g.seat !== payload.seat; });
      guests.push({ name: payload.name, seat: payload.seat });
      S.online.guests = guests;
      S.online.connected = true;
      if (S.screen === 'lobby') renderLobby();
      const seats = Math.max(2, Math.min(8, Number(S.online.seats) || onlineRoomSeats()));
      const humans = guests.length + 1;
      if (S.online.matchmaking && S.online.role === 'host' && S.screen === 'lobby') {
        S.online.status = humans >= seats
          ? ('已集齐 ' + humans + '/' + seats + ' 人，马上开桌…')
          : (payload.name + ' 已入席（' + humans + '/' + seats + ' 人），等待其他玩家…');
        renderLobby();
        if (S.online.matchTimer) { clearTimeout(S.online.matchTimer); S.online.matchTimer = null; }
        if (humans >= seats) {
          S.online.matchTimer = setTimeout(function () {
            S.online.matchTimer = null;
            if (S.online.matchmaking && S.online.role === 'host' && S.screen === 'lobby') startMatchmakingBattle();
          }, 400);
        } else {
          // 收集窗口：每次有人入席重置 3.8s，超时用当前人数开桌（2–8 人都能开）。
          S.online.matchTimer = setTimeout(function () {
            S.online.matchTimer = null;
            if (S.online.matchmaking && S.online.role === 'host' && S.screen === 'lobby' && (S.online.guests || []).length) startMatchmakingBattle();
          }, 3800);
        }
      }
    });
    NET.on('leave', function (payload) {
      if (payload && payload.seat) {
        S.online.guests = (S.online.guests || []).filter(function (g) { return g.seat !== payload.seat; });
      }
      S.online.connected = (S.online.guests || []).length > 0;
      if (S.screen === 'lobby') {
        renderLobby();
        toast(payload && payload.reason ? payload.reason : '玩家离开了房间', 'warning');
      }
      if (S.screen === 'battle' && S.online.role === 'host' && S.game && S.game.phase !== 'over' && payload && payload.seat) {
        const pid = 'p' + payload.seat;
        const player = S.game.players.find(function (p) { return p.id === pid; });
        if (player) {
          player.isHuman = false;
          player.isAI = true;
          AI.initPlayer(player);
          ENGINE.addLog(S.game, player.name + ' 掉线，由队友接管。', 'system');
          toast(player.name + ' 掉线，AI 接管该席位。', 'warning');
          afterHostMutation();
        }
      }
    });
    NET.on('welcome', function (payload) {
      if (S.online.role !== 'guest') return;
      S.online.connected = true;
      S.online.code = payload.code || S.online.code;
      S.online.guestSeat = payload.seat || 1;
      S.online.matchmaking = !!payload.matchmaking;
      if (payload.mode) S.online.mode = payload.mode;
      if (payload.sizes) S.online.sizes = { a: Number(payload.sizes.a) || 1, b: Number(payload.sizes.b) || 1 };
      if (payload.maxGuests != null) S.online.seats = Number(payload.maxGuests) + 1;
      S.lobby.roomVisible = true;
      S.online.hostName = payload.hostName;
      if (S.screen === 'lobby') renderLobby();
      toast(payload.matchmaking ? '匹配成功，等待房主开桌…' : '已入席，等待房主开桌。', 'success');
    });
    NET.on('error', function (payload) {
      toast(payload.message || '联机错误', 'error');
    });
    // 匹配探测：发现更早占桌的房主后，本机从「匹配房主」降级为「匹配访客」。
    NET.on('matchdemoted', function (result) {
      if (!result || S.online.role !== 'host') return;
      S.online.role = 'guest';
      S.online.code = result.code || '匹配成功';
      S.online.guestSeat = result.seat || 1;
      S.online.connected = true;
      S.online.matchmaking = true;
      if (result.seats) S.online.seats = result.seats;
      if (result.sizes) S.online.sizes = result.sizes;
      if (result.mode) S.online.mode = result.mode;
      S.online.status = '匹配成功，正在开桌…';
      S.lobby.roomVisible = true;
      if (S.screen === 'lobby') renderLobby();
    });
    NET.on('message', handleNetMessage);
  }

  const ONLINE_SEATS_DEFAULT = 4;

  function onlineRoomSeats() {
    const raw = Number((($('#host-seats') || {}).value));
    if (!isFinite(raw)) return ONLINE_SEATS_DEFAULT;
    return Math.max(2, Math.min(8, Math.round(raw)));
  }

  function onlineSeatsBalanced(seats) {
    const total = Math.max(2, Math.min(8, Math.round(Number(seats) || ONLINE_SEATS_DEFAULT)));
    return { a: Math.ceil(total / 2), b: Math.floor(total / 2) };
  }

  // 引擎只有「自由组队」支持 1–4 v 1–4；其余模式固定 1v1。
  function onlineEffectiveMode(modeId, sizes) {
    if (modeId === 'team') return 'team';
    const total = sizes ? (sizes.a + sizes.b) : 2;
    return total > 2 ? 'team' : modeId;
  }

  function onlineModeSizes(modeId, seats) {
    const target = seats == null
      ? ((S.online && S.online.seats) || onlineRoomSeats())
      : Math.max(2, Math.min(8, Number(seats) || ONLINE_SEATS_DEFAULT));
    if (modeId !== 'team') {
      return target > 2 ? onlineSeatsBalanced(target) : { a: 1, b: 1 };
    }
    const a = Math.max(1, Math.min(4, Number((($('#host-team-a') || {}).value)) || 2));
    const b = Math.max(1, Math.min(4, Number((($('#host-team-b') || {}).value)) || 2));
    return { a: a, b: b };
  }

  function onlineSeatSpecs(a, b) {
    const out = [];
    let ai = 0, bi = 0, index = 0;
    while (ai < a || bi < b) {
      if (ai < a) { out.push({ seat: index++, team: 'A', teamIndex: ai + 1 }); ai += 1; }
      if (bi < b) { out.push({ seat: index++, team: 'B', teamIndex: bi + 1 }); bi += 1; }
    }
    return out;
  }

  function renderLobby() {
    const transport = S.lobby.transport || 'peer';
    $$('#lobby-tabs button').forEach(function (b) { b.classList.toggle('is-active', b.dataset.transport === transport); });
    const hostModeSelect = $('#host-mode');
    if (hostModeSelect) {
      const previous = hostModeSelect.value || 'standard';
      const onlineModes = D.MODES.filter(function (m) { return m.scene === 'setup' && m.id !== 'story'; });
      hostModeSelect.innerHTML = onlineModes.map(function (m) { return '<option value="' + m.id + '">' + esc(m.name) + '</option>'; }).join('');
      hostModeSelect.value = onlineModes.some(function (m) { return m.id === previous; }) ? previous : 'standard';
      const teamFields = $('#host-team-fields');
      if (teamFields) teamFields.hidden = hostModeSelect.value !== 'team';
      if (S.online.role === 'guest' && S.online.mode && onlineModes.some(function (m) { return m.id === S.online.mode; })) {
        hostModeSelect.value = S.online.mode;
        if (teamFields) teamFields.hidden = S.online.mode !== 'team';
      }
    }
    $('#transport-hint').textContent = transport === 'peer'
      ? '无需任何配置，公网直连，WebRTC 点对点。房间号+密码即暗号；支持 2–8 名真人同桌。'
      : (NET.config.supabase.url ? 'Supabase Realtime 已配置（高级自定义，单访客）。' : 'Supabase 为高级自定义项；默认请使用上方「公网联机（零配置）」。');
    const room = S.online;
    const panel = $('#room-panel');
    const visible = !!(room.role && (S.lobby.roomVisible || room.connected || room.matchmaking));
    panel.hidden = !visible;
    if (!visible) return;

    const modeId = room.role === 'guest'
      ? (room.mode || 'standard')
      : ((($('#host-mode') || {}).value) || 'standard');
    const sizes = room.role === 'guest' && room.sizes
      ? { a: Number(room.sizes.a) || 1, b: Number(room.sizes.b) || 1 }
      : onlineModeSizes(modeId);
    const seats = Math.max(2, Math.min(8, sizes.a + sizes.b));
    const labelMode = onlineEffectiveMode(modeId, sizes);
    const specs = onlineSeatSpecs(sizes.a, sizes.b);
    const slots = [];
    slots.push({
      role: labelMode === 'team' ? 'A1 · 房主' : '房主',
      name: room.role === 'host' ? (room.name || (($('#host-name') || {}).value) || '房主') : (room.hostName || '房主'),
      connected: true
    });
    if (room.role === 'host') {
      specs.slice(1).forEach(function (spec) {
        const guest = (room.guests || []).find(function (g) { return g.seat === spec.seat; });
        const role = labelMode === 'team' ? ('真人 / AI · ' + spec.team + spec.teamIndex) : (spec.seat === 1 ? '访客' : '补位');
        slots.push({ role: role, name: guest ? guest.name : '等待玩家…', connected: !!guest });
      });
    } else {
      const selfSeat = room.guestSeat || 1;
      specs.slice(1).forEach(function (spec) {
        slots.push({
          role: (spec.seat === selfSeat ? '你的席位 · ' : '座位 · ') + (labelMode === 'team' ? spec.team + spec.teamIndex : '对局'),
          name: spec.seat === selfSeat ? (room.name || '你') : '玩家',
          connected: spec.seat === selfSeat
        });
      });
    }
    $('#room-code').textContent = room.code || 'CF-0000';
    $('#room-status').innerHTML = '<span class="status-dot status-dot--' + (room.connected ? 'on' : 'wait') + '"></span>' + esc(room.status || (room.connected ? '已连接' : '等待中…'));
    $('#room-slots').innerHTML = slots.map(function (s, i) {
      return '<div class="room-slot ' + (s.connected ? 'is-on' : 'is-off') + '"><span class="room-slot__seat">' + String(i + 1).padStart(2, '0') + '</span><div><small>' + esc(s.role) + '</small><strong>' + esc(s.name) + '</strong></div><i>' + (s.connected ? '已入席' : '空位') + '</i></div>';
    }).join('');

    const startBtn = $('#start-online');
    if (room.role === 'host') {
      const fillAI = $('#host-fill-ai') && $('#host-fill-ai').checked;
      const humans = (room.guests || []).length + 1;
      startBtn.hidden = false;
      startBtn.disabled = !((room.guests || []).length || fillAI);
      startBtn.textContent = (room.guests || []).length
        ? ('开桌（' + humans + '/' + seats + ' 人）')
        : (fillAI ? ('与 AI 开桌（' + seats + ' 人桌）') : '等待玩家');
    } else {
      startBtn.hidden = true;
    }
    $('#leave-room').textContent = room.role === 'guest' ? '离开房间' : '关闭房间';
    const matchBtn = $('#quick-match');
    if (matchBtn) {
      matchBtn.disabled = !!room.role && !room.matchmaking;
      matchBtn.textContent = room.matchmaking
        ? (room.role === 'host' ? '匹配中…（点击取消）' : '匹配中…')
        : '一键快速匹配';
    }
    updateRoomLink();
  }

  async function createRoom() {
    Audio.unlock();
    const transport = S.lobby.transport;
    if (transport === 'supabase' && (!NET.config.supabase.url || !NET.config.supabase.anonKey)) {
      toast('公网联机需要先配置 Supabase 项目地址与 anon key。', 'warning');
      openSettings('network');
      return;
    }
    const name = (($('#host-name') || {}).value || '无名执币者').trim().slice(0, 12);
    const password = ($('#host-password') || {}).value || '';
    const mode = ($('#host-mode') || {}).value || 'standard';
    const seats = onlineRoomSeats();
    const sizes = onlineModeSizes(mode === 'team' || seats > 2 ? 'team' : mode, seats);
    S.online = {
      role: 'host', code: null, transport: transport, guests: [], connected: false,
      status: '正在创建房间…', seat: 0, name: name, hostName: name, matchmaking: false,
      seats: seats, mode: mode, sizes: sizes
    };
    S.lobby.roomVisible = true;
    renderLobby();
    try {
      const result = await NET.host({
        transport: transport, code: NET.generateCode(), password: password,
        name: name, mode: mode, maxGuests: Math.max(1, Math.min(7, seats - 1)),
        sizes: sizes
      });
      S.online.code = result.code;
      S.online.status = '房间已开启，等待执币者入席…';
      S.lobby.hosting = true;
      S.lobby.roomVisible = true;
      renderLobby();
      toast('房间已创建：' + result.code, 'success');
    } catch (err) {
      S.lobby.roomVisible = false;
      S.online.role = null;
      renderLobby();
      toast(err.message || '创建房间失败', 'error');
    }
  }

  function roomLink(code) {
    try { return location.origin + location.pathname + '?room=' + encodeURIComponent(code || ''); } catch (e) { return ''; }
  }

  async function oneClickRoom() {
    if (S.online.role) { leaveRoom(); }
    // 一键开房默认开一张 4 人自由组队桌（2v2），2–8 名真人可同桌。
    if ($('#host-seats')) $('#host-seats').value = '4';
    if ($('#host-mode')) $('#host-mode').value = 'team';
    renderLobby();
    await createRoom();
    if (S.online.code) {
      const link = roomLink(S.online.code);
      copyText('【星杯赛场】房间号 ' + S.online.code + ' ｜ 联机链接：' + link);
      toast('一键开房成功（4 人桌），邀请链接已复制：' + S.online.code, 'success');
    }
  }

  function updateRoomLink() {
    const el = $('#room-link');
    if (!el) return;
    if (S.online.code && /^CF-/.test(S.online.code)) {
      el.hidden = false;
      el.textContent = roomLink(S.online.code);
    } else {
      el.hidden = true;
    }
  }

  async function joinRoom() {
    Audio.unlock();
    const transport = S.lobby.transport;
    if (transport === 'supabase' && (!NET.config.supabase.url || !NET.config.supabase.anonKey)) {
      toast('公网联机需要先配置 Supabase。', 'warning');
      openSettings('network');
      return;
    }
    const name = (($('#join-name') || {}).value || '过路赌客').trim().slice(0, 12);
    const code = NET.normalizeCode(($('#join-code') || {}).value);
    const password = ($('#join-password') || {}).value || '';
    if (!/^CF-[A-Z0-9]{4}$/.test(code)) { toast('房间号格式应为 CF-XXXX。', 'error'); return; }
    S.online = {
      role: 'guest', code: code, transport: transport, guests: [], connected: false,
      status: '正在递交暗号…', seat: 1, name: name, matchmaking: false,
      seats: onlineRoomSeats()
    };
    S.lobby.roomVisible = true;
    renderLobby();
    try {
      await NET.join({ transport: transport, code: code, password: password, name: name });
    } catch (err) {
      S.lobby.roomVisible = false;
      S.online.role = null;
      renderLobby();
      toast(err.message || '加入房间失败', 'error');
    }
  }

  async function quickMatch() {
    Audio.unlock();
    if (S.online.matchmaking) { leaveRoom(); return; }
    if (S.online.role) { leaveRoom(); }
    const name = (($('#join-name') || {}).value || ($('#host-name') || {}).value || '匹配玩家').trim().slice(0, 12) || '匹配玩家';
    const seats = onlineRoomSeats();
    const matchSizes = onlineSeatsBalanced(seats);
    S.online = {
      role: null, code: null, transport: 'peer', guests: [], connected: false,
      status: '正在匹配…', seat: 1, name: name, matchmaking: true,
      seats: seats, mode: 'team', sizes: matchSizes
    };
    S.lobby.roomVisible = true;
    renderLobby();
    toast(seats > 2 ? ('正在公网匹配 ' + seats + ' 人同桌的玩家…') : '正在公网匹配对手…', 'info');
    try {
      const result = await NET.match({ name: name, password: '', seats: seats, mode: 'team' });
      S.online.role = result.role;
      S.online.code = result.code || '匹配成功';
      S.online.matchmaking = true;
      S.online.seats = result.seats || seats;
      S.online.mode = result.mode || 'team';
      S.online.sizes = result.sizes || matchSizes;
      if (result.role === 'host') {
        S.online.name = name;
        S.online.status = '匹配中：已占好牌桌，等待同席玩家…';
        renderLobby();
      } else {
        S.online.guestSeat = result.seat || 1;
        S.online.status = '匹配成功，正在开桌…';
        renderLobby();
      }
    } catch (err) {
      S.online = { role: null, code: null, transport: null, guests: [], connected: false, status: '', seat: 1, matchmaking: false };
      S.lobby.roomVisible = false;
      renderLobby();
      toast(err.message || '匹配失败', 'error');
    }
  }

  function leaveRoom() {
    NET.leave();
    if (S.online.matchTimer) { clearTimeout(S.online.matchTimer); S.online.matchTimer = null; }
    const role = S.online.role;
    S.online = { role: null, code: null, transport: null, guests: [], connected: false, status: '', seat: 1, matchmaking: false };
    S.lobby.roomVisible = false;
    renderLobby();
    updateRoomLink();
    if (role === 'guest') toast('已离开房间。', 'info');
  }

  function randomOnlineConfig(modeId, seats) {
    const seatTarget = seats == null ? ((S.online && S.online.seats) || onlineRoomSeats()) : seats;
    const sizes = onlineModeSizes(modeId, seatTarget);
    const effectiveMode = onlineEffectiveMode(modeId, sizes);
    const randomChars = D.randomCharacters(8);
    return {
      modeId: modeId,
      playerName: (($('#host-name') || {}).value || '房主').trim().slice(0, 12),
      charId: randomChars[0].id,
      charId2: randomChars[1].id,
      allyCharId: randomChars[2].id,
      deckMode: 'random',
      theme: randomChars[0].style,
      aiLevel: 'normal',
      opponent: 'ai',
      teamA: sizes.a,
      teamB: sizes.b
    };
  }

  function startOnlineHost() {
    if (S.online.role !== 'host') return;
    const guests = (S.online.guests || []).slice();
    const fillAI = $('#host-fill-ai') && $('#host-fill-ai').checked;
    if (!guests.length && !fillAI) { toast('还没有玩家入席。勾选 AI 补位或等待访客。', 'warning'); return; }
    const modeId = (($('#host-mode') || {}).value) || 'standard';
    const seats = Math.max(2, Math.min(8, (S.online.seats || onlineRoomSeats())));
    const sizes = onlineModeSizes(modeId === 'team' || seats > 2 ? 'team' : modeId, seats);
    const config = randomOnlineConfig(modeId, seats);
    const guestList = guests.map(function (g) { return { name: g.name, seat: g.seat }; });
    const game = ENGINE.createGame(config, {
      online: { role: 'host', guests: guestList, viewerId: 'p0' }
    });
    S.game = game;
    S.viewGame = null;
    S.online.role = 'host';
    S.online.connected = guests.length > 0;
    S.online.guests = guestList;
    S.online.seats = seats;
    S.online.sizes = sizes;
    S.online.mode = modeId;
    S.viewerId = 'p0';
    S.lastEventSeq = game.eventSeq;
    S.overShown = false;
    S.aiBusy = false;
    S.selectedCardIndex = null;
    S.overlayKey = '';
    S.allyFocus = null;
    const hostAlly = game.players.find(function (p) { return p.team === 'A' && p.id !== 'p0' && p.isAI; });
    if (hostAlly) S.allyFocus = hostAlly.id;
    S.battleTheme = game.theme;
    S.currentConfig = config;
    if (guests.length) {
      if (NET.markStarted) NET.markStarted();
      S.online.started = true;
      NET.send({ type: 'start', meta: { modeId: onlineEffectiveMode(modeId, sizes), modeName: game.modeName, hostName: config.playerName, seats: seats, sizes: sizes } });
    }
    showScreen('battle');
    Audio.startBgm(game.theme);
    FX.setTheme(game.theme);
    renderBattle();
    broadcastState();
    maybeRunAI();
  }

  function startMatchmakingBattle() {
    if (S.online.role !== 'host' || !S.online.matchmaking) return;
    const guests = (S.online.guests || []).slice();
    if (!guests.length) return;
    const seats = Math.max(2, Math.min(8, Number(S.online.seats) || (guests.length + 1)));
    const modeId = S.online.mode || 'team';
    const sizes = onlineModeSizes(modeId, seats);
    const config = randomOnlineConfig(modeId, seats);
    const guestList = guests.map(function (g) { return { name: g.name, seat: g.seat || 1 }; });
    const game = ENGINE.createGame(config, {
      online: { role: 'host', guests: guestList, viewerId: 'p0' }
    });
    S.game = game;
    S.viewGame = null;
    S.online.connected = true;
    S.online.guests = guestList;
    S.online.seats = seats;
    S.online.sizes = sizes;
    S.online.started = true;
    if (NET.markStarted) NET.markStarted();
    S.viewerId = 'p0';
    S.lastEventSeq = game.eventSeq;
    S.overShown = false;
    S.aiBusy = false;
    S.selectedCardIndex = null;
    S.overlayKey = '';
    S.allyFocus = null;
    const hostAlly = game.players.find(function (p) { return p.team === 'A' && p.id !== 'p0' && p.isAI; });
    if (hostAlly) S.allyFocus = hostAlly.id;
    S.battleTheme = game.theme;
    S.currentConfig = config;
    NET.send({ type: 'start', meta: { modeId: modeId, modeName: game.modeName, hostName: config.playerName, seats: seats, sizes: sizes } });
    showScreen('battle');
    Audio.startBgm(game.theme);
    FX.setTheme(game.theme);
    renderBattle();
    broadcastState();
    maybeRunAI();
  }

  function broadcastState() {
    if (S.online.role !== 'host' || !S.game) return;
    const guests = S.online.guests || [];
    guests.forEach(function (g) {
      const pid = 'p' + g.seat;
      const view = ENGINE.serializeFor(S.game, pid);
      NET.sendState(view, g.seat);
    });
  }

  function guestPlayerId() {
    return 'p' + (S.online.guestSeat || 1);
  }

  function handleNetMessage(msg, meta) {
    if (!msg) return;
    if (S.online.role === 'guest') {
      if (msg.type === 'state') {
        const wasBattle = S.screen === 'battle';
        S.viewGame = msg.state;
        S.viewerId = guestPlayerId();
        S.online.connected = true;
        S.battleTheme = msg.state.theme;
        if (!S.allyFocus) {
          const me = ENGINE.playerById(msg.state, S.viewerId);
          const guestAlly = me ? msg.state.players.find(function (p) { return p.team === me.team && p.id !== me.id && p.isAI; }) : null;
          if (guestAlly) S.allyFocus = guestAlly.id;
        }
        if (!wasBattle) {
          S.lastEventSeq = msg.state.eventSeq;
          S.overlayKey = '';
          S.overShown = false;
          showScreen('battle');
          Audio.startBgm(msg.state.theme);
          FX.setTheme(msg.state.theme);
        }
        renderBattle();
        maybeShowOver();
      } else if (msg.type === 'start') {
        S.currentConfig = msg.meta || {};
        S.online.connected = true;
        toast('房主已开桌。', 'success');
      } else if (msg.type === 'notice') {
        toast(msg.message || '房主拒绝了这次操作', 'warning');
      } else if (msg.type === 'bye') {
        toast(msg.reason || '房主关闭了房间', 'warning');
        S.online.role = null;
        S.viewGame = null;
        showScreen('lobby');
      }
      return;
    }

    if (S.online.role === 'host' && S.game) {
      const seat = meta && meta.fromSeat != null ? meta.fromSeat : 1;
      const pid = 'p' + seat;
      if (msg.type === 'action') {
        applyGuestAction(msg.action, seat);
      } else if (msg.type === 'flip') {
        const guest = S.game.players.find(function (p) { return p.id === pid; });
        if (!guest || !guest.isHuman) return;
        const result = ENGINE.resolveFlip(S.game, pid, msg.choice);
        if (!result.ok) {
          NET.sendTo(seat, { type: 'notice', message: result.reason });
          return;
        }
        afterHostMutation();
      } else if (msg.type === 'guess') {
        const guest = S.game.players.find(function (p) { return p.id === pid; });
        if (!guest || !guest.isHuman) return;
        const g = ENGINE.submitGuess(S.game, pid, msg.guess);
        if (!g.ok) {
          NET.sendTo(seat, { type: 'notice', message: g.reason });
          return;
        }
        afterHostMutation();
      } else if (msg.type === 'chat') {
        handleIncomingChat(pid, msg.text || '', msg.targetId || null);
      } else if (msg.type === 'target') {
        const guest = S.game.players.find(function (p) { return p.id === pid; });
        if (guest && guest.isHuman) {
          ENGINE.setTarget(S.game, pid, msg.targetId);
          afterHostMutation(false);
        }
      } else if (msg.type === 'leave') {
        leaveRoom();
      }
    }
  }

  function applyGuestAction(action, seat) {
    if (!action || !S.game) return;
    const pid = 'p' + (seat || 1);
    const guest = S.game.players.find(function (p) { return p.id === pid; });
    if (!guest || !guest.isHuman) return;
    const game = S.game;
    let result = { ok: false, reason: '未知操作' };
    if (action.kind === 'playCard') {
      result = ENGINE.playCard(game, pid, action.handIndex, action.targetId);
    } else if (action.kind === 'active') {
      result = ENGINE.useActive(game, pid, action.targetId);
    } else if (action.kind === 'switch') {
      result = ENGINE.switchCharacter(game, pid, action.index);
    } else if (action.kind === 'endTurn') {
      result = ENGINE.endTurn(game, pid);
    } else if (action.kind === 'target') {
      result = { ok: ENGINE.setTarget(game, pid, action.targetId) };
    }
    if (!result.ok) {
      NET.sendTo(seat, { type: 'notice', message: result.reason || '操作无效' });
      return;
    }
    afterHostMutation();
  }
/* =========================================================
     战斗：状态读取与渲染
     ========================================================= */
  function getGame() {
    return S.online.role === 'guest' ? S.viewGame : S.game;
  }

  function viewerFor(game) {
    if (!game) return null;
    if (S.online.role === 'guest') return ENGINE.playerById(game, guestPlayerId());
    if (S.online.role === 'host') return ENGINE.playerById(game, 'p0');
    const current = ENGINE.currentPlayer(game);
    if (current && current.isHuman && !current.isAI && game.players.some(function (p) { return p.id === 'p1' && p.isHuman; })) {
      return current;
    }
    return ENGINE.playerById(game, 'p0');
  }

  function alliesOfViewer(game, viewer) {
    return game.players.filter(function (p) {
      return p.team === viewer.team && p.id !== viewer.id && p.isAI && p.chars.some(function (u) { return u.hp > 0; });
    });
  }

  function focusedAlly(game, viewer) {
    const allies = alliesOfViewer(game, viewer);
    if (!allies.length) return null;
    const found = allies.find(function (p) { return p.id === S.allyFocus; });
    if (found) return found;
    S.allyFocus = allies[0].id;
    return allies[0];
  }

  function canAct(game) {
    if (!game || game.phase !== 'action' || game.over) return false;
    const current = ENGINE.currentPlayer(game);
    const viewer = viewerFor(game);
    return !!(current && viewer && current.id === viewer.id && current.isHuman && !current.isAI);
  }

  function teamLabel(game, player) {
    const mates = game.players.filter(function (p) { return p.team === player.team; });
    return player.team + ((player.teamIndex || (mates.indexOf(player) + 1)));
  }

  function playerNameFor(game, player, viewer) {
    if (player.id === viewer.id) return '你';
    if (player.team === viewer.team) return player.isAI ? '队友' : '队友';
    return player.isAI ? '对手 AI' : '对手';
  }

  function charFor(player) {
    return D.byId.character(player.charId) || D.CHARACTERS[0] || {};
  }

  function combatantHTML(game, player, viewer, currentId) {
    const unit = ENGINE.activeUnit(player);
    if (!unit) return '';
    const char = charFor(player);
    const style = D.STYLES[unit.style] || D.STYLES.abyss;
    const isCurrent = currentId === player.id;
    const enemy = player.team !== viewer.team;
    const selectable = enemy && canAct(game) && viewer.team !== player.team;
    const isTarget = enemy && viewer.selectedTarget === player.id;
    const labels = [];
    if (player.id === viewer.id) labels.push('你');
    else if (player.team === viewer.team) labels.push(player.isAI ? '队友' : '队友');
    else labels.push(player.isAI ? 'AI' : '玩家');
    if (player.team === viewer.team) labels.push('友方'); else labels.push('敌方');
    const hpPips = [];
    for (let i = 0; i < unit.maxHp; i++) hpPips.push('<i class="' + (i < unit.hp ? 'is-on' : '') + '"></i>');
    const badgeImg = function (key, label) {
      return '<img class="status-badge-img" src="assets/art/ui/badges/' + key + '.png" alt="' + esc(label) + '" title="' + esc(label) + '" loading="lazy" onerror="this.style.display=\'none\'">';
    };
    const status = [];
    if (unit.shield) status.push('<span class="status-chip">' + badgeImg('shield', '护盾') + ' ' + unit.shield + '</span>');
    if (player.burnNext) status.push('<span class="status-chip">' + badgeImg('burn', '灼烧') + ' ' + player.burnNext + '</span>');
    if (player.weakThisTurn) status.push('<span class="status-chip">' + badgeImg('weak', '虚弱') + ' ' + player.weakThisTurn + '</span>');
    if (player.sealedThisTurn || player.sealNext) status.push('<span class="status-chip">' + badgeImg('seal', '封印') + '</span>');
    if (player.blindThisTurn || player.blindNext) status.push('<span class="status-chip">' + badgeImg('seal', '致盲') + '</span>');
    if (player.manaBurnNext) status.push('<span class="status-chip">' + badgeImg('choke', '抽干') + '</span>');
    if (player.puppetNext) status.push('<span class="status-chip">' + badgeImg('control', '傀儡') + '</span>');
    if (player.flags && player.flags.rebirthReady) status.push('<span class="status-chip">' + badgeImg('shield', '重生') + '</span>');
    if (player.turnFlags && player.turnFlags.redirectActive) status.push('<span class="status-chip">' + badgeImg('reflect', '转移') + '</span>');
    if (player.turnFlags && player.turnFlags.mirrorActive && !player.turnFlags.mirrorUsed) status.push('<span class="status-chip">' + badgeImg('reflect', '镜面') + '</span>');
    if (player.turnFlags && player.turnFlags.guardActive) status.push('<span class="status-chip">' + badgeImg('guard', '坚守') + '</span>');
    if (player.turnFlags && player.turnFlags.reflectActive) status.push('<span class="status-chip">' + badgeImg('reflect', '反射') + '</span>');
    if (player.pendingDamageBonus) status.push('<span class="status-chip">' + badgeImg('power', '蓄力') + ' +' + player.pendingDamageBonus + '</span>');
    if (player.nextTurnEnergize) status.push('<span class="status-chip">' + badgeImg('energize', '振奋') + '</span>');
    if (player.chokeNext) status.push('<span class="status-chip">' + badgeImg('stun', '干扰') + ' ' + player.chokeNext + '</span>');
    if (player.blessNext) status.push('<span class="status-chip">' + badgeImg('zhao', '必成') + '</span>');
    if (player.rerollBoost) status.push('<span class="status-chip">' + badgeImg('power', '+1 伤害') + '</span>');
    if (player.orders && player.orders.length) status.push('<span class="status-chip status-chip--order">指令 ' + esc(orderName(player.orders[0])) + '</span>');
    const reserves = player.chars.map(function (u, i) {
      if (i === player.active) return '';
      return '<span class="reserve ' + (u.hp <= 0 ? 'is-down' : '') + '"><i>' + (u.hp > 0 ? u.hp : '×') + '</i>' + esc(u.name.split('·').pop()) + '</span>';
    }).join('');

    const showOppHand = !!(game.peekViewerId === viewer.id && game.turn <= (game.peekUntilTurn || 0));
    const handLabel = (player.id === viewer.id)
      ? player.hand.length
      : (showOppHand ? (player.hand || []).map(function (c) { return c.name; }).join('/') : (player.handCount != null ? player.handCount : player.hand.length));
    return '<article class="combatant ' + (isCurrent ? 'is-current ' : '') + (enemy ? 'is-enemy ' : 'is-ally ') + (isTarget ? 'is-target ' : '') + (unit.hp <= 2 ? 'is-low ' : '') + '" data-player-id="' + player.id + '" style="' + styleVars(unit.style) + '">' +
      (selectable ? '<button class="target-btn" data-set-target="' + player.id + '" title="将当前目标锁定为 ' + esc(unit.name) + '">' + (isTarget ? '已锁定' : '锁定目标') + '</button>' : '') +
      '<div class="combatant__art' + (char.id ? ' has-media' : '') + '">' +
        (function () {
          try {
            if (!root.CF_ASSETS) return '';
            // v2.2 AI 队友/敌人使用 ai-{personaId}.webp，而不是 char.id.webp
            if (player.isAI) {
              var pid = player.personaId || (AI.getPersonaId ? AI.getPersonaId() : null) || SETTINGS.aiPersona || 'hotaru';
              return '<img class="combatant__img" src="assets/art/portraits/ai-' + pid + '.webp" alt="" aria-hidden="true" onerror="this.remove();this.parentNode.classList.remove(\'has-media\')">';
            }
            if (char.id) {
              return '<img class="combatant__img" src="' + root.CF_ASSETS.portraitUrl(char.id) + '" alt="" aria-hidden="true" onerror="this.remove();this.parentNode.classList.remove(\'has-media\')">';
            }
          } catch (e) {}
          return '';
        })() +
        '<div class="combatant__aurora"></div>' +
        '<span class="combatant__glyph">' + style.glyph + '</span>' +
        '<span class="combatant__initial">' + esc((unit.name || '?').replace(/[·\s]/g, '').slice(-1)) + '</span>' +
        '<span class="combatant__scan"></span>' +
        (isCurrent ? '<span class="turn-marker">行动中</span>' : '') +
      '</div>' +
      '<div class="combatant__body">' +
        '<div class="combatant__meta"><span class="team-tag">' + teamLabel(game, player) + ' · ' + labels.join(' · ') + '</span><span class="role-tag" style="color:' + (char.roleColor || style.color) + '">' + esc(unit.role) + '</span></div>' +
        '<h3>' + esc(unit.name) + '</h3>' +
        '<div class="hp-line"><div class="hp-pips">' + hpPips.join('') + '</div><strong>' + unit.hp + '<small>/' + unit.maxHp + '</small></strong></div>' +
        '<div class="status-row">' + status.join('') + '</div>' +
        '<div class="combatant__footer"><span title="' + esc(showOppHand && player.id !== viewer.id ? '窥视中：' + handLabel : '') + '">手牌 ' + handLabel + '</span><span>牌库 ' + (player.deckCount != null ? player.deckCount : player.deck.length) + '</span><span>主动 ' + unit.activeUsesLeft + '/' + (char.active ? char.active.uses : '?') + '</span></div>' +
        (reserves ? '<div class="reserves">' + reserves + '</div>' : '') +
      '</div>' +
      '</article>';
  }

  function orderName(order) {
    const map = { attack: '进攻', defend: '防守', heal: '治疗', active: '主动技', draw: '过牌', hold: '待命', holdActive: '留技能' };
    return map[order.intent] || order.intent || '待命';
  }

  function renderBoards(game, viewer) {
    const current = ENGINE.currentPlayer(game);
    const enemyPlayers = game.players.filter(function (p) { return p.team !== viewer.team; }).sort(function (a, b) { return a.seat - b.seat; });
    const allyPlayers = game.players.filter(function (p) { return p.team === viewer.team; }).sort(function (a, b) { return a.seat - b.seat; });
    $('#enemy-board').innerHTML = '<div class="board-head"><span class="eyebrow">THE OPPOSITION</span><span>' + enemyPlayers.map(function (p) { return teamLabel(game, p); }).join(' · ') + '</span></div><div class="board-row board-row--' + enemyPlayers.length + '">' +
      enemyPlayers.map(function (p) { return combatantHTML(game, p, viewer, current ? current.id : null); }).join('') + '</div>';
    $('#ally-board').innerHTML = '<div class="board-row board-row--' + allyPlayers.length + '">' +
      allyPlayers.map(function (p) { return combatantHTML(game, p, viewer, current ? current.id : null); }).join('') + '</div><div class="board-head board-head--ally"><span>' + esc(viewer.team) + ' 席</span><span class="eyebrow">YOUR SIDE OF THE TABLE</span></div>';
  }

  function renderHand(game, viewer) {
    const act = canAct(game);
    const cards = viewer.hand || [];
    const maxCards = game.rules.maxCards || 1;
    $('#hand-count').textContent = cards.length + ' 张' + (maxCards > 1 ? ' · 已出 ' + (viewer.cardsPlayedThisTurn || 0) + '/' + maxCards : '');
    $('#reroll-status').innerHTML = game.noReroll ? '<span class="muted">本模式无重抛</span>' : ('重抛 <b>×' + viewer.rerolls + '</b>') + (game.rules.chain ? '<span class="chain-chip">连锁 ' + (viewer.chain || 0) + '/3</span>' : '');
    const disabled = !act || viewer.cardPlayed;
    $('#hand').innerHTML = cards.map(function (card, index) {
      return fateCardHTML(card, {
        index: index,
        selected: S.selectedCardIndex === index,
        disabled: disabled
      });
    }).join('') || '<div class="hand-empty"><span>◌</span><p>手牌为空。下回合补至三张。</p></div>';
    $('#hand-scroller').classList.toggle('is-disabled', disabled);
    $('#hand-title').textContent = viewer.id === 'p0' ? '你的手牌' : '玩家二的手牌';
    const deckLeft = viewer.deckCount != null ? viewer.deckCount : viewer.deck.length;
    const discardLeft = viewer.discardCount != null ? viewer.discardCount : viewer.discard.length;
    $('#deck-left').textContent = '牌库 ' + deckLeft;
    $('#discard-left').textContent = '弃牌 ' + discardLeft;
    $$('#hand .fate-card').forEach(function (el) {
      el.onclick = function () {
        if (el.disabled) {
          if (viewer.cardPlayed) toast('本回合的出牌次数已经用尽。', 'warning');
          return;
        }
        const idx = Number(el.dataset.handIndex);
        S.selectedCardIndex = S.selectedCardIndex === idx ? null : idx;
        Audio.sfx('click');
        renderArena(game, viewer);
        $$('#hand .fate-card').forEach(function (x) { x.classList.toggle('is-selected', Number(x.dataset.handIndex) === S.selectedCardIndex); });
      };
    });
  }

  function renderArena(game, viewer) {
    const current = ENGINE.currentPlayer(game);
    const pending = game.pending;
    let title = '等待抛币';
    let sub = '打出技能卡后，正面成功 / 反面反噬';
    let coinClass = 'coin--idle';
    if (game.over) {
      title = game.over.winnerTeam === viewer.team ? '审判结束 · 你赢了' : '审判结束 · 你输了';
      sub = game.over.reason;
    } else if (game.phase === 'flip' && pending) {
      title = pending.actorId === viewer.id ? '硬币正在落定' : (current ? current.name : '对手') + ' 正在抛币';
      sub = '「' + pending.card.name + '」· 正面成功 / 反面反噬';
      coinClass = 'coin--spinning';
    } else if (game.phase === 'reveal' && pending) {
      const success = !!pending.result;
      title = success ? '正面 · 技能成立' : '反面 · 技能反噬';
      sub = '「' + pending.card.name + '」' + (success ? pending.card.posText : pending.card.negText);
      coinClass = success ? 'coin--success' : 'coin--fail';
    } else if (game.phase === 'action' && current) {
      title = current.id === viewer.id ? '你的回合' : current.name + ' 的回合';
      sub = current.id === viewer.id ? '选择一张技能卡，或使用角色主动技' : '等待对方行动…';
      coinClass = 'coin--idle';
    }
    $('#turn-banner').innerHTML = '<span class="eyebrow">THE COIN DECIDES</span><strong>' + esc(title) + '</strong><small>' + esc(sub) + '</small>';
    const coin = $('#battle-coin');
    if (coin) coin.className = 'coin ' + coinClass;

    const actions = [];
    const act = canAct(game);
    if (game.over) {
      actions.push('<button class="btn btn--primary" data-action="game-over">查看结算</button>');
    } else if (act) {
      const selected = S.selectedCardIndex != null ? viewer.hand[S.selectedCardIndex] : null;
      if (selected) {
        actions.push('<div class="selected-play"><div><span class="eyebrow">SELECTED</span><strong>' + esc(selected.name) + '</strong><small>' + esc(selected.posText) + ' / ' + esc(selected.negText) + '</small></div>' +
          '<div class="selected-play__buttons"><button class="btn btn--primary btn--sm" data-action="play-selected">打出 · 抛币</button><button class="btn btn--quiet btn--sm" data-action="cancel-selected">取消</button></div></div>');
      } else {
        const maxCards = game.rules.maxCards || 1;
        actions.push('<div class="action-hint"><span>◉</span><p>点选手牌查看效果。' + (maxCards > 1 ? ('本回合还可打出 ' + Math.max(0, maxCards - (viewer.cardsPlayedThisTurn || 0)) + ' 张。') : '每回合最多一张技能卡。') + '</p></div>');
      }
      const unit = ENGINE.activeUnit(viewer);
      const teammate = focusedAlly(game, viewer);
      const buttonBits = [];
      if (unit) {
        buttonBits.push('<button class="btn btn--secondary btn--sm action-skill" data-action="use-skill" ' + (viewer.activeUsedThisTurn || viewer.sealedThisTurn || unit.activeUsesLeft <= 0 ? 'disabled' : '') + ' title="' + esc(unit.activeDesc) + '">' +
          '<span>主动 · ' + esc(unit.activeName) + '</span><small>' + unit.activeUsesLeft + ' 次</small></button>');
      }
      if (viewer.chars.length > 1) {
        const nextIndex = viewer.chars.findIndex(function (u, i) { return i !== viewer.active && u.hp > 0; });
        buttonBits.push('<button class="btn btn--quiet btn--sm" data-action="switch-char" data-index="' + (nextIndex >= 0 ? nextIndex : 0) + '" ' + (viewer.switchedThisTurn || nextIndex < 0 ? 'disabled' : '') + '>切换角色</button>');
      }
      buttonBits.push('<button class="btn btn--ghost btn--sm" data-action="end-turn">结束回合</button>');
      actions.push('<div class="action-buttons">' + buttonBits.join('') + '</div>');
      const enemies = ENGINE.enemiesOf(game, viewer);
      if (enemies.length > 1) {
        actions.push('<div class="target-strip"><span>当前目标</span>' + enemies.map(function (p) {
          const u = ENGINE.activeUnit(p);
          return '<button data-set-target="' + p.id + '" class="' + (viewer.selectedTarget === p.id ? 'is-active' : '') + '">' + teamLabel(game, p) + ' · ' + esc(u ? u.name.split('·').pop() : '?') + '</button>';
        }).join('') + '</div>');
      }
      if (teammate) actions.push('<div class="arena-order-hint">可在右侧战术频道直接指挥 <b>' + esc(teammate.name) + '</b>。它不一定听。</div>');
    } else if (game.phase === 'flip') {
      actions.push('<div class="waiting-action"><span class="thinking-dots"><i></i><i></i><i></i></span><p>' + (pending && pending.actorId === viewer.id ? '完成硬币判定…' : '等待对方做出命运选择…') + '</p></div>');
    } else if (game.phase === 'reveal') {
      actions.push('<div class="waiting-action"><span class="spin-glyph">◉</span><p>结算中，赛场正在改写这一页…</p></div>');
    } else {
      actions.push('<div class="waiting-action"><span class="spin-glyph">◌</span><p>等待赛场推进回合…</p></div>');
    }
    $('#arena-actions').innerHTML = actions.join('');
    $('#arena-hint').textContent = game.over ? '审判已经结束' : (canAct(game) ? ((game.rules.maxCards || 1) > 1 ? '本回合可连续打出 ' + game.rules.maxCards + ' 张技能卡' : '每回合最多打出一张技能卡') : '非你的行动阶段');
  }

  function renderChat(game, viewer) {
    const box = $('#battle-chat');
    if (!box) return;
    const allies = alliesOfViewer(game, viewer);
    const teammate = focusedAlly(game, viewer);
    const panel = $('#teammate-panel');
    if (teammate) {
      const unit = ENGINE.activeUnit(teammate);
      const char = charFor(teammate);
      panel.hidden = false;
      const order = (teammate.orders || [])[0];
      const allyTabs = allies.length > 1 ? '<div class="ally-tabs">' + allies.map(function (p) {
        return '<button data-ally-focus="' + p.id + '" class="' + (p.id === teammate.id ? 'is-active' : '') + '">' + teamLabel(game, p) + ' · ' + esc(p.name.split('·').pop()) + '</button>';
      }).join('') + '</div>' : '';
      panel.innerHTML = '<div class="teammate-head"><span class="teammate-orb" style="' + styleVars(char.style) + '">' + (D.STYLES[char.style] || {}).glyph + '</span><div><span class="eyebrow">AI CO-SIGNER · ' + teamLabel(game, teammate) + '</span><strong>' + esc(teammate.name) + '</strong><small>' + esc(char.temper || '') + '</small></div><span class="mood-face" title="情绪">' + (teammate.mood >= 70 ? '◡' : teammate.mood >= 40 ? '–' : '◞') + '</span></div>' +
        allyTabs +
        '<div class="trust-row"><span>默契 <b>' + teammate.trust + '</b>/12</span><div class="trust-bar"><i style="width:' + Math.round((teammate.trust / 12) * 100) + '%"></i></div></div>' +
        '<div class="teammate-foot"><span>' + (unit ? unit.hp + ' HP · ' + unit.shield + ' 盾 · 连锁 ' + (teammate.chain || 0) : '倒下') + '</span><span>' + (order ? '已接指令：' + esc(orderName(order)) : '暂无指令') + '</span></div>';
    } else {
      panel.hidden = true;
      panel.innerHTML = '';
    }
    $('#quick-orders').hidden = !teammate;
    if (teammate) {
      $$('#quick-orders button').forEach(function (b) {
        b.disabled = !teammate || game.phase === 'over';
      });
    }
    const chat = game.chat || [];
    box.innerHTML = chat.map(function (m) {
      if (m.kind === 'system') return '<div class="chat-system">' + esc(m.text) + '</div>';
      const who = m.kind === 'player' ? 'player' : m.kind === 'ally' ? 'ally' : m.kind === 'enemy' ? 'enemy' : 'system';
      const pclass = m.persona ? ' chat-msg--persona-' + m.persona : '';
      const avatarInner = (who === 'player' ? '你'
        : (m.persona ? '<img src="assets/art/portraits/ai-' + m.persona + '.webp" alt="" onerror="this.style.display=\'none\'">'
                    : (m.speaker || '?').replace(/[·\s]/g, '').slice(-1)));
      return '<div class="chat-msg chat-msg--' + who + pclass + '"><div class="chat-avatar">' + avatarInner + '</div><div class="chat-bubble"><span>' + esc(m.speaker) + '</span><p>' + esc(m.text) + '</p></div></div>';
    }).join('');
    if (chat.length !== S.lastChatCount) {
      S.lastChatCount = chat.length;
      box.scrollTop = box.scrollHeight;
    }
    const form = $('#chat-form');
    if (form) {
      const input = $('#chat-input');
      if (teammate) input.placeholder = '指挥搭档：集火 B1 / 先保命 / 给我治疗…';
      else if (game.players.some(function (p) { return p.team !== viewer.team && p.isAI; })) input.placeholder = '对对手说点什么…';
      else input.placeholder = '和对手聊聊…';
      input.disabled = game.phase === 'over';
    }
  }

  function renderLog(game) {
    const box = $('#battle-log');
    if (!box) return;
    box.innerHTML = (game.log || []).slice(-50).map(function (l) {
      return '<div class="log-line log-line--' + l.kind + '"><span>' + String(l.turn).padStart(2, '0') + '</span><p>' + esc(l.text) + '</p></div>';
    }).join('');
    box.scrollTop = box.scrollHeight;
  }

  function renderTop(game) {
    $('#battle-mode-name').textContent = game.modeName + (game.story ? ' · ' + game.story.chapter.title : '');
    $('#battle-round').textContent = 'ROUND ' + game.round + ' · TURN ' + game.turn;
    const current = ENGINE.currentPlayer(game);
    const viewer = viewerFor(game);
    let label = '等待中';
    if (game.phase === 'over') label = '审判结束';
    else if (game.phase === 'flip') label = '硬币判定中';
    else if (game.phase === 'reveal') label = '结算中';
    else if (current) label = current.id === viewer.id ? '你的回合' : current.name + ' 的回合';
    $('#turn-chip').innerHTML = '<span class="live-dot"></span> ' + esc(label);
    $('#turn-chip').classList.toggle('is-enemy', !!(current && viewer && current.team !== viewer.team));
    const netPill = $('#net-pill');
    netPill.hidden = !S.online.role;
    netPill.textContent = S.online.role ? (S.online.role === 'host' ? '房主 · 权威' : '访客 · 同步') : '联机';
  }

  function renderBattle() {
    const game = getGame();
    if (!game) return;
    const viewer = viewerFor(game);
    if (!viewer) return;
    if (S.lastBattleTurn !== game.turn || S.lastBattleViewer !== viewer.id) {
      S.selectedCardIndex = null;
      S.lastBattleTurn = game.turn;
      S.lastBattleViewer = viewer.id;
    }
    S.viewerId = viewer.id;
    renderTop(game);
    renderBoards(game, viewer);
    renderHand(game, viewer);
    renderArena(game, viewer);
    renderChat(game, viewer);
    renderLog(game);
    renderFlipOverlay(game, viewer);
    animateEvents(game);
    maybeShowOver();
  }

  /* =========================================================
     战斗动作
     ========================================================= */
  function commitHost() {
    if (S.online.role === 'host') broadcastState();
    renderBattle();
    scheduleRevealAdvance();
    maybeRunAI();
  }

  function dispatchAction(action) {
    const game = getGame();
    const viewer = viewerFor(game);
    if (!game || !viewer) return;
    if (S.online.role === 'guest') {
      NET.send({ type: 'action', action: Object.assign({}, action) });
      return true;
    }
    let result = { ok: false };
    if (action.kind === 'playCard') result = ENGINE.playCard(game, viewer.id, action.handIndex, action.targetId || viewer.selectedTarget);
    else if (action.kind === 'active') result = ENGINE.useActive(game, viewer.id, action.targetId || viewer.selectedTarget);
    else if (action.kind === 'switch') result = ENGINE.switchCharacter(game, viewer.id, action.index);
    else if (action.kind === 'endTurn') result = ENGINE.endTurn(game, viewer.id);
    else if (action.kind === 'target') {
      const ok = ENGINE.setTarget(game, viewer.id, action.targetId);
      result = { ok: ok, reason: ok ? '' : '无效目标' };
    }
    if (!result.ok) {
      toast(result.reason || '这个操作现在不可用', 'warning');
      return false;
    }
    if (action.kind === 'playCard') S.selectedCardIndex = null;
    Audio.sfx(action.kind === 'endTurn' ? 'click' : 'card');
    commitHost();
    return true;
  }

  function playSelected() {
    const game = getGame();
    const viewer = viewerFor(game);
    if (!game || !viewer || S.selectedCardIndex == null) return;
    const card = viewer.hand[S.selectedCardIndex];
    dispatchAction({ kind: 'playCard', handIndex: S.selectedCardIndex, targetId: viewer.selectedTarget, cardName: card ? card.name : '' });
  }

  function chooseFlip(choice) {
    const game = getGame();
    const viewer = viewerFor(game);
    if (!game || !viewer || game.phase !== 'flip') return;
    if (S.online.role === 'guest') {
      NET.send({ type: 'flip', choice: choice });
      return;
    }
    const result = ENGINE.resolveFlip(game, viewer.id, choice);
    if (!result.ok) { toast(result.reason, 'warning'); return; }
    if (choice === 'accept') Audio.sfx('click');
    commitHost();
  }

  // v2.2 猜币：玩家选择正反面后才抛币
  function chooseGuess(guess) {
    const game = getGame();
    const viewer = viewerFor(game);
    if (!game || !viewer || game.phase !== 'flip') return;
    if (S.online.role === 'guest') {
      NET.send({ type: 'guess', guess: guess });
      return;
    }
    const r = ENGINE.submitGuess(game, viewer.id, guess);
    if (!r.ok) { toast(r.reason, 'warning'); return; }
    Audio.sfx('click');
    commitHost();
  }

  function renderFlipOverlay(game, viewer) {
    const overlay = $('#flip-overlay');
    if (!overlay) return;
    const pending = game.pending;
    const should = game.phase === 'flip' && pending && pending.actorId === viewer.id && !pending.resolved;
    if (!should) {
      overlay.hidden = true;
      S.overlayKey = '';
      S.overlayRevealed = false;
      if (S.overlayTimer) { clearTimeout(S.overlayTimer); S.overlayTimer = null; }
      return;
    }
    overlay.hidden = false;

    // v2.2 阶段一：还没猜，也没抛币 — 显示两个大猜币按钮
    if (pending.result == null && !pending.resolved) {
      S.overlayKey = pending.id + ':guess';
      S.overlayRevealed = false;
      if (S.overlayTimer) { clearTimeout(S.overlayTimer); S.overlayTimer = null; }
      const coin = $('#flip-coin');
      if (coin) coin.className = 'coin coin--idle';
      $('#flip-result').innerHTML = '<strong>命运悬而未决</strong><p>这张牌已经打出，在硬币落地之前——你猜正面还是反面？</p>';
      $('#flip-choices').innerHTML =
        '<button class="btn btn--primary guess-btn" data-guess="head">猜正面 ↑</button>' +
        '<button class="btn btn--secondary guess-btn" data-guess="tail">猜反面 ↓</button>';
      return;
    }

    const key = pending.id + ':' + pending.result + ':' + pending.rerolled;
    if (key !== S.overlayKey) {
      S.overlayKey = key;
      S.overlayRevealed = false;
      if (S.overlayTimer) clearTimeout(S.overlayTimer);
      try { Audio.narrator('coin'); } catch (e) {}
      const coin = $('#flip-coin');
      if (coin) {
        coin.className = 'coin coin--spinning';
        coin.style.setProperty('--land-face', pending.result ? '0deg' : '180deg');
      }
      const guessText = pending.guessed ? ('（你猜的' + (pending.guessed === 'head' ? '正面' : '反面') + '）') : '';
      $('#flip-result').innerHTML = '<strong>硬币在空中</strong><p>' + guessText + '正或反，只在落地的一瞬。</p>';
      $('#flip-choices').innerHTML = '';
      Audio.sfx('coin');
      S.overlayTimer = setTimeout(function () {
        S.overlayRevealed = true;
        renderFlipOverlay(game, viewer);
      }, 900);
      return;
    }
    if (!S.overlayRevealed) return;

    const success = !!pending.result;
    const coin = $('#flip-coin');
    if (coin) coin.className = 'coin ' + (success ? 'coin--success' : 'coin--fail');
    const guessText = pending.guessed ? ('（你猜的' + (pending.guessed === 'head' ? '正面' : '反面') + '）') : '';
    $('#flip-result').innerHTML = '<strong class="' + (success ? 'is-success' : 'is-fail') + '">' + (success ? '正面 · 成功' : '反面 · 失败') + '</strong>' +
      '<p>' + esc(success ? pending.card.posText : pending.card.negText) + '</p>' +
      (pending.blessed ? '<small class="bless-note">命运祝福：本次判定必定成功</small>' : '') +
      (pending.rerolled ? '<small class="bless-note">已重抛：这是最终结果</small>' : '') +
      '<small class="bless-note">' + guessText + '</small>';
    const choices = [];
    choices.push('<button class="btn btn--primary" data-flip-choice="accept">接受' + (success ? '正面' : '反面') + '</button>');
    if (pending.canReroll && !pending.rerolled && viewer.rerolls > 0) {
      choices.push('<button class="btn btn--secondary" data-flip-choice="reroll">重抛一次 <small>剩余 ' + viewer.rerolls + '</small></button>');
    }
    $('#flip-choices').innerHTML = choices.join('');
  }

  /* =========================================================
     事件动画
     ========================================================= */
  function animateEvents(game) {
    const events = (game.events || []).filter(function (e) { return e.seq > S.lastEventSeq; });
    if (!events.length) return;
    S.lastEventSeq = Math.max.apply(null, events.map(function (e) { return e.seq; }));
    events.forEach(function (event, i) {
      setTimeout(function () { animateEvent(event, game); }, i * 120);
    });
  }

  function animateEvent(event, game) {
    if (!event) return;
    if (event.type === 'damage') {
      const target = $('.combatant[data-player-id="' + event.targetId + '"]');
      if (target) {
        if (event.amount > 0) {
          target.classList.add('is-hit');
          setTimeout(function () { target.classList.remove('is-hit'); }, 500);
          floatText(target, '-' + event.amount, 'damage');
          Audio.sfx('damage');
          shakeScreen();
        } else if (event.blocked) {
          floatText(target, '盾 -' + event.blocked, 'shield');
          Audio.sfx('shield');
        }
      }
    } else if (event.type === 'heal') {
      const target = $('.combatant[data-player-id="' + event.playerId + '"]');
      if (target) { floatText(target, '+' + event.amount, 'heal'); target.classList.add('is-heal'); setTimeout(function(){target.classList.remove('is-heal');}, 650); }
      Audio.sfx('heal');
    } else if (event.type === 'shield') {
      const target = $('.combatant[data-player-id="' + event.playerId + '"]');
      if (target) { floatText(target, '盾 +' + event.amount, 'shield'); target.classList.add('is-shield'); setTimeout(function(){target.classList.remove('is-shield');}, 750); }
      Audio.sfx('shield');
    } else if (event.type === 'burn') {
      const target = $('.combatant[data-player-id="' + event.targetId + '"]');
      if (target) { target.classList.add('is-burn'); floatText(target, '-' + event.amount, 'damage'); setTimeout(function(){target.classList.remove('is-burn');}, 2800); }
      Audio.sfx('damage');
    } else if (event.type === 'lifesteal') {
      const target = $('.combatant[data-player-id="' + event.targetId + '"]');
      if (target) { target.classList.add('is-lifesteal'); setTimeout(function(){target.classList.remove('is-lifesteal');}, 750); }
    } else if (event.type === 'stealShield') {
      const target = $('.combatant[data-player-id="' + event.targetId + '"]');
      if (target) { target.classList.add('is-steal'); setTimeout(function(){target.classList.remove('is-steal');}, 600); }
    } else if (event.type === 'discard') {
      const target = $('.combatant[data-player-id="' + event.playerId + '"]');
      if (target) floatText(target, '弃 ' + event.count, 'discard');
    } else if (event.type === 'draw') {
      Audio.sfx('card'); // 抽卡：纸牌落桌声
    } else if (event.type === 'passive') {
      toast(event.name + '：' + event.text, 'passive');
    } else if (event.type === 'active') {
      Audio.sfx('active');
      const player = ENGINE.playerById(game, event.playerId);
      const char = player ? charFor(player) : null;
      if (char && char.id) Audio.voice(char.id, 'attack');
      var sayKey = ACTIVE_SAY_KEYS[char && char.active && char.active.id ? char.active.id : null];
      if (sayKey) Audio.say(sayKey);
    } else if (event.type === 'flipResult') {
      const success = !!event.result;
      playBurst(success);
      Audio.sfx(success ? 'success' : 'fail');
      Audio.say(success ? 'zhao' : 'mei');
      if (!success) shakeScreen(true);
      document.body.classList.add(success ? 'flash-success' : 'flash-fail');
      setTimeout(function () { document.body.classList.remove('flash-success', 'flash-fail'); }, 500);
    } else if (event.type === 'card') {
      Audio.sfx('card');
      // 出牌呼喝：按卡类别播 say 词；攻击/高风险牌由出牌者喊出攻击台词
      try {
        const pl = ENGINE.playerById(game, event.playerId);
        const ch = pl ? charFor(pl) : null;
        const cd = event.cardId ? D.byId.card(event.cardId) : null;
        if (cd) {
          var catSay = { attack: 'attack', defense: 'defend', control: 'control', risk: 'risk', style: 'style' }[cd.category];
          if (catSay) Audio.say(catSay);
        }
        if (ch && cd && (cd.category === 'attack' || cd.category === 'risk')) Audio.voice(ch.id, 'attack');
      } catch (e) {}
    } else if (event.type === 'victory') {
      const viewer = viewerFor(game);
      const win = !!(viewer && event.team === viewer.team);
      Audio.sfx(win ? 'victory' : 'defeat');
      Audio.say(win ? 'win' : 'lose');
      // 胜/负台词
      try {
        const vch = viewer ? charFor(viewer) : null;
        if (vch && vch.id) Audio.voice(vch.id, win ? 'win' : 'lose');
      } catch (e) {}
    } else if (event.type === 'defeat') {
      const target = $('.combatant[data-player-id="' + event.playerId + '"]');
      if (target) target.classList.add('is-defeated');
      // 倒下角色的败北台词
      try {
        const pl = ENGINE.playerById(game, event.playerId);
        const ch = pl ? charFor(pl) : null;
        if (ch && ch.id) Audio.voice(ch.id, 'lose');
      } catch (e) {}
    } else if (event.type === 'chain') {
      const target = $('.combatant[data-player-id="' + event.playerId + '"]');
      if (target) floatText(target, event.delta > 0 ? ('连锁 +' + event.delta) : '连锁断裂', event.delta > 0 ? 'heal' : 'damage');
      if (event.delta > 0) Audio.sfx('success');
    } else if (event.type === 'extraAction') {
      toast('硬币还没停：本回合还可打出 ' + event.remaining + ' 张技能卡。', 'passive');
    } else if (event.type === 'chaos') {
      toast('混沌换手：所有人的手牌已被重新洗过。', 'warning');
      Audio.sfx('coin');
    }
  }

  function floatText(target, text, kind) {
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const el = document.createElement('span');
    el.className = 'float-text float-text--' + kind;
    el.textContent = text;
    el.style.left = (rect.left + rect.width / 2) + 'px';
    el.style.top = (rect.top + rect.height * 0.35) + 'px';
    $('#effect-layer').appendChild(el);
    setTimeout(function () { el.remove(); }, 1250);
  }

  function playBurst(success) {
    const layer = $('#effect-layer');
    if (!layer) return;
    const rect = $('#arena').getBoundingClientRect();
    // 粒子颜色跟随当前硬币皮肤的 particle 字段；失败时统一用警示红
    var skin = null;
    try { skin = Audio.currentCoinSkin(); } catch (e) {}
    var skinColor = (skin && skin.particle) || '#ffe89a';
    var successColor = success ? skinColor : '#e06c5f';
    for (let i = 0; i < 32; i++) {
      const p = document.createElement('i');
      p.className = 'burst-particle';
      p.style.left = (rect.left + rect.width / 2) + 'px';
      p.style.top = (rect.top + rect.height / 2) + 'px';
      p.style.background = successColor;
      p.style.boxShadow = '0 0 8px ' + successColor;
      const angle = Math.random() * Math.PI * 2;
      const dist = 60 + Math.random() * 180;
      p.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
      p.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
      p.style.setProperty('--delay', (Math.random() * 0.1) + 's');
      layer.appendChild(p);
      setTimeout(function () { p.remove(); }, 1200);
    }
  }

  function shakeScreen(strong) {
    document.body.classList.add(strong ? 'screen-shake--strong' : 'screen-shake');
    setTimeout(function () { document.body.classList.remove('screen-shake', 'screen-shake--strong'); }, strong ? 650 : 380);
  }

  /* =========================================================
     AI 回合
     ========================================================= */
  function scheduleRevealAdvance() {
    if (S.online.role === 'guest') return;
    const game = getGame();
    if (!game || game.phase !== 'reveal' || game.over) return;
    if (S.advanceTimer) clearTimeout(S.advanceTimer);
    S.advanceTimer = setTimeout(function () {
      S.advanceTimer = null;
      const g = getGame();
      if (!g || g.phase !== 'reveal' || g.over) return;
      ENGINE.forceAdvanceAfterReveal(g);
      commitHost();
    }, 1150);
  }

  function scheduleAIFlip() {
    if (S.online.role === 'guest') return;
    const game = getGame();
    if (!game || game.phase !== 'flip' || !game.pending) return;
    const actor = ENGINE.playerById(game, game.pending.actorId);
    if (!actor || !actor.isAI) return;
    setTimeout(async function () {
      const g = getGame();
      if (!g || g.phase !== 'flip' || !g.pending) return;
      const player = ENGINE.playerById(g, g.pending.actorId);
      if (!player || !player.isAI) return;
      const should = AI.chooseReroll(g, player, g.pending.card, g.pending.result);
      if (should) {
        const r = ENGINE.resolveFlip(g, player.id, 'reroll');
        if (r.ok) {
          commitHost();
          setTimeout(function () {
            const g2 = getGame();
            if (!g2 || g2.phase !== 'flip' || !g2.pending) return;
            const r2 = ENGINE.resolveFlip(g2, player.id, 'accept');
            if (r2.ok) commitHost();
          }, 1000);
          return;
        }
      }
      const r = ENGINE.resolveFlip(g, player.id, 'accept');
      if (r.ok) commitHost();
    }, 850);
  }

  async function maybeRunAI() {
    if (S.online.role === 'guest') return;
    const game = getGame();
    if (!game || game.phase !== 'action' || game.over || S.aiBusy) return;
    const current = ENGINE.currentPlayer(game);
    if (!current || !current.isAI) return;
    S.aiBusy = true;
    try {
      await wait(650);
      let g = getGame();
      if (!g || g.phase !== 'action') return;
      let player = ENGINE.playerById(g, current.id);
      if (!player || !player.isAI) return;
      const unanimity = AI.proactive(g, player);
      if (unanimity) {
        ENGINE.addChat(g, player.name, unanimity, player.team === viewerFor(g).team ? 'ally' : 'enemy', player.id);
        renderBattle();
        if (S.online.role === 'host') broadcastState();
      }
      let decision = await AI.chooseAction(g, player, {});
      if (!decision) decision = { pass: true };
      if (decision.chat) {
        ENGINE.addChat(g, player.name, decision.chat, player.team === viewerFor(g).team ? 'ally' : 'enemy', player.id);
        renderBattle();
        if (S.online.role === 'host') broadcastState();
        await wait(360);
      }
      g = getGame();
      if (!g || g.phase !== 'action' || g.over) return;

      if (decision.useActive) {
        const r = ENGINE.useActive(g, player.id, decision.activeTargetId);
        if (r.ok) {
          renderBattle();
          if (S.online.role === 'host') broadcastState();
          await wait(620);
        }
        g = getGame();
        if (!g || g.phase !== 'action' || g.over) return;
        decision = await AI.chooseAction(g, player, { remote: false });
        if (!decision) decision = { pass: true };
        if (decision.chat) {
          ENGINE.addChat(g, player.name, decision.chat, player.team === viewerFor(g).team ? 'ally' : 'enemy', player.id);
          renderBattle();
          if (S.online.role === 'host') broadcastState();
          await wait(320);
        }
        g = getGame();
        if (!g || g.phase !== 'action' || g.over) return;
      }

      if (decision.cardIndex != null && decision.cardIndex >= 0 && player.hand[decision.cardIndex]) {
        const r = ENGINE.playCard(g, player.id, decision.cardIndex, decision.targetId || player.selectedTarget);
        if (r.ok) {
          commitHost();
          scheduleAIFlip();
          return;
        }
      }
      const r = ENGINE.endTurn(g, player.id);
      if (r.ok) commitHost();
    } catch (err) {
      console.error('[AI turn]', err);
      const g = getGame();
      const current2 = g ? ENGINE.currentPlayer(g) : null;
      if (g && current2 && current2.isAI) ENGINE.endTurn(g, current2.id);
      commitHost();
    } finally {
      S.aiBusy = false;
      const g = getGame();
      if (g && g.phase === 'action') {
        const current3 = ENGINE.currentPlayer(g);
        if (current3 && current3.isAI) setTimeout(function () { maybeRunAI(); }, 500);
      }
    }
  }

  function wait(ms) { return new Promise(function (resolve) { setTimeout(resolve, SETTINGS.reducedMotion ? Math.min(ms, 250) : ms); }); }

  /* =========================================================
     聊天 / 指令 / 语音
     ========================================================= */
  async function submitChat(text) {
    const raw = String(text || '').trim();
    if (!raw) return;
    const game = getGame();
    if (!game) return;
    const viewer = viewerFor(game);
    if (!viewer) return;
    const input = $('#chat-input');
    if (input) input.value = '';
    Audio.sfx('chat');

    if (S.online.role === 'guest') {
      NET.send({ type: 'chat', text: raw, targetId: S.allyFocus || null });
      return;
    }

    ENGINE.addChat(game, viewer.name, raw, 'player', viewer.id);
    renderChat(game, viewer);
    if (S.online.role === 'host') broadcastState();
    await respondToChat(game, viewer, raw);
  }

  async function respondToChat(game, viewer, text) {
    const teammate = focusedAlly(game, viewer);
    if (teammate) {
      const typingId = 'typing-' + Date.now();
      game.chat.push({ id: typingId, speaker: teammate.name, text: '……', kind: teammate.team === viewer.team ? 'ally' : 'enemy', typing: true, playerId: teammate.id, at: Date.now() });
      renderChat(game, viewer);
      let result = null;
      try {
        result = await AI.handleCommand(game, teammate, viewer, text, { allowRemote: AI.apiReady() });
      } catch (err) {
        game.chat = game.chat.filter(function (m) { return m.id !== typingId; });
        ENGINE.addChat(game, '系统', '（队友 AI 暂时没有回应：' + ((AI.lastError && AI.lastError()) || (err && err.message) || '未知错误') + '）', 'system', null);
        renderBattle();
        if (S.online.role === 'host') broadcastState();
        return;
      }
      game.chat = game.chat.filter(function (m) { return m.id !== typingId; });
      if (result) {
        ENGINE.addChat(game, teammate.name, result.reply, 'ally', teammate.id);
        ENGINE.addLog(game, teammate.name + '：' + result.reply, 'chat');
      }
      renderBattle();
      if (S.online.role === 'host') broadcastState();
      return;
    }

    const opponentAI = game.players.find(function (p) { return p.team !== viewer.team && p.isAI; });
    if (opponentAI) {
      let reply = '';
      try {
        if (AI.apiReady()) reply = await AI.chat(game, opponentAI, text);
      } catch (err) {
        reply = '';
        if (typeof console !== 'undefined' && console.warn) console.warn('[Coinfall AI] chat failed:', (err && err.message) || err);
      }
      if (!reply) {
        const parsed = AI.parseCommand(text);
        if (parsed.intent === 'insult') reply = '嘴上占便宜，牌桌上可不算赢。';
        else if (parsed.intent === 'praise') reply = '别急着夸我，硬币还没落定。';
        else if (parsed.intent === 'greeting') reply = '坐下。你的手牌比你的礼貌更值得看。';
        else reply = AI.taunt(game, opponentAI, game.phase === 'over' ? 'win' : 'start');
      }
      ENGINE.addChat(game, opponentAI.name, reply, 'enemy', opponentAI.id);
      renderBattle();
      if (S.online.role === 'host') broadcastState();
    }
  }

  async function handleIncomingChat(playerId, text, targetId) {
    const game = S.game;
    if (!game) return;
    const player = ENGINE.playerById(game, playerId);
    if (!player) return;
    ENGINE.addChat(game, player.name, text, 'player', player.id);
    const allies = game.players.filter(function (p) {
      return p.team === player.team && p.id !== player.id && p.isAI && p.chars.some(function (u) { return u.hp > 0; });
    });
    const teammate = allies.find(function (p) { return p.id === targetId; }) || allies[0];
    if (teammate) {
      const typingId = 'typing-' + Date.now();
      game.chat.push({ id: typingId, speaker: teammate.name, text: '……', kind: 'ally', typing: true, playerId: teammate.id, at: Date.now() });
      renderBattle();
      broadcastState();
      let result = null;
      try {
        result = await AI.handleCommand(game, teammate, player, text, { allowRemote: AI.apiReady() });
      } catch (err) {
        game.chat = game.chat.filter(function (m) { return m.id !== typingId; });
        ENGINE.addChat(game, '系统', '（队友 AI 暂时没有回应：' + ((AI.lastError && AI.lastError()) || (err && err.message) || '未知错误') + '）', 'system', null);
        afterHostMutation();
        return;
      }
      game.chat = game.chat.filter(function (m) { return m.id !== typingId; });
      if (result) {
        ENGINE.addChat(game, teammate.name, result.reply, 'ally', teammate.id);
        ENGINE.addLog(game, teammate.name + '：' + result.reply, 'chat');
      }
      afterHostMutation();
    } else {
      afterHostMutation();
    }
  }

  function afterHostMutation(schedule) {
    if (S.online.role === 'host') broadcastState();
    renderBattle();
    if (schedule !== false) scheduleRevealAdvance();
    maybeRunAI();
  }

  function startVoiceInput() {
    const SR = root.SpeechRecognition || root.webkitSpeechRecognition;
    if (!SR) {
      toast('当前浏览器不支持语音识别。可以改用文字指挥。', 'warning');
      return;
    }
    try {
      const rec = new SR();
      rec.lang = 'zh-CN';
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      const btn = $('#chat-mic');
      btn.classList.add('is-listening');
      toast('正在听…说出你的指挥。', 'info');
      rec.onresult = function (event) {
        const text = event.results[0][0].transcript;
        btn.classList.remove('is-listening');
        const input = $('#chat-input');
        input.value = text;
        submitChat(text);
      };
      rec.onerror = function () {
        btn.classList.remove('is-listening');
        toast('没有听清，再试一次或改用文字。', 'warning');
      };
      rec.onend = function () { btn.classList.remove('is-listening'); };
      rec.start();
    } catch (e) {
      toast('语音识别启动失败。', 'error');
    }
  }

  /* =========================================================
     结算
     ========================================================= */
  function maybeShowOver() {
    const game = getGame();
    if (!game || !game.over || S.overShown) return;
    S.overShown = true;
    setTimeout(function () { showOverModal(game); }, 650);
  }

  function showOverModal(game) {
    const viewer = viewerFor(game);
    const win = game.over.winnerTeam === viewer.team;
    const storyWin = game.story && game.story.chapterIndex < D.STORY.chapters.length - 1;
    const storyEnd = game.story && game.story.chapterIndex === D.STORY.chapters.length - 1;
    const stats = viewer.stats || {};
    const buttons = [];
    if (storyWin && win) buttons.push('<button class="btn btn--primary" data-action="next-story">进入下一章 · ' + esc(D.STORY.chapters[game.story.chapterIndex + 1].title) + '</button>');
    if (S.online.role) {
      buttons.push('<button class="btn btn--secondary" data-action="online-lobby">返回联机大厅</button>');
    } else {
      buttons.push('<button class="btn btn--primary" data-action="rematch">再来一局</button>');
    }
    buttons.push('<button class="btn btn--quiet" data-action="leave-battle">返回赛场</button>');
    const third = win && storyEnd && !S.online.role;
    openModal('<div class="result-sheet ' + (win ? 'is-win' : 'is-loss') + '">' +
      '<div class="result-sigil">' + (win ? '正' : '反') + '</div>' +
      '<div class="eyebrow">' + (game.over.forfeit ? 'FORFEIT' : 'THE VERDICT') + '</div>' +
      '<h2>' + (win ? '你赢了这局。' : '这局归冠军。') + '</h2>' +
      '<p>' + esc(game.over.reason) + '</p>' +
      '<div class="result-stats">' +
        '<div><strong>' + (stats.damageDealt || 0) + '</strong><span>造成伤害</span></div>' +
        '<div><strong>' + (stats.healed || 0) + '</strong><span>治疗</span></div>' +
        '<div><strong>' + (stats.cardsPlayed || 0) + '</strong><span>打出卡牌</span></div>' +
        '<div><strong>' + (stats.rerolls || 0) + '</strong><span>重抛</span></div>' +
      '</div>' +
      (storyEnd && win ? '<div class="ending-note">八大赛区保留了各自不完美的结局。赛场仍然开着，硬币仍在旋转。<br><small>隐藏结局「第三面」需要队友默契 ≥10。在 2v2 中试试。</small></div>' : '') +
      (third ? '<div class="ending-note">你把硬币立了起来。它没有倒向正，也没有倒向反。</div>' : '') +
      '<div class="modal-actions">' + buttons.join('') + '</div>' +
    '</div>', { dialogClass: 'modal-dialog--result' });
    Audio.narrator(win ? 'win' : 'lose');
  }

  function restartMatch() {
    closeModal();
    if (S.online.role) {
      leaveRoom();
      showScreen('lobby');
      return;
    }
    if (!S.currentConfig) { showScreen('home'); return; }
    S.setup.modeId = S.currentConfig.modeId;
    S.setup.charId = S.currentConfig.charId || S.setup.charId;
    S.setup.charId2 = S.currentConfig.charId2 || S.setup.charId2;
    S.setup.allyCharId = S.currentConfig.allyCharId || S.setup.allyCharId;
    S.setup.theme = S.currentConfig.theme || S.setup.theme;
    S.setup.deckMode = S.currentConfig.deckMode || S.setup.deckMode;
    S.setup.aiLevel = S.currentConfig.aiLevel || S.setup.aiLevel;
    startLocalMatch();
  }

  function nextStory() {
    closeModal();
    const current = getGame();
    const next = current && current.story ? current.story.chapterIndex + 1 : 0;
    S.setup.modeId = 'story';
    S.setup.storyChapter = Math.min(next, D.STORY.chapters.length - 1);
    persistSetup();
    S.setup.deckMode = S.setup.deckMode;
    startLocalMatch();
  }

  function leaveBattle() {
    if (S.online.role) {
      leaveRoom();
      showScreen('lobby');
      return;
    }
    if (S.advanceTimer) clearTimeout(S.advanceTimer);
    if (S.aiTimer) clearTimeout(S.aiTimer);
    S.game = null;
    S.overShown = false;
    S.selectedCardIndex = null;
    showScreen('home');
  }

  /* =========================================================
     场景与音景面板（主界面 / 战斗背景、BGM、氛围音）
     ========================================================= */
  var SCENE_REALMS = ['abyss', 'steam', 'cultivation', 'fantasy', 'neon', 'wa', 'west', 'anime'];
  var sceneBgmPlaying = true;

  function realmLabel(id) {
    var s = D.STYLES[id];
    return s ? (s.realm || s.name || id) : id;
  }

  function realmSub(id) {
    var s = D.STYLES[id];
    return s ? (s.name || '') : '';
  }

  function sceneOptionHTML(kind, value, label, sub, active) {
    return '<button type="button" class="scene-option' + (active ? ' is-active' : '') + '" data-scene-' + kind + '="' + esc(value) + '" aria-pressed="' + (active ? 'true' : 'false') + '">' +
      '<strong>' + esc(label) + '</strong>' + (sub ? '<small>' + esc(sub) + '</small>' : '') +
    '</button>';
  }

  function sceneRealmOptionsHTML(kind, current, extras) {
    var html = (extras || []).map(function (item) {
      return sceneOptionHTML(kind, item.value, item.label, item.sub || '', current === item.value);
    }).join('');
    html += SCENE_REALMS.map(function (id) {
      return sceneOptionHTML(kind, id, realmLabel(id), realmSub(id), current === id);
    }).join('');
    return html;
  }

  function sceneVolumeHTML(id, value, label) {
    var num = Number(value);
    if (isNaN(num)) num = 0;
    var pct = Math.round(num * 100);
    return '<label class="scene-vol" for="' + id + '"><span>' + esc(label) + '</span>' +
      '<input type="range" id="' + id + '" min="0" max="1" step="0.05" value="' + num.toFixed(2) + '">' +
      '<b id="' + id + '-label">' + pct + '%</b></label>';
  }

  function openScenePanel() {
    var home = SETTINGS.homeBg || 'menu';
    var battle = SETTINGS.battleBg || 'theme';
    var bgm = SETTINGS.bgmTrack || 'theme';
    var ambientTheme = SETTINGS.ambientTheme || 'theme';
    sceneBgmPlaying = !!SETTINGS.music;
    openModal('<div class="scene-sheet">' +
      '<div class="modal-head"><div><div class="eyebrow">SCENE &amp; SOUNDSCAPE</div><h2>场景与音景</h2><p>主界面、战斗背景与配乐氛围。改动立即生效，并写入本机设置。</p></div></div>' +
      '<div class="scene-panel">' +

        '<section class="scene-group" data-scene-group="home">' +
          '<div class="scene-group__head"><h3>主界面背景</h3><small>首页、图鉴与档案页共用；选「主菜单」回到默认封面。</small></div>' +
          '<div class="scene-grid">' + sceneRealmOptionsHTML('home', home, [{ value: 'menu', label: '主菜单', sub: '默认封面' }]) + '</div>' +
        '</section>' +

        '<section class="scene-group" data-scene-group="battle">' +
          '<div class="scene-group__head"><h3>战斗背景</h3><small>「跟随主题」会随所选角色风格自动切换。</small></div>' +
          '<div class="scene-grid">' + sceneRealmOptionsHTML('battle', battle, [
            { value: 'theme', label: '跟随主题', sub: '默认' },
            { value: 'battle-bg', label: '默认战斗图', sub: '固定' }
          ]) + '</div>' +
        '</section>' +

        '<section class="scene-group" data-scene-group="bgm">' +
          '<div class="scene-group__head"><h3>背景音乐（BGM）</h3><small>八大赛区各有专属曲目，主菜单曲目独立。</small></div>' +
          '<div class="scene-grid">' + sceneRealmOptionsHTML('bgm', bgm, [
            { value: 'theme', label: '跟随主题', sub: '默认' },
            { value: 'menu', label: '主菜单', sub: '菜单曲' }
          ]) + '</div>' +
          '<div class="scene-toolbar">' +
            '<button type="button" class="btn btn--secondary btn--sm" id="scene-bgm-toggle">' + (sceneBgmPlaying ? '停止播放' : '播放') + '</button>' +
            sceneVolumeHTML('scene-bgm-volume', SETTINGS.bgmVolume, '音量') +
            '<span class="scene-note" id="scene-bgm-note"></span>' +
          '</div>' +
        '</section>' +

        '<section class="scene-group" data-scene-group="ambient" id="scene-ambient-group">' +
          '<div class="scene-group__head"><h3>氛围音</h3><small>低频底噪与零星音，叠加在 BGM 之上。</small></div>' +
          '<label class="toggle-row"><span><strong>启用氛围音</strong><small>关闭后主题与音量不可调</small></span><input type="checkbox" id="scene-ambient-enabled" ' + (SETTINGS.ambient ? 'checked' : '') + '></label>' +
          '<div class="scene-grid">' + sceneRealmOptionsHTML('ambient', ambientTheme, [
            { value: 'theme', label: '跟随主题', sub: '默认' },
            { value: 'wind', label: '风声', sub: '旷野低鸣' },
            { value: 'rain', label: '雨声', sub: '淅沥白噪' },
            { value: 'star', label: '星空嗡嗡', sub: '星际低鸣' },
            { value: 'clock', label: '机械滴答', sub: '时钟节律' }
          ]) + '</div>' +
          '<div class="scene-toolbar">' + sceneVolumeHTML('scene-ambient-volume', SETTINGS.ambientVolume, '音量') + '</div>' +
        '</section>' +

      '</div>' +
      '<div class="modal-actions"><button class="btn btn--primary" data-close-modal>完成</button></div>' +
    '</div>', { dialogClass: 'modal-dialog--wide' });

    function markSceneActive(kind, btn) {
      $$('[data-scene-' + kind + ']').forEach(function (b) {
        var on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }

    function syncBgmToggle() {
      var toggle = $('#scene-bgm-toggle');
      if (toggle) toggle.textContent = sceneBgmPlaying ? '停止播放' : '播放';
      var note = $('#scene-bgm-note');
      if (note) note.textContent = SETTINGS.music ? '' : '背景音乐已在设置中关闭，播放也不会有声音。';
    }

    function syncAmbientControls() {
      var group = $('#scene-ambient-group');
      if (group) group.classList.toggle('is-disabled', !SETTINGS.ambient);
      var vol = $('#scene-ambient-volume');
      if (vol) vol.disabled = !SETTINGS.ambient;
    }

    /* 主界面背景：立即应用并持久化 */
    $$('[data-scene-home]').forEach(function (btn) {
      btn.onclick = function () {
        SETTINGS.homeBg = btn.dataset.sceneHome;
        saveSettings();
        markSceneActive('home', btn);
        FX.applyBackground();
        Audio.sfx('click');
      };
    });

    /* 战斗背景：立即应用并持久化 */
    $$('[data-scene-battle]').forEach(function (btn) {
      btn.onclick = function () {
        SETTINGS.battleBg = btn.dataset.sceneBattle;
        saveSettings();
        markSceneActive('battle', btn);
        FX.applyBackground();
        Audio.sfx('click');
      };
    });

    /* BGM：切曲、播放/停止、音量 */
    $$('[data-scene-bgm]').forEach(function (btn) {
      btn.onclick = function () {
        SETTINGS.bgmTrack = btn.dataset.sceneBgm;
        saveSettings();
        markSceneActive('bgm', btn);
        sceneBgmPlaying = true;
        Audio.refreshBgm();
        syncBgmToggle();
        Audio.sfx('click');
      };
    });
    var bgmToggle = $('#scene-bgm-toggle');
    if (bgmToggle) bgmToggle.onclick = function () {
      if (sceneBgmPlaying) { Audio.stopBgm(); sceneBgmPlaying = false; }
      else { Audio.refreshBgm(); sceneBgmPlaying = true; }
      syncBgmToggle();
      Audio.sfx('click');
    };
    var bgmVol = $('#scene-bgm-volume');
    if (bgmVol) bgmVol.oninput = function () {
      Audio.setBgmVolume(bgmVol.value);
      saveSettings();
      var label = $('#scene-bgm-volume-label');
      if (label) label.textContent = Math.round(SETTINGS.bgmVolume * 100) + '%';
    };

    /* 氛围音：开关、主题、音量 */
    var ambientToggle = $('#scene-ambient-enabled');
    if (ambientToggle) ambientToggle.onchange = function () {
      SETTINGS.ambient = !!ambientToggle.checked;
      saveSettings();
      Audio.setAmbientEnabled(SETTINGS.ambient);
      syncAmbientControls();
      Audio.sfx('click');
    };
    $$('[data-scene-ambient]').forEach(function (btn) {
      btn.onclick = function () {
        SETTINGS.ambientTheme = btn.dataset.sceneAmbient;
        saveSettings();
        markSceneActive('ambient', btn);
        Audio.setAmbientEnabled(SETTINGS.ambient);
        try { Audio.refreshAmbient(); } catch (e) {}
        Audio.sfx('click');
      };
    });
    var ambientVol = $('#scene-ambient-volume');
    if (ambientVol) ambientVol.oninput = function () {
      Audio.setAmbientVolume(ambientVol.value);
      saveSettings();
      var label = $('#scene-ambient-volume-label');
      if (label) label.textContent = Math.round(SETTINGS.ambientVolume * 100) + '%';
    };

    syncBgmToggle();
    syncAmbientControls();
  }

  /* =========================================================
     设置 / 规则
     ========================================================= */
  function openSettings(tab) {
    tab = tab || 'game';
    const ai = AI.config;
    const net = NET.config;
    openModal('<div class="settings-sheet">' +
      '<div class="modal-head"><div><div class="eyebrow">SYSTEM</div><h2>设置</h2><p>声音、模型接口与联机配置。</p></div></div>' +
      '<div class="settings-tabs"><button data-settings-tab="game" class="' + (tab === 'game' ? 'is-active' : '') + '">游戏</button><button data-settings-tab="ai" class="' + (tab === 'ai' ? 'is-active' : '') + '">AI 接口</button><button data-settings-tab="network" class="' + (tab === 'network' ? 'is-active' : '') + '">联机</button><button data-settings-tab="about" class="' + (tab === 'about' ? 'is-active' : '') + '">关于</button></div>' +
      '<div class="settings-body">' +
        '<div class="settings-pane" data-settings-pane="game" ' + (tab === 'game' ? '' : 'hidden') + '>' +
          '<label class="toggle-row"><span><strong>背景音乐</strong><small>八大赛区真人级氛围配乐 + 全套音效反馈</small></span><input type="checkbox" id="set-music" ' + (SETTINGS.music ? 'checked' : '') + '></label>' +
          '<label class="toggle-row"><span><strong>音效</strong><small>抛币、命中、治疗与技能反馈</small></span><input type="checkbox" id="set-sfx" ' + (SETTINGS.sfx ? 'checked' : '') + '></label>' +
          '<label class="toggle-row"><span><strong>角色语音</strong><small>角色真人配音与 5 套旁白音色包，缺失即静默</small></span><input type="checkbox" id="set-voice" ' + (SETTINGS.voice ? 'checked' : '') + '></label>' +
          '<div class="settings-subhead">旁白与语音</div>' +
          '<div class="settings-row"><label>旁白音色包</label><div class="settings-inline"><select id="set-voice-pack">' +
            '<option value="house"' + (SETTINGS.voicePack === 'house' ? ' selected' : '') + '>冠军·男中音</option>' +
            '<option value="mistress"' + (SETTINGS.voicePack === 'mistress' ? ' selected' : '') + '>御姐·魅影</option>' +
            '<option value="youth"' + (SETTINGS.voicePack === 'youth' ? ' selected' : '') + '>少年·热血</option>' +
            '<option value="elder"' + (SETTINGS.voicePack === 'elder' ? ' selected' : '') + '>老者·值班人</option>' +
            '<option value="mystic"' + (SETTINGS.voicePack === 'mystic' ? ' selected' : '') + '>神秘女声·回声</option>' +
          '</select><button type="button" class="btn btn--secondary btn--sm" id="preview-pack">试听</button></div></div>' +
          '<div class="settings-subhead">AI 人设</div>' +
          '<div class="persona-grid" id="set-ai-persona">' + Object.keys(AI.PERSONAS).map(function (pid) {
            var p = AI.PERSONAS[pid];
            return '<button type="button" class="persona-card' + (SETTINGS.aiPersona === pid ? ' is-active' : '') + '" data-persona="' + pid + '">' +
              '<img src="assets/art/portraits/ai-' + pid + '.webp" alt="" loading="lazy" onerror="this.style.display=\'none\'">' +
              '<b>' + esc(p.name) + '</b><small>' + esc(p.tag) + ' · ' + esc(p.quirk) + '</small></button>';
          }).join('') + '</div>' +
          '<label class="toggle-row"><span><strong>AI 语音</strong><small>各人设专属真人配音，缺失自动静默</small></span><input type="checkbox" id="set-ai-voice" ' + (SETTINGS.aiVoice ? 'checked' : '') + '></label>' +
          '<div class="settings-row"><label>硬币皮肤</label>' + skinCardGridHTML() + '<input type="hidden" id="set-coin-skin" value="' + esc(SETTINGS.coinSkin || 'bronze') + '"></div>' +
          '<label class="toggle-row"><span><strong>减少动态效果</strong><small>降低粒子与过场动画</small></span><input type="checkbox" id="set-motion" ' + (SETTINGS.reducedMotion ? 'checked' : '') + '></label>' +
          '<div class="settings-note">若无声音请先在页面点一下以解锁音频（浏览器要求至少一次用户交互）。语音全部为真人配音文件，缺失时自动静默。</div>' +
        '</div>' +
        '<div class="settings-pane" data-settings-pane="ai" ' + (tab === 'ai' ? '' : 'hidden') + '>' +
          '<div class="settings-note settings-note--warning">公网页面上，此密钥对访问者可见。建议在网关控制台为 Key 设置用量限额；出现异常调用时请及时轮换密钥。</div>' +
          '<label class="field"><span>接口地址（OpenAI 兼容）</span><input id="set-ai-base" value="' + esc(ai.baseUrl) + '" autocomplete="off"></label>' +
          '<div class="field-row"><label class="field"><span>模型</span><input id="set-ai-model" value="' + esc(ai.model) + '"></label><label class="field"><span>超时（毫秒）</span><input id="set-ai-timeout" type="number" value="' + esc(ai.timeoutMs) + '"></label></div>' +
          '<label class="field"><span>API Key</span><input id="set-ai-key" type="password" value="' + esc(ai.apiKey) + '" placeholder="sk-…" autocomplete="new-password"></label>' +
          '<label class="toggle-row"><span><strong>启用远程 AI</strong><small>聊天、指令理解与高难决策可调用模型</small></span><input type="checkbox" id="set-ai-enabled" ' + (ai.enabled ? 'checked' : '') + '></label>' +
          '<label class="toggle-row"><span><strong>困难 AI 使用远程决策</strong><small>可能增加思考时间；失败自动回退本地启发式</small></span><input type="checkbox" id="set-ai-battle" ' + (ai.remoteBattle ? 'checked' : '') + '></label>' +
          '<div class="settings-inline"><button class="btn btn--secondary btn--sm" id="test-ai">测试连接</button><span id="ai-test-result" class="microcopy"></span></div>' +
        '</div>' +
        '<div class="settings-pane" data-settings-pane="network" ' + (tab === 'network' ? '' : 'hidden') + '>' +
          '<div class="settings-note">公网联机（零配置）：直接使用 PeerJS 公网信令，房间号即暗号，无需任何配置。若所在网络屏蔽公共 PeerServer，可在下方高级自定义中自建 PeerServer。</div>' +
          '<div class="field-row"><label class="field"><span>PeerServer Host（可选）</span><input id="set-peer-host" value="' + esc(net.peer.host || '') + '" placeholder="peer.example.com"></label><label class="field"><span>端口</span><input id="set-peer-port" type="number" value="' + esc(net.peer.port || 443) + '"></label></div>' +
          '<label class="toggle-row"><span><strong>PeerServer 使用 HTTPS</strong><small>公网部署建议开启</small></span><input type="checkbox" id="set-peer-secure" ' + (net.peer.secure !== false ? 'checked' : '') + '></label>' +
          '<details class="advanced-block">' +
            '<summary>高级自定义（Supabase Realtime，可选）</summary>' +
            '<div class="settings-note">不推荐公网默认使用。仅当你想用自己的 Supabase 项目替代 PeerJS 信令时填写：创建免费项目并执行 <code>supabase/schema.sql</code>。</div>' +
            '<label class="field"><span>Supabase URL</span><input id="set-sb-url" value="' + esc(net.supabase.url || '') + '" placeholder="https://xxxx.supabase.co" autocomplete="off"></label>' +
            '<label class="field"><span>Supabase anon key</span><input id="set-sb-key" type="password" value="' + esc(net.supabase.anonKey || '') + '" placeholder="eyJ…" autocomplete="new-password"></label>' +
          '</details>' +
        '</div>' +
        '<div class="settings-pane" data-settings-pane="about" ' + (tab === 'about' ? '' : 'hidden') + '>' +
          '<div class="about-block"><span class="about-coin">◉</span><h3>星杯赛场 · COINFALL</h3><p>纯前端回合制抛币卡牌对战。44 名角色，190 张技能卡，19 种模式（含 8 个娱乐模式），三段 Boss 剧情，以及会顶嘴的 AI 队友。</p>' +
          '<p class="microcopy">版本 ' + D.version + ' · 无框架依赖 · 可离线单机 · 局域网点对点 · 公网 Supabase Realtime</p>' +
          '<div class="about-links"><button class="text-btn" data-action="rules">规则手册</button><button class="text-btn" data-action="copy-art-prompts">复制全部美术提示词</button></div></div>' +
        '</div>' +
      '</div>' +
      '<div class="modal-actions settings-actions"><button class="btn btn--quiet" data-close-modal>取消</button><button class="btn btn--primary" id="save-settings">保存设置</button></div>' +
    '</div>', { dialogClass: 'modal-dialog--wide' });

    $$('[data-settings-tab]').forEach(function (b) {
      b.onclick = function () {
        $$('[data-settings-tab]').forEach(function (x) { x.classList.toggle('is-active', x === b); });
        $$('[data-settings-pane]').forEach(function (p) { p.hidden = p.dataset.settingsPane !== b.dataset.settingsTab; });
      };
    });
    const testBtn = $('#test-ai');
    if (testBtn) testBtn.onclick = async function () {
      const key = $('#set-ai-key').value.trim();
      const base = $('#set-ai-base').value.trim();
      const model = $('#set-ai-model').value.trim();
      const out = $('#ai-test-result');
      if (!key) { out.textContent = '请先填写 API Key。'; return; }
      testBtn.disabled = true;
      out.textContent = '正在连接…';
      const prevTimeout = AI.config.timeoutMs;
      AI.configure({ enabled: true, apiKey: key, baseUrl: base, model: model, timeoutMs: 8000 });
      try {
        const reply = await AI.remoteChat([{ role: 'user', content: '只回复两个字：在。' }], { maxTokens: 10 });
        out.textContent = '连接成功：' + reply.slice(0, 20);
      } catch (err) {
        out.textContent = '失败：' + (err.message || err);
      } finally {
        AI.configure({ timeoutMs: prevTimeout });
        testBtn.disabled = false;
      }
    };
    $$('.skin-card').forEach(function (card) {
      card.onclick = function () {
        $$('.skin-card').forEach(function (c) { c.classList.remove('is-active'); });
        card.classList.add('is-active');
        const hidden = $('#set-coin-skin');
        if (hidden) hidden.value = card.dataset.skin;
      };
    });
    const previewPackBtn = $('#preview-pack');
    if (previewPackBtn) previewPackBtn.onclick = function () {
      const packSelect = $('#set-voice-pack');
      SETTINGS.voicePack = packSelect ? packSelect.value : (SETTINGS.voicePack || 'house');
      Audio.unlock();
      Audio.previewNarrator(SETTINGS.voicePack);
    };
    $$('#set-ai-persona .persona-card').forEach(function (card) {
      card.onclick = function () {
        $$('#set-ai-persona .persona-card').forEach(function (c) { c.classList.remove('is-active'); });
        card.classList.add('is-active');
        SETTINGS.aiPersona = card.dataset.persona;
        AI.setPersona(SETTINGS.aiPersona);
        saveSettings();
      };
    });
    $('#save-settings').onclick = function () {
      SETTINGS.music = $('#set-music').checked;
      SETTINGS.sfx = $('#set-sfx').checked;
      SETTINGS.voice = $('#set-voice').checked;
      SETTINGS.reducedMotion = $('#set-motion').checked;
      SETTINGS.coinSkin = $('#set-coin-skin').value;
      SETTINGS.voicePack = ($('#set-voice-pack') || {}).value || 'house';
      SETTINGS.aiVoice = $('#set-ai-voice').checked;
      saveSettings();
      applyCoinSkin();
      Audio.setMuted();
      updateAudioButton();
      AI.configure({
        enabled: $('#set-ai-enabled').checked,
        baseUrl: $('#set-ai-base').value.trim(),
        apiKey: $('#set-ai-key').value.trim(),
        model: $('#set-ai-model').value.trim() || 'deepseek-v4.1-flash-1017',
        remoteBattle: $('#set-ai-battle').checked,
        timeoutMs: Math.max(2000, Math.min(120000, Number($('#set-ai-timeout').value) || 30000))
      });
      NET.configure({
        peer: {
          host: $('#set-peer-host').value.trim(),
          port: Number($('#set-peer-port').value) || 443,
          secure: $('#set-peer-secure').checked
        },
        supabase: {
          url: $('#set-sb-url').value.trim(),
          anonKey: $('#set-sb-key').value.trim()
        }
      });
      closeModal();
      toast('设置已保存。', 'success');
      if (S.screen === 'lobby') renderLobby();
    };
  }

  function openRules() {
    openModal('<div class="rules-sheet">' +
      '<div class="modal-head"><div><div class="eyebrow">THE RULEBOOK</div><h2>如何玩星杯赛场</h2><p>五分钟学会，五秒钟输掉。</p></div></div>' +
      '<div class="rules-steps">' +
        '<div><span>01</span><h3>选角色与卡组</h3><p>每名角色 5 点生命，拥有一个全程生效的被动和一个有次数限制的主动技。技能卡组随机或自选 10 张。</p></div>' +
        '<div><span>02</span><h3>每回合一张</h3><p>开局 3 张手牌，每回合补至 3 张。打出一张技能卡后抛币：正面触发增益，反面触发反噬。主动技不占出牌次数。</p></div>' +
        '<div><span>03</span><h3>重抛一次</h3><p>每名玩家整局只有一次重抛权，可在硬币落地后、效果结算前使用。无尽赌徒模式取消重抛，效果翻倍。</p></div>' +
        '<div><span>04</span><h3>把对手打到 0</h3><p>大乱斗中每名玩家有两名角色，全部倒下才判负。2v2 中与 AI 队友并肩，点击敌方角色可切换目标。</p></div>' +
      '</div>' +
      '<div class="rules-section"><h3>队友指挥</h3><p>在 2v2 的战术频道输入自然语言，例如“集火 B1”“先保命”“给我治疗”“别用主动”“过牌找机会”。AI 会读取血量、手牌与资源，判断指令是否合理：合理则执行，不合理会拒绝并说明原因。连续瞎指挥会降低默契，正确的决断会提升默契。它还拥有自己的情绪与说话方式。</p></div>' +
      '<div class="rules-section"><h3>卡牌与数值</h3><div class="rules-cards"><div><b>攻击</b><span>1–3 点伤害，附带弃牌、破盾或抽牌。</span></div><div><b>防御治疗</b><span>1–3 点治疗/护盾，代价可能是自伤或资敌。</span></div><div><b>功能控制</b><span>弃牌、封印、干扰补牌、过牌。</span></div><div><b>高风险</b><span>更高收益，更重的反噬。不会一卡秒杀满血。</span></div><div><b>风格专属</b><span>八大赛区各自的签名技，主题与机制统一。</span></div></div></div>' +
      '<div class="rules-section"><h3>胜利条件</h3><p>将对方队伍的所有角色生命降至 0。生命不会低于 0；护盾最多 5 点。快速模式生命上限为 3。</p></div>' +
      '<div class="modal-actions"><button class="btn btn--primary" data-close-modal>明白了</button></div>' +
    '</div>', { dialogClass: 'modal-dialog--wide' });
  }

  function copyAllArtPrompts() {
    const text = [
      '【星杯赛场 · 角色立绘提示词】',
      D.CHARACTERS.map(function (c) { return c.id + ' ' + c.name + '：' + c.artPrompt; }).join('\n'),
      '',
      '【技能卡卡面提示词】',
      D.CARDS.map(function (c) { return c.id + ' ' + c.name + '：' + c.artPrompt; }).join('\n'),
      '',
      '【Boss 立绘提示词】',
      D.BOSSES.map(function (b) { return b.id + ' ' + b.name + '：' + b.artPrompt; }).join('\n')
    ].join('\n');
    copyText(text);
  }

  /* =========================================================
     全局事件
     ========================================================= */
  function bindEvents() {
    document.addEventListener('click', function (event) {
      const nav = event.target.closest('[data-nav]');
      if (nav) { navigate(nav.dataset.nav); return; }
      const mode = event.target.closest('[data-mode]');
      if (mode) { openSetup(mode.dataset.mode); return; }
      const action = event.target.closest('[data-action]');
      if (action) { handleAction(action.dataset.action, action, event); return; }
      const teamSizeBtn = event.target.closest('[data-team-size]');
      if (teamSizeBtn) {
        const side = teamSizeBtn.dataset.teamSize;
        const size = Number(teamSizeBtn.dataset.size);
        if (side === 'A') S.setup.teamA = size; else S.setup.teamB = size;
        persistSetup();
        renderSetup();
        Audio.sfx('click');
        return;
      }
      const allyFocus = event.target.closest('[data-ally-focus]');
      if (allyFocus) {
        S.allyFocus = allyFocus.dataset.allyFocus;
        renderBattle();
        return;
      }
      const charEl = event.target.closest('[data-char-id]');
      if (charEl && !event.target.closest('[data-open-char]') && !event.target.closest('.archive-char')) {
        selectCharacter(charEl.dataset.charId, charEl);
        return;
      }
      const openChar = event.target.closest('[data-open-char]');
      if (openChar) { openCharacterDetail(openChar.dataset.openChar); return; }
      const charMode = event.target.closest('[data-char-mode]');
      if (charMode) {
        S.setup.charMode = charMode.dataset.charMode;
        persistSetup(); renderSetup(); return;
      }
      const charStyle = event.target.closest('[data-char-style]');
      if (charStyle) {
        S.setup.charStyleFilter = charStyle.dataset.charStyle;
        renderSetup(); return;
      }
      const deckMode = event.target.closest('[data-deck-mode]');
      if (deckMode) {
        S.setup.deckMode = deckMode.dataset.deckMode;
        persistSetup();
        if (S.setup.deckMode === 'custom' && S.setup.customDeck.length === 0) { openDeckBuilder(); return; }
        renderSetup(); return;
      }
      const hpMult = event.target.closest('[data-hp-mult]');
      if (hpMult) {
        S.setup.hpMultiplier = Number(hpMult.dataset.hpMult);
        persistSetup(); renderSetup(); return;
      }
      const theme = event.target.closest('.theme-chip[data-theme]');
      if (theme) {
        S.setup.theme = theme.dataset.theme;
        persistSetup(); renderSetup();
        FX.setTheme(S.setup.theme); Audio.startBgm(S.setup.theme);
        return;
      }
      const story = event.target.closest('[data-story]');
      if (story) {
        S.setup.storyChapter = Number(story.dataset.story);
        persistSetup(); renderSetup(); return;
      }
      const realm = event.target.closest('[data-realm]');
      if (realm) {
        showScreen('world');
        setTimeout(function () {
          const s = D.STYLES[realm.dataset.realm];
          const buttons = $$('#world-nav button');
          const found = buttons.find(function (b) { return b.textContent.indexOf('八大赛区') >= 0; });
          if (found) found.click();
          else if (s) { const el = $('#world-realms'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }
        }, 80);
        return;
      }
      const archiveTab = event.target.closest('[data-archive-tab]');
      if (archiveTab) { S.archive.tab = archiveTab.dataset.archiveTab; renderArchive(); return; }
      const roleFilter = event.target.closest('[data-archive-role]');
      if (roleFilter) { S.archive.role = roleFilter.dataset.archiveRole; renderArchive(); return; }
      const catFilter = event.target.closest('[data-archive-category]');
      if (catFilter) { S.archive.category = catFilter.dataset.archiveCategory; renderArchive(); return; }
      const target = event.target.closest('[data-set-target]');
      if (target) { setBattleTarget(target.dataset.setTarget); return; }
      const flipChoice = event.target.closest('[data-flip-choice]');
      if (flipChoice) { chooseFlip(flipChoice.dataset.flipChoice); return; }
      const guessBtn = event.target.closest('[data-guess]');
      if (guessBtn) { chooseGuess(guessBtn.dataset.guess); return; }
      const row = event.target.closest('[data-flip-choice]');
      if (row) return;
      const order = event.target.closest('[data-order]');
      if (order) { submitChat(order.dataset.order); return; }
      const sideTab = event.target.closest('[data-side-tab]');
      if (sideTab) {
        $$('#side-tabs button').forEach(function (b) { b.classList.toggle('is-active', b === sideTab); });
        $$('.side-panel').forEach(function (p) { p.hidden = p.dataset.sidePanel !== sideTab.dataset.sideTab; });
        return;
      }
      if (event.target.closest('[data-close-modal]')) { closeModal(); return; }
      if (event.target.closest('[data-copy-room]')) { copyText(S.online.code || ''); return; }
    });

    document.addEventListener('submit', function (event) {
      if (event.target.id === 'chat-form') {
        event.preventDefault();
        submitChat($('#chat-input').value);
      }
    });

    document.addEventListener('input', function (event) {
      if (event.target.id === 'archive-search') {
        S.archive.query = event.target.value;
        renderArchive();
        const input = $('#archive-search');
        if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
      }
    });

    $('#archive-style-filter').addEventListener('change', function (e) {
      S.archive.style = e.target.value;
      renderArchive();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        const modal = $('#modal-root');
        if (modal && !modal.hidden) closeModal();
      }
      if (e.key === 'Enter' && document.activeElement && document.activeElement.id === 'chat-input') {
        e.preventDefault();
        submitChat(document.activeElement.value);
      }
    });
    window.addEventListener('beforeunload', function () {
      if (S.online.role) NET.leave();
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { Audio.stopBgm(); Audio.stopAmbient(); }
      else {
        if (S.screen === 'battle' || S.screen === 'home') Audio.startBgm(S.battleTheme || 'abyss');
        Audio.refreshAmbient();
      }
    });
    $('#create-room').addEventListener('click', createRoom);
    $('#join-room').addEventListener('click', joinRoom);
    $('#quick-match').addEventListener('click', quickMatch);
    $('#one-click-room').addEventListener('click', oneClickRoom);
    $('#start-online').addEventListener('click', startOnlineHost);
    $('#leave-room').addEventListener('click', leaveRoom);
    $('#host-fill-ai').addEventListener('change', renderLobby);
    $('#host-mode').addEventListener('change', renderLobby);
    $('#host-team-a').addEventListener('change', renderLobby);
    $('#host-team-b').addEventListener('change', renderLobby);
    $('#chat-mic').addEventListener('click', startVoiceInput);
    $('#start-match').addEventListener('click', startLocalMatch);
    $$('[data-transport]').forEach(function (b) {
      b.addEventListener('click', function () {
        S.lobby.transport = b.dataset.transport;
        $$('[data-transport]').forEach(function (x) { x.classList.toggle('is-active', x === b); });
        renderLobby();
      });
    });
    window.addEventListener('resize', function () { FX.resize(); });
  }

  function selectCharacter(id, el) {
    if (S.setup.modeId === 'brawl' && el && el.closest('#second-character-grid')) {
      S.setup.charId2 = id;
      if (D.byId.character(id)) S.setup.theme = D.byId.character(id).style;
    } else {
      S.setup.charId = id;
      if (D.byId.character(id)) S.setup.theme = D.byId.character(id).style;
    }
    S.setup.charMode = 'specified';
    persistSetup();
    renderSetup();
    Audio.sfx('click');
  }

  function handleAction(name, el, event) {
    switch (name) {
      case 'enter-table': enterTable(); break;
      case 'toggle-audio': Audio.unlock(); Audio.toggle(); updateAudioButton(); break;
      case 'settings': openSettings(); break;
      case 'scene': openScenePanel(); break;
      case 'rules': openRules(); break;
      case 'open-deck-builder': openDeckBuilder(); break;
      case 'random-deck': randomDeckSelection(); break;
      case 'random-ally':
        S.setup.allyCharId = D.randomCharacters(1)[0].id;
        persistSetup(); renderSetup(); Audio.sfx('click'); break;
      case 'play-selected': playSelected(); break;
      case 'cancel-selected': S.selectedCardIndex = null; renderBattle(); break;
      case 'use-skill': dispatchAction({ kind: 'active', targetId: viewerFor(getGame()).selectedTarget }); break;
      case 'switch-char': dispatchAction({ kind: 'switch', index: Number(el.dataset.index) }); break;
      case 'end-turn': dispatchAction({ kind: 'endTurn' }); break;
      case 'rematch': restartMatch(); break;
      case 'next-story': nextStory(); break;
      case 'leave-battle': closeModal(); leaveBattle(); break;
      case 'online-lobby': closeModal(); leaveRoom(); showScreen('lobby'); break;
      case 'game-over': maybeShowOverForce(); break;
      case 'copy-room': copyText(S.online.code || ''); break;
      case 'net-config': openSettings('network'); break;
      case 'copy-art-prompts': copyAllArtPrompts(); break;
      case 'random-char': S.setup.charMode = 'random'; persistSetup(); renderSetup(); break;
      default: break;
    }
  }

  function maybeShowOverForce() {
    const g = getGame();
    if (g && g.over) { S.overShown = false; showOverModal(g); }
  }

  function setBattleTarget(targetId) {
    const game = getGame();
    const viewer = viewerFor(game);
    if (!game || !viewer || !canAct(game)) return;
    if (S.online.role === 'guest') NET.send({ type: 'target', targetId: targetId });
    else {
      ENGINE.setTarget(game, viewer.id, targetId);
      renderBattle();
      if (S.online.role === 'host') broadcastState();
    }
  }

  function boot() {
    renderHome();
    initNetwork();
    bindEvents();
    FX.init();
    updateAudioButton();
    Audio.preloadSfx();
    showScreen('home');
    // 邀请链接：?room=CF-XXXX 直接进入联机大厅并自动入席（一键联机）
    try {
      const params = new URLSearchParams(location.search);
      const room = params.get('room');
      if (room) {
        const code = NET.normalizeCode(room);
        showScreen('lobby');
        const input = $('#join-code');
        if (input) input.value = code;
        setTimeout(function () {
          if (S.online && S.online.role) return;
          if ($('#join-name') && !$('#join-name').value) $('#join-name').value = '受邀执币者';
          joinRoom().catch(function () {});
        }, 900);
        setTimeout(function () {
          const joinPanel = $('#join-room');
          if (joinPanel) joinPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (!S.online.role) toast('房间号已填入：' + code + '。点击「加入同一张赌桌」即可入席。', 'info');
        }, 1500);
      }
    } catch (e) {}
    document.addEventListener('pointerdown', function once() {
      Audio.unlock();
      if (SETTINGS.music) Audio.startBgm('abyss');
      if (SETTINGS.ambient) Audio.startAmbient('abyss', true);
      document.removeEventListener('pointerdown', once);
    }, { once: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  root.CF_UI = { S, SETTINGS, openSettings, openScenePanel, openRules, showScreen, toast };
}) (typeof window !== 'undefined' ? window : globalThis);