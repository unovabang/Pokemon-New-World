import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:3001/api`
    : `${window.location.origin}/api`;

const STORAGE_ENTRIES = "admin_extradex_entries";
const STORAGE_TITLE = "admin_extradex_title";

const KNOWN_TYPES = [
  "acier", "aspic", "combat", "dragon", "eau", "electr", "fee", "feu", "glace",
  "insecte", "malice", "normal", "plante", "poison", "psy", "roche", "sol",
  "spectre", "tenebres", "vol"
];

export default function ExtradexEditor({ initialData = {}, onSave }) {
  const [title, setTitle] = useState(initialData.title || "Extradex");
  const [entries, setEntries] = useState([]);
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
        const res = await fetch(`${API_BASE}/extradex?t=${Date.now()}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.success && data.extradex) {
          setTitle(data.extradex.title || "Extradex");
          setEntries(Array.isArray(data.extradex.entries) ? data.extradex.entries : []);
          setLoading(false);
          return;
        }
      } catch (_) {
        if (cancelled) return;
      }
      try {
        const raw = localStorage.getItem(STORAGE_ENTRIES);
        const t = localStorage.getItem(STORAGE_TITLE);
        if (raw) {
          const parsed = JSON.parse(raw);
          setEntries(Array.isArray(parsed) ? parsed : []);
        } else {
          setEntries(Array.isArray(initialData?.entries) ? initialData.entries : []);
        }
        if (t) setTitle(t);
        else if (initialData?.title) setTitle(initialData.title);
      } catch {
        setEntries(Array.isArray(initialData?.entries) ? initialData.entries : []);
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [initialData?.entries, initialData?.title]);

  const allTypes = [...KNOWN_TYPES].sort((a, b) => a.localeCompare(b));

  const saveToStorage = (newEntries, newTitle) => {
    const ents = newEntries ?? entries;
    const t = newTitle !== undefined ? newTitle : title;
    localStorage.setItem(STORAGE_ENTRIES, JSON.stringify(ents));
    localStorage.setItem(STORAGE_TITLE, t);
    onSave?.({ title: t, entries: ents });
  };

  const handleSaveAll = async () => {
    setSaveMessage(null);
    setSaving(true);
    saveToStorage();
    try {
      const res = await fetch(`${API_BASE}/extradex`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          entries,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveMessage({ type: "success", text: "Extradex enregistré dans le fichier JSON." });
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
      saveToStorage(next, undefined);
    } else {
      const next = [...entries, entry];
      setEntries(next);
      saveToStorage(next, undefined);
    }
    setShowAddModal(false);
  };

  const confirmDelete = (index) => {
    const next = entries.filter((_, i) => i !== index);
    setEntries(next);
    saveToStorage(next, undefined);
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
      <div className="admin-pokedex" style={{ padding: "2rem", textAlign: "center", color: "rgba(255,255,255,0.85)" }}>
        <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: "0.5rem" }} />
        Chargement de l&apos;Extradex…
      </div>
    );
  }

  return (
    <div className="admin-pokedex">
      <section className="admin-pokedex-card">
        <h3><i className="fa-solid fa-heading" aria-hidden /> Titre de l&apos;Extradex</h3>
        <div style={{ maxWidth: "400px" }}>
          <label className="admin-pokedex-label">Titre affiché</label>
          <input
            type="text"
            className="admin-pokedex-input"
            value={title}
            onChange={(e) => {
              const v = e.target.value;
              setTitle(v);
              saveToStorage(undefined, v);
            }}
            placeholder="Extradex"
          />
        </div>
      </section>

      <section className="admin-pokedex-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "1rem" }}>
          <h3 style={{ margin: 0 }}><i className="fa-solid fa-star" aria-hidden /> Liste des créatures ({entries.length})</h3>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="search"
              className="admin-pokedex-input"
              value={searchList}
              onChange={(e) => setSearchList(e.target.value)}
              placeholder="Rechercher…"
              style={{ width: "180px" }}
            />
            <button type="button" onClick={openAdd} className="admin-pokedex-btn admin-pokedex-btn-primary">
              <i className="fa-solid fa-plus" /> Ajouter une créature
            </button>
            {saveMessage && (
              <span style={{ color: saveMessage.type === "success" ? "#86efac" : "#fca5a5", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                {saveMessage.type === "success" ? <i className="fa-solid fa-check" /> : <i className="fa-solid fa-exclamation-triangle" />}
                {saveMessage.text}
              </span>
            )}
            <button type="button" onClick={handleSaveAll} disabled={saving} className="admin-pokedex-btn admin-pokedex-btn-ghost">
              <i className="fa-solid fa-save" /> {saving ? "Enregistrement…" : "Sauvegarder dans le JSON"}
            </button>
          </div>
        </div>

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
                    Aucune créature. Cliquez sur &quot;Ajouter une créature&quot;.
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
      </section>

      {/* Modal Ajout / Édition */}
      {showAddModal && createPortal(
        <div
          className="admin-pokedex-modal-overlay"
          onClick={() => setShowAddModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-extradex-modal-title"
        >
          <div className="admin-pokedex-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-pokedex-modal-header">
              <h2 id="admin-extradex-modal-title" className="admin-pokedex-modal-title">
                {editingIndex !== null ? "Modifier la créature" : "Ajouter une créature"}
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
                <input type="text" className="admin-pokedex-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Broussatif" />
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
                <input type="text" className="admin-pokedex-input" value={form.rarity} onChange={(e) => setForm((f) => ({ ...f, rarity: e.target.value }))} placeholder="Optionnel" />
              </div>
              <div>
                <label className="admin-pokedex-label">Obtention</label>
                <textarea className="admin-pokedex-textarea" value={form.obtention} onChange={(e) => setForm((f) => ({ ...f, obtention: e.target.value }))} placeholder="Comment obtenir cette créature" rows={3} />
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
              Supprimer « {entries[deleteConfirm]?.name} » de l&apos;Extradex ?
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
