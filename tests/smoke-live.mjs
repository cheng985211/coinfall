import { chromium } from 'playwright-core';
const URL = process.env.COINFALL_URL || 'https://cheng985211.github.io/coinfall/';
const exe = 'C:/Users/65259/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe';
const browser = await chromium.launch({ executablePath: exe, headless: true });
const errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !/ERR_ABORTED|ERR_CONNECTION_RESET/.test(m.text())) errors.push('CONSOLE ' + m.text()); });
try {
  const res = await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(4000);
  const title = await page.title();
  const stats = await page.evaluate(() => ({
    chars: document.querySelector('#stat-chars')?.textContent,
    cards: document.querySelector('#stat-cards')?.textContent,
    modes: document.querySelector('#stat-modes')?.textContent,
    core: document.querySelectorAll('#mode-grid .mode-card').length,
    fun: document.querySelectorAll('#fun-mode-grid .mode-card').length
  }));
  console.log('HTTP', res.status(), 'title', JSON.stringify(title));
  console.log('stats', JSON.stringify(stats));
  const modes = stats.modes || '?';
  const core = stats.core ?? -1;
  const fun = stats.fun ?? -1;
  const okStats = stats.chars === '44' && stats.cards === '190' && modes === '19';
  const okModes = core === 11 && fun === 8;
  console.log('LIVE_SMOKE', okStats && okModes ? 'PASS' : 'CHECK', okStats ? 'stats-ok' : 'stats-mismatch', okModes ? 'modes-ok' : 'modes-mismatch');
} catch (e) {
  console.log('LIVE_SMOKE FAIL', e.message.split('\n')[0]);
}
console.log('errors', errors.length ? errors : 'none');
await browser.close();
