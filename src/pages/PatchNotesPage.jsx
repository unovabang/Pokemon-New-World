import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { useLanguage } from "../contexts/LanguageContext";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:3001/api`
    : `${window.location.origin}/api`;

export default function PatchNotesPage() {
  const { language } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/patchnotes/${language}?t=${Date.now()}`)
      .then((r) => r.json())
      .then((res) => {
        if (!cancelled && res?.success && res?.patchnotes) setData(res.patchnotes);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [language]);

  const versions = data?.versions || [];
  const selectedVersion = versions[selectedIndex] ?? versions[0];

  // Réinitialiser la sélection si l'index est hors limite (ex: après changement de langue)
  useEffect(() => {
    if (versions.length > 0 && selectedIndex >= versions.length) setSelectedIndex(0);
  }, [versions.length, selectedIndex]);

  return (
    <main className="page page-with-nav patchnotes-page">
      <Sidebar />
      <div className="container patchnotes-container patchnotes-container--with-sidebar">
        <aside className="patchnotes-sidebar">
          <h2 className="patchnotes-sidebar-title">Versions</h2>
          <nav className="patchnotes-sidebar-nav" aria-label="Anciennes notes de patch">
            {versions.map((v, idx) => (
              <button
                key={v.version || idx}
                type="button"
                className={`patchnotes-sidebar-item ${idx === selectedIndex ? 'patchnotes-sidebar-item--selected' : ''}`}
                onClick={() => setSelectedIndex(idx)}
              >
                <span className="patchnotes-sidebar-item-version">Version {v.version}</span>
                {v.date && <span className="patchnotes-sidebar-item-date">{v.date}</span>}
              </button>
            ))}
          </nav>
        </aside>
        <div className="patchnotes-main">
          <header className="patchnotes-header">
            <h1 className="patchnotes-title">
              <i className="fa-solid fa-file-lines" aria-hidden />
              Notes de patch
            </h1>
            <p className="patchnotes-desc">
              Historique des mises à jour du jeu.
            </p>
          </header>

          {loading ? (
            <div className="patchnotes-loading">
              <i className="fa-solid fa-spinner fa-spin" aria-hidden />
              <span>Chargement…</span>
            </div>
          ) : versions.length === 0 ? (
            <div className="patchnotes-empty card">
              <i className="fa-solid fa-file-lines" aria-hidden />
              <p>Aucune note de patch pour le moment.</p>
            </div>
          ) : selectedVersion ? (
            <section className="patchnotes-version card patchnotes-version--single">
              <div className="patchnotes-version-header">
                <h2>Version {selectedVersion.version}</h2>
                {selectedVersion.date && <span className="patchnotes-version-date">{selectedVersion.date}</span>}
              </div>
              {selectedVersion.image && (
                <div className="patchnotes-version-image-wrap">
                  <img src={selectedVersion.image} alt={`Patch ${selectedVersion.version}`} className="patchnotes-version-image" />
                </div>
              )}
              <div className="patchnotes-version-sections">
                {(selectedVersion.sections || []).map((section, i) => (
                  <div key={i} className="patchnotes-section">
                    <h3>{section.title}</h3>
                    {section.image && (
                      <div className="patchnotes-section-image-wrap">
                        <img src={section.image} alt="" className="patchnotes-section-image" />
                      </div>
                    )}
                    <ul>
                      {(section.items || []).map((item, j) => (
                        <li key={j}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}
