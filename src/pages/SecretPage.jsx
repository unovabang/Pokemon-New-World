import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Page dédiée Easter egg — ambiance Darkrai.
 * Audio : remplacez l'attribut src ci-dessous par l'URL de votre fichier vocal.
 */
const SECRET_AUDIO_SRC = "/audio/secret-voice.mp3";

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
        {/* Contenu à ajouter plus tard */}
        <div className="secret-page-placeholder" />

        <button
          type="button"
          className="secret-page-btn-fuir"
          onClick={handleFuir}
        >
          FUIR
        </button>
      </div>

      {/* Audio : modifier src pour votre fichier vocal */}
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
