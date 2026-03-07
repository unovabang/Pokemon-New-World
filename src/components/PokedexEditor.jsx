import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

const AUTO_SAVE_DELAY_MS = 1500;

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:3001/api`
    : `${window.location.origin}/api`;

const STORAGE_ENTRIES = "admin_pokedex_entries";
const STORAGE_BACKGROUND = "admin_pokedex_background";
const STORAGE_CUSTOM_TYPES = "admin_pokedex_custom_types";

const KNOWN_TYPES = [
  "acier", "aspic", "combat", "dragon", "eau", "electr", "fee", "feu", "glace",
  "insecte", "malice", "normal", "plante", "poison", "psy", "roche", "sol",
  "spectre", "tenebres", "vol"
];


export default function PokedexEditor({ initialEntries = [], onSave }) {
  const [entries, setEntries] = useState([]);
  const [backgroundUrl, setBackgroundUrl] = useState("");
  const [customTypes, setCustomTypes] = useState([]);
  const [newTypeName, setNewTypeName] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [form, setForm] = useState({ num: "", name: "", imageUrl: "", types: [], rarity: "", obtention: "" });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveMessage, setSaveMessage] = useState(null);
  const [searchList, setSearchList] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const initialLoadDone = useRef(false);
  const skipNextAutoSave = useRef(true);
  const dataRef = useRef({ entries: [], backgroundUrl: "", customTypes: [] });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/pokedex?t=${Date.now()}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.success && data.pokedex) {
          setEntries(Array.isArray(data.pokedex.entries) ? data.pokedex.entries : []);
          setBackgroundUrl(data.pokedex.background || "");
          setCustomTypes(Array.isArray(data.pokedex.customTypes) ? data.pokedex.customTypes : []);
          setLoading(false);
          initialLoadDone.current = true;
          return;
        }
      } catch (_) {
        if (cancelled) return;
      }
      try {
        const raw = localStorage.getItem(STORAGE_ENTRIES);
        const bg = localStorage.getItem(STORAGE_BACKGROUND);
        const ct = localStorage.getItem(STORAGE_CUSTOM_TYPES);
        if (raw) {
          const parsed = JSON.parse(raw);
          setEntries(Array.isArray(parsed) ? parsed : []);
        } else {
          setEntries(Array.isArray(initialEntries) ? initialEntries : []);
        }
        if (bg) setBackgroundUrl(bg);
        if (ct) setCustomTypes(JSON.parse(ct));
      } catch {
        setEntries(Array.isArray(initialEntries) ? initialEntries : []);
      }
      setLoading(false);
      initialLoadDone.current = true;
    }
    load();
    return () => { cancelled = true; };
  }, [initialEntries]);

  dataRef.current = { entries, backgroundUrl, customTypes };

  useEffect(() => {
    if (!initialLoadDone.current || loading) return;
    if (skipNextAutoSave.current) {
      skipNextAutoSave.current = false;
      return;
    }
    const timer = setTimeout(async () => {
      const { entries: e, backgroundUrl: bg, customTypes: ct } = dataRef.current;
      setSaving(true);
      setSaveMessage(null);
      try {
        const res = await fetch(`${API_BASE}/pokedex`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entries: e, background: bg || null, customTypes: ct }),
        });
        const data = await res.json();
        if (data.success) {
          setSaveMessage({ type: "success", text: "Sauvegardé automatiquement." });
          setTimeout(() => setSaveMessage(null), 2500);
        } else {
          setSaveMessage({ type: "error", text: data.error || "Erreur lors de la sauvegarde." });
        }
      } catch {
        setSaveMessage({ type: "error", text: "Impossible de contacter le serveur." });
      } finally {
        setSaving(false);
      }
    }, AUTO_SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [entries, backgroundUrl, customTypes, loading]);

  const allTypes = [...new Set([...KNOWN_TYPES, ...customTypes].sort((a, b) => a.localeCompare(b)))];

  const saveToStorage = (newEntries, newBg, newCustomTypes) => {
    const ents = newEntries ?? entries;
    const bg = newBg !== undefined ? newBg : backgroundUrl;
    const ct = newCustomTypes !== undefined ? newCustomTypes : customTypes;
    localStorage.setItem(STORAGE_ENTRIES, JSON.stringify(ents));
    if (bg) localStorage.setItem(STORAGE_BACKGROUND, bg); else localStorage.removeItem(STORAGE_BACKGROUND);
    localStorage.setItem(STORAGE_CUSTOM_TYPES, JSON.stringify(ct));
    onSave?.({ entries: ents, background: bg || null, customTypes: ct });
  };

  const handleSaveAll = async () => {
    setSaveMessage(null);
    setSaving(true);
    saveToStorage();
    try {
      const res = await fetch(`${API_BASE}/pokedex`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries,
          background: backgroundUrl || null,
          customTypes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveMessage({ type: "success", text: "Pokédex enregistré dans le fichier JSON." });
        setTimeout(() => setSaveMessage(null), 4000);
      } else {
        setSaveMessage({ type: "error", text: data.error || "Erreur lors de la sauvegarde." });
      }
    } catch (err) {
      setSaveMessage({ type: "error", text: "Impossible de contacter le serveur. Vérifiez que le serveur tourne (npm run dev)." });
    } finally {
      setSaving(false);
    }
  };

  const handleBackgroundChange = (url) => {
    setBackgroundUrl(url);
    localStorage.setItem(STORAGE_BACKGROUND, url || "");
  };

  const addCustomType = () => {
    const t = newTypeName.trim().toLowerCase();
    if (!t || customTypes.includes(t)) return;
    const next = [...customTypes, t].sort((a, b) => a.localeCompare(b));
    setCustomTypes(next);
    setNewTypeName("");
    saveToStorage(undefined, undefined, next);
  };

  const removeCustomType = (t) => {
    const next = customTypes.filter((x) => x !== t);
    setCustomTypes(next);
    saveToStorage(undefined, undefined, next);
  };

  const openAdd = () => {
    setForm({ num: "", name: "", imageUrl: "", types: [], rarity: "", obtention: "" });
    setEditingIndex(null);
    setShowAddModal(true);
  };

  const openEdit = (index) => {
    const e = entries[index];
    setForm({
      num: e.num || "",
      name: e.name || "",
      imageUrl: e.imageUrl || "",
      types: Array.isArray(e.types) ? [...e.types] : [],
      rarity: e.rarity || "",
      obtention: e.obtention || "",
    });
    setEditingIndex(index);
    setShowAddModal(true);
  };

  const toggleFormType = (t) => {
    setForm((f) => ({
      ...f,
      types: f.types.includes(t) ? f.types.filter((x) => x !== t) : [...f.types, t].slice(0, 2),
    }));
  };

  const saveForm = () => {
    if (!form.name.trim()) return;
    const entry = {
      num: String(form.num).trim() || "???",
      name: form.name.trim(),
      imageUrl: form.imageUrl.trim() || null,
      types: form.types.filter(Boolean),
      rarity: form.rarity.trim() || "",
      obtention: form.obtention.trim() || "",
    };
    if (editingIndex !== null) {
      const next = [...entries];
      next[editingIndex] = entry;
      setEntries(next);
      saveToStorage(next, undefined, undefined);
    } else {
      const next = [...entries, entry];
      setEntries(next);
      saveToStorage(next, undefined, undefined);
    }
    setShowAddModal(false);
  };

  const confirmDelete = (index) => {
    const next = entries.filter((_, i) => i !== index);
    setEntries(next);
    saveToStorage(next, undefined, undefined);
    setDeleteConfirm(null);
  };

  const sortByNum = (a, b) => (parseInt(String(a.num), 10) || 0) - (parseInt(String(b.num), 10) || 0);
  const filteredEntries = (searchList.trim()
    ? entries.filter(
        (e) =>
          (e.name && e.name.toLowerCase().includes(searchList.toLowerCase())) ||
          (e.num && String(e.num).includes(searchList))
      )
    : entries
  ).slice().sort(sortByNum);

  if (loading) {
    return (
      <div className="admin-pokedex" style={{ padding: "2rem", textAlign: "center", color: "rgba(255,255,255,0.85)" }}>
        <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: "0.5rem" }} />
        Chargement du Pokédex…
      </div>
    );
  }

  return (
    <div className="admin-pokedex">
      <section className="admin-pokedex-card">
        <h3><i className="fa-solid fa-image" aria-hidden /> Fond de la page Pokédex</h3>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "1", minWidth: "200px" }}>
            <label className="admin-pokedex-label">URL de l&apos;image de fond</label>
            <input
              type="url"
              className="admin-pokedex-input"
              value={backgroundUrl}
              onChange={(e) => handleBackgroundChange(e.target.value)}
              placeholder="https://... ou laisser vide pour l'image par défaut"
            />
          </div>
          {backgroundUrl && (
            <div style={{ width: "120px", height: "70px", borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.2)" }}>
              <img src={backgroundUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => (e.target.style.display = "none")} />
            </div>
          )}
        </div>
      </section>

      <section className="admin-pokedex-card">
        <h3><i className="fa-solid fa-bolt" aria-hidden /> Types personnalisés (filtre)</h3>
        <p style={{ margin: "0 0 1rem 0", opacity: 0.85, fontSize: "0.9rem" }}>Ajoutez des types qui apparaîtront dans le filtre en plus de ceux des Pokémon.</p>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
          {customTypes.map((t) => (
            <span key={t} className="admin-pokedex-type-chip" style={{ paddingRight: "0.5rem" }}>
              {t}
              <button type="button" onClick={() => removeCustomType(t)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", padding: "0 0.2rem", marginLeft: "0.25rem" }} aria-label="Supprimer">
                <i className="fa-solid fa-times" />
              </button>
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <input
            type="text"
            className="admin-pokedex-input"
            value={newTypeName}
            onChange={(e) => setNewTypeName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustomType()}
            placeholder="Nom du nouveau type (ex: custom)"
            style={{ maxWidth: "220px" }}
          />
          <button type="button" onClick={addCustomType} className="admin-pokedex-btn admin-pokedex-btn-primary">
            <i className="fa-solid fa-plus" /> Ajouter le type
          </button>
        </div>
      </section>

      <section className="admin-pokedex-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "1rem" }}>
          <h3 style={{ margin: 0 }}><i className="fa-solid fa-list" aria-hidden /> Liste des Pokémon ({entries.length})</h3>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: "0.25rem" }} role="group" aria-label="Affichage">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`admin-pokedex-btn ${viewMode === "grid" ? "admin-pokedex-btn-primary" : "admin-pokedex-btn-ghost"}`}
                style={{ padding: "0.45rem 0.75rem" }}
                title="Grille"
              >
                <i className="fa-solid fa-grip" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`admin-pokedex-btn ${viewMode === "table" ? "admin-pokedex-btn-primary" : "admin-pokedex-btn-ghost"}`}
                style={{ padding: "0.45rem 0.75rem" }}
                title="Tableau"
              >
                <i className="fa-solid fa-table-list" aria-hidden />
              </button>
            </div>
            <input
              type="search"
              className="admin-pokedex-input"
              value={searchList}
              onChange={(e) => setSearchList(e.target.value)}
              placeholder="Rechercher…"
              style={{ width: "180px" }}
            />
            <button type="button" onClick={openAdd} className="admin-pokedex-btn admin-pokedex-btn-primary">
              <i className="fa-solid fa-plus" /> Ajouter un Pokémon
            </button>
            {saveMessage && (
              <span style={{ color: saveMessage.type === "success" ? "#86efac" : "#fca5a5", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                {saveMessage.type === "success" ? <i className="fa-solid fa-check" /> : <i className="fa-solid fa-exclamation-triangle" />}
                {saveMessage.text}
              </span>
            )}
            <button type="button" onClick={handleSaveAll} disabled={saving} className="admin-pokedex-btn admin-pokedex-btn-ghost">
              <i className="fa-solid fa-save" /> {saving ? "Enregistrement…" : "Sauvegarder maintenant"}
            </button>
          </div>
        </div>

        {viewMode === "grid" ? (
          <div className="admin-dex-grid">
            {filteredEntries.length === 0 ? (
              <p className="admin-dex-grid-empty">Aucun Pokémon. Cliquez sur &quot;Ajouter un Pokémon&quot;.</p>
            ) : (
              filteredEntries.map((e) => {
                const globalIndex = entries.indexOf(e);
                return (
                  <div
                    key={`${e.num}-${e.name}-${globalIndex}`}
                    className="admin-dex-card"
                    role="button"
                    tabIndex={0}
                    onClick={() => openEdit(globalIndex)}
                    onKeyDown={(ev) => ev.key === "Enter" && openEdit(globalIndex)}
                  >
                    <button
                      type="button"
                      className="admin-dex-card-delete"
                      onClick={(ev) => { ev.stopPropagation(); setDeleteConfirm(globalIndex); }}
                      title="Supprimer"
                      aria-label="Supprimer"
                    >
                      <i className="fa-solid fa-trash" />
                    </button>
                    <div className="admin-dex-card-sprite">
                      {e.imageUrl ? (
                        <img src={e.imageUrl} alt="" onError={(ev) => (ev.target.style.display = "none")} />
                      ) : (
                        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "rgba(255,255,255,.3)", fontSize: "1.5rem" }}>?</span>
                      )}
                    </div>
                    <span className="admin-dex-card-num">#{e.num}</span>
                    <span className="admin-dex-card-name">{e.name}</span>
                    <span className="admin-dex-card-types">{(e.types || []).join(", ") || "—"}</span>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="admin-pokedex-table-wrap">
            <table className="admin-pokedex-table">
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Nom</th>
                  <th>Image</th>
                  <th>Types</th>
                  <th>Rareté</th>
                  <th>Obtention</th>
                  <th style={{ textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: "2rem", textAlign: "center", opacity: 0.7 }}>
                      Aucun Pokémon. Cliquez sur &quot;Ajouter un Pokémon&quot;.
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((e) => {
                    const globalIndex = entries.indexOf(e);
                    return (
                      <tr key={`${e.num}-${e.name}-${globalIndex}`}>
                        <td>{e.num}</td>
                        <td style={{ fontWeight: "600" }}>{e.name}</td>
                        <td>
                          {e.imageUrl ? (
                            <img src={e.imageUrl} alt="" onError={(ev) => (ev.target.style.display = "none")} />
                          ) : (
                            <span style={{ opacity: 0.5 }}>—</span>
                          )}
                        </td>
                        <td>{(e.types || []).join(", ") || "—"}</td>
                        <td style={{ maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis" }}>{e.rarity || "—"}</td>
                        <td style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis" }}>{e.obtention || "—"}</td>
                        <td style={{ textAlign: "center" }}>
                          <button type="button" onClick={() => openEdit(globalIndex)} className="admin-pokedex-btn admin-pokedex-btn-ghost" style={{ padding: "0.45rem 0.85rem", marginRight: "0.35rem" }}>
                            <i className="fa-solid fa-pen" aria-hidden />
                          </button>
                          <button type="button" onClick={() => setDeleteConfirm(globalIndex)} className="admin-pokedex-btn admin-pokedex-btn-danger" style={{ padding: "0.45rem 0.85rem" }}>
                            <i className="fa-solid fa-trash" aria-hidden />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal Ajout / Édition — rendu en portail pour rester au-dessus et centrée */}
      {showAddModal && createPortal(
        <div
          className="admin-pokedex-modal-overlay"
          onClick={() => setShowAddModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-pokedex-modal-title"
        >
          <div className="admin-pokedex-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-pokedex-modal-header">
              <h2 id="admin-pokedex-modal-title" className="admin-pokedex-modal-title">
                {editingIndex !== null ? "Modifier le Pokémon" : "Ajouter un Pokémon"}
              </h2>
              <button type="button" className="admin-pokedex-modal-close" onClick={() => setShowAddModal(false)} aria-label="Fermer">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <div className="admin-pokedex-modal-body">
              <div>
                <label className="admin-pokedex-label">N°</label>
                <input type="text" className="admin-pokedex-input" value={form.num} onChange={(e) => setForm((f) => ({ ...f, num: e.target.value }))} placeholder="001" />
              </div>
              <div>
                <label className="admin-pokedex-label">Nom *</label>
                <input type="text" className="admin-pokedex-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Pikachu" />
              </div>
              <div>
                <label className="admin-pokedex-label">URL image</label>
                <input type="url" className="admin-pokedex-input" value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} placeholder="https://..." />
              </div>
              <div>
                <label className="admin-pokedex-label">Types (max 2)</label>
                <div className="admin-pokedex-type-chips">
                  {allTypes.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleFormType(t)}
                      className={`admin-pokedex-type-chip ${form.types.includes(t) ? "selected" : ""}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="admin-pokedex-label">Rareté</label>
                <input type="text" className="admin-pokedex-input" value={form.rarity} onChange={(e) => setForm((f) => ({ ...f, rarity: e.target.value }))} placeholder="Évolution" />
              </div>
              <div>
                <label className="admin-pokedex-label">Obtention</label>
                <textarea className="admin-pokedex-textarea" value={form.obtention} onChange={(e) => setForm((f) => ({ ...f, obtention: e.target.value }))} placeholder="Comment obtenir ce Pokémon" rows={3} />
              </div>
            </div>
            <div className="admin-pokedex-modal-footer">
              <button type="button" onClick={() => setShowAddModal(false)} className="admin-pokedex-btn admin-pokedex-btn-ghost">
                Annuler
              </button>
              <button type="button" onClick={saveForm} className="admin-pokedex-btn admin-pokedex-btn-primary">
                <i className="fa-solid fa-check" /> {editingIndex !== null ? "Enregistrer" : "Ajouter"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Confirmation suppression */}
      {deleteConfirm !== null && createPortal(
        <div className="admin-pokedex-confirm-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="admin-pokedex-confirm-box" onClick={(e) => e.stopPropagation()}>
            <p style={{ margin: "0 0 1.25rem 0", color: "rgba(255,255,255,.9)", fontSize: "1rem" }}>
              Supprimer « {entries[deleteConfirm]?.name} » du Pokédex ?
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button type="button" onClick={() => setDeleteConfirm(null)} className="admin-pokedex-btn admin-pokedex-btn-ghost">
                Annuler
              </button>
              <button type="button" onClick={() => confirmDelete(deleteConfirm)} className="admin-pokedex-btn admin-pokedex-btn-danger">
                <i className="fa-solid fa-trash" /> Supprimer
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
