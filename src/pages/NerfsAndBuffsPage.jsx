import { useState, useMemo, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { createPortal } from "react-dom";
import Sidebar from "../components/Sidebar";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:3001/api`
    : `${window.location.origin}/api`;

const PLACEHOLDER_SPRITE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'%3E%3Crect fill='%23222' width='96' height='96' rx='12'/%3E%3Ctext x='48' y='56' fill='%23555' font-size='24' text-anchor='middle' font-family='sans-serif'%3E?%3C/text%3E%3C/svg%3E";

const SECTIONS = [
  { id: "nerfs", title: "Nerf", icon: "fa-arrow-down", accent: "nerf" },
  { id: "buffs", title: "Buff", icon: "fa-arrow-up", accent: "buff" },
  { id: "ajustements", title: "Ajustement", icon: "fa-arrows-left-right", accent: "ajustement" },
];

const FILTER_OPTIONS = [
  { id: "all", label: "Tout", icon: "fa-layer-group" },
  { id: "nerfs", label: "Nerf", icon: "fa-arrow-down" },
  { id: "buffs", label: "Buff", icon: "fa-arrow-up" },
  { id: "ajustements", label: "Ajustement", icon: "fa-arrows-left-right" },
];

/** Formate une date ISO (YYYY-MM-DD) en français */
function formatDateFR(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T12:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

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

export function NerfBuffModal({ entry, pokedexList = [], onClose }) {
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
  const sprite = entry.imageUrl || dexEntry?.imageUrl || PLACEHOLDER_SPRITE;
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
            const isNerf = changed && Number(toVal) < Number(fromVal);
            const isBuff = changed && Number(toVal) > Number(fromVal);
            const { icon, label } = statLabels[key] || {};
            return (
              <div
                key={key}
                className={`bst-modal-stat ${changed ? (isNerf ? "nerfbuff-stat-nerf" : "nerfbuff-stat-buff") : ""}`}
              >
                <span className="bst-modal-stat-label">
                  <i className={`fa-solid ${icon}`} aria-hidden /> {label}
                </span>
                <span className="nerfbuff-stat-values">
                  {changed ? (
                    <>
                      <span className="nerfbuff-stat-from">{fromVal}</span>
                      <span className="nerfbuff-arrow-inline"><i className="fa-solid fa-arrow-right" /></span>
                      <span className={`nerfbuff-stat-to ${isNerf ? "nerfbuff-stat-to--nerf" : ""} ${isBuff ? "nerfbuff-stat-to--buff" : ""}`}>
                        {toVal}
                      </span>
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

        {entry.talents && entry.talents.length > 0 && (() => {
          const filledTalents = entry.talents.filter((t) => t.from?.trim() || t.to?.trim());
          if (filledTalents.length === 0) return null;
          let normalCount = 0;
          return (
            <div className="bst-modal-talents-wrap">
              <div className="bst-modal-talents-label"><i className="fa-solid fa-star" aria-hidden /> Talents</div>
              <div className="bst-modal-talents-list">
                {filledTalents.map((t, i) => {
                  const isHidden = t.hidden !== undefined ? !!t.hidden : i === 2;
                  if (!isHidden) normalCount++;
                  const talentLabel = isHidden ? "Talent Caché" : `Talent ${normalCount}`;
                  return (
                    <div key={i} className="bst-modal-talent-slot nerfbuff-talent-slot">
                      <div className="bst-modal-talent-title" style={isHidden ? { color: "#fbbf24" } : undefined}>
                        {isHidden && <i className="fa-solid fa-sparkles" aria-hidden style={{ marginRight: "0.35rem" }} />}
                        {talentLabel}
                      </div>
                      {t.from !== t.to ? (
                        <div className="bst-modal-talent-name">
                          <i className="fa-solid fa-wand-magic-sparkles" aria-hidden />
                          <span className="nerfbuff-talent-from">{t.from}</span>
                          <span className="nerfbuff-arrow-inline"><i className="fa-solid fa-arrow-right" /></span>
                          <span className="nerfbuff-talent-to">{t.to}</span>
                        </div>
                      ) : (
                        <div className="bst-modal-talent-name"><i className="fa-solid fa-wand-magic-sparkles" aria-hidden /> {t.to}</div>
                      )}
                      {t.desc && t.desc.trim() && <div className="bst-modal-talent-desc">{t.desc}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {entry.movepool && (() => {
          const moves = Array.isArray(entry.movepool) 
            ? entry.movepool.filter((m) => (m.name || "").trim() || (m.desc || "").trim())
            : (entry.movepool.trim() ? [{ name: entry.movepool.trim(), desc: "" }] : []);
          if (moves.length === 0) return null;
          return (
            <div className="nerfbuff-movepool-wrap">
              <div className="bst-modal-talents-label" style={{ color: "#a855f7" }}><i className="fa-solid fa-book-open" aria-hidden /> Movepool</div>
              <div className="nerfbuff-movepool-list">
                {moves.map((move, i) => (
                  <div key={i} className="nerfbuff-movepool-item" style={{ marginTop: i > 0 ? "0.5rem" : 0, padding: "0.5rem 0.75rem", backgroundColor: "rgba(168,85,247,.08)", borderRadius: "8px", borderLeft: "3px solid #a855f7" }}>
                    <div className="nerfbuff-movepool-name" style={{ fontWeight: "600", color: "#c084fc" }}>{move.name}</div>
                    {move.desc && <p className="nerfbuff-movepool-desc" style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "rgba(255,255,255,.7)", lineHeight: 1.4 }}>{move.desc}</p>}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>
    </div>,
    document.body
  );
}

export function NerfBuffGrid({ id, title, icon, entries, pokedexList, onSelect, idPrefix = "" }) {
  const list = Array.isArray(pokedexList) ? pokedexList : [];
  const sectionDomId = idPrefix ? `${idPrefix}-${id}` : id;
  const rows = useMemo(() => {
    return (entries || []).map((entry) => {
      const dexEntry = findPokedexEntry(entry.name, list);
      const sprite = entry.imageUrl || dexEntry?.imageUrl || PLACEHOLDER_SPRITE;
      const types = parseTypeLabel(entry.typeTo);
      const total = totalFromStats(entry.stats);
      return { ...entry, sprite, types, total };
    });
  }, [entries, list]);

  return (
    <section id={`section-${sectionDomId}`} className="bst-section bst-section--grid nerfbuff-section" data-accent={id}>
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

const EMPTY_NERFS_BUFFS = {
  lastModified: null,
  nerfs: [],
  buffs: [],
  ajustements: [],
  background: null,
};

export default function NerfsAndBuffsPage() {
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [pokedexList, setPokedexList] = useState([]);
  const [filter, setFilter] = useState("all");
  const [dataSource, setDataSource] = useState(EMPTY_NERFS_BUFFS);
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadError(false);
    Promise.all([
      fetch(`${API_BASE}/nerfs-and-buffs?t=${Date.now()}`).then((r) => r.json()),
      fetch(`${API_BASE}/pokedex?t=${Date.now()}`).then((r) => r.json()),
    ]).then(([nbRes, pokedexRes]) => {
      if (cancelled) return;
      if (nbRes?.success && nbRes?.nerfsBuffs) {
        setDataSource({
          lastModified: nbRes.nerfsBuffs.lastModified ?? null,
          nerfs: Array.isArray(nbRes.nerfsBuffs.nerfs) ? nbRes.nerfsBuffs.nerfs : [],
          buffs: Array.isArray(nbRes.nerfsBuffs.buffs) ? nbRes.nerfsBuffs.buffs : [],
          ajustements: Array.isArray(nbRes.nerfsBuffs.ajustements) ? nbRes.nerfsBuffs.ajustements : [],
          background: nbRes.nerfsBuffs.background ?? null,
        });
      } else {
        setLoadError(true);
      }
      if (pokedexRes?.success && pokedexRes?.pokedex && Array.isArray(pokedexRes.pokedex.entries)) {
        setPokedexList(pokedexRes.pokedex.entries);
      }
      setIsReady(true);
    }).catch(() => {
      if (cancelled) return;
      setLoadError(true);
      setIsReady(true);
    });
    return () => { cancelled = true; };
  }, []);

  const totalCount = (dataSource.nerfs?.length || 0) + (dataSource.buffs?.length || 0) + (dataSource.ajustements?.length || 0);
  const sectionsToShow = filter === "all" ? SECTIONS : SECTIONS.filter((s) => s.id === filter);

  const scrollToSection = (sectionId) => {
    setFilter(sectionId);
    const el = document.getElementById(`section-${sectionId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const pageBackground = dataSource.background && String(dataSource.background).trim() ? dataSource.background.trim() : null;

  if (!isReady) {
    return (
      <div className="page bst-page nerfbuff-page">
        <Sidebar />
        <div className="bst-bg">
          <div className="bst-bg-grid" />
          <div className="lore-page-loading-spinner" style={{ padding: "4rem", position: "relative", zIndex: 1 }}>
            <i className="fa-solid fa-spinner fa-spin" aria-hidden />
            <span>Chargement...</span>
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="page bst-page nerfbuff-page">
        <Sidebar />
        <div className="bst-bg">
          <div className="bst-bg-grid" />
          <div className="lore-page-unavailable" style={{ position: "relative", zIndex: 1 }}>
            <p className="lore-page-unavailable-text">
              Les données Nerfs & Buffs sont temporairement indisponibles. Réessayez plus tard.
            </p>
            <button type="button" className="lore-page-unavailable-retry" onClick={() => window.location.reload()}>
              <i className="fa-solid fa-rotate-right" aria-hidden />
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`page bst-page nerfbuff-page${pageBackground ? " bst-page--has-bg" : ""}`}>
      {pageBackground && (
        <>
          <div className="page-bg-layer" aria-hidden>
            <img src={pageBackground} alt="" />
          </div>
          <div className="page-overlay-layer" aria-hidden />
        </>
      )}
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
            {dataSource.lastModified && (
              <p className="nerfbuff-last-update">
                <i className="fa-solid fa-clock-rotate-left" aria-hidden />
                Dernière mise à jour : {formatDateFR(dataSource.lastModified)}
              </p>
            )}
          </div>

          <section className="nerfbuff-toolbar container">
            <span className="nerfbuff-filter-label">
              <i className="fa-solid fa-filter" aria-hidden /> Aller à
            </span>
            <div className="nerfbuff-filter-pills" role="group" aria-label="Filtrer par catégorie">
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`nerfbuff-filter-pill ${filter === opt.id ? "active" : ""}`}
                  onClick={() => (opt.id === "all" ? setFilter("all") : scrollToSection(opt.id))}
                  aria-pressed={filter === opt.id}
                >
                  <i className={`fa-solid ${opt.icon}`} aria-hidden />
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </section>

          <div className="bst-content-wrap container">
            <p className="bst-count">
              <i className="fa-solid fa-list-check" aria-hidden />
              {totalCount} Pokémon concerné{totalCount !== 1 ? "s" : ""}
            </p>
            <div className={`nerfbuff-sections-wrap ${sectionsToShow.length === 1 ? "nerfbuff-sections-wrap--single" : ""}`}>
              {sectionsToShow.map((s) => (
                <NerfBuffGrid
                  key={s.id}
                  id={s.id}
                  title={s.title}
                  icon={s.icon}
                  entries={dataSource[s.id]}
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

export { SECTIONS as NERFBUFF_DISPLAY_SECTIONS };
