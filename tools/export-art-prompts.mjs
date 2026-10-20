#!/usr/bin/env node
/* 导出全部美术提示词到 ART_PROMPTS.md
   用法：node tools/export-art-prompts.mjs
*/
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const D = require(path.join(ROOT, 'data.js'));

const NEGATIVE = 'text, watermark, logo, signature, UI, card frame, border, lowres, blurry, bad anatomy, extra fingers, deformed hands, duplicate character, collage, split screen, oversaturated, neon rainbow, modern logo, copyrighted character, existing anime IP, photorealistic face';

const lines = [];
const push = (s = '') => lines.push(s);

push('# 命途回廊 · COINFALL — 全部美术提示词');
push('');
push(`> 由 \`tools/export-art-prompts.mjs\` 从 \`data.js\` 自动生成。共 ${D.CHARACTERS.length} 名角色、${D.CARDS.length} 张技能卡、${D.BOSSES.length} 个 Boss、${D.STYLE_ORDER.length} 个世界。`);
push('');
push('## 通用负面提示词');
push('');
push('```text');
push(NEGATIVE);
push('```');
push('');
push('## 生成参数');
push('');
push('- 角色 / 卡牌：1024×768，4:3，主体避开顶部 18%、底部 28% 文案区。');
push('- 世界背景：1920×1080，16:9，画面留出 UI 暗部。');
push('- 硬币 / Boss 头像：1024×1024，1:1。');
push('- 不要把文字、卡框、UI、水印生成进图；名称与效果由 HTML/CSS 叠加。');
push('- 同一世界固定风格锚图与 seed，保证光源、色温、材质一致。');
push('');
push('---');
push('');
push('## 一、八个世界');
push('');
for (const styleId of D.STYLE_ORDER) {
  const s = D.STYLES[styleId];
  push(`### ${s.name} · ${s.realm}`);
  push('');
  push('```text');
  push(`暗黑奇幻场景概念图，电影级布光，超广角环境，无人物，无文字，无水印，16:9。世界：${s.realm}（${s.name}）。${s.lore} 视觉：${s.art}。核心危机：${s.crisis} 画面下方留出暗部用于 UI，整体氛围神秘、压迫、可延展。`);
  push('```');
  push('');
}
push('---');
push('');
push('## 二、角色立绘');
push('');
D.CHARACTERS.forEach((c, i) => {
  push(`### ${String(i + 1).padStart(2, '0')}. ${c.name}`);
  push('');
  push(`- ID：\`${c.id}\``);
  push(`- 世界：${c.styleName} · ${c.realm}`);
  push(`- 定位：${c.role}`);
  push(`- 文件：\`assets/art/characters/${c.id}.webp\``);
  push('');
  push('```text');
  push(c.artPrompt);
  push('```');
  push('');
});
push('---');
push('');
push('## 三、技能卡插画');
push('');
for (const catId of Object.keys(D.CATEGORIES)) {
  const cat = D.CATEGORIES[catId];
  push(`### ${cat.name}（${D.cardsByCategory(catId).length} 张）`);
  push('');
  for (const c of D.cardsByCategory(catId)) {
    push(`#### ${c.name}`);
    push('');
    push(`- ID：\`${c.id}\` · 稀有度：${c.rarityName} · 世界：${c.styleName}`);
    push(`- 昭面：${c.posText}`);
    push(`- 昧面：${c.negText}`);
    push(`- 文件：\`assets/art/cards/${c.id}.webp\``);
    push('');
    push('```text');
    push(c.artPrompt);
    push('```');
    push('');
  }
}
push('---');
push('');
push('## 四、Boss');
push('');
D.BOSSES.forEach((b) => {
  push(`### ${b.name} · ${b.title}`);
  push('');
  push(`- ID：\`${b.id}\` · ${b.chapter}《${b.storyTitle}》`);
  push(`- 生命：${b.hp} · 被动：${b.passive.name}`);
  push(`- 文件：\`assets/art/bosses/${b.id}.webp\``);
  push('');
  push('```text');
  push(b.artPrompt);
  push('```');
  push('');
});
push('---');
push('');
push('## 五、UI 与硬币');
push('');
push('### 昭面硬币');
push('');
push('```text');
push('金属硬币正面特写，旧金色，浮雕“昭”字与太阳放射纹，边缘磨损，深色背景，电影级侧光，微距细节，无文字水印，1:1。');
push('```');
push('');
push('### 昧面硬币');
push('');
push('```text');
push('金属硬币反面特写，暗银色，浮雕“昧”字与月蚀纹，边缘磨损，深色背景，冷色轮廓光，微距细节，无文字水印，1:1。');
push('```');
push('');
push('### 卡背');
push('');
push('```text');
push('集换式卡牌卡背，深黑与旧金，中央是一枚被锁链缠绕的双面硬币，四周八域徽记，对称构图，无文字，无边框外溢，4:3。');
push('```');
push('');
push('---');
push('');
push('*生成后请检查：无文字、无现有 IP、主体避开卡框安全区、缩到 124px 仍可辨认。*');

const out = path.join(ROOT, 'ART_PROMPTS.md');
writeFileSync(out, lines.join('\n'), 'utf8');
console.log('已生成 ' + out);
console.log('角色 ' + D.CHARACTERS.length + ' · 卡牌 ' + D.CARDS.length + ' · Boss ' + D.BOSSES.length);