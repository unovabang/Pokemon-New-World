import { useState } from "react";
import content from "./content.json";
import HeroVideo from "./components/HeroVideo";
import Carousel from "./components/Carousel";
import Modal from "./components/Modal";
import YouTubeAudio from "./components/YouTubeAudio";

function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <nav className="nav">
      <div className="container nav-inner">
        {/* Logo seul, plus grand et glow (voir CSS .brand-logo) */}
        <a href="#top" className="brand" aria-label="Accueil">
          <img
            className="brand-logo"
            src="/logo.png"
            alt="Logo Pokémon New World"
          />
        </a>

        <button
          className="burger"
          aria-label="Ouvrir le menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          ☰
        </button>

        <div
          className={`links ${open ? "open" : ""}`}
          onClick={() => setOpen(false)}
        >
          <a className="navlink" href="#features">
            <i className="fa-solid fa-wand-magic-sparkles"></i> Fonctionnalités
          </a>
          <a className="navlink" href="#captures">
            <i className="fa-solid fa-images"></i> Captures
          </a>
          {/* pas de lien “Téléchargement” ; le CTA scroll vers la section */}
          <span className="nav-cta">
            <a className="btn btn-primary" href="#download">
              <i className="fa-solid fa-cloud-arrow-down"></i> Télécharger
            </a>
          </span>
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  const { backgrounds, heroVideo, game, carousel, discord, downloads } =
    content;
  const [openVideo, setOpenVideo] = useState(false);

  return (
    <>
      <Nav />

      <main
        id="top"
        className="page"
        style={{
          "--page-bg": `url(${backgrounds.home})`,
          "--bg-blur": `${backgrounds.blur}px`,
          "--bg-dim": backgrounds.dim,
        }}
      >
        {/* lecteur audio discret */}
        {content.audio?.enabled && (
          <YouTubeAudio
            videoId={content.audio.youtubeId}
            autoplay={content.audio.autoplay}
            startVolume={content.audio.startVolume}
            show
          />
        )}

        <div className="container">
          {/* HERO vidéo : logo plus grand via .hero-logo */}
          <section className="section" style={{ padding: 0 }}>
            <HeroVideo videoId={heroVideo.youtubeId}>
              <div>
                <img
                  className="hero-logo"
                  src="/logo.png"
                  alt="Logo Pokémon New World"
                />
                <h1>
                  Pokémon <em>New World</em>
                </h1>
                <div className="cta">
                  <a className="btn btn-primary" href="#download">
                    <i className="fa-solid fa-cloud-arrow-down"></i> Télécharger
                  </a>
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

          {/* FONCTIONNALITÉS */}
          <section id="features" className="section card">
            <h2>
              <i className="fa-solid fa-wand-magic-sparkles"></i>{" "}
              Fonctionnalités
            </h2>
            <ul className="list-check" style={{ marginTop: 8 }}>
              {game.features.map((f, i) => (
                <li key={i}>
                  <i className="fa-solid fa-check"></i>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* CAPTURES */}
          <section id="captures" className="section card">
            <h2>
              <i className="fa-solid fa-images"></i> Captures
            </h2>
            <Carousel images={carousel} interval={4200} />
          </section>

          {/* DISCORD CTA */}
          <section id="discord" className="section card discord-cta">
            <i
              className="fa-brands fa-discord discord-icon"
              aria-hidden="true"
            ></i>
            <div>
              <h3>Rejoignez le Discord officiel</h3>
              <p>Actus, entraide, échanges GTS et annonces de versions.</p>
            </div>
            <div style={{ marginLeft: "auto" }}>
              <a
                className="btn btn-primary"
                href={discord?.invite || "#"}
                target="_blank"
                rel="noreferrer"
              >
                <i className="fa-brands fa-discord"></i> Rejoindre
              </a>
            </div>
          </section>

          {/* TÉLÉCHARGEMENT */}
          <section id="download" className="section card dl-section">
            <h2>
              <i className="fa-solid fa-cloud-arrow-down"></i> Téléchargement
            </h2>
            <div className="steps-chips">
              <span className="step-chip">
                <span className="num">1</span> Télécharger
              </span>
              <span className="step-chip">
                <span className="num">2</span> Décompresser
              </span>
              <span className="step-chip">
                <span className="num">3</span> Lancer
              </span>
            </div>

            <div className="tiles">
              <div className="tile">
                <div className="icon-round">
                  <i className="fa-brands fa-windows"></i>
                </div>
                <div>
                  <div className="title">Version Windows</div>
                  <div className="subtitle">PSDK · FR/EN</div>
                </div>
                <div className="actions">
                  <a className="btn btn-primary" href={downloads.windows}>
                    <i className="fa-solid fa-download"></i> Télécharger
                  </a>
                  <a className="btn btn-ghost" href={downloads.mirror}>
                    <i className="fa-solid fa-link"></i> Miroir
                  </a>
                </div>
              </div>

              <div className="tile">
                <div className="icon-round">
                  <i className="fa-solid fa-screwdriver-wrench"></i>
                </div>
                <div>
                  <div className="title">Patch / Mise à jour</div>
                  <div className="subtitle">
                    Mettez à jour une version existante.
                  </div>
                </div>
                <div className="actions">
                  <a className="btn btn-primary" href={downloads.patch}>
                    <i className="fa-solid fa-file-arrow-up"></i> Patch
                  </a>
                  <a className="btn btn-ghost" href={downloads.notes}>
                    <i className="fa-solid fa-clipboard-list"></i> Notes
                  </a>
                </div>
              </div>
            </div>

            {/* Meta */}
            <div className="meta-grid">
              <div className="card dl-card">
                <h3 className="dl-title">
                  <i className="fa-solid fa-microchip"></i> Configuration
                  requise
                </h3>
                <ul className="list-check" style={{ marginTop: 8 }}>
                  <li>
                    <i className="fa-solid fa-desktop"></i>{" "}
                    <span>Windows 10/11 (x64)</span>
                  </li>
                  <li>
                    <i className="fa-solid fa-microchip"></i>{" "}
                    <span>CPU 2 cœurs · RAM 4 Go · Stockage 3 Go</span>
                  </li>
                  <li>
                    <i className="fa-solid fa-microchip"></i>{" "}
                    <span>GPU OpenGL 2.1+ (Intel/AMD/NVIDIA)</span>
                  </li>
                </ul>
              </div>
              <div className="card dl-card">
                <h3 className="dl-title">
                  <i className="fa-solid fa-circle-question"></i> Aide rapide
                </h3>
                <ul className="list-check" style={{ marginTop: 8 }}>
                  <li>
                    <i className="fa-solid fa-shield-halved"></i>{" "}
                    <span>Désactivez SmartScreen si nécessaire.</span>
                  </li>
                  <li>
                    <i className="fa-solid fa-folder-open"></i>{" "}
                    <span>Utilisez un chemin simple.</span>
                  </li>
                  <li>
                    <i className="fa-brands fa-discord"></i>{" "}
                    <span>Besoin d’aide ? Rejoignez le Discord.</span>
                  </li>
                </ul>
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
                <a href="#download" title="Télécharger">
                  <i className="fa-solid fa-download"></i>
                </a>
              </div>
            </div>
            <div className="footer-col">
              <h4>Navigation</h4>
              <ul>
                <li>
                  <a href="#features">
                    <i className="fa-solid fa-wand-magic-sparkles"></i>{" "}
                    Fonctionnalités
                  </a>
                </li>
                <li>
                  <a href="#captures">
                    <i className="fa-solid fa-images"></i> Captures
                  </a>
                </li>
                <li>
                  <a href="#download">
                    <i className="fa-solid fa-cloud-arrow-down"></i>{" "}
                    Téléchargement
                  </a>
                </li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Légal</h4>
              <ul>
                <li>
                  Fan-game non affilié à Nintendo / Creatures / GAME FREAK.
                </li>
                <li>Marques et assets appartiennent à leurs ayants droit.</li>
              </ul>
            </div>
          </div>
          <div className="container footnote">
            © {new Date().getFullYear()} Pokémon New World — tous droits
            réservés.
          </div>
        </footer>

        {/* (optionnel) modal vidéo patch si utilisé ailleurs */}
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
