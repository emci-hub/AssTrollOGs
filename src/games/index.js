/**
 * Games registry — central catalog of all games.
 * To add a new game:
 *   1. Create a new file in games/ (e.g. my-new-game.js) implementing the Game interface
 *   2. Import it here and add it to the GAMES array
 * The rest of the app (drawers, window bindings) auto-discovers it.
 *
 * Game interface:
 *   id:        unique string used as the drawer type
 *   title:     display name
 *   renderDrawer(): returns HTML string for the drawer body
 *   init():    optional — called after drawer HTML is inserted (for game setup)
 *   bindWindow():  optional — attaches any window.* handlers needed for inline onclick
 */

import { triviaGame } from './trivia.js';
import { wyrGame } from './wyr.js';
import { sparksGame } from './bingo.js';
import { moodGame } from './mood.js';
import { quickTakesGame } from './quicktakes.js';
import { dailyqGame } from './dailyq.js';
import { checkinGame } from './checkin.js';

const GAMES = [
  triviaGame,
  wyrGame,
  sparksGame,
  moodGame,
  quickTakesGame,
  dailyqGame,
  checkinGame
];

const _byId = {};
GAMES.forEach(g => { _byId[g.id] = g; });

export const gameRegistry = {
  list: () => GAMES.slice(),
  get: (id) => _byId[id] || null,
  bindAll: () => { GAMES.forEach(g => { if (g.bindWindow) g.bindWindow(); }); }
};
