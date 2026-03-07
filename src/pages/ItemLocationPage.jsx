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
  const [filterItem, setFilterItem] = useState("");
  const [openZoneDropdown, setOpenZoneDropdown] = useState(false);
  const [openItemDropdown, setOpenItemDropdown] = useState(false);

  useEffect(() => {
    const close = () => { setOpenZoneDropdown(false); setOpenItemDropdown(false); };
    const onDocClick = (e) => {
      if (!e.target.closest(".item-location-dropdown")) close();
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

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

  const itemOptions = useMemo(() => {
    const items = new Set();
    groups.forEach((g) => g.items.forEach((row) => row.item && items.add(row.item)));
    return [...items].sort((a, b) => a.localeCompare(b));
  }, [groups]);

  const filteredGroups = useMemo(() => {
    const q = normalizeSearch(searchQuery);
    let byZone = filterZone
      ? groups.filter((g) => g.zone === filterZone)
      : groups;
    if (filterItem) {
      byZone = byZone
        .map((g) => ({
          zone: g.zone,
          items: g.items.filter((row) => row.item === filterItem)
        }))
        .filter((g) => g.items.length > 0);
    }
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
  }, [groups, searchQuery, filterZone, filterItem]);

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
              <div className="item-location-dropdown-wrap">
                <span className="item-location-dropdown-label"><i className="fa-solid fa-map-pin" aria-hidden /> Zone</span>
                <div className="item-location-dropdown">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setOpenZoneDropdown((v) => !v); setOpenItemDropdown(false); }}
                    className="item-location-dropdown-trigger"
                    aria-expanded={openZoneDropdown}
                    aria-haspopup="listbox"
                  >
                    <span>{filterZone || "Toutes les zones"}</span>
                    <i className={`fa-solid fa-chevron-down item-location-dropdown-chevron ${openZoneDropdown ? "open" : ""}`} aria-hidden />
                  </button>
                  {openZoneDropdown && (
                    <ul className="item-location-dropdown-list" role="listbox" onClick={(e) => e.stopPropagation()}>
                      <li>
                        <button type="button" role="option" onClick={() => { setFilterZone(""); setOpenZoneDropdown(false); }} className="item-location-dropdown-option">
                          Toutes les zones
                        </button>
                      </li>
                      {zoneOptions.map((z) => (
                        <li key={z}>
                          <button type="button" role="option" onClick={() => { setFilterZone(z); setOpenZoneDropdown(false); }} className={`item-location-dropdown-option ${filterZone === z ? "selected" : ""}`}>
                            {z}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div className="item-location-dropdown-wrap">
                <span className="item-location-dropdown-label"><i className="fa-solid fa-cube" aria-hidden /> Objet</span>
                <div className="item-location-dropdown">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setOpenItemDropdown((v) => !v); setOpenZoneDropdown(false); }}
                    className="item-location-dropdown-trigger"
                    aria-expanded={openItemDropdown}
                    aria-haspopup="listbox"
                  >
                    <span>{filterItem || "Tous les objets"}</span>
                    <i className={`fa-solid fa-chevron-down item-location-dropdown-chevron ${openItemDropdown ? "open" : ""}`} aria-hidden />
                  </button>
                  {openItemDropdown && (
                    <ul className="item-location-dropdown-list" role="listbox" onClick={(e) => e.stopPropagation()}>
                      <li>
                        <button type="button" role="option" onClick={() => { setFilterItem(""); setOpenItemDropdown(false); }} className="item-location-dropdown-option">
                          Tous les objets
                        </button>
                      </li>
                      {itemOptions.map((it) => (
                        <li key={it}>
                          <button type="button" role="option" onClick={() => { setFilterItem(it); setOpenItemDropdown(false); }} className={`item-location-dropdown-option ${filterItem === it ? "selected" : ""}`}>
                            {it}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
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
                        <colgroup>
                          <col className="item-location-col-item" />
                          <col className="item-location-col-obtention" />
                        </colgroup>
                        <thead>
                          <tr>
                            <th scope="col" className="item-location-th-objet">
                              <span className="item-location-th-inner"><i className="fa-solid fa-cube" aria-hidden /> Objet</span>
                            </th>
                            <th scope="col" className="item-location-th-obtention">
                              <span className="item-location-th-inner"><i className="fa-solid fa-hand-holding" aria-hidden /> Obtention</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {g.items.map((row, i) => (
                            <tr key={`${g.zone}-${i}`}>
                              <td className="item-location-cell-item">
                                <span className="item-location-cell-inner">
                                  <i className="fa-solid fa-gift item-location-cell-fa" aria-hidden />
                                  <span>{row.item}</span>
                                </span>
                              </td>
                              <td className="item-location-cell-obtention">
                                <span className="item-location-cell-inner item-location-cell-inner--right">
                                  <i className="fa-solid fa-route item-location-cell-fa" aria-hidden />
                                  <span>{row.obtention}</span>
                                </span>
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
