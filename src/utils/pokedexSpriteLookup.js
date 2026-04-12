/** Normalise un nom pour la recherche (minuscules, sans accents) */
export function normalizeName(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Variantes de noms (EVs vs Pokédex : "Staross Bélamie" vs "Staross de Bélamie") */
function nameVariants(normalized) {
  const out = [normalized];
  const add = (s) => {
    if (s && !out.includes(s)) out.push(s);
  };
  add(normalized.replace(/\s+belamie\s*$/, " de belamie"));
  add(normalized.replace(/\s+de belamie\s*$/, " belamie"));
  add(normalized.replace(/\s+galar\s*$/, " de galar"));
  add(normalized.replace(/\s+de galar\s*$/, " galar"));
  add(normalized.replace(/\s+hisui\s*$/, " de hisui"));
  add(normalized.replace(/\s+de hisui\s*$/, " hisui"));
  add(normalized.replace(/\s+male\s*$/, " male"));
  add(normalized.replace(/\s+femelle\s*$/, " female"));
  return out;
}

/** @param {Array<{ name?: string, imageUrl?: string }>} entries */
export function buildPokedexLookup(entries) {
  const map = new Map();
  if (!Array.isArray(entries)) return map;
  for (const e of entries) {
    const name = (e.name || "").trim();
    if (!name) continue;
    const key = normalizeName(name);
    if (!map.has(key)) {
      map.set(key, { name, imageUrl: (e.imageUrl || "").trim() || null });
    }
  }
  return map;
}

/** Fusionne une seconde liste (ex. Extradex) : n’écrase pas une entrée déjà indexée. */
export function mergeLookupPreferFirst(base, extraEntries) {
  const m = new Map(base);
  if (!Array.isArray(extraEntries)) return m;
  for (const e of extraEntries) {
    const name = (e.name || "").trim();
    if (!name) continue;
    const key = normalizeName(name);
    if (!m.has(key)) {
      m.set(key, { name, imageUrl: (e.imageUrl || "").trim() || null });
    }
  }
  return m;
}

/**
 * Trouve l’URL du sprite pour un nom affiché (même logique que la page EVs).
 * @param {Map<string, { name: string, imageUrl: string | null }>} lookup
 */
export function findSprite(lookup, displayName) {
  if (!displayName || !(lookup instanceof Map) || lookup.size === 0) return null;
  const normalized = normalizeName(displayName);
  const withoutSuffix = normalized.replace(/\s*\(\d+pts?\)\s*$/, "").trim();
  const toTry = nameVariants(withoutSuffix);
  for (const key of toTry) {
    const entry = lookup.get(key);
    if (entry?.imageUrl) return entry.imageUrl;
  }
  const firstWord = withoutSuffix.split(/\s+/)[0] || "";
  if (firstWord) {
    const entry = lookup.get(firstWord);
    if (entry?.imageUrl) return entry.imageUrl;
  }
  for (const [key, value] of lookup) {
    if (!value?.imageUrl) continue;
    if (withoutSuffix.startsWith(key) || key.startsWith(withoutSuffix)) return value.imageUrl;
  }
  return null;
}
