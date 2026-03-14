import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:3001/api`
    : `${window.location.origin}/api`;

const KINDS = [
  { id: "nerfs", label: "Nerfs", icon: "fa-arrow-down" },
  { id: "buffs", label: "Buffs", icon: "fa-arrow-up" },
  { id: "ajustements", label: "Ajustements", icon: "fa-sliders" },
];

const emptyEntry = () => ({ name: "", imageUrl: "", description: "" });

function normalizeVersion(v) {
  return {
    version: v?.version || "",
    date: v?.date || "",
    nerfs: Array.isArray(v?.nerfs) ? v.nerfs.map((e) => ({ name: e.name || "", imageUrl: e.imageUrl || "", description: e.description || "" })) : [],
    buffs: Array.isArray(v?.buffs) ? v.buffs.map((e) => ({ name: e.name || "", imageUrl: e.imageUrl || "", description: e.description || "" })) : [],
    ajustements: Array.isArray(v?.ajustements) ? v.ajustements.map((e) => ({ name: e.name || "", imageUrl: e.imageUrl || "", description: e.description || "" })) : [],
  };
}

export default function NerfsBuffsEditor({ onSave }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [background, setBackground] = useState("");
  const [versions, setVersions] = useState([]);
  const [selectedVersionIndex, setSelectedVersionIndex] = useState(0);
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/config/nerfs-buffs?t=${Date.now()}`);
      const data = await res.json();
      if (data?.success && data?.config) {
        const v = data.config.versions || [];
        setVersions(v.map(normalizeVersion));
        setBackground(data.config.background ?? "");
        if (v.length > 0 && selectedVersionIndex >= v.length) setSelectedVersionIndex(0);
      } else {
        setVersions([]);
      }
    } catch {
      setVersions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const showMessage = (text, type = "success") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const config = {
        background: background.trim() || null,
        versions: versions.map((v) => ({
          version: v.version.trim() || "1.0",
          date: v.date.trim() || "",
          nerfs: v.nerfs.filter((e) => e.name.trim()).map((e) => ({ name: e.name.trim(), imageUrl: (e.imageUrl || "").trim(), description: (e.description || "").trim() })),
          buffs: v.buffs.filter((e) => e.name.trim()).map((e) => ({ name: e.name.trim(), imageUrl: (e.imageUrl || "").trim(), description: (e.description || "").trim() })),
          ajustements: v.ajustements.filter((e) => e.name.trim()).map((e) => ({ name: e.name.trim(), imageUrl: (e.imageUrl || "").trim(), description: (e.description || "").trim() })),
        })),
      };
      const res = await fetch(`${API_BASE}/config/nerfs-buffs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      const data = await res.json();
      if (data?.success) {
        showMessage("Nerfs & Buffs enregistrés.");
        onSave?.(config);
      } else {
        throw new Error(data?.error || "Erreur");
      }
    } catch (e) {
      showMessage(e.message || "Impossible de sauvegarder.", "error");
    } finally {
      setSaving(false);
    }
  };

  const currentVersion = versions[selectedVersionIndex];
  const setCurrentVersion = (updater) => {
    setVersions((prev) => {
      const next = [...prev];
      const idx = selectedVersionIndex;
      if (idx < 0 || idx >= next.length) return prev;
      next[idx] = typeof updater === "function" ? updater(next[idx]) : updater;
      return next;
    });
  };

  const addVersion = () => {
    setVersions((prev) => [...prev, normalizeVersion({ version: "", date: "", nerfs: [], buffs: [], ajustements: [] })]);
    setSelectedVersionIndex(versions.length);
  };

  const deleteVersion = (index) => {
    setConfirm({
      title: "Supprimer cette version ?",
      message: `La version « ${versions[index]?.version || "sans nom" } » sera supprimée.`,
      onConfirm: () => {
        setVersions((prev) => prev.filter((_, i) => i !== index));
        setSelectedVersionIndex((i) => (i >= index && i > 0 ? i - 1 : i));
        setConfirm(null);
      },
      onCancel: () => setConfirm(null),
    });
  };

  const addEntry = (kind) => {
    if (!currentVersion) return;
    const key = kind;
    setCurrentVersion((v) => ({ ...v, [key]: [...(v[key] || []), emptyEntry()] }));
  };

  const updateEntry = (kind, entryIndex, field, value) => {
    const key = kind;
    setCurrentVersion((v) => {
      const list = [...(v[key] || [])];
      if (!list[entryIndex]) return v;
      list[entryIndex] = { ...list[entryIndex], [field]: value };
      return { ...v, [key]: list };
    });
  };

  const removeEntry = (kind, entryIndex) => {
    const key = kind;
    setCurrentVersion((v) => ({ ...v, [key]: (v[key] || []).filter((_, i) => i !== entryIndex) }));
  };

  const openEditModal = (kind, entryIndex) => {
    const list = currentVersion?.[kind] || [];
    const entry = list[entryIndex];
    if (!entry) return;
    setModal({ kind, entryIndex, name: entry.name, imageUrl: entry.imageUrl || "", description: entry.description || "" });
  };

  const saveModal = () => {
    if (!modal || currentVersion == null) return;
    const { kind, entryIndex, name, imageUrl, description } = modal;
    const list = [...(currentVersion[kind] || [])];
    list[entryIndex] = { name: name.trim(), imageUrl: imageUrl.trim(), description: description.trim() };
    setCurrentVersion((v) => ({ ...v, [kind]: list }));
    setModal(null);
  };

  if (loading) {
    return (
      <div className="admin-panel-card">
        <p className="admin-panel-loading"><i className="fa-solid fa-spinner fa-spin" /> Chargement Nerfs & Buffs…</p>
      </div>
    );
  }

  return (
    <div className="nerfs-buffs-editor">
      <div className="nerfs-editor-head">
        <h2 className="nerfs-editor-title"><i className="fa-solid fa-scale-balanced" /> Nerfs and Buffs</h2>
        <div className="nerfs-editor-actions">
          {message && (
            <span className={message.type === "success" ? "evs-editor-msg evs-editor-msg--ok" : "evs-editor-msg evs-editor-msg--err"}>
              <i className={`fa-solid ${message.type === "success" ? "fa-check" : "fa-exclamation-triangle"}`} /> {message.text}
            </span>
          )}
          <button type="button" className="admin-pokedex-btn admin-pokedex-btn-primary" onClick={saveConfig} disabled={saving}>
            <i className={`fa-solid ${saving ? "fa-spinner fa-spin" : "fa-floppy-disk"}`} /> Sauvegarder
          </button>
        </div>
      </div>

      <div className="nerfs-editor-background" style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
        <label style={{ minWidth: "140px" }}>URL image de fond (page publique)</label>
        <input
          type="url"
          className="evs-editor-search"
          value={background}
          onChange={(e) => setBackground(e.target.value)}
          placeholder="https://…"
          style={{ flex: "1", minWidth: "200px", maxWidth: "400px" }}
        />
      </div>

      <div className="nerfs-editor-versions-row" style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center", marginBottom: "1.25rem" }}>
        <span className="nerfs-editor-label" style={{ fontWeight: 600 }}>Version</span>
        <select
          className="evs-editor-input"
          value={selectedVersionIndex}
          onChange={(e) => setSelectedVersionIndex(Number(e.target.value))}
          style={{ width: "auto", minWidth: "120px" }}
        >
          {versions.map((v, i) => (
            <option key={i} value={i}>Version {v.version || "?"} {v.date ? `(${v.date})` : ""}</option>
          ))}
        </select>
        <button type="button" className="admin-panel-nav-btn" onClick={addVersion}><i className="fa-solid fa-plus" /> Nouvelle version</button>
        {versions.length > 0 && (
          <button type="button" className="admin-panel-nav-btn" style={{ color: "var(--accent-warm, #f472b6)" }} onClick={() => deleteVersion(selectedVersionIndex)}>
            <i className="fa-solid fa-trash" /> Supprimer cette version
          </button>
        )}
      </div>

      {currentVersion && (
        <>
          <div className="nerfs-editor-version-fields" style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ minWidth: "60px" }}>Version</span>
              <input
                type="text"
                className="evs-editor-input"
                value={currentVersion.version}
                onChange={(e) => setCurrentVersion((v) => ({ ...v, version: e.target.value }))}
                placeholder="1.0"
                style={{ width: "80px" }}
              />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ minWidth: "50px" }}>Date</span>
              <input
                type="text"
                className="evs-editor-input"
                value={currentVersion.date}
                onChange={(e) => setCurrentVersion((v) => ({ ...v, date: e.target.value }))}
                placeholder="Janvier 2025"
                style={{ width: "140px" }}
              />
            </label>
          </div>

          {KINDS.map(({ id, label, icon }) => {
            const entries = currentVersion[id] || [];
            return (
              <div key={id} className="nerfs-editor-kind card" style={{ marginBottom: "1.25rem", padding: "1rem 1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <h3 style={{ margin: 0, fontSize: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <i className={`fa-solid ${icon}`} /> {label}
                  </h3>
                  <button type="button" className="admin-panel-nav-btn" onClick={() => addEntry(id)}><i className="fa-solid fa-plus" /> Ajouter</button>
                </div>
                <div className="nerfs-editor-entries">
                  {entries.length === 0 ? (
                    <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.9rem" }}>Aucune entrée.</p>
                  ) : (
                    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      {entries.map((entry, i) => (
                        <li key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", padding: "0.5rem", background: "rgba(255,255,255,.04)", borderRadius: "8px" }}>
                          <input
                            type="text"
                            className="evs-editor-input"
                            value={entry.name}
                            onChange={(e) => updateEntry(id, i, "name", e.target.value)}
                            placeholder="Nom"
                            style={{ width: "120px", flexShrink: 0 }}
                          />
                          <input
                            type="url"
                            className="evs-editor-input"
                            value={entry.imageUrl || ""}
                            onChange={(e) => updateEntry(id, i, "imageUrl", e.target.value)}
                            placeholder="URL sprite"
                            style={{ flex: "1", minWidth: "150px" }}
                          />
                          <button type="button" className="admin-panel-nav-btn" onClick={() => openEditModal(id, i)} title="Éditer le détail"><i className="fa-solid fa-pen" /></button>
                          <button type="button" className="admin-panel-nav-btn" style={{ color: "var(--accent-warm)" }} onClick={() => removeEntry(id, i)} title="Supprimer"><i className="fa-solid fa-trash" /></button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
        </>
      )}

      {modal && createPortal(
        <div className="admin-pokedex-modal-overlay" role="dialog" aria-modal="true" onClick={() => setModal(null)}>
          <div className="admin-pokedex-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "500px" }}>
            <div className="admin-pokedex-modal-header">
              <h2 className="admin-pokedex-modal-title">Détail de l&apos;entrée</h2>
              <button type="button" className="admin-pokedex-modal-close" onClick={() => setModal(null)}><i className="fa-solid fa-times" /></button>
            </div>
            <div className="admin-pokedex-modal-body">
              <div className="evs-editor-form-row" style={{ marginBottom: "0.75rem" }}>
                <label className="evs-editor-label">Nom</label>
                <input
                  type="text"
                  className="evs-editor-input"
                  value={modal.name}
                  onChange={(e) => setModal((m) => ({ ...m, name: e.target.value }))}
                  placeholder="Nom du Pokémon"
                />
              </div>
              <div className="evs-editor-form-row" style={{ marginBottom: "0.75rem" }}>
                <label className="evs-editor-label">URL du sprite</label>
                <input
                  type="url"
                  className="evs-editor-input"
                  value={modal.imageUrl}
                  onChange={(e) => setModal((m) => ({ ...m, imageUrl: e.target.value }))}
                  placeholder="https://…"
                />
              </div>
              <div className="evs-editor-form-row">
                <label className="evs-editor-label">Description (Type, Stats, Talents, Movepool…)</label>
                <textarea
                  className="evs-editor-input"
                  value={modal.description}
                  onChange={(e) => setModal((m) => ({ ...m, description: e.target.value }))}
                  placeholder="Type : …&#10;Statistiques: …&#10;Talents: …"
                  rows={8}
                  style={{ resize: "vertical", fontFamily: "inherit" }}
                />
              </div>
            </div>
            <div className="admin-pokedex-modal-footer">
              <button type="button" className="admin-panel-nav-btn" onClick={() => setModal(null)}>Annuler</button>
              <button type="button" className="admin-pokedex-btn admin-pokedex-btn-primary" onClick={saveModal}>Enregistrer</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {confirm && createPortal(
        <div className="admin-pokedex-modal-overlay" role="dialog" aria-modal="true" onClick={() => setConfirm(null)}>
          <div className="admin-pokedex-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-pokedex-modal-header">
              <h2 className="admin-pokedex-modal-title">{confirm.title}</h2>
              <button type="button" className="admin-pokedex-modal-close" onClick={() => setConfirm(null)}><i className="fa-solid fa-times" /></button>
            </div>
            <div className="admin-pokedex-modal-body">
              <p>{confirm.message}</p>
            </div>
            <div className="admin-pokedex-modal-footer">
              <button type="button" className="admin-panel-nav-btn" onClick={() => setConfirm(null)}>Annuler</button>
              <button type="button" className="admin-pokedex-btn admin-pokedex-btn-danger" onClick={confirm.onConfirm}>Supprimer</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
