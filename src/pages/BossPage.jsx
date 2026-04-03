import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:3001/api`
    : `${window.location.origin}/api`;

const TYPE_COLORS = {
  plante: { bg: "rgba(126,200,80,.35)", border: "rgba(126,200,80,.6)", text: "#a6e88a" },
  feu: { bg: "rgba(240,128,48,.35)", border: "rgba(240,128,48,.6)", text: "#f5a962" },
  eau: { bg: "rgba(104,144,240,.35)", border: "rgba(104,144,240,.6)", text: "#7eb8f2" },
  glace: { bg: "rgba(126,206,206,.35)", border: "rgba(126,206,206,.6)", text: "#98d8d8" },
  malice: { bg: "rgba(112,88,152,.35)", border: "rgba(112,88,152,.6)", text: "#b8a8d8" },
  poison: { bg: "rgba(160,64,160,.35)", border: "rgba(160,64,160,.6)", text: "#c183c1" },
  vol: { bg: "rgba(168,144,240,.35)", border: "rgba(168,144,240,.6)", text: "#c6b7f5" },
  dragon: { bg: "rgba(112,56,248,.35)", border: "rgba(112,56,248,.6)", text: "#a78bfa" },
  sol: { bg: "rgba(224,192,104,.35)", border: "rgba(224,192,104,.6)", text: "#e8d68c" },
  combat: { bg: "rgba(192,48,40,.35)", border: "rgba(192,48,40,.6)", text: "#f07878" },
  spectre: { bg: "rgba(112,88,152,.35)", border: "rgba(112,88,152,.6)", text: "#a890f0" },
  psy: { bg: "rgba(248,88,136,.35)", border: "rgba(248,88,136,.6)", text: "#f8a8c8" },
  electr: { bg: "rgba(248,208,48,.35)", border: "rgba(248,208,48,.6)", text: "#f8d030" },
  fee: { bg: "rgba(238,153,172,.35)", border: "rgba(238,153,172,.6)", text: "#f0b0c0" },
  tenebres: { bg: "rgba(112,88,72,.35)", border: "rgba(112,88,72,.6)", text: "#a09080" },
  roche: { bg: "rgba(184,160,56,.35)", border: "rgba(184,160,56,.6)", text: "#d8c878" },
  acier: { bg: "rgba(168,168,192,.35)", border: "rgba(168,168,192,.6)", text: "#c0c0e0" },
  normal: { bg: "rgba(168,168,120,.25)", border: "rgba(168,168,120,.5)", text: "#c6c6a7" },
  insecte: { bg: "rgba(168,184,32,.35)", border: "rgba(168,184,32,.6)", text: "#c6d16e" },
  aspic: { bg: "rgba(160,128,96,.35)", border: "rgba(160,128,96,.6)", text: "#d4b896" },
};

const TYPE_LABELS = {
  acier: "Acier", aspic: "Aspic", combat: "Combat", dragon: "Dragon", eau: "Eau",
  electr: "Electrik", fee: "Fee", feu: "Feu", glace: "Glace", insecte: "Insecte",
  malice: "Malice", normal: "Normal", plante: "Plante", poison: "Poison",
  psy: "Psy", roche: "Roche", sol: "Sol", spectre: "Spectre", tenebres: "Tenebres", vol: "Vol",
};

function getTypeStyle(type) {
  const key = (type || "").toLowerCase().trim();
  const s = TYPE_COLORS[key] || { bg: "rgba(255,255,255,.1)", border: "rgba(255,255,255,.25)", text: "var(--text)" };
  return { background: s.bg, border: `1px solid ${s.border}`, color: s.text };
}

function getTypeLabel(key) {
  const k = (key || "").toLowerCase().trim();
  return TYPE_LABELS[k] || (k.charAt(0).toUpperCase() + k.slice(1));
}

const EV_LABELS = { hp: "PV", atk: "Atk", def: "Déf", spa: "Atk Spé", spd: "Déf Spé", spe: "Vit" };

function PokemonCard({ pokemon }) {
  const evs = pokemon.evs;
  const hasEvs = evs && Object.values(evs).some((v) => v > 0);
  return (
    <div className="boss-pokemon">
      <div className="boss-pokemon-header">
        <div className="boss-pokemon-sprite">
          {pokemon.imageUrl ? (
            <img src={pokemon.imageUrl} alt="" onError={(e) => { e.target.style.display = "none"; }} />
          ) : (
            <i className="fa-solid fa-question" />
          )}
        </div>
        <div className="boss-pokemon-info">
          <span className="boss-pokemon-name">{pokemon.name}</span>
          <span className="boss-pokemon-level">Nv. {pokemon.level}</span>
        </div>
      </div>
      <div className="boss-pokemon-types">
        {(pokemon.types || []).map((t) => (
          <span key={t} className="boss-type-pill" style={getTypeStyle(t)}>{getTypeLabel(t)}</span>
        ))}
      </div>
      {pokemon.ability && (
        <div className="boss-pokemon-ability">
          <i className="fa-solid fa-star" aria-hidden /> {pokemon.ability}
        </div>
      )}
      {pokemon.moves && pokemon.moves.length > 0 && (
        <ul className="boss-pokemon-moves">
          {pokemon.moves.map((m, i) => (
            <li key={i}>{m}</li>
          ))}
        </ul>
      )}
      {hasEvs && (
        <div className="boss-pokemon-overlay">
          <div className="boss-pokemon-overlay-title"><i className="fa-solid fa-chart-bar" aria-hidden /> EVs</div>
          <div className="boss-pokemon-evs">
            {Object.entries(EV_LABELS).map(([key, label]) => {
              const val = evs[key] || 0;
              return (
                <div key={key} className="boss-pokemon-ev">
                  <span className="boss-pokemon-ev-label">{label}</span>
                  <div className="boss-pokemon-ev-bar">
                    <div className="boss-pokemon-ev-fill" style={{ width: `${Math.min(val / 252 * 100, 100)}%` }} />
                  </div>
                  <span className="boss-pokemon-ev-val">{val}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const DIFFICULTY_LEVELS = { facile: 25, moyen: 50, difficile: 75, extreme: 100 };
const DIFFICULTY_LABELS = { facile: "Facile", moyen: "Moyen", difficile: "Difficile", extreme: "Extrême" };

function DifficultyBar({ level }) {
  const pct = DIFFICULTY_LEVELS[(level || "").toLowerCase()] || 0;
  const label = DIFFICULTY_LABELS[(level || "").toLowerCase()] || level;
  if (!pct) return null;
  return (
    <div className="boss-difficulty">
      <span className="boss-difficulty-label">{label}</span>
      <div className="boss-difficulty-track">
        <div className="boss-difficulty-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function BossCard({ boss }) {
  const [teamOpen, setTeamOpen] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);
  const hasTips = boss.tips && boss.tips.length > 0;
  const diffClass = boss.difficulty ? ` boss-card--${boss.difficulty.toLowerCase()}` : "";
  return (
    <article className={`boss-card${diffClass}`}>
      <div className="boss-card-layout">
        <div className="boss-card-main">
          <div className="boss-card-trainer">
            <div className="boss-card-artwork">
              {boss.artworkUrl ? (
                <img src={boss.artworkUrl} alt={boss.name} />
              ) : (
                <div className="boss-card-artwork-placeholder">
                  <i className="fa-solid fa-user-shield" />
                </div>
              )}
            </div>
            <div className="boss-card-identity">
              <span className="boss-card-class">{boss.class}</span>
              <h2 className="boss-card-name">{boss.name}</h2>
              {boss.difficulty && <DifficultyBar level={boss.difficulty} />}
              {boss.description && <p className="boss-card-description">{boss.description}</p>}
              {boss.reward && (
                <div className="boss-card-reward">
                  <i className="fa-solid fa-coins" aria-hidden /> {boss.reward}
                </div>
              )}
            </div>
          </div>

          <div className="boss-card-sections">
            <div className="boss-card-section">
              <button
                type="button"
                className={`boss-card-section-toggle${teamOpen ? " boss-card-section-toggle--open" : ""}`}
                onClick={() => setTeamOpen((o) => !o)}
              >
                <span><i className="fa-solid fa-users" aria-hidden /> Voir l'equipe ({boss.team?.length || 0})</span>
                <i className={`fa-solid fa-chevron-${teamOpen ? "up" : "down"}`} />
              </button>
              {teamOpen && (
                <div className="boss-card-team-grid">
                  {(boss.team || []).map((p, i) => (
                    <PokemonCard key={`${p.name}-${i}`} pokemon={p} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {hasTips && (
          <aside className="boss-card-sidebar">
            <button
              type="button"
              className={`boss-sidebar-toggle${tipsOpen ? " boss-sidebar-toggle--open" : ""}`}
              onClick={() => setTipsOpen((o) => !o)}
            >
              <span className="boss-sidebar-toggle-icon"><i className="fa-solid fa-lightbulb" /></span>
              <span>Astuces</span>
              <i className={`fa-solid fa-chevron-${tipsOpen ? "up" : "down"} boss-sidebar-chevron`} />
            </button>
            {tipsOpen && (
              <div className="boss-sidebar-content">
                {boss.tips.map((tip, i) => (
                  <div key={i} className="boss-sidebar-tip">
                    <span className="boss-sidebar-tip-num">{i + 1}</span>
                    <p className="boss-sidebar-tip-text">{tip}</p>
                  </div>
                ))}
              </div>
            )}
          </aside>
        )}
      </div>
    </article>
  );
}

export default function BossPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/boss?t=${Date.now()}`)
      .then((r) => r.json())
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.boss) {
          setData(res.boss);
        } else {
          setError(true);
        }
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <main className="page page-with-sidebar boss-page">
        <Sidebar />
        <div className="boss-wrap">
          <div className="lore-page-loading-spinner" style={{ padding: "4rem" }}>
            <i className="fa-solid fa-spinner fa-spin" aria-hidden />
            <span>Chargement...</span>
          </div>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="page page-with-sidebar boss-page">
        <Sidebar />
        <div className="boss-wrap">
          <div style={{ padding: "3rem", textAlign: "center" }}>
            <p style={{ color: "var(--muted)" }}>Les boss sont temporairement indisponibles.</p>
            <button type="button" onClick={() => window.location.reload()} className="boss-retry-btn">Reessayer</button>
          </div>
        </div>
      </main>
    );
  }

  const bosses = data.bosses || [];
  const hasBg = data.background && String(data.background).trim();

  return (
    <main className={`page page-with-sidebar boss-page${hasBg ? " boss-page--has-bg" : ""}`}>
      {hasBg && (
        <>
          <div className="boss-page-bg" aria-hidden><img src={data.background} alt="" /></div>
          <div className="boss-page-overlay" aria-hidden />
        </>
      )}
      <Sidebar />
      <div className="boss-wrap">
        <header className="boss-hero">
          <div className="container boss-hero-content">
            <Link to="/guide" className="boss-back">
              <i className="fa-solid fa-arrow-left" /> Retour au Guide
            </Link>
            <div className="boss-title-block">
              <h1 className="boss-title">
                <i className="fa-solid fa-crown" aria-hidden /> {data.title || "Boss du jeu"}
              </h1>
              {data.subtitle && <p className="boss-subtitle">{data.subtitle}</p>}
            </div>
          </div>
        </header>

        <div className="boss-spoiler-warning">
          <i className="fa-solid fa-triangle-exclamation" aria-hidden />
          <span>Attention, risque de spoil !</span>
        </div>

        <section className="boss-content container">
          {bosses.length === 0 ? (
            <p className="boss-empty">
              <i className="fa-solid fa-shield-halved" /> Aucun boss pour le moment.
            </p>
          ) : (
            <div className="boss-list">
              {bosses.map((boss, i) => (
                <BossCard key={`${boss.name}-${i}`} boss={boss} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
