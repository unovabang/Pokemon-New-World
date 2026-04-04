import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { authHeaders } from "../utils/authHeaders";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : `${window.location.origin}/api`;

const PLACEHOLDER_SPRITE = "data:image/svg+xml," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect fill="%23313538" width="96" height="96" rx="8"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%237ecdf2" font-size="10" font-family="sans-serif">?</text></svg>'
);

const EV_SECTIONS = [
  { id: "pv", label: "PV", icon: "fa-heart" },
  { id: "atk", label: "ATK", icon: "fa-hand-fist" },
  { id: "def", label: "DEF", icon: "fa-shield-halved" },
  { id: "atk-spe", label: "ATK SPÉ", icon: "fa-wand-magic-sparkles" },
  { id: "def-spe", label: "DEF SPÉ", icon: "fa-shield" },
  { id: "speed", label: "SPEED", icon: "fa-gauge-high" },
];

function normalizeName(str) {
  if (!str) return "";
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}

/** Variantes pour matcher Pokédex (ex. "Staross Bélamie" -> "Staross de Bélamie") */
function nameVariants(normalized) {
  const out = [normalized];
  const add = (s) => { if (s && !out.includes(s)) out.push(s); };
  add(normalized.replace(/\s+belamie\s*$/, " de belamie"));
  add(normalized.replace(/\s+de belamie\s*$/, " belamie"));
  add(normalized.replace(/\s+galar\s*$/, " de galar"));
  add(normalized.replace(/\s+de galar\s*$/, " galar"));
  add(normalized.replace(/\s+hisui\s*$/, " de hisui"));
  add(normalized.replace(/\s+de hisui\s*$/, " hisui"));
  return out;
}

/** Trouve l'URL du sprite dans le Pokédex à partir du nom affiché (avec variantes) */
function findPokedexSprite(entries, displayName) {
  if (!displayName || !Array.isArray(entries) || entries.length === 0) return null;
  const normalized = normalizeName(displayName);
  const toTry = nameVariants(normalized);
  for (const key of toTry) {
    const e = entries.find((x) => normalizeName(x.name) === key);
    if (e?.imageUrl) return e.imageUrl;
  }
  const firstWord = normalized.split(/\s+/)[0];
  if (firstWord) {
    const e = entries.find((x) => normalizeName(x.name) === firstWord);
    if (e?.imageUrl) return e.imageUrl;
  }
  for (const e of entries) {
    if (!e?.imageUrl) continue;
    const n = normalizeName(e.name);
    if (normalized.startsWith(n) || n.startsWith(normalized)) return e.imageUrl;
  }
  return null;
}

