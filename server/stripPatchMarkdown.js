/** Résumé texte d’un bloc nerfs/buffs (embed Discord). */
export function formatNerfsBuffsPlainSummary(nb) {
  if (!nb || typeof nb !== "object") return "";
  const labels = { nerfs: "Nerf", buffs: "Buff", ajustements: "Ajustement" };
  const parts = [];
  for (const id of ["nerfs", "buffs", "ajustements"]) {
    const arr = nb[id];
    if (!Array.isArray(arr) || arr.length === 0) continue;
    const names = arr
      .map((e) => (e && e.name ? String(e.name).trim() : ""))
      .filter(Boolean);
    if (names.length === 0) continue;
    parts.push(`${labels[id]}: ${names.join(", ")}`);
  }
  return parts.join("\n");
}

/** Texte lisible pour Discord / logs (sans syntaxe markdown patch / lore). */
export function stripPatchMarkdownForPlain(s) {
  if (typeof s !== 'string' || !s) return '';
  let t = s;
  t = t.replace(/\[TITLE\]([\s\S]*?)\[\/TITLE\]/gi, '$1');
  t = t.replace(/\*\*([^*]+?)\*\*/g, '$1');
  t = t.replace(/\*([^*]+?)\*/g, '$1');
  t = t
    .split('\n')
    .map((line) => line.replace(/^\s*[-*]\s+/, ''))
    .join('\n');
  return t.replace(/\r\n/g, '\n').trim();
}
