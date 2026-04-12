import PatchMarkdownText from "./PatchMarkdownText";
import { renderInlineMarkdown } from "../utils/inlineMarkdown";
import {
  getPatchItemText,
  getPatchItemKind,
  getBalanceKindPresentation,
  normalizePatchItem,
  splitPatchBalanceLeadingTitle,
  resolvePatchItemSpriteUrl,
} from "../utils/patchNoteItem";

const PLACEHOLDER_SPRITE =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect fill="#222" width="96" height="96" rx="12"/><text x="48" y="56" fill="#555" font-size="24" text-anchor="middle" font-family="sans-serif">?</text></svg>'
  );

const emptyMap = new Map();

/** Une ligne de liste patch : markdown, badge Nerf/Buff/Ajustement, sprite Pokémon si résolvable. */
export default function PatchNoteListItem({ item, lang = "fr", pokedexLookup }) {
  const kind = getPatchItemKind(item);
  const pres = kind ? getBalanceKindPresentation(kind, lang) : null;

  if (!pres) {
    return (
      <li>
        <PatchMarkdownText text={getPatchItemText(item)} />
      </li>
    );
  }

  const norm = normalizePatchItem(item);
  const lookup = pokedexLookup instanceof Map && pokedexLookup.size > 0 ? pokedexLookup : emptyMap;
  const spriteUrl = resolvePatchItemSpriteUrl(norm, lookup);
  const { titleInner, rest } = splitPatchBalanceLeadingTitle(norm.text);
  const useSplitHead = Boolean(titleInner);
  const showSpriteColumn = Boolean(spriteUrl);

  if (!showSpriteColumn && !useSplitHead) {
    return (
      <li className={pres.rowClass}>
        <span className="patchnotes-balance-tag">
          <i className={pres.icon} aria-hidden />
          <span>{pres.label}</span>
        </span>
        <PatchMarkdownText text={norm.text} />
      </li>
    );
  }

  const bodyMd = useSplitHead ? rest.trim() : norm.text;

  const rowClass = [
    pres.rowClass,
    "patchnotes-balance-li--stacked",
    showSpriteColumn ? "patchnotes-balance-li--sprite-row" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <li className={rowClass}>
      {showSpriteColumn ? (
        <div className="patchnotes-balance-sprite-col">
          <img
            src={spriteUrl}
            alt=""
            className="patchnotes-balance-sprite"
            loading="lazy"
            decoding="async"
            onError={(e) => {
              e.currentTarget.src = PLACEHOLDER_SPRITE;
            }}
          />
        </div>
      ) : null}
      <div className="patchnotes-balance-text-stack">
        <div className="patchnotes-balance-head">
          <span className="patchnotes-balance-tag">
            <i className={pres.icon} aria-hidden />
            <span>{pres.label}</span>
          </span>
          {useSplitHead ? (
            <div className="patchnotes-balance-head-title">
              {renderInlineMarkdown(titleInner, { titleClassName: "patchnotes-inline-title" })}
            </div>
          ) : null}
        </div>
        <div className="patchnotes-balance-copy">
          <PatchMarkdownText text={bodyMd} />
        </div>
      </div>
    </li>
  );
}
