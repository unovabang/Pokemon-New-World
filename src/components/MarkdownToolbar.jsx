import { useCallback } from "react";

const toolbarStyle = { display: "flex", gap: "0.3rem", marginBottom: "0.3rem" };
const tbBtnStyle = {
  padding: "0.3rem 0.5rem",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 6,
  background: "rgba(255,255,255,0.06)",
  color: "rgba(255,255,255,0.7)",
  cursor: "pointer",
  fontSize: "0.8rem",
};

/**
 * Barre Gras / Italique / Titre (même logique que l’éditeur Lore).
 */
export default function MarkdownToolbar({ textareaRef, onUpdate }) {
  const wrap = useCallback(
    (before, after) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const val = ta.value;
      const selected = val.slice(start, end);
      const replacement = `${before}${selected}${after}`;
      const newVal = val.slice(0, start) + replacement + val.slice(end);
      onUpdate(newVal);
      requestAnimationFrame(() => {
        ta.focus();
        ta.selectionStart = start + before.length;
        ta.selectionEnd = start + before.length + selected.length;
      });
    },
    [textareaRef, onUpdate]
  );

  return (
    <div style={toolbarStyle}>
      <button type="button" onClick={() => wrap("**", "**")} style={tbBtnStyle} title="Gras">
        <i className="fa-solid fa-bold" />
      </button>
      <button type="button" onClick={() => wrap("*", "*")} style={tbBtnStyle} title="Italique">
        <i className="fa-solid fa-italic" />
      </button>
      <button type="button" onClick={() => wrap("[TITLE]", "[/TITLE]")} style={tbBtnStyle} title="Titre (style Lore)">
        <i className="fa-solid fa-heading" />
      </button>
    </div>
  );
}
