import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

const STORAGE_BST = "admin_bst_data";

const SECTIONS = [
  { id: "fakemon", label: "Fakemon + Formes Régionales", icon: "fa-leaf" },
  { id: "megas", label: "Nouvelles Mégas", icon: "fa-bolt" },
  { id: "speciaux", label: "Pokémons Spéciaux", icon: "fa-star" },
];

const STAT_ICONS = {
  hp: "fa-heart-pulse",
  atk: "fa-hand-fist",
  def: "fa-shield",
  spa: "fa-wand-magic-sparkles",
  spd: "fa-gem",
  spe: "fa-gauge-high",
};

const PLACEHOLDER_SPRITE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'%3E%3Crect fill='%23333' width='64' height='64' rx='8'/%3E%3Ctext x='32' y='38' fill='%23666' font-size='20' text-anchor='middle' font-family='sans-serif'%3E?%3C/text%3E%3C/svg%3E";

const emptyEntry = () => ({
  name: "",
  type: "",
  imageUrl: "",
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

/** Normalise un nom pour la recherche (accents, espaces, tirets) */
function normalizeName(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

/** Trouve l'entrée pokedex par nom (pour récupérer l'image en fallback) */
function findPokedexEntry(name, entries) {
  if (!name || !entries?.length) return null;
  const n = normalizeName(name);
  let e = entries.find((x) => normalizeName(x.name) === n);
  if (e) return e;
  const nAlt = n.replace(/\s+/g, "-");
  e = entries.find((x) => normalizeName(x.name) === nAlt || normalizeName(x.name).replace(/\s+/g, "-") === n);
  if (e) return e;
  const baseName = n.replace(/^mega\s*-?\s*/i, "").trim();
  e = entries.find((x) => normalizeName(x.name) === baseName);
  if (e) return e;
  e = entries.find((x) => n.includes(normalizeName(x.name)) || normalizeName(x.name).includes(n));
  return e || null;
}

export default function BSTEditor({ initialData, initialPokedexEntries = [], onSave }) {
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
  const pokedexListForLookup = Array.isArray(initialPokedexEntries) ? initialPokedexEntries : [];

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
      imageUrl: e.imageUrl || "",
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

        <div className="admin-bst-grid">
          {filteredEntries.length === 0 ? (
            <p className="admin-bst-empty">
              Aucune entrée. Cliquez sur &quot;Ajouter&quot; ou sur une carte pour modifier.
            </p>
          ) : (
            filteredEntries.map((e) => {
              const globalIndex = entries.indexOf(e);
              const pokedexEntry = findPokedexEntry(e.name, pokedexListForLookup);
              const spriteUrl = e.imageUrl || pokedexEntry?.imageUrl || PLACEHOLDER_SPRITE;
              return (
                <div
                  key={`${e.name}-${globalIndex}`}
                  className="admin-bst-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => openEdit(globalIndex)}
                  onKeyDown={(ev) => ev.key === "Enter" && openEdit(globalIndex)}
                >
                  <div className="admin-bst-card-sprite">
                    <img src={spriteUrl} alt="" onError={(ev) => { ev.target.src = PLACEHOLDER_SPRITE; }} />
                  </div>
                  <div className="admin-bst-card-main">
                    <span className="admin-bst-card-name">{e.name}</span>
                    <span className="admin-bst-card-type">{e.type || "—"}</span>
                    <span className="admin-bst-card-total">
                      <i className="fa-solid fa-calculator" aria-hidden /> {e.total}
                    </span>
                    {(e.ability || "").trim() && (
                      <p className="admin-bst-card-ability" title={e.ability}>
                        {(e.ability || "").slice(0, 60)}{(e.ability || "").length > 60 ? "…" : ""}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="admin-bst-card-delete"
                    onClick={(ev) => { ev.stopPropagation(); setDeleteConfirm(globalIndex); }}
                    title="Supprimer"
                    aria-label="Supprimer"
                  >
                    <i className="fa-solid fa-trash" />
                  </button>
                </div>
              );
            })
          )}
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
                <label className="admin-pokedex-label">URL image (sprite)</label>
                <input type="url" className="admin-pokedex-input" value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} placeholder="https://... ou chemin vers le sprite" />
                {form.imageUrl && (
                  <div className="admin-bst-modal-preview">
                    <img src={form.imageUrl} alt="" onError={(ev) => { ev.target.style.display = "none"; }} />
                  </div>
                )}
              </div>
              <div>
                <label className="admin-pokedex-label">Type</label>
                <input type="text" className="admin-pokedex-input" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} placeholder="Plante/Combat" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
                {["hp", "atk", "def", "spa", "spd", "spe"].map((key) => (
                  <div key={key}>
                    <label className="admin-pokedex-label"><i className={`fa-solid ${STAT_ICONS[key] || "fa-circle"}`} aria-hidden /> {key.toUpperCase()}</label>
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
                <label className="admin-pokedex-label"><i className="fa-solid fa-star" aria-hidden /> Talent</label>
                <input type="text" className="admin-pokedex-input" value={form.ability} onChange={(e) => setForm((f) => ({ ...f, ability: e.target.value }))} placeholder="Nom du talent" />
              </div>
              <div>
                <label className="admin-pokedex-label"><i className="fa-solid fa-book" aria-hidden /> Description talent</label>
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
