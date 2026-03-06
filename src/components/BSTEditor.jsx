import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

const STORAGE_BST = "admin_bst_data";

const SECTIONS = [
  { id: "fakemon", label: "Fakemon + Formes Régionales", icon: "fa-leaf" },
  { id: "megas", label: "Nouvelles Mégas", icon: "fa-bolt" },
  { id: "speciaux", label: "Pokémons Spéciaux", icon: "fa-star" },
];

const emptyEntry = () => ({
  name: "",
  type: "",
  hp: "0",
  atk: "0",
  def: "0",
  spa: "0",
  spd: "0",
  spe: "0",
  total: "0",
  ability: "",
  abilityDesc: "",
  attacks: "",
});

function computeTotal(hp, atk, def, spa, spd, spe) {
  const n = (v) => parseInt(String(v), 10) || 0;
  return String(n(hp) + n(atk) + n(def) + n(spa) + n(spd) + n(spe));
}

export default function BSTEditor({ initialData, onSave }) {
  const [data, setData] = useState({ fakemon: [], megas: [], speciaux: [] });
  const [activeSection, setActiveSection] = useState("fakemon");
  const [showModal, setShowModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [form, setForm] = useState(emptyEntry());
  const [searchQuery, setSearchQuery] = useState("");
  const [saveMessage, setSaveMessage] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_BST);
      if (raw) {
        const parsed = JSON.parse(raw);
        setData({
          fakemon: Array.isArray(parsed.fakemon) ? parsed.fakemon : [],
          megas: Array.isArray(parsed.megas) ? parsed.megas : [],
          speciaux: Array.isArray(parsed.speciaux) ? parsed.speciaux : [],
        });
      } else if (initialData) {
        setData({
          fakemon: Array.isArray(initialData.fakemon) ? initialData.fakemon : [],
          megas: Array.isArray(initialData.megas) ? initialData.megas : [],
          speciaux: Array.isArray(initialData.speciaux) ? initialData.speciaux : [],
        });
      }
    } catch {
      if (initialData) setData(initialData);
    }
  }, [initialData]);

  const saveToStorage = (newData) => {
    const next = newData ?? data;
    setData(next);
    localStorage.setItem(STORAGE_BST, JSON.stringify(next));
    onSave?.(next);
  };

  const entries = data[activeSection] || [];
  const filteredEntries = searchQuery.trim()
    ? entries.filter((e) =>
        (e.name || "").toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : entries;

  const openAdd = () => {
    setForm(emptyEntry());
    setEditingIndex(null);
    setShowModal(true);
  };

  const openEdit = (index) => {
    const e = entries[index];
    setForm({
      name: e.name || "",
      type: e.type || "",
      hp: String(e.hp ?? 0),
      atk: String(e.atk ?? 0),
      def: String(e.def ?? 0),
      spa: String(e.spa ?? 0),
      spd: String(e.spd ?? 0),
      spe: String(e.spe ?? 0),
      total: String(e.total ?? 0),
      ability: e.ability || "",
      abilityDesc: e.abilityDesc || "",
      attacks: e.attacks || "",
    });
    setEditingIndex(index);
    setShowModal(true);
  };

  const updateFormStat = (key, value) => {
    setForm((f) => {
      const next = { ...f, [key]: value };
      next.total = computeTotal(next.hp, next.atk, next.def, next.spa, next.spd, next.spe);
      return next;
    });
  };

  const saveForm = () => {
    if (!form.name.trim()) return;
    const entry = {
      name: form.name.trim(),
      type: (form.type || "").trim(),
      hp: String(form.hp).trim() || "0",
      atk: String(form.atk).trim() || "0",
      def: String(form.def).trim() || "0",
      spa: String(form.spa).trim() || "0",
      spd: String(form.spd).trim() || "0",
      spe: String(form.spe).trim() || "0",
      total: form.total || computeTotal(form.hp, form.atk, form.def, form.spa, form.spd, form.spe),
      ability: (form.ability || "").trim(),
      abilityDesc: (form.abilityDesc || "").trim(),
      attacks: (form.attacks || "").trim() || undefined,
    };
    const next = { ...data };
    const list = [...(next[activeSection] || [])];
    if (editingIndex !== null) {
      list[editingIndex] = entry;
    } else {
      list.push(entry);
    }
    next[activeSection] = list;
    saveToStorage(next);
    setShowModal(false);
  };

  const confirmDelete = (index) => {
    const list = entries.filter((_, i) => i !== index);
    const next = { ...data, [activeSection]: list };
    saveToStorage(next);
    setDeleteConfirm(null);
  };

  return (
    <div className="admin-pokedex">
      <section className="admin-pokedex-card">
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveSection(s.id)}
              className={`admin-panel-nav-btn ${activeSection === s.id ? "admin-panel-nav-btn--active" : ""}`}
              style={{ padding: "0.5rem 1rem", fontSize: "0.9rem" }}
            >
              <i className={`fa-solid ${s.icon}`} aria-hidden /> {s.label}
            </button>
          ))}
        </div>
      </section>

      <section className="admin-pokedex-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "1rem" }}>
          <h3 style={{ margin: 0 }}>
            <i className="fa-solid fa-list" aria-hidden /> Liste ({entries.length})
          </h3>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="search"
              className="admin-pokedex-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par nom…"
              style={{ width: "200px" }}
            />
            <button type="button" onClick={openAdd} className="admin-pokedex-btn admin-pokedex-btn-primary">
              <i className="fa-solid fa-plus" /> Ajouter
            </button>
            {saveMessage && (
              <span style={{ color: saveMessage.type === "success" ? "#86efac" : "#fca5a5", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <i className={`fa-solid ${saveMessage.type === "success" ? "fa-check" : "fa-exclamation-triangle"}`} />
                {saveMessage.text}
              </span>
            )}
          </div>
        </div>

        <div className="admin-pokedex-table-wrap">
          <table className="admin-pokedex-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Type</th>
                <th>PV</th>
                <th>ATK</th>
                <th>DEF</th>
                <th>ATK SPE</th>
                <th>DEF SPE</th>
                <th>SPE</th>
                <th>Total</th>
                <th>Talent</th>
                <th style={{ textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ padding: "2rem", textAlign: "center", opacity: 0.7 }}>
                    Aucune entrée. Cliquez sur &quot;Ajouter&quot;.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((e) => {
                  const globalIndex = entries.indexOf(e);
                  return (
                    <tr key={`${e.name}-${globalIndex}`}>
                      <td style={{ fontWeight: "600" }}>{e.name}</td>
                      <td>{e.type || "—"}</td>
                      <td>{e.hp}</td>
                      <td>{e.atk}</td>
                      <td>{e.def}</td>
                      <td>{e.spa}</td>
                      <td>{e.spd}</td>
                      <td>{e.spe}</td>
                      <td><strong>{e.total}</strong></td>
                      <td style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis" }} title={e.ability}>{e.ability || "—"}</td>
                      <td style={{ textAlign: "center" }}>
                        <button type="button" onClick={() => openEdit(globalIndex)} className="admin-pokedex-btn admin-pokedex-btn-ghost" style={{ padding: "0.45rem 0.85rem", marginRight: "0.35rem" }} title="Modifier">
                          <i className="fa-solid fa-pen" aria-hidden />
                        </button>
                        <button type="button" onClick={() => setDeleteConfirm(globalIndex)} className="admin-pokedex-btn admin-pokedex-btn-danger" style={{ padding: "0.45rem 0.85rem" }} title="Supprimer">
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

      {showModal && createPortal(
        <div
          className="admin-pokedex-modal-overlay"
          onClick={() => setShowModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-bst-modal-title"
        >
          <div className="admin-pokedex-modal admin-bst-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "560px" }}>
            <div className="admin-pokedex-modal-header">
              <h2 id="admin-bst-modal-title" className="admin-pokedex-modal-title">
                {editingIndex !== null ? "Modifier l'entrée" : "Ajouter une entrée"}
              </h2>
              <button type="button" className="admin-pokedex-modal-close" onClick={() => setShowModal(false)} aria-label="Fermer">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <div className="admin-pokedex-modal-body">
              <div>
                <label className="admin-pokedex-label">Nom *</label>
                <input type="text" className="admin-pokedex-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Noctulero" />
              </div>
              <div>
                <label className="admin-pokedex-label">Type</label>
                <input type="text" className="admin-pokedex-input" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} placeholder="Plante/Combat" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
                {["hp", "atk", "def", "spa", "spd", "spe"].map((key) => (
                  <div key={key}>
                    <label className="admin-pokedex-label">{key.toUpperCase()}</label>
                    <input
                      type="number"
                      min="0"
                      className="admin-pokedex-input"
                      value={form[key]}
                      onChange={(e) => updateFormStat(key, e.target.value)}
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className="admin-pokedex-label">Total (calculé)</label>
                <input type="text" className="admin-pokedex-input" value={form.total} readOnly style={{ opacity: 0.9 }} />
              </div>
              <div>
                <label className="admin-pokedex-label">Talent</label>
                <input type="text" className="admin-pokedex-input" value={form.ability} onChange={(e) => setForm((f) => ({ ...f, ability: e.target.value }))} placeholder="Nom du talent" />
              </div>
              <div>
                <label className="admin-pokedex-label">Description talent</label>
                <textarea className="admin-pokedex-textarea" value={form.abilityDesc} onChange={(e) => setForm((f) => ({ ...f, abilityDesc: e.target.value }))} placeholder="Description ou variante" rows={2} />
              </div>
              <div>
                <label className="admin-pokedex-label">Détails des attaques / notes</label>
                <textarea className="admin-pokedex-textarea" value={form.attacks} onChange={(e) => setForm((f) => ({ ...f, attacks: e.target.value }))} placeholder="Attaques, couverture, etc. (optionnel)" rows={3} />
              </div>
            </div>
            <div className="admin-pokedex-modal-footer">
              <button type="button" onClick={() => setShowModal(false)} className="admin-pokedex-btn admin-pokedex-btn-ghost">
                Annuler
              </button>
              <button type="button" onClick={saveForm} className="admin-pokedex-btn admin-pokedex-btn-primary" disabled={!form.name.trim()}>
                <i className="fa-solid fa-check" /> {editingIndex !== null ? "Enregistrer" : "Ajouter"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {deleteConfirm !== null && createPortal(
        <div className="admin-pokedex-confirm-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="admin-pokedex-confirm-box" onClick={(e) => e.stopPropagation()}>
            <p style={{ margin: "0 0 1.25rem 0", color: "rgba(255,255,255,.9)", fontSize: "1rem" }}>
              Supprimer « {entries[deleteConfirm]?.name} » ?
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
