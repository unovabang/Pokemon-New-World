/** Ligne de liste : espaces optionnels, - ou *, puis texte. */
export const PATCH_LIST_LINE_PATTERN = /^(\s*)([-*])\s+(.*)$/;

export function splitPatchMarkdownSegments(text) {
  const lines = String(text ?? "").split("\n");
  const segments = [];
  let i = 0;
  while (i < lines.length) {
    if (PATCH_LIST_LINE_PATTERN.test(lines[i])) {
      const listLines = [];
      while (i < lines.length && PATCH_LIST_LINE_PATTERN.test(lines[i])) {
        listLines.push(lines[i]);
        i++;
      }
      segments.push({ type: "list", lines: listLines });
    } else {
      const plainLines = [];
      while (i < lines.length && !PATCH_LIST_LINE_PATTERN.test(lines[i])) {
        plainLines.push(lines[i]);
        i++;
      }
      segments.push({ type: "plain", lines: plainLines });
    }
  }
  return segments;
}

export function parseListLinesToLevels(lines) {
  const parsed = [];
  for (const line of lines) {
    const m = line.match(PATCH_LIST_LINE_PATTERN);
    if (!m) continue;
    const indent = m[1].length;
    const level = Math.floor(indent / 2);
    parsed.push({ level, text: m[3] });
  }
  return parsed;
}

/** Arbre { text, children }[] pour <ul>/<li> imbriqués. */
export function nestListItems(parsed) {
  const root = [];
  const stack = [{ level: -1, arr: root }];
  for (const { level, text } of parsed) {
    const node = { text, children: [] };
    while (stack.length > 1 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }
    const parent = stack[stack.length - 1];
    parent.arr.push(node);
    stack.push({ level, arr: node.children });
  }
  return root;
}
