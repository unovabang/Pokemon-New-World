import { useState, useEffect, useRef } from "react";
import { authHeaders } from "../utils/authHeaders";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : `${window.location.origin}/api`;

const PLACEHOLDER_SPRITE = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

function normalizeName(str) {
  if (!str) return "";
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}

// Picker visuel Pokedex + Extradex (inspiré de BossEditor.BossPokemonPicker).
function BanlistPokemonPicker({ pokedexEntries, extradexEntries, onSelect, selected }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("click", onClick, true); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const sortByNum = (a, b) => (parseInt(String(a.num), 10) || 0) - (parseInt(String(b.num), 10) || 0);
  const filterList = (list) => {
    const sorted = [...list].sort(sortByNum);
    const q = normalizeName(search);
    if (!q) return sorted;
    return sorted.filter((e) => {
      const n = normalizeName(e.name);
      const num = (e.num || "").toString();
      return n.includes(q) || num === q || num.startsWith(q);
    });
  };
  const filteredPdx = filterList(pokedexEntries);
  const filteredExt = filterList(extradexEntries);

  const displayValue = selected
    ? `${selected.name} (#${selected.num})`
    : "";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div style={{ display: "flex", gap: ".35rem" }}>
        <input
          type="text"
          className="admin-pokedex-input"
          value={open ? search : displayValue}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => { setSearch(""); setOpen(true); }}
          placeholder="Chercher dans le Pokédex..."
          style={{ marginBottom: 0, flex: 1 }}
        />
        <button type="button" className="admin-pokedex-btn admin-pokedex-btn-ghost" style={{ padding: ".4rem .6rem" }} onClick={() => setOpen((o) => !o)}>
          <i className={`fa-solid fa-chevron-${open ? "up" : "down"}`} />
        </button>
      </div>
      {open && (
        <div className="evs-editor-pokedex-list" style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 120, marginTop: ".3rem", maxHeight: "320px" }}>
          <div className="evs-editor-pokedex-list-header">
            <span>{search.trim() ? `${filteredPdx.length + filteredExt.length} résultat(s)` : `${pokedexEntries.length + extradexEntries.length} Pokémon`}</span>
            <button type="button" className="evs-editor-pokedex-list-close" onClick={() => setOpen(false)}><i className="fa-solid fa-times" /> Fermer</button>
          </div>
          <div className="evs-editor-pokedex-columns">
            <div className="evs-editor-pokedex-col">
              <div className="evs-editor-pokedex-col-header evs-editor-pokedex-col-header--pokedex">
                <i className="fa-solid fa-book" /> Pokédex <span className="evs-editor-pokedex-col-count">({filteredPdx.length})</span>
              </div>
              <div className="evs-editor-pokedex-col-body">
                {filteredPdx.length === 0 ? (
                  <div className="evs-editor-pokedex-list-empty">Aucun résultat</div>
                ) : filteredPdx.map((entry, idx) => (
                  <button key={`p-${entry.num || idx}-${idx}`} type="button" className="evs-editor-pokedex-option" onClick={() => { onSelect(entry); setOpen(false); setSearch(""); }}>
                    <span className="evs-editor-pokedex-option-sprite"><img src={entry.imageUrl || PLACEHOLDER_SPRITE} alt="" onError={(e) => { e.target.src = PLACEHOLDER_SPRITE; }} /></span>
                    <span className="evs-editor-pokedex-option-name">{entry.name}</span>
                    {entry.num && <span className="evs-editor-pokedex-option-num">#{entry.num}</span>}
                  </button>
                ))}
              </div>
            </div>
            <div className="evs-editor-pokedex-col">
              <div className="evs-editor-pokedex-col-header evs-editor-pokedex-col-header--extradex">
                <i className="fa-solid fa-book" /> Extradex <span className="evs-editor-pokedex-col-count">({filteredExt.length})</span>
              </div>
              <div className="evs-editor-pokedex-col-body">
                {filteredExt.length === 0 ? (
                  <div className="evs-editor-pokedex-list-empty">Aucun résultat</div>
                ) : filteredExt.map((entry, idx) => (
                  <button key={`e-${entry.num || idx}-${idx}`} type="button" className="evs-editor-pokedex-option evs-editor-pokedex-option--extradex" onClick={() => { onSelect(entry); setOpen(false); setSearch(""); }}>
                    <span className="evs-editor-pokedex-option-sprite"><img src={entry.imageUrl || PLACEHOLDER_SPRITE} alt="" onError={(e) => { e.target.src = PLACEHOLDER_SPRITE; }} /></span>
                    <span className="evs-editor-pokedex-option-name">{entry.name}</span>
                    {entry.num && <span className="evs-editor-pokedex-option-num">#{entry.num}</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BanlistEditor() {
  const [entries, setEntries] = useState([]);
  const [pokedexEntries, setPokedexEntries] = useState([]);
  const [extradexEntries, setExtradexEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  const [dirty, setDirty] = useState(false);

  // Formulaire d'ajout
  const [draftPokemon, setDraftPokemon] = useState(null);
  const [draftForm, setDraftForm] = useState("");
  const [draftReason, setDraftReason] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const [banRes, pokedexRes, extradexRes] = await Promise.all([
          fetch(`${API_BASE}/banlist?t=${Date.now()}`).then((r) => r.json()).catch(() => null),
          fetch(`${API_BASE}/pokedex?t=${Date.now()}`).then((r) => r.json()).catch(() => null),
          fetch(`${API_BASE}/extradex?t=${Date.now()}`).then((r) => r.json()).catch(() => null),
        ]);
        if (cancelled) return;
        if (banRes?.success && Array.isArray(banRes?.banlist?.entries)) {
          setEntries(banRes.banlist.entries);
        }
        if (pokedexRes?.success && Array.isArray(pokedexRes?.pokedex?.entries)) {
          setPokedexEntries(pokedexRes.pokedex.entries);
        }
        if (extradexRes?.success && Array.isArray(extradexRes?.extradex?.entries)) {
          setExtradexEntries(extradexRes.extradex.entries);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const addEntry = () => {
    if (!draftPokemon) return;
    const speciesId = parseInt(String(draftPokemon.num), 10);
    if (!speciesId) return;
    const trimmedForm = draftForm.trim();
    const formNum = trimmedForm === "" ? null : parseInt(trimmedForm, 10);
    setEntries((prev) => [
      ...prev,
      {
        id: `ban_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        speciesId,
        form: Number.isFinite(formNum) ? formNum : null,
        name: draftPokemon.name || "",
        imageUrl: draftPokemon.imageUrl || "",
        reason: draftReason.trim(),
      },
    ]);
    setDraftPokemon(null);
    setDraftForm("");
    setDraftReason("");
    setDirty(true);
  };

  const removeEntry = (id) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    setDirty(true);
  };

  const updateReason = (id, reason) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, reason } : e)));
    setDirty(true);
  };

  const saveBanlist = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const payload = {
        entries: entries
          .map((e) => ({
            id: e.id,
            speciesId: Number(e.speciesId) || 0,
            form: e.form == null || e.form === "" ? null : Number(e.form),
            name: (e.name || "").trim(),
            imageUrl: (e.imageUrl || "").trim(),
            reason: (e.reason || "").trim(),
          }))
          .filter((e) => e.speciesId > 0),
      };
      const res = await fetch(`${API_BASE}/banlist`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data?.success) {
        setSaveMessage("Banlist sauvegardée.");
        setDirty(false);
      } else {
        setSaveMessage(data?.error || "Erreur");
      }
    } catch {
      setSaveMessage("Erreur réseau");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "3rem", textAlign: "center" }}>
        <i className="fa-solid fa-spinner fa-spin" /> Chargement...
      </div>
    );
  }

  return (
    <div className="banlist-editor">
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.25rem",
          flexWrap: "wrap",
          gap: ".75rem",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "1.3rem" }}>
          <i className="fa-solid fa-ban" style={{ color: "rgba(248,113,113,.85)", marginRight: ".5rem" }} />
          Banlist Tour de Combat ({entries.length})
        </h2>
        <div style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
          {saveMessage && (
            <span
              style={{
                fontSize: ".8rem",
                color: saving ? "var(--muted)" : "rgba(74,222,128,.9)",
              }}
            >
              {saveMessage}
            </span>
          )}
          <button
            type="button"
            onClick={saveBanlist}
            disabled={saving || !dirty}
            className="admin-pokedex-btn admin-pokedex-btn-primary"
            style={{ opacity: saving || !dirty ? 0.5 : 1 }}
          >
            <i className="fa-solid fa-save" /> Sauvegarder
          </button>
        </div>
      </div>

      {/* Description */}
      <p style={{ color: "var(--muted)", fontSize: ".85rem", marginBottom: "1rem" }}>
        Ces Pokémons seront interdits en combat dans la Tour de Combat. Les joueurs ne pourront pas
        envoyer ni accepter de défi s'ils en ont dans leur équipe.
      </p>

      {/* Formulaire d'ajout */}
      <div
        className="admin-panel-card"
        style={{
          padding: "1.25rem",
          marginBottom: "1.5rem",
          border: "1px solid rgba(255,255,255,.08)",
          borderRadius: "12px",
        }}
      >
        <h3 style={{ margin: "0 0 1rem 0", fontSize: "1rem", color: "rgba(255,255,255,.85)" }}>
          <i className="fa-solid fa-plus" style={{ marginRight: ".35rem" }} />
          Ajouter un Pokémon banni
        </h3>

        <div style={{ marginBottom: ".85rem" }}>
          <label className="admin-pokedex-label">Pokémon *</label>
          <BanlistPokemonPicker
            pokedexEntries={pokedexEntries}
            extradexEntries={extradexEntries}
            onSelect={(entry) => setDraftPokemon(entry)}
            selected={draftPokemon}
          />
          {draftPokemon && (
            <div
              style={{
                marginTop: ".5rem",
                display: "flex",
                alignItems: "center",
                gap: ".6rem",
                padding: ".5rem .75rem",
                background: "rgba(255,255,255,.04)",
                borderRadius: "8px",
              }}
            >
              <img
                src={draftPokemon.imageUrl || PLACEHOLDER_SPRITE}
                alt=""
                style={{ width: "36px", height: "36px", objectFit: "contain" }}
                onError={(e) => { e.target.src = PLACEHOLDER_SPRITE; }}
              />
              <span style={{ flex: 1 }}>
                <strong>{draftPokemon.name}</strong>{" "}
                <span style={{ color: "var(--muted)", fontSize: ".8rem" }}>#{draftPokemon.num}</span>
              </span>
              <button
                type="button"
                className="admin-pokedex-btn admin-pokedex-btn-ghost"
                style={{ padding: ".25rem .5rem" }}
                onClick={() => setDraftPokemon(null)}
                title="Désélectionner"
              >
                <i className="fa-solid fa-times" />
              </button>
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: ".75rem", marginBottom: ".85rem" }}>
          <div>
            <label
              className="admin-pokedex-label"
              title="Laissez vide pour bannir la forme de base. Saisissez un numéro (ex: 31) pour bannir une forme alternative (Gigantamax, Alola, etc.)."
            >
              Forme
              <i
                className="fa-solid fa-circle-info"
                style={{ marginLeft: ".35rem", color: "rgba(255,255,255,.4)", fontSize: ".75rem" }}
              />
            </label>
            <input
              type="number"
              className="admin-pokedex-input"
              value={draftForm}
              onChange={(e) => setDraftForm(e.target.value)}
              placeholder="(vide = base)"
              min="0"
            />
          </div>
          <div>
            <label className="admin-pokedex-label">Raison (optionnel)</label>
            <input
              type="text"
              className="admin-pokedex-input"
              value={draftReason}
              onChange={(e) => setDraftReason(e.target.value)}
              placeholder="Ex: Trop puissant en tournoi"
              maxLength={200}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={addEntry}
          disabled={!draftPokemon}
          className="admin-pokedex-btn admin-pokedex-btn-primary"
          style={{ opacity: !draftPokemon ? 0.5 : 1 }}
        >
          <i className="fa-solid fa-plus" /> Ajouter à la banlist
        </button>
      </div>

      {/* Liste des entrées */}
      {entries.length === 0 ? (
        <p style={{ textAlign: "center", color: "var(--muted)", padding: "2rem" }}>
          Aucun Pokémon banni. Ajoutez-en un via le formulaire ci-dessus.
        </p>
      ) : (
        <div className="admin-dex-grid">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="admin-dex-card"
              style={{ cursor: "default" }}
            >
              <button
                type="button"
                className="admin-dex-card-delete"
                onClick={() => removeEntry(entry.id)}
                title="Supprimer"
              >
                <i className="fa-solid fa-trash" />
              </button>
              <div className="admin-dex-card-sprite">
                {entry.imageUrl ? (
                  <img
                    src={entry.imageUrl}
                    alt=""
                    onError={(e) => (e.target.style.display = "none")}
                  />
                ) : (
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "100%",
                      color: "rgba(255,255,255,.3)",
                      fontSize: "1.5rem",
                    }}
                  >
                    <i className="fa-solid fa-ban" />
                  </span>
                )}
              </div>
              <span className="admin-dex-card-name">
                {entry.name || `#${entry.speciesId}`}
              </span>
              <span className="admin-dex-card-types">
                #{String(entry.speciesId).padStart(3, "0")}
                {" • "}
                {entry.form == null ? "Forme de base" : `Forme ${entry.form}`}
              </span>
              <input
                type="text"
                className="admin-pokedex-input"
                value={entry.reason || ""}
                onChange={(e) => updateReason(entry.id, e.target.value)}
                placeholder="Raison (optionnel)"
                maxLength={200}
                style={{ marginTop: ".5rem", fontSize: ".75rem" }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
