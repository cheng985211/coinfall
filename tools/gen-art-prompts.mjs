/* =========================================================
   gen-art-prompts.mjs
   生成 assets/art/prompts.json —— 每张立绘/卡面/背景的生图提示词
   用法: node tools/gen-art-prompts.mjs
   纯数据层，不依赖 DOM。
   ========================================================= */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');

const src = readFileSync(join(ROOT, 'data.js'), 'utf8');
const g = { window: {} };
new Function('window', src)(g.window);
const D = g.window.CF_DATA;

/* ---------- 世界视觉语言（三国杀式：角色强轮廓 + 单色域主调） ---------- */
const STYLE_ART = {
  abyss: 'deep sea ink-green and pale cyan, drowned stone temple, cold bioluminescent glow, black tarot composition',
  steam: 'brass gold and coal black, Victorian clockwork workshop, rivets and steam haze, warm gaslight',
  cultivation: 'jade green and cold white, sea of clouds and floating stone peaks, ink-wash minimalism, eastern xianxia',
  fantasy: 'antique gold and deep violet-blue, gothic cathedral arches, stained glass, knightly heraldry',
  neon: 'cyan and magenta, rain-soaked neon alley, holographic hanzi signage, cyber wuxia',
  wa: 'vermilion and indigo, torii gate and cherry blossoms, paper lanterns, ukiyo-e dark fantasy',
  west: 'amber and dusty grey, desert sunset and tumbleweed, revolver and saloon, cinematic widescreen',
  anime: 'bright pink and deep blue, starfield and torn book pages, cel-shaded anime, dramatic backlight'
};

const STYLE_BG = {
  abyss: 'a vast flooded cathedral of black stone, half-drowned bronze bells, sickly teal luminescence, no people, wide empty space in the center',
  steam: 'the interior of a colossal brass dome city, endless gearworks and pipe forests, amber gaslight haze, no people, wide empty space in the center',
  cultivation: 'nine floating cloud seas above a severed heaven gate, jade pillars, vast empty sky, no people, wide empty space in the center',
  fantasy: 'a cathedral of a shattered oath, banners and shattered stained glass, cold gold light, no people, wide empty space in the center',
  neon: 'a rain-drenched cyberpunk jianghu alley, neon kanji signs reflected in puddles, no people, wide empty space in the center',
  wa: 'an endless stone stairway under a torii gate at night, drifting cherry blossoms and paper lanterns, no people, wide empty space in the center',
  west: 'a dust-choked frontier railroad at sunset, an empty town that does not exist, no people, wide empty space in the center',
  anime: 'a continent of stacked unfinished storybook pages floating in the void, a spinning coin of light, no people, wide empty space in the center'
};