export default function EVsLocationEditor({ onSave }) {
  const [entries, setEntries] = useState([]);
  const [background, setBackground] = useState("");
  const [pokedexEntries, setPokedexEntries] = useState([]);
  const [extradexEntries, setExtradexEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState("pv");
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // 'add' | 'edit'
  const [addSource, setAddSource] = useState("pokedex"); // 'pokedex' | 'manual'
  const [editingIndex, setEditingIndex] = useState(null);
  const [form, setForm] = useState({ name: "", imageUrl: "", points: 0, zones: "" });
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [saveMessage, setSaveMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [pokedexSearch, setPokedexSearch] = useState("");
  const [pokedexDropdownOpen, setPokedexDropdownOpen] = useState(false);
  const [evDropdownOpen, setEvDropdownOpen] = useState(false);
  const [zoneFilterAdmin, setZoneFilterAdmin] = useState("");
  const pokedexDropdownRef = useRef(null);
  const evDropdownRef = useRef(null);

  const load = async () => {
    try {
      setLoading(true);
      const [evsRes, pokedexRes, extradexRes] = await Promise.all([
        fetch(`${API_BASE}/evs-location?t=${Date.now()}`).then((r) => r.json()),
        fetch(`${API_BASE}/pokedex?t=${Date.now()}`).then((r) => r.json()),
        fetch(`${API_BASE}/extradex?t=${Date.now()}`).then((r) => r.json()).catch(() => null),
      ]);
      if (evsRes?.success && Array.isArray(evsRes?.evs?.entries)) {
        const raw = evsRes.evs.entries;
        const normalized = raw.map((ev) => {
          const pokemon = (Array.isArray(ev.pokemon) ? ev.pokemon : []).map((p) => {
            const base = typeof p === "object" && p != null ? p : { name: String(p), points: 0 };
            const zones = Array.isArray(base.zones) ? base.zones : [];
            return { ...base, zones };
          });
          return { ...ev, pokemon };
        });
        setEntries(normalized);
        setBackground(evsRes.evs.background ?? "");
      } else {
        setEntries([]);
      }
      if (pokedexRes?.success && Array.isArray(pokedexRes?.pokedex?.entries)) {
        setPokedexEntries(pokedexRes.pokedex.entries);
      } else {
        setPokedexEntries([]);
      }
      if (extradexRes?.success && Array.isArray(extradexRes?.extradex?.entries)) {
        setExtradexEntries(extradexRes.extradex.entries);
      }
    } catch {
      setEntries([]);
      setPokedexEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!pokedexDropdownOpen) return;
    const onDocClick = (e) => {
      if (pokedexDropdownRef.current && !pokedexDropdownRef.current.contains(e.target)) setPokedexDropdownOpen(false);
    };
    const onKeyDown = (e) => { if (e.key === "Escape") setPokedexDropdownOpen(false); };
    document.addEventListener("click", onDocClick, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("click", onDocClick, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [pokedexDropdownOpen]);

  useEffect(() => {
    if (!evDropdownOpen) return;
    const onDocClick = (e) => {
      if (evDropdownRef.current && !evDropdownRef.current.contains(e.target)) setEvDropdownOpen(false);
    };
    const onKeyDown = (e) => { if (e.key === "Escape") setEvDropdownOpen(false); };
    document.addEventListener("click", onDocClick, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("click", onDocClick, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [evDropdownOpen]);

  const currentEv = useMemo(() => {
    const ev = entries.find((e) => e.id === activeSection);
    if (ev) return { ...ev, zone: (ev.zone != null && String(ev.zone).trim()) ? String(ev.zone).trim() : "" };
    return { id: activeSection, label: EV_SECTIONS.find((s) => s.id === activeSection)?.label || activeSection, icon: EV_SECTIONS.find((s) => s.id === activeSection)?.icon || "fa-circle", zone: "", pokemon: [] };
  }, [entries, activeSection]);

  useEffect(() => {
    setZoneFilterAdmin("");
  }, [activeSection]);

  const pokemonList = Array.isArray(currentEv.pokemon) ? currentEv.pokemon : [];
  const sectionZones = useMemo(() => {
    const set = new Set();
    pokemonList.forEach((p) => (Array.isArray((p && p.zones)) ? p.zones : []).forEach((z) => z && set.add(z)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [pokemonList]);

  const filteredPokemon = useMemo(() => {
    let list = pokemonList;
    if (zoneFilterAdmin) {
      list = list.filter((p) => Array.isArray((p && p.zones)) && p.zones.includes(zoneFilterAdmin));
    }
    if (!searchQuery.trim()) return list;
    const q = searchQuery.trim().toLowerCase();
    return list.filter((p) => (typeof p === "object" ? (p.name || "").toLowerCase().includes(q) : String(p).toLowerCase().includes(q)));
  }, [pokemonList, searchQuery, zoneFilterAdmin]);

  const allDexEntries = useMemo(() => [
    ...pokedexEntries.map((e) => ({ ...e, _source: "pokedex" })),
    ...extradexEntries.map((e) => ({ ...e, _source: "extradex" })),
  ], [pokedexEntries, extradexEntries]);

  const sortByNum = (a, b) => (parseInt(String(a.num), 10) || 0) - (parseInt(String(b.num), 10) || 0);

  const dexFilter = (list) => {
    const raw = pokedexSearch.trim();
    const sorted = [...list].sort(sortByNum);
    if (!raw) return sorted;
    const q = normalizeName(raw);
    if (!q) return sorted;
    return sorted.filter((e) => {
      const n = normalizeName(e.name);
      const num = (e.num || "").toString();
      return n.includes(q) || num === q || num.startsWith(q);
    });
  };

  const filteredPokedexCol = useMemo(() => dexFilter(pokedexEntries), [pokedexEntries, pokedexSearch]);
  const filteredExtradexCol = useMemo(() => dexFilter(extradexEntries), [extradexEntries, pokedexSearch]);
  const filteredPokedexForDropdown = useMemo(() => [...filteredPokedexCol, ...filteredExtradexCol], [filteredPokedexCol, filteredExtradexCol]);

  const saveToApi = async (entriesToSave) => {
    const payload = Array.isArray(entriesToSave) ? entriesToSave : entries;
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch(`${API_BASE}/evs-location`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ entries: payload, background: background && String(background).trim() ? String(background).trim() : null }),
      });
      const data = await res.json();
      if (data?.success) {
        setEntries(data.evs?.entries ?? payload);
        setSaveMessage({ type: "success", text: "EVs Location enregistrée." });
        setTimeout(() => setSaveMessage(null), 2500);
        onSave?.(data.evs);
      } else {
        setSaveMessage({ type: "error", text: data?.error || "Erreur serveur." });
      }
    } catch {
      setSaveMessage({ type: "error", text: "Serveur indisponible." });
    } finally {
      setSaving(false);
    }
  };

  const updateEntryPokemon = (evId, newPokemonList) => {
    const next = entries.map((e) =>
      e.id === evId ? { ...e, pokemon: newPokemonList } : e
    );
    const existing = next.find((e) => e.id === evId);
    if (!existing) {
      next.push({
        id: evId,
        label: EV_SECTIONS.find((s) => s.id === evId)?.label || evId,
        icon: EV_SECTIONS.find((s) => s.id === evId)?.icon || "fa-circle",
        zone: "",
        pokemon: newPokemonList,
      });
    }
    setEntries(next);
    saveToApi(next);
  };

  const updateEntryZone = (evId, zone) => {
    const value = zone != null ? String(zone).trim() : "";
    const next = entries.map((e) =>
      e.id === evId ? { ...e, zone: value } : e
    );
    const existing = next.find((e) => e.id === evId);
    if (!existing) {
      next.push({
        id: evId,
        label: EV_SECTIONS.find((s) => s.id === evId)?.label || evId,
        icon: EV_SECTIONS.find((s) => s.id === evId)?.icon || "fa-circle",
        zone: value,
        pokemon: [],
      });
    }
    setEntries(next);
    saveToApi(next);
  };

  function parseZonesInput(str) {
  if (!str || typeof str !== "string") return [];
  return str.split(",").map((z) => z.trim()).filter(Boolean);
}

  const openAdd = () => {
    const defaultZones = (currentEv.zone && String(currentEv.zone).trim()) ? [String(currentEv.zone).trim()] : [];
    setForm({ name: "", imageUrl: "", points: 0, zones: defaultZones.join(", ") });
    setModalMode("add");
    setAddSource("pokedex");
    setEditingIndex(null);
    setShowModal(true);
  };

  const openEdit = (index) => {
    const p = pokemonList[index];
    const name = typeof p === "object" ? (p?.name || "") : String(p);
    const imageUrl = typeof p === "object" ? (p?.imageUrl || "") : "";
    const points = typeof p === "object" && typeof p?.points === "number" ? p.points : 0;
    const zonesArr = Array.isArray((p && p.zones)) ? p.zones : [];
    setForm({ name, imageUrl, points, zones: zonesArr.join(", ") });
    setModalMode("edit");
    setEditingIndex(index);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingIndex(null);
    setPokedexDropdownOpen(false);
    setEvDropdownOpen(false);
    setPokedexSearch("");
    setForm({ name: "", imageUrl: "", points: 0, zones: "" });
  };

  const toPokemonItem = (p) => {
    if (typeof p === "object" && p !== null) {
      return { name: p.name || "", imageUrl: p.imageUrl, points: typeof p.points === "number" ? p.points : 0, zones: Array.isArray(p.zones) ? p.zones : [] };
    }
    return { name: String(p), imageUrl: undefined, points: 0, zones: [] };
  };

  const submitForm = () => {
    const name = (form.name || "").trim();
    if (!name) return;
    const imageUrl = (form.imageUrl || "").trim() || undefined;
    const points = Math.max(0, Math.min(3, Number(form.points) || 0));
    const zonesArr = parseZonesInput(form.zones);
    const item = { name, imageUrl, points, zones: zonesArr };

    let newList;
    if (modalMode === "edit" && editingIndex !== null) {
      newList = pokemonList.map((p, i) =>
        i === editingIndex ? item : toPokemonItem(p)
      );
    } else {
      newList = [...pokemonList.map(toPokemonItem), item];
    }

    const next = entries.map((e) =>
      e.id === activeSection ? { ...e, pokemon: newList } : e
    );
    const existing = next.find((e) => e.id === activeSection);
    if (!existing) {
      next.push({
        id: activeSection,
        label: EV_SECTIONS.find((s) => s.id === activeSection)?.label || activeSection,
        icon: EV_SECTIONS.find((s) => s.id === activeSection)?.icon || "fa-circle",
        zone: "",
        pokemon: newList,
      });
    }
    setEntries(next);
    saveToApi(next);
    closeModal();
  };

  const handleDelete = (index) => {
    const newList = pokemonList.filter((_, i) => i !== index).map((p) => toPokemonItem(p));
    updateEntryPokemon(activeSection, newList);
    setDeleteConfirm(null);
  };

  const selectPokedexEntry = (entry) => {
    if (!entry) return;
    setForm((f) => ({
      ...f,
      name: entry.name || f.name,
      imageUrl: (entry.imageUrl || "").trim() || f.imageUrl,
    }));
  };

  const modalContent = showModal && (
    <div className="admin-pokedex-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="evs-modal-title" onClick={closeModal}>
      <div className="admin-pokedex-modal evs-editor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-pokedex-modal-header">
          <h2 id="evs-modal-title" className="admin-pokedex-modal-title">
            {modalMode === "add" ? "Ajouter un Pokémon" : "Modifier le Pokémon"}
          </h2>
          <button type="button" className="admin-pokedex-modal-close" onClick={closeModal} title="Fermer"><i className="fa-solid fa-times" /></button>
        </div>
        <div className="admin-pokedex-modal-body">

        {modalMode === "add" && (
          <div className="evs-editor-modal-tabs">
            <button
              type="button"
              className={addSource === "pokedex" ? "admin-panel-nav-btn admin-panel-nav-btn--active" : "admin-panel-nav-btn"}
              onClick={() => setAddSource("pokedex")}
            >
              <i className="fa-solid fa-book" /> Depuis le Pokédex
            </button>
            <button
              type="button"
              className={addSource === "manual" ? "admin-panel-nav-btn admin-panel-nav-btn--active" : "admin-panel-nav-btn"}
              onClick={() => setAddSource("manual")}
            >
              <i className="fa-solid fa-pen" /> Saisie manuelle
            </button>
          </div>
        )}

        {modalMode === "add" && addSource === "pokedex" && (
          <div className="evs-editor-pokedex-pick">
            <label className="evs-editor-label">Choisir un Pokémon ({allDexEntries.length} au total — Pokédex + Extradex)</label>
            <div className="evs-editor-pokedex-dropdown" ref={pokedexDropdownRef}>
              <div className="evs-editor-pokedex-search-row">
                <input
                  type="text"
                  className="evs-editor-input evs-editor-pokedex-search"
                  value={pokedexSearch}
                  onChange={(e) => { setPokedexSearch(e.target.value); setPokedexDropdownOpen(true); }}
                  onFocus={() => setPokedexDropdownOpen(true)}
                  placeholder="Rechercher par nom (ex: Staross Belamie, 338…)"
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="evs-editor-pokedex-toggle"
                  onClick={() => setPokedexDropdownOpen((o) => !o)}
                  title={pokedexDropdownOpen ? "Fermer la liste" : "Ouvrir la liste"}
                  aria-expanded={pokedexDropdownOpen}
                >
                  <i className={`fa-solid fa-chevron-${pokedexDropdownOpen ? "up" : "down"}`} />
                </button>
              </div>
              {pokedexDropdownOpen && (
                <div className="evs-editor-pokedex-list" role="listbox">
                  <div className="evs-editor-pokedex-list-header">
                    <span>{pokedexSearch.trim() ? `${filteredPokedexForDropdown.length} résultat(s)` : `${allDexEntries.length} Pokémon`}</span>
                    <button type="button" className="evs-editor-pokedex-list-close" onClick={() => setPokedexDropdownOpen(false)} title="Fermer la liste">
                      <i className="fa-solid fa-times" /> Fermer
                    </button>
                  </div>
                  <div className="evs-editor-pokedex-columns">
                    <div className="evs-editor-pokedex-col">
                      <div className="evs-editor-pokedex-col-header evs-editor-pokedex-col-header--pokedex">
                        <i className="fa-solid fa-book" /> Pokédex <span className="evs-editor-pokedex-col-count">({filteredPokedexCol.length})</span>
                      </div>
                      <div className="evs-editor-pokedex-col-body">
                        {filteredPokedexCol.length === 0 ? (
                          <div className="evs-editor-pokedex-list-empty">Aucun résultat</div>
                        ) : (
                          filteredPokedexCol.map((entry, idx) => (
                            <button
                              key={`pokedex-${entry.num || idx}-${entry.name}-${idx}`}
                              type="button"
                              className="evs-editor-pokedex-option"
                              role="option"
                              onClick={() => { selectPokedexEntry(entry); setPokedexDropdownOpen(false); setPokedexSearch(""); }}
                            >
                              <span className="evs-editor-pokedex-option-sprite">
                                <img src={entry.imageUrl || PLACEHOLDER_SPRITE} alt="" onError={(e) => { e.target.src = PLACEHOLDER_SPRITE; }} />
                              </span>
                              <span className="evs-editor-pokedex-option-name">{entry.name}</span>
                              {entry.num && <span className="evs-editor-pokedex-option-num">#{entry.num}</span>}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="evs-editor-pokedex-col">
                      <div className="evs-editor-pokedex-col-header evs-editor-pokedex-col-header--extradex">
                        <i className="fa-solid fa-book" /> Extradex <span className="evs-editor-pokedex-col-count">({filteredExtradexCol.length})</span>
                      </div>
                      <div className="evs-editor-pokedex-col-body">
                        {filteredExtradexCol.length === 0 ? (
                          <div className="evs-editor-pokedex-list-empty">Aucun résultat</div>
                        ) : (
                          filteredExtradexCol.map((entry, idx) => (
                            <button
                              key={`extradex-${entry.num || idx}-${entry.name}-${idx}`}
                              type="button"
                              className="evs-editor-pokedex-option evs-editor-pokedex-option--extradex"
                              role="option"
                              onClick={() => { selectPokedexEntry(entry); setPokedexDropdownOpen(false); setPokedexSearch(""); }}
                            >
                              <span className="evs-editor-pokedex-option-sprite">
                                <img src={entry.imageUrl || PLACEHOLDER_SPRITE} alt="" onError={(e) => { e.target.src = PLACEHOLDER_SPRITE; }} />
                              </span>
                              <span className="evs-editor-pokedex-option-name">{entry.name}</span>
                              {entry.num && <span className="evs-editor-pokedex-option-num">#{entry.num}</span>}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="evs-editor-form-row">
          <label className="evs-editor-label">Nom</label>
          <input
            type="text"
            className="evs-editor-input"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="ex. Pikachu"
                    />
        </div>
        <div className="evs-editor-form-row">
          <label className="evs-editor-label">URL du sprite (optionnel, sinon pris du Pokédex)</label>
          <input
            type="url"
            className="evs-editor-input"
            value={form.imageUrl}
            onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
            placeholder="https://..."
                    />
        </div>
        <div className="evs-editor-form-row" ref={evDropdownRef}>
          <label className="evs-editor-label">EV par KO (0, 1, 2 ou 3)</label>
          <div className="evs-editor-custom-select">
            <button
              type="button"
              className="evs-editor-select-trigger"
              onClick={() => setEvDropdownOpen((o) => !o)}
              aria-expanded={evDropdownOpen}
              aria-haspopup="listbox"
            >
              <span>{form.points} pt{form.points > 1 ? "s" : ""}</span>
              <i className={`fa-solid fa-chevron-${evDropdownOpen ? "up" : "down"}`} />
            </button>
            {evDropdownOpen && (
              <div className="evs-editor-select-list" role="listbox">
                {[0, 1, 2, 3].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="option"
                    className={`evs-editor-select-option ${form.points === n ? "evs-editor-select-option--active" : ""}`}
                    onClick={() => {
                      setForm((f) => ({ ...f, points: n }));
                      setEvDropdownOpen(false);
                    }}
                  >
                    {n} pt{n > 1 ? "s" : ""}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="evs-editor-form-row evs-editor-form-row--zone">
          <label className="evs-editor-label" htmlFor="evs-modal-zones">
            <i className="fa-solid fa-map-location-dot" aria-hidden /> Zones de farm
          </label>
          <input
            id="evs-modal-zones"
            type="text"
            className="evs-editor-input"
            value={form.zones}
            onChange={(e) => setForm((f) => ({ ...f, zones: e.target.value }))}
            placeholder="ex. Helheim, Chemin des Larmes (separées par des virgules)"
                    />
          <span className="evs-editor-hint">Une ou plusieurs zones pour ce Pokémon (icône carte en haut à gauche sur la page publique).</span>
        </div>

        </div>
        <div className="admin-pokedex-modal-footer">
          <button type="button" className="admin-panel-nav-btn" onClick={closeModal}>Annuler</button>
          <button type="button" className="admin-pokedex-btn admin-pokedex-btn-primary" onClick={submitForm} disabled={!form.name?.trim()}>
            {modalMode === "add" ? "Ajouter" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );

  const deleteConfirmEl = deleteConfirm !== null && createPortal(
    <div className="admin-pokedex-modal-overlay" role="dialog" aria-modal="true" onClick={() => setDeleteConfirm(null)}>
      <div className="admin-pokedex-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-pokedex-modal-header">
          <h2 className="admin-pokedex-modal-title">Supprimer ce Pokémon ?</h2>
          <button type="button" className="admin-pokedex-modal-close" onClick={() => setDeleteConfirm(null)} title="Fermer"><i className="fa-solid fa-times" /></button>
        </div>
        <div className="admin-pokedex-modal-body">
          <p className="evs-editor-confirm-text">
            Le Pokémon « {typeof pokemonList[deleteConfirm] === "object" ? pokemonList[deleteConfirm]?.name : pokemonList[deleteConfirm]} » sera retiré de la liste {currentEv.label}.
          </p>
        </div>
        <div className="admin-pokedex-modal-footer">
          <button type="button" className="admin-panel-nav-btn" onClick={() => setDeleteConfirm(null)}>Annuler</button>
          <button type="button" className="admin-pokedex-btn admin-pokedex-btn-danger" onClick={() => handleDelete(deleteConfirm)}>Supprimer</button>
        </div>
      </div>
    </div>,
    document.body
  );

  if (loading) {
    return (
      <div className="admin-panel-card">
        <p className="admin-panel-loading"><i className="fa-solid fa-spinner fa-spin" /> Chargement EVs Location…</p>
      </div>
    );
  }

  return (
    <div className="evs-location-editor">
      <div className="evs-editor-head">
        <h2 className="evs-editor-title"><i className="fa-solid fa-map-location-dot" /> EVs Location</h2>
        <div className="evs-editor-actions">
          {saveMessage && (
            <span className={saveMessage.type === "success" ? "evs-editor-msg evs-editor-msg--ok" : "evs-editor-msg evs-editor-msg--err"}>
              <i className={`fa-solid ${saveMessage.type === "success" ? "fa-check" : "fa-exclamation-triangle"}`} /> {saveMessage.text}
            </span>
          )}
          <button
            type="button"
            className="admin-pokedex-btn admin-pokedex-btn-primary"
            onClick={() => saveToApi(entries)}
            disabled={saving}
            title="Enregistrer les données et l’image de fond sur la page publique"
          >
            <i className={`fa-solid ${saving ? "fa-spinner fa-spin" : "fa-floppy-disk"}`} /> Sauvegarder
          </button>
          <button type="button" className="admin-pokedex-btn admin-pokedex-btn-primary" onClick={openAdd}>
            <i className="fa-solid fa-plus" /> Ajouter un Pokémon
          </button>
        </div>
      </div>

      <p className="evs-editor-desc">
        Gérez les Pokémon affichés par stat sur la page publique. Vous pouvez ajouter depuis le Pokédex (sprite inclus) ou en saisie manuelle, modifier le nom/sprite/points et supprimer.
      </p>

      <div className="evs-editor-background" style={{ marginBottom: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <label style={{ minWidth: "140px" }}>URL image de fond (page publique)</label>
          <input
            type="url"
            className="evs-editor-search"
value={background}
            onChange={(e) => setBackground(e.target.value)}
            placeholder="https://… ou /image.jpg"
            style={{ flex: "1", minWidth: "200px", maxWidth: "400px" }}
          />
        </div>
        <p className="evs-editor-hint" style={{ margin: "0.25rem 0 0 140px", fontSize: "0.85rem", color: "var(--muted, #94a3b8)" }}>
          Cliquez sur « Sauvegarder » ci-dessus pour enregistrer l’image de fond sur la page publique.
        </p>
      </div>

      <div className="evs-editor-tabs">
        {EV_SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`admin-panel-nav-btn ${activeSection === s.id ? "admin-panel-nav-btn--active" : ""}`}
            onClick={() => setActiveSection(s.id)}
          >
            <i className={`fa-solid ${s.icon}`} /> {s.label}
          </button>
        ))}
      </div>

      {sectionZones.length > 0 && (
        <div className="evs-editor-zone-filter-row">
          <label className="evs-editor-label" htmlFor="evs-admin-zone-filter">
            <i className="fa-solid fa-map-location-dot" aria-hidden /> Filtrer par zone
          </label>
          <select
            id="evs-admin-zone-filter"
            className="evs-editor-input evs-editor-zone-select"
            value={zoneFilterAdmin}
          onChange={(e) => setZoneFilterAdmin(e.target.value)}
                  >
            <option value="">Toutes les zones</option>
            {sectionZones.map((z) => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>
        </div>
      )}

      <div className="evs-editor-toolbar">
        <input
          type="search"
          className="evs-editor-search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher dans cette liste…"
                />
        <span className="evs-editor-count">{filteredPokemon.length} Pokémon</span>
      </div>

      <div className="evs-editor-grid">
        {filteredPokemon.length === 0 ? (
          <p className="evs-editor-empty">
            {pokemonList.length === 0 ? `Aucun Pokémon pour ${currentEv.label}. Cliquez sur « Ajouter un Pokémon ».` : zoneFilterAdmin ? `Aucun Pokémon avec la zone « ${zoneFilterAdmin} ».` : `Aucun résultat pour « ${searchQuery} ».`}
          </p>
        ) : (
          filteredPokemon.map((p, displayIndex) => {
            const name = typeof p === "object" ? (p?.name || "") : String(p);
            const imageUrl = typeof p === "object" ? (p?.imageUrl || "") : "";
            const points = typeof p === "object" && typeof p?.points === "number" ? p.points : 0;
            const pokemonZones = Array.isArray((p && p.zones)) ? p.zones : [];
            const realIndex = pokemonList.indexOf(p);
            const spriteUrl = imageUrl || findPokedexSprite(pokedexEntries, name) || PLACEHOLDER_SPRITE;
            return (
              <div key={`${name}-${realIndex}`} className="evs-editor-card">
                {pokemonZones.length > 0 && (
                  <span
                    className="evs-editor-card-zone-fa"
                    title={`Vous pouvez le farm ici : ${pokemonZones.join(", ")}`}
                    aria-label={`Farm : ${pokemonZones.join(", ")}`}
                  >
                    <i className="fa-solid fa-map-location-dot" />
                  </span>
                )}
                <div className="evs-editor-card-sprite">
                  <img src={spriteUrl} alt="" onError={(e) => { e.target.src = PLACEHOLDER_SPRITE; }} />
                  {points > 0 && <span className="evs-editor-card-pts">{points}</span>}
                </div>
                <div className="evs-editor-card-name">{name}</div>
                <div className="evs-editor-card-actions">
                  <button type="button" className="evs-editor-btn evs-editor-btn-edit" onClick={() => openEdit(realIndex)} title="Modifier">
                    <i className="fa-solid fa-pen" />
                  </button>
                  <button type="button" className="evs-editor-btn evs-editor-btn-del" onClick={() => setDeleteConfirm(realIndex)} title="Supprimer">
                    <i className="fa-solid fa-trash" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showModal && createPortal(modalContent, document.body)}
      {deleteConfirmEl}
    </div>
  );
}
