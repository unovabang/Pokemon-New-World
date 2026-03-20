/** URL publique du site (partages Open Graph, canonical). Surcharge : VITE_SITE_URL */
const DEFAULT_SITE_URL = "https://www.pokemonnewworld.fr";

export function getSiteBaseUrl() {
  const env = import.meta.env.VITE_SITE_URL;
  if (typeof env === "string" && /^https?:\/\//i.test(env.trim())) {
    return env.trim().replace(/\/$/, "");
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return DEFAULT_SITE_URL;
}

export function toAbsoluteUrl(pathOrUrl) {
  if (!pathOrUrl) return `${getSiteBaseUrl()}/logo.png`;
  const s = String(pathOrUrl).trim();
  if (/^https?:\/\//i.test(s)) return s;
  const base = getSiteBaseUrl();
  const path = s.startsWith("/") ? s : `/${s}`;
  return `${base}${path}`;
}

/** Extrait un extrait lisible pour meta description depuis du markdown léger. */
export function plainTextFromMarkdown(s, maxLen = 160) {
  if (!s || typeof s !== "string") return "";
  let t = s
    .replace(/\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\*\*|__/g, "")
    .replace(/[\[\]*_`]/g, " ");
  t = t.replace(/\[TITLE\][\s\S]*?\[\/TITLE\]/gi, " ");
  t = t.replace(/#+\s*/g, "").replace(/\s+/g, " ").trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1).trim()}…`;
}

function setMetaByName(name, content) {
  if (content == null || content === "") return;
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", String(content));
}

function setMetaByProperty(property, content) {
  if (content == null || content === "") return;
  let el = document.querySelector(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", String(content));
}

function setLinkCanonical(href) {
  if (!href) return;
  let el = document.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/**
 * Met à jour title, description, Open Graph, Twitter et canonical (SPA).
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} opts.description
 * @param {string} [opts.path] - pathname (ex. /patchnotes)
 * @param {string} [opts.imagePath] - chemin ou URL absolue
 * @param {string[]|string} [opts.keywords] - si omis, la meta keywords n'est pas modifiée
 * @param {string} [opts.lang] - 'fr' | 'en'
 * @param {string} [opts.robots] - ex. noindex,nofollow ; si omis → index,follow
 */
export function applyPageSeo({
  title,
  description,
  path = "/",
  imagePath = "/logo.png",
  keywords,
  lang = "fr",
  robots,
}) {
  const base = getSiteBaseUrl();
  const pathNormalized = path.startsWith("/") ? path : `/${path}`;
  const canonical = `${base}${pathNormalized}`;

  document.title = title;

  const titleEl = document.getElementById("page-title");
  if (titleEl) titleEl.textContent = title;

  setMetaByName("description", description);
  const descEl = document.getElementById("page-description");
  if (descEl) descEl.setAttribute("content", description);

  if (keywords !== undefined) {
    const kw = Array.isArray(keywords) ? keywords.join(",") : keywords;
    setMetaByName("keywords", kw);
    const kwEl = document.getElementById("page-keywords");
    if (kwEl) kwEl.setAttribute("content", kw);
  }

  setMetaByProperty("og:type", "website");
  setMetaByProperty("og:title", title);
  setMetaByProperty("og:description", description);
  setMetaByProperty("og:url", canonical);
  setMetaByProperty("og:image", toAbsoluteUrl(imagePath));
  setMetaByProperty("og:locale", lang === "en" ? "en_US" : "fr_FR");

  setMetaByProperty("twitter:card", "summary_large_image");
  setMetaByProperty("twitter:title", title);
  setMetaByProperty("twitter:description", description);
  setMetaByProperty("twitter:image", toAbsoluteUrl(imagePath));

  setLinkCanonical(canonical);

  document.documentElement.lang = lang === "en" ? "en" : "fr";

  setMetaByName("robots", robots || "index,follow");
}
