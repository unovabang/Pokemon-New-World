import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import guideData from "../config/guide.json";

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
            {stepList.map((step) => (
              <li key={step.num} className="guide-step-item">
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
