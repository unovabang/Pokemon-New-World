import { useState, useMemo, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { createPortal } from "react-dom";
import Sidebar from "../components/Sidebar";
import nerfsBuffsData from "../config/nerfs-and-buffs.json";
import pokedexData from "../config/pokedex.json";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:3001/api`
    : `${window.location.origin}/api`;

const PLACEHOLDER_SPRITE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'%3E%3Crect fill='%23222' width='96' height='96' rx='12'/%3E%3Ctext x='48' y='56' fill='%23555' font-size='24' text-anchor='middle' font-family='sans-serif'%3E?%3C/text%3E%3C/svg%3E";

const SECTIONS = [
  { id: "nerfs", title: "Nerf", icon: "fa-arrow-down", accent: "tenebres" },
  { id: "buffs", title: "Buff", icon: "fa-arrow-up", accent: "plante" },
  { id: "ajustements", title: "Ajustement", icon: "fa-arrows-left-right", accent: "acier" },
];

function normalizeName(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function findPokedexEntry(name, entries) {
  if (!name || !entries?.length) return null;
  const n = normalizeName(name);
  let e = entries.find((x) => normalizeName(x.name) === n);
  if (e) return e;
  const nAlt = n.replace(/\s+/g, "-");
  e = entries.find(
    (x) =>
      normalizeName(x.name) === nAlt ||
      normalizeName(x.name).replace(/\s+/g, "-") === n
  );
  if (e) return e;
  e = entries.find(
    (x) =>
      n.includes(normalizeName(x.name)) || normalizeName(x.name).includes(n)
  );
  return e || null;
}

/** Parse "Glace/Malice" or "Dragon/Vol" into array of labels */
function parseTypeLabel(str) {
  if (!str || typeof str !== "string") return [];
  return str.split(/[/\s]+/).map((t) => t.trim()).filter(Boolean);
}

const TYPE_COLORS = {
  plante: "#7ec850", feu: "#f08030", eau: "#6890f0", glace: "#98d8d8",
  malice: "#705898", poison: "#a040a0", vol: "#a890f0", dragon: "#7038f8",
  sol: "#e0c068", combat: "#c03028", spectre: "#705898", psy: "#f85888",
  electrik: "#f8d030", electr: "#f8d030", fee: "#ee99ac", tenebres: "#705848",
  roche: "#b8a038", acier: "#b8b8d0", normal: "#a8a878", insecte: "#a8b820",
  aspic: "#a08060", neant: "#5a5a8a",
};

const TYPE_LABELS = {
  plante: "Plante", feu: "Feu", eau: "Eau", glace: "Glace", malice: "Malice",
  poison: "Poison", vol: "Vol", dragon: "Dragon", sol: "Sol", combat: "Combat",
  spectre: "Spectre", psy: "Psy", electrik: "Électrik", electr: "Électrik",
  fee: "Fée", tenebres: "Ténèbres", roche: "Roche", acier: "Acier",
  normal: "Normal", insecte: "Insecte", aspic: "Aspic", neant: "Néant",
};

function getTypeKey(label) {
  return Object.entries(TYPE_LABELS).find(
    ([, v]) => (v || "").toLowerCase() === (label || "").toLowerCase()
  )?.[0] || (label || "").toLowerCase().replace(/[^a-z]/g, "") || "normal";
}

function TypeBadges({ types }) {
  if (!types?.length) return <span className="bst-type-empty">—</span>;
  return (
    <span className="bst-type-badges">
      {types.map((t) => {
        const key = getTypeKey(t);
        const color = TYPE_COLORS[key] || TYPE_COLORS.normal;
        return (
          <span
            key={t}
            className="bst-type-badge"
            style={{
              background: `linear-gradient(135deg, ${color}44, ${color}22)`,
              borderColor: color,
              color: color,
              boxShadow: `0 0 12px ${color}40`,
            }}
          >
            {t}
          </span>
        );
      })}
    </span>
  );
}

/** Calcule le total BST à partir des stats "to" (tableau [from, to]) */
function totalFromStats(stats) {
  if (!stats || typeof stats !== "object") return 0;
  return ["hp", "atk", "def", "spa", "spd", "spe"].reduce(
    (sum, key) => sum + (Array.isArray(stats[key]) ? (stats[key][1] ?? stats[key][0]) : 0),
    0
  );
}

function NerfBuffModal({ entry, pokedexList = [], onClose }) {
  const overlayRef = useRef(null);
  useEffect(() => {
    const fn = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", fn);
    overlayRef.current?.focus();
    return () => document.removeEventListener("keydown", fn);
  }, [onClose]);

  if (!entry) return null;
  const list = Array.isArray(pokedexList) ? pokedexList : [];
  const dexEntry = findPokedexEntry(entry.name, list);
  const sprite = dexEntry?.imageUrl || PLACEHOLDER_SPRITE;
  const typesDisplay = parseTypeLabel(entry.typeTo);
  const typeChanged = (entry.typeFrom || "") !== (entry.typeTo || "");
  const statKeys = ["hp", "atk", "def", "spa", "spd", "spe"];
  const statLabels = {
    hp: { icon: "fa-heart-pulse", label: "PV" },
    atk: { icon: "fa-hand-fist", label: "ATK" },
    def: { icon: "fa-shield", label: "DEF" },
    spa: { icon: "fa-wand-magic-sparkles", label: "ATK SPE" },
    spd: { icon: "fa-gem", label: "DEF SPE" },
    spe: { icon: "fa-gauge-high", label: "SPE" },
  };

  return createPortal(
    <div
      ref={overlayRef}
      className="bst-modal-overlay nerfbuff-modal-overlay"
      onClick={onClose}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="nerfbuff-modal-title"
    >
      <div className="bst-modal nerfbuff-modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="bst-modal-close"
          onClick={onClose}
          aria-label="Fermer"
        >
          <i className="fa-solid fa-xmark" />
        </button>
        <div className="bst-modal-sprite-wrap">
          <img
            src={sprite}
            alt=""
            className="bst-modal-sprite"
            onError={(e) => (e.target.src = PLACEHOLDER_SPRITE)}
          />
        </div>
        <h2 id="nerfbuff-modal-title" className="bst-modal-name">{entry.name}</h2>

        <div className="bst-modal-types">
          {typeChanged ? (
            <div className="nerfbuff-modal-type-change">
              <TypeBadges types={parseTypeLabel(entry.typeFrom)} />
              <span className="nerfbuff-arrow" aria-hidden><i className="fa-solid fa-arrow-right" /></span>
              <TypeBadges types={typesDisplay} />
            </div>
          ) : (
            <TypeBadges types={typesDisplay} />
          )}
        </div>

        <div className="bst-modal-stats nerfbuff-modal-stats">
          {statKeys.map((key) => {
            const arr = entry.stats?.[key];
            const fromVal = Array.isArray(arr) ? arr[0] : arr;
            const toVal = Array.isArray(arr) ? arr[1] : arr;
            const changed = fromVal !== toVal;
            const { icon, label } = statLabels[key] || {};
            return (
              <div key={key} className={`bst-modal-stat ${changed ? "nerfbuff-stat-changed" : ""}`}>
                <span className="bst-modal-stat-label">
                  <i className={`fa-solid ${icon}`} aria-hidden /> {label}
                </span>
                <span className="nerfbuff-stat-values">
                  {changed ? (
                    <>
                      <span className="nerfbuff-stat-from">{fromVal}</span>
                      <span className="nerfbuff-arrow-inline"><i className="fa-solid fa-arrow-right" /></span>
                      <span className="nerfbuff-stat-to">{toVal}</span>
                    </>
                  ) : (
                    <span>{toVal ?? fromVal}</span>
                  )}
                </span>
              </div>
            );
          })}
          <div className="bst-modal-stat bst-modal-stat-total">
            <span className="bst-modal-stat-label"><i className="fa-solid fa-calculator" aria-hidden /> Total</span>
            <span>{totalFromStats(entry.stats)}</span>
          </div>
        </div>

        {entry.talents && entry.talents.length > 0 && (
          <div className="bst-modal-talents-wrap">
            <div className="bst-modal-talents-label"><i className="fa-solid fa-star" aria-hidden /> Talents</div>
            <div className="bst-modal-talents-list">
              {entry.talents.map((t, i) => (
                <div key={i} className="bst-modal-talent-slot nerfbuff-talent-slot">
                  {t.from !== t.to ? (
                    <>
                      <div className="bst-modal-talent-name">
                        <i className="fa-solid fa-sparkles" aria-hidden />
                        <span className="nerfbuff-talent-from">{t.from}</span>
                        <span className="nerfbuff-arrow-inline"><i className="fa-solid fa-arrow-right" /></span>
                        <span className="nerfbuff-talent-to">{t.to}</span>
                      </div>
                    </>
                  ) : (
                    <div className="bst-modal-talent-name"><i className="fa-solid fa-sparkles" aria-hidden /> {t.to}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {entry.movepool && entry.movepool.trim() && (
          <div className="nerfbuff-movepool-wrap">
            <div className="bst-modal-talents-label"><i className="fa-solid fa-book-open" aria-hidden /> Movepool</div>
            <p className="nerfbuff-movepool-text">{entry.movepool}</p>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

function NerfBuffGrid({ id, title, icon, entries, pokedexList, onSelect }) {
  const list = Array.isArray(pokedexList) ? pokedexList : [];
  const rows = useMemo(() => {
    return (entries || []).map((entry) => {
      const dexEntry = findPokedexEntry(entry.name, list);
      const sprite = dexEntry?.imageUrl || PLACEHOLDER_SPRITE;
      const types = parseTypeLabel(entry.typeTo);
      const total = totalFromStats(entry.stats);
      return { ...entry, sprite, types, total };
    });
  }, [entries, list]);

  return (
    <section className="bst-section bst-section--grid" data-accent={id}>
      <div className="bst-section-header">
        <i className={`fa-solid ${icon} bst-section-icon`} aria-hidden />
        <h2 className="bst-section-title">{title}</h2>
        <span className="bst-section-count"><i className="fa-solid fa-paw" aria-hidden /> {rows.length} Pokémon</span>
      </div>
      <div className="bst-grid">
        {rows.map((row, i) => (
          <button
            key={`${row.name}-${i}`}
            type="button"
            className="bst-card"
            onClick={() => onSelect(row)}
          >
            <div className="bst-card-sprite-wrap">
              <img
                src={row.sprite}
                alt=""
                className="bst-card-sprite"
                loading="lazy"
                onError={(e) => (e.target.src = PLACEHOLDER_SPRITE)}
              />
            </div>
            <span className="bst-card-name">{row.name}</span>
            <div className="bst-card-types">
              <TypeBadges types={row.types} />
            </div>
            <span className="bst-card-total"><i className="fa-solid fa-calculator" aria-hidden /> {row.total}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function getPokedexEntriesFallback() {
  return pokedexData?.entries || [];
}

export default function NerfsAndBuffsPage() {
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [pokedexList, setPokedexList] = useState(() => getPokedexEntriesFallback());

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/pokedex?t=${Date.now()}`)
      .then((r) => r.json())
      .then((pokedexRes) => {
        if (cancelled) return;
        if (pokedexRes?.success && pokedexRes?.pokedex && Array.isArray(pokedexRes.pokedex.entries)) {
          setPokedexList(pokedexRes.pokedex.entries);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const data = nerfsBuffsData || { nerfs: [], buffs: [], ajustements: [] };
  const totalCount = (data.nerfs?.length || 0) + (data.buffs?.length || 0) + (data.ajustements?.length || 0);

  return (
    <div className="page bst-page nerfbuff-page">
      <Sidebar />
      <div className="bst-bg">
        <div className="bst-bg-grid" />
        <div className="bst-bg-glow bst-bg-glow-1" />
        <div className="bst-bg-glow bst-bg-glow-2" />
      </div>
      <main className="bst-main">
        <header className="bst-header">
          <Link to="/" className="bst-back">
            <i className="fa-solid fa-arrow-left" aria-hidden />
            Retour
          </Link>
          <div className="bst-title-block">
            <h1 className="bst-title">
              <i className="fa-solid fa-scale-balanced" aria-hidden />
              Nerfs and Buffs
            </h1>
            <p className="bst-subtitle">
              <i className="fa-solid fa-arrows-up-down-left-right" aria-hidden />
              Modifications des statistiques, types et talents
            </p>
          </div>

          <div className="bst-content-wrap container">
            <p className="bst-count">
              <i className="fa-solid fa-list-check" aria-hidden />
              {totalCount} Pokémon concerné{totalCount !== 1 ? "s" : ""}
            </p>
            <div className="bst-content">
              {SECTIONS.map((s) => (
                <NerfBuffGrid
                  key={s.id}
                  id={s.id}
                  title={s.title}
                  icon={s.icon}
                  entries={data[s.id]}
                  pokedexList={pokedexList}
                  onSelect={setSelectedEntry}
                />
              ))}
            </div>
          </div>
        </header>
      </main>

      {selectedEntry && (
        <NerfBuffModal
          entry={selectedEntry}
          pokedexList={pokedexList}
          onClose={() => setSelectedEntry(null)}
        />
      )}
    </div>
  );
}
