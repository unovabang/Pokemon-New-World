import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Page Chemin des Larmes — Easter egg Darkrai.
 * Ambiance mystérieuse, sombre, carte Pokémon type archive corrompue.
 */
const SECRET_AUDIO_SRC = "/audio/secret-voice.mp3";
const SECRET_HERO_BG = "https://images3.alphacoders.com/107/1073997.jpg";
const MEGA_DARKRAI_IMAGE = "https://static.wikia.nocookie.net/pokemon-new-world-fr/images/f/f7/Darkrai2.gif/revision/latest?cb=20260130212808&path-prefix=fr";

const CRYPT = {
  name: "▯ ▯ ▯ ▯ ▯ ▯",
  type: "▯",
  stat: "▯",
  total: "▯▯▯",
  talentLabel: "▯ ▯ ▯",
  talentName: "▯ ▯ ▯",
  talentDesc: "▯ ▯ ▯ ▯ ▯ ▯ ▯ ▯ ▯ ▯",
  attackName: "▯ ▯ ▯",
  attackDesc: "▯ ▯ ▯ ▯ ▯ ▯ ▯ ▯ ▯ ▯ ▯ ▯ ▯ ▯",
};

export default function SecretPage() {
  const navigate = useNavigate();
  const audioRef = useRef(null);

  useEffect(() => {
    document.body.classList.add("secret-page-active");
    return () => document.body.classList.remove("secret-page-active");
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const play = () => {
      const p = audio.play().catch(() => {});
      if (p && typeof p.then === "function") p.then(() => {}).catch(() => {});
    };
    play();
    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, []);

  const handleFuir = () => {
    navigate("/", { replace: true });
  };

  return (
    <div className="secret-page secret-page-enter">
      <div className="secret-page-bg" aria-hidden="true" />
      <div className="secret-page-fog" aria-hidden="true" />
      <div className="secret-page-ambient">
        <span className="secret-orb secret-orb-1" aria-hidden="true" />
        <span className="secret-orb secret-orb-2" aria-hidden="true" />
        <span className="secret-orb secret-orb-3" aria-hidden="true" />
      </div>
      <div className="secret-page-noise" aria-hidden="true" />
      <div className="secret-page-vignette" aria-hidden="true" />
      <div className="secret-page-scan" aria-hidden="true" />

      <header className="secret-hero" style={{ backgroundImage: `url(${SECRET_HERO_BG})` }}>
        <div className="secret-hero-overlay" aria-hidden="true" />
        <div className="secret-hero-glow" aria-hidden="true" />
        <div className="secret-hero-inner">
          <img src="https://i.imgur.com/9bVZ1FP.png" alt="" className="secret-hero-logo" />
          <span className="secret-hero-badge">[ ACCÈS RESTREINT ]</span>
          <h1 className="secret-hero-title">CHEMIN DES LARMES</h1>
          <p className="secret-hero-description">
            Là où l'esprit perd son bord — une présence veille dans l'oubli.
          </p>
          <p className="secret-hero-warning">Tu ne devrais pas être ici.</p>
        </div>
      </header>

      <div className="secret-content-wrap">
        <div className="secret-content">
          <div className="secret-toolbar">
            <button type="button" className="secret-back" onClick={handleFuir}>
              <i className="fa-solid fa-door-open" aria-hidden /> Quitter
            </button>
          </div>

          <article className="secret-card">
            <div className="secret-card-frame" aria-hidden="true" />
            <div className="secret-card-glitch" aria-hidden="true" />
            <div className="secret-card-header">
              <span className="secret-card-classified">CLASSIFIÉ</span>
              <span className="secret-card-id">ID: ???</span>
            </div>
            <div className="secret-card-sprite-wrap">
              <div className="secret-card-sprite-frame">
                <div className="secret-card-sprite-inner">
                  <img
                    src={MEGA_DARKRAI_IMAGE}
                    alt=""
                    className="secret-card-sprite-img"
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.nextElementSibling?.classList.add("secret-card-unknown-visible");
                    }}
                  />
                  <span className="secret-card-unknown" aria-hidden>?</span>
                </div>
                <div className="secret-card-sprite-static" aria-hidden="true" />
              </div>
            </div>
            <div className="secret-card-body">
              <p className="secret-card-subtitle">Archive corrompue // niveau d'accès : néant</p>
              <h2 className="secret-card-name">{CRYPT.name}</h2>
              <div className="secret-card-types">
                <span className="secret-card-type-pill">{CRYPT.type}</span>
                <span className="secret-card-type-pill">{CRYPT.type}</span>
              </div>
              <div className="secret-card-divider" />
              <div className="secret-card-stats">
                <div className="secret-card-stat"><span className="secret-card-stat-label">PV</span><span>{CRYPT.stat}</span></div>
                <div className="secret-card-stat"><span className="secret-card-stat-label">ATK</span><span>{CRYPT.stat}</span></div>
                <div className="secret-card-stat"><span className="secret-card-stat-label">DEF</span><span>{CRYPT.stat}</span></div>
                <div className="secret-card-stat"><span className="secret-card-stat-label">ATK SPE</span><span>{CRYPT.stat}</span></div>
                <div className="secret-card-stat"><span className="secret-card-stat-label">DEF SPE</span><span>{CRYPT.stat}</span></div>
                <div className="secret-card-stat"><span className="secret-card-stat-label">SPE</span><span>{CRYPT.stat}</span></div>
                <div className="secret-card-stat secret-card-stat-total"><span className="secret-card-stat-label">TOTAL</span><span>{CRYPT.total}</span></div>
              </div>
              <div className="secret-card-divider" />
              <div className="secret-card-talents">
                <div className="secret-card-section-label">{CRYPT.talentLabel}</div>
                <div className="secret-card-talent-slot">
                  <div className="secret-card-talent-name">{CRYPT.talentName}</div>
                  <p className="secret-card-talent-desc">{CRYPT.talentDesc}</p>
                </div>
              </div>
              <div className="secret-card-attacks">
                <div className="secret-card-section-label">{CRYPT.attackName}</div>
                <p className="secret-card-attack-desc">{CRYPT.attackDesc}</p>
              </div>
            </div>
            <div className="secret-card-footer">
              <span>Données inaccessibles</span>
            </div>
          </article>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={SECRET_AUDIO_SRC}
        preload="auto"
        className="secret-page-audio"
        aria-label="Message vocal"
      />
    </div>
  );
}
