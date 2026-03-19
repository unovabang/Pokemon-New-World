import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Page dédiée Easter egg — ambiance Darkrai.
 * Hero type chapitre lore (titre + sous-titre sur fond Darkrai), puis carte Mega Darkrai style fakemon (infos ???).
 */
const SECRET_AUDIO_SRC = "/audio/secret-voice.mp3";
const SECRET_HERO_BG = "https://images3.alphacoders.com/107/1073997.jpg";

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

      {/* Hero type lore : pleine largeur, fond Darkrai, titre + sous-titre */}
      <header className="secret-hero lore-style" style={{ backgroundImage: `url(${SECRET_HERO_BG})` }}>
        <div className="secret-hero-overlay" aria-hidden="true" />
        <div className="secret-hero-inner">
          <h1 className="secret-hero-title">CHEMIN DES LARMES</h1>
          <p className="secret-hero-description">
            Là où l'esprit perd son bord — une présence veille dans l'oubli.
          </p>
        </div>
      </header>

      {/* Contenu : cadre arrondi comme lore, carte Mega Darkrai style fakemon */}
      <div className="secret-content-wrap">
        <div className="secret-content">
          <div className="secret-toolbar">
            <button type="button" className="secret-back" onClick={handleFuir}>
              <i className="fa-solid fa-arrow-left" aria-hidden /> Fuir
            </button>
          </div>

          {/* Carte Pokémon style fakemon / BST : sprite, nom, types, stats, talents, attaque signature — tout en ??? */}
          <article className="secret-card secret-card--fakemon">
            <div className="secret-card-sprite-wrap">
              <div className="secret-card-sprite-placeholder">
                <span className="secret-card-unknown">?</span>
              </div>
            </div>
            <h2 className="secret-card-name">???</h2>
            <div className="secret-card-types">
              <span className="secret-card-type-pill">???</span>
              <span className="secret-card-type-pill">???</span>
            </div>
            <div className="secret-card-stats">
              <div className="secret-card-stat"><span className="secret-card-stat-label"><i className="fa-solid fa-heart-pulse" aria-hidden /> PV</span><span>???</span></div>
              <div className="secret-card-stat"><span className="secret-card-stat-label"><i className="fa-solid fa-hand-fist" aria-hidden /> ATK</span><span>???</span></div>
              <div className="secret-card-stat"><span className="secret-card-stat-label"><i className="fa-solid fa-shield" aria-hidden /> DEF</span><span>???</span></div>
              <div className="secret-card-stat"><span className="secret-card-stat-label"><i className="fa-solid fa-wand-magic-sparkles" aria-hidden /> ATK SPE</span><span>???</span></div>
              <div className="secret-card-stat"><span className="secret-card-stat-label"><i className="fa-solid fa-gem" aria-hidden /> DEF SPE</span><span>???</span></div>
              <div className="secret-card-stat"><span className="secret-card-stat-label"><i className="fa-solid fa-gauge-high" aria-hidden /> SPE</span><span>???</span></div>
              <div className="secret-card-stat secret-card-stat-total"><span className="secret-card-stat-label"><i className="fa-solid fa-calculator" aria-hidden /> TOTAL</span><span>???</span></div>
            </div>
            <div className="secret-card-talents">
              <div className="secret-card-section-label"><i className="fa-solid fa-star" aria-hidden /> Talents</div>
              <div className="secret-card-talent-slot">
                <div className="secret-card-talent-title">???</div>
                <div className="secret-card-talent-name">???</div>
                <p className="secret-card-talent-desc">??? ??? ??? ??? ??? ??? ??? ???</p>
              </div>
            </div>
            <div className="secret-card-attacks">
              <div className="secret-card-section-label"><i className="fa-solid fa-bolt" aria-hidden /> Attaque signature</div>
              <div className="secret-card-attack-item">
                <div className="secret-card-attack-name">???</div>
                <p className="secret-card-attack-desc">??? ??? ??? ??? ??? ??? ??? ??? ??? ??? ???</p>
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
