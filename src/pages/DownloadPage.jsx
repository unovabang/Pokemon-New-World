import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import LanguageSelector from "../components/LanguageSelector";
import { useLanguage } from "../contexts/LanguageContext";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:3001/api`
    : `${window.location.origin}/api`;

export default function DownloadPage() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const [pageContent, setPageContent] = useState(null);
  const [downloads, setDownloads] = useState(null);
  const [galleryIndex, setGalleryIndex] = useState(0);

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/download-page?t=${Date.now()}`).then((r) => r.json()).catch(() => ({})),
      fetch(`${API_BASE}/downloads?t=${Date.now()}`).then((r) => r.json()).catch(() => ({}))
    ]).then(([pageRes, dlRes]) => {
      if (pageRes.success) setPageContent(pageRes);
      if (dlRes.success && dlRes.downloads) setDownloads(dlRes.downloads);
    });
  }, []);

  const title = isEn && pageContent?.titleEn ? pageContent.titleEn : (pageContent?.title || "Télécharger");
  const subtitle = isEn && pageContent?.subtitleEn ? pageContent.subtitleEn : (pageContent?.subtitle || "");
  const description = isEn && pageContent?.descriptionEn ? pageContent.descriptionEn : (pageContent?.description || "");
  const videoTitle = isEn && pageContent?.videoTitleEn ? pageContent.videoTitleEn : (pageContent?.videoTitle || "");
  const gallery = pageContent?.gallery || [];
  const heroImage = pageContent?.heroImage?.trim() || "";
  const videoUrl = pageContent?.videoUrl?.trim() || "";
  const pageBackground = pageContent?.pageBackground?.trim() || "";

  return (
    <main className="page page-with-sidebar download-page">
      <div
        className={`download-page-bg${pageBackground ? " download-page-bg--image" : ""}`}
        aria-hidden
        style={pageBackground ? { backgroundImage: `url(${pageBackground})` } : undefined}
      />
      <Sidebar />
      <div className="download-page-inner">
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
          </div>
        </header>

        {/* 1. Téléchargements tout en haut */}
        <section className="download-section download-actions">
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

        {description && (
          <section className="download-section download-description">
            <div className="download-card download-card--glass">
              <p className="download-description-text">{description}</p>
            </div>
          </section>
        )}

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
            {gallery.length > 0 && (
              <div className="download-gallery-lightbox" onClick={() => setGalleryIndex(-1)} role="dialog" aria-modal="true" aria-label={isEn ? "Gallery" : "Galerie"} style={{ display: galleryIndex >= 0 ? "flex" : "none" }}>
                <button type="button" className="download-gallery-lightbox-close" aria-label="Fermer">
                  <i className="fa-solid fa-xmark" />
                </button>
                <img src={gallery[galleryIndex]} alt="" onClick={(e) => e.stopPropagation()} />
              </div>
            )}
          </section>
        )}

        <footer className="download-footer">
          <Link to="/" className="download-footer-link">
            <i className="fa-solid fa-arrow-left" aria-hidden />
            {isEn ? "Back to home" : "Retour à l'accueil"}
          </Link>
        </footer>
      </div>
    </main>
  );
}
