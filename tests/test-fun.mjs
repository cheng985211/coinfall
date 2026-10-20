import { chromium } from 'playwright-core';
const exe = 'C:/Users/65259/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe';
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--no-sandbox'] });
const errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !/ERR_CONNECTION_RESET/.test(m.text())) errors.push('CONSOLE ' + m.text()); });
const game = () => page.evaluate(() => {
  const g = CF_UI.S.game;
  if (!g) return null;
  return {
    mode: g.mode, modeName: g.modeName, round: g.round, turn: g.turn, phase: g.phase,
    current: g.order && g.order[g.currentIndex],
    hp: g.players.map(p => ({ id: p.id, team: p.team, name: p.name, char: p.chars.map(u => u.name + ':' + u.hp).join('|'), cards: p.hand.length, rerolls: p.rerolls, chain: p.chain })),
    mirror: g.mirror || false,
    codex: g.rules
  };
});
const overt = async (label) => {
  const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth, active: document.querySelector('.screen.is-active')?.id }));
  console.log('OVERFLOW', label, r.sw, '/', r.iw, r.sw > r.iw + 1 ? 'BAD' : 'ok', r.active);
};
const home = async () => { await page.locator('.brand').click(); await page.waitForTimeout(350); };
const startMode = async (mode) => {
  await home();
  await page.locator('.mode-card[data-mode="' + mode + '"]').click();
  await page.waitForTimeout(350);
  await page.locator('#start-match').click();
  await page.waitForTimeout(650);
};
const leave = async () => {
  if (await page.locator('#flip-overlay').isVisible().catch(() => false)) {
    const accept = page.locator('[data-flip-choice="accept"]');
    if (await accept.count()) { await accept.click().catch(() => {}); await page.waitForTimeout(400); }
  }
  await page.locator('[data-action="leave-battle"]').click();
  await page.waitForTimeout(350);
};
const playOne = async (label) => {
  const card = page.locator('#hand .fate-card').first();
  await card.click();
  await page.locator('[data-action="play-selected"]').click();
  await page.locator('#flip-overlay').waitFor({ state: 'visible', timeout: 6000 });
  const accept = page.locator('[data-flip-choice="accept"]');
  await accept.waitFor({ state: 'visible', timeout: 12000 });
  await accept.click();
  await page.locator('#flip-overlay').waitFor({ state: 'hidden', timeout: 6000 });
};
await page.goto('http://127.0.0.1:8787/', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
console.log('fun cards', await page.locator('#fun-mode-grid .mode-card').count());
const funNames = await page.locator('#fun-mode-grid .mode-card strong').allTextContents();
console.log('fun names', funNames.join(' / '));

// 1. mirror
await startMode('mirror');
let g = await game();
console.log('MIRROR', g.modeName, 'identical', g.hp[0].char === g.hp[1].char, g.hp.map(x => x.char));
await overt('mirror');
await leave();

// 2. frenzy: multiple cards in one turn
await startMode('frenzy');
g = await game();
console.log('FRENZY', g.modeName, 'turn', g.turn, 'phase', g.phase, 'pending');
await playOne('frenzy1');
for (let i = 0; i < 20; i++) {
  g = await game();
  if (g.current === 'p0' && g.phase === 'action') break;
  await page.waitForTimeout(250);
}
console.log('FRENZY after 1 card current', g.current, 'phase', g.phase, 'turn', g.turn);
if (g.current === 'p0' && g.phase === 'action') {
  await playOne('frenzy2');
  g = await game();
  console.log('FRENZY after 2 cards current', g.current, 'phase', g.phase, 'turn', g.turn);
}
await leave();

// 3. sudden death: 1 HP + heal->shield
await startMode('sudden');
g = await game();
console.log('SUDDEN', g.modeName, 'hp', g.hp.map(x => x.char).join(' vs '));
await leave();

// 4. chain: chip visible + chain value after a successful flip
await startMode('chain');
g = await game();
console.log('CHAIN', g.modeName, 'chip', (await page.locator('#reroll-status').textContent()).replace(/\s+/g, ' '));
await leave();

// 5. chaos
await startMode('chaos');
g = await game();
console.log('CHAOS', g.modeName, 'hand sizes', g.hp.map(x => x.cards).join('/'));
await leave();

// 6. 3v3 ally tabs
await home();
await page.locator('.mode-card[data-mode="team"]').click();
await page.waitForTimeout(350);
await page.locator('#team-size-a [data-size="3"]').click();
await page.locator('#team-size-b [data-size="3"]').click();
await page.locator('#start-match').click();
await page.waitForTimeout(700);
console.log('TEAM3 combatants', await page.locator('.combatant').count(), 'ally tabs', await page.locator('.ally-tab, [data-ally-focus]').count());
const tabCount = await page.locator('[data-ally-focus]').count();
if (tabCount >= 2) {
  const before = await page.locator('[data-ally-focus].is-active').textContent().catch(() => '');
  await page.locator('[data-ally-focus]').nth(1).click();
  await page.waitForTimeout(200);
  const after = await page.locator('[data-ally-focus].is-active').textContent().catch(() => '');
  console.log('ALLY SWITCH', before.trim(), '->', after.trim(), 'changed', before !== after);
}
await overt('team3');
await leave();

// 7. deck builder save
await home();
await page.locator('.mode-card[data-mode="standard"]').click();
await page.waitForTimeout(300);
await page.locator('[data-deck-mode="custom"]').click();
await page.waitForTimeout(350);
console.log('deck builder opened', await page.locator('.deck-builder').count());
const picks = page.locator('.deck-pick');
console.log('deck picks', await picks.count());
for (let i = 0; i < 10; i++) await picks.nth(i).click();
await page.waitForTimeout(250);
console.log('deck counter', (await page.locator('.deck-builder__count').textContent()).replace(/\s+/g, ' '), 'save disabled', await page.locator('#save-deck').isDisabled());
await page.locator('#save-deck').click();
await page.waitForTimeout(400);
console.log('deck summary after save', (await page.locator('#deck-summary').textContent()).replace(/\s+/g, ' ').slice(0, 90));
console.log('deck count label', await page.locator('#deck-count').textContent());
await page.locator('#start-match').click();
await page.waitForTimeout(700);
g = await game();
console.log('custom-deck battle', g && g.modeName, 'hand', g && g.hp[0].cards);
await leave();

// 8. settings persistence (model/base only, no key)
await home();
await page.locator('.header-actions [data-action="settings"]').click();
await page.waitForTimeout(300);
await page.locator('[data-settings-tab="ai"]').click();
await page.waitForTimeout(150);
await page.locator('#set-ai-model').fill('deepseek1017');
await page.locator('#set-ai-timeout').fill('12000');
await page.locator('#save-settings').click();
await page.waitForTimeout(300);
await page.locator('.header-actions [data-action="settings"]').click();
await page.waitForTimeout(300);
await page.locator('[data-settings-tab="ai"]').click();
await page.waitForTimeout(150);
console.log('SETTINGS persisted model', await page.locator('#set-ai-model').inputValue(), 'timeout', await page.locator('#set-ai-timeout').inputValue());
await page.locator('.modal-close').first().click();

// 9. rematch / game over (auto-end turns)
await startMode('quick');
let over = false;
for (let i = 0; i < 45; i++) {
  g = await game();
  if (g.phase === 'over') { over = true; break; }
  if (g.current === 'p0' && g.phase === 'action') {
    const end = page.locator('[data-action="end-turn"]');
    if (await end.count()) await end.click();
  }
  await page.waitForTimeout(650);
}
g = await game();
console.log('OVER?', over, g && g.phase, g && g.hp.map(x => x.char));
if (g && g.phase === 'over') {
  await page.waitForTimeout(1100);
  const rematch = page.locator('[data-action="rematch"]');
  console.log('result modal', await page.locator('#modal-root .result-sheet').count(), 'rematch visible', await rematch.isVisible().catch(() => false));
  if (await rematch.count()) {
    await rematch.click();
    await page.waitForTimeout(700);
    const g2 = await game();
    console.log('REMATCH new round', g2 && g2.round, 'phase', g2 && g2.phase, 'turn', g2 && g2.turn);
  }
}

console.log('ERRORS', JSON.stringify(errors, null, 2));
await browser.close();