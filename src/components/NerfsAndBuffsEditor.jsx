import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:3001/api`
    : `${window.location.origin}/api`;

const PLACEHOLDER_SPRITE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'%3E%3Crect fill='%23333' width='64' height='64' rx='8'/%3E%3Ctext x='32' y='38' fill='%23666' font-size='20' text-anchor='middle' font-family='sans-serif'%3E?%3C/text%3E%3C/svg%3E";

const SECTIONS = [
  { id: "nerfs", label: "Nerf", icon: "fa-arrow-down" },
  { id: "buffs", label: "Buff", icon: "fa-arrow-up" },
  { id: "ajustements", label: "Ajustement", icon: "fa-arrows-left-right" },
];

const STAT_KEYS = ["hp", "atk", "def", "spa", "spd", "spe"];
const STAT_LABELS = { hp: "PV", atk: "ATK", def: "DEF", spa: "ATK SPE", spd: "DEF SPE", spe: "SPE" };
const STAT_ICONS = {
  hp: "fa-heart-pulse",
  atk: "fa-hand-fist",
  def: "fa-shield",
  spa: "fa-wand-magic-sparkles",
  spd: "fa-gem",
  spe: "fa-gauge-high",
};

function normalizeName(str) {
  if (!str) return "";
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}

function findPokedexEntry(name, entries) {
  if (!name || !entries?.length) return null;
  const n = normalizeName(name);
  let e = entries.find((x) => normalizeName(x.name) === n);
  if (e) return e;
  e = entries.find((x) => normalizeName(x.name).replace(/\s+/g, "-") === n.replace(/\s+/g, "-"));
  if (e) return e;
  return entries.find((x) => n.includes(normalizeName(x.name)) || normalizeName(x.name).includes(n)) || null;
}

function typesToStr(types) {
  if (!Array.isArray(types) || types.length === 0) return "";
  return types.join("/");
}

function totalFromStats(stats) {
  if (!stats || typeof stats !== "object") return 0;
  return STAT_KEYS.reduce((sum, key) => {
    const arr = stats[key];
    const to = Array.isArray(arr) ? (arr[1] ?? arr[0]) : 0;
    return sum + (Number(to) || 0);
  }, 0);
}

function emptyEntry() {
  const stats = {};
  STAT_KEYS.forEach((k) => { stats[k] = [0, 0]; });
  return {
    name: "",
    imageUrl: "",
    typeFrom: "",
    typeTo: "",
    stats,
    talents: [{ from: "", to: "", desc: "", hidden: false }],
    movepool: [{ name: "", desc: "" }],
  };
}

/** Normalise movepool : supporte l'ancien format (string) et le nouveau format (tableau d'objets). */
function normalizeMovepool(entry) {
  if (Array.isArray(entry?.movepool)) {
    return entry.movepool.map((m) => ({ name: (m.name || "").trim(), desc: (m.desc || "").trim() }));
  }
  const movepoolStr = (entry?.movepool || "").trim();
  if (!movepoolStr) return [{ name: "", desc: "" }];
  return [{ name: movepoolStr, desc: "" }];
}

function entryToForm(entry) {
  if (!entry) return emptyEntry();
  const stats = {};
  STAT_KEYS.forEach((k) => {
    const v = entry.stats?.[k];
    stats[k] = Array.isArray(v) ? [Number(v[0]) || 0, Number(v[1]) ?? Number(v[0]) ?? 0] : [0, 0];
  });
  let talents = Array.isArray(entry.talents) ? [...entry.talents] : [];
  if (talents.length === 0) talents.push({ from: "", to: "", desc: "", hidden: false });
  const movepool = normalizeMovepool(entry);
  return {
    name: entry.name || "",
    imageUrl: entry.imageUrl || "",
    typeFrom: entry.typeFrom || "",
    typeTo: entry.typeTo || "",
    stats,
    talents: talents.map((t, i) => ({ from: t.from || "", to: t.to || "", desc: t.desc ?? "", hidden: t.hidden !== undefined ? !!t.hidden : i === 2 })),
    movepool: movepool.length > 0 ? movepool : [{ name: "", desc: "" }],
  };
}

function formToEntry(form) {
  const stats = {};
  STAT_KEYS.forEach((k) => {
    const a = form.stats?.[k];
    stats[k] = Array.isArray(a) ? [Number(a[0]) || 0, Number(a[1]) ?? Number(a[0]) ?? 0] : [0, 0];
  });
  const talents = (form.talents || []).filter((t) => (t.from || "").trim() || (t.to || "").trim()).map((t) => ({ from: (t.from || "").trim(), to: (t.to || "").trim(), desc: (t.desc || "").trim(), hidden: !!t.hidden }));
  const movepool = (form.movepool || []).filter((m) => (m.name || "").trim() || (m.desc || "").trim()).map((m) => ({ name: (m.name || "").trim(), desc: (m.desc || "").trim() }));
  return {
    name: (form.name || "").trim(),
    imageUrl: (form.imageUrl || "").trim() || undefined,
    typeFrom: (form.typeFrom || "").trim(),
    typeTo: (form.typeTo || "").trim(),
    stats,
    talents: talents.length ? talents : undefined,
    movepool: movepool.length ? movepool : undefined,
  };
}

export default function NerfsAndBuffsEditor({ initialData, initialPokedexEntries = [], onSave }) {
  const [data, setData] = useState({
    lastModified: null,
    nerfs: [],
    buffs: [],
    ajustements: [],
    background: "",
  });
  const [pokedexEntries, setPokedexEntries] = useState(() => (Array.isArray(initialPokedexEntries) ? initialPokedexEntries : []));
  const [activeSection, setActiveSection] = useState("buffs");
  const [showModal, setShowModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [addSource, setAddSource] = useState("pokedex");
  const [form, setForm] = useState(emptyEntry());
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [saveMessage, setSaveMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [pokedexSearch, setPokedexSearch] = useState("");
  const [pokedexDropdownOpen, setPokedexDropdownOpen] = useState(false);
  const pokedexDropdownRef = useRef(null);

  const load = async () => {
    try {
      setLoading(true);
      const [apiRes, pokedexRes] = await Promise.all([
        fetch(`${API_BASE}/nerfs-and-buffs?t=${Date.now()}`).then((r) => r.json()),
        fetch(`${API_BASE}/pokedex?t=${Date.now()}`).then((r) => r.json()),
      ]);
      if (apiRes?.success && apiRes?.nerfsBuffs) {
        const nb = apiRes.nerfsBuffs;
        setData({
          lastModified: nb.lastModified ?? null,
          nerfs: Array.isArray(nb.nerfs) ? nb.nerfs : [],
          buffs: Array.isArray(nb.buffs) ? nb.buffs : [],
          ajustements: Array.isArray(nb.ajustements) ? nb.ajustements : [],
          background: nb.background ?? "",
        });
      } else if (initialData) {
        setData({
          lastModified: initialData.lastModified ?? null,
          nerfs: Array.isArray(initialData.nerfs) ? initialData.nerfs : [],
          buffs: Array.isArray(initialData.buffs) ? initialData.buffs : [],
          ajustements: Array.isArray(initialData.ajustements) ? initialData.ajustements : [],
          background: initialData.background ?? "",
        });
      }
      if (pokedexRes?.success && Array.isArray(pokedexRes?.pokedex?.entries)) {
        setPokedexEntries(pokedexRes.pokedex.entries);
      }
    } catch {
      if (initialData) setData({ ...initialData, background: initialData.background ?? "" });
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
    const onKey = (e) => { if (e.key === "Escape") setPokedexDropdownOpen(false); };
    document.addEventListener("click", onDocClick, true);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("click", onDocClick, true); document.removeEventListener("keydown", onKey); };
  }, [pokedexDropdownOpen]);

  const entries = data[activeSection] || [];
  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const q = searchQuery.trim().toLowerCase();
    return entries.filter((e) => (e.name || "").toLowerCase().includes(q));
  }, [entries, searchQuery]);

  const filteredPokedex = useMemo(() => {
    const raw = pokedexSearch.trim();
    if (!raw) return pokedexEntries;
    const words = normalizeName(raw).split(/\s+/).filter(Boolean);
    if (words.length === 0) return pokedexEntries;
    return pokedexEntries.filter((e) => {
      const n = normalizeName(e.name);
      const num = (e.num || "").toString();
      return words.every((w) => n.includes(w) || num.includes(w));
    });
  }, [pokedexEntries, pokedexSearch]);

  const saveToApi = async (payload) => {
    const toSend = payload || data;
    setSaving(true);
    setSaveMessage(null);
    const lastModified = new Date().toISOString().slice(0, 10);
    try {
      const res = await fetch(`${API_BASE}/nerfs-and-buffs`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lastModified,
          nerfs: toSend.nerfs,
          buffs: toSend.buffs,
          ajustements: toSend.ajustements,
          background: (toSend.background || "").trim() || null,
        }),
      });
      const json = await res.json();
      if (json?.success) {
        setData({ ...toSend, lastModified });
        setSaveMessage({ type: "success", text: "Nerfs and Buffs enregistrés." });
        setTimeout(() => setSaveMessage(null), 2500);
        onSave?.(json.nerfsBuffs);
      } else {
        setSaveMessage({ type: "error", text: json?.error || "Erreur serveur." });
      }
    } catch {
      setSaveMessage({ type: "error", text: "Serveur indisponible." });
    } finally {
      setSaving(false);
    }
  };

  const openAdd = () => {
    setForm(emptyEntry());
    setEditingIndex(null);
    setAddSource("pokedex");
    setShowModal(true);
  };

  const openEdit = (index) => {
    setForm(entryToForm(entries[index]));
    setEditingIndex(index);
    setShowModal(true);
  };

  const saveForm = () => {
    const entry = formToEntry(form);
    if (!entry.name) return;
    const list = [...entries];
    if (editingIndex !== null) {
      list[editingIndex] = entry;
    } else {
      list.push(entry);
    }
    const next = { ...data, [activeSection]: list };
    setData(next);
    setShowModal(false);
    saveToApi(next);
  };

  const confirmDelete = (index) => {
    const list = entries.filter((_, i) => i !== index);
    const next = { ...data, [activeSection]: list };
    setData(next);
    setDeleteConfirm(null);
    saveToApi(next);
  };

  const selectPokedexEntry = (entry) => {
    if (!entry) return;
    const typeFrom = typesToStr(entry.types);
    setForm((f) => ({
      ...f,
      name: entry.name || f.name,
      imageUrl: (entry.imageUrl || "").trim() || f.imageUrl,
      typeFrom: typeFrom || f.typeFrom,
    }));
    setPokedexDropdownOpen(false);
    setPokedexSearch("");
  };

  const updateFormStat = (key, index, value) => {
    setForm((f) => {
      const next = { ...f };
      next.stats = { ...(next.stats || {}) };
      const arr = [...(next.stats[key] || [0, 0])];
      arr[index] = value === "" ? "" : Number(value);
      next.stats[key] = arr;
      return next;
    });
  };

  const stepFormStat = (key, index, delta) => {
    setForm((f) => {
      const next = { ...f };
      next.stats = { ...(next.stats || {}) };
      const arr = [...(next.stats[key] || [0, 0])];
      const current = Number(arr[index]) || 0;
      arr[index] = Math.max(0, current + delta);
      next.stats[key] = arr;
      return next;
    });
  };

  if (loading) {
    return (
      <div className="admin-panel-card">
        <p className="admin-panel-loading"><i className="fa-solid fa-spinner fa-spin" /> Chargement Nerfs and Buffs…</p>
      </div>
    );
  }

  const modalContent = showModal && (
    <div className="admin-pokedex-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="nerfbuff-admin-modal-title" onClick={() => setShowModal(false)}>
      <div className="admin-pokedex-modal admin-bst-modal nerfbuff-admin-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "620px" }}>
        <div className="admin-pokedex-modal-header">
          <h2 id="nerfbuff-admin-modal-title">{editingIndex !== null ? "Modifier l'entrée" : "Ajouter un Pokémon"}</h2>
          <button type="button" className="admin-pokedex-modal-close" onClick={() => setShowModal(false)} aria-label="Fermer"><i className="fa-solid fa-xmark" /></button>
        </div>
        <div className="admin-pokedex-modal-body">
          {editingIndex === null && (
            <div className="evs-editor-modal-tabs" style={{ marginBottom: "1rem" }}>
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

          {editingIndex === null && addSource === "pokedex" && (
            <div className="evs-editor-pokedex-pick" ref={pokedexDropdownRef} style={{ marginBottom: "1rem" }}>
              <label className="evs-editor-label">Choisir un Pokémon du Pokédex ({pokedexEntries.length} au total)</label>
              <div className="evs-editor-pokedex-dropdown">
                <div className="evs-editor-pokedex-search-row">
                  <input
                    type="text"
                    className="evs-editor-input evs-editor-pokedex-search"
                    value={pokedexSearch}
                    onChange={(e) => { setPokedexSearch(e.target.value); setPokedexDropdownOpen(true); }}
                    onFocus={() => setPokedexDropdownOpen(true)}
                    placeholder="Rechercher par nom (ex: Momartik, 338…)"
                    autoComplete="off"
                  />
                  <button type="button" className="evs-editor-pokedex-toggle" onClick={() => setPokedexDropdownOpen((o) => !o)} aria-expanded={pokedexDropdownOpen}>
                    <i className={`fa-solid fa-chevron-${pokedexDropdownOpen ? "up" : "down"}`} />
                  </button>
                </div>
                {pokedexDropdownOpen && (
                  <div className="evs-editor-pokedex-list" role="listbox">
                    <div className="evs-editor-pokedex-list-header">
                      <span>{pokedexSearch.trim() ? `${filteredPokedex.length} résultat(s)` : `Tous les Pokémon (${pokedexEntries.length})`}</span>
                      <button type="button" className="evs-editor-pokedex-list-close" onClick={() => setPokedexDropdownOpen(false)}><i className="fa-solid fa-times" /> Fermer</button>
                    </div>
                    <div className="evs-editor-pokedex-list-body">
                      {filteredPokedex.length === 0 ? (
                        <div className="evs-editor-pokedex-list-empty">Aucun Pokémon trouvé.</div>
                      ) : (
                        filteredPokedex.map((entry) => (
                          <button
                            key={entry.num || entry.name}
                            type="button"
                            className="evs-editor-pokedex-option"
                            role="option"
                            onClick={() => selectPokedexEntry(entry)}
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
                )}
              </div>
            </div>
          )}

          <div>
            <label className="admin-pokedex-label"><i className="fa-solid fa-tag" aria-hidden /> Nom *</label>
            <input type="text" className="admin-pokedex-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Momartik" />
          </div>
          <div style={{ marginTop: "0.75rem" }}>
            <label className="admin-pokedex-label"><i className="fa-solid fa-image" aria-hidden /> URL du sprite (si absent du Pokédex)</label>
            <input type="url" className="admin-pokedex-input" value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} placeholder="https://… (optionnel)" />
            {form.imageUrl && (
              <div className="admin-bst-modal-preview" style={{ marginTop: "0.5rem" }}>
                <img src={form.imageUrl} alt="" onError={(e) => { e.target.style.display = "none"; }} style={{ maxWidth: "64px", maxHeight: "64px", imageRendering: "pixelated" }} />
              </div>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginTop: "0.75rem" }}>
            <div>
              <label className="admin-pokedex-label"><i className="fa-solid fa-arrow-left" aria-hidden /> Type (avant)</label>
              <input type="text" className="admin-pokedex-input" value={form.typeFrom} onChange={(e) => setForm((f) => ({ ...f, typeFrom: e.target.value }))} placeholder="Glace/Spectre" />
            </div>
            <div>
              <label className="admin-pokedex-label"><i className="fa-solid fa-arrow-right" aria-hidden /> Type (après)</label>
              <input type="text" className="admin-pokedex-input" value={form.typeTo} onChange={(e) => setForm((f) => ({ ...f, typeTo: e.target.value }))} placeholder="Glace/Spectre" />
            </div>
          </div>
          <div className="admin-nerfbuff-stats-grid">
            {STAT_KEYS.map((key) => (
              <div key={key} className="nerfbuff-admin-stat-row">
                <label className="admin-pokedex-label"><i className={`fa-solid ${STAT_ICONS[key]}`} aria-hidden /> {STAT_LABELS[key]}</label>
                <div className="nerfbuff-admin-stat-inputs">
                  <div className="nerfbuff-admin-stat-cell">
                    <input
                      type="number"
                      min="0"
                      className="admin-pokedex-input nerfbuff-admin-stat-input"
                      value={form.stats?.[key]?.[0] ?? ""}
                      onChange={(e) => updateFormStat(key, 0, e.target.value)}
                      placeholder="0"
                    />
                    <div className="nerfbuff-admin-stat-btns">
                      <button type="button" className="nerfbuff-admin-stat-btn" onClick={() => stepFormStat(key, 0, 1)} aria-label="Augmenter"><i className="fa-solid fa-chevron-up" /></button>
                      <button type="button" className="nerfbuff-admin-stat-btn" onClick={() => stepFormStat(key, 0, -1)} aria-label="Diminuer"><i className="fa-solid fa-chevron-down" /></button>
                    </div>
                  </div>
                  <span className="nerfbuff-admin-stat-arrow" aria-hidden><i className="fa-solid fa-arrow-down" /></span>
                  <div className="nerfbuff-admin-stat-cell">
                    <input
                      type="number"
                      min="0"
                      className="admin-pokedex-input nerfbuff-admin-stat-input"
                      value={form.stats?.[key]?.[1] ?? ""}
                      onChange={(e) => updateFormStat(key, 1, e.target.value)}
                      placeholder="0"
                    />
                    <div className="nerfbuff-admin-stat-btns">
                      <button type="button" className="nerfbuff-admin-stat-btn" onClick={() => stepFormStat(key, 1, 1)} aria-label="Augmenter"><i className="fa-solid fa-chevron-up" /></button>
                      <button type="button" className="nerfbuff-admin-stat-btn" onClick={() => stepFormStat(key, 1, -1)} aria-label="Diminuer"><i className="fa-solid fa-chevron-down" /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="admin-bst-talents-block" style={{ marginTop: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <span className="admin-bst-talents-title"><i className="fa-solid fa-star" aria-hidden /> Talents (avant → après)</span>
              <button type="button" onClick={() => setForm((f) => ({ ...f, talents: [...(f.talents || []), { from: "", to: "", desc: "", hidden: false }] }))} className="admin-pokedex-btn admin-pokedex-btn-ghost" style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}>
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
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                    <div>
                      <label className="admin-pokedex-label admin-pokedex-label--sub">{talentLabel} (avant)</label>
                      <input type="text" className="admin-pokedex-input" value={talent.from || ""} onChange={(e) => setForm((f) => ({ ...f, talents: (f.talents || []).map((t, j) => j === i ? { ...t, from: e.target.value } : t) }))} placeholder="Nom du talent avant" />
                    </div>
                    <div>
                      <label className="admin-pokedex-label admin-pokedex-label--sub">{talentLabel} (après)</label>
                      <input type="text" className="admin-pokedex-input" value={talent.to || ""} onChange={(e) => setForm((f) => ({ ...f, talents: (f.talents || []).map((t, j) => j === i ? { ...t, to: e.target.value } : t) }))} placeholder="Nom du nouveau talent" />
                    </div>
                  </div>
                  <label className="admin-pokedex-label admin-pokedex-label--sub" style={{ marginTop: "0.35rem", display: "block" }}>Description du talent (après)</label>
                  <textarea className="admin-pokedex-textarea" value={talent.desc || ""} onChange={(e) => setForm((f) => ({ ...f, talents: (f.talents || []).map((t, j) => j === i ? { ...t, desc: e.target.value } : t) }))} placeholder="Description du nouveau talent (optionnel)" rows={2} style={{ marginTop: "0.25rem" }} />
                </div>
              );
            })}
          </div>
          <div className="admin-bst-movepool-block" style={{ marginTop: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <span className="admin-bst-talents-title"><i className="fa-solid fa-book-open" aria-hidden /> Movepool (changements)</span>
              <button type="button" onClick={() => setForm((f) => ({ ...f, movepool: [...(f.movepool || []), { name: "", desc: "" }] }))} className="admin-pokedex-btn admin-pokedex-btn-ghost" style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}>
                <i className="fa-solid fa-plus" aria-hidden /> Ajouter
              </button>
            </div>
            {(form.movepool || []).map((move, i) => (
              <div key={i} className="admin-bst-movepool-slot" style={{ position: "relative", marginTop: "0.5rem", padding: "0.75rem", backgroundColor: "rgba(168,85,247,.05)", borderRadius: "8px", border: "1px solid rgba(168,85,247,.2)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <span style={{ fontWeight: "600", fontSize: "0.85rem", color: "#a855f7" }}>
                    <i className="fa-solid fa-book-open" style={{ marginRight: "0.35rem" }} aria-hidden />
                    Changement {i + 1}
                  </span>
                  {(form.movepool || []).length > 1 && (
                    <button type="button" onClick={() => setForm((f) => ({ ...f, movepool: (f.movepool || []).filter((_, j) => j !== i) }))} className="admin-pokedex-btn admin-pokedex-btn-ghost" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", color: "#f87171" }} title="Supprimer">
                      <i className="fa-solid fa-times" aria-hidden />
                    </button>
                  )}
                </div>
                <label className="admin-pokedex-label admin-pokedex-label--sub">Titre / Nom de l'attaque</label>
                <input type="text" className="admin-pokedex-input" value={move.name || ""} onChange={(e) => setForm((f) => ({ ...f, movepool: (f.movepool || []).map((m, j) => j === i ? { ...m, name: e.target.value } : m) }))} placeholder="Ajout de Mistrâmes, Suppression de..." />
                <label className="admin-pokedex-label admin-pokedex-label--sub" style={{ marginTop: "0.35rem" }}>Description (optionnel)</label>
                <textarea className="admin-pokedex-textarea" value={move.desc || ""} onChange={(e) => setForm((f) => ({ ...f, movepool: (f.movepool || []).map((m, j) => j === i ? { ...m, desc: e.target.value } : m) }))} placeholder="Détails du changement..." rows={2} />
              </div>
            ))}
          </div>
        </div>
        <div className="admin-pokedex-modal-footer">
          <button type="button" onClick={() => setShowModal(false)} className="admin-pokedex-btn admin-pokedex-btn-ghost">Annuler</button>
          <button type="button" onClick={saveForm} className="admin-pokedex-btn admin-pokedex-btn-primary" disabled={!form.name.trim()}>
            <i className="fa-solid fa-check" /> {editingIndex !== null ? "Enregistrer" : "Ajouter"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="admin-pokedex">
      <section className="admin-pokedex-card">
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap", alignItems: "center" }}>
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
            <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <i className="fa-solid fa-magnifying-glass" aria-hidden style={{ color: "var(--muted)" }} />
              <input
                type="search"
                className="admin-pokedex-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par nom…"
                style={{ width: "200px" }}
              />
            </span>
            <button type="button" onClick={openAdd} className="admin-pokedex-btn admin-pokedex-btn-primary">
              <i className="fa-solid fa-plus" /> Ajouter
            </button>
            {saveMessage && (
              <span style={{ color: saveMessage.type === "success" ? "#86efac" : "#fca5a5", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <i className={`fa-solid ${saveMessage.type === "success" ? "fa-check" : "fa-exclamation-triangle"}`} />
                {saveMessage.text}
              </span>
            )}
            <button type="button" onClick={() => saveToApi()} disabled={saving} className="admin-pokedex-btn admin-pokedex-btn-ghost">
              <i className={`fa-solid ${saving ? "fa-spinner fa-spin" : "fa-save"}`} /> {saving ? "Enregistrement…" : "Sauvegarder"}
            </button>
          </div>
          <div className="admin-bst-background-row" style={{ marginTop: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", width: "100%" }}>
            <label style={{ minWidth: "140px" }}><i className="fa-solid fa-image" aria-hidden /> URL image de fond (page publique)</label>
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
            <p className="admin-bst-empty">Aucune entrée. Cliquez sur « Ajouter » ou choisissez une autre catégorie.</p>
          ) : (
            filteredEntries.map((e, displayIndex) => {
              const globalIndex = entries.indexOf(e);
              const dexEntry = findPokedexEntry(e.name, pokedexEntries);
              const spriteUrl = e.imageUrl || dexEntry?.imageUrl || PLACEHOLDER_SPRITE;
              const total = totalFromStats(e.stats);
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
                    <span className="admin-bst-card-type">{e.typeTo || "—"}</span>
                    <span className="admin-bst-card-total"><i className="fa-solid fa-calculator" aria-hidden /> {total}</span>
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

      {showModal && createPortal(modalContent, document.body)}

      {deleteConfirm !== null && createPortal(
        <div className="admin-pokedex-confirm-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="admin-pokedex-confirm-box" onClick={(e) => e.stopPropagation()}>
            <p style={{ margin: "0 0 1.25rem 0", color: "rgba(255,255,255,.9)", fontSize: "1rem" }}>
              Supprimer « {entries[deleteConfirm]?.name} » ?
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button type="button" onClick={() => setDeleteConfirm(null)} className="admin-pokedex-btn admin-pokedex-btn-ghost">Annuler</button>
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
