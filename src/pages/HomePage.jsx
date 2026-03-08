import { useState, useEffect } from "react";
import content from "../config/index.js";
import patreonData from "../config/patreon.json";
import HeroVideo from "../components/HeroVideo";
import Carousel from "../components/Carousel";
import Modal from "../components/Modal";
import YouTubeAudio from "../components/YouTubeAudio";
import NewsBanner from "../components/NewsBanner";
import LanguageSelector from "../components/LanguageSelector";
import Sidebar from "../components/Sidebar";
import { useLanguage } from "../contexts/LanguageContext";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:3001/api`
    : `${window.location.origin}/api`;

const HomePage = () => {
  const [siteConfigFromApi, setSiteConfigFromApi] = useState(null);
  const [newsConfigFromApi, setNewsConfigFromApi] = useState(null);
  const [externalConfigFromApi, setExternalConfigFromApi] = useState(null);

  const baseContent = siteConfigFromApi ? { ...content, ...siteConfigFromApi } : content;
  const contentWithExternal = externalConfigFromApi ? { ...baseContent, ...externalConfigFromApi } : baseContent;
  const effectiveContent = newsConfigFromApi
    ? { ...contentWithExternal, news: { ...(contentWithExternal.news || {}), ...newsConfigFromApi } }
    : contentWithExternal;
  const { backgrounds, heroVideo, game, carousel, downloads, tiktok, youtube, twitter, instagram, facebook, github, reddit, footer } = effectiveContent;
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
  const logoUrl = toPublicUrl(effectiveContent.branding?.logo) || "/logo.png";

  // Image de fond : URL valide + fallback si l'image externe ne charge pas (CORS, 404, etc.)
  const bgHome = backgrounds?.home && String(backgrounds.home).trim();
  const defaultBg = content.backgrounds?.home || "/logo.png";
  const pageBgValue = bgHome
    ? `url(${bgHome}), url(${defaultBg})`
    : `url(${defaultBg})`;
  const { t, language } = useLanguage();
  
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
  const [openVideo, setOpenVideo] = useState(false);
  const [openExplanations, setOpenExplanations] = useState(false);
  const [openDownload, setOpenDownload] = useState(false);
  const [openPatchNotes, setOpenPatchNotes] = useState(false);
  const [patchNotesFromApi, setPatchNotesFromApi] = useState(null);

  // Charger les configs site, external (liens Discord, etc.), news et patchnotes depuis l'API
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`${API_BASE}/config/site?t=${Date.now()}`).then((r) => r.json()),
      fetch(`${API_BASE}/config/external?t=${Date.now()}`).then((r) => r.json()),
      fetch(`${API_BASE}/config/news?t=${Date.now()}`).then((r) => r.json()),
      fetch(`${API_BASE}/patchnotes/${language}?t=${Date.now()}`).then((r) => r.json())
    ]).then(([siteData, externalData, newsData, patchData]) => {
      if (!cancelled && siteData?.success && siteData?.config) setSiteConfigFromApi(siteData.config);
      if (!cancelled && externalData?.success && externalData?.config) setExternalConfigFromApi(externalData.config);
      if (!cancelled && newsData?.success && newsData?.config) setNewsConfigFromApi(newsData.config);
      if (!cancelled && patchData?.success && patchData?.patchnotes) setPatchNotesFromApi(patchData.patchnotes);
    }).catch(() => {});
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

  // Mise à jour des métadonnées SEO
  useEffect(() => {
    document.title = t('seo.title');
    
    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = t('seo.title');

    const descEl = document.getElementById('page-description');
    if (descEl) descEl.setAttribute('content', t('seo.description'));

    const keywordsEl = document.getElementById('page-keywords');
    if (keywordsEl) keywordsEl.setAttribute('content', t('seo.keywords').join(','));

    // Vérifier s'il faut rediriger vers admin-login après logout
    const shouldRedirectToAdmin = localStorage.getItem('redirectToAdminLogin');
    if (shouldRedirectToAdmin === 'true') {
      localStorage.removeItem('redirectToAdminLogin');
      setTimeout(() => {
        window.location.href = '/admin-login';
      }, 1000);
    }
  }, [language, t]);

  return (
    <>
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
                <img
                  className="hero-logo"
                  src={logoUrl}
                  alt="Logo Pokémon New World"
                />
                {/* Titre texte retiré */}
                <div className="cta">
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
              </div>
            </HeroVideo>
          </section>

          {/* DERNIÈRES NOUVEAUTÉS */}
          <section id="news" className="section card">
            <h2>
              <img src="/newsCLEAN3.png" alt="Icône nouveautés" className="section-icon" />{" "}
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
            <section className="section card dual-section">
              <h2>
                <i className="fa-brands fa-tiktok"></i>
                {t('sections.tiktok.title')}
              </h2>
              <div className="dual-content">
                <div className="dual-image-container">
                  <img 
                    src="/TIKTOK.png" 
                    alt="TikTok" 
                    className="dual-image"
                  />
                  <div className="dual-overlay">
                    <div className="dual-cta">
                      <h3>{t('sections.tiktok.heading')}</h3>
                      <p>{t('sections.tiktok.description')}</p>
                      <a 
                        href={tiktok || "https://www.tiktok.com"} 
                        target="_blank" 
                        rel="noreferrer"
                        className="btn btn-primary dual-btn"
                      >
                        <i className="fa-brands fa-tiktok"></i> {t('buttons.viewOnTikTok')}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="section card dual-section">
              <h2>
                <i className="fa-solid fa-file-text"></i>
                {t('sections.patchNotes.title')}
              </h2>
              <div className="dual-content">
                <div className="dual-image-container">
                  <img 
                    src={(patchNotesFromApi?.versions?.[0]?.image) || (patchNotesFromApi?.versions?.[0]?.version ? `/PATCHNOTE${String(patchNotesFromApi.versions[0].version).replace('.', '')}.png` : '/PATCHNOTE06.png')}
                    alt="Notes de patch" 
                    className="dual-image"
                  />
                  <div className="dual-overlay">
                    <div className="dual-cta">
                      <h3>{t('sections.patchNotes.heading')}</h3>
                      <p>{t('sections.patchNotes.description')}</p>
                      <button 
                        className="btn btn-primary dual-btn"
                        onClick={() => setOpenPatchNotes(true)}
                      >
                        <i className="fa-solid fa-eye"></i> {t('buttons.viewNotes')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* SECTION PATREON */}
          <section id="patreon" className="section card">
            <h2>
              <img src={patreonContent?.icon || "/patreonlogo.png"} alt="Logo Patreon" className="section-icon" />{" "}
              {patreonContent?.title || t('sections.patreon.title')}
            </h2>
            <div className="patreon-content">
              <div className="patreon-image-container">
                <img 
                  src={patreonContent?.image || "/patreon.png"} 
                  alt="Soutenez-nous sur Patreon" 
                  className="patreon-image"
                />
                <div className="patreon-overlay">
                  <div className="patreon-cta">
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
          <div className="container footer-grid">
            <div className="footer-col">
              <div className="footer-brand">
                <img src={logoUrl} alt="Logo Pokémon New World" />
                <strong>Pokémon New World</strong>
              </div>
              <p style={{ marginTop: 8, color: "var(--muted)" }}>
                {t('footer.description')}
              </p>
              <div className="social">
                <a
                  href={discord || "#"}
                  target="_blank"
                  rel="noreferrer"
                  title="Discord"
                >
                  <i className="fa-brands fa-discord"></i>
                </a>
                <button 
                  onClick={() => setOpenDownload(true)}
                  style={{ 
                    background: "none", 
                    border: "1px solid rgba(255,255,255,.18)", 
                    color: "inherit", 
                    cursor: "pointer", 
                    padding: 0, 
                    font: "inherit",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px"
                  }}
                  title={t('buttons.download')}
                >
                  <i className="fa-solid fa-download"></i>
                </button>
              </div>
            </div>
            <div className="footer-col">
              <h4>{t('navigation.navigation')}</h4>
              <ul>
                <li>
                  <a href="#news">
                    <i className="fa-solid fa-newspaper"></i> {t('navigation.news')}
                  </a>
                </li>
                <li>
                  <button 
                    onClick={() => setOpenDownload(true)}
                    style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 0, font: "inherit" }}
                  >
                    <i className="fa-solid fa-cloud-arrow-down"></i> {t('navigation.download')}
                  </button>
                </li>
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
                <h4>Liens du Footer</h4>
                <ul>
                  {footer.links.map((link, index) => (
                    <li key={link.id || index}>
                      <a href={link.url} target="_blank" rel="noreferrer">
                        {link.icon && <i className={link.icon} style={{marginRight: '8px'}}></i>}
                        {link.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="container footnote">
            {footer?.copyright ? footer.copyright.replace('{year}', new Date().getFullYear()) : `© ${new Date().getFullYear()} Pokémon New World — ${t('footer.copyright')}`}
            {footer?.developedBy && (
              <span style={{marginLeft: '10px', opacity: 0.7}}>
                Développé par : {footer.developedBy}
              </span>
            )}
            {footer?.version && (
              <span style={{marginLeft: '10px', opacity: 0.7}}>
                {footer.version}
              </span>
            )}
          </div>
        </footer>

        {/* Modal explications patch */}
        <Modal
          open={openExplanations}
          onClose={() => setOpenExplanations(false)}
          title={t('modals.patchExplanations.title')}
        >
          <div className="explanations-content">
            <div className="explanations-video">
              <iframe
                width="100%"
                height="315"
                src="https://www.youtube.com/embed/043CVnIdeZ0"
                title="Tutoriel installation patch"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="explanations-text">
              <h3>{t('modals.patchExplanations.heading')}</h3>
              <p>
                {t('modals.patchExplanations.description')}
              </p>
              <ol>
                {t('modals.patchExplanations.steps').map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            </div>
          </div>
        </Modal>

        {/* Modal de téléchargement */}
        <Modal
          open={openDownload}
          onClose={() => setOpenDownload(false)}
          title={t('modals.download.title')}
        >
          <div className="download-modal-content">
            <div className="modal-buttons">
              <a 
                className="btn btn-primary" 
                href={content.downloads.windows} 
                onClick={() => setOpenDownload(false)}
              >
                <i className="fa-solid fa-download"></i> {t('buttons.downloadGame')}
              </a>
              <a 
                className="btn btn-primary" 
                href={content.downloads.patch} 
                onClick={() => setOpenDownload(false)}
              >
                <i className="fa-solid fa-file-arrow-up"></i> {t('buttons.downloadPatch')}
              </a>
            </div>
            <div className="patch-instructions">
              <h3>{t('modals.download.patchInstructions.title')}</h3>
              <p>
                {t('modals.download.patchInstructions.description')}
              </p>
              <p>{t('modals.download.patchInstructions.videoNote')}</p>
              <button 
                className="btn btn-ghost" 
                onClick={() => {
                  setOpenExplanations(true);
                  setOpenDownload(false); 
                }}
              >
                <i className="fa-solid fa-play"></i> {t('buttons.watchVideo')}
              </button>
            </div>
          </div>
        </Modal>

        {/* Modal notes de patch (données depuis l'API pour refléter les modifs admin) */}
        <Modal
          open={openPatchNotes}
          onClose={() => setOpenPatchNotes(false)}
          title={patchNotesFromApi?.versions?.[0] ? `${t('modals.patchNotes.version')} ${patchNotesFromApi.versions[0].version}` : t('modals.patchNotes.version')}
        >
          <div className="patch-notes-content">
            {patchNotesFromApi?.versions?.[0] ? (
              <>
                <div className="patch-header">
                  <h3>{t('modals.patchNotes.version')} {patchNotesFromApi.versions[0].version}</h3>
                  <p className="patch-date">{patchNotesFromApi.versions[0].date}</p>
                </div>
                {patchNotesFromApi.versions[0].image && (
                  <div className="patch-image-wrap">
                    <img src={patchNotesFromApi.versions[0].image} alt="" className="patch-image" />
                  </div>
                )}
                {(patchNotesFromApi.versions[0].sections || []).map((section, index) => (
                  <div key={index} className="patch-section">
                    <h4>{section.title}</h4>
                    {section.image && (
                      <div className="patch-section-image-wrap">
                        <img src={section.image} alt="" className="patch-section-image" />
                      </div>
                    )}
                    <ul>
                      {(section.items || []).map((item, itemIndex) => (
                        <li key={itemIndex}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
                <div className="patch-modal-footer">
                  <a
                    href="/patchnotes"
                    className="btn btn-primary"
                    onClick={() => setOpenPatchNotes(false)}
                  >
                    <i className="fa-solid fa-clock-rotate-left" /> {t('buttons.olderPatches')}
                  </a>
                </div>
              </>
            ) : (
              <p className="patch-loading">{patchNotesFromApi === null ? t('loading') || 'Chargement…' : t('patchNotes.empty') || 'Aucune note de patch.'}</p>
            )}
          </div>
        </Modal>

        {/* (optionnel) modal vidéo patch si utilisé */}
        {downloads.patchVideo && (
          <Modal
            open={openVideo}
            onClose={() => setOpenVideo(false)}
            title="Installer un patch — Vidéo tutoriel"
          >
            <iframe
              src={downloads.patchVideo}
              title="Tutoriel Patch"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </Modal>
        )}
      </main>
    </>
  );
};

export default HomePage;