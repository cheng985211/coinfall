import { chromium } from 'playwright-core';
import fs from 'node:fs';

const exe = 'C:/Users/65259/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe';
fs.mkdirSync('shots', { recursive: true });
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });

await page.goto('http://127.0.0.1:8787/', { waitUntil: 'networkidle' });
await page.waitForTimeout(700);
console.log('home title', await page.title());
console.log('modes', await page.locator('#mode-grid .mode-card').count(), 'fun', await page.locator('#fun-mode-grid .mode-card').count());
await page.screenshot({ path: 'shots/home-desktop.png', fullPage: false });

await page.locator('.mode-card[data-mode="team"]').click();
await page.waitForTimeout(400);
console.log('setup visible', await page.locator('#screen-setup').isVisible(), 'team panel', await page.locator('#team-size-panel').isVisible());
await page.screenshot({ path: 'shots/setup-team.png', fullPage: false });
await page.locator('#team-size-a [data-size="3"]').click();
await page.locator('#team-size-b [data-size="3"]').click();
await page.waitForTimeout(200);
console.log('badge', await page.locator('#team-size-badge').textContent());
await page.locator('#start-match').click();
await page.waitForTimeout(900);
console.log('battle visible', await page.locator('#screen-battle').isVisible(), 'combatants', await page.locator('.combatant').count());
console.log('turn', await page.locator('#turn-chip').textContent());
await page.screenshot({ path: 'shots/battle-team-3v3.png', fullPage: false });

// play first card
const cards = page.locator('#hand .fate-card');
console.log('hand cards', await cards.count());
await cards.first().click();
await page.waitForTimeout(250);
console.log('selected', await page.locator('#arena-actions .selected-play').count());
await page.locator('[data-action="play-selected"]').click();
await page.waitForTimeout(1500);
console.log('flip overlay', await page.locator('#flip-overlay').isVisible());
await page.screenshot({ path: 'shots/flip-overlay.png', fullPage: false });
if (await page.locator('[data-flip-choice="accept"]').count()) {
  await page.locator('[data-flip-choice="accept"]').click();
  await page.waitForTimeout(1800);
}
console.log('after flip phase label', await page.locator('#turn-chip').textContent());
await page.screenshot({ path: 'shots/battle-after-flip.png', fullPage: false });

// mobile home
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
mobile.on('pageerror', e => errors.push('MOBILE PAGEERROR ' + e.message));
await mobile.goto('http://127.0.0.1:8787/', { waitUntil: 'networkidle' });
await mobile.waitForTimeout(600);
await mobile.screenshot({ path: 'shots/home-mobile.png', fullPage: false });
console.log('mobile modes', await mobile.locator('#mode-grid .mode-card').count());

console.log('ERRORS', JSON.stringify(errors, null, 2));
await browser.close();