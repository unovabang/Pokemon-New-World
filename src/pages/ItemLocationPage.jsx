import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:3001/api`
    : `${window.location.origin}/api`;

/** Groupe les entrées par zone (ordre d'apparition conservé) */
function groupByZone(entries) {
  if (!Array.isArray(entries) || entries.length === 0) return [];
  const groups = [];
  let currentZone = null;
  let currentItems = [];
  for (const e of entries) {
    const zone = (e.zone || "").trim() || "—";
    if (zone !== currentZone) {
      if (currentZone !== null) groups.push({ zone: currentZone, items: currentItems });
      currentZone = zone;
      currentItems = [];
    }
    currentItems.push({
      item: (e.item || "").trim() || "—",
      obtention: (e.obtention || "").trim() || "—"
    });
  }
  if (currentZone !== null) groups.push({ zone: currentZone, items: currentItems });
  return groups;
}

export default function ItemLocationPage() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/config/item-location?t=${Date.now()}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.success && data?.config?.entries) {
          setGroups(groupByZone(data.config.entries));
        } else {
          setGroups([]);
        }
      })
      .catch(() => setGroups([]))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <main className="page page-with-nav item-location-page">
      <Sidebar />
      <div className="container item-location-container">
        <header className="item-location-header">
          <h1 className="item-location-title">
            <i className="fa-solid fa-location-dot" aria-hidden />
            Item Location
          </h1>
          <p className="item-location-desc">
            Où trouver les objets et comment les obtenir dans la région de Bélamie.
          </p>
        </header>

        {loading ? (
          <div className="item-location-loading">
            <i className="fa-solid fa-spinner fa-spin" aria-hidden />
            <span>Chargement…</span>
          </div>
        ) : groups.length === 0 ? (
          <div className="item-location-empty card">
            <i className="fa-solid fa-map-location-dot" aria-hidden />
            <p>Aucune donnée pour le moment.</p>
          </div>
        ) : (
          <div className="item-location-sections">
            {groups.map((g) => (
              <section key={g.zone} className="item-location-zone card">
                <h2 className="item-location-zone-title">{g.zone}</h2>
                <div className="item-location-table-wrap">
                  <table className="item-location-table">
                    <thead>
                      <tr>
                        <th>Objet</th>
                        <th>Obtention</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.items.map((row, i) => (
                        <tr key={`${g.zone}-${i}`}>
                          <td className="item-location-cell-item">{row.item}</td>
                          <td className="item-location-cell-obtention">{row.obtention}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
