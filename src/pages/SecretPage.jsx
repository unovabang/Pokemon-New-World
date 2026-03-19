import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Page dédiée Easter egg — ambiance Darkrai.
 * Hero avec fond Darkrai, logo New World sombre, carte Mega Darkrai (infos inconnues).
 */
const SECRET_AUDIO_SRC = "/audio/secret-voice.mp3";
const SECRET_HERO_BG = "https://images3.alphacoders.com/107/1073997.jpg";
const SECRET_LOGO_URL = "https://i.imgur.com/i6ihLu2.png";

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
      <div className="secret-page-overlay" aria-hidden="true" />
      <div className="secret-page-glow" aria-hidden="true" />

      <div className="secret-page-content">
        {/* Hero avec fond Darkrai + logo */}
        <header className="secret-hero">
          <img
            className="secret-hero-logo"
            src={SECRET_LOGO_URL}
            alt="Pokémon New World"
          />
        </header>

        {/* Carte Pokémon Mega Darkrai — infos inconnues */}
        <article className="secret-card">
          <div className="secret-card-inner">
            <div className="secret-card-header">
              <span className="secret-card-name">???</span>
              <span className="secret-card-hp">??? HP</span>
            </div>
            <div className="secret-card-image-wrap">
              <div className="secret-card-image-placeholder">
                <span className="secret-card-unknown">?</span>
              </div>
            </div>
            <div className="secret-card-type">
              <span className="secret-card-type-badge">???</span>
            </div>
            <div className="secret-card-stats">
              <div className="secret-card-stat"><span className="secret-card-stat-label">???</span> ???</div>
              <div className="secret-card-stat"><span className="secret-card-stat-label">???</span> ???</div>
              <div className="secret-card-stat"><span className="secret-card-stat-label">???</span> ???</div>
            </div>
            <p className="secret-card-desc">
              ??? ??? ??? ??? ??? ??? ??? ??? ??? ???
            </p>
            <div className="secret-card-footer">
              <span className="secret-card-id">???</span>
              <span className="secret-card-subtitle">Méga ??? · ???</span>
            </div>
          </div>
        </article>

        <button
          type="button"
          className="secret-page-btn-fuir"
          onClick={handleFuir}
        >
          FUIR
        </button>
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
