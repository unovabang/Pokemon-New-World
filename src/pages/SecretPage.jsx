import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Page dédiée Easter egg — ambiance Darkrai.
 * Hero type lore, carte Mega Darkrai avec sprite du pokedex et symboles cryptés.
 */
const SECRET_AUDIO_SRC = "/audio/secret-voice.mp3";
const SECRET_HERO_BG = "https://images3.alphacoders.com/107/1073997.jpg";
/** Sprite Méga-Darkrai (pokedex Pokémon New World) */
const MEGA_DARKRAI_IMAGE = "https://static.wikia.nocookie.net/pokemon-new-world-fr/images/f/f7/Darkrai2.gif/revision/latest?cb=20260130212808&path-prefix=fr";

/* Symboles cryptés pour l’ambiance “inconnu” */
const CRYPT = {
  name: "◊ ⁂ ▯ ᛭ ⁂ ◊",
  type: "⌇",
  stat: "▯",
  total: "▯▯▯",
  talentLabel: "† † †",
  talentName: "◊ ⁂ ◊",
  talentDesc: "··· † ··· † ··· † ··· † ···",
  attackName: "⁂ ⌇ ⁂",
  attackDesc: "† ··· † ··· † ··· † ··· † ··· † ···",
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
    <div className="secret-page">
      <div className="secret-page-bg" aria-hidden="true" />
      <div className="secret-page-noise" aria-hidden="true" />
      <div className="secret-page-vignette" aria-hidden="true" />

      {/* Hero type lore */}
      <header className="secret-hero lore-style" style={{ backgroundImage: `url(${SECRET_HERO_BG})` }}>
        <div className="secret-hero-overlay" aria-hidden="true" />
        <div className="secret-hero-inner">
          <h1 className="secret-hero-title secret-hero-title--creepy">CHEMIN DES LARMES</h1>
          <p className="secret-hero-description">
            Là où l'esprit perd son bord — une présence veille dans l'oubli.
          </p>
        </div>
      </header>

      <div className="secret-content-wrap">
        <div className="secret-content">
          <div className="secret-toolbar">
            <button type="button" className="secret-back" onClick={handleFuir}>
              <i className="fa-solid fa-arrow-left" aria-hidden /> Fuir
            </button>
          </div>

          <article className="secret-card secret-card--fakemon">
            <div className="secret-card-sprite-wrap">
              <div className="secret-card-sprite-placeholder">
                <img
                  src={MEGA_DARKRAI_IMAGE}
                  alt=""
                  className="secret-card-sprite-img"
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.nextElementSibling?.classList.add("secret-card-unknown-visible");
                  }}
                />
                <span className="secret-card-unknown" aria-hidden>◊</span>
              </div>
            </div>
            <h2 className="secret-card-name secret-card-name--crypt">{CRYPT.name}</h2>
            <div className="secret-card-types">
              <span className="secret-card-type-pill">{CRYPT.type}</span>
              <span className="secret-card-type-pill">{CRYPT.type}</span>
            </div>
            <div className="secret-card-stats">
              <div className="secret-card-stat"><span className="secret-card-stat-label"><i className="fa-solid fa-heart-pulse" aria-hidden /> PV</span><span>{CRYPT.stat}</span></div>
              <div className="secret-card-stat"><span className="secret-card-stat-label"><i className="fa-solid fa-hand-fist" aria-hidden /> ATK</span><span>{CRYPT.stat}</span></div>
              <div className="secret-card-stat"><span className="secret-card-stat-label"><i className="fa-solid fa-shield" aria-hidden /> DEF</span><span>{CRYPT.stat}</span></div>
              <div className="secret-card-stat"><span className="secret-card-stat-label"><i className="fa-solid fa-wand-magic-sparkles" aria-hidden /> ATK SPE</span><span>{CRYPT.stat}</span></div>
              <div className="secret-card-stat"><span className="secret-card-stat-label"><i className="fa-solid fa-gem" aria-hidden /> DEF SPE</span><span>{CRYPT.stat}</span></div>
              <div className="secret-card-stat"><span className="secret-card-stat-label"><i className="fa-solid fa-gauge-high" aria-hidden /> SPE</span><span>{CRYPT.stat}</span></div>
              <div className="secret-card-stat secret-card-stat-total"><span className="secret-card-stat-label"><i className="fa-solid fa-calculator" aria-hidden /> TOTAL</span><span>{CRYPT.total}</span></div>
            </div>
            <div className="secret-card-talents">
              <div className="secret-card-section-label"><i className="fa-solid fa-star" aria-hidden /> Talents</div>
              <div className="secret-card-talent-slot">
                <div className="secret-card-talent-title">{CRYPT.talentLabel}</div>
                <div className="secret-card-talent-name">{CRYPT.talentName}</div>
                <p className="secret-card-talent-desc">{CRYPT.talentDesc}</p>
              </div>
            </div>
            <div className="secret-card-attacks">
              <div className="secret-card-section-label"><i className="fa-solid fa-bolt" aria-hidden /> Attaque signature</div>
              <div className="secret-card-attack-item">
                <div className="secret-card-attack-name">{CRYPT.attackName}</div>
                <p className="secret-card-attack-desc">{CRYPT.attackDesc}</p>
              </div>
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
