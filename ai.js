/* =========================================================
   命途回廊 · COINFALL
   ai.js — 对手 AI、同注者人格、自然语言指挥与远程模型适配
   ---------------------------------------------------------
   设计原则：
   1. 本地启发式永远可用，不依赖网络与密钥。
   2. 配置了 OpenAI 兼容接口时，聊天 / 指令理解 / 高难决策可走模型。
   3. 同注者不是执行器：会读取战场、判断命令合理性、接受或反驳。
   ========================================================= */
(function (root) {
  'use strict';

  const DATA = root.CF_DATA;
  const LS_KEY = 'coinfall.ai.config.v1';

  const DEFAULT_CONFIG = {
    enabled: true,
    baseUrl: 'https://maas.qianwenaiapi.com/compatible-mode/v1',
    apiKey: 'sk-ws-H.PXHLLDE.6wsk.MEYCIQD8cgiyAECrPQo11SxSA1tB54ZCOWArjK-PGsMqQS4TUAIhALb8uR1K0SOMlEQL9cX42-uzYqsMNcjEwbUy8WBrHP8S',
    model: 'deepseek-v4.1-flash-1017',
    remoteBattle: false,
    disableThinking: true,
    temperature: 0.75,
    timeoutMs: 30000
  };

  function loadConfig() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) return Object.assign({}, DEFAULT_CONFIG, JSON.parse(raw));
    } catch (e) { /* ignore */ }
    return Object.assign({}, DEFAULT_CONFIG);
  }

  const config = loadConfig();
  let lastError = '';

  function configure(patch) {
    Object.assign(config, patch || {});
    try { localStorage.setItem(LS_KEY, JSON.stringify(config)); } catch (e) { /* ignore */ }
    return Object.assign({}, config);
  }

  function apiReady() {
    return !!(config.enabled && config.apiKey && config.baseUrl);
  }

  function endpoint() {
    const base = String(config.baseUrl || '').replace(/\/+$/, '');
    return /\/chat\/completions$/.test(base) ? base : base + '/chat/completions';
  }

  /* ---------------------------------------------------------
     远程模型：OpenAI 兼容 Chat Completions
     --------------------------------------------------------- */
  async function requestOnce(messages, options, attempt) {
    const controller = new AbortController();
    const timeoutMs = attempt.timeoutMs || config.timeoutMs || 30000;
    const timer = setTimeout(function () { controller.abort(); }, timeoutMs);
    try {
      const body = {
        model: config.model || 'deepseek-v4.1-flash-1017',
        messages: messages,
        temperature: options && options.temperature != null ? options.temperature : config.temperature,
        max_tokens: attempt.maxTokens,
        stream: false
      };
      // 多数推理模型支持关闭思考以获得更快响应；不支持的接口会在下一轮自动去掉该字段重试。
      if (attempt.thinking === false) body.enable_thinking = false;
      const res = await fetch(endpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + config.apiKey
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      if (!res.ok) {
        const detail = await res.text().catch(function () { return ''; });
        const error = new Error('AI 接口 ' + res.status + ': ' + detail.slice(0, 180));
        error.status = res.status;
        throw error;
      }
      const data = await res.json();
      const message = data && data.choices && data.choices[0] && data.choices[0].message;
      const content = message && message.content;
      if (!content) {
        const error = new Error('AI 接口返回为空');
        error.empty = true;
        throw error;
      }
      return String(content).trim();
    } finally {
      clearTimeout(timer);
    }
  }

  async function remoteChat(messages, options) {
    if (!apiReady()) throw new Error('AI 接口未启用或缺少密钥');
    options = options || {};
    const baseTokens = options.maxTokens || 420;
    const attempts = [];
    if (config.disableThinking !== false) {
      attempts.push({ maxTokens: Math.max(baseTokens, 96), thinking: false, timeoutMs: config.timeoutMs || 30000 });
    }
    attempts.push({ maxTokens: Math.max(baseTokens, 640), thinking: true, timeoutMs: (config.timeoutMs || 30000) + 10000 });

    let lastErr = null;
    for (let i = 0; i < attempts.length; i++) {
      try {
        const content = await requestOnce(messages, options, attempts[i]);
        lastError = '';
        return content;
      } catch (err) {
        lastErr = err;
        lastError = err.name === 'AbortError' ? 'AI 请求超时' : (err.message || String(err));
      }
    }
    throw lastErr || new Error('AI 请求失败');
  }

  async function remoteJson(messages, options) {
    const text = await remoteChat(messages, options);
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('模型没有返回 JSON');
    return JSON.parse(match[0]);
  }

  /* ---------------------------------------------------------
     人格 / 语气素材
     --------------------------------------------------------- */
  const STYLE_VOICE = {
    abyss: { address: '搭档', flavor: ['潮水在听。', '钟声还没停。', '别让深渊看笑话。'], oops: '钟声会记住这次。' },
    steam: { address: '工友', flavor: ['按图纸来。', '压力值正常。', '这不合工程学。'], oops: '回头我给你焊一下脑子。' },
    cultivation: { address: '道友', flavor: ['心不稳，剑就歪。', '大道至简。', '因果自负。'], oops: '此念有伤天和。' },
    fantasy: { address: '同伴', flavor: ['以誓约为证。', '圣光看着。', '这不是骑士该做的事。'], oops: '愿你的誓言比嘴硬。' },
    neon: { address: '搭档', flavor: ['延迟正常。', '协议允许。', '这段逻辑有 bug。'], oops: '你的决策栈溢出了。' },
    wa: { address: '样', flavor: ['灯还亮着。', '风里有声音。', '别回头。'], oops: '今夜の風は冷たい。' },
    west: { address: '伙计', flavor: ['别浪费子弹。', '马都快睡了。', '这买卖不划算。'], oops: '你最好是在开玩笑。' },
    anime: { address: '搭档', flavor: ['这一页还没写完。', '观众在看着。', '别抢我的台词。'], oops: '这个剧本我不接。' }
  };

  const ROLE_VOICE = {
    '输出': { patience: 0.72, aggression: 1.3, caution: 0.7, warmth: 0.4 },
    '防御': { patience: 0.82, aggression: 0.75, caution: 1.35, warmth: 0.85 },
    '功能': { patience: 0.64, aggression: 0.95, caution: 1.1, warmth: 0.55 },
    '赌徒': { patience: 0.5, aggression: 1.2, caution: 0.55, warmth: 0.6 }
  };

  function voiceFor(player) {
    const char = DATA.byId.character(player.charId) || {};
    const style = STYLE_VOICE[char.style] || STYLE_VOICE.abyss;
    const role = ROLE_VOICE[char.role] || ROLE_VOICE['功能'];
    const mood = player.mood == null ? 62 : player.mood;
    return { char, style, role, mood, address: style.address, trust: player.trust == null ? 6 : player.trust };
  }

  function pick(arr, rng) {
    if (!arr || !arr.length) return '';
    return arr[Math.floor((rng ? rng() : Math.random()) * arr.length)];
  }

  function styleFlavor(v, rng) {
    return rng && rng() > 0.55 ? ' ' + pick(v.style.flavor, rng) : '';
  }

  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  function roleLabel(player) {
    const c = DATA.byId.character(player.charId);
    return c ? c.role : '同注者';
  }

  /* ---------------------------------------------------------
     初始化玩家人格
     --------------------------------------------------------- */
  function initPlayer(player) {
    const char = DATA.byId.character(player.charId) || {};
    player.trust = player.trust == null ? 6 : player.trust;
    player.mood = player.mood == null ? 62 : player.mood;
    player.orders = player.orders || [];
    player.aiMemory = player.aiMemory || {
      commands: 0, accepted: 0, rejected: 0, lastIntent: '', repeats: 0,
      praised: false, apologized: false, lastLineAt: 0
    };
    player.persona = {
      temper: char.temper || '沉默，但会记住每一次指挥。',
      role: char.role || '功能',
      style: char.style || 'abyss'
    };
    return player;
  }

  /* ---------------------------------------------------------
     牌面 / 资源判断
     --------------------------------------------------------- */
  function effectHas(effect, keys) {
    if (!effect) return false;
    return keys.some(function (k) { return !!effect[k]; });
  }

  function cardHas(card, keys, side) {
    return effectHas(side === 'neg' ? card.negEffects : card.posEffects, keys);
  }

  function hasCardResource(player, keys, side) {
    return (player.hand || []).some(function (card) { return cardHas(card, keys, side); });
  }

  function activeEffect(player) {
    const unit = activeUnit(player);
    return unit ? unit.activeEffects || null : null;
  }

  function hasActiveResource(player, keys) {
    const unit = activeUnit(player);
    if (!unit || unit.activeUsesLeft <= 0) return false;
    return effectHas(unit.activeEffects, keys);
  }

  function canDamage(player) {
    return hasCardResource(player, ['dmg']) || hasActiveResource(player, ['dmg']);
  }
  function canHeal(player) {
    return hasCardResource(player, ['heal']) || hasActiveResource(player, ['heal']);
  }
  function canShield(player) {
    return hasCardResource(player, ['shield']) || hasActiveResource(player, ['shield']);
  }
  function canDraw(player) {
    return hasCardResource(player, ['draw']) || hasActiveResource(player, ['draw']);
  }

  function activeUnit(player) {
    if (!player || !player.chars) return null;
    return player.chars[player.active] || player.chars.find(function (u) { return u.hp > 0; }) || null;
  }

  function playerHp(player) {
    const u = activeUnit(player);
    return u ? u.hp : 0;
  }

  function livingEnemies(game, player) {
    return game.players.filter(function (p) {
      return p.id !== player.id && p.team !== player.team && activeUnit(p) && activeUnit(p).hp > 0;
    });
  }

  function livingAllies(game, player) {
    return game.players.filter(function (p) {
      return p.id !== player.id && p.team === player.team && activeUnit(p) && activeUnit(p).hp > 0;
    });
  }

  function teamLabel(game, player) {
    const same = game.players.filter(function (p) { return p.team === player.team; });
    const idx = Math.max(0, same.indexOf(player)) + 1;
    return player.team + idx;
  }

  function targetLabel(game, player) {
    return teamLabel(game, player);
  }

  function findTarget(game, player, text) {
    const enemies = livingEnemies(game, player);
    if (!enemies.length) return null;
    const lower = String(text || '').toLowerCase();
    // B1 / B2 / A1 / A2
    const m = lower.match(/\b([ab])\s*([12１２])\b/);
    if (m) {
      const team = m[1].toUpperCase();
      const idx = parseInt(m[2].replace('１', '1').replace('２', '2'), 10) - 1;
      const pool = game.players.filter(function (p) { return p.team === team && activeUnit(p) && activeUnit(p).hp > 0; });
      if (pool[idx]) return pool[idx];
    }
    // 名字 / 称号
    for (const p of enemies) {
      const c = DATA.byId.character(p.charId);
      if (c && (lower.includes(c.name.toLowerCase()) || lower.includes(c.title.toLowerCase()))) return p;
      if (c && c.name.split('·').some(function (part) { return part && lower.includes(part.toLowerCase()); })) return p;
    }
    if (/左|第一个|一号|上面/.test(lower) && enemies[0]) return enemies[0];
    if (/右|第二个|二号|下面/.test(lower) && enemies[1]) return enemies[1];
    if (/残血|最脆|血最少|快死/.test(lower)) {
      return enemies.slice().sort(function (a, b) { return playerHp(a) - playerHp(b); })[0];
    }
    if (/输出|刀|枪|法师|C位|核心/.test(lower)) {
      const found = enemies.find(function (p) {
        const c = DATA.byId.character(p.charId);
        return c && (c.role === '输出' || c.role === '赌徒');
      });
      if (found) return found;
    }
    if (/奶|治疗|辅助|功能/.test(lower)) {
      const found = enemies.find(function (p) {
        const c = DATA.byId.character(p.charId);
        return c && (c.role === '功能' || c.role === '防御');
      });
      if (found) return found;
    }
    return enemies[0];
  }

  /* ---------------------------------------------------------
     指令解析
     --------------------------------------------------------- */
  const NEGATION = /(别|不要|不准|禁止|不许|先别|甭)/;
  const INTENTS = {
    attack: /(打|攻|揍|压血|集火|秒|冲|上|输出|伤害|收掉|点掉|干他|干她|开火|补刀)/,
    defend: /(防|守|盾|保护|掩护|挡住|撑住|别死|保命|苟|护住|顶住)/,
    heal: /(奶|治|回血|加血|补血|回复|救|续命|抬血)/,
    active: /(大招|主动|技能|绝招|开技|能力|绝活|用你的)/,
    draw: /(过牌|抽牌|摸牌|找牌|滤牌|换牌)/,
    hold: /(留着|别出|别打|不要出|存着|按兵不动|过|等一|先别|停|收手|挂机|省着)/,
    focus: /(盯着|锁|目标|先打|集火|优先|对准)/,
    status: /(还有多少|血量|手牌|技能|能用|大招|状态|怎么样)/,
    praise: /(厉害|牛|漂亮|干得好|不错|可以啊|靠谱|谢谢|谢了|辛苦了)/,
    insult: /(废物|菜|垃圾|蠢|傻|没用|闭嘴|烦|滚|送|坑)/,
    apology: /(对不起|抱歉|我的错|怪我|不好意思)/,
    greeting: /(你好|在吗|嗨|哈喽|早上好|晚上好|醒醒)/,
    name: /(你是谁|你叫|名字|介绍一下)/
  };

  function parseCommand(text) {
    const raw = String(text || '').trim();
    if (!raw) return { intent: 'unknown', raw: raw };
    if (INTENTS.greeting.test(raw) && raw.length < 12) return { intent: 'greeting', raw: raw };
    if (INTENTS.apology.test(raw) && raw.length < 18) return { intent: 'apology', raw: raw };
    if (INTENTS.praise.test(raw) && raw.length < 20) return { intent: 'praise', raw: raw };
    if (INTENTS.insult.test(raw) && raw.length < 22) return { intent: 'insult', raw: raw };
    if (INTENTS.name.test(raw)) return { intent: 'name', raw: raw };
    if (INTENTS.status.test(raw) && !INTENTS.attack.test(raw)) return { intent: 'status', raw: raw };

    const negated = NEGATION.test(raw) && !/别死|不要死|别送|不要送/.test(raw);
    const hold = INTENTS.hold.test(raw) || negated;
    const active = INTENTS.active.test(raw);
    const heal = INTENTS.heal.test(raw);
    const defend = INTENTS.defend.test(raw);
    const draw = INTENTS.draw.test(raw);
    const attack = INTENTS.attack.test(raw) && !negated;
    const focus = INTENTS.focus.test(raw);

    // “别用主动” → 保留主动
    if (active && negated) return { intent: 'holdActive', raw: raw };
    if (heal) return { intent: 'heal', raw: raw, targetIsSelf: /我|自己|这边/.test(raw) };
    if (defend) return { intent: 'defend', raw: raw };
    if (attack || focus) return { intent: 'attack', raw: raw, focus: focus };
    if (active) return { intent: 'active', raw: raw };
    if (draw) return { intent: 'draw', raw: raw };
    if (hold) return { intent: 'hold', raw: raw };
    return { intent: 'unknown', raw: raw };
  }

  /* ---------------------------------------------------------
     合理性判断与反馈
     --------------------------------------------------------- */
  function hasLethal(game, player) {
    const enemies = livingEnemies(game, player);
    if (!enemies.length) return null;
    const unit = activeUnit(player);
    if (!unit) return null;
    // 粗略：手里有三伤牌，或主动 + 卡牌足够
    let best = 0;
    (player.hand || []).forEach(function (card) {
      best = Math.max(best, (card.posEffects.dmg || 0) * (game.effectMultiplier || 1));
    });
    if (unit.activeUsesLeft > 0) {
      best = Math.max(best, (unit.activeEffects.dmg || 0) * (game.effectMultiplier || 1));
    }
    const target = enemies.slice().sort(function (a, b) { return playerHp(a) - playerHp(b); })[0];
    return best >= playerHp(target) ? target : null;
  }

  function orderTarget(game, player, target) {
    if (!target) return livingEnemies(game, player)[0] || null;
    return target;
  }

  function evaluateOrder(game, player, human, parsed) {
    const unit = activeUnit(player);
    const hp = unit ? unit.hp : 0;
    const low = hp <= 2;
    const critical = hp <= 1;
    const enemies = livingEnemies(game, player);
    const target = parsed.targetId ? game.players.find(function (p) { return p.id === parsed.targetId; }) : null;
    const v = voiceFor(player);
    const rng = game.rng || Math.random;
    const trust = v.trust;
    const mood = v.mood;
    const lethal = hasLethal(game, player);

    if (!unit || unit.hp <= 0) return reject('我已经倒下了。你要指挥一具尸体吗？', 'dead');
    if (parsed.intent === 'attack') {
      if (!enemies.length) return reject('对面已经没人了。你赢了，醒醒。', 'no-target');
      if (!canDamage(player)) {
        return reject(pick([
          '我手里一张能打的都没有。你让我拿' + (v.char.style === 'steam' ? '扳手' : v.char.style === 'west' ? '空枪' : '头') + '去撞吗？',
          '没有伤害牌，也没有主动技。这波指挥建议你自己上。',
          '你在让我空手接白刃？先给我一张能打的牌。'
        ], rng), 'no-resource');
      }
      if (critical && !lethal && !unit.shield) {
        const willing = trust >= 9 && mood >= 75;
        if (!willing) return reject(pick([
          '我剩一滴血，你让我先冲？你是想换队友还是想换棺材？',
          '这条命虽然不值钱，但也没打算这样花。先让我活过这一回合。',
          '可以，等我先把自己的血条从遗书里捞出来。'
        ], rng), 'suicide');
        return accept('行，你都不怕我死，我怕什么。' + (target ? '目标' + targetLabel(game, target) + '。' : ''), 'attack', target, +2);
      }
      if (low && !unit.shield && !canHeal(player) && trust < 5) {
        return reject('我快死了，你还在喊进攻。先让我喘口气。', 'low-hp');
      }
      const label = target ? targetLabel(game, target) : '对面';
      const lines = lethal
        ? ['收尾是吧？我喜欢。' + label + '交给我。', '这命令终于像句人话。' + label + '，准备结账。', '看好了，这叫斩杀线。']
        : ['行，' + label + '交给我。别拖后腿。', '这命令还算像话。' + label + '，我记下了。', '进攻就进攻，你负责别先倒下。', '好，我去把' + label + '的血条谈下来。'];
      return accept(pick(lines, rng) + styleFlavor(v, rng), 'attack', target, +1);
    }

    if (parsed.intent === 'defend') {
      if (!canShield(player) && !canHeal(player)) {
        return reject(pick([
          '我手里没有盾也没有奶。你让我用气势防守？',
          '防守需要资源，不是喊口号。给我一张能用的牌。',
          '你想让我扛，可以。先告诉我拿什么扛。'
        ], rng), 'no-resource');
      }
      if (!low && !critical && !livingAllies(game, player).some(function (p) { return playerHp(p) <= 2; }) && trust < 4) {
        return reject('大家血都满着，你让我缩起来？节奏不要钱吗。', 'waste');
      }
      return accept(pick([
        '收到，我先把盾立起来。你安心出牌。',
        '行，这回合我守。别把我卖了。',
        '保命是吧？这命令我熟。'
      ], rng) + styleFlavor(v, rng), 'defend', null, +1);
    }

    if (parsed.intent === 'heal') {
      const allies = livingAllies(game, player);
      const wounded = allies.find(function (p) { return playerHp(p) < (activeUnit(p).maxHp || 5); });
      const selfWounded = hp < (unit.maxHp || 5);
      if (!canHeal(player)) {
        return reject(pick([
          '我手里没有治疗牌，主动技也不是奶。你让我给你画一个？',
          '没有奶。你只能靠自己少挨两下。',
          '治疗资源在哪儿？你先把牌给我，我再考虑当奶妈。'
        ], rng), 'no-resource');
      }
      if (!wounded && !selfWounded) {
        return reject(pick([
          '你满血，我满血。奶空气吗？我的牌不是矿泉水。',
          '现在治疗等于把资源倒进下水道。等掉血了再喊。',
          '我倒是想奶，可这局还没人受伤。'
        ], rng), 'waste');
      }
      return accept(pick([
        '好，我抬血。你下一手别再白挨。',
        '收到。治疗会到，别催。',
        '这次听你的。谁让我是队友。'
      ], rng), 'heal', null, +1);
    }

    if (parsed.intent === 'active') {
      if (!unit.activeUsesLeft) return reject('主动技已经用完了。你连我的技能栏都不看？', 'no-resource');
      if (player.sealNext) return reject('我被封了主动技。这回合开不出来，别按了。', 'sealed');
      return accept(pick([
        '行，开一次。看好了。',
        '收到，主动技留给这一拍。',
        '你总算想起我还有技能了。'
      ], rng), 'active', null, +1);
    }

    if (parsed.intent === 'holdActive') {
      return accept('好，主动技先留着。你最好别让我留到死。', 'holdActive', null, 0);
    }

    if (parsed.intent === 'draw') {
      if (!canDraw(player)) return reject('没有过牌手段。你想让我从袖子里变一张出来？', 'no-resource');
      return accept('行，我找找牌。你先别死。', 'draw', null, 0);
    }

    if (parsed.intent === 'hold') {
      if (lethal) return reject('现在收手？对面只剩一口气，你这是把胜利让出去。', 'bad-hold');
      if (low && unit.shield) return reject('我有盾，还能打。别让我当缩头乌龟。', 'proud');
      return accept(pick([
        '行，这回合我按兵不动。你最好有后手。',
        '收着就收着。别到时候怪我没输出。',
        '听你的，先看一轮。'
      ], rng), 'hold', null, 0);
    }

    if (parsed.intent === 'status') {
      return { intent: 'status', accepted: true, reply: statusLine(game, player), trustDelta: 0, moodDelta: 0, order: null };
    }
    if (parsed.intent === 'praise') {
      return { intent: 'praise', accepted: true, reply: pick([
        '少来，我只是正常发挥。',
        '哼，知道就好。下一手别掉链子。',
        '谢谢。但你夸我也不会多给你一张牌。'
      ], rng), trustDelta: 1, moodDelta: 8, order: null };
    }
    if (parsed.intent === 'apology') {
      return { intent: 'apology', accepted: true, reply: pick([
        '算了。下次想清楚再指挥。',
        '我记下了。不是记仇，是记战术。',
        '行吧。把这局赢下来，我就当没听见。'
      ], rng), trustDelta: 1, moodDelta: 6, order: null };
    }
    if (parsed.intent === 'insult') {
      return { intent: 'insult', accepted: false, reply: pick([
        '你骂我，我就会打得更准？逻辑不错。',
        '行，我记住了。下一手你自己看着办。',
        '嘴上赢了，牌桌输了。你选一个。'
      ], rng), trustDelta: -2, moodDelta: -12, order: null };
    }
    if (parsed.intent === 'greeting') {
      return { intent: 'greeting', accepted: true, reply: pick([
        '在。手牌三张，脑子还在。',
        '别客套了，说吧，打谁。',
        '醒着呢。你最好也醒着。'
      ], rng), trustDelta: 0, moodDelta: 1, order: null };
    }
    if (parsed.intent === 'name') {
      const char = DATA.byId.character(player.charId);
      return { intent: 'name', accepted: true, reply: '我叫' + (char ? char.name : player.name) + '。' + (char ? char.title : '') + '。别把我当成一张会说话的牌。', trustDelta: 0, moodDelta: 0, order: null };
    }

    // 没听懂：先不装懂
    return reject(pick([
      '没听懂。说人话：打谁、守谁、还是让我留着？',
      '你的指令像被潮水泡过的电报。再说具体点。',
      '我猜你想让我做点什么，但猜错要死人。重说。'
    ], rng), 'unknown');

    function accept(reply, intent, tgt, trustDelta) {
      return { intent: intent, accepted: true, reply: reply, trustDelta: trustDelta || 0, moodDelta: 3, targetId: tgt ? tgt.id : null, order: { intent: intent, targetId: tgt ? tgt.id : null, turn: game.turn, status: 'accepted', text: parsed.raw } };
    }
    function reject(reply, reason) {
      return { intent: parsed.intent, accepted: false, reply: reply, trustDelta: -1, moodDelta: -4, reason: reason, order: null };
    }
  }

  function statusLine(game, player) {
    const unit = activeUnit(player);
    const enemies = livingEnemies(game, player).map(function (p) {
      return targetLabel(game, p) + ' ' + playerHp(p) + '血';
    }).join(' / ');
    return '我 ' + (unit ? unit.hp : 0) + ' 血，护盾 ' + (unit ? unit.shield : 0) + '，手牌 ' + player.hand.length + ' 张。对面：' + (enemies || '没人') + '。';
  }

  /* ---------------------------------------------------------
     远程增强：指令理解 / 人格回复
     --------------------------------------------------------- */
  function gameBrief(game, player) {
    const unit = activeUnit(player);
    const enemies = livingEnemies(game, player).map(function (p) {
      const u = activeUnit(p);
      return targetLabel(game, p) + ':' + (u ? u.hp : 0) + 'HP/' + (u ? u.shield : 0) + '盾';
    }).join('; ');
    const hand = (player.hand || []).map(function (c) { return c.name + '[' + c.posText + '|' + c.negText + ']'; }).join(' / ');
    return [
      '模式:' + game.modeName,
      '你的角色:' + player.name + '(' + roleLabel(player) + ')',
      '你的血量:' + (unit ? unit.hp : 0) + '/护盾:' + (unit ? unit.shield : 0),
      '你的手牌:' + (hand || '无'),
      '敌方:' + (enemies || '无'),
      '当前回合:' + game.turn
    ].join('\n');
  }

  async function remoteOrder(game, player, human, raw, parsed) {
    const char = DATA.byId.character(player.charId) || {};
    const system = [
      '你是《命途回廊》的对局 AI 同注者，名字是' + player.name + '，角色定位' + roleLabel(player) + '。',
      '你的脾气：' + (char.temper || '冷静') + '。你说话短、有人味、有脾气，不谄媚，不使用“作为AI”之类措辞。',
      '队友（玩家）正在用自然语言指挥你。你必须判断命令是否合理，并只输出 JSON：',
      '{"intent":"attack|defend|heal|active|draw|hold|holdActive|focus|unknown","accepted":true|false,"reply":"一句话回复","trustDelta":-2到2,"moodDelta":-10到10,"target":"B1或B2或空"}',
      '规则：满血求奶、无资源硬攻、送死命令必须拒绝并挖苦；合理命令接受。回复不超过45个汉字。',
      '战场信息：\n' + gameBrief(game, player),
      '玩家原话：' + raw
    ].join('\n');
    try {
      const out = await remoteJson([
        { role: 'system', content: system },
        { role: 'user', content: '请判断并回复。只输出 JSON。' }
      ], { temperature: 0.8, maxTokens: 700 });
      const target = out.target ? findTarget(game, player, out.target) : null;
      return {
        intent: out.intent || 'unknown',
        accepted: !!out.accepted,
        reply: String(out.reply || '……').slice(0, 90),
        trustDelta: clamp(Number(out.trustDelta) || 0, -2, 2),
        moodDelta: clamp(Number(out.moodDelta) || 0, -10, 10),
        targetId: target ? target.id : null,
        order: out.accepted && /attack|defend|heal|active|draw|hold/.test(out.intent) ? {
          intent: out.intent, targetId: target ? target.id : null, turn: game.turn, status: 'accepted', text: raw
        } : null,
        remote: true
      };
    } catch (e) {
      return null;
    }
  }

  /* ---------------------------------------------------------
     指挥入口：同步本地判断，必要时用远端补全
     --------------------------------------------------------- */
  async function handleCommand(game, ally, human, text, options) {
    initPlayer(ally);
    const raw = String(text || '').trim();
    if (!raw) return null;

    const parsed = parseCommand(raw);
    // 附带目标解析
    if (/attack|focus/.test(parsed.intent)) {
      parsed.targetId = (findTarget(game, ally, raw) || {}).id || null;
    }

    let result;
    if (parsed.intent === 'unknown' && apiReady() && options && options.allowRemote) {
      const remote = await remoteOrder(game, ally, human, raw, parsed);
      result = remote || evaluateOrder(game, ally, human, parsed);
    } else if (apiReady() && options && options.allowRemote && parsed.intent !== 'unknown') {
      // 让模型只负责“更像人”的表达，不覆盖本地合理性判断
      result = evaluateOrder(game, ally, human, parsed);
      if (result.accepted && Math.random() < 0.55) {
        const remote = await remoteOrder(game, ally, human, raw, parsed);
        if (remote && remote.accepted === result.accepted) {
          result.reply = remote.reply;
          result.remote = true;
        }
      }
    } else {
      result = evaluateOrder(game, ally, human, parsed);
    }

    // 重复命令会使脾气变差
    const mem = ally.aiMemory;
    mem.commands += 1;
    if (mem.lastIntent === result.intent) mem.repeats += 1; else mem.repeats = 0;
    mem.lastIntent = result.intent;
    if (mem.repeats >= 2) {
      ally.mood = clamp(ally.mood - 3, 0, 100);
      if (result.accepted && Math.random() < 0.55) {
        result.reply += pick([' 同样的话说第三遍了。', ' 我听见了，不用复读。', ' 你是在指挥还是在念经？']);
      }
    }

    ally.mood = clamp(ally.mood + (result.moodDelta || 0), 0, 100);
    ally.trust = clamp(ally.trust + (result.trustDelta || 0), 0, 12);
    if (result.accepted) { mem.accepted += 1; } else { mem.rejected += 1; }

    if (result.order) {
      const order = Object.assign({}, result.order, {
        id: 'order-' + Date.now() + '-' + Math.floor(Math.random() * 999),
        targetId: result.targetId || result.order.targetId || null,
        createdTurn: game.turn,
        expiresTurn: game.turn + 3,
        status: 'accepted'
      });
      ally.orders = [order].concat((ally.orders || []).filter(function (o) { return o.status === 'accepted' && o.expiresTurn >= game.turn; })).slice(0, 2);
      if (order.targetId) {
        const tgt = game.players.find(function (p) { return p.id === order.targetId; });
        if (tgt) ally.selectedTarget = tgt.id;
      }
    }
    result.reply = cleanReply(result.reply);
    return result;
  }

  function cleanReply(text) {
    return String(text || '……').replace(/\s+/g, ' ').replace(/^["“]|["”]$/g, '').slice(0, 120);
  }

  /* ---------------------------------------------------------
     出牌评估
     --------------------------------------------------------- */
  function effectScore(game, actor, target, effects, stage) {
    if (!effects) return 0;
    const mult = game.effectMultiplier || 1;
    const unit = activeUnit(actor);
    const tunit = target ? activeUnit(target) : null;
    const tHp = tunit ? tunit.hp : 0;
    const tShield = tunit ? tunit.shield : 0;
    const myHp = unit ? unit.hp : 0;
    const myMax = unit ? unit.maxHp : 5;
    const missing = Math.max(0, myMax - myHp);
    let score = 0;

    if (effects.dmg) {
      let dmg = effects.dmg * mult;
      if (target && tShield && !effects.pierce) dmg = Math.max(0, dmg - Math.min(tShield, dmg));
      if (dmg >= tHp) score += 11 + (stage === 'lethal' ? 6 : 0);
      else score += dmg * (stage === 'defend' ? 0.75 : 1.45);
      if (tHp <= 2) score += 1.2;
    }
    if (effects.pierce) score += 0.45;
    if (effects.heal) score += Math.min(effects.heal * mult, missing + 1) * (myHp <= 2 ? 2.1 : 1.1);
    if (effects.shield) score += Math.min(effects.shield * mult, 3) * (myHp <= 2 ? 1.6 : 0.9);
    if (effects.draw) score += Math.min(effects.draw * mult, 3) * 0.55;
    if (effects.discard) score += Math.min(effects.discard * mult, 2) * 0.55 + (target && target.hand.length ? 0.35 : 0);
    if (effects.strip) score += tShield ? 0.55 + tShield * 0.2 : 0.1;
    if (effects.choke) score += effects.choke * 0.38;
    if (effects.seal) score += (target && !target.sealNext) ? 0.65 : 0.1;
    if (effects.bless) score += 1.1;
    if (effects.bless2) score += 2.0;
    if (effects.lifesteal) score += Math.min(effects.lifesteal * mult, 3) * 1.1;
    if (effects.hpBurn) score += Math.min(effects.hpBurn * mult, 3) * 0.9;
    if (effects.stealShield) score += tShield ? 0.8 + tShield * 0.3 : 0.2;
    if (effects.power) score += effects.power * 0.9;
    if (effects.weak && target) score += effects.weak * 0.55;
    if (effects.guard) score += myHp <= 2 ? 1.4 : 0.7;
    if (effects.reflect) score += myHp <= 3 ? 1.0 : 0.4;
    if (effects.energize) score += 0.9;
    if (effects.oppHeal) score -= effects.oppHeal * mult * 1.15;
    if (effects.oppShield) score -= effects.oppShield * mult * 0.8;
    if (effects.oppDraw) score -= effects.oppDraw * mult * 0.4;
    if (effects.selfDmg) {
      score -= effects.selfDmg * mult * (myHp <= 2 ? 2.4 : 1.0);
      if (effects.selfDmg * mult >= myHp) score -= 9;
    }
    if (effects.selfDiscard) score -= effects.selfDiscard * mult * 0.72;
    return score;
  }

  function orderFor(player, intents) {
    return (player.orders || []).find(function (o) {
      return o.status === 'accepted' && intents.indexOf(o.intent) >= 0 && (!o.expiresTurn || o.expiresTurn >= 0);
    });
  }

  function targetForDecision(game, player, order) {
    const enemies = livingEnemies(game, player);
    if (!enemies.length) return null;
    if (order && order.targetId) {
      const t = enemies.find(function (p) { return p.id === order.targetId; });
      if (t) return t;
    }
    if (player.selectedTarget) {
      const t = enemies.find(function (p) { return p.id === player.selectedTarget; });
      if (t) return t;
    }
    return enemies.slice().sort(function (a, b) { return playerHp(a) - playerHp(b); })[0];
  }

  function cardScore(game, player, card, target, order) {
    let score = 0.5 * effectScore(game, player, target, card.posEffects, order && order.intent);
    score += 0.5 * effectScore(game, player, target, card.negEffects, 'risk');
    if (order) {
      if (order.intent === 'attack' && card.posEffects.dmg) score += 3.2;
      if (order.intent === 'defend' && (card.posEffects.shield || card.posEffects.heal)) score += 3.0;
      if (order.intent === 'heal' && card.posEffects.heal) score += 3.4;
      if (order.intent === 'draw' && card.posEffects.draw) score += 2.2;
      if (order.intent === 'active' && card.posEffects.dmg) score += 1.0;
    }
    // 低血量时的生存偏好
    const hp = playerHp(player);
    const unit = activeUnit(player);
    if (hp <= 2) {
      if (card.posEffects.heal || card.posEffects.shield) score += 2.0;
      if (card.posEffects.selfDmg >= hp) score -= 8;
      if (card.negEffects.selfDmg >= hp) score -= 4;
    }
    if (hp <= 2 && card.posEffects.dmg && !card.posEffects.heal && !card.posEffects.shield) score -= 0.8;
    if (unit && unit.shield >= 2 && card.posEffects.shield) score -= 0.6;
    if (player.hand.length >= 5 && card.posEffects.draw) score -= 0.6;
    return score;
  }

  function activeScore(game, player, target, order) {
    const unit = activeUnit(player);
    if (!unit || unit.activeUsesLeft <= 0 || player.sealNext) return -99;
    let score = effectScore(game, player, target, unit.activeEffects, order && order.intent) * 0.9 + 0.8;
    if (order) {
      if (order.intent === 'active') score += 4.0;
      if (order.intent === 'attack' && unit.activeEffects.dmg) score += 2.2;
    }
    const hp = playerHp(player);
    if (hp <= 2 && unit.activeEffects.selfDmg) score -= 5;
    return score;
  }

  /* ---------------------------------------------------------
     AI 行动决策
     --------------------------------------------------------- */
  async function chooseAction(game, player, options) {
    initPlayer(player);
    options = options || {};
    const level = player.aiLevel || 'normal';
    const rng = game.rng || Math.random;
    const unit = activeUnit(player);
    if (!unit || unit.hp <= 0) return { pass: true };
    const order = orderFor(player, ['attack', 'defend', 'heal', 'active', 'draw', 'hold', 'holdActive']);
    const target = targetForDecision(game, player, order);
    const enemies = livingEnemies(game, player);

    if (!enemies.length) return { pass: true, chat: '对面没人了。' };

    // 被接受的“按兵不动”指令：在安全时执行
    if (order && order.intent === 'hold' && !hasLethal(game, player) && rng() < 0.8) {
      return { pass: true, chat: pick(['这回合我按兵不动。', '听你的，先收着。', '行，我看一轮。'], rng) };
    }

    // 远程决策（可选，失败自动回退）
    if (config.remoteBattle && apiReady() && level === 'hard' && options.remote !== false) {
      try {
        const remote = await remoteDecide(game, player, options);
        if (remote) return remote;
      } catch (e) { /* fall through */ }
    }

    if (level === 'easy') {
      if (rng() < 0.08) return { pass: true, chat: pick(['我随便看看。', '这回合先这样。', '硬币会告诉我的。'], rng) };
      const idx = Math.floor(rng() * player.hand.length);
      const active = unit.activeUsesLeft > 0 && rng() < 0.28;
      return {
        cardIndex: player.hand.length ? idx : -1,
        targetId: (enemies[Math.floor(rng() * enemies.length)] || {}).id,
        useActive: active,
        activeTargetId: (enemies[Math.floor(rng() * enemies.length)] || {}).id,
        pass: !player.hand.length && !active,
        chat: rng() < 0.22 ? pick(['硬币，给点面子。', '我不知道，但我想出牌。', '打就完事了。'], rng) : ''
      };
    }

    // 普通 / 困难：评分
    let bestCard = null;
    let bestScore = -99;
    player.hand.forEach(function (card, idx) {
      let s = cardScore(game, player, card, target, order);
      if (level === 'normal') s += (rng() - 0.5) * 1.8;
      else s += (rng() - 0.5) * 0.45;
      if (s > bestScore) { bestScore = s; bestCard = { index: idx, score: s, card: card }; }
    });

    let useActive = false;
    let activeTarget = target;
    const aScore = activeScore(game, player, target, order);
    const threshold = level === 'hard' ? 2.0 : 2.8;
    if (aScore >= threshold) {
      useActive = true;
      if (level === 'normal' && rng() < 0.22) useActive = false;
    }
    if (order && order.intent === 'active' && aScore > -50) useActive = true;

    // 估算主动技是否直接斩杀
    let activeLethal = false;
    if (useActive && unit.activeEffects.dmg && target) {
      const mult = game.effectMultiplier || 1;
      activeLethal = unit.activeEffects.dmg * mult >= playerHp(target) + (activeUnit(target) ? activeUnit(target).shield : 0);
    }

    let cardIndex = bestCard ? bestCard.index : -1;
    if (activeLethal) cardIndex = -1;
    if (order && order.intent === 'hold' && bestScore < 5) cardIndex = -1;
    if (bestScore < 0.15 && level === 'hard' && !useActive) cardIndex = -1;

    // 没有牌可出
    if (cardIndex < 0 && !useActive) {
      return { pass: true, chat: order ? '我手里没有能配合的牌。' : pick(['这手牌不配我出手。', '过。', '留着下一轮。'], rng) };
    }

    const chatPool = [];
    if (order && order.intent === 'attack' && cardIndex >= 0) chatPool.push('按你说的，进攻。');
    if (order && order.intent === 'defend') chatPool.push('我先把阵脚稳住。');
    if (order && order.intent === 'heal') chatPool.push('治疗来了。');
    if (activeLethal) chatPool.push('这波够了，收尾。');
    if (cardIndex >= 0 && player.hand[cardIndex] && player.hand[cardIndex].posEffects.dmg >= 3) chatPool.push('三伤牌，赌一把。');

    return {
      useActive: useActive,
      activeTargetId: activeTarget ? activeTarget.id : (enemies[0] || {}).id,
      cardIndex: cardIndex,
      targetId: target ? target.id : (enemies[0] || {}).id,
      pass: cardIndex < 0 && !useActive,
      chat: rng() < 0.35 ? pick(chatPool.length ? chatPool : ['看这一手。', '该收账了。', '别眨眼。'], rng) : ''
    };
  }

  async function remoteDecide(game, player, options) {
    const hand = player.hand.map(function (c, i) {
      return i + ':' + c.name + ' 正[' + c.posText + '] 负[' + c.negText + ']';
    }).join('\n');
    const enemies = livingEnemies(game, player).map(function (p) {
      return targetLabel(game, p) + '(' + p.id + ') ' + playerHp(p) + '血 ' + (activeUnit(p) ? activeUnit(p).shield : 0) + '盾';
    }).join('; ');
    const prompt = [
      '你在玩《命途回廊》回合制卡牌。你是' + player.name + '，' + roleLabel(player) + '，AI 强度困难。',
      '你的生命:' + playerHp(player) + '，护盾:' + (activeUnit(player) ? activeUnit(player).shield : 0) + '。',
      '手牌:\n' + (hand || '无'),
      '敌人:' + enemies,
      '回合阶段:' + (options.phase || 'action'),
      '请只输出 JSON：{"useActive":true,"cardIndex":0,"targetId":"p2","pass":false,"chat":"不超过20字"}。cardIndex 为 -1 表示不出牌。',
      '决策原则：优先斩杀；低血优先治疗/护盾；不要使用会自杀的牌；合理使用主动技。'
    ].join('\n');
    const out = await remoteJson([
      { role: 'system', content: '你是严谨的卡牌游戏 AI，只输出 JSON，不解释。' },
      { role: 'user', content: prompt }
    ], { temperature: 0.4, maxTokens: 640 });
    if (!out || typeof out !== 'object') return null;
    const idx = Number.isInteger(out.cardIndex) ? out.cardIndex : -1;
    const validIndex = idx >= 0 && idx < player.hand.length ? idx : -1;
    const validTarget = game.players.some(function (p) { return p.id === out.targetId && p.team !== player.team; }) ? out.targetId : null;
    return {
      useActive: !!out.useActive,
      activeTargetId: validTarget,
      cardIndex: validIndex,
      targetId: validTarget,
      pass: validIndex < 0 && !out.useActive,
      chat: cleanReply(out.chat || ''),
      remote: true
    };
  }

  /* ---------------------------------------------------------
     逆写判断
     --------------------------------------------------------- */
  function chooseReroll(game, player, card, success) {
    initPlayer(player);
    if (!player.rerolls || game.noReroll) return false;
    const level = player.aiLevel || 'normal';
    const rng = game.rng || Math.random;
    if (level === 'easy') return rng() < (success ? 0.04 : 0.26);
    if (level === 'normal') return rng() < (success ? 0.02 : 0.55);
    if (success) {
      // 困难 AI 几乎不重抛成功结果；赌徒在稳赢时偶尔炫技
      const char = DATA.byId.character(player.charId);
      return char && char.role === '赌徒' && rng() < 0.05;
    }
    const hp = playerHp(player);
    const unit = activeUnit(player);
    const neg = card.negEffects || {};
    const mult = game.effectMultiplier || 1;
    if (neg.selfDmg && neg.selfDmg * mult >= hp) return true;
    if (hp <= 2 && (neg.selfDmg || neg.selfDiscard || neg.oppHeal)) return true;
    if (neg.oppHeal >= 2) return true;
    if (neg.selfDiscard >= 2) return true;
    if (unit && unit.shield && neg.selfDmg) return true;
    return rng() < 0.82;
  }

  /* ---------------------------------------------------------
     事件反应 / 闲聊
     --------------------------------------------------------- */
  function eventLine(game, player, event) {
    initPlayer(player);
    const v = voiceFor(player);
    const rng = game.rng || Math.random;
    if (!event) return '';
    if (event.type === 'damage' && event.targetId === player.id) {
      if (event.hpAfter <= 1) return pick(['……还站着。别慌。', '咳。这点伤，记账上。', '我还没倒。继续。'], rng);
      return pick(['疼。但还能打。', '这一下我记住了。', '护盾没白带。'], rng);
    }
    if (event.type === 'heal' && event.targetId === player.id) return pick(['舒服多了。谢了。', '血线回来了。继续。', '别浪费，下一手打准点。'], rng);
    if (event.type === 'defeat' && event.playerId === player.id) return pick(['……看来这局到此为止。别难过，下一个我可能更记仇。', '我倒了。剩下的路你自己走。'], rng);
    if (event.type === 'victory' && event.team === player.team) return pick(['赢了。别得意，回廊还会开下一桌。', '干得不错。真的。', '这枚硬币，总算站对了边。'], rng);
    return '';
  }

  async function chat(game, player, text) {
    initPlayer(player);
    const char = DATA.byId.character(player.charId) || {};
    const system = '你是《命途回廊》中的角色' + player.name + '，' + (char.title || '') + '。脾气：' + (char.temper || '冷淡') + '。用中文口语回复玩家，不超过50字，不要自称AI，不要解释设定。';
    try {
      return cleanReply(await remoteChat([
        { role: 'system', content: system },
        { role: 'user', content: text }
      ], { maxTokens: 512 }));
    } catch (e) {
      return '';
    }
  }

  /* ---------------------------------------------------------
     对手 AI 嘲讽 / 同注者主动搭话
     --------------------------------------------------------- */
  function taunt(game, player, kind) {
    initPlayer(player);
    const v = voiceFor(player);
    const rng = game.rng || Math.random;
    const bank = {
      start: ['坐下吧。硬币不等人。', '希望你的手牌比你的表情有内容。', '我见过很多执币者。你算比较安静的那种。'],
      playerLow: ['快结束了。你还有什么遗言要写进卡牌吗？', '血不多了。要不要考虑认输，省点时间。'],
      aiLow: ['别急着高兴。我还没把最后的牌翻出来。', '有意思。你把我逼到这一步了。'],
      win: ['这局归我。回廊会记住你的失败，但不会太久。', '硬币站对了边。下次未必。'],
      lose: ['……看来这次，故事站在你那边。', '别得意。庄家还没亲自下场。'],
      hit: ['疼吗？那就对了。', '这一下，是替某个世界讨的。']
    };
    const arr = bank[kind];
    return arr ? pick(arr, rng) + styleFlavor(v, rng) : '';
  }

  function proactive(game, player) {
    initPlayer(player);
    const rng = game.rng || Math.random;
    const hp = playerHp(player);
    if (hp <= 2 && rng() < 0.18) return pick(['我快撑不住了。你再不帮我，就准备一打二吧。', '血线见底了。给个盾，或者给句痛快话。', '这回合别让我送。'], rng);
    if (player.hand.length === 0 && rng() < 0.16) return pick(['我手牌空了。你最好有后手。', '没牌了，只能靠主动技撑一下。'], rng);
    if (rng() < 0.09) return pick(['你出牌能不能快点，硬币都快凉了。', '这局有点意思。别死太早。', '我总觉得庄家在看着我们。'], rng);
    return '';
  }

  /* ---------------------------------------------------------
     导出
     --------------------------------------------------------- */
  const API = {
    DEFAULT_CONFIG,
    config,
    configure,
    apiReady,
    remoteChat,
    parseCommand,
    handleCommand,
    chooseAction,
    chooseReroll,
    eventLine,
    chat,
    taunt,
    proactive,
    initPlayer,
    activeUnit,
    playerHp,
    livingEnemies,
    findTarget,
    targetLabel,
    hasLethal,
    lastError: function () { return lastError; },
    persona: voiceFor
  };

  root.CF_AI = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);