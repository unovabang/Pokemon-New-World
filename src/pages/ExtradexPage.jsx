import { useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import extradexData from "../config/extradex.json";
import extradexBgImg from "../assets/extradex-background.jpg";

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
  electr: "Électrik", fee: "Fée", feu: "Feu", glace: "Glace", insecte: "Insecte",
  malice: "Malice", normal: "Normal", plante: "Plante", poison: "Poison",
  psy: "Psy", roche: "Roche", sol: "Sol", spectre: "Spectre", tenebres: "Ténèbres", vol: "Vol",
};

function getTypeLabel(key) {
  const k = (key || "").toLowerCase().trim();
  return TYPE_LABELS[k] || (k.charAt(0).toUpperCase() + k.slice(1));
}

const defaultTypeStyle = { bg: "rgba(255,255,255,.1)", border: "rgba(255,255,255,.25)", text: "var(--text)" };

function getTypeStyle(type) {
  const key = (type || "").toLowerCase().trim();
  const s = TYPE_COLORS[key] || defaultTypeStyle;
  return {
    background: s.bg,
    border: `1px solid ${s.border}`,
    color: s.text,
  };
}

export default function ExtradexPage() {
  const entries = Array.isArray(extradexData.entries) ? extradexData.entries : [];
  const [selected, setSelected] = useState(entries[0] || null);

  return (
    <main className="page page-with-sidebar extradex-page">
      <div className="extradex-page-bg" aria-hidden>
        <img src={extradexBgImg} alt="" />
      </div>
      <div className="extradex-page-overlay" aria-hidden />
      <Sidebar />

      <div className="extradex-wrap">
        <header className="extradex-hero">
          <div className="container extradex-hero-content">
            <Link to="/pokedex" className="extradex-back">
              <i className="fa-solid fa-arrow-left" /> Retour au Pokédex
            </Link>
            <div className="extradex-hero-inner">
              <h1 className="extradex-title">EXTRADEX</h1>
              <p className="extradex-subtitle">
                VUS : {entries.length} — PRIS : {entries.length}
              </p>
            </div>
          </div>
        </header>

        <section className="extradex-main container">
          <div className="extradex-layout">
            <div className="extradex-detail">
              {selected ? (
                <>
                  <div className="extradex-detail-sprite">
                    <img src={selected.imageUrl} alt={selected.name} />
                  </div>
                  <div className="extradex-info">
                    <h2 className="extradex-info-title">&lt; INFO &gt;</h2>
                    <button type="button" className="extradex-info-btn" onClick={() => {}}>
                      {selected.name.toUpperCase()}
                    </button>
                    <p className="extradex-obtention">{selected.obtention}</p>
                    <div className="extradex-types">
                      {(Array.isArray(selected.types) ? selected.types : [selected.types]).filter(Boolean).map((t) => (
                        <span key={t} className="extradex-type-pill" style={getTypeStyle(t)}>
                          {getTypeLabel(t)}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <p className="extradex-empty">Sélectionnez une créature.</p>
              )}
            </div>

            <div className="extradex-list-wrap">
              <ul className="extradex-list" role="list">
                {entries.map((e) => (
                  <li key={`${e.num}-${e.name}`}>
                    <button
                      type="button"
                      className={`extradex-list-item ${selected?.num === e.num && selected?.name === e.name ? "active" : ""}`}
                      onClick={() => setSelected(e)}
                    >
                      <img src={e.imageUrl} alt="" className="extradex-list-sprite" />
                      <span className="extradex-list-num">#{String(e.num).padStart(3, "0")}</span>
                      <span className="extradex-list-name">{e.name}</span>
                      <i className="fa-solid fa-pokeball extradex-list-ball" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
