import { Fragment } from "react";
import { renderInlineMarkdown } from "../utils/inlineMarkdown";
import { splitPatchMarkdownSegments, parseListLinesToLevels, nestListItems } from "../utils/patchMarkdownList";

/** Sauts de ligne à l’intérieur d’un même bloc (ligne physique ou texte de puce). */
function renderInlineWithLineBreaks(text) {
  const parts = String(text ?? "").split("\n");
  return parts.map((part, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {renderInlineMarkdown(part, { titleClassName: "patchnotes-inline-title" })}
    </Fragment>
  ));
}

function renderPlainLines(lines) {
  return lines.map((line, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {renderInlineWithLineBreaks(line)}
    </Fragment>
  ));
}

function renderListTree(nodes) {
  if (!nodes.length) return null;
  return (
    <ul className="patch-md-ul">
      {nodes.map((node, i) => (
        <li key={i} className="patch-md-li">
          <span className="patch-md-li-content">{renderInlineWithLineBreaks(node.text)}</span>
          {node.children.length > 0 ? renderListTree(node.children) : null}
        </li>
      ))}
    </ul>
  );
}

/**
 * Affichage d’un élément de liste patch : retours ligne, markdown inline, listes à puces imbriquées (- / *).
 */
export default function PatchMarkdownText({ text }) {
  const segments = splitPatchMarkdownSegments(text);
  return (
    <div className="patch-md-root">
      {segments.map((seg, i) => {
        if (seg.type === "list") {
          const parsed = parseListLinesToLevels(seg.lines);
          const tree = nestListItems(parsed);
          return <Fragment key={i}>{renderListTree(tree)}</Fragment>;
        }
        return <Fragment key={i}>{renderPlainLines(seg.lines)}</Fragment>;
      })}
    </div>
  );
}
