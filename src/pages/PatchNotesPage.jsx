import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import LanguageSelector from "../components/LanguageSelector";
import PatchSectionHeading from "../components/PatchSectionHeading";
import PatchNoteListItem from "../components/PatchNoteListItem";
import { useLanguage } from "../contexts/LanguageContext";
import { usePokedexSpriteLookup } from "../hooks/usePokedexSpriteLookup";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : `${window.location.origin}/api`;

export default function PatchNotesPage() {
  const { language, t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const pokedexLookup = usePokedexSpriteLookup(true);

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
  const pageBackground = data?.background && String(data.background).trim() ? data.background.trim() : null;

  // Réinitialiser la sélection si l'index est hors limite (ex: après changement de langue)
  useEffect(() => {
    if (versions.length > 0 && selectedIndex >= versions.length) setSelectedIndex(0);
  }, [versions.length, selectedIndex]);

  return (
    <main className="page page-with-nav patchnotes-page">
      {pageBackground && (
        <>
          <div className="page-bg-layer" aria-hidden>
            <img key={pageBackground} src={pageBackground} alt="" decoding="async" />
          </div>
          <div className="page-overlay-layer" aria-hidden />
        </>
      )}
      <Sidebar />
      <div className="container patchnotes-container patchnotes-container--with-sidebar">
        <aside className="patchnotes-sidebar">
          <div className="patchnotes-sidebar-header">
            <h2 className="patchnotes-sidebar-title">{t('patchNotesPage.versions')}</h2>
            <LanguageSelector className="patchnotes-lang-selector" />
          </div>
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
              <span className="patchnotes-title-icon" aria-hidden>
                <i className="fa-solid fa-scroll" />
              </span>
              <span className="patchnotes-title-text">{t("patchNotesPage.title")}</span>
            </h1>
            <p className="patchnotes-desc">{t("patchNotesPage.description")}</p>
          </header>

          {loading ? (
            <div className="patchnotes-loading">
              <i className="fa-solid fa-spinner fa-spin" aria-hidden />
              <span>{t('patchNotesPage.loading')}</span>
            </div>
          ) : versions.length === 0 ? (
            <div className="patchnotes-empty card">
              <i className="fa-solid fa-file-lines" aria-hidden />
              <p>{t('patchNotesPage.empty')}</p>
            </div>
          ) : selectedVersion ? (
            <section className="patchnotes-version card patchnotes-version--single">
              <div className="patchnotes-version-header">
                <h2 className="patchnotes-version-heading">Version {selectedVersion.version}</h2>
                {selectedVersion.date ? (
                  <span className="patchnotes-version-date-badge">{selectedVersion.date}</span>
                ) : null}
              </div>
              {selectedVersion.image && (
                <div className="patchnotes-version-image-wrap">
                  <img
                    key={selectedVersion.image}
                    src={selectedVersion.image}
                    alt={`Patch ${selectedVersion.version}`}
                    className="patchnotes-version-image"
                    decoding="async"
                  />
                </div>
              )}
              <div className="patchnotes-version-sections">
                {(selectedVersion.sections || []).map((section, i) => (
                  <div key={i} className="patchnotes-section">
                    <PatchSectionHeading
                      section={section}
                      as="h3"
                      className="patchnotes-section-title"
                      innerClassName="patchnotes-section-title-inner"
                    />
                    {section.image && (
                      <div className="patchnotes-section-image-wrap">
                        <img
                          key={section.image}
                          src={section.image}
                          alt={section.title || "Section patch notes"}
                          className="patchnotes-section-image"
                          decoding="async"
                        />
                      </div>
                    )}
                    <ul>
                      {(section.items || []).map((item, j) => (
                        <PatchNoteListItem key={j} item={item} lang={language} pokedexLookup={pokedexLookup} />
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
