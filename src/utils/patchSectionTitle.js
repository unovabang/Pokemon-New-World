/**
 * Titres de sections des notes de patch : icônes Font Awesome + texte sans emoji en tête.
 */

const EMOJI_LEAD = /^(\p{Extended_Pictographic}|\uFE0F|\u200D)+(\s+)*/u;

/** Premiers caractères emoji connus (titres legacy) → classes Font Awesome */
const EMOJI_TO_FA = new Map([
  ['🆕', 'fa-solid fa-wand-magic-sparkles'],
  ['🔧', 'fa-solid fa-wrench'],
  ['⚖️', 'fa-solid fa-scale-balanced'],
  ['🎨', 'fa-solid fa-palette'],
  ['🎵', 'fa-solid fa-music'],
  ['🌟', 'fa-solid fa-star'],
]);

function isSafeFaClassString(s) {
  if (typeof s !== 'string' || !s.trim()) return false;
  if (!/^[\w\s-]+$/.test(s)) return false;
  return s.includes('fa-');
}

export function stripLeadingEmojiFromTitle(title) {
  if (typeof title !== 'string') return '';
  let t = title.trimStart();
  for (let i = 0; i < 12; i++) {
    const next = t.replace(EMOJI_LEAD, '').trimStart();
    if (next === t) break;
    t = next;
  }
  return t.trim();
}

export function inferFaIconFromLegacyTitle(title) {
  if (typeof title !== 'string') return '';
  const first = [...title.trimStart()][0];
  return EMOJI_TO_FA.get(first) || '';
}

export function getPatchSectionIconClass(section) {
  if (!section || typeof section !== 'object') return 'fa-solid fa-list';
  const raw = typeof section.icon === 'string' ? section.icon.trim() : '';
  if (raw && isSafeFaClassString(raw)) return raw;
  const inferred = inferFaIconFromLegacyTitle(section.title || '');
  return inferred || 'fa-solid fa-list';
}

export function getPatchSectionTitleText(section) {
  const raw = typeof section?.title === 'string' ? section.title : '';
  const cleaned = stripLeadingEmojiFromTitle(raw);
  return cleaned || raw.trim() || '';
}
