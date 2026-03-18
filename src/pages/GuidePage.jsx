import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:3001/api`
    : `${window.location.origin}/api`;

/** Découpe le texte en segments (texte normal / termes à mettre en évidence) */
function splitByHighlights(text, highlight = []) {
  if (!text || !Array.isArray(highlight) || highlight.length === 0) {
    return [{ type: "text", value: text }];
  }
  const escaped = highlight.map((h) => h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(regex).filter(Boolean);
  return parts.map((p) => ({
    type: highlight.some((h) => p.toLowerCase() === h.toLowerCase()) ? "highlight" : "text",
    value: p,
  }));
}

const PLACEHOLDER_IMG = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

function CharacterBubble({ character, onClick }) {
  const imgSrc = character.imageUrl?.trim() || PLACEHOLDER_IMG;
  return (
    <button
      type="button"
      className="guide-character-bubble"
      onClick={() => onClick(character)}
      title={character.name}
      aria-label={`Voir la fiche de ${character.name}`}
    >
      <div className="guide-character-bubble-inner">
        <img
          src={imgSrc}
          alt=""
          className="guide-character-bubble-img"
          loading="lazy"
        />
      </div>
    </button>
  );
}

function CharacterModal({ character, onClose }) {
  if (!character) return null;
  const imgSrc = character.imageUrl?.trim() || PLACEHOLDER_IMG;
  return (
    <div
      className="guide-character-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-character-modal-title"
    >
      <div className="guide-character-modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="guide-character-modal-close"
          onClick={onClose}
          aria-label="Fermer"
        >
          <i className="fa-solid fa-xmark" />
        </button>
        <h3 id="guide-character-modal-title" className="guide-character-modal-title">
          {character.name}
        </h3>
        <div className="guide-character-modal-content">
          <div className="guide-character-modal-sprite">
            <img src={imgSrc} alt={character.name} />
          </div>
          <p className="guide-character-modal-desc">{character.description || "Aucune description."}</p>
        </div>
      </div>
    </div>
  );
}

function StepCard({ step, onCharacterClick }) {
  const parts = splitByHighlights(step.text, step.highlight);
  const imageSrc = step.imageUrl?.trim() || PLACEHOLDER_IMG;
  const characters = Array.isArray(step.characters) ? step.characters : [];

  return (
    <article className="guide-step" id={`guide-step-${step.num}`}>
      <div className="guide-step-header">
        <span className="guide-step-badge">Étape {step.num}</span>
        {characters.length > 0 && (
          <div className="guide-step-characters">
            {characters.map((c, i) => (
              <CharacterBubble key={`${c.name}-${i}`} character={c} onClick={onCharacterClick} />
            ))}
          </div>
        )}
      </div>
      <div className="guide-step-body">
        <p className="guide-step-text">
          {Array.isArray(parts)
            ? parts.map((p, i) =>
                p.type === "highlight" ? (
                  <strong key={i} className="guide-step-highlight">
                    {p.value}
                  </strong>
                ) : (
                  <span key={i}>{p.value}</span>
                )
              )
            : step.text}
        </p>
        <div className="guide-step-image-wrap">
          <img
            src={imageSrc}
            alt={`Carte — Étape ${step.num}`}
            className="guide-step-image"
            loading="lazy"
            onError={(e) => (e.target.src = PLACEHOLDER_IMG)}
          />
        </div>
      </div>
    </article>
  );
}

const EMPTY_GUIDE = { title: "", subtitle: "", disclaimer: "", background: null, steps: [] };

export default function GuidePage() {
  const [guideData, setGuideData] = useState(EMPTY_GUIDE);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadError(false);
    fetch(`${API_BASE}/guide?t=${Date.now()}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.success && data.guide) {
          setGuideData({
            title: data.guide.title || "",
            subtitle: data.guide.subtitle || "",
            disclaimer: data.guide.disclaimer || "",
            background: data.guide.background || null,
            steps: Array.isArray(data.guide.steps) ? data.guide.steps : [],
          });
        } else {
          setLoadError(true);
        }
        setIsReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError(true);
        setIsReady(true);
      });
    return () => { cancelled = true; };
  }, []);

  const { title, subtitle, disclaimer, background, steps } = guideData;
  const stepList = Array.isArray(steps) ? steps : [];
  const hasBg = background && String(background).trim();

  if (!isReady) {
    return (
      <main className="page page-with-sidebar guide-page">
        <Sidebar />
        <div className="guide-wrap">
          <div className="lore-page-loading-spinner" style={{ padding: "4rem" }}>
            <i className="fa-solid fa-spinner fa-spin" aria-hidden />
            <span>Chargement...</span>
          </div>
        </div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="page page-with-sidebar guide-page">
        <Sidebar />
        <div className="guide-wrap">
          <div className="lore-page-unavailable">
            <p className="lore-page-unavailable-text">
              Le guide est temporairement indisponible. Réessayez plus tard.
            </p>
            <button type="button" className="lore-page-unavailable-retry" onClick={() => window.location.reload()}>
              <i className="fa-solid fa-rotate-right" aria-hidden />
              Réessayer
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={`page page-with-sidebar guide-page${hasBg ? " guide-page--has-bg" : ""}`}>
      {hasBg && (
        <>
          <div className="guide-page-bg" aria-hidden>
            <img src={hasBg ? background : ""} alt="" />
          </div>
          <div className="guide-page-overlay" aria-hidden />
        </>
      )}
      <Sidebar />

      <div className="guide-wrap">
        <header className="guide-hero">
          <div className="container guide-hero-content">
            <Link to="/" className="guide-back">
              <i className="fa-solid fa-arrow-left" /> Retour
            </Link>
            <div className="guide-title-block">
              <h1 className="guide-title">{title || "Guide"}</h1>
              {subtitle && <p className="guide-subtitle">{subtitle}</p>}
              {disclaimer && (
                <div className="guide-disclaimer">
                  <i className="fa-solid fa-triangle-exclamation" aria-hidden />
                  <span>{disclaimer}</span>
                </div>
              )}
            </div>
          </div>
        </header>

        <section className="guide-content container">
          <ol className="guide-steps">
            {stepList.map((step, i) => (
              <li key={`${step.num}-${i}`} className="guide-step-item">
                <StepCard step={step} onCharacterClick={setSelectedCharacter} />
              </li>
            ))}
          </ol>
          {selectedCharacter && (
            <CharacterModal
              character={selectedCharacter}
              onClose={() => setSelectedCharacter(null)}
            />
          )}
          {stepList.length === 0 && (
            <p className="guide-empty">
              <i className="fa-solid fa-book-open" /> Aucune étape pour le moment.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
