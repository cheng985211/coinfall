/* =========================================================
   鍛介€斿洖寤?路 COINFALL
   assets/assets.js 鈥?璧勬簮娓呭崟 + 鏂囦欢闊抽鎾斁灞?
   ---------------------------------------------------------
   璁捐鍘熷垯锛氥€屾枃浠朵紭鍏堬紝鍚堟垚鍏滃簳銆嶁€斺€?
   - 鑻?assets/ 涓嬪瓨鍦ㄥ搴旂礌鏉愭枃浠讹紝鍒欎娇鐢ㄧ湡瀹炲浘鐗?褰曢煶锛?
   - 鑻ヤ笉瀛樺湪锛?04锛夛紝鑷姩闈欓粯鍥為€€鍒版父鎴忓師鏈夌殑 CSS 绋嬪簭鍖栫編鏈?
     涓?Web Audio 绋嬪簭鍖栭煶鏁堬紝缁濅笉鎶ラ敊銆佺粷涓嶆墦鏂灞€銆?

   鐩綍涓庡懡鍚嶈鑼冿紙璇﹁ docs/ASSETS.md锛夛細
     绔嬬粯    assets/art/portraits/{瑙掕壊id}.webp   渚?portraits/cth-01.webp
     鍗￠潰    assets/art/cards/{鍗＄墝id}.webp       渚?cards/attack-001.webp锛堝彲閫夛級
     鑳屾櫙    assets/art/bg/{涓婚id}.jpg          鍙?bg/menu.jpg 涓荤晫闈?
     閰嶄箰    assets/audio/bgm/{涓婚id}.wav       鍙?bgm/menu.jpg鈫?mp3 涓荤晫闈?
     闊虫晥    assets/audio/sfx/{闊虫晥鍚峿.wav       瑙?SFX_NAMES
     瑙掕壊璇煶 assets/audio/voice/char/{瑙掕壊id}-{鍦烘櫙}.wav
             鍦烘櫙 鈭?enter/attack/win/lose
     鍓ф儏璇煶 assets/audio/voice/story/{鑺傜偣key}.wav
   ========================================================= */
(function (root) {
  'use strict';

  // 闊虫晥鍚?鈫?鏂囦欢璺緞锛堜笌 game.js 涓?Audio.sfx(name) 鐨?name 涓€涓€瀵瑰簲锛?
  var SFX_NAMES = [
    'click', 'card', 'coin', 'success', 'fail', 'damage',
    'heal', 'shield', 'active', 'victory', 'defeat', 'chat',
    'draw', 'play' // 鏂板锛氭娊鍗°€佸嚭鐗?
  ];

  var CHAR_SCENES = ['enter', 'attack', 'win', 'lose'];

  // 鎺㈡祴缂撳瓨锛氳褰曞摢浜?URL 涓嶅瓨鍦紝閬垮厤姣忔鎾斁閮藉彂 404 璇锋眰
  var missing = Object.create(null);

  function portraitUrl(charId) { return 'assets/art/portraits/' + charId + '.webp'; }
  function cardUrl(cardId) { return 'assets/art/cards/' + cardId + '.png'; }
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

  // ---- 鏂囦欢闊抽鎾斁鍣紙鎳掑姞杞姐€侀敊璇嵆璁颁负缂哄け锛?---
  var voicePool = [];     // 鐭煶鏁?璇煶澶嶇敤鐨?Audio 姹?
  var bgmEl = null;       // 寰幆 BGM 鍗曚緥
  var bgmMissing = false;

  function markMissing(url) { if (url) missing[url] = true; }
  function isMissing(url) { return !!url && !!missing[url]; }

  // 鎾斁涓€娆℃€х煭闊虫晥/璇煶銆傛垚鍔熻繑鍥?true锛涙棤鏂囦欢/澶辫触杩斿洖 false锛堣皟鐢ㄦ柟鍥為€€鍚堟垚锛夈€?
  function playOne(url, volume) {
    if (!url || isMissing(url)) return false;
    try {
      var el = new Audio(url);
      el.preload = 'auto';
      el.volume = (typeof volume === 'number') ? volume : 0.9;
      var played = false;
      var p = el.play();
      if (p && p.catch) {
        p.catch(function () { markMissing(url); });
      } else {
        played = true;
      }
      // 鎾斁缁撴潫鍚庡洖鏀?
      el.addEventListener('ended', function () { try { el = null; } catch (e) {} });
      el.addEventListener('error', function () { markMissing(url); });
      return true;
    } catch (e) {
      markMissing(url);
      return false;
    }
  }

  // 寰幆 BGM銆傝繑鍥?true 琛ㄧず宸叉帴绠?BGM锛堣皟鐢ㄦ柟搴斿仠姝㈢▼搴忓寲 BGM锛夈€?
  function playBgm(url, volume) {
    if (!url || bgmMissing || isMissing(url)) return false;
    try {
      stopBgmFile();
      bgmEl = new Audio(url);
      bgmEl.loop = true;
      bgmEl.volume = (typeof volume === 'number') ? volume : 0.5;
      var p = bgmEl.play();
      if (p && p.catch) {
        p.catch(function () { bgmMissing = true; bgmEl = null; });
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

