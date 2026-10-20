import { chromium } from 'playwright-core';
const BASE = process.env.COINFALL_URL || 'http://127.0.0.1:8787/';
const exe = 'C:/Users/65259/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe';
const browser = await chromium.launch({ executablePath: exe, headless: true });
const ctx = await browser.newContext();
const host = await ctx.newPage();
const guest = await ctx.newPage();
const errors = [];
for (const [name, p] of [['host', host], ['guest', guest]]) {
  p.on('pageerror', e => errors.push(name + ' PAGEERROR ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push(name + ' CONSOLE ' + m.text()); });
}
const waitTurn = async (page, who, timeout = 15000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const chip = (await page.locator('#turn-chip').textContent().catch(() => '')) || '';
    const state = await page.evaluate(() => {
      if (!window.CF_UI || !CF_UI.S) return null;
      const g = CF_UI.S.online.role === 'guest' ? CF_UI.S.viewGame : CF_UI.S.game;
      if (!g) return null;
      const current = g.order && g.order[g.currentIndex];
      return { phase: g.phase, current: current, viewer: CF_UI.S.viewerId, pending: !!g.pending, round: g.round };
    }).catch(() => null);
    if (state && state.current === who && state.phase === 'action') return { chip: chip.trim(), state };
    await page.waitForTimeout(250);
  }
  return null;
};
const takeTurn = async (page, label) => {
  const hand = page.locator('#hand .fate-card');
  const n = await hand.count();
  console.log(label, 'hand cards', n);
  if (!n) throw new Error(label + ' has empty hand');
  await hand.first().click();
  await page.locator('[data-action="play-selected"]').click();
  await page.locator('#flip-overlay').waitFor({ state: 'visible', timeout: 8000 });
  const result = (await page.locator('#flip-result').textContent().catch(() => '')) || '';
  console.log(label, 'flip:', result.replace(/\s+/g, ' ').slice(0, 80));
  const accept = page.locator('[data-flip-choice="accept"]');
  await accept.click();
  await page.locator('#flip-overlay').waitFor({ state: 'hidden', timeout: 8000 });
  return result;
};

await host.goto(BASE, { waitUntil: 'networkidle' });
await guest.goto(BASE, { waitUntil: 'networkidle' });
await host.locator('.main-nav [data-nav="lobby"]').click();
await host.waitForTimeout(400);
await host.locator('#host-name').fill('房主测试');
await host.locator('#create-room').click();
let code = '';
for (let i = 0; i < 40; i++) {
  await host.waitForTimeout(500);
  const text = await host.locator('#room-code').textContent();
  if (text && text !== 'CF-0000') { code = text; break; }
}
console.log('room code', code);
console.log('host status', await host.locator('#room-status').textContent());
if (!code) {
  console.log('errors', errors);
  await browser.close();
  process.exit(2);
}
await guest.locator('.main-nav [data-nav="lobby"]').click();
await guest.waitForTimeout(300);
await guest.locator('#join-name').fill('访客测试');
await guest.locator('#join-code').fill(code);
await guest.locator('#join-room').click();
for (let i = 0; i < 30; i++) {
  await guest.waitForTimeout(500);
  const st = await guest.locator('#room-status').textContent();
  if (/已连接|入席/.test(st)) break;
}
console.log('guest status', await guest.locator('#room-status').textContent());
console.log('host guest slot', (await host.locator('#room-slots').textContent()).replace(/\s+/g, ' '));
console.log('start enabled', await host.locator('#start-online').isEnabled());
await host.locator('#start-online').click();
await host.waitForTimeout(1200);
console.log('host battle', await host.locator('#screen-battle').isVisible(), 'guest battle', await guest.locator('#screen-battle').isVisible());
console.log('guest mode', await guest.locator('#battle-mode-name').textContent());
console.log('guest hand', await guest.locator('#hand .fate-card').count());

// --- Turn sync: host (p0) acts, then guest (p1) must get the turn.
const hostTurn = await waitTurn(host, 'p0');
console.log('host has opening turn', JSON.stringify(hostTurn));
await takeTurn(host, 'host');
const guestTurn = await waitTurn(guest, 'p1', 20000);
console.log('guest got turn after host play', JSON.stringify(guestTurn));
if (!guestTurn) throw new Error('guest never received turn');
await takeTurn(guest, 'guest');
const hostTurn2 = await waitTurn(host, 'p0', 20000);
console.log('host got turn after guest play', JSON.stringify(hostTurn2));
if (!hostTurn2) throw new Error('host never received turn back');

// --- Chat sync both ways.
await host.locator('#chat-input').fill('访客，出攻击牌，别掉链子');
await host.locator('#chat-input').press('Enter');
await guest.waitForTimeout(900);
const guestChat = (await guest.locator('#battle-chat').textContent()).replace(/\s+/g, ' ');
console.log('guest sees host chat', guestChat.includes('别掉链子'), guestChat.slice(-120));
await guest.locator('#chat-input').fill('收到，看我这一手');
await guest.locator('#chat-input').press('Enter');
await host.waitForTimeout(900);
const hostChat = (await host.locator('#battle-chat').textContent()).replace(/\s+/g, ' ');
console.log('host sees guest chat', hostChat.includes('看我这一手'), hostChat.slice(-120));

// --- State consistency: both sides agree on round + HP totals.
const hostSnap = await host.evaluate(() => {
  const g = CF_UI.S.game;
  return { round: g.round, turn: g.turn, hp: g.players.map(p => p.chars.map(u => u.hp).join('')).join(','), phase: g.phase };
});
const guestSnap = await guest.evaluate(() => {
  const g = CF_UI.S.viewGame;
  return { round: g.round, turn: g.turn, hp: g.players.map(p => p.chars.map(u => u.hp).join('')).join(','), phase: g.phase };
});
console.log('host snapshot', JSON.stringify(hostSnap));
console.log('guest snapshot', JSON.stringify(guestSnap));
console.log('round/hp consistent', hostSnap.round === guestSnap.round && hostSnap.hp === guestSnap.hp);

console.log('errors', errors);
await browser.close();