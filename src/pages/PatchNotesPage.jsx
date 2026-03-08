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

  return (
    <main className="page page-with-nav patchnotes-page">
      <Sidebar />
      <div className="container patchnotes-container">
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
        ) : (
          <div className="patchnotes-list">
            {versions.map((v, idx) => (
              <section key={v.version || idx} className="patchnotes-version card">
                <div className="patchnotes-version-header">
                  <h2>Version {v.version}</h2>
                  {v.date && <span className="patchnotes-version-date">{v.date}</span>}
                </div>
                {v.image && (
                  <div className="patchnotes-version-image-wrap">
                    <img src={v.image} alt={`Patch ${v.version}`} className="patchnotes-version-image" />
                  </div>
                )}
                <div className="patchnotes-version-sections">
                  {(v.sections || []).map((section, i) => (
                    <div key={i} className="patchnotes-section">
                      <h3>{section.title}</h3>
                      <ul>
                        {(section.items || []).map((item, j) => (
                          <li key={j}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
