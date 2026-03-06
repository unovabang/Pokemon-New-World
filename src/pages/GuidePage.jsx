import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import guideDataFallback from "../config/guide.json";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:3001/api`
    : `${window.location.origin}/api`;

const STORAGE_GUIDE = "admin_guide_data";

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

function StepCard({ step }) {
  const parts = splitByHighlights(step.text, step.highlight);

  return (
    <article className="guide-step card" id={`guide-step-${step.num}`}>
      <div className="guide-step-header">
        <span className="guide-step-badge">Étape {step.num}</span>
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
        {step.imageUrl && step.imageUrl.trim() && (
          <div className="guide-step-image-wrap">
            <img
              src={step.imageUrl}
              alt={`Illustration étape ${step.num}`}
              className="guide-step-image"
              loading="lazy"
            />
          </div>
        )}
      </div>
    </article>
  );
}

export default function GuidePage() {
  const [guideData, setGuideData] = useState(guideDataFallback);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/guide?t=${Date.now()}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.success && data.guide) {
          setGuideData({
            title: data.guide.title || guideDataFallback.title,
            subtitle: data.guide.subtitle || "",
            disclaimer: data.guide.disclaimer || "",
            steps: Array.isArray(data.guide.steps) ? data.guide.steps : [],
          });
          return;
        }
        const stored = localStorage.getItem(STORAGE_GUIDE);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            setGuideData(parsed);
          } catch {}
        }
      })
      .catch(() => {
        if (cancelled) return;
        const stored = localStorage.getItem(STORAGE_GUIDE);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            setGuideData(parsed);
          } catch {}
        }
      });
    return () => { cancelled = true; };
  }, []);

  const { title, subtitle, disclaimer, steps } = guideData;
  const stepList = Array.isArray(steps) ? steps : [];

  return (
    <main className="page page-with-sidebar guide-page">
      <div className="guide-page-bg" aria-hidden />
      <div className="guide-page-overlay" aria-hidden />
      <Sidebar />

      <div className="guide-wrap">
        <header className="guide-hero">
          <div className="container guide-hero-content">
            <Link to="/" className="guide-back">
              <i className="fa-solid fa-arrow-left" /> Retour
            </Link>
            <div className="guide-title-block">
              <h1 className="guide-title">{title}</h1>
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
                <StepCard step={step} />
              </li>
            ))}
          </ol>
          {stepList.length === 0 && (
            <p className="guide-empty">
              <i className="fa-solid fa-book-open" /> Aucune étape pour le moment.
              Ajoutez du contenu dans <code>src/config/guide.json</code>.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
