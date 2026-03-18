import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import LanguageSelector from "../components/LanguageSelector";
import { useLanguage } from "../contexts/LanguageContext";
import content from "../config/index.js";
import downloadPageSeed from "../config/downloadPage.json";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:3001/api`
    : `${window.location.origin}/api`;

const toPublicUrl = (v) => {
  if (!v || typeof v !== "string") return null;
  const s = v.trim();
  if (s.startsWith("public/")) return "/" + s.slice(7);
  return s;
};

export default function DownloadPage() {
  const { language, t } = useLanguage();
  const isEn = language === "en";
  const [pageContent, setPageContent] = useState(null);
  const [downloads, setDownloads] = useState(null);
  const [galleryIndex, setGalleryIndex] = useState(-1);
  const [siteConfig, setSiteConfig] = useState(null);
  const [externalConfig, setExternalConfig] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setLoadError(false);
    Promise.all([
      fetch(`${API_BASE}/download-page?t=${Date.now()}`).then((r) => r.json()).catch(() => ({})),
      fetch(`${API_BASE}/downloads?t=${Date.now()}`).then((r) => r.json()).catch(() => ({}))
    ]).then(([pageRes, dlRes]) => {
      if (pageRes && pageRes.success) {
        setPageContent(pageRes);
        setLoadError(false);
      } else {
        setPageContent({ success: true, ...downloadPageSeed });
        setLoadError(false);
      }
      if (dlRes.success && dlRes.downloads) setDownloads(dlRes.downloads);
      setIsReady(true);
    }).catch(() => {
      setPageContent({ success: true, ...downloadPageSeed });
      setLoadError(false);
      setIsReady(true);
    });
  }, []);

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/config/site?t=${Date.now()}`).then((r) => r.json()).catch(() => null),
      fetch(`${API_BASE}/config/external?t=${Date.now()}`).then((r) => r.json()).catch(() => null)
    ]).then(([siteData, externalData]) => {
      if (siteData?.success && siteData?.config) setSiteConfig(siteData.config);
      if (externalData?.success && externalData?.config) setExternalConfig(externalData.config);
    });
  }, []);

  const baseContent = siteConfig ? { ...content, ...siteConfig } : content;
  const effectiveContent = externalConfig ? { ...baseContent, ...externalConfig } : baseContent;
  const footer = effectiveContent.footer;
  const discord = typeof effectiveContent.discord === "string"
    ? effectiveContent.discord
    : (effectiveContent.discord?.invite ?? effectiveContent.discord ?? "#");
  const logoUrl = toPublicUrl(effectiveContent.branding?.logo) || "/logo.png";

  const title = isEn && pageContent?.titleEn ? pageContent.titleEn : (pageContent?.title || "Télécharger");
  const subtitle = isEn && pageContent?.subtitleEn ? pageContent.subtitleEn : (pageContent?.subtitle || "");
  const description = isEn && pageContent?.descriptionEn ? pageContent.descriptionEn : (pageContent?.description || "");
  const videoTitle = isEn && pageContent?.videoTitleEn ? pageContent.videoTitleEn : (pageContent?.videoTitle || "");
  const gallery = pageContent?.gallery || [];
  const heroImage = pageContent?.heroImage?.trim() || "";
  const videoUrl = pageContent?.videoUrl?.trim() || "";
  const pageBackground = (pageContent?.pageBackground?.trim() || downloadPageSeed?.pageBackground?.trim() || "").trim();
  const soundcloudPlaylistUrl = pageContent?.soundcloudPlaylistUrl?.trim() || "";

  if (!isReady) {
    return (
      <main className="page page-with-sidebar download-page">
        <Sidebar />
        <div className="download-page-inner">
          <div className="download-page-main">
            <div className="lore-page-loading-spinner" style={{ padding: "4rem" }}>
              <i className="fa-solid fa-spinner fa-spin" aria-hidden />
              <span>{isEn ? "Loading..." : "Chargement..."}</span>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="page page-with-sidebar download-page">
        <Sidebar />
        <div className="download-page-inner">
          <div className="download-page-main">
            <div className="lore-page-unavailable">
              <p className="lore-page-unavailable-text">
                {isEn ? "The download page is temporarily unavailable. Please try again later." : "La page de téléchargement est temporairement indisponible. Réessayez plus tard."}
              </p>
              <button type="button" className="lore-page-unavailable-retry" onClick={() => window.location.reload()}>
                <i className="fa-solid fa-rotate-right" aria-hidden />
                {isEn ? "Retry" : "Réessayer"}
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page page-with-sidebar download-page">
      <div
        className={`download-page-bg${pageBackground ? " download-page-bg--image" : ""}`}
        aria-hidden
        style={pageBackground ? { backgroundImage: `url(${pageBackground})` } : undefined}
      />
      <Sidebar />
      <div className={`download-page-inner${soundcloudPlaylistUrl ? " download-page-inner--with-aside" : ""}`}>
        <div className="download-page-col-main">
          <header className="download-hero">
            <LanguageSelector className="download-lang-selector" />
            {heroImage ? (
              <div className="download-hero-bg" style={{ backgroundImage: `url(${heroImage})` }} aria-hidden />
            ) : (
              <div className="download-hero-gradient" aria-hidden />
            )}
            <div className="download-hero-content">
              <h1 className="download-title">
                <i className="fa-solid fa-cloud-arrow-down" aria-hidden />
                <span>{title}</span>
              </h1>
              {subtitle && <p className="download-subtitle">{subtitle}</p>}
              {description && <p className="download-hero-desc">{description}</p>}
            </div>
          </header>

          <div className="download-page-main">
        {/* 1. Téléchargements tout en haut */}
        <section id="download-section" className="download-section download-actions">
          <h2 className="download-section-title">
            <i className="fa-solid fa-download" aria-hidden />
            {isEn ? "Downloads" : "Téléchargements"}
          </h2>
          <div className="download-cards">
            {(downloads?.launcherDownloadEnabled !== false && downloads?.launcher?.trim() && downloads.launcher !== "#") ? (
              <a className="download-card-btn download-card-btn--launcher" href={downloads.launcher.trim()}>
                <span className="download-card-btn-icon"><i className="fa-solid fa-rocket" /></span>
                <span className="download-card-btn-body">
                  <span className="download-card-btn-title">{isEn ? "Download the Game" : "Télécharger le Jeu"}</span>
                  <span className="download-card-btn-sub">{isEn ? "Launcher with auto-updates" : "Launcher avec mises à jour auto"}</span>
                </span>
                <span className="download-card-btn-arrow"><i className="fa-solid fa-arrow-down" /></span>
              </a>
            ) : (
              <div className="download-card-btn download-card-btn--launcher download-card-btn--disabled">
                <span className="download-card-btn-icon"><i className="fa-solid fa-pause-circle" /></span>
                <span className="download-card-btn-body">
                  <span className="download-card-btn-title">{isEn ? "Download disabled for now!" : "Téléchargement désactivé pour l'instant !"}</span>
                  <span className="download-card-btn-sub">{isEn ? "The Launcher will be available again soon." : "Le Launcher sera à nouveau disponible bientôt."}</span>
                </span>
              </div>
            )}
            {(downloads?.patch?.trim() && downloads.patch !== "#") && (
              <a className="download-card-btn download-card-btn--patch" href={downloads.patch.trim()}>
                <span className="download-card-btn-icon"><i className="fa-solid fa-file-zipper" /></span>
                <span className="download-card-btn-body">
                  <span className="download-card-btn-title">{isEn ? "Download the patch" : "Télécharger le patch"}</span>
                  <span className="download-card-btn-sub">{isEn ? "Latest update" : "Dernière mise à jour"}</span>
                </span>
                <span className="download-card-btn-arrow"><i className="fa-solid fa-arrow-down" /></span>
              </a>
            )}
          </div>
          {(downloads?.patch?.trim() && downloads.patch !== "#") && (
            <p className="download-actions-note">
              <i className="fa-solid fa-circle-info" aria-hidden />
              {isEn ? "Extract the patch to your game root folder. See the video below for details." : "Extrayez le patch à la racine du jeu. Voir la vidéo ci-dessous pour plus de détails."}
            </p>
          )}
        </section>

        {videoUrl && (
          <section className="download-section download-video-section">
            <h2 className="download-section-title">
              <i className="fa-solid fa-play-circle" aria-hidden />
              {videoTitle || (isEn ? "Installation video" : "Vidéo d'installation")}
            </h2>
            <div className="download-video-wrap download-video-wrap--glass">
              {/\.(mp4|webm|ogg)(\?|$)/i.test(videoUrl) ? (
                <video src={videoUrl} controls playsInline className="download-video-native">
                  <track kind="captions" />
                </video>
              ) : (
                <iframe
                  src={videoUrl}
                  title={videoTitle || "Tutoriel"}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              )}
            </div>
          </section>
        )}

        {gallery.length > 0 && (
          <section className="download-section download-gallery-section">
            <h2 className="download-section-title">
              <i className="fa-solid fa-images" aria-hidden />
              {isEn ? "Gallery" : "Galerie"}
            </h2>
            <div className="download-gallery">
              {gallery.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  className="download-gallery-item"
                  onClick={() => setGalleryIndex(i)}
                  style={{ backgroundImage: `url(${url})` }}
                >
                  <span className="sr-only">{isEn ? "View image" : "Voir l'image"}</span>
                </button>
              ))}
            </div>
            {gallery.length > 0 && galleryIndex >= 0 && (
              <div className="download-gallery-lightbox" onClick={() => setGalleryIndex(-1)} role="dialog" aria-modal="true" aria-label={isEn ? "Gallery" : "Galerie"}>
                <button type="button" className="download-gallery-lightbox-close" aria-label="Fermer">
                  <i className="fa-solid fa-xmark" />
                </button>
                {gallery[galleryIndex] && (
                  <img src={gallery[galleryIndex]} alt="" onClick={(e) => e.stopPropagation()} />
                )}
              </div>
            )}
          </section>
        )}

          </div>
        </div>

        {soundcloudPlaylistUrl && (
          <aside className="download-page-aside" aria-label="OST Pokemon New World">
            <div className="download-soundcloud-sticky">
              <h2 className="download-section-title download-soundcloud-title">
                <i className="fa-solid fa-music" aria-hidden />
                OST Pokemon New World
              </h2>
              <div className="download-soundcloud-wrap">
                <iframe
                  title="OST Pokemon New World"
                  width="100%"
                  height="450"
                  scrolling="no"
                  frameBorder="no"
                  allow="autoplay"
                  src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(soundcloudPlaylistUrl)}&color=%239ca8bc&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true`}
                />
              </div>
            </div>
          </aside>
        )}
      </div>

      <footer className="site-footer download-page-footer">
        <div className="container footer-top">
          <div className="footer-grid">
            <div className="footer-col footer-col--brand">
              <div className="footer-brand">
                <img src={logoUrl} alt="Logo Pokémon New World" />
                <strong>Pokémon New World</strong>
              </div>
              <p className="footer-desc">{t("footer.description")}</p>
              <div className="social">
                <a href={discord || "#"} target="_blank" rel="noreferrer" title="Discord">
                  <i className="fa-brands fa-discord" />
                </a>
                <a href="#download-section" className="social-btn" title={t("buttons.download")}>
                  <i className="fa-solid fa-download" />
                </a>
              </div>
            </div>
            <div className="footer-col">
              <h4>{t("navigation.navigation")}</h4>
              <ul>
                <li><a href="/#news"><i className="fa-solid fa-newspaper" /> {t("navigation.news")}</a></li>
                <li>
                  <a href="#download-section" className="footer-link-btn">
                    <i className="fa-solid fa-cloud-arrow-down" /> {t("navigation.download")}
                  </a>
                </li>
                <li><Link to="/lore"><i className="fa-solid fa-scroll" /> Lore</Link></li>
                <li><Link to="/pokedex"><i className="fa-solid fa-book" /> Pokédex</Link></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>{t("navigation.legal")}</h4>
              <ul>
                <li>{t("footer.legal.disclaimer1")}</li>
                <li>{t("footer.legal.disclaimer2")}</li>
              </ul>
            </div>
            {footer?.links && footer.links.length > 0 && (
              <div className="footer-col">
                <h4>Liens</h4>
                <ul>
                  {footer.links.map((link, index) => (
                    <li key={link.id || index}>
                      <a href={link.url} target="_blank" rel="noreferrer">
                        {link.icon && <i className={link.icon} />} {link.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="footer-contact-wrap">
            <Link to="/contact" className="footer-contact-btn">
              <i className="fa-solid fa-envelope" />
              <span>{isEn ? "Contact the team" : "Contacter l'équipe"}</span>
            </Link>
          </div>
        </div>
        <div className="container footnote">
          <span>{footer?.copyright ? footer.copyright.replace("{year}", new Date().getFullYear()) : `© ${new Date().getFullYear()} Pokémon New World — ${t("footer.copyright")}`}</span>
          {footer?.developedBy && <span className="footnote-sep">·</span>}
          {footer?.developedBy && <span>Développé par : {footer.developedBy}</span>}
          {footer?.version && <span className="footnote-sep">·</span>}
          {footer?.version && <span>{footer.version}</span>}
        </div>
      </footer>
    </main>
  );
}
