import { chromium } from 'playwright-core';
const exe = 'C:/Users/65259/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe';
const browser = await chromium.launch({ executablePath: exe, headless: true });
const ctx = await browser.newContext();
const host = await ctx.newPage();
const guest = await ctx.newPage();
const errors = [];
for (const [name, p] of [['host', host], ['guest', guest]]) {
  p.on('pageerror', e => errors.push(name + ' PAGEERROR ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/ERR_CONNECTION_RESET/.test(m.text())) errors.push(name + ' CONSOLE ' + m.text()); });
}
await host.goto('http://127.0.0.1:8787/', { waitUntil: 'networkidle' });
await guest.goto('http://127.0.0.1:8787/', { waitUntil: 'networkidle' });

await host.locator('.main-nav [data-nav="lobby"]').click();
await host.waitForTimeout(350);
await host.locator('#host-name').fill('队长');
await host.locator('#host-mode').selectOption('team');
await host.waitForTimeout(250);
await host.locator('#host-team-a').selectOption('2');
await host.locator('#host-team-b').selectOption('2');
console.log('team fields visible', await host.locator('#host-team-fields').isVisible());
await host.locator('#create-room').click();
let code = '';
for (let i = 0; i < 40; i++) {
  await host.waitForTimeout(500);
  const text = await host.locator('#room-code').textContent();
  if (text && text !== 'CF-0000') { code = text; break; }
}
console.log('room', code);
await guest.locator('.main-nav [data-nav="lobby"]').click();
await guest.waitForTimeout(300);
await guest.locator('#join-name').fill('队员');
await guest.locator('#join-code').fill(code);
await guest.locator('#join-room').click();
for (let i = 0; i < 30; i++) {
  await guest.waitForTimeout(500);
  if (/已连接|入席/.test(await guest.locator('#room-status').textContent())) break;
}
await host.locator('#start-online').click();
await host.waitForTimeout(1200);

const hostState = await host.evaluate(() => {
  const g = CF_UI.S.game;
  return {
    mode: g.modeName, order: g.order.join(','), sizes: g.teamSizes,
    players: g.players.map(p => ({ id: p.id, team: p.team, ai: p.isAI, human: p.isHuman, name: p.name }))
  };
});
const guestState = await guest.evaluate(() => {
  const g = CF_UI.S.viewGame;
  return {
    mode: g.modeName, order: g.order.join(','), sizes: g.teamSizes,
    players: g.players.map(p => ({ id: p.id, team: p.team, ai: p.isAI, human: p.isHuman, name: p.name }))
  };
});
console.log('host 2v2', JSON.stringify(hostState));
console.log('guest 2v2', JSON.stringify(guestState));
console.log('battle screens', await host.locator('#screen-battle').isVisible(), await guest.locator('#screen-battle').isVisible());
console.log('guest combatants', await guest.locator('.combatant').count(), 'guest ally tabs', await guest.locator('[data-ally-focus]').count(), 'guest hand', await guest.locator('#hand .fate-card').count());

// host opening turn -> guest next
const waitAction = async (page, id) => {
  for (let i = 0; i < 60; i++) {
    const st = await page.evaluate(() => {
      const g = CF_UI.S.online.role === 'guest' ? CF_UI.S.viewGame : CF_UI.S.game;
      return g ? { cur: g.order[g.currentIndex], phase: g.phase } : null;
    });
    if (st && st.cur === id && st.phase === 'action') return true;
    await page.waitForTimeout(250);
  }
  return false;
};
await waitAction(host, 'p0');
await host.locator('#hand .fate-card').first().click();
await host.locator('[data-action="play-selected"]').click();
await host.locator('#flip-overlay').waitFor({ state: 'visible', timeout: 8000 });
await host.locator('[data-flip-choice="accept"]').click();
await host.locator('#flip-overlay').waitFor({ state: 'hidden', timeout: 8000 });
console.log('guest gets turn after host in 2v2', await waitAction(guest, 'p1'));
await guest.locator('#hand .fate-card').first().click();
await guest.locator('[data-action="play-selected"]').click();
await guest.locator('#flip-overlay').waitFor({ state: 'visible', timeout: 8000 });
await guest.locator('[data-flip-choice="accept"]').click();
await guest.locator('#flip-overlay').waitFor({ state: 'hidden', timeout: 8000 });
const after = await host.evaluate(() => {
  const g = CF_UI.S.game;
  return { cur: g.order[g.currentIndex], phase: g.phase, log: g.log.slice(-4).map(x => x.text) };
});
console.log('after guest play host state', JSON.stringify(after));
console.log('errors', errors);
await browser.close();