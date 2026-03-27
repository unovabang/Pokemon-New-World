import { useState, useEffect, useRef, useMemo } from "react";
import content from "../config/index.js";
import patreonData from "../config/patreon.json";
import HeroVideo from "../components/HeroVideo";
import Carousel from "../components/Carousel";
import Modal from "../components/Modal";
import YouTubeAudio from "../components/YouTubeAudio";
import NewsBanner from "../components/NewsBanner";
import LanguageSelector from "../components/LanguageSelector";
import Sidebar from "../components/Sidebar";
import PatchSectionHeading from "../components/PatchSectionHeading";
import PatchMarkdownText from "../components/PatchMarkdownText";
import PatchNotesNerfsBuffsSection from "../components/PatchNotesNerfsBuffsSection";
import { useLanguage } from "../contexts/LanguageContext";
import { Link, useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:3001/api`
    : `${window.location.origin}/api`;

const HomePage = () => {
  const [siteConfigFromApi, setSiteConfigFromApi] = useState(null);
  const [newsConfigFromApi, setNewsConfigFromApi] = useState(null);
  const [externalConfigFromApi, setExternalConfigFromApi] = useState(null);
  const [downloadsFromApi, setDownloadsFromApi] = useState(null);

  const baseContent = siteConfigFromApi ? { ...content, ...siteConfigFromApi } : content;
  const contentWithExternal = externalConfigFromApi ? { ...baseContent, ...externalConfigFromApi } : baseContent;
  const effectiveContent = newsConfigFromApi
    ? { ...contentWithExternal, news: { ...(contentWithExternal.news || {}), ...newsConfigFromApi } }
    : contentWithExternal;
  const effectiveContentWithDownloads = downloadsFromApi != null
    ? { ...effectiveContent, downloads: { ...(effectiveContent.downloads || {}), ...downloadsFromApi } }
    : effectiveContent;
  const { backgrounds, heroVideo, game, carousel, downloads, tiktok, youtube, twitter, instagram, facebook, github, reddit, footer } = effectiveContentWithDownloads;
  // Lien Discord : peut être une string (config external) ou un objet legacy { invite } (config site)
  const discord = typeof effectiveContent.discord === 'string'
    ? effectiveContent.discord
    : (effectiveContent.discord?.invite ?? effectiveContent.discord ?? '#');

  // Bannières news : config API = liste d’URLs (tri par position) pour le carousel
  const newsBanners = (effectiveContent.news?.banners || [])
    .slice()
    .sort((a, b) => (a.position || 0) - (b.position || 0))
    .map((b) => ({ image: b.url || b.image }));

  // Logo/favicon : "public/logo.png" en admin doit devenir "/logo.png" en prod (fichiers publics à la racine)
  const toPublicUrl = (v) => {
    if (!v || typeof v !== "string") return null;
    const s = v.trim();
    if (s.startsWith("public/")) return "/" + s.slice(7);
    return s;
  };
  const logoUrl = toPublicUrl(effectiveContent.branding?.logo);

  // Image de fond : URL valide (pas de fallback logo)
  const bgHome = backgrounds?.home && String(backgrounds.home).trim();
  const pageBgValue = bgHome ? `url(${bgHome})` : "none";
  const { t, language } = useLanguage();
  const isEn = language === "en";
  
  // Fonction pour obtenir le contenu Patreon traduit
  const getPatreonContent = () => {
    if (language === 'en' && patreonData.translations?.en) {
      return {
        title: patreonData.translations.en.title || patreonData.title,
        content: {
          heading: patreonData.translations.en.content?.heading || patreonData.content?.heading,
          description: patreonData.translations.en.content?.description || patreonData.content?.description,
          buttonText: patreonData.translations.en.content?.buttonText || patreonData.content?.buttonText,
          url: patreonData.content?.url
        },
        icon: patreonData.icon,
        image: patreonData.image,
        goal: {
          ...patreonData.goal,
          description: patreonData.translations.en.goal?.description || patreonData.goal?.description
        }
      };
    }
    return patreonData;
  };
  
  const patreonContent = getPatreonContent();
  const [patreonOverlayOpen, setPatreonOverlayOpen] = useState(false);
  const [openDownload, setOpenDownload] = useState(false);
  const [openPatchNotes, setOpenPatchNotes] = useState(false);
  const [patchNotesFromApi, setPatchNotesFromApi] = useState(null);
  const [secretTransitioning, setSecretTransitioning] = useState(false);
  const [openEnigmaModal, setOpenEnigmaModal] = useState(false);
  const [enigmaAnswer, setEnigmaAnswer] = useState("");
  const [showSecretButton, setShowSecretButton] = useState(false);
  const [runicButtonReady, setRunicButtonReady] = useState(false);
  const [secretZoneClicks, setSecretZoneClicks] = useState(0);
  const enigmaAudioRef = useRef(null);

  const RUNIC_REVEAL_DURATION_MS = 700;
  const navigate = useNavigate();

  const ENIGMA_AUDIO_SRC = "https://audio.jukehost.co.uk/DGAfKjoSST6lFylKTtpRd0ybZeBlpmRG.mp3";
  const ENIGMA_HASH = "f8adeef9021e0cbdd3871d6c50af2ff5920ffeb07db4020caf4488c5863b59fd";
  const checkEnigmaAndGo = async () => {
    const input = enigmaAnswer.trim().toLowerCase();
    if (!input) return;
    const buf = new TextEncoder().encode(input);
    const hashBuffer = await crypto.subtle.digest("SHA-256", buf);
    const hashHex = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    if (hashHex !== ENIGMA_HASH) return;
    setOpenEnigmaModal(false);
    setEnigmaAnswer("");
    setSecretTransitioning(true);
    setTimeout(() => navigate("/la-lune-brillera-ce-soir", { replace: true }), 1200);
  };

  const playEnigmaAudio = () => {
    const el = enigmaAudioRef.current;
    if (!el) return;
    el.volume = 0.2;
    el.currentTime = 0;
    el.play().catch(() => {});
  };

  // Charger les configs site, external, news, downloads et patchnotes depuis l'API
  // Chaque fetch est indépendant : un échec n'empêche pas les autres de charger
  useEffect(() => {
    let cancelled = false;
    const safeFetch = (url) => fetch(url).then((r) => r.json()).catch(() => null);

    Promise.all([
      safeFetch(`${API_BASE}/config/site?t=${Date.now()}`),
      safeFetch(`${API_BASE}/config/external?t=${Date.now()}`),
      safeFetch(`${API_BASE}/config/news?t=${Date.now()}`),
      safeFetch(`${API_BASE}/downloads?t=${Date.now()}`),
      safeFetch(`${API_BASE}/patchnotes/${language}?t=${Date.now()}`)
    ]).then(([siteData, externalData, newsData, downloadsData, patchData]) => {
      if (cancelled) return;
      if (siteData?.success && siteData?.config) setSiteConfigFromApi(siteData.config);
      if (externalData?.success && externalData?.config) setExternalConfigFromApi(externalData.config);
      if (newsData?.success && newsData?.config) setNewsConfigFromApi(newsData.config);
      if (downloadsData?.success && downloadsData?.downloads) setDownloadsFromApi(downloadsData.downloads);
      if (patchData?.success && patchData?.patchnotes) setPatchNotesFromApi(patchData.patchnotes);
    });
    return () => { cancelled = true; };
  }, [language]);

  // Recharger les patchnotes à l'ouverture du modal (au cas où modif en admin)
  useEffect(() => {
    if (!openPatchNotes) return;
    fetch(`${API_BASE}/patchnotes/${language}?t=${Date.now()}`)
      .then((r) => r.json())
      .then((data) => { if (data?.success && data?.patchnotes) setPatchNotesFromApi(data.patchnotes); })
      .catch(() => {});
  }, [openPatchNotes, language]);

  /** Image patch accueil : uniquement si une URL est renseignée côté API (pas de PNG local implicite). */
  const patchNotesSectionImageSrc = useMemo(() => {
    if (patchNotesFromApi == null) return null;
    const latest = patchNotesFromApi?.versions?.[0];
    if (!latest) return null;
    if (typeof latest.image === "string" && latest.image.trim()) return latest.image.trim();
    return null;
  }, [patchNotesFromApi]);

  const latestPatchVersion = useMemo(() => {
    const v = patchNotesFromApi?.versions?.[0]?.version;
    return v != null && String(v).trim() ? String(v).trim() : null;
  }, [patchNotesFromApi]);

  const patreonIconUrl = typeof patreonContent?.icon === "string" && patreonContent.icon.trim() ? patreonContent.icon.trim() : null;
  const patreonHeroImageUrl = typeof patreonContent?.image === "string" && patreonContent.image.trim() ? patreonContent.image.trim() : null;

  const handleSecretClick = () => {
    setOpenEnigmaModal(true);
    setEnigmaAnswer("");
  };

  const handleSecretZoneClick = () => {
    if (showSecretButton) return;
    const next = secretZoneClicks + 1;
    setSecretZoneClicks(next);
    if (next >= 3) setShowSecretButton(true);
  };

  useEffect(() => {
    if (!showSecretButton) {
      setRunicButtonReady(false);
      return;
    }
    const t = setTimeout(() => setRunicButtonReady(true), RUNIC_REVEAL_DURATION_MS);
    return () => clearTimeout(t);
  }, [showSecretButton]);

  useEffect(() => {
    if (openEnigmaModal) {
      const t = setTimeout(playEnigmaAudio, 300);
      return () => clearTimeout(t);
    }
  }, [openEnigmaModal]);

  useEffect(() => {
    const shouldRedirectToAdmin = localStorage.getItem('redirectToAdminLogin');
    if (shouldRedirectToAdmin === 'true') {
      localStorage.removeItem('redirectToAdminLogin');
      setTimeout(() => {
        window.location.href = '/admin-login';
      }, 1000);
    }
  }, []);

  return (
    <>
      {secretTransitioning && (
        <div className="secret-transition-overlay" aria-hidden="true">
          <div className="secret-transition-flicker" />
          <div className="secret-transition-vignette" />
        </div>
      )}
      <main
        id="top"
        className="page page-with-nav"
        style={{
          "--page-bg": pageBgValue,
          "--bg-blur": `${backgrounds.blur ?? 12}px`,
          "--bg-dim": backgrounds.dim ?? 0.4,
        }}
      >
        <Sidebar />

        {/* Lecteur audio discret */}
        {effectiveContent.audio?.enabled && (
          <YouTubeAudio
            videoId={effectiveContent.audio.youtubeId}
            autoplay={effectiveContent.audio.autoplay}
            startVolume={effectiveContent.audio.startVolume}
            show
          />
        )}

        <div className="container">
          {/* Sélecteur de langue */}
          <LanguageSelector className="language-selector-above-video" />
          
          {/* HERO vidéo : on retire le H1 et on agrandit le logo */}
          <section className="section" style={{ padding: 0 }}>
            <HeroVideo videoId={heroVideo.youtubeId}>
              <div>
                {logoUrl ? (
                  <img className="hero-logo" src={logoUrl} alt="" />
                ) : (
                  <p className="hero-logo hero-logo--text">{game?.title || "Pokémon New World"}</p>
                )}
                {/* Titre texte retiré */}
                <div className="cta">
                  <div className="cta-row">
                    <button 
                      className="btn btn-primary" 
                      onClick={() => setOpenDownload(true)}
                    >
                      <i className="fa-solid fa-cloud-arrow-down"></i> {t('buttons.download')}
                    </button>
                    <a
                      className="btn btn-ghost"
                      href={discord || "#"}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <i className="fa-brands fa-discord"></i> {t('buttons.discord')}
                    </a>
                  </div>
                  <div className="cta-row cta-row--runic">
                    {showSecretButton ? (
                      <button
                        type="button"
                        className="btn btn-secret btn-runic btn-runic--reveal"
                        onClick={handleSecretClick}
                        disabled={!runicButtonReady}
                        aria-label="Entrée secrète"
                      >
                        <span className="btn-runic-shards" aria-hidden />
                        <span className="btn-runic-text">ᚦᚨᚱᚲᚱᚨᛁ</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-secret-zone"
                        onClick={handleSecretZoneClick}
                        aria-label=""
                      />
                    )}
                  </div>
                </div>

                {/* Modal énigme Darkrai : riddle + champ réponse, redirection si "Darkrai" */}
                {openEnigmaModal && (
                  <div
                    className="enigma-modal-overlay"
                    onClick={() => setOpenEnigmaModal(false)}
                    onKeyDown={(e) => e.key === "Escape" && setOpenEnigmaModal(false)}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="enigma-modal-title"
                  >
                    <div
                      className="enigma-modal"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <audio
                        ref={enigmaAudioRef}
                        src={ENIGMA_AUDIO_SRC}
                        preload="auto"
                        className="enigma-audio-hidden"
                        aria-hidden
                      />
                      <button
                        type="button"
                        className="enigma-modal-close"
                        onClick={() => setOpenEnigmaModal(false)}
                        aria-label="Fermer"
                      >
                        <i className="fa-solid fa-xmark" />
                      </button>
                      <h2 id="enigma-modal-title" className="enigma-modal-title">Qui suis-je ?</h2>
                      <div className="enigma-modal-riddle enigma-glitch">
                        <p>Je ne suis pas l'ombre,</p>
                        <p>mais ce qui la fait dérailler.</p>
                        <p className="enigma-riddle-spacer" />
                        <p>On ne me rejoint pas,</p>
                        <p>on glisse jusqu'à moi.</p>
                        <p className="enigma-riddle-spacer" />
                        <p>Je n'existe que là</p>
                        <p>où l'esprit perd son bord.</p>
                        <p className="enigma-riddle-spacer" />
                        <p><em>Qui suis-je ?</em></p>
                      </div>
                      <div className="enigma-modal-actions">
                        <input
                          type="text"
                          className="enigma-modal-input"
                          value={enigmaAnswer}
                          onChange={(e) => setEnigmaAnswer(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") checkEnigmaAndGo();
                          }}
                          placeholder="Ta réponse..."
                          autoFocus
                          autoComplete="off"
                          aria-label="Réponse à l'énigme"
                        />
                        <div className="enigma-modal-footer">
                          <button
                            type="button"
                            className="enigma-modal-replay"
                            onClick={(e) => { e.stopPropagation(); playEnigmaAudio(); }}
                            aria-label="Réécouter"
                          >
                            <i className="fa-solid fa-rotate-right" aria-hidden /> Réécouter
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </HeroVideo>
          </section>

          {/* DERNIÈRES NOUVEAUTÉS */}
          <section id="news" className="section card">
            <h2>
              <img src="/newsCLEAN3.png" alt="" className="section-icon" />
              {" "}
              {t('sections.news.title')}
            </h2>
            <NewsBanner 
              banners={newsBanners}
              interval={effectiveContent.news?.interval || 5000}
              autoLoad={newsBanners.length === 0}
              maxHeight={effectiveContent.news?.bannerMaxHeight ?? 400}
            />
          </section>

          {/* SECTIONS TIKTOK & PATCH */}
          <div className="dual-sections">
            <section className="section card dual-section dual-section--tiktok">
              <h2 className="dual-section-heading">
                <span className="dual-section-heading-start">
                  <span className="dual-section-heading-icon dual-section-heading-icon--tiktok" aria-hidden>
                    <i className="fa-brands fa-tiktok" />
                  </span>
                  {t("sections.tiktok.title")}
                </span>
              </h2>
              <div className="dual-body">
                <div className="dual-media">
                  <img
                    src="/TIKTOK.png"
                    alt=""
                    className="dual-image"
                    decoding="async"
                  />
                </div>
                <div className="dual-panel">
                  <div className="dual-panel-inner">
                    <h3>{t("sections.tiktok.heading")}</h3>
                    <p>{t("sections.tiktok.description")}</p>
                    <a
                      href={tiktok || "https://www.tiktok.com"}
                      target="_blank"
                      rel="noreferrer"
                      className="btn dual-btn dual-btn--tiktok"
                    >
                      <i className="fa-brands fa-tiktok" aria-hidden /> {t("buttons.viewOnTikTok")}
                    </a>
                  </div>
                </div>
              </div>
            </section>

            <section className="section card dual-section dual-section--patch">
              <h2 className="dual-section-heading">
                <span className="dual-section-heading-start">
                  <span className="dual-section-heading-icon dual-section-heading-icon--patch" aria-hidden>
                    <i className="fa-solid fa-scroll" />
                  </span>
                  {t("sections.patchNotes.title")}
                </span>
                {latestPatchVersion ? (
                  <span className="dual-section-version-pill">v{latestPatchVersion}</span>
                ) : null}
              </h2>
              <div className="dual-body">
                <div className="dual-media">
                  {patchNotesSectionImageSrc ? (
                    <img
                      key={patchNotesSectionImageSrc}
                      src={patchNotesSectionImageSrc}
                      alt=""
                      className="dual-image"
                      decoding="async"
                    />
                  ) : (
                    <div className="dual-image dual-image--pending" aria-hidden />
                  )}
                </div>
                <div className="dual-panel">
                  <div className="dual-panel-inner">
                    <h3>{t("sections.patchNotes.heading")}</h3>
                    <p>{t("sections.patchNotes.description")}</p>
                    <button
                      type="button"
                      className="btn dual-btn dual-btn--patch"
                      onClick={() => setOpenPatchNotes(true)}
                    >
                      <i className="fa-solid fa-eye" aria-hidden /> {t("buttons.viewNotes")}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* SECTION PATREON */}
          <section id="patreon" className="section card">
            <h2>
              {patreonIconUrl ? (
                <img src={patreonIconUrl} alt="" className="section-icon" />
              ) : (
                <i className="fa-brands fa-patreon section-icon" aria-hidden />
              )}{" "}
              {patreonContent?.title || t('sections.patreon.title')}
            </h2>
            <div className="patreon-content">
              <div
                className={`patreon-image-container${patreonOverlayOpen ? " patreon-overlay-visible" : ""}`}
                onClick={() => setPatreonOverlayOpen((v) => !v)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPatreonOverlayOpen((v) => !v); } }}
                aria-expanded={patreonOverlayOpen}
                aria-label={patreonOverlayOpen ? (t("sections.patreon.close") || "Fermer") : (t("sections.patreon.open") || "Voir le contenu Patreon")}
              >
                {patreonHeroImageUrl ? (
                  <img src={patreonHeroImageUrl} alt="" className="patreon-image" />
                ) : (
                  <div className="patreon-image patreon-image--placeholder" aria-hidden>
                    <i className="fa-brands fa-patreon" />
                  </div>
                )}
                <div className="patreon-overlay">
                  <div className="patreon-cta" onClick={(e) => e.stopPropagation()}>
                    <h3>{patreonContent?.content?.heading || t('sections.patreon.heading')}</h3>
                    <p>{patreonContent?.content?.description || t('sections.patreon.description')}</p>
                    <a 
                      href={patreonContent?.content?.url || "https://www.patreon.com/c/unovabang"} 
                      target="_blank" 
                      rel="noreferrer"
                      className="btn btn-primary patreon-btn"
                    >
                      <i className={patreonContent?.content?.buttonIcon || "fa-brands fa-patreon"}></i> {patreonContent?.content?.buttonText || patreonContent?.content?.button || t('buttons.supportOnPatreon')}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>

        </div>

        {/* Footer */}
        <footer className="site-footer">
          <div className="container footer-top">
            <div className="footer-grid">
              <div className="footer-col footer-col--brand">
                <div className="footer-brand">
                  {logoUrl ? <img src={logoUrl} alt="" /> : null}
                  <strong>{game?.title || "Pokémon New World"}</strong>
                </div>
                <p className="footer-desc">{t('footer.description')}</p>
                <div className="social">
                  <a href={discord || "#"} target="_blank" rel="noreferrer" title="Discord">
                    <i className="fa-brands fa-discord" />
                  </a>
                  <button
                    type="button"
                    onClick={() => setOpenDownload(true)}
                    className="social-btn"
                    title={t('buttons.download')}
                  >
                    <i className="fa-solid fa-download" />
                  </button>
                </div>
              </div>
              <div className="footer-col">
                <h4>{t('navigation.navigation')}</h4>
                <ul>
                  <li><a href="#news"><i className="fa-solid fa-newspaper" /> {t('navigation.news')}</a></li>
                  <li>
                    <button type="button" onClick={() => setOpenDownload(true)} className="footer-link-btn">
                      <i className="fa-solid fa-cloud-arrow-down" /> {t('navigation.download')}
                    </button>
                  </li>
                  <li><a href="/lore"><i className="fa-solid fa-scroll" /> Lore</a></li>
                  <li><a href="/pokedex"><i className="fa-solid fa-book" /> Pokédex</a></li>
                </ul>
              </div>
              <div className="footer-col">
                <h4>{t('navigation.legal')}</h4>
                <ul>
                  <li>{t('footer.legal.disclaimer1')}</li>
                  <li>{t('footer.legal.disclaimer2')}</li>
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
              <a href="/contact" className="footer-contact-btn">
                <i className="fa-solid fa-envelope" />
                <span>{isEn ? "Contact the team" : "Contacter l'équipe"}</span>
              </a>
            </div>
          </div>
          <div className="container footnote">
            <span>{footer?.copyright ? footer.copyright.replace('{year}', new Date().getFullYear()) : `© ${new Date().getFullYear()} Pokémon New World — ${t('footer.copyright')}`}</span>
            {footer?.developedBy && <span className="footnote-sep">·</span>}
            {footer?.developedBy && <span>Développé par : {footer.developedBy}</span>}
            {footer?.version && <span className="footnote-sep">·</span>}
            {footer?.version && <span>{footer.version}</span>}
          </div>
        </footer>

        {/* Modal de téléchargement — données depuis l'API (launcher) */}
        <Modal
          open={openDownload}
          onClose={() => setOpenDownload(false)}
          title={t('modals.download.title')}
        >
          <div className="dl-modal">
            <div className="dl-modal-cards">
              {(downloads?.launcherDownloadEnabled !== false && downloads?.launcher?.trim() && downloads.launcher !== '#') ? (
                <a
                  className="dl-modal-card dl-modal-card--launcher"
                  href={downloads.launcher.trim()}
                  onClick={() => setOpenDownload(false)}
                >
                  <span className="dl-modal-card-icon"><i className="fa-solid fa-rocket" /></span>
                  <span className="dl-modal-card-body">
                    <span className="dl-modal-card-title">{isEn ? "Download the Game" : "Télécharger le Jeu"}</span>
                    <span className="dl-modal-card-sub">{isEn ? "Launcher with auto-updates" : "Launcher avec mises à jour auto"}</span>
                  </span>
                  <span className="dl-modal-card-arrow"><i className="fa-solid fa-arrow-down" /></span>
                </a>
              ) : (
                <div className="dl-modal-card dl-modal-card--launcher dl-modal-card--disabled">
                  <span className="dl-modal-card-icon"><i className="fa-solid fa-pause-circle" /></span>
                  <span className="dl-modal-card-body">
                    <span className="dl-modal-card-title">{isEn ? "Download disabled for now!" : "Téléchargement désactivé pour l'instant !"}</span>
                    <span className="dl-modal-card-sub">{isEn ? "The Launcher will be available again soon." : "Le Launcher sera à nouveau disponible bientôt."}</span>
                  </span>
                </div>
              )}
            </div>

            <Link
              to="/telechargement"
              className="dl-modal-cta"
              onClick={() => setOpenDownload(false)}
            >
              <span className="dl-modal-cta-icon"><i className="fa-solid fa-arrow-right-to-bracket" aria-hidden /></span>
              <div className="dl-modal-cta-body">
                <span className="dl-modal-cta-heading">{t('modals.download.pageCta.heading')}</span>
                <span className="dl-modal-cta-desc">{t('modals.download.pageCta.description')}</span>
              </div>
              <span className="dl-modal-cta-label">{t('modals.download.pageCta.link')} <i className="fa-solid fa-arrow-right" /></span>
            </Link>
          </div>
        </Modal>

        {/* Modal notes de patch (données depuis l'API pour refléter les modifs admin) */}
        <Modal
          open={openPatchNotes}
          onClose={() => setOpenPatchNotes(false)}
          dialogClassName="modal-dialog--patchnotes"
          title={patchNotesFromApi?.versions?.[0] ? `${t('modals.patchNotes.version')} ${patchNotesFromApi.versions[0].version}` : t('modals.patchNotes.version')}
        >
          <div className="patch-notes-content">
            {patchNotesFromApi?.versions?.[0] ? (
              <>
                {patchNotesFromApi.versions[0].date ? (
                  <div className="patch-header">
                    <span className="patch-date-badge">
                      <i className="fa-regular fa-calendar" aria-hidden />
                      {patchNotesFromApi.versions[0].date}
                    </span>
                  </div>
                ) : null}
                {patchNotesFromApi.versions[0].image && (
                  <div className="patch-image-wrap">
                    <img
                      key={patchNotesFromApi.versions[0].image}
                      src={patchNotesFromApi.versions[0].image}
                      alt=""
                      className="patch-image"
                      decoding="async"
                    />
                  </div>
                )}
                {(patchNotesFromApi.versions[0].sections || []).map((section, index) => (
                  <div key={index} className="patch-section">
                    <PatchSectionHeading
                      section={section}
                      as="h4"
                      className="patch-section-title"
                    />
                    {section.image && (
                      <div className="patch-section-image-wrap">
                        <img
                          key={section.image}
                          src={section.image}
                          alt=""
                          className="patch-section-image"
                          decoding="async"
                        />
                      </div>
                    )}
                    {section.sectionKind === "nerfs-buffs" ? (
                      <>
                        {(section.items || []).filter(Boolean).length > 0 && (
                          <ul className="patchnotes-section-intro-list">
                            {(section.items || []).map((item, itemIndex) =>
                              item ? (
                                <li key={itemIndex}><PatchMarkdownText text={item} /></li>
                              ) : null
                            )}
                          </ul>
                        )}
                        <PatchNotesNerfsBuffsSection
                          nerfsBuffs={section.nerfsBuffs}
                          idPrefix={`home-modal-v${String(patchNotesFromApi.versions[0].version || index)}-nb`}
                        />
                      </>
                    ) : (
                      <ul>
                        {(section.items || []).map((item, itemIndex) => (
                          <li key={itemIndex}><PatchMarkdownText text={item} /></li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
                <div className="patch-modal-footer">
                  <a
                    href="/patchnotes"
                    className="btn btn-primary patch-modal-footer-btn"
                    onClick={() => setOpenPatchNotes(false)}
                  >
                    <i className="fa-solid fa-clock-rotate-left" aria-hidden /> {t('buttons.olderPatches')}
                  </a>
                </div>
              </>
            ) : (
              <p className="patch-loading">{patchNotesFromApi === null ? t('loading') || 'Chargement…' : t('patchNotes.empty') || 'Aucune note de patch.'}</p>
            )}
          </div>
        </Modal>

      </main>
    </>
  );
};

export default HomePage;