/* ---------- 角色外观描述：按 id 写死，保证与人物设定吻合 ---------- */
const CHAR_LOOK = {
  'cth-01': 'a brooding male lamplighter in a dark teal hooded cloak holding a lantern with cold blue-green flame',
  'cth-02': 'a calm female tidal priestess in pale seafoam ritual robes with a coral bead veil',
  'cth-03': 'an androgynous astral seer wrapped in star charts, one eye replaced by a cluster of cold white stars',
  'cth-04': 'a wild-eyed poet with ink-stained fingers clutching a crumpled scroll, wild hair, a quill and spilled ink',
  'stm-01': 'a pragmatic female brass surgeon in an oil-stained leather apron with brass goggles pushed up on her forehead, holding a heavy wrench like a surgical tool',
  'stm-02': 'a hard-bitten male bounty gunslinger with a brass steam-powered rifle braced on his shoulder, scarred face, half mechanical left arm',
  'stm-03': 'an eccentric male clockwork inventor with brass gears fused into one arm, round goggles, blueprints scattered',
  'stm-04': 'a reckless female test pilot in a leather flight jacket and goggles, wind-blown hair, a brass plane propeller behind her',
  'cul-01': 'a stern male sword sovereign in layered jade-and-white robes, a slender longsword held level, hair tied high',
  'cul-02': 'an elderly male turtle hermit in coarse grey-blue daoist robes, long white beard, a tortoise-shell motif on his back',
  'cul-03': 'a gentle female elixir immortal in soft cinnabar and jade silk, a small medicine gourd and glowing herb, sad gentle eyes',
  'cul-04': 'a arrogant male rogue cultivator with unbound hair and a torn black-gold robe, one hand wreathed in rebellious lightning',
  'fan-01': 'a noble male templar knight in burnished plate armor and a white tabard with a gold sun, a heavy tower shield',
  'fan-02': 'a cold female shadow-blade ranger in dark green leather, twin short blades, a hood low over her eyes',
  'fan-03': 'a detached female astral sorceress in layered violet robes covered in star charts, a floating orrery of brass rings',
  'fan-04': 'a suave male fortune gambler in white and gold with dice and cards in hand, a fox-like smile',
  'neo-01': 'a cold male neon blade in a black techwear coat, a glowing cyan energy katana held low, rain streaks',
  'neo-02': 'a stoic male cybernetic monk in grey prayer beads over carbon armor, one arm of brushed metal, faint jade HUD light',
  'neo-03': 'a fast-talking male data-scribe with a shaved head, holographic code scrolling over his eyes, finger raised mid-explanation',
  'neo-04': 'a laid-back male quantum ronin with a headset and a long magenta scarf, a half-transparent hologram blade',
  'wa-01': 'a graceful female cherry-blossom demon in white and vermilion kimono with a fox mask pushed to her side, petals in the air',
  'wa-02': 'a gentle female shrine maiden in white and red miko robes holding a paper lantern and a wand of purification paper',
  'wa-03': 'a composed male origami onmyoji in layered paper-folded robes, floating folded paper talismans',
  'wa-04': 'a maddening male hundred-flower ghost in ragged indigo robes, hollow glowing eyes, ink dripping upward',
  'wes-01': 'a terse male bounty hunter in a dust-covered duster coat and wide-brim hat, a single-cylinder revolver held low',
  'wes-02': 'a resolute female railroad guard in a worn leather coat with a lantern, iron rail spikes on her gauntlets',
  'wes-03': 'a worldly old male saloon owner with a thick moustache, a bar towel over his shoulder, half-full glasses',
  'wes-04': 'a reckless female daredevil in a fringed red jacket and a bandana, twin revolvers, laughing',
  'ani-01': 'a cocky male champion swordsman with a golden circlet and a cloud-patterned cape, holding a jade-energised staff, blazing aura',
  'ani-02': 'a serious female moon-shadow swordswoman in a white and violet haori, katana held in a perfect stance, moonlight',
  'ani-03': 'an arrogant male fog-city detective in a long trench coat and fedora, one hand raised in a stop gesture, magnifying lens glinting',
  'ani-04': 'a hot-blooded female star-rail hero in a red and white pilot suit, a radiant spiral of light behind her, determined grin'
};

const ROLE_TONE = {
  '输出': 'aggressive forward-leaning stance',
  '防御': 'grounded protective stance, shield-forward posture',
  '功能': 'composed calculating posture, one hand raised in a gesture',
  '赌徒': 'reckless playful posture, mid-gesture, a hint of a grin'
};

/* ---------- 卡面：按 分类 × 世界 生成意象，避免 150 张雷同 ---------- */
const CATEGORY_MOTIF = {
  attack: 'a dynamic weapon strike, a blade or gun mid-swing, sharp motion streaks and sparks',
  defense: 'a glowing ward of light, a shield of woven energy, soft protective halo',
  control: 'binding chains of light, floating rune seals and precision mechanisms',
  risk: 'a burning stack of gold chips on a knife edge, a split second before the fall',
  style: 'a distinctive regional emblem, a symbolic weapon and a proud crest'
};

const RARITY_TONE = {
  common: 'restrained muted lighting',
  rare: 'clean cool key light with a faint aura',
  epic: 'violet and gold dramatic light, drifting motes',
  legendary: 'blazing molten gold rim light, radiant halo, ornate filigree of light'
};

const SUBJECT_MOTIF = {
  attack: ['a lunging strike', 'a downward cleave', 'a precise thrust', 'a spinning whirlwind slash', 'a sudden ambush', 'a charging bull rush', 'a cracking whip strike', 'a lightning-fast flick'],
  defense: ['a braced stance behind a barrier', 'a bandaged arm holding firm', 'a temple shield raised', 'a woven paper screen', 'a mirrored reflection ward', 'a heavy iron guard', 'a moonlit aegis', 'a broken shell re-forming'],
  control: ['a sealed lock of light', 'a severed signal line', 'a whispering fog of glyphs', 'a network of chains', 'a scrambled ledger', 'a countdown of falling numbers', 'a masked false face', 'a rewritten page of fate'],
  risk: ['a coin balanced on a knife edge', 'a burning stack of chips', 'a red thread of fate being cut', 'a die rolling past the edge', 'a heart offered on a scale', 'a leap into empty air', 'a soul poured into a furnace', 'a final desperate surge'],
  style: ['a proud clan emblem', 'a signature relic held aloft', 'a regional banner unfurling', 'a beast of legend in silhouette', 'a sworn oath taken', 'a talisman burning to ash', 'a lone figure against a vast landscape', 'an heirloom blade drawn']
};

