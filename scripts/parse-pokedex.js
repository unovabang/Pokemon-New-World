/**
 * Parse fandom pokedex.xml (export table body du wiki) → src/config/pokedex.json
 * Source: https://pokemon-new-world-fr.fandom.com/fr/wiki/Pok%C3%A9dex
 * Usage: node scripts/parse-pokedex.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inputPath = path.join(__dirname, '..', 'fandom pokedex.xml');
const outputPath = path.join(__dirname, '..', 'src', 'config', 'pokedex.json');

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractImgUrl(td) {
  const match = td.match(/data-src="(https:[^"]+)"/) || td.match(/src="(https:[^"]+)"/);
  return match ? match[1].replace(/&amp;/g, '&') : '';
}

function extractTypes(td) {
  const alts = [];
  const re = /alt="Vignette\s+([^"]+)"/gi;
  let m;
  while ((m = re.exec(td)) !== null) {
    const name = m[1].trim();
    if (name && !/^\d+$/.test(name) && name.length < 20) alts.push(name);
  }
  return [...new Set(alts)];
}

function extractName(td) {
  const a = td.match(/<a[^>]*>([^<]+)</);
  return a ? stripHtml(a[1]) : stripHtml(td);
}

const raw = fs.readFileSync(inputPath, 'utf8');
const rows = [];
let lastNum = '';

const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
let trMatch;
while ((trMatch = trRegex.exec(raw)) !== null) {
  const trContent = trMatch[1];
  const tds = [];
  const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  let tdMatch;
  while ((tdMatch = tdRegex.exec(trContent)) !== null) {
    tds.push(tdMatch[1].trim());
  }

  if (tds.length < 4) continue;

  let num = '';
  let name = '';
  let imageUrl = '';
  let types = [];
  let rarity = '';
  let obtention = '';

  let idx = 0;
  const firstCell = stripHtml(tds[0]);
  if (/^\d{1,3}$/.test(firstCell)) {
    num = firstCell;
    lastNum = num;
    idx = 1;
  } else {
    num = lastNum;
  }

  if (tds.length >= 5 && idx === 1) {
    name = extractName(tds[1]);
    imageUrl = extractImgUrl(tds[2]);
    types = extractTypes(tds[3]);
    rarity = stripHtml(tds[4]);
    obtention = tds[5] ? stripHtml(tds[5]) : '';
  } else if (tds.length >= 4 && idx === 0) {
    name = extractName(tds[0]);
    imageUrl = extractImgUrl(tds[1]);
    types = extractTypes(tds[2]);
    rarity = stripHtml(tds[3]);
    obtention = tds[4] ? stripHtml(tds[4]) : '';
  }

  if (!name && !num) continue;

  rows.push({
    num: num || lastNum,
    name: name || '???',
    imageUrl: imageUrl || null,
    types,
    rarity: rarity || '',
    obtention: obtention || ''
  });
}

const out = {
  source: 'https://pokemon-new-world-fr.fandom.com/fr/wiki/Pok%C3%A9dex',
  updated: new Date().toISOString().slice(0, 10),
  entries: rows
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(out, null, 2), 'utf8');
console.log(`✅ ${rows.length} entrées écrites dans ${outputPath}`);
