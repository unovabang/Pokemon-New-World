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
  if (raw == null) return { text: "", kind: "" };
  if (typeof raw === "string") return { text: raw, kind: "" };
  if (typeof raw === "object") {
    const text = typeof raw.text === "string" ? raw.text : raw.text != null ? String(raw.text) : "";
    const k = raw.kind;
    const kind = PATCH_BALANCE_KINDS.includes(k) ? k : "";
    return { text, kind };
  }
  return { text: String(raw), kind: "" };
}

export function normalizePatchSectionItems(items) {
  const arr = Array.isArray(items) ? items : [""];
  if (arr.length === 0) return [{ text: "", kind: "" }];
  return arr.map(normalizePatchItem);
}

/** Sérialise une ligne pour l’API / JSON. */
export function patchItemToStored(norm, balanceKinds) {
  const t = (norm.text ?? "").trim();
  if (!balanceKinds || !norm.kind) return t;
  return { text: t, kind: norm.kind };
}

export function getPatchItemText(item) {
  return normalizePatchItem(item).text;
}

export function getPatchItemKind(item) {
  return normalizePatchItem(item).kind;
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