function charPrompt(c) {
  const look = CHAR_LOOK[c.id] || 'a mysterious warrior in layered robes';
  const tone = ROLE_TONE[c.role] || 'upright heroic stance';
  return [
    'Chinese Three Kingdoms fantasy trading card game character portrait.',
    look + ',',
    tone + ',',
    'world: ' + c.styleName + ' — ' + STYLE_ART[c.style] + ',',
    'cinematic rim lighting, painterly digital art, strong silhouette, dark unobtrusive background,',
    'no text, no logo, no watermark, no letters, vertical 3:4 upper body hero composition,'
  ].join(' ');
}

function cardPrompt(card) {
  const motifs = SUBJECT_MOTIF[card.category];
  const idx = (parseInt(card.id.split('-')[1], 10) - 1) % motifs.length;
  return [
    'Chinese Three Kingdoms fantasy trading card game illustration,',
    motifs[idx] + ' symbolizing the skill "' + card.name + '",',
    'category mood: ' + CATEGORY_MOTIF[card.category] + ',',
    'world: ' + card.styleName + ' — ' + STYLE_ART[card.style] + ',',
    'rarity mood: ' + (RARITY_TONE[card.rarity] || RARITY_TONE.common) + ',',
    'single strong subject centered with clear silhouette, cinematic lighting, painterly digital art,',
    'no text, no logo, no watermark, no letters, no UI frame, vertical 3:4 composition'
  ].join(' ');
}

function bgPrompt(styleId, name) {
  return [
    'Chinese Three Kingdoms fantasy trading card game background art,',
    STYLE_BG[styleId] + ',',
    'dark cinematic value range kept low in the middle for UI overlay,',
    'painterly digital art, no text, no logo, no watermark, no letters, no characters, 16:9 wide composition'
  ].join(' ');
}

const items = [];

D.CHARACTERS.forEach((c) => {
  items.push({
    id: c.id,
    kind: 'portrait',
    out: 'assets/art/portraits/' + c.id + '.webp',
    size: '1024x1536',
    prompt: charPrompt(c)
  });
});

D.CARDS.forEach((c) => {
  items.push({
    id: c.id,
    kind: 'card',
    out: 'assets/art/cards/' + c.id + '.webp',
    size: '1024x1536',
    prompt: cardPrompt(c)
  });
});

D.STYLE_ORDER.forEach((sid) => {
  items.push({
    id: 'bg-' + sid,
    kind: 'bg',
    out: 'assets/art/bg/' + sid + '.webp',
    size: '1920x1080',
    prompt: bgPrompt(sid, D.STYLES[sid].name)
  });
});

items.push({
  id: 'bg-corridor',
  kind: 'bg',
  out: 'assets/art/bg/corridor.webp',
  size: '1920x1080',
  prompt: [
    'Chinese Three Kingdoms fantasy trading card game main menu background,',
    'the central hall of a timeless casino between eight worlds, a colossal double-faced coin suspended in the air,',
    'eight arched doorways each glowing with a different color, dark gold and deep ink palette,',
    'dark cinematic value range kept low in the middle for UI overlay,',
    'painterly digital art, no text, no logo, no watermark, no letters, no characters, 16:9 wide composition'
  ].join(' ')
});

items.push({
  id: 'bg-battle',
  kind: 'bg',
  out: 'assets/art/bg/battle.webp',
  size: '1920x1080',
  prompt: [
    'Chinese Three Kingdoms fantasy trading card game battle table background,',
    'a dark oval gambling table of black lacquer and gold inlay seen from a low angle,',
    'two empty card wells facing each other, coin dust floating in a shaft of light,',
    'deep ink black and antique gold palette,',
    'dark cinematic value range kept low in the middle for UI overlay,',
    'painterly digital art, no text, no logo, no watermark, no letters, no characters, 16:9 wide composition'
  ].join(' ')
});

mkdirSync(join(ROOT, 'assets', 'art'), { recursive: true });
writeFileSync(join(ROOT, 'assets', 'art', 'prompts.json'), JSON.stringify(items, null, 1), 'utf8');
console.log('prompts.json 已生成：' + items.length + ' 条');
console.log('  portraits ' + items.filter((i) => i.kind === 'portrait').length);
console.log('  cards     ' + items.filter((i) => i.kind === 'card').length);
console.log('  bg        ' + items.filter((i) => i.kind === 'bg').length);
