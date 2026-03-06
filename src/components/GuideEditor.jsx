import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:3001/api`
    : `${window.location.origin}/api`;

const STORAGE_GUIDE = "admin_guide_data";

export default function GuideEditor({ initialData = null, onSave }) {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [disclaimer, setDisclaimer] = useState("");
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  const [showStepModal, setShowStepModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [form, setForm] = useState({
    num: "",
    text: "",
    imageUrl: "",
    highlightStr: "",
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/guide?t=${Date.now()}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.success && data.guide) {
          setTitle(data.guide.title || "");
          setSubtitle(data.guide.subtitle || "");
          setDisclaimer(data.guide.disclaimer || "");
          setSteps(Array.isArray(data.guide.steps) ? data.guide.steps : []);
          setLoading(false);
          return;
        }
      } catch (_) {
        if (cancelled) return;
      }
      try {
        const raw = localStorage.getItem(STORAGE_GUIDE);
        if (raw) {
          const parsed = JSON.parse(raw);
          setTitle(parsed.title || "");
          setSubtitle(parsed.subtitle || "");
          setDisclaimer(parsed.disclaimer || "");
          setSteps(Array.isArray(parsed.steps) ? parsed.steps : []);
        } else if (initialData) {
          setTitle(initialData.title || "");
          setSubtitle(initialData.subtitle || "");
          setDisclaimer(initialData.disclaimer || "");
          setSteps(Array.isArray(initialData.steps) ? initialData.steps : []);
        }
      } catch {
        if (initialData) {
          setTitle(initialData.title || "");
          setSubtitle(initialData.subtitle || "");
          setDisclaimer(initialData.disclaimer || "");
          setSteps(Array.isArray(initialData.steps) ? initialData.steps : []);
        }
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [initialData]);

  const saveToStorage = () => {
    const data = { title, subtitle, disclaimer, steps };
    localStorage.setItem(STORAGE_GUIDE, JSON.stringify(data));
    onSave?.(data);
  };

  const handleSaveAll = async () => {
    setSaveMessage(null);
    setSaving(true);
    saveToStorage();
    try {
      const res = await fetch(`${API_BASE}/guide`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, subtitle, disclaimer, steps }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveMessage({ type: "success", text: "Guide enregistré dans le fichier JSON." });
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
    const nextNum = steps.length ? Math.max(...steps.map((s) => parseInt(s.num, 10) || 0)) + 1 : 1;
    setForm({ num: String(nextNum), text: "", imageUrl: "", highlightStr: "" });
    setEditingIndex(null);
    setShowStepModal(true);
  };

  const openEdit = (index) => {
    const s = steps[index];
    setForm({
      num: String(s.num || index + 1),
      text: s.text || "",
      imageUrl: s.imageUrl || "",
      highlightStr: Array.isArray(s.highlight) ? s.highlight.join(", ") : "",
    });
    setEditingIndex(index);
    setShowStepModal(true);
  };

  const saveStep = () => {
    const highlight = form.highlightStr
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean);
    const step = {
      num: parseInt(form.num, 10) || steps.length + 1,
      text: form.text.trim(),
      imageUrl: form.imageUrl.trim() || "",
      highlight,
    };
    if (editingIndex !== null) {
      const next = [...steps];
      next[editingIndex] = step;
      setSteps(next);
    } else {
      setSteps([...steps, step].sort((a, b) => (a.num || 0) - (b.num || 0)));
    }
    setShowStepModal(false);
    saveToStorage();
  };

  const handleDelete = (index) => {
    const next = steps.filter((_, i) => i !== index);
    setSteps(next);
    setDeleteConfirm(null);
    saveToStorage();
  };

  const moveStep = (index, direction) => {
    const sorted = [...steps].sort((a, b) => (parseInt(a.num, 10) || 0) - (parseInt(b.num, 10) || 0));
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;
    const next = [...sorted];
    const tempNum = next[index].num;
    next[index] = { ...next[index], num: next[targetIdx].num };
    next[targetIdx] = { ...next[targetIdx], num: tempNum };
    setSteps(next);
    saveToStorage();
  };

  if (loading) {
    return (
      <div className="admin-pokedex" style={{ padding: "2rem", textAlign: "center", color: "rgba(255,255,255,0.85)" }}>
        <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: "0.5rem" }} />
        Chargement du guide…
      </div>
    );
  }

  return (
    <div className="admin-pokedex">
      <section className="admin-pokedex-card">
        <h3><i className="fa-solid fa-heading" aria-hidden /> Titre et sous-titre</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label className="admin-pokedex-label">Titre du guide</label>
            <input
              type="text"
              className="admin-pokedex-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Guide Pokémon New World"
            />
          </div>
          <div>
            <label className="admin-pokedex-label">Sous-titre</label>
            <input
              type="text"
              className="admin-pokedex-input"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Walkthrough de l'histoire principale"
            />
          </div>
          <div>
            <label className="admin-pokedex-label">Avertissement (disclaimer)</label>
            <input
              type="text"
              className="admin-pokedex-input"
              value={disclaimer}
              onChange={(e) => setDisclaimer(e.target.value)}
              placeholder="Ce guide suit la trame principale, les quêtes annexes ne sont pas indiquées."
            />
          </div>
        </div>
      </section>

      <section className="admin-pokedex-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "1rem" }}>
          <h3 style={{ margin: 0 }}><i className="fa-solid fa-list-ol" aria-hidden /> Étapes du guide ({steps.length})</h3>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            {saveMessage && (
              <span style={{ color: saveMessage.type === "success" ? "#86efac" : "#fca5a5", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                {saveMessage.type === "success" ? <i className="fa-solid fa-check" /> : <i className="fa-solid fa-exclamation-triangle" />}
                {saveMessage.text}
              </span>
            )}
            <button type="button" onClick={openAdd} className="admin-pokedex-btn admin-pokedex-btn-primary">
              <i className="fa-solid fa-plus" /> Ajouter une étape
            </button>
            <button type="button" onClick={handleSaveAll} disabled={saving} className="admin-pokedex-btn admin-pokedex-btn-ghost">
              <i className="fa-solid fa-save" /> {saving ? "Enregistrement…" : "Sauvegarder dans le JSON"}
            </button>
          </div>
        </div>

        <div className="admin-pokedex-table-wrap">
          <table className="admin-pokedex-table">
            <thead>
              <tr>
                <th style={{ width: "4rem" }}>N°</th>
                <th>Texte</th>
                <th style={{ width: "6rem" }}>Image</th>
                <th style={{ width: "10rem", textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {steps.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: "2rem", textAlign: "center", opacity: 0.7 }}>
                    Aucune étape. Cliquez sur &quot;Ajouter une étape&quot;.
                  </td>
                </tr>
              ) : (
                [...steps]
                  .sort((a, b) => (parseInt(a.num, 10) || 0) - (parseInt(b.num, 10) || 0))
                  .map((s, sortedIdx) => {
                    const globalIndex = steps.indexOf(s);
                    return (
                      <tr key={`${s.num}-${globalIndex}`}>
                        <td>{s.num}</td>
                        <td style={{ maxWidth: "400px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {(s.text || "").slice(0, 80)}
                          {(s.text || "").length > 80 ? "…" : ""}
                        </td>
                        <td>
                          {s.imageUrl ? (
                            <img src={s.imageUrl} alt="" style={{ width: "48px", height: "48px", objectFit: "cover", borderRadius: "8px" }} onError={(ev) => (ev.target.style.display = "none")} />
                          ) : (
                            <span style={{ opacity: 0.5 }}>—</span>
                          )}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button type="button" onClick={() => moveStep(sortedIdx, "up")} disabled={sortedIdx === 0} className="admin-pokedex-btn admin-pokedex-btn-ghost" style={{ padding: "0.35rem 0.6rem", marginRight: "0.25rem" }} title="Monter">
                            <i className="fa-solid fa-chevron-up" />
                          </button>
                          <button type="button" onClick={() => moveStep(sortedIdx, "down")} disabled={sortedIdx === steps.length - 1} className="admin-pokedex-btn admin-pokedex-btn-ghost" style={{ padding: "0.35rem 0.6rem", marginRight: "0.25rem" }} title="Descendre">
                            <i className="fa-solid fa-chevron-down" />
                          </button>
                          <button type="button" onClick={() => openEdit(globalIndex)} className="admin-pokedex-btn admin-pokedex-btn-ghost" style={{ padding: "0.35rem 0.6rem", marginRight: "0.25rem" }} title="Modifier">
                            <i className="fa-solid fa-pen" />
                          </button>
                          <button type="button" onClick={() => setDeleteConfirm(globalIndex)} className="admin-pokedex-btn admin-pokedex-btn-danger" style={{ padding: "0.35rem 0.6rem" }} title="Supprimer">
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

      {/* Modal Ajout / Édition étape */}
      {showStepModal &&
        createPortal(
          <div
            className="admin-pokedex-modal-overlay"
            onClick={() => setShowStepModal(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="guide-step-modal-title"
          >
            <div
              className="admin-pokedex-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="admin-pokedex-modal-header">
                <h3 id="guide-step-modal-title" className="admin-pokedex-modal-title">
                  {editingIndex !== null ? "Modifier l'étape" : "Ajouter une étape"}
                </h3>
                <button type="button" className="admin-pokedex-modal-close" onClick={() => setShowStepModal(false)} aria-label="Fermer">
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>
              <div className="admin-pokedex-modal-body">
                <div>
                  <label className="admin-pokedex-label">Numéro d'étape</label>
                  <input
                    type="number"
                    className="admin-pokedex-input"
                    value={form.num}
                    onChange={(e) => setForm((f) => ({ ...f, num: e.target.value }))}
                    min={1}
                  />
                </div>
                <div>
                  <label className="admin-pokedex-label">Texte de l'étape</label>
                  <textarea
                    className="admin-pokedex-textarea"
                    value={form.text}
                    onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
                    placeholder="Description de l'étape..."
                    rows={4}
                  />
                </div>
                <div>
                  <label className="admin-pokedex-label">URL de l'image (optionnel)</label>
                  <input
                    type="url"
                    className="admin-pokedex-input"
                    value={form.imageUrl}
                    onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="admin-pokedex-label">Termes à mettre en évidence (séparés par des virgules)</label>
                  <input
                    type="text"
                    className="admin-pokedex-input"
                    value={form.highlightStr}
                    onChange={(e) => setForm((f) => ({ ...f, highlightStr: e.target.value }))}
                    placeholder="Kéen, Liora, Rose, Sentier Bifröst"
                  />
                </div>
              </div>
              <div className="admin-pokedex-modal-footer">
                <button type="button" className="admin-pokedex-btn admin-pokedex-btn-ghost" onClick={() => setShowStepModal(false)}>
                  Annuler
                </button>
                <button type="button" className="admin-pokedex-btn admin-pokedex-btn-primary" onClick={saveStep}>
                  <i className="fa-solid fa-check" /> Enregistrer
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Modal confirmation suppression */}
      {deleteConfirm !== null &&
        createPortal(
          <div className="admin-pokedex-confirm-overlay" onClick={() => setDeleteConfirm(null)}>
            <div className="admin-pokedex-confirm-box" onClick={(e) => e.stopPropagation()}>
              <h3 style={{ margin: "0 0 1rem 0", color: "#fca5a5" }}>Supprimer cette étape ?</h3>
              <p style={{ margin: "0 0 1rem 0", color: "rgba(255,255,255,0.85)" }}>
                L'étape &quot;{(steps[deleteConfirm]?.text || "").slice(0, 60)}…&quot; sera définitivement supprimée.
              </p>
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                <button type="button" className="admin-pokedex-btn admin-pokedex-btn-ghost" onClick={() => setDeleteConfirm(null)}>
                  Annuler
                </button>
                <button type="button" className="admin-pokedex-btn admin-pokedex-btn-danger" onClick={() => handleDelete(deleteConfirm)}>
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
