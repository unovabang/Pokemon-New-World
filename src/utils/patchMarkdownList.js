/** Ligne de liste : espaces optionnels, - ou *, puis texte. */
export const PATCH_LIST_LINE_PATTERN = /^(\s*)([-*])\s+(.*)$/;

/** Ligne qui continue la puce précédente (indentée, sans nouveau tiret). */
export function isContinuationLine(line) {
  if (!line || PATCH_LIST_LINE_PATTERN.test(line)) return false;
  return /^\s{2,}\S/.test(line);
}

function mergeListContinuation(lastLine, contLine) {
  const m = lastLine.match(PATCH_LIST_LINE_PATTERN);
  if (!m) return `${lastLine}\n${contLine}`;
  const tail = contLine.replace(/^\s+/, "").trimEnd();
  return `${m[1]}${m[2]} ${m[3]}\n${tail}`;
}

export function splitPatchMarkdownSegments(text) {
  const lines = String(text ?? "").split("\n");
  const segments = [];
  let i = 0;
  while (i < lines.length) {
    if (PATCH_LIST_LINE_PATTERN.test(lines[i])) {
      const listLines = [];
      while (i < lines.length && PATCH_LIST_LINE_PATTERN.test(lines[i])) {
        let row = lines[i];
        i++;
        while (i < lines.length && isContinuationLine(lines[i])) {
          row = mergeListContinuation(row, lines[i]);
          i++;
        }
        listLines.push(row);
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
  for (const row of lines) {
    const parts = row.split("\n");
    const m = parts[0].match(PATCH_LIST_LINE_PATTERN);
    if (!m) continue;
    const textBody =
      parts.length > 1 ? [m[3], ...parts.slice(1)].join("\n").trimEnd() : m[3];
    const indent = m[1].length;
    const level = Math.floor(indent / 2);
    parsed.push({ level, text: textBody });
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
