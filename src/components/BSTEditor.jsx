import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { authHeaders } from "../utils/authHeaders";

const AUTO_SAVE_DELAY_MS = 0;

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : `${window.location.origin}/api`;

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

/** Normalise les talents : supporte l'ancien format (arrays séparés) et le nouveau format (objets). */
function normalizeAbilities(e) {
  if (Array.isArray(e?.talents)) {
    return { talents: e.talents.map((t) => ({ name: t.name || "", desc: t.desc || "", hidden: !!t.hidden })) };
  }
  const abilities = Array.isArray(e?.abilities) ? [...e.abilities] : [];
  const abilityDescs = Array.isArray(e?.abilityDescs) ? [...e.abilityDescs] : [];
  if (abilities.length === 0 && e?.ability != null && e.ability !== "") {
    abilities[0] = e.ability ?? "";
    if (abilityDescs.length < 1) abilityDescs[0] = e?.abilityDesc ?? "";
  }
  const talents = [];
  for (let i = 0; i < Math.max(abilities.length, abilityDescs.length, 3); i++) {
    talents.push({ name: (abilities[i] || "").trim(), desc: (abilityDescs[i] || "").trim(), hidden: i === 2 });
  }
  return { talents };
}

/** Normalise les attaques : supporte l'ancien format (string) et le nouveau format (tableau d'objets). */
function normalizeAttacks(e) {
  if (Array.isArray(e?.attacks)) {
    return e.attacks.map((a) => ({ name: a.name || "", desc: a.desc || "" }));
  }
  const attacksStr = (e?.attacks || "").trim();
  if (!attacksStr) return [{ name: "", desc: "" }];
  const lines = attacksStr.split(/\n/).filter((l) => l.trim());
  const attacks = [];
  for (const line of lines) {
    const match = line.match(/^(?:\d+\))\s*([^:]+)(?:\s*:\s*(.*))?$/);
    if (match) {
      attacks.push({ name: match[1].trim(), desc: (match[2] || "").trim() });
    } else {
      attacks.push({ name: line.trim(), desc: "" });
    }
  }
  return attacks.length > 0 ? attacks : [{ name: "", desc: "" }];
}

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
  talents: [{ name: "", desc: "", hidden: false }],
  attacks: [{ name: "", desc: "" }],
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

