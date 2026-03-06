import { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : `${window.location.protocol}//${window.location.hostname.replace(/:\d+$/, "")}:3001/api`;

const STORAGE_ENTRIES = "admin_pokedex_entries";
const STORAGE_BACKGROUND = "admin_pokedex_background";
const STORAGE_CUSTOM_TYPES = "admin_pokedex_custom_types";

const KNOWN_TYPES = [
  "acier", "aspic", "combat", "dragon", "eau", "electr", "fee", "feu", "glace",
  "insecte", "malice", "normal", "plante", "poison", "psy", "roche", "sol",
  "spectre", "tenebres", "vol"
];

const cardStyle = {
  background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)",
  borderRadius: "16px",
  padding: "1.5rem",
  border: "1px solid rgba(102,126,234,0.2)",
  marginBottom: "1.5rem",
};
const inputStyle = {
  width: "100%",
  padding: "0.75rem 1rem",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.2)",
  background: "rgba(0,0,0,0.25)",
  color: "white",
  fontSize: "0.95rem",
};
const labelStyle = { display: "block", marginBottom: "0.4rem", fontWeight: "600", color: "rgba(255,255,255,0.9)", fontSize: "0.9rem" };
const btnBase = {
  padding: "0.6rem 1.2rem",
  borderRadius: "12px",
  border: "none",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "0.9rem",
  display: "inline-flex",
  alignItems: "center",
  gap: "0.5rem",
  transition: "all 0.2s ease",
};
const btnPrimary = { ...btnBase, background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", color: "white" };
const btnDanger = { ...btnBase, background: "rgba(239,68,68,0.2)", color: "#f87171", border: "1px solid rgba(239,68,68,0.4)" };
const btnGhost = { ...btnBase, background: "rgba(255,255,255,0.08)", color: "white", border: "1px solid rgba(255,255,255,0.2)" };

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
    }
    load();
    return () => { cancelled = true; };
  }, [initialEntries]);

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

  const filteredEntries = searchList.trim()
    ? entries.filter(
        (e) =>
          (e.name && e.name.toLowerCase().includes(searchList.toLowerCase())) ||
          (e.num && String(e.num).includes(searchList))
      )
    : entries;

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "rgba(255,255,255,0.8)" }}>
        <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: "0.5rem" }} />
        Chargement du Pokédex…
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "100%" }}>
      {/* Fond de la page */}
      <section style={cardStyle}>
        <h3 style={{ margin: "0 0 1rem 0", color: "#667eea", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <i className="fa-solid fa-image" /> Fond de la page Pokédex
        </h3>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "1", minWidth: "200px" }}>
            <label style={labelStyle}>URL de l&apos;image de fond</label>
            <input
              type="url"
              value={backgroundUrl}
              onChange={(e) => handleBackgroundChange(e.target.value)}
              placeholder="https://... ou laisser vide pour l'image par défaut"
              style={inputStyle}
            />
          </div>
          {backgroundUrl && (
            <div style={{ width: "120px", height: "70px", borderRadius: "8px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.2)" }}>
              <img src={backgroundUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => (e.target.style.display = "none")} />
            </div>
          )}
        </div>
      </section>

      {/* Types personnalisés */}
      <section style={cardStyle}>
        <h3 style={{ margin: "0 0 1rem 0", color: "#667eea", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <i className="fa-solid fa-bolt" /> Types personnalisés (filtre)
        </h3>
        <p style={{ margin: "0 0 1rem 0", opacity: 0.8, fontSize: "0.9rem" }}>Ajoutez des types qui apparaîtront dans le filtre en plus de ceux des Pokémon.</p>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
          {customTypes.map((t) => (
            <span
              key={t}
              style={{
                padding: "0.4rem 0.75rem",
                background: "rgba(102,126,234,0.2)",
                borderRadius: "999px",
                fontSize: "0.85rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              {t}
              <button type="button" onClick={() => removeCustomType(t)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", padding: "0 0.2rem" }} aria-label="Supprimer">
                <i className="fa-solid fa-times" />
              </button>
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            type="text"
            value={newTypeName}
            onChange={(e) => setNewTypeName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustomType()}
            placeholder="Nom du nouveau type (ex: custom)"
            style={{ ...inputStyle, maxWidth: "220px" }}
          />
          <button type="button" onClick={addCustomType} style={btnPrimary}>
            <i className="fa-solid fa-plus" /> Ajouter le type
          </button>
        </div>
      </section>

      {/* Liste des Pokémon */}
      <section style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "1rem" }}>
          <h3 style={{ margin: 0, color: "#667eea", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <i className="fa-solid fa-list" /> Liste des Pokémon ({entries.length})
          </h3>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <input
              type="search"
              value={searchList}
              onChange={(e) => setSearchList(e.target.value)}
              placeholder="Rechercher…"
              style={{ ...inputStyle, width: "180px" }}
            />
            <button type="button" onClick={openAdd} style={btnPrimary}>
              <i className="fa-solid fa-plus" /> Ajouter un Pokémon
            </button>
            {saveMessage && (
              <span style={{ marginRight: "1rem", color: saveMessage.type === "success" ? "#86efac" : "#fca5a5", fontSize: "0.9rem" }}>
                {saveMessage.type === "success" ? <i className="fa-solid fa-check" /> : <i className="fa-solid fa-exclamation-triangle" />}
                {" "}{saveMessage.text}
              </span>
            )}
            <button type="button" onClick={handleSaveAll} disabled={saving} style={btnGhost}>
              <i className="fa-solid fa-save" /> {saving ? "Enregistrement…" : "Sauvegarder dans le JSON"}
            </button>
          </div>
        </div>

        <div style={{ overflowX: "auto", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ background: "rgba(102,126,234,0.15)", borderBottom: "2px solid rgba(102,126,234,0.3)" }}>
                <th style={{ textAlign: "left", padding: "0.75rem" }}>N°</th>
                <th style={{ textAlign: "left", padding: "0.75rem" }}>Nom</th>
                <th style={{ textAlign: "left", padding: "0.75rem" }}>Image</th>
                <th style={{ textAlign: "left", padding: "0.75rem" }}>Types</th>
                <th style={{ textAlign: "left", padding: "0.75rem" }}>Rareté</th>
                <th style={{ textAlign: "left", padding: "0.75rem" }}>Obtention</th>
                <th style={{ textAlign: "center", padding: "0.75rem" }}>Actions</th>
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
                filteredEntries.map((e, i) => {
                  const globalIndex = entries.indexOf(e);
                  return (
                    <tr key={`${e.num}-${e.name}-${globalIndex}`} style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      <td style={{ padding: "0.6rem 0.75rem" }}>{e.num}</td>
                      <td style={{ padding: "0.6rem 0.75rem", fontWeight: "600" }}>{e.name}</td>
                      <td style={{ padding: "0.6rem 0.75rem" }}>
                        {e.imageUrl ? (
                          <img src={e.imageUrl} alt="" style={{ width: "40px", height: "40px", objectFit: "contain" }} onError={(ev) => (ev.target.style.display = "none")} />
                        ) : (
                          <span style={{ opacity: 0.5 }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "0.6rem 0.75rem" }}>{(e.types || []).join(", ") || "—"}</td>
                      <td style={{ padding: "0.6rem 0.75rem", maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis" }}>{e.rarity || "—"}</td>
                      <td style={{ padding: "0.6rem 0.75rem", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis" }}>{e.obtention || "—"}</td>
                      <td style={{ padding: "0.6rem 0.75rem", textAlign: "center" }}>
                        <button type="button" onClick={() => openEdit(globalIndex)} style={{ ...btnGhost, padding: "0.4rem 0.8rem", marginRight: "0.4rem" }}>
                          <i className="fa-solid fa-pen" />
                        </button>
                        <button type="button" onClick={() => setDeleteConfirm(globalIndex)} style={{ ...btnDanger, padding: "0.4rem 0.8rem" }}>
                          <i className="fa-solid fa-trash" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal Ajout / Édition */}
      {showAddModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
              borderRadius: "20px",
              padding: "2rem",
              maxWidth: "480px",
              width: "100%",
              border: "1px solid rgba(102,126,234,0.3)",
              boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 1.25rem 0", color: "#667eea" }}>
              {editingIndex !== null ? "Modifier le Pokémon" : "Ajouter un Pokémon"}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={labelStyle}>N°</label>
                <input type="text" value={form.num} onChange={(e) => setForm((f) => ({ ...f, num: e.target.value }))} placeholder="001" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Nom *</label>
                <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Pikachu" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>URL image</label>
                <input type="url" value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} placeholder="https://..." style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Types (max 2)</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                  {allTypes.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleFormType(t)}
                      style={{
                        ...btnGhost,
                        padding: "0.4rem 0.7rem",
                        background: form.types.includes(t) ? "rgba(102,126,234,0.4)" : undefined,
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Rareté</label>
                <input type="text" value={form.rarity} onChange={(e) => setForm((f) => ({ ...f, rarity: e.target.value }))} placeholder="Évolution" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Obtention</label>
                <textarea value={form.obtention} onChange={(e) => setForm((f) => ({ ...f, obtention: e.target.value }))} placeholder="Comment obtenir ce Pokémon" style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }} rows={3} />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
              <button type="button" onClick={() => setShowAddModal(false)} style={btnGhost}>
                Annuler
              </button>
              <button type="button" onClick={saveForm} style={btnPrimary}>
                <i className="fa-solid fa-check" /> {editingIndex !== null ? "Enregistrer" : "Ajouter"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation suppression */}
      {deleteConfirm !== null && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1001,
            padding: "1rem",
          }}
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
              borderRadius: "16px",
              padding: "1.5rem 2rem",
              maxWidth: "400px",
              border: "1px solid rgba(239,68,68,0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p style={{ margin: "0 0 1rem 0" }}>Supprimer « {entries[deleteConfirm]?.name} » du Pokédex ?</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button type="button" onClick={() => setDeleteConfirm(null)} style={btnGhost}>
                Annuler
              </button>
              <button type="button" onClick={() => confirmDelete(deleteConfirm)} style={btnDanger}>
                <i className="fa-solid fa-trash" /> Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
