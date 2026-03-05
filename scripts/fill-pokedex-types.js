/**
 * Complète les types manquants (formes Méga / rowspan) : hérite du précédent même num.
 * Usage: node scripts/fill-pokedex-types.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pokedexPath = path.join(__dirname, '..', 'src', 'config', 'pokedex.json');

const data = JSON.parse(fs.readFileSync(pokedexPath, 'utf8'));
const entries = data.entries;
let lastByNum = {};
let filled = 0;

for (let i = 0; i < entries.length; i++) {
  const e = entries[i];
  const num = e.num;
  if (e.types && e.types.length > 0) {
    lastByNum[num] = e.types;
  } else if (lastByNum[num]) {
    e.types = [...lastByNum[num]];
    filled++;
  }
}

fs.writeFileSync(pokedexPath, JSON.stringify(data, null, 2), 'utf8');
console.log(`✅ ${filled} entrées sans types complétées (héritage même nº)`);
