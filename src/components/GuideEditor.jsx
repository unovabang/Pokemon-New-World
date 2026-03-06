import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:3001/api`
    : `${window.location.origin}/api`;

const STORAGE_GUIDE = "admin_guide_data";
const DEFAULT_IMAGE = "/guide-map.png";

function splitByHighlights(text, highlight = []) {
  if (!text || !Array.isArray(highlight) || highlight.length === 0) {
    return [{ type: "text", value: text }];
  }
  const escaped = highlight.map((h) => h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(regex).filter(Boolean);
  return parts.map((p) => ({
    type: highlight.some((h) => p.toLowerCase() === h.toLowerCase()) ? "highlight" : "text",
    value: p,
  }));
}

function StepPreview({ step }) {
  const parts = splitByHighlights(step.text || "", step.highlight || []);
  const imgSrc = step.imageUrl?.trim() || DEFAULT_IMAGE;
  const characters = step.characters || [];

  return (
    <div className="admin-guide-preview">
      <div className="admin-guide-preview-header">
        <div className="admin-guide-preview-badge">Étape {step.num}</div>
        {characters.length > 0 && (
          <div className="guide-step-characters">
            {characters.map((c, i) => (
              <div key={i} className="guide-character-bubble" title={c.name || "Personnage"}>
                <div className="guide-character-bubble-inner">
                  <img
                    src={c.imageUrl || "/guide-sprites/sprite-test.gif"}
                    alt={c.name || ""}
                    className="guide-character-bubble-img"
                    onError={(e) => (e.target.src = "/guide-sprites/sprite-test.gif")}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="admin-guide-preview-text">
        {parts.map((p, i) =>
          p.type === "highlight" ? (
            <strong key={i} className="admin-guide-preview-highlight">{p.value}</strong>
          ) : (
            <span key={i}>{p.value}</span>
          )
        )}
      </p>
      <div className="admin-guide-preview-img-wrap">
        <img src={imgSrc} alt="" onError={(e) => (e.target.src = DEFAULT_IMAGE)} />
      </div>
    </div>
  );
}

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
  const [insertAfterIndex, setInsertAfterIndex] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState({
    num: "",
    text: "",
    imageUrl: "",
    highlightStr: "",
    characters: [],
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
        setSaveMessage({ type: "success", text: "Guide enregistré avec succès." });
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

  const openAdd = (afterIndex = null) => {
    let nextNum = 1;
    if (steps.length) {
      if (afterIndex !== null && steps[afterIndex]) {
        nextNum = (parseInt(steps[afterIndex].num, 10) || 0) + 1;
      } else {
        nextNum = Math.max(...steps.map((s) => parseInt(s.num, 10) || 0)) + 1;
      }
    }
    setForm({ num: String(nextNum), text: "", imageUrl: "", highlightStr: "", characters: [] });
    setEditingIndex(null);
    setInsertAfterIndex(afterIndex);
    setShowStepModal(true);
  };

  const openEdit = (index) => {
    const s = steps[index];
    setForm({
      num: String(s.num || index + 1),
      text: s.text || "",
      imageUrl: s.imageUrl || "",
      highlightStr: Array.isArray(s.highlight) ? s.highlight.join(", ") : "",
      characters: Array.isArray(s.characters) ? s.characters.map((c) => ({ ...c })) : [],
    });
    setEditingIndex(index);
    setInsertAfterIndex(null);
    setShowStepModal(true);
  };

  const openDuplicate = (index) => {
    const s = steps[index];
    const nextNum = Math.max(...steps.map((x) => parseInt(x.num, 10) || 0), 0) + 1;
    setForm({
      num: String(nextNum),
      text: s.text || "",
      imageUrl: s.imageUrl || "",
      highlightStr: Array.isArray(s.highlight) ? s.highlight.join(", ") : "",
      characters: Array.isArray(s.characters) ? s.characters.map((c) => ({ ...c })) : [],
    });
    setEditingIndex(null);
    setInsertAfterIndex(index);
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
      characters: Array.isArray(form.characters)
        ? form.characters
            .filter((c) => c && (c.name || c.description || c.imageUrl))
            .map((c) => ({
              name: (c.name || "").trim(),
              description: (c.description || "").trim(),
              imageUrl: (c.imageUrl || "").trim(),
            }))
        : [],
    };
    if (editingIndex !== null) {
      const next = [...steps];
      next[editingIndex] = step;
      setSteps(next);
    } else if (insertAfterIndex !== null) {
      const next = [...steps];
      next.splice(insertAfterIndex + 1, 0, step);
      setSteps(next);
    } else {
      setSteps([...steps, step].sort((a, b) => (a.num || 0) - (b.num || 0)));
    }
    setShowStepModal(false);
    setInsertAfterIndex(null);
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

  const sortedSteps = [...steps].sort((a, b) => (parseInt(a.num, 10) || 0) - (parseInt(b.num, 10) || 0));
  const filteredSteps = searchQuery.trim()
    ? sortedSteps.filter(
        (s) =>
          (s.text || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (s.highlight || []).some((h) => h.toLowerCase().includes(searchQuery.toLowerCase())) ||
          String(s.num).includes(searchQuery)
      )
    : sortedSteps;

  if (loading) {
    return (
      <div className="admin-guide admin-guide-loading">
        <div className="admin-guide-loading-spinner">
          <i className="fa-solid fa-route fa-spin" />
        </div>
        <p>Chargement du guide…</p>
      </div>
    );
  }

  return (
    <div className="admin-guide">
      {/* En-tête + infos générales */}
      <section className="admin-guide-card admin-guide-header">
        <div className="admin-guide-header-top">
          <h3><i className="fa-solid fa-book-open" /> Guide — Paramètres généraux</h3>
          <a href="/guide" target="_blank" rel="noreferrer" className="admin-guide-preview-link">
            <i className="fa-solid fa-external-link-alt" /> Voir le guide
          </a>
        </div>
        <div className="admin-guide-fields">
          <div className="admin-guide-field">
            <label>Titre du guide</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Guide Pokémon New World"
            />
          </div>
          <div className="admin-guide-field">
            <label>Sous-titre</label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Walkthrough de l'histoire principale"
            />
          </div>
          <div className="admin-guide-field">
            <label>Avertissement (disclaimer)</label>
            <input
              type="text"
              value={disclaimer}
              onChange={(e) => setDisclaimer(e.target.value)}
              placeholder="Ce guide suit la trame principale, les quêtes annexes ne sont pas indiquées."
            />
          </div>
        </div>
      </section>

      {/* Liste des étapes */}
      <section className="admin-guide-card admin-guide-steps">
        <div className="admin-guide-steps-header">
          <h3><i className="fa-solid fa-list-ol" /> Étapes ({steps.length})</h3>
          <div className="admin-guide-steps-actions">
            <div className="admin-guide-search">
              <i className="fa-solid fa-magnifying-glass" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher dans les étapes…"
              />
            </div>
            {saveMessage && (
              <span className={`admin-guide-toast admin-guide-toast--${saveMessage.type}`}>
                <i className={saveMessage.type === "success" ? "fa-solid fa-check-circle" : "fa-solid fa-exclamation-triangle"} />
                {saveMessage.text}
              </span>
            )}
            <button type="button" onClick={() => openAdd()} className="admin-guide-btn admin-guide-btn-primary">
              <i className="fa-solid fa-plus" /> Ajouter une étape
            </button>
            <button type="button" onClick={handleSaveAll} disabled={saving} className="admin-guide-btn admin-guide-btn-ghost">
              <i className="fa-solid fa-save" /> {saving ? "Enregistrement…" : "Sauvegarder"}
            </button>
          </div>
        </div>

        {steps.length === 0 ? (
          <div className="admin-guide-empty">
            <div className="admin-guide-empty-icon">
              <i className="fa-solid fa-route" />
            </div>
            <p>Aucune étape pour le moment.</p>
            <p className="admin-guide-empty-hint">Cliquez sur &quot;Ajouter une étape&quot; pour commencer le guide.</p>
            <button type="button" onClick={() => openAdd()} className="admin-guide-btn admin-guide-btn-primary">
              <i className="fa-solid fa-plus" /> Ajouter la première étape
            </button>
          </div>
        ) : (
          <div className="admin-guide-list">
            {filteredSteps.map((s, sortedIdx) => {
              const globalIndex = steps.indexOf(s);
              return (
                <div key={`${s.num}-${globalIndex}`} className="admin-guide-step-card">
                  <div className="admin-guide-step-card-main">
                    <div className="admin-guide-step-card-preview">
                      <StepPreview step={s} />
                    </div>
                    <div className="admin-guide-step-card-actions">
                      <div className="admin-guide-step-card-buttons">
                        <button type="button" onClick={() => moveStep(sortedIdx, "up")} disabled={sortedIdx === 0} title="Monter">
                          <i className="fa-solid fa-chevron-up" />
                        </button>
                        <button type="button" onClick={() => moveStep(sortedIdx, "down")} disabled={sortedIdx === sortedSteps.length - 1} title="Descendre">
                          <i className="fa-solid fa-chevron-down" />
                        </button>
                        <button type="button" onClick={() => openAdd(globalIndex)} title="Insérer après">
                          <i className="fa-solid fa-plus" />
                        </button>
                        <button type="button" onClick={() => openEdit(globalIndex)} title="Modifier">
                          <i className="fa-solid fa-pen" />
                        </button>
                        <button type="button" onClick={() => openDuplicate(globalIndex)} title="Dupliquer">
                          <i className="fa-solid fa-copy" />
                        </button>
                        <button type="button" onClick={() => setDeleteConfirm(globalIndex)} className="admin-guide-btn-danger" title="Supprimer">
                          <i className="fa-solid fa-trash" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredSteps.length === 0 && searchQuery && (
              <p className="admin-guide-no-results">Aucune étape ne correspond à &quot;{searchQuery}&quot;.</p>
            )}
          </div>
        )}
      </section>

      {/* Modal Ajout / Édition */}
      {showStepModal &&
        createPortal(
          <div
            className="admin-guide-modal-overlay"
            onClick={() => setShowStepModal(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="guide-modal-title"
          >
            <div className="admin-guide-modal" onClick={(e) => e.stopPropagation()}>
              <div className="admin-guide-modal-header">
                <h3 id="guide-modal-title">
                  {editingIndex !== null ? "Modifier l'étape" : insertAfterIndex !== null ? "Insérer une étape" : "Ajouter une étape"}
                </h3>
                <button type="button" className="admin-guide-modal-close" onClick={() => setShowStepModal(false)} aria-label="Fermer">
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>
              <div className="admin-guide-modal-body">
                <div className="admin-guide-modal-form">
                  <div className="admin-guide-field">
                    <label>Numéro d'étape</label>
                    <input
                      type="number"
                      value={form.num}
                      onChange={(e) => setForm((f) => ({ ...f, num: e.target.value }))}
                      min={1}
                    />
                  </div>
                  <div className="admin-guide-field">
                    <label>Texte de l'étape</label>
                    <textarea
                      value={form.text}
                      onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
                      placeholder="Description de l'étape..."
                      rows={5}
                    />
                  </div>
                  <div className="admin-guide-field">
                    <label>URL de l'image</label>
                    <div className="admin-guide-field-with-preset">
                      <input
                        type="url"
                        value={form.imageUrl}
                        onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                        placeholder="/guide-map.png ou https://..."
                      />
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, imageUrl: DEFAULT_IMAGE }))}
                        className="admin-guide-btn admin-guide-btn-ghost"
                        title="Utiliser la carte par défaut"
                      >
                        Carte
                      </button>
                    </div>
                  </div>
                  <div className="admin-guide-field">
                    <label>Termes à mettre en évidence <span className="admin-guide-hint">(séparés par des virgules)</span></label>
                    <input
                      type="text"
                      value={form.highlightStr}
                      onChange={(e) => setForm((f) => ({ ...f, highlightStr: e.target.value }))}
                      placeholder="Kéen, Liora, Rose, Sentier Bifröst"
                    />
                  </div>
                  <div className="admin-guide-field">
                    <label>Personnages <span className="admin-guide-hint">(bulles cliquables)</span></label>
                    <div className="admin-guide-characters-list">
                      {(form.characters || []).map((c, i) => (
                        <div key={i} className="admin-guide-character-row">
                          <input
                            type="text"
                            placeholder="Nom"
                            value={c.name || ""}
                            onChange={(e) => {
                              const next = [...(form.characters || [])];
                              next[i] = { ...next[i], name: e.target.value };
                              setForm((f) => ({ ...f, characters: next }));
                            }}
                          />
                          <input
                            type="text"
                            placeholder="URL sprite"
                            value={c.imageUrl || ""}
                            onChange={(e) => {
                              const next = [...(form.characters || [])];
                              next[i] = { ...next[i], imageUrl: e.target.value };
                              setForm((f) => ({ ...f, characters: next }));
                            }}
                          />
                          <input
                            type="text"
                            placeholder="Description"
                            value={c.description || ""}
                            onChange={(e) => {
                              const next = [...(form.characters || [])];
                              next[i] = { ...next[i], description: e.target.value };
                              setForm((f) => ({ ...f, characters: next }));
                            }}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setForm((f) => ({
                                ...f,
                                characters: (f.characters || []).filter((_, j) => j !== i),
                              }))
                            }
                            className="admin-guide-btn admin-guide-btn-danger"
                            title="Supprimer"
                          >
                            <i className="fa-solid fa-trash" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            characters: [...(f.characters || []), { name: "", description: "", imageUrl: "/guide-sprites/sprite-test.gif" }],
                          }))
                        }
                        className="admin-guide-btn admin-guide-btn-ghost"
                      >
                        <i className="fa-solid fa-plus" /> Ajouter un personnage
                      </button>
                    </div>
                  </div>
                </div>
                <div className="admin-guide-modal-preview">
                  <label>Aperçu</label>
                  <StepPreview
                    step={{
                      num: form.num || "?",
                      text: form.text || "Aperçu du texte…",
                      imageUrl: form.imageUrl.trim() || DEFAULT_IMAGE,
                      highlight: form.highlightStr.split(",").map((h) => h.trim()).filter(Boolean),
                      characters: form.characters || [],
                    }}
                  />
                </div>
              </div>
              <div className="admin-guide-modal-footer">
                <button type="button" className="admin-guide-btn admin-guide-btn-ghost" onClick={() => setShowStepModal(false)}>
                  Annuler
                </button>
                <button type="button" className="admin-guide-btn admin-guide-btn-primary" onClick={saveStep}>
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
          <div className="admin-guide-confirm-overlay" onClick={() => setDeleteConfirm(null)}>
            <div className="admin-guide-confirm-box" onClick={(e) => e.stopPropagation()}>
              <h3><i className="fa-solid fa-triangle-exclamation" /> Supprimer cette étape ?</h3>
              <p>L'étape &quot;{(steps[deleteConfirm]?.text || "").slice(0, 80)}{(steps[deleteConfirm]?.text || "").length > 80 ? "…" : ""}&quot; sera définitivement supprimée.</p>
              <div className="admin-guide-confirm-actions">
                <button type="button" className="admin-guide-btn admin-guide-btn-ghost" onClick={() => setDeleteConfirm(null)}>
                  Annuler
                </button>
                <button type="button" className="admin-guide-btn admin-guide-btn-danger" onClick={() => handleDelete(deleteConfirm)}>
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
