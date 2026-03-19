import { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Page Chemin des Larmes — Easter egg Darkrai.
 * Ambiance mystérieuse, sombre, carte Pokémon type archive corrompue.
 */
const SECRET_AUDIO_SRC = "https://audio.jukehost.co.uk/Icyu4x7mU7ApHJ0lx9R6R6WwMX2pP9Si.mp3";
const SECRET_HERO_BG = "https://images3.alphacoders.com/107/1073997.jpg";
const MEGA_DARKRAI_IMAGE = "https://static.wikia.nocookie.net/pokemon-new-world-fr/images/f/f7/Darkrai2.gif/revision/latest?cb=20260130212808&path-prefix=fr";

/** Segments avec timestamps (secondes) — ajuster pour coller à la voix. */
const SECRET_TRANSCRIPT_SEGMENTS = [
  { text: "Félicitations", at: 0 },
  { text: "Tu es arrivé jusqu'ici", at: 2.5 },
  { text: "Il ne te reste qu'une seule étape avant d'obtenir ce que tu cherches", at: 6 },
  { text: "Chemin des Larmes", at: 11 },
  { text: "Vieux Manoir", at: 14 },
  { text: "Six y", at: 17 },
  { text: "Quatre x", at: 19 },
  { text: "Moins un x", at: 21 },
  { text: "Trois y", at: 23 },
  { text: "AA", at: 25 },
  { text: "Ne te trompe pas", at: 27 },
];

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
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const visibleText = useMemo(() => {
    const segments = SECRET_TRANSCRIPT_SEGMENTS;
    let count = 0;
    for (let i = 0; i < segments.length; i++) {
      if (currentTime >= segments[i].at) count = i + 1;
    }
    return segments.slice(0, count).map((s) => s.text).join("\n").trim();
  }, [currentTime]);

  useEffect(() => {
    document.body.classList.add("secret-page-active");
    document.documentElement.classList.add("secret-page-active");
    return () => {
      document.body.classList.remove("secret-page-active");
      document.documentElement.classList.remove("secret-page-active");
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(audio.duration && isFinite(audio.duration) ? audio.duration : 999);
    };
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const p = audio.play().catch(() => {});
    if (p && typeof p.then === "function") p.then(() => {}).catch(() => {});
    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, []);

  const handleFuir = () => {
    navigate("/", { replace: true });
  };

  const handleEcouteMoi = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      return;
    }
    if (audio.ended || audio.currentTime > 0) {
      audio.currentTime = 0;
      setCurrentTime(0);
    }
    audio.play().catch(() => {});
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
        <div className="secret-toolbar">
          <button type="button" className="secret-back" onClick={handleFuir}>
            <i className="fa-solid fa-door-open" aria-hidden /> Quitter
          </button>
          <button
            type="button"
            className="secret-listen-btn"
            onClick={handleEcouteMoi}
            aria-pressed={isPlaying}
          >
            <i className={isPlaying ? "fa-solid fa-pause" : "fa-solid fa-volume-high"} aria-hidden />
            {isPlaying ? " Pause" : " Ecoute-moi"}
          </button>
        </div>
        <div className="secret-main">
          <aside className="secret-transcript-panel" aria-label="Retranscription">
            <div className="secret-transcript-box" aria-live="polite">
              <div className="secret-transcript-header">RETRANSCRIPTION</div>
              <div className="secret-transcript-inner">
                {visibleText ? (
                  <p className="secret-transcript-text">{visibleText}</p>
                ) : (
                  <p className="secret-transcript-placeholder">La retranscription apparaîtra ici au fur et à mesure de l&apos;écoute.</p>
                )}
              </div>
            </div>
          </aside>
          <div className="secret-content">
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
