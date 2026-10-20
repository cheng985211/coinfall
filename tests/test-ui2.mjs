import { chromium } from 'playwright-core';
import fs from 'node:fs';
const exe = 'C:/Users/65259/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe';
fs.mkdirSync('shots', { recursive: true });
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--no-sandbox'] });
const errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
const overt = async (label) => {
  const r = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth, iw: window.innerWidth,
    sh: document.documentElement.scrollHeight, ih: window.innerHeight,
    active: document.querySelector('.screen.is-active')?.id
  }));
  console.log('OVERFLOW', label, r, r.sw > r.iw + 1 ? 'HORIZONTAL-OVERFLOW' : 'ok');
};
await page.goto('http://127.0.0.1:8787/', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await overt('home');

// collection
await page.locator('.main-nav [data-nav="collection"]').click();
await page.waitForTimeout(500);
console.log('archive chars', await page.locator('#archive-grid .archive-char').count());
await page.locator('#archive-tabs [data-archive-tab="cards"]').click();
await page.waitForTimeout(500);
console.log('archive cards', await page.locator('#archive-grid .fate-card').count());
await page.locator('#archive-grid .fate-card').first().click();
await page.waitForTimeout(300);
console.log('card modal', await page.locator('#modal-root .detail-sheet--card').count(), 'prompt', await page.locator('.prompt-box').count());
await page.locator('.modal-close').first().click();
await overt('collection');

// world
await page.locator('.main-nav [data-nav="world"]').click();
await page.waitForTimeout(500);
console.log('world realms', await page.locator('.world-realm').count(), 'factions', await page.locator('.faction-card').count(), 'laws', await page.locator('.law-card').count());
await overt('world');

// settings
await page.locator('.brand').click();
await page.waitForTimeout(300);
await page.locator('.header-actions [data-action="settings"]').click();
await page.waitForTimeout(300);
console.log('settings panes', await page.locator('[data-settings-pane]').count(), 'ai base', await page.locator('#set-ai-base').inputValue(), 'model', await page.locator('#set-ai-model').inputValue());
await page.locator('[data-settings-tab="network"]').click();
console.log('network visible', await page.locator('[data-settings-pane="network"]').isVisible());
await page.locator('.modal-close').first().click();

// standard setup custom deck
await page.locator('.mode-card[data-mode="standard"]').click();
await page.waitForTimeout(400);
await page.locator('[data-deck-mode="custom"]').click();
await page.waitForTimeout(300);
console.log('deck modal', await page.locator('.deck-builder').count(), 'pick cards', await page.locator('.deck-pick').count());
await page.locator('#deck-search').fill('火');
await page.waitForTimeout(200);
console.log('filtered deck picks', await page.locator('.deck-pick').count());
await page.locator('.modal-close').first().click();
await page.locator('[data-deck-mode="random"]').click();
await page.waitForTimeout(200);

// frenzy battle
await page.locator('.brand').click();
await page.waitForTimeout(250);
await page.locator('.mode-card[data-mode="frenzy"]').click();
await page.waitForTimeout(400);
await page.locator('#start-match').click();
await page.waitForTimeout(600);
console.log('frenzy mode', await page.locator('#battle-mode-name').textContent(), 'hand label', await page.locator('#hand-count').textContent());
await overt('frenzy battle');
await page.screenshot({ path: 'shots/frenzy.png', fullPage: false });

// 4v4
await page.locator('[data-action="leave-battle"]').click();
await page.waitForTimeout(300);
await page.locator('.mode-card[data-mode="team"]').click();
await page.waitForTimeout(300);
await page.locator('#team-size-a [data-size="4"]').click();
await page.locator('#team-size-b [data-size="4"]').click();
await page.locator('#start-match').click();
await page.waitForTimeout(700);
console.log('4v4 combatants', await page.locator('.combatant').count(), 'enemy rows', await page.locator('#enemy-board .combatant').count());
await overt('4v4 battle');
await page.screenshot({ path: 'shots/battle-4v4.png', fullPage: false });

// mobile
const mob = await browser.newPage({ viewport: { width: 390, height: 844 } });
mob.on('pageerror', e => errors.push('MOBILE PAGEERROR ' + e.message));
await mob.goto('http://127.0.0.1:8787/', { waitUntil: 'networkidle' });
await mob.waitForTimeout(500);
const mobOver = async (label) => {
  const r = await mob.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth, active: document.querySelector('.screen.is-active')?.id }));
  console.log('MOBILE OVERFLOW', label, r, r.sw > r.iw + 1 ? 'HORIZONTAL-OVERFLOW' : 'ok');
};
await mobOver('home');
await mob.locator('.mode-card[data-mode="team"]').click();
await mob.waitForTimeout(350);
await mobOver('setup');
await mob.locator('#team-size-a [data-size="3"]').click();
await mob.locator('#team-size-b [data-size="3"]').click();
await mob.locator('#start-match').click();
await mob.waitForTimeout(700);
await mobOver('battle');
await mob.screenshot({ path: 'shots/battle-mobile.png', fullPage: false });
console.log('mobile card width', await mob.locator('#hand .fate-card').first().evaluate(el => el.getBoundingClientRect().width));
console.log('mobile arena width', await mob.locator('#arena').evaluate(el => el.getBoundingClientRect().width));
console.log('ERRORS', JSON.stringify(errors, null, 2));
await browser.close();