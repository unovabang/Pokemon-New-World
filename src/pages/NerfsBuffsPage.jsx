import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { createPortal } from "react-dom";
import Sidebar from "../components/Sidebar";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:3001/api`
    : `${window.location.origin}/api`;

const PLACEHOLDER_SPRITE = "data:image/svg+xml," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect fill="%23313538" width="96" height="96" rx="8"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%237ecdf2" font-size="10" font-family="sans-serif">?</text></svg>'
);

const COLUMNS = [
  { id: "nerfs", label: "Nerf", icon: "fa-arrow-down", iconColor: "#ef4444" },
  { id: "buffs", label: "Buff", icon: "fa-arrow-up", iconColor: "#22c55e" },
  { id: "ajustements", label: "Ajustement", icon: "fa-sliders", iconColor: "#8b5cf6" },
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
  const baseName = n.replace(/^mega\s*-?\s*/i, "").trim();
  e = entries.find((x) => normalizeName(x.name) === baseName);
  if (e) return e;
  e = entries.find(
    (x) =>
      n.includes(normalizeName(x.name)) || normalizeName(x.name).includes(n)
  );
  return e || null;
}

function EntryModal({ entry, kind, spriteUrl, onClose }) {
  const handleKeyDown = useCallback((e) => { if (e.key === "Escape") onClose(); }, [onClose]);
  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!entry) return null;
  const col = COLUMNS.find((c) => c.id === kind) || COLUMNS[0];
  const displaySprite = spriteUrl && spriteUrl.trim() ? spriteUrl.trim() : PLACEHOLDER_SPRITE;

  return createPortal(
    <div
      className="bst-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="nerfs-modal-title"
    >
      <div className="bst-modal nerfs-detail-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="bst-modal-close" onClick={onClose} aria-label="Fermer">
          <i className="fa-solid fa-xmark" />
        </button>
        <div className="bst-modal-sprite-wrap">
          <img
            src={displaySprite}
            alt=""
            className="bst-modal-sprite"
            onError={(e) => { e.target.src = PLACEHOLDER_SPRITE; }}
          />
        </div>
        <h2 id="nerfs-modal-title" className="bst-modal-name" style={{ color: col.iconColor }}>
          <i className={`fa-solid ${col.icon}`} aria-hidden style={{ marginRight: "0.35rem" }} /> {entry.name}
        </h2>
        <div className="bst-modal-talents-wrap">
          <div className="bst-modal-talents-label">
            <i className="fa-solid fa-file-lines" aria-hidden /> Détails
          </div>
          <div className="bst-modal-talents-list">
            <div className="bst-modal-talent-slot">
              {entry.description ? (
                <pre className="nerfs-modal-description">{entry.description}</pre>
              ) : (
                <p className="bst-modal-talent-desc">Aucun détail.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function Column({ column, entriesWithSprites, onSelect }) {
  return (
    <section className="bst-section bst-section--grid nerfs-section" data-kind={column.id}>
      <div className="bst-section-header" style={{ borderLeftColor: column.iconColor }}>
        <i className={`fa-solid ${column.icon} bst-section-icon`} aria-hidden style={{ color: column.iconColor }} />
        <h2 className="bst-section-title">{column.label}</h2>
        <span className="bst-section-count"><i className="fa-solid fa-paw" aria-hidden /> {entriesWithSprites.length} Pokémon</span>
      </div>
      <div className="bst-grid nerfs-grid-5">
        {entriesWithSprites.length === 0 ? (
          <p className="nerfs-column-empty">Aucun</p>
        ) : (
          entriesWithSprites.map((item, i) => (
            <button
              key={`${item.name}-${i}`}
              type="button"
              className="bst-card"
              onClick={() => onSelect(item.entry, column.id, item.spriteUrl)}
              title={item.entry.name}
            >
              <div className="bst-card-sprite-wrap">
                <img
                  src={item.spriteUrl}
                  alt=""
                  className="bst-card-sprite"
                  loading="lazy"
                  onError={(e) => { e.target.src = PLACEHOLDER_SPRITE; }}
                />
              </div>
              <span className="bst-card-name">{item.entry.name}</span>
            </button>
          ))
        )}
      </div>
    </section>
  );
}

export default function NerfsBuffsPage() {
  const [data, setData] = useState(null);
  const [pokedexList, setPokedexList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersionIndex, setSelectedVersionIndex] = useState(0);
  const [modalEntry, setModalEntry] = useState(null);
  const [modalKind, setModalKind] = useState(null);
  const [modalSpriteUrl, setModalSpriteUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`${API_BASE}/config/nerfs-buffs?t=${Date.now()}`).then((r) => r.json()),
      fetch(`${API_BASE}/pokedex?t=${Date.now()}`).then((r) => r.json()),
    ])
      .then(([configRes, pokedexRes]) => {
        if (cancelled) return;
        if (configRes?.success && configRes?.config) setData(configRes.config);
        if (pokedexRes?.success && Array.isArray(pokedexRes?.pokedex?.entries)) {
          setPokedexList(pokedexRes.pokedex.entries);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const versions = data?.versions || [];
  const selectedVersion = versions[selectedVersionIndex] ?? versions[0];
  const pageBackground = data?.background && String(data.background).trim() ? data.background.trim() : null;

  const resolveSprite = useCallback((entry) => {
    if (entry.imageUrl && String(entry.imageUrl).trim()) return String(entry.imageUrl).trim();
    const pokedexEntry = findPokedexEntry(entry.name, pokedexList);
    return (pokedexEntry?.imageUrl && pokedexEntry.imageUrl.trim()) ? pokedexEntry.imageUrl.trim() : PLACEHOLDER_SPRITE;
  }, [pokedexList]);

  const nerfsWithSprites = useMemo(() => {
    const list = selectedVersion?.nerfs || [];
    return list.map((entry) => ({ entry, spriteUrl: resolveSprite(entry) }));
  }, [selectedVersion?.nerfs, resolveSprite]);

  const buffsWithSprites = useMemo(() => {
    const list = selectedVersion?.buffs || [];
    return list.map((entry) => ({ entry, spriteUrl: resolveSprite(entry) }));
  }, [selectedVersion?.buffs, resolveSprite]);

  const ajustementsWithSprites = useMemo(() => {
    const list = selectedVersion?.ajustements || [];
    return list.map((entry) => ({ entry, spriteUrl: resolveSprite(entry) }));
  }, [selectedVersion?.ajustements, resolveSprite]);

  useEffect(() => {
    if (versions.length > 0 && selectedVersionIndex >= versions.length) setSelectedVersionIndex(0);
  }, [versions.length, selectedVersionIndex]);

  const openModal = (entry, kind, spriteUrl) => {
    setModalEntry(entry);
    setModalKind(kind);
    setModalSpriteUrl(spriteUrl || resolveSprite(entry));
  };

  return (
    <div className={`page bst-page nerfs-buffs-page${pageBackground ? " bst-page--has-bg" : ""}`}>
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
              <i className="fa-solid fa-history" aria-hidden />
              Historique des modifications d’équilibrage : nerfs, buffs et ajustements par version.
            </p>
          </div>
        </header>

        <div className="nerfs-buffs-inner container">
            <aside className="nerfs-sidebar">
              <h2 className="nerfs-sidebar-title">Historique</h2>
              <nav className="nerfs-sidebar-nav" aria-label="Versions Nerfs & Buffs">
                {versions.map((v, idx) => (
                  <button
                    key={v.version || idx}
                    type="button"
                    className={`nerfs-sidebar-item ${idx === selectedVersionIndex ? "nerfs-sidebar-item--selected" : ""}`}
                    onClick={() => setSelectedVersionIndex(idx)}
                  >
                    <span className="nerfs-sidebar-item-version">Version {v.version}</span>
                    {v.date && <span className="nerfs-sidebar-item-date">{v.date}</span>}
                  </button>
                ))}
              </nav>
            </aside>

            <div className="nerfs-content">
          {loading ? (
            <div className="nerfs-loading">
              <i className="fa-solid fa-spinner fa-spin" aria-hidden />
              <span>Chargement…</span>
            </div>
          ) : versions.length === 0 ? (
            <div className="nerfs-empty card">
              <i className="fa-solid fa-scale-balanced" aria-hidden />
              <p>Aucune version pour le moment.</p>
            </div>
          ) : selectedVersion ? (
            <>
              <div className="nerfs-version-header card">
                <h2>Version {selectedVersion.version}</h2>
                {selectedVersion.date && <span className="nerfs-version-date">{selectedVersion.date}</span>}
              </div>
              <div className="nerfs-columns">
                <Column column={COLUMNS[0]} entriesWithSprites={nerfsWithSprites} onSelect={openModal} />
                <Column column={COLUMNS[1]} entriesWithSprites={buffsWithSprites} onSelect={openModal} />
                <Column column={COLUMNS[2]} entriesWithSprites={ajustementsWithSprites} onSelect={openModal} />
              </div>
            </>
          ) : null}
            </div>
          </div>
      </main>

      {modalEntry && modalKind && (
        <EntryModal
          entry={modalEntry}
          kind={modalKind}
          spriteUrl={modalSpriteUrl}
          onClose={() => { setModalEntry(null); setModalKind(null); setModalSpriteUrl(null); }}
        />
      )}
    </div>
  );
}
