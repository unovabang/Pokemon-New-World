import { Fragment } from "react";
import { renderInlineMarkdown } from "../utils/inlineMarkdown";

/**
 * Affichage d’un élément de liste patch (retours ligne + markdown inline).
 */
export default function PatchMarkdownText({ text }) {
  const lines = String(text ?? "").split("\n");
  return (
    <span className="patch-md-inline">
      {lines.map((line, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {renderInlineMarkdown(line, { titleClassName: "patchnotes-inline-title" })}
        </Fragment>
      ))}
    </span>
  );
}
