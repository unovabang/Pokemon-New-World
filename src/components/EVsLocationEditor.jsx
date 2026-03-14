import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:3001/api`
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

export default function EVsLocationEditor({ onSave }) {
  const [entries, setEntries] = useState([]);
  const [pokedexEntries, setPokedexEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState("pv");
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // 'add' | 'edit'
  const [addSource, setAddSource] = useState("pokedex"); // 'pokedex' | 'manual'
  const [editingIndex, setEditingIndex] = useState(null);
  const [form, setForm] = useState({ name: "", imageUrl: "", points: 0 });
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [saveMessage, setSaveMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const [evsRes, pokedexRes] = await Promise.all([
        fetch(`${API_BASE}/evs-location?t=${Date.now()}`).then((r) => r.json()),
        fetch(`${API_BASE}/pokedex?t=${Date.now()}`).then((r) => r.json()),
      ]);
      if (evsRes?.success && Array.isArray(evsRes?.evs?.entries)) {
        setEntries(evsRes.evs.entries);
      } else {
        setEntries([]);
      }
      if (pokedexRes?.success && Array.isArray(pokedexRes?.pokedex?.entries)) {
        setPokedexEntries(pokedexRes.pokedex.entries);
      } else {
        setPokedexEntries([]);
      }
    } catch {
      setEntries([]);
      setPokedexEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const currentEv = useMemo(() => {
    const ev = entries.find((e) => e.id === activeSection);
    if (ev) return ev;
    return { id: activeSection, label: EV_SECTIONS.find((s) => s.id === activeSection)?.label || activeSection, icon: EV_SECTIONS.find((s) => s.id === activeSection)?.icon || "fa-circle", pokemon: [] };
  }, [entries, activeSection]);

  const pokemonList = Array.isArray(currentEv.pokemon) ? currentEv.pokemon : [];
  const filteredPokemon = useMemo(() => {
    if (!searchQuery.trim()) return pokemonList;
    const q = searchQuery.trim().toLowerCase();
    return pokemonList.filter((p) => (typeof p === "object" ? (p.name || "").toLowerCase().includes(q) : String(p).toLowerCase().includes(q)));
  }, [pokemonList, searchQuery]);

  const saveToApi = async (entriesToSave) => {
    const payload = Array.isArray(entriesToSave) ? entriesToSave : entries;
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch(`${API_BASE}/evs-location`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: payload }),
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
        pokemon: newPokemonList,
      });
    }
    setEntries(next);
    saveToApi(next);
  };

  const openAdd = () => {
    setForm({ name: "", imageUrl: "", points: 0 });
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
    setForm({ name, imageUrl, points });
    setModalMode("edit");
    setEditingIndex(index);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingIndex(null);
    setForm({ name: "", imageUrl: "", points: 0 });
  };

  const submitForm = () => {
    const name = (form.name || "").trim();
    if (!name) return;
    const imageUrl = (form.imageUrl || "").trim() || undefined;
    const points = Math.max(0, Math.min(3, Number(form.points) || 0));
    const item = { name, imageUrl, points };

    if (modalMode === "edit" && editingIndex !== null) {
      const newList = pokemonList.map((p, i) =>
        i === editingIndex ? item : (typeof p === "object" ? p : { name: String(p), points: 0 })
      );
      updateEntryPokemon(activeSection, newList);
    } else {
      const newList = [...pokemonList.map((p) => (typeof p === "object" ? p : { name: String(p), points: 0 })), item];
      updateEntryPokemon(activeSection, newList);
    }
    closeModal();
  };

  const handleDelete = (index) => {
    const newList = pokemonList.filter((_, i) => i !== index).map((p) => (typeof p === "object" ? p : { name: String(p), points: 0 }));
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
            <label className="evs-editor-label">Choisir un Pokémon du Pokédex</label>
            <select
              className="evs-editor-select"
              value=""
              onChange={(e) => {
                const idx = e.target.value ? parseInt(e.target.value, 10) : -1;
                if (idx >= 0 && pokedexEntries[idx]) selectPokedexEntry(pokedexEntries[idx]);
              }}
            >
              <option value="">-- Sélectionner --</option>
              {pokedexEntries.map((entry, i) => (
                <option key={entry.num || i} value={i}>{entry.name}</option>
              ))}
            </select>
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
        <div className="evs-editor-form-row">
          <label className="evs-editor-label">EV par KO (0, 1, 2 ou 3)</label>
          <select
            className="evs-editor-select"
            value={form.points}
            onChange={(e) => setForm((f) => ({ ...f, points: Number(e.target.value) }))}
          >
            {[0, 1, 2, 3].map((n) => (
              <option key={n} value={n}>{n} pt{n > 1 ? "s" : ""}</option>
            ))}
          </select>
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
          <button type="button" className="admin-pokedex-btn admin-pokedex-btn-primary" onClick={openAdd}>
            <i className="fa-solid fa-plus" /> Ajouter un Pokémon
          </button>
        </div>
      </div>

      <p className="evs-editor-desc">
        Gérez les Pokémon affichés par stat sur la page publique. Vous pouvez ajouter depuis le Pokédex (sprite inclus) ou en saisie manuelle, modifier le nom/sprite/points et supprimer.
      </p>

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
            {pokemonList.length === 0 ? `Aucun Pokémon pour ${currentEv.label}. Cliquez sur « Ajouter un Pokémon ».` : `Aucun résultat pour « ${searchQuery} ».`}
          </p>
        ) : (
          filteredPokemon.map((p, displayIndex) => {
            const name = typeof p === "object" ? (p?.name || "") : String(p);
            const imageUrl = typeof p === "object" ? (p?.imageUrl || "") : "";
            const points = typeof p === "object" && typeof p?.points === "number" ? p.points : 0;
            const realIndex = pokemonList.indexOf(p);
            const spriteUrl = imageUrl || (pokedexEntries.find((e) => normalizeName(e.name) === normalizeName(name))?.imageUrl) || PLACEHOLDER_SPRITE;
            return (
              <div key={`${name}-${realIndex}`} className="evs-editor-card">
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
