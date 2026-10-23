/* =========================================================
   命途回�?· COINFALL
   assets/assets.js �?资源清单 + 文件音频播放�?
   ---------------------------------------------------------
   设计原则：「文件优先，合成兜底」—�?
   - �?assets/ 下存在对应素材文件，则使用真实图�?录音�?
   - 若不存在�?04），自动静默回退到游戏原有的 CSS 程序化美�?
     �?Web Audio 程序化音效，绝不报错、绝不打断对局�?

   目录与命名规范（详见 docs/ASSETS.md）：
     立绘    assets/art/portraits/{角色id}.webp   �?portraits/cth-01.webp
     卡面    assets/art/cards/{卡牌id}.webp       �?cards/attack-001.webp（可选）
     背景    assets/art/bg/{主题id}.jpg          �?bg/menu.jpg 主界�?
     配乐    assets/audio/bgm/{主题id}.wav       �?bgm/menu.jpg�?mp3 主界�?
     音效    assets/audio/sfx/{音效名}.wav       �?SFX_NAMES
     角色语音 assets/audio/voice/char/{角色id}-{场景}.wav
             场景 �?enter/attack/win/lose
     剧情语音 assets/audio/voice/story/{节点key}.wav
   ========================================================= */
(function (root) {
  'use strict';

  // 音效�?�?文件路径（与 game.js �?Audio.sfx(name) �?name 一一对应�?
  var SFX_NAMES = [
    'click', 'card', 'coin', 'success', 'fail', 'damage',
    'heal', 'shield', 'active', 'victory', 'defeat', 'chat',
    'draw', 'play' // 新增：抽卡、出�?
  ];

  var CHAR_SCENES = ['enter', 'attack', 'win', 'lose'];

  // 探测缓存：记录哪�?URL 不存在，避免每次播放都发 404 请求
  var missing = Object.create(null);

  function portraitUrl(charId) { return 'assets/art/portraits/' + charId + '.webp'; }
  function cardUrl(cardId) { return 'assets/art/cards/' + cardId + '.jpg'; }
  function bgUrl(themeId) { return 'assets/art/bg/' + themeId + '.jpg'; }
  function menuBgUrl() { return 'assets/art/bg/menu.jpg'; }
  function bgmUrl(themeId) { return 'assets/audio/bgm/' + themeId + '.wav'; }
  function menuBgmUrl() { return 'assets/audio/bgm/menu.wav'; }
  function sfxUrl(name) { return 'assets/audio/sfx/' + name + '.wav'; }
  function charVoiceUrl(charId, scene) {
    return 'assets/audio/voice/char/' + charId + '-' + scene + '.wav';
  }
  function storyVoiceUrl(key) {
    return 'assets/audio/voice/story/' + key + '.wav';
  }

  // ---- 文件音频播放器（懒加载、错误即记为缺失�?---
  var voicePool = [];     // 短音�?语音复用�?Audio �?
  var bgmEl = null;       // 循环 BGM 单例
  var bgmMissing = false;

  function markMissing(url) { if (url) missing[url] = true; }
  function isMissing(url) { return !!url && !!missing[url]; }
  function isAutoplayBlock(err) {
    return !!(err && (err.name === 'NotAllowedError' || err.name === 'AbortError' || /user gesture|notallowed/i.test(err.message || '')));
  }

  // 播放一次性短音效/语音。成功返�?true；无文件/失败返回 false（调用方回退合成）�?
  function playOne(url, volume) {
    if (!url || isMissing(url)) return false;
    try {
      var el = new Audio(url);
      el.preload = 'auto';
      el.volume = (typeof volume === 'number') ? volume : 0.9;
      var played = false;
      var p = el.play();
      if (p && p.catch) {
        p.catch(function (err) { if (!isAutoplayBlock(err)) markMissing(url); });
      } else {
        played = true;
      }
      // 播放结束后回�?
      el.addEventListener('ended', function () { try { el = null; } catch (e) {} });
      el.addEventListener('error', function () { markMissing(url); });
      return true;
    } catch (e) {
      markMissing(url);
      return false;
    }
  }

  // 循环 BGM。返�?true 表示已接�?BGM（调用方应停止程序化 BGM）�?
  function playBgm(url, volume) {
    if (!url || bgmMissing || isMissing(url)) return false;
    try {
      stopBgmFile();
      bgmEl = new Audio(url);
      bgmEl.loop = true;
      bgmEl.volume = (typeof volume === 'number') ? volume : 0.5;
      var p = bgmEl.play();
      if (p && p.catch) {
        p.catch(function (err) { if (isAutoplayBlock(err)) { bgmEl = null; return; } bgmMissing = true; bgmEl = null; markMissing(url); });
      }
      return true;
    } catch (e) {
      bgmMissing = true;
      return false;
    }
  }

  function stopBgmFile() {
    if (bgmEl) {
      try { bgmEl.pause(); bgmEl.currentTime = 0; } catch (e) {}
      bgmEl = null;
    }
  }

  function setBgmVolume(v) {
    if (bgmEl) { try { bgmEl.volume = v; } catch (e) {} }
  }

  root.CF_ASSETS = {
    SFX_NAMES: SFX_NAMES,
    CHAR_SCENES: CHAR_SCENES,
    portraitUrl: portraitUrl,
    cardUrl: cardUrl,
    bgUrl: bgUrl,
    menuBgUrl: menuBgUrl,
    bgmUrl: bgmUrl,
    menuBgmUrl: menuBgmUrl,
    sfxUrl: sfxUrl,
    charVoiceUrl: charVoiceUrl,
    storyVoiceUrl: storyVoiceUrl
  };

  root.CFFileAudio = {
    playOne: playOne,
    playBgm: playBgm,
    stopBgmFile: stopBgmFile,
    setBgmVolume: setBgmVolume,
    isMissing: isMissing
  };
})(window);

