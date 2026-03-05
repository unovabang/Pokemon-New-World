import { useState, useEffect } from "react";
import content from "../config/index.js";
import patchNotesData from "../config/patchnotes.json";
import patreonData from "../config/patreon.json";
import HeroVideo from "../components/HeroVideo";
import Carousel from "../components/Carousel";
import Modal from "../components/Modal";
import YouTubeAudio from "../components/YouTubeAudio";
import NewsBanner from "../components/NewsBanner";
import LanguageSelector from "../components/LanguageSelector";
import Navbar from "../components/Navbar";
import { useLanguage } from "../contexts/LanguageContext";

const HomePage = () => {
  const { backgrounds, heroVideo, game, carousel, discord, downloads, tiktok, youtube, twitter, instagram, facebook, github, reddit, footer } = content;
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
          "--page-bg": `url(${backgrounds.home})`,
          "--bg-blur": `${backgrounds.blur}px`,
          "--bg-dim": backgrounds.dim,
        }}
      >
        <Navbar />

        {/* Lecteur audio discret */}
        {content.audio?.enabled && (
          <YouTubeAudio
            videoId={content.audio.youtubeId}
            autoplay={content.audio.autoplay}
            startVolume={content.audio.startVolume}
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
                  src="/logo.png"
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
              banners={content.news?.banners || []} 
              interval={content.news?.interval || 5000}
              autoLoad={true}
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
                    src={`/PATCHNOTE${patchNotesData.version ? patchNotesData.version.replace('.', '') : '06'}.png`}
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
                <img src="/logo.png" alt="Logo Pokémon New World" />
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

        {/* Modal notes de patch */}
        <Modal
          open={openPatchNotes}
          onClose={() => setOpenPatchNotes(false)}
          title={`${t('modals.patchNotes.version')} ${t('patchNotes.version')}`}
        >
          <div className="patch-notes-content">
            <div className="patch-header">
              <h3>{t('patchNotes.title')}</h3>
              <p className="patch-date">{t('modals.patchNotes.version')} {t('patchNotes.version')} - {t('patchNotes.date')}</p>
            </div>
            
            {t('patchNotes.sections').map((section, index) => (
              <div key={index} className="patch-section">
                <h4>{section.title}</h4>
                <ul>
                  {section.items.map((item, itemIndex) => (
                    <li key={itemIndex}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
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