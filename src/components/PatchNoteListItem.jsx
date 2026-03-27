import PatchMarkdownText from "./PatchMarkdownText";
import { getPatchItemText, getPatchItemKind, getBalanceKindPresentation } from "../utils/patchNoteItem";

/**
 * Une ligne de liste dans une section de patch (texte markdown + badge équilibrage optionnel).
 */
export default function PatchNoteListItem({ item, lang = "fr" }) {
  const kind = getPatchItemKind(item);
  const pres = kind ? getBalanceKindPresentation(kind, lang) : null;
  return (
    <li className={pres ? pres.rowClass : undefined}>
      {pres ? (
        <span className="patchnotes-balance-tag">
          <i className={pres.icon} aria-hidden />
          <span>{pres.label}</span>
        </span>
      ) : null}
      <PatchMarkdownText text={getPatchItemText(item)} />
    </li>
  );
}