const TYPE_COLORS = {
  plante: "#7ec850", feu: "#f08030", eau: "#6890f0", glace: "#98d8d8", malice: "#705898",
  poison: "#a040a0", vol: "#a890f0", dragon: "#7038f8", sol: "#e0c068", combat: "#c03028",
  spectre: "#705898", psy: "#f85888", electrik: "#f8d030", electr: "#f8d030", fee: "#ee99ac",
  tenebres: "#705848", roche: "#b8a038", acier: "#b8b8d0", normal: "#a8a878", insecte: "#a8b820",
  aspic: "#a08060", neant: "#5a5a8a",
};
const TYPE_LABELS = {
  plante: "Plante", feu: "Feu", eau: "Eau", glace: "Glace", malice: "Malice",
  poison: "Poison", vol: "Vol", dragon: "Dragon", sol: "Sol", combat: "Combat",
  spectre: "Spectre", psy: "Psy", electrik: "Électrik", electr: "Électrik",
  fee: "Fée", tenebres: "Ténèbres", roche: "Roche", acier: "Acier",
  normal: "Normal", insecte: "Insecte", aspic: "Aspic", neant: "Néant",
};
function getTypeKey(label) {
  return Object.entries(TYPE_LABELS).find(
    ([, v]) => v.toLowerCase() === (label || "").toLowerCase()
  )?.[0] || (label || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, "") || "normal";
}
/** Couleur pour types personnalisés : dérivée du nom (même logique que la page publique). */
const FALLBACK_TYPE_COLORS = ["#e91e63", "#9c27b0", "#673ab7", "#00bcd4", "#009688", "#8bc34a", "#ff9800", "#ff5722", "#795548", "#607d8b"];
function getColorForType(label) {
  const key = getTypeKey(label);
  if (TYPE_COLORS[key]) return TYPE_COLORS[key];
  let h = 0;
  const s = (key || "").toLowerCase();
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i) | 0;
  return FALLBACK_TYPE_COLORS[Math.abs(h) % FALLBACK_TYPE_COLORS.length];
}
/** Parse le champ type BST (ex. "Eau/Psy") en libellés pour affichage aligné avec la page publique. */
function parseTypeLabels(typeStr) {
  const str = (typeStr || "").trim();
  if (!str) return [];
  return str
    .split(/[/\s]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((part) => TYPE_LABELS[getTypeKey(part)] || part);
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
  const [data, setData] = useState({ fakemon: [], megas: [], speciaux: [], background: "" });
  const [pokedexEntries, setPokedexEntries] = useState(() => (Array.isArray(initialPokedexEntries) ? initialPokedexEntries : []));
  const [activeSection, setActiveSection] = useState("fakemon");
  const [showModal, setShowModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [form, setForm] = useState(emptyEntry());
  const [searchQuery, setSearchQuery] = useState("");
  const [saveMessage, setSaveMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  const initialLoadDone = useRef(false);
  const skipNextAutoSave = useRef(true);
  const dataRef = useRef({ fakemon: [], megas: [], speciaux: [], background: "" });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [bstRes, pokedexRes] = await Promise.all([
          fetch(`${API_BASE}/bst?t=${Date.now()}`).then((r) => r.json()),
          fetch(`${API_BASE}/pokedex?t=${Date.now()}`).then((r) => r.json()),
        ]);
        if (cancelled) return;
        if (bstRes.success && bstRes.bst) {
          setData({
            fakemon: Array.isArray(bstRes.bst.fakemon) ? bstRes.bst.fakemon : [],
            megas: Array.isArray(bstRes.bst.megas) ? bstRes.bst.megas : [],
            speciaux: Array.isArray(bstRes.bst.speciaux) ? bstRes.bst.speciaux : [],
            background: bstRes.bst.background ?? "",
          });
          initialLoadDone.current = true;
        } else {
          try {
            const raw = localStorage.getItem(STORAGE_BST);
            if (raw) {
              const parsed = JSON.parse(raw);
              setData({
                fakemon: Array.isArray(parsed.fakemon) ? parsed.fakemon : [],
                megas: Array.isArray(parsed.megas) ? parsed.megas : [],
                speciaux: Array.isArray(parsed.speciaux) ? parsed.speciaux : [],
                background: parsed.background ?? "",
              });
            } else if (initialData) {
              setData({
                fakemon: Array.isArray(initialData.fakemon) ? initialData.fakemon : [],
                megas: Array.isArray(initialData.megas) ? initialData.megas : [],
                speciaux: Array.isArray(initialData.speciaux) ? initialData.speciaux : [],
                background: initialData.background ?? "",
              });
            }
          } catch {
            if (initialData) setData({ ...initialData, background: initialData.background ?? "" });
          }
          initialLoadDone.current = true;
        }
        if (pokedexRes.success && pokedexRes.pokedex && Array.isArray(pokedexRes.pokedex.entries)) {
          setPokedexEntries(pokedexRes.pokedex.entries);
        }
      } catch (_) {
        if (cancelled) return;
        try {
          const raw = localStorage.getItem(STORAGE_BST);
          if (raw) {
            const parsed = JSON.parse(raw);
            setData({
              fakemon: Array.isArray(parsed.fakemon) ? parsed.fakemon : [],
              megas: Array.isArray(parsed.megas) ? parsed.megas : [],
              speciaux: Array.isArray(parsed.speciaux) ? parsed.speciaux : [],
              background: parsed.background ?? "",
            });
          } else if (initialData) {
            setData({
              fakemon: Array.isArray(initialData.fakemon) ? initialData.fakemon : [],
              megas: Array.isArray(initialData.megas) ? initialData.megas : [],
              speciaux: Array.isArray(initialData.speciaux) ? initialData.speciaux : [],
              background: initialData.background ?? "",
            });
          }
        } catch {
          if (initialData) setData({ ...initialData, background: initialData.background ?? "" });
        }
        initialLoadDone.current = true;
      }
    }
    load();
    return () => { cancelled = true; };
  }, [initialData]);

  dataRef.current = data;

  useEffect(() => {
    if (!initialLoadDone.current) return;
    if (skipNextAutoSave.current) {
      skipNextAutoSave.current = false;
      return;
    }
    const timer = setTimeout(async () => {
      const payload = dataRef.current;
      setSaving(true);
      setSaveMessage(null);
      try {
        const res = await fetch(`${API_BASE}/bst`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (json.success) {
          setSaveMessage({ type: "success", text: "Sauvegardé automatiquement." });
          setTimeout(() => setSaveMessage(null), 2500);
        } else {
          setSaveMessage({ type: "error", text: json.error || "Erreur serveur." });
        }
      } catch {
        setSaveMessage({ type: "error", text: "Serveur indisponible." });
      } finally {
        setSaving(false);
      }
    }, AUTO_SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [data]);

  const saveToApiNow = () => {
    setSaving(true);
    setSaveMessage(null);
    fetch(`${API_BASE}/bst`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(data),
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setSaveMessage({ type: "success", text: "BST enregistré." });
          setTimeout(() => setSaveMessage(null), 2500);
        } else {
          setSaveMessage({ type: "error", text: json.error || "Erreur serveur." });
        }
      })
      .catch(() => {
        setSaveMessage({ type: "error", text: "Serveur indisponible." });
      })
      .finally(() => setSaving(false));
  };

  const pokedexListForLookup = Array.isArray(pokedexEntries) ? pokedexEntries : [];

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
    const { talents } = normalizeAbilities(e);
    const attacks = normalizeAttacks(e);
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
      talents: talents.length > 0 ? talents : [{ name: "", desc: "", hidden: false }],
      attacks: attacks.length > 0 ? attacks : [{ name: "", desc: "" }],
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
    const talents = (form.talents || []).filter((t) => (t.name || "").trim() || (t.desc || "").trim()).map((t) => ({
      name: (t.name || "").trim(),
      desc: (t.desc || "").trim(),
      hidden: !!t.hidden,
    }));
    const attacks = (form.attacks || []).filter((a) => (a.name || "").trim() || (a.desc || "").trim()).map((a) => ({
      name: (a.name || "").trim(),
      desc: (a.desc || "").trim(),
    }));
    const entry = {
      name: form.name.trim(),
      type: (form.type || "").trim(),
      imageUrl: (form.imageUrl || "").trim() || undefined,
      hp: String(form.hp).trim() || "0",
      atk: String(form.atk).trim() || "0",
      def: String(form.def).trim() || "0",
      spa: String(form.spa).trim() || "0",
      spd: String(form.spd).trim() || "0",
      spe: String(form.spe).trim() || "0",
      total: form.total || computeTotal(form.hp, form.atk, form.def, form.spa, form.spd, form.spe),
      talents: talents.length > 0 ? talents : undefined,
      attacks: attacks.length > 0 ? attacks : undefined,
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
        <div className="admin-pokedex-toolbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "1rem" }}>
          <h3 style={{ margin: 0 }}>
            <i className="fa-solid fa-list" aria-hidden /> Liste ({entries.length})
          </h3>
          <div className="admin-pokedex-toolbar-actions" style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
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
            <button type="button" onClick={saveToApiNow} disabled={saving} className="admin-pokedex-btn admin-pokedex-btn-ghost">
              <i className="fa-solid fa-save" /> {saving ? "Enregistrement…" : "Sauvegarder maintenant"}
            </button>
          </div>
          <div className="admin-bst-background-row" style={{ marginTop: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <label style={{ minWidth: "140px" }}>URL image de fond (page publique)</label>
            <input
              type="url"
              className="admin-pokedex-input"
              value={data.background || ""}
              onChange={(e) => setData((d) => ({ ...d, background: e.target.value }))}
              placeholder="https://… ou /image.jpg"
              style={{ flex: "1", minWidth: "200px", maxWidth: "400px" }}
            />
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
                    <span className="admin-bst-card-type">
                      {(() => {
                        const types = parseTypeLabels(e.type);
                        if (!types.length) return "—";
                        return types.map((t) => {
                          const color = getColorForType(t);
                          return (
                            <span
                              key={t}
                              className="admin-bst-type-badge"
                              style={{
                                background: `linear-gradient(135deg, ${color}44, ${color}22)`,
                                borderColor: color,
                                color,
                              }}
                            >
                              {t}
                            </span>
                          );
                        });
                      })()}
                    </span>
                    <span className="admin-bst-card-total">
                      <i className="fa-solid fa-calculator" aria-hidden /> {e.total}
                    </span>
                    {(() => {
                    const { talents } = normalizeAbilities(e);
                    const filled = talents.filter((t) => (t.name || "").trim()).map((t) => t.name);
                    if (filled.length === 0) return null;
                    const text = filled.map((a) => (a || "").trim().slice(0, 25)).join(" · ");
                    return (
                      <p className="admin-bst-card-ability" title={filled.join(" — ")}>
                        {text.length > 55 ? `${text.slice(0, 52)}…` : text}
                      </p>
                    );
                  })()}
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
              <div className="admin-bst-talents-block">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <span className="admin-bst-talents-title"><i className="fa-solid fa-star" aria-hidden /> Talents</span>
                  <button type="button" onClick={() => setForm((f) => ({ ...f, talents: [...(f.talents || []), { name: "", desc: "", hidden: false }] }))} className="admin-pokedex-btn admin-pokedex-btn-ghost" style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}>
                    <i className="fa-solid fa-plus" aria-hidden /> Ajouter
                  </button>
                </div>
                {(form.talents || []).map((talent, i) => {
                  const isHidden = !!talent.hidden;
                  const normalCount = (form.talents || []).filter((t, idx) => idx < i && !t.hidden).length + 1;
                  const talentLabel = isHidden ? "Talent Caché" : `Talent ${normalCount}`;
                  return (
                  <div key={i} className="admin-bst-talent-slot" style={{ position: "relative", marginTop: "0.5rem", padding: "0.75rem", backgroundColor: "rgba(255,255,255,.03)", borderRadius: "8px", border: isHidden ? "1px solid rgba(255,215,0,.2)" : "1px solid rgba(255,255,255,.06)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        {isHidden && <i className="fa-solid fa-sparkles" style={{ color: "#fbbf24" }} aria-hidden />}
                        <span style={{ fontWeight: "600", fontSize: "0.85rem", color: isHidden ? "#fbbf24" : "rgba(255,255,255,.8)" }}>{talentLabel}</span>
                      </div>
                      <div style={{ display: "flex", gap: "0.35rem" }}>
                        <button type="button" onClick={() => setForm((f) => ({ ...f, talents: (f.talents || []).map((t, j) => j === i ? { ...t, hidden: !t.hidden } : t) }))} className="admin-pokedex-btn admin-pokedex-btn-ghost" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", color: isHidden ? "#fbbf24" : undefined }} title={isHidden ? "Rendre normal" : "Marquer caché"}>
                          <i className={`fa-solid ${isHidden ? "fa-eye" : "fa-eye-slash"}`} aria-hidden />
                        </button>
                        {(form.talents || []).length > 1 && (
                          <button type="button" onClick={() => setForm((f) => ({ ...f, talents: (f.talents || []).filter((_, j) => j !== i) }))} className="admin-pokedex-btn admin-pokedex-btn-ghost" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", color: "#f87171" }} title="Supprimer">
                            <i className="fa-solid fa-times" aria-hidden />
                          </button>
                        )}
                      </div>
                    </div>
                    <label className="admin-pokedex-label admin-pokedex-label--sub">Nom du talent</label>
                    <input type="text" className="admin-pokedex-input" value={talent.name || ""} onChange={(e) => setForm((f) => ({ ...f, talents: (f.talents || []).map((t, j) => j === i ? { ...t, name: e.target.value } : t) }))} placeholder="Nom du talent" />
                    <label className="admin-pokedex-label admin-pokedex-label--sub" style={{ marginTop: "0.35rem" }}>Description</label>
                    <textarea className="admin-pokedex-textarea" value={talent.desc || ""} onChange={(e) => setForm((f) => ({ ...f, talents: (f.talents || []).map((t, j) => j === i ? { ...t, desc: e.target.value } : t) }))} placeholder="Description ou variante" rows={2} />
                  </div>
                  );
                })}
              </div>
              <div className="admin-bst-attacks-block" style={{ marginTop: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <span className="admin-bst-talents-title"><i className="fa-solid fa-bolt" aria-hidden /> Attaques signatures</span>
                  <button type="button" onClick={() => setForm((f) => ({ ...f, attacks: [...(f.attacks || []), { name: "", desc: "" }] }))} className="admin-pokedex-btn admin-pokedex-btn-ghost" style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}>
                    <i className="fa-solid fa-plus" aria-hidden /> Ajouter
                  </button>
                </div>
                {(form.attacks || []).map((attack, i) => (
                  <div key={i} className="admin-bst-attack-slot" style={{ position: "relative", marginTop: "0.5rem", padding: "0.75rem", backgroundColor: "rgba(251,191,36,.05)", borderRadius: "8px", border: "1px solid rgba(251,191,36,.15)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                      <span style={{ fontWeight: "600", fontSize: "0.85rem", color: "#fbbf24" }}>
                        <i className="fa-solid fa-bolt" style={{ marginRight: "0.35rem" }} aria-hidden />
                        Attaque {i + 1}
                      </span>
                      {(form.attacks || []).length > 1 && (
                        <button type="button" onClick={() => setForm((f) => ({ ...f, attacks: (f.attacks || []).filter((_, j) => j !== i) }))} className="admin-pokedex-btn admin-pokedex-btn-ghost" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", color: "#f87171" }} title="Supprimer">
                          <i className="fa-solid fa-times" aria-hidden />
                        </button>
                      )}
                    </div>
                    <label className="admin-pokedex-label admin-pokedex-label--sub">Nom de l'attaque</label>
                    <input type="text" className="admin-pokedex-input" value={attack.name || ""} onChange={(e) => setForm((f) => ({ ...f, attacks: (f.attacks || []).map((a, j) => j === i ? { ...a, name: e.target.value } : a) }))} placeholder="Nom de l'attaque" />
                    <label className="admin-pokedex-label admin-pokedex-label--sub" style={{ marginTop: "0.35rem" }}>Description</label>
                    <textarea className="admin-pokedex-textarea" value={attack.desc || ""} onChange={(e) => setForm((f) => ({ ...f, attacks: (f.attacks || []).map((a, j) => j === i ? { ...a, desc: e.target.value } : a) }))} placeholder="Type, puissance, effet..." rows={2} />
                  </div>
                ))}
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
