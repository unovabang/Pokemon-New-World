import { useState, useEffect, useCallback } from "react";
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

function EntryModal({ entry, kind, onClose }) {
  const handleKeyDown = useCallback((e) => { if (e.key === "Escape") onClose(); }, [onClose]);
  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!entry) return null;
  const spriteUrl = (entry.imageUrl && entry.imageUrl.trim()) ? entry.imageUrl.trim() : PLACEHOLDER_SPRITE;
  const col = COLUMNS.find((c) => c.id === kind) || COLUMNS[0];

  return (
    <div
      className="nerfs-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nerfs-modal-title"
      onClick={onClose}
    >
      <div className="nerfs-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="nerfs-modal-close" onClick={onClose} aria-label="Fermer">
          <i className="fa-solid fa-xmark" />
        </button>
        <div className="nerfs-modal-header">
          <div className="nerfs-modal-sprite-wrap">
            <img src={spriteUrl} alt="" className="nerfs-modal-sprite" onError={(e) => { e.target.src = PLACEHOLDER_SPRITE; }} />
          </div>
          <h2 id="nerfs-modal-title" className="nerfs-modal-title" style={{ color: col.iconColor }}>
            <i className={`fa-solid ${col.icon}`} aria-hidden /> {entry.name}
          </h2>
        </div>
        <div className="nerfs-modal-body">
          {entry.description ? (
            <pre className="nerfs-modal-description">{entry.description}</pre>
          ) : (
            <p className="nerfs-modal-empty">Aucun détail.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Column({ column, entries, onSelect }) {
  return (
    <section className="nerfs-column" data-kind={column.id}>
      <h3 className="nerfs-column-title" style={{ borderColor: column.iconColor, color: column.iconColor }}>
        <i className={`fa-solid ${column.icon}`} aria-hidden />
        {column.label}
      </h3>
      <div className="nerfs-column-grid">
        {entries.length === 0 ? (
          <p className="nerfs-column-empty">Aucun</p>
        ) : (
          entries.map((entry, i) => (
            <button
              key={`${entry.name}-${i}`}
              type="button"
              className="nerfs-column-card"
              onClick={() => onSelect(entry, column.id)}
              title={entry.name}
            >
              <img
                src={(entry.imageUrl && entry.imageUrl.trim()) ? entry.imageUrl.trim() : PLACEHOLDER_SPRITE}
                alt=""
                className="nerfs-column-sprite"
                loading="lazy"
                onError={(e) => { e.target.src = PLACEHOLDER_SPRITE; }}
              />
              <span className="nerfs-column-name">{entry.name}</span>
            </button>
          ))
        )}
      </div>
    </section>
  );
}

export default function NerfsBuffsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedVersionIndex, setSelectedVersionIndex] = useState(0);
  const [modalEntry, setModalEntry] = useState(null);
  const [modalKind, setModalKind] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/config/nerfs-buffs?t=${Date.now()}`)
      .then((r) => r.json())
      .then((res) => {
        if (!cancelled && res?.success && res?.config) setData(res.config);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const versions = data?.versions || [];
  const selectedVersion = versions[selectedVersionIndex] ?? versions[0];
  const pageBackground = data?.background && String(data.background).trim() ? data.background.trim() : null;

  useEffect(() => {
    if (versions.length > 0 && selectedVersionIndex >= versions.length) setSelectedVersionIndex(0);
  }, [versions.length, selectedVersionIndex]);

  const nerfs = selectedVersion?.nerfs || [];
  const buffs = selectedVersion?.buffs || [];
  const ajustements = selectedVersion?.ajustements || [];

  return (
    <main className="page page-with-nav nerfs-buffs-page">
      {pageBackground && (
        <>
          <div className="page-bg-layer" aria-hidden>
            <img src={pageBackground} alt="" />
          </div>
          <div className="page-overlay-layer" aria-hidden />
        </>
      )}
      <Sidebar />
      <div className="container nerfs-buffs-container">
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

        <div className="nerfs-main">
          <header className="nerfs-header">
            <h1 className="nerfs-title">
              <i className="fa-solid fa-scale-balanced" aria-hidden />
              Nerfs and Buffs
            </h1>
            <p className="nerfs-desc">
              Historique des modifications d’équilibrage : nerfs, buffs et ajustements par version.
            </p>
          </header>

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
                <Column column={COLUMNS[0]} entries={nerfs} onSelect={(e, k) => { setModalEntry(e); setModalKind(k); }} />
                <Column column={COLUMNS[1]} entries={buffs} onSelect={(e, k) => { setModalEntry(e); setModalKind(k); }} />
                <Column column={COLUMNS[2]} entries={ajustements} onSelect={(e, k) => { setModalEntry(e); setModalKind(k); }} />
              </div>
            </>
          ) : null}
        </div>
      </div>

      {modalEntry && modalKind && (
        <EntryModal entry={modalEntry} kind={modalKind} onClose={() => { setModalEntry(null); setModalKind(null); }} />
      )}
    </main>
  );
}
