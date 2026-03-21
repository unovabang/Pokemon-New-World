/** Texte lisible pour Discord / logs (sans syntaxe markdown patch / lore). */
export function stripPatchMarkdownForPlain(s) {
  if (typeof s !== 'string' || !s) return '';
  let t = s;
  t = t.replace(/\[TITLE\]([\s\S]*?)\[\/TITLE\]/gi, '$1');
  t = t.replace(/\*\*([^*]+?)\*\*/g, '$1');
  t = t.replace(/\*([^*]+?)\*/g, '$1');
  return t.replace(/\r\n/g, '\n').trim();
}
