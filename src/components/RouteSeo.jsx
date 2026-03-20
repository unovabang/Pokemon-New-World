import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import { usePageSeo } from "../hooks/usePageSeo";

const LORE_STORY = /^\/lore\/.+/;

function buildConfig(pathname, language, t) {
  const lang = language;

  if (pathname.startsWith("/admin")) {
    return {
      title: lang === "en" ? "Admin • Pokémon New World" : "Administration • Pokémon New World",
      description:
        lang === "en"
          ? "Restricted area for site administrators."
          : "Espace réservé aux administrateurs du site.",
      path: pathname,
      lang,
      robots: "noindex,nofollow",
    };
  }

  if (pathname === "/admin-login") {
    return {
      title: lang === "en" ? "Admin login • Pokémon New World" : "Connexion admin • Pokémon New World",
      description:
        lang === "en"
          ? "Administrator login for Pokémon New World."
          : "Connexion au panneau d’administration Pokémon New World.",
      path: "/admin-login",
      lang,
      robots: "noindex,nofollow",
    };
  }

  if (pathname === "/la-lune-brillera-ce-soir") {
    return {
      title: "Pokémon New World",
      description:
        lang === "en"
          ? "Hidden discovery in the Pokémon New World adventure."
          : "Découverte secrète de l’aventure Pokémon New World.",
      path: pathname,
      lang,
      robots: "noindex,nofollow",
    };
  }

  if (LORE_STORY.test(pathname) && pathname !== "/lore") {
    return null;
  }

  const pages = {
    "/": () => ({
      title: t("seo.title"),
      description: t("seo.description"),
      path: "/",
      keywords: t("seo.keywords"),
      lang,
    }),
    "/patchnotes": () => ({
      title: t("seo.pages.patchnotes.title"),
      description: t("seo.pages.patchnotes.description"),
      path: "/patchnotes",
      lang,
    }),
    "/pokedex": () => ({
      title: t("seo.pages.pokedex.title"),
      description: t("seo.pages.pokedex.description"),
      path: "/pokedex",
      lang,
    }),
    "/extradex": () => ({
      title: t("seo.pages.extradex.title"),
      description: t("seo.pages.extradex.description"),
      path: "/extradex",
      lang,
    }),
    "/guide": () => ({
      title: t("seo.pages.guide.title"),
      description: t("seo.pages.guide.description"),
      path: "/guide",
      lang,
    }),
    "/lore": () => ({
      title: t("seo.pages.lore.title"),
      description: t("seo.pages.lore.description"),
      path: "/lore",
      lang,
    }),
    "/bst": () => ({
      title: t("seo.pages.bst.title"),
      description: t("seo.pages.bst.description"),
      path: "/bst",
      lang,
    }),
    "/item-location": () => ({
      title: t("seo.pages.itemLocation.title"),
      description: t("seo.pages.itemLocation.description"),
      path: "/item-location",
      lang,
    }),
    "/equipe": () => ({
      title: t("seo.pages.team.title"),
      description: t("seo.pages.team.description"),
      path: "/equipe",
      lang,
    }),
    "/evs-location": () => ({
      title: t("seo.pages.evsLocation.title"),
      description: t("seo.pages.evsLocation.description"),
      path: "/evs-location",
      lang,
    }),
    "/nerfs-and-buffs": () => ({
      title: t("seo.pages.nerfsAndBuffs.title"),
      description: t("seo.pages.nerfsAndBuffs.description"),
      path: "/nerfs-and-buffs",
      lang,
    }),
    "/contact": () => ({
      title: t("seo.pages.contact.title"),
      description: t("seo.pages.contact.description"),
      path: "/contact",
      lang,
    }),
    "/telechargement": () => ({
      title: t("seo.pages.download.title"),
      description: t("seo.pages.download.description"),
      path: "/telechargement",
      lang,
    }),
  };

  const builder = pages[pathname];
  if (!builder) return null;

  return builder();
}

export default function RouteSeo() {
  const { pathname } = useLocation();
  const { language, t } = useLanguage();

  const config = useMemo(() => buildConfig(pathname, language, t), [pathname, language, t]);

  usePageSeo(config);

  return null;
}
