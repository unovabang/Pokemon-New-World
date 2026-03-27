/** Texte d’une ligne de patch (string legacy ou `{ text, kind }`). */
export function patchItemPlainText(item) {
  if (item == null || item === "") return "";
  if (typeof item === "string") return item;
  if (typeof item === "object" && typeof item.text === "string") return item.text;
  return "";
}

/** Préfixe visuel Discord pour nerf / buff / ajustement. */
export function patchItemDiscordPrefix(item) {
  const k = item && typeof item === "object" ? item.kind : null;
  if (k === "nerf") return "🔻 ";
  if (k === "buff") return "🔺 ";
  if (k === "ajustement") return "↔️ ";
  return "";
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
