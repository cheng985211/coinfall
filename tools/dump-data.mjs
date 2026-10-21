import { readFileSync } from 'fs';
const src = readFileSync(new URL('../data.js', import.meta.url), 'utf8');
const g = { window: {} };
new Function('window', src)(g.window);
const D = g.window.CF_DATA;
console.log('KEYS', Object.keys(D).join(','));
console.log('CHARS', D.CHARACTERS.length, 'CARDS', D.CARDS.length);
const out = {
  characters: D.CHARACTERS.map(c => ({ id: c.id, name: c.name, title: c.title, style: c.style, role: c.role, active: c.active.name, quote: c.quote, activeQuote: c.active.quote, temper: c.temper })),
  cards: D.CARDS.map(c => ({ id: c.id, name: c.name, cat: c.category, catName: c.categoryName, style: c.style, styleName: c.styleName, rarity: c.rarity, rarityName: c.rarityName, flavor: c.flavor }))
};
console.log(JSON.stringify(out));
