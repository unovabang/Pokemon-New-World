import { findSprite } from "./pokedexSpriteLookup";

/** Types d’équilibrage pour une ligne de patch note (JSON + admin). */
export const PATCH_BALANCE_KINDS = ["nerf", "buff", "ajustement"];

/**
 * Titre de section « équilibrage » (FR/EN) : active l’UI types si `balanceKinds` absent.
 */
export function isLikelyBalanceTitle(title) {
  const t = (title || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return t.includes("equilibrage") || /balance\s*changes?/.test(t);
}

/**
 * @param {object} section
 * @returns {boolean} Afficher Nerf/Buff/Ajustement pour les lignes.
 */
export function resolveSectionBalanceKinds(section) {
  if (section?.balanceKinds === false) return false;
  if (section?.balanceKinds === true) return true;
  return isLikelyBalanceTitle(section?.title);
}

export function normalizePatchItem(raw) {
  if (raw == null) return { text: "", kind: "", sprite: "" };
  if (typeof raw === "string") return { text: raw, kind: "", sprite: "" };
  if (typeof raw === "object") {
    const text = typeof raw.text === "string" ? raw.text : raw.text != null ? String(raw.text) : "";
    const k = raw.kind;
    const kind = PATCH_BALANCE_KINDS.includes(k) ? k : "";
    const sp = raw.sprite ?? raw.pokemonSprite ?? raw.imageUrl;
    const sprite = typeof sp === "string" ? sp.trim() : "";
    return { text, kind, sprite };
  }
  return { text: String(raw), kind: "", sprite: "" };
}

export function normalizePatchSectionItems(items) {
  const arr = Array.isArray(items) ? items : [""];
  if (arr.length === 0) return [{ text: "", kind: "", sprite: "" }];
  return arr.map(normalizePatchItem);
}

/** Sérialise une ligne pour l’API / JSON. */
export function patchItemToStored(norm, balanceKinds) {
  const t = (norm.text ?? "").trim();
  const sprite = (norm.sprite ?? "").trim();
  if (!balanceKinds || !norm.kind) {
    if (sprite) return { text: t, sprite };
    return t;
  }
  const out = { text: t, kind: norm.kind };
  if (sprite) out.sprite = sprite;
  return out;
}

export function getPatchItemText(item) {
  return normalizePatchItem(item).text;
}

export function getPatchItemKind(item) {
  return normalizePatchItem(item).kind;
}

const LEADING_TITLE_RE = /^\s*\[TITLE\]([\s\S]*?)\[\/TITLE\]\s*/;

/** Découpe un texte patch si le bloc [TITLE]…[/TITLE] est en tête (lignes équilibrage + sprite). */
export function splitPatchBalanceLeadingTitle(text) {
  const s = String(text ?? "");
  const m = s.match(LEADING_TITLE_RE);
  if (!m) return { titleInner: "", rest: s };
  return { titleInner: m[1] ?? "", rest: s.slice(m[0].length) };
}

/** Texte du titre pour correspondance Pokédex (retire *italique* et marqueurs **). */
export function patchTitlePlainForLookup(titleInner) {
  return String(titleInner ?? "")
    .replace(/\*\*/g, "")
    .replace(/\*([^*]+)\*/g, "$1")
    .trim();
}

/** URL du sprite : champ `sprite` dans le JSON, sinon recherche Pokédex via [TITLE] en tête du texte. */
export function resolvePatchItemSpriteUrl(norm, pokedexLookup) {
  const explicit = (norm.sprite ?? "").trim();
  if (explicit) return explicit;
  const { titleInner } = splitPatchBalanceLeadingTitle(norm.text);
  if (!titleInner) return null;
  const plain = patchTitlePlainForLookup(titleInner);
  if (!plain) return null;
  return findSprite(pokedexLookup, plain);
}

export function getBalanceKindPresentation(kind, lang = "fr") {
  const en = lang === "en";
  switch (kind) {
    case "nerf":
      return {
        label: "Nerf",
        icon: "fa-solid fa-arrow-down",
        rowClass: "patchnotes-balance-li patchnotes-balance-li--nerf",
      };
    case "buff":
      return {
        label: "Buff",
        icon: "fa-solid fa-arrow-up",
        rowClass: "patchnotes-balance-li patchnotes-balance-li--buff",
      };
    case "ajustement":
      return {
        label: en ? "Adjust" : "Ajustement",
        icon: "fa-solid fa-arrows-left-right",
        rowClass: "patchnotes-balance-li patchnotes-balance-li--ajustement",
      };
    default:
      return null;
  }
}
