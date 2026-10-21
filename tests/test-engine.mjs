import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const D = require('../data.js');
require('../ai.js');
const E = require('../game.js');

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const modes = ['standard', 'brawl', 'endless', 'ai', 'random', 'custom', 'quick', 'mirror', 'frenzy', 'sudden', 'chain', 'chaos'];
let games = 0, turns = 0, wins = { A: 0, B: 0, none: 0 };
for (const mode of modes) {
  for (let n = 0; n < 18; n++) {
    const rng = mulberry32(1000 + n * 31 + mode.length);
    const cfg = { modeId: mode, charId: 'cth-01', charId2: 'stm-01', deckMode: 'random', rng };
    if (mode === 'custom') { cfg.deckMode = 'random'; }
    const g = E.createGame(cfg);
    let guard = 0;
    while (g.phase !== 'over' && guard++ < 900) {
      turns++;
      if (g.phase === 'action') {
        const p = E.currentPlayer(g);
        const maxCards = g.rules.maxCards || 1;
        const canPlay = p.hand.length > 0 && (p.cardsPlayedThisTurn || 0) < maxCards;
        if (canPlay && rng() < 0.88) {
          const idx = Math.floor(rng() * p.hand.length);
          const r = E.playCard(g, p.id, idx, p.selectedTarget || undefined);
          if (!r.ok) {
            const r2 = E.endTurn(g, p.id);
            if (!r2.ok) throw new Error('stuck action ' + mode + ': ' + r.reason + ' / ' + r2.reason);
          }
        } else {
          const r = E.endTurn(g, p.id);
          if (!r.ok) throw new Error('stuck end ' + mode + ': ' + r.reason);
        }
      } else if (g.phase === 'flip') {
        const p = E.playerById(g, g.pending.actorId);
        const choice = (rng() < 0.08 && g.pending.canReroll && !g.pending.rerolled) ? 'reroll' : 'accept';
        const r = E.resolveFlip(g, p.id, choice);
        if (!r.ok) throw new Error('flip fail ' + mode + ': ' + r.reason);
      } else if (g.phase === 'reveal') {
        if (!E.forceAdvanceAfterReveal(g)) throw new Error('advance fail ' + mode);
      } else if (g.phase === 'idle') {
        throw new Error('idle phase ' + mode);
      }
    }
    if (g.phase !== 'over') throw new Error('game did not finish ' + mode + ' after ' + guard);
    games++;
    wins[g.over.winnerTeam || 'none']++;
    if (mode === 'frenzy' && (g.rules.maxCards || 1) !== 3) throw new Error('frenzy maxCards');
    if (mode === 'sudden' && g.players.some(p => p.chars[0].maxHp !== 1)) throw new Error('sudden hp');
  }
}

// Team size matrix, including unequal sides
for (let a = 1; a <= 4; a++) {
  for (let b = 1; b <= 4; b++) {
    const rng = mulberry32(500 + a * 10 + b);
    const g = E.createGame({ modeId: 'team', teamA: a, teamB: b, charId: 'cth-01', allyCharId: 'stm-01', deckMode: 'random', rng });
    if (g.players.length !== a + b) throw new Error('team size mismatch ' + a + b);
    if (new Set(g.players.map(p => p.id)).size !== a + b) throw new Error('duplicate player id');
    if (new Set(g.players.map(p => p.chars[0].charId)).size !== a + b) throw new Error('duplicate char');
    const at = g.players.filter(p => p.team === 'A').map(p => p.teamIndex).join(',');
    const bt = g.players.filter(p => p.team === 'B').map(p => p.teamIndex).join(',');
    if (at !== Array.from({ length: a }, (_, i) => i + 1).join(',')) throw new Error('A index ' + at);
    if (bt !== Array.from({ length: b }, (_, i) => i + 1).join(',')) throw new Error('B index ' + bt);
    games++;
  }
}

// Mirror must be truly identical
for (let i = 0; i < 10; i++) {
  const g = E.createGame({ modeId: 'mirror', charId: 'cth-01', rng: mulberry32(i) });
  if (g.players[0].chars[0].charId !== g.players[1].chars[0].charId) throw new Error('mirror char');
  if (g.players[0].deck.map(c => c.name).join('|') !== g.players[1].deck.map(c => c.name).join('|')) throw new Error('mirror deck');
}

console.log('OK', { games, turns, wins });
console.log('modes', D.MODES.length, 'fun', D.MODES.filter(m => m.fun).map(m => m.id).join(','));