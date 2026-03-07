import { useState, useEffect, useMemo } from "react";
import Sidebar from "../components/Sidebar";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:3001/api`
    : `${window.location.origin}/api`;

/** Normalise une chaîne pour la recherche (accents, minuscules) */
function normalizeSearch(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

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
  const [searchQuery, setSearchQuery] = useState("");
  const [filterZone, setFilterZone] = useState("");

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

  const zoneOptions = useMemo(() => {
    const zones = [...new Set(groups.map((g) => g.zone))].sort((a, b) => a.localeCompare(b));
    return zones;
  }, [groups]);

  const filteredGroups = useMemo(() => {
    const q = normalizeSearch(searchQuery);
    const byZone = filterZone
      ? groups.filter((g) => g.zone === filterZone)
      : groups;
    if (!q) return byZone;
    return byZone
      .map((g) => ({
        zone: g.zone,
        items: g.items.filter(
          (row) =>
            normalizeSearch(row.item).includes(q) ||
            normalizeSearch(row.obtention).includes(q) ||
            normalizeSearch(g.zone).includes(q)
        )
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, searchQuery, filterZone]);

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
          <>
            <div className="item-location-toolbar card">
              <div className="item-location-search-wrap">
                <i className="fa-solid fa-magnifying-glass item-location-search-icon" aria-hidden />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un objet, une zone ou un mode d'obtention…"
                  className="item-location-search-input"
                  aria-label="Recherche"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="item-location-search-clear"
                    aria-label="Effacer la recherche"
                  >
                    <i className="fa-solid fa-xmark" />
                  </button>
                )}
              </div>
              <div className="item-location-filter-wrap">
                <i className="fa-solid fa-filter item-location-filter-icon" aria-hidden />
                <select
                  value={filterZone}
                  onChange={(e) => setFilterZone(e.target.value)}
                  className="item-location-filter-select"
                  aria-label="Filtrer par zone"
                >
                  <option value="">Toutes les zones</option>
                  {zoneOptions.map((z) => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
              </div>
            </div>

            {filteredGroups.length === 0 ? (
              <div className="item-location-empty card item-location-no-results">
                <i className="fa-solid fa-magnifying-glass" aria-hidden />
                <p>Aucun résultat pour cette recherche ou ce filtre.</p>
              </div>
            ) : (
              <div className="item-location-sections">
                {filteredGroups.map((g) => (
                  <section key={g.zone} className="item-location-zone card">
                    <h2 className="item-location-zone-title">
                      <i className="fa-solid fa-map-pin" aria-hidden />
                      {g.zone}
                    </h2>
                    <div className="item-location-table-wrap">
                      <table className="item-location-table">
                        <thead>
                          <tr>
                            <th><i className="fa-solid fa-cube" aria-hidden /> Objet</th>
                            <th><i className="fa-solid fa-hand-holding" aria-hidden /> Obtention</th>
                          </tr>
                        </thead>
                        <tbody>
                          {g.items.map((row, i) => (
                            <tr key={`${g.zone}-${i}`}>
                              <td className="item-location-cell-item">
                                <i className="fa-solid fa-gift item-location-cell-fa" aria-hidden />
                                {row.item}
                              </td>
                              <td className="item-location-cell-obtention">
                                <i className="fa-solid fa-route item-location-cell-fa" aria-hidden />
                                {row.obtention}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
