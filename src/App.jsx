import { useState, useEffect } from "react";
import content from "./config/index.js";
import HeroVideo from "./components/HeroVideo";
import Carousel from "./components/Carousel";
import Modal from "./components/Modal";
import YouTubeAudio from "./components/YouTubeAudio";
import NewsBanner from "./components/NewsBanner";



export default function App() {
  const { backgrounds, heroVideo, game, carousel, discord, downloads } =
    content;
  const [openVideo, setOpenVideo] = useState(false);
  const [openExplanations, setOpenExplanations] = useState(false);
  const [openDownload, setOpenDownload] = useState(false);

  // Mise à jour des métadonnées SEO
  useEffect(() => {
    if (content.seo) {
      if (content.seo.title) {
        document.title = content.seo.title;
        const titleEl = document.getElementById('page-title');
        if (titleEl) titleEl.textContent = content.seo.title;
      }

      if (content.seo.description) {
        const descEl = document.getElementById('page-description');
        if (descEl) descEl.setAttribute('content', content.seo.description);
      }

      if (content.seo.keywords) {
        const keywordsEl = document.getElementById('page-keywords');
        if (keywordsEl) keywordsEl.setAttribute('content', content.seo.keywords.join(','));
      }
    }
  }, []);

  return (
    <>
      <main
        id="top"
        className="page"
        style={{
          "--page-bg": `url(${backgrounds.home})`,
          "--bg-blur": `${backgrounds.blur}px`,
          "--bg-dim": backgrounds.dim,
        }}
      >
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
                    <i className="fa-solid fa-cloud-arrow-down"></i> Télécharger
                  </button>
                  <a
                    className="btn btn-ghost"
                    href={discord?.invite || "#"}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <i className="fa-brands fa-discord"></i> Discord
                  </a>
                </div>
              </div>
            </HeroVideo>
          </section>

          {/* DERNIÈRES NOUVEAUTÉS */}
          <section id="news" className="section card">
            <h2>
              <img src="/newsCLEAN3.png" alt="Icône nouveautés" className="section-icon" />{" "}
              {content.sections?.news?.title || "DERNIÈRES NOUVEAUTÉS"}
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
                TikTok
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
                      <h3>Suivez-nous !</h3>
                      <p>Découvrez nos dernières vidéos et actualités sur TikTok</p>
                      <a 
                        href="https://www.tiktok.com" 
                        target="_blank" 
                        rel="noreferrer"
                        className="btn btn-primary dual-btn"
                      >
                        <i className="fa-brands fa-tiktok"></i> Voir sur TikTok
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="section card dual-section">
              <h2>
                <i className="fa-solid fa-file-text"></i>
                Notes de patch
              </h2>
              <div className="dual-content">
                <div className="dual-image-container">
                  <img 
                    src="/PATCHNOTE06.png" 
                    alt="Notes de patch" 
                    className="dual-image"
                  />
                  <div className="dual-overlay">
                    <div className="dual-cta">
                      <h3>Nouveautés</h3>
                      <p>Découvrez les dernières améliorations et corrections</p>
                      <a 
                        href="#" 
                        className="btn btn-primary dual-btn"
                        onClick={(e) => e.preventDefault()}
                      >
                        <i className="fa-solid fa-eye"></i> Voir les notes
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* SECTION PATREON */}
          <section id="patreon" className="section card">
            <h2>
              <img src={content.patreon?.icon || "/patreonlogo.png"} alt="Logo Patreon" className="section-icon" />{" "}
              {content.patreon?.title || "Obtiens les nouveautés en avance !"}
            </h2>
            <div className="patreon-content">
              <div className="patreon-image-container">
                <img 
                  src={content.patreon?.image || "/patreon.png"} 
                  alt="Soutenez-nous sur Patreon" 
                  className="patreon-image"
                />
                <div className="patreon-overlay">
                  <div className="patreon-cta">
                    <h3>{content.patreon?.content?.heading || "Soutenez le projet"}</h3>
                    <p>{content.patreon?.content?.description || "Accédez aux nouveautés en avant-première et aidez-nous à développer le jeu !"}</p>
                    <a 
                      href={content.patreon?.content?.url || "https://www.patreon.com/c/unovabang"} 
                      target="_blank" 
                      rel="noreferrer"
                      className="btn btn-primary patreon-btn"
                    >
                      <i className={content.patreon?.content?.buttonIcon || "fa-brands fa-patreon"}></i> {content.patreon?.content?.buttonText || "Soutenir sur Patreon"}
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
                Site officiel du fangame.
              </p>
              <div className="social">
                <a
                  href={discord?.invite || "#"}
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
                  title="Télécharger"
                >
                  <i className="fa-solid fa-download"></i>
                </button>
              </div>
            </div>
            <div className="footer-col">
              <h4>Navigation</h4>
              <ul>
                <li>
                  <a href="#news">
                    <i className="fa-solid fa-newspaper"></i> Nouveautés
                  </a>
                </li>
                <li>
                  <button 
                    onClick={() => setOpenDownload(true)}
                    style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 0, font: "inherit" }}
                  >
                    <i className="fa-solid fa-cloud-arrow-down"></i> Téléchargement
                  </button>
                </li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Légal</h4>
              <ul>
                <li>Fan-game non affilié à Nintendo / Creatures / GAME FREAK.</li>
                <li>Marques et assets appartiennent à leurs ayants droit.</li>
              </ul>
            </div>
          </div>
          <div className="container footnote">
            © {new Date().getFullYear()} Pokémon New World — tous droits réservés.
          </div>
        </footer>

        {/* Modal explications patch */}
        <Modal
          open={openExplanations}
          onClose={() => setOpenExplanations(false)}
          title="Installer un patch — Explications"
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
              <h3>Installation d'un patch</h3>
              <p>
                Tout d'abord, pour pouvoir installer un patch, il faut déjà être sur la version qui précède le patch que vous voulez installer. Si cette condition est remplie, il suffit de suivre ces étapes :
              </p>
              <ol>
                <li>Téléchargez le Patch.zip correspondant à la version que vous voulez installer</li>
                <li>Déplacez ce zip à la racine de votre dossier de jeu</li>
                <li>Enfin, extrayez le Patch.zip et il mettra à jour vos anciens dossiers</li>
              </ol>
            </div>
          </div>
        </Modal>

        {/* Modal de téléchargement */}
        <Modal
          open={openDownload}
          onClose={() => setOpenDownload(false)}
          title="Téléchargement"
        >
          <div className="download-modal-content">
            <div className="modal-buttons">
              <a 
                className="btn btn-primary" 
                href={content.downloads.windows} 
                onClick={() => setOpenDownload(false)}
              >
                <i className="fa-solid fa-download"></i> Télécharger le jeu
              </a>
              <a 
                className="btn btn-primary" 
                href={content.downloads.patch} 
                onClick={() => setOpenDownload(false)}
              >
                <i className="fa-solid fa-file-arrow-up"></i> Télécharger le patch
              </a>
            </div>
            <div className="patch-instructions">
              <h3>Note sur les patchs :</h3>
              <p>
                Pour installer un patch, assurez-vous d'avoir la version précédente installée. Placez le fichier patch.zip à la racine de votre jeu, extrayez-le, et il mettra à jour les anciens dossiers. 
              </p>
              <p>Vous pouvez également consulter la vidéo tutoriel pour plus de détails.</p>
              <button 
                className="btn btn-ghost" 
                onClick={() => {
                  setOpenExplanations(true);
                  setOpenDownload(false); 
                }}
              >
                <i className="fa-solid fa-play"></i> Voir la vidéo explicative
              </button>
            </div>
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
}