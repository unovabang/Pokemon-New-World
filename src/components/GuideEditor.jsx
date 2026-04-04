import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { authHeaders } from "../utils/authHeaders";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : `${window.location.origin}/api`;

const STORAGE_GUIDE = "admin_guide_data";
const PLACEHOLDER_IMG = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
const DEFAULT_IMAGE = PLACEHOLDER_IMG;

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

function CharacterModal({ character, onClose }) {
  if (!character) return null;
  const imgSrc = character.imageUrl?.trim() || PLACEHOLDER_IMG;
  return (
    <div className="guide-character-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="guide-character-modal-title">
      <div className="guide-character-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="guide-character-modal-close" onClick={onClose} aria-label="Fermer">
          <i className="fa-solid fa-xmark" />
        </button>
        <h3 id="guide-character-modal-title" className="guide-character-modal-title">{character.name || "Personnage"}</h3>
        <div className="guide-character-modal-content">
          <div className="guide-character-modal-sprite">
            <img src={imgSrc} alt={character.name || ""} />
          </div>
          <p className="guide-character-modal-desc">{character.description || "Aucune description."}</p>
        </div>
      </div>
    </div>
  );
}

function StepPreview({ step, onCharacterClick }) {
  const parts = splitByHighlights(step.text || "", step.highlight || []);
  const imgSrc = step.imageUrl?.trim() || PLACEHOLDER_IMG;
  const characters = step.characters || [];
  const isClickable = typeof onCharacterClick === "function";

  return (
    <div className="admin-guide-preview">
      <div className="admin-guide-preview-header">
        <div className="admin-guide-preview-badge">Étape {step.num}</div>
        {characters.length > 0 && (
          <div className="guide-step-characters">
            {characters.map((c, i) =>
              isClickable ? (
                <button key={i} type="button" className="guide-character-bubble" onClick={() => onCharacterClick(c)} title={c.name || "Personnage"} aria-label={`Voir ${c.name || "personnage"}`}>
                  <div className="guide-character-bubble-inner">
                    <img src={c.imageUrl || PLACEHOLDER_IMG} alt={c.name || ""} className="guide-character-bubble-img" onError={(e) => (e.target.src = PLACEHOLDER_IMG)} />
                  </div>
                </button>
              ) : (
                <div key={i} className="guide-character-bubble" title={c.name || "Personnage"}>
                  <div className="guide-character-bubble-inner">
                    <img src={c.imageUrl || PLACEHOLDER_IMG} alt={c.name || ""} className="guide-character-bubble-img" onError={(e) => (e.target.src = PLACEHOLDER_IMG)} />
                  </div>
                </div>
              )
            )}
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

function CharacterCard({ character, index, onChange, onRemove, onMoveUp, onMoveDown, isFirst, isLast }) {
  const imgSrc = character.imageUrl?.trim() || PLACEHOLDER_IMG;
  return (
    <div className="admin-guide-char-card">
      <div className="admin-guide-char-card-header">
        <div className="admin-guide-char-card-avatar">
          <img src={imgSrc} alt="" onError={(e) => (e.target.src = PLACEHOLDER_IMG)} />
        </div>
        <span className="admin-guide-char-card-name">{character.name || `Personnage ${index + 1}`}</span>
        <div className="admin-guide-char-card-actions">
          <button type="button" onClick={onMoveUp} disabled={isFirst} title="Monter"><i className="fa-solid fa-chevron-up" /></button>
          <button type="button" onClick={onMoveDown} disabled={isLast} title="Descendre"><i className="fa-solid fa-chevron-down" /></button>
          <button type="button" onClick={onRemove} className="admin-guide-btn-danger" title="Supprimer"><i className="fa-solid fa-trash" /></button>
        </div>
      </div>
      <div className="admin-guide-char-card-fields">
        <div className="admin-guide-char-card-field">
          <label>Nom</label>
          <input type="text" placeholder="Ex: Kéen" value={character.name || ""} onChange={(e) => onChange({ ...character, name: e.target.value })} />
        </div>
        <div className="admin-guide-char-card-field">
          <label>URL sprite</label>
          <input type="text" placeholder="/guide-sprites/sprite.gif" value={character.imageUrl || ""} onChange={(e) => onChange({ ...character, imageUrl: e.target.value })} />
        </div>
        <div className="admin-guide-char-card-field admin-guide-char-card-field--full">
          <label>Description</label>
          <input type="text" placeholder="Description du personnage..." value={character.description || ""} onChange={(e) => onChange({ ...character, description: e.target.value })} />
        </div>
      </div>
    </div>
  );
}

export default function GuideEditor({ initialData = null, onSave }) {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [disclaimer, setDisclaimer] = useState("");
  const [background, setBackground] = useState("");
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  const [showStepModal, setShowStepModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [insertAfterIndex, setInsertAfterIndex] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [collapsedSteps, setCollapsedSteps] = useState(new Set());
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
          setBackground(data.guide.background || "");
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
          setBackground(parsed.background || "");
          setSteps(Array.isArray(parsed.steps) ? parsed.steps : []);
        } else if (initialData) {
          setTitle(initialData.title || "");
          setSubtitle(initialData.subtitle || "");
          setDisclaimer(initialData.disclaimer || "");
          setBackground(initialData.background || "");
          setSteps(Array.isArray(initialData.steps) ? initialData.steps : []);
        }
      } catch {
        if (initialData) {
          setTitle(initialData.title || "");
          setSubtitle(initialData.subtitle || "");
          setDisclaimer(initialData.disclaimer || "");
          setBackground(initialData.background || "");
          setSteps(Array.isArray(initialData.steps) ? initialData.steps : []);
        }
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [initialData]);

  const saveToStorage = (dataToStore) => {
    const data = dataToStore ?? { title, subtitle, disclaimer, background, steps };
    localStorage.setItem(STORAGE_GUIDE, JSON.stringify(data));
    onSave?.(data);
  };

  const saveToApiNow = async (payload) => {
    const pl = payload ?? { title, subtitle, disclaimer, background: background || null, steps };
    setSaveMessage(null);
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/guide`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(pl),
      });
      const data = await res.json();
      if (data.success) {
        setSaveMessage({ type: "success", text: "Sauvegardé !" });
        setTimeout(() => setSaveMessage(null), 2500);
      } else {
        setSaveMessage({ type: "error", text: data.error || "Erreur lors de la sauvegarde." });
      }
    } catch {
      setSaveMessage({ type: "error", text: "Impossible de contacter le serveur." });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    saveToStorage();
    await saveToApiNow();
  };

  const renumberSteps = () => {
    const sorted = [...steps].sort((a, b) => (parseInt(a.num, 10) || 0) - (parseInt(b.num, 10) || 0));
    const renumbered = sorted.map((s, i) => ({ ...s, num: i + 1 }));
    setSteps(renumbered);
    saveToStorage({ title, subtitle, disclaimer, background, steps: renumbered });
    saveToApiNow({ title, subtitle, disclaimer, background: background || null, steps: renumbered });
  };

  const toggleCollapse = (index) => {
    setCollapsedSteps((prev) => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  };

  const collapseAll = () => setCollapsedSteps(new Set(sortedSteps.map((_, i) => i)));
  const expandAll = () => setCollapsedSteps(new Set());

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
    const highlight = form.highlightStr.split(",").map((h) => h.trim()).filter(Boolean);
    const step = {
      num: parseInt(form.num, 10) || steps.length + 1,
      text: form.text.trim(),
      imageUrl: form.imageUrl.trim() || "",
      highlight,
      characters: Array.isArray(form.characters)
        ? form.characters
            .filter((c) => c && (c.name || c.description || c.imageUrl))
            .map((c) => ({ name: (c.name || "").trim(), description: (c.description || "").trim(), imageUrl: (c.imageUrl || "").trim() }))
        : [],
    };
    let newSteps;
    if (editingIndex !== null) {
      newSteps = [...steps];
      newSteps[editingIndex] = step;
    } else if (insertAfterIndex !== null) {
      newSteps = [...steps];
      newSteps.splice(insertAfterIndex + 1, 0, step);
    } else {
      newSteps = [...steps, step].sort((a, b) => (a.num || 0) - (b.num || 0));
    }
    setSteps(newSteps);
    setShowStepModal(false);
    setInsertAfterIndex(null);
    saveToStorage({ title, subtitle, disclaimer, background, steps: newSteps });
    saveToApiNow({ title, subtitle, disclaimer, background: background || null, steps: newSteps });
  };

  const handleDelete = (index) => {
    const next = steps.filter((_, i) => i !== index);
    setSteps(next);
    setDeleteConfirm(null);
    saveToStorage({ title, subtitle, disclaimer, background, steps: next });
    saveToApiNow({ title, subtitle, disclaimer, background: background || null, steps: next });
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
    saveToStorage({ title, subtitle, disclaimer, background, steps: next });
    saveToApiNow({ title, subtitle, disclaimer, background: background || null, steps: next });
  };

  const updateCharacter = (idx, data) => {
    setForm((f) => {
      const next = [...(f.characters || [])];
      next[idx] = data;
      return { ...f, characters: next };
    });
  };

  const removeCharacter = (idx) => {
    setForm((f) => ({ ...f, characters: (f.characters || []).filter((_, j) => j !== idx) }));
  };

  const moveCharacter = (idx, dir) => {
    setForm((f) => {
      const arr = [...(f.characters || [])];
      const swap = dir === "up" ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= arr.length) return f;
      [arr[idx], arr[swap]] = [arr[swap], arr[idx]];
      return { ...f, characters: arr };
    });
  };

  const sortedSteps = useMemo(
    () => [...steps].sort((a, b) => (parseInt(a.num, 10) || 0) - (parseInt(b.num, 10) || 0)),
    [steps]
  );

  const filteredSteps = useMemo(() => {
    if (!searchQuery.trim()) return sortedSteps;
    const q = searchQuery.toLowerCase();
    return sortedSteps.filter(
      (s) =>
        (s.text || "").toLowerCase().includes(q) ||
        (s.highlight || []).some((h) => h.toLowerCase().includes(q)) ||
        (s.characters || []).some((c) => (c.name || "").toLowerCase().includes(q)) ||
        String(s.num).includes(searchQuery)
    );
  }, [sortedSteps, searchQuery]);

  const formPreviewStep = useMemo(() => ({
    num: form.num || "?",
    text: form.text || "Aperçu du texte…",
    imageUrl: form.imageUrl.trim() || DEFAULT_IMAGE,
    highlight: form.highlightStr.split(",").map((h) => h.trim()).filter(Boolean),
    characters: form.characters || [],
  }), [form]);

  if (loading) {
    return (
      <div className="admin-guide admin-guide-loading">
        <div className="admin-guide-loading-spinner"><i className="fa-solid fa-route fa-spin" /></div>
        <p>Chargement du guide…</p>
      </div>
    );
  }

  return (
    <div className="admin-guide">
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
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Guide Pokémon New World" />
          </div>
          <div className="admin-guide-field">
            <label>Sous-titre</label>
            <input type="text" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Walkthrough de l'histoire principale" />
          </div>
          <div className="admin-guide-field">
            <label>Avertissement (disclaimer)</label>
            <input type="text" value={disclaimer} onChange={(e) => setDisclaimer(e.target.value)} placeholder="Ce guide suit la trame principale, les quêtes annexes ne sont pas indiquées." />
          </div>
          <div className="admin-guide-field">
            <label>URL image de fond (page publique)</label>
            <input type="url" value={background} onChange={(e) => setBackground(e.target.value)} placeholder="https://… ou /image.jpg" />
          </div>
        </div>
      </section>

      <section className="admin-guide-card admin-guide-steps">
        <div className="admin-guide-steps-header">
          <h3><i className="fa-solid fa-list-ol" /> Étapes ({steps.length})</h3>
          <div className="admin-guide-steps-actions">
            <div className="admin-guide-search">
              <i className="fa-solid fa-magnifying-glass" />
              <input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Rechercher dans les étapes…" />
            </div>
            {saveMessage && (
              <span className={`admin-guide-toast admin-guide-toast--${saveMessage.type}`}>
                <i className={saveMessage.type === "success" ? "fa-solid fa-check-circle" : "fa-solid fa-exclamation-triangle"} />
                {saveMessage.text}
              </span>
            )}
            {steps.length > 1 && (
              <>
                <button type="button" onClick={renumberSteps} className="admin-guide-btn admin-guide-btn-ghost" title="Renuméroter 1, 2, 3…">
                  <i className="fa-solid fa-arrow-down-1-9" /> Renuméroter
                </button>
                <button type="button" onClick={collapsedSteps.size === sortedSteps.length ? expandAll : collapseAll} className="admin-guide-btn admin-guide-btn-ghost">
                  <i className={`fa-solid ${collapsedSteps.size === sortedSteps.length ? "fa-expand" : "fa-compress"}`} />
                  {collapsedSteps.size === sortedSteps.length ? " Tout déplier" : " Tout replier"}
                </button>
              </>
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
            <div className="admin-guide-empty-icon"><i className="fa-solid fa-route" /></div>
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
              const isCollapsed = collapsedSteps.has(sortedIdx);
              const charCount = (s.characters || []).length;
              const highlightCount = (s.highlight || []).length;
              return (
                <div key={`${s.num}-${globalIndex}`} className={`admin-guide-step-card${isCollapsed ? " admin-guide-step-card--collapsed" : ""}`}>
                  <div className="admin-guide-step-card-top" onClick={() => toggleCollapse(sortedIdx)}>
                    <div className="admin-guide-step-card-top-left">
                      <span className="admin-guide-step-card-badge">Étape {s.num}</span>
                      <span className="admin-guide-step-card-summary">
                        {(s.text || "").slice(0, 80)}{(s.text || "").length > 80 ? "…" : ""}
                      </span>
                    </div>
                    <div className="admin-guide-step-card-top-right">
                      {charCount > 0 && <span className="admin-guide-step-card-tag"><i className="fa-solid fa-users" /> {charCount}</span>}
                      {highlightCount > 0 && <span className="admin-guide-step-card-tag"><i className="fa-solid fa-highlighter" /> {highlightCount}</span>}
                      {s.imageUrl && <span className="admin-guide-step-card-tag"><i className="fa-solid fa-image" /></span>}
                      <i className={`fa-solid fa-chevron-${isCollapsed ? "down" : "up"} admin-guide-step-card-chevron`} />
                    </div>
                  </div>
                  {!isCollapsed && (
                    <div className="admin-guide-step-card-main">
                      <div className="admin-guide-step-card-preview">
                        <StepPreview step={s} onCharacterClick={setSelectedCharacter} />
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
                  )}
                </div>
              );
            })}
            {filteredSteps.length === 0 && searchQuery && (
              <p className="admin-guide-no-results">Aucune étape ne correspond à &quot;{searchQuery}&quot;.</p>
            )}
          </div>
        )}
      </section>

      {showStepModal &&
        createPortal(
          <div className="admin-guide-modal-overlay" onClick={() => setShowStepModal(false)} role="dialog" aria-modal="true" aria-labelledby="guide-modal-title">
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
                    <input type="number" value={form.num} onChange={(e) => setForm((f) => ({ ...f, num: e.target.value }))} min={1} />
                  </div>
                  <div className="admin-guide-field">
                    <label>
                      Texte de l'étape
                      <span className="admin-guide-char-count">{form.text.length} car.</span>
                    </label>
                    <textarea
                      value={form.text}
                      onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
                      placeholder="Description de l'étape..."
                      rows={5}
                    />
                  </div>
                  <div className="admin-guide-field">
                    <label>URL de l'image</label>
                    <input type="url" value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} placeholder="https://exemple.com/image.png" />
                    {form.imageUrl.trim() && (
                      <div className="admin-guide-img-preview">
                        <img src={form.imageUrl.trim()} alt="Aperçu" onError={(e) => (e.target.style.display = "none")} onLoad={(e) => (e.target.style.display = "block")} />
                      </div>
                    )}
                  </div>
                  <div className="admin-guide-field">
                    <label>Termes à mettre en évidence <span className="admin-guide-hint">(séparés par des virgules)</span></label>
                    <input type="text" value={form.highlightStr} onChange={(e) => setForm((f) => ({ ...f, highlightStr: e.target.value }))} placeholder="Kéen, Liora, Rose, Sentier Bifröst" />
                    {form.highlightStr.trim() && (
                      <div className="admin-guide-highlight-tags">
                        {form.highlightStr.split(",").map((h) => h.trim()).filter(Boolean).map((h, i) => (
                          <span key={i} className="admin-guide-highlight-tag">{h}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="admin-guide-field">
                    <label>
                      Personnages <span className="admin-guide-hint">(bulles cliquables)</span>
                      {(form.characters || []).length > 0 && <span className="admin-guide-char-count">{form.characters.length} perso.</span>}
                    </label>
                    <div className="admin-guide-characters-grid">
                      {(form.characters || []).map((c, i) => (
                        <CharacterCard
                          key={i}
                          character={c}
                          index={i}
                          onChange={(data) => updateCharacter(i, data)}
                          onRemove={() => removeCharacter(i)}
                          onMoveUp={() => moveCharacter(i, "up")}
                          onMoveDown={() => moveCharacter(i, "down")}
                          isFirst={i === 0}
                          isLast={i === (form.characters || []).length - 1}
                        />
                      ))}
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, characters: [...(f.characters || []), { name: "", description: "", imageUrl: "" }] }))}
                        className="admin-guide-btn admin-guide-btn-ghost admin-guide-add-char-btn"
                      >
                        <i className="fa-solid fa-user-plus" /> Ajouter un personnage
                      </button>
                    </div>
                  </div>
                </div>
                <div className="admin-guide-modal-preview">
                  <label>Aperçu</label>
                  <StepPreview step={formPreviewStep} />
                </div>
              </div>
              <div className="admin-guide-modal-footer">
                <button type="button" className="admin-guide-btn admin-guide-btn-ghost" onClick={() => setShowStepModal(false)}>Annuler</button>
                <button type="button" className="admin-guide-btn admin-guide-btn-primary" onClick={saveStep}>
                  <i className="fa-solid fa-check" /> Enregistrer
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {deleteConfirm !== null &&
        createPortal(
          <div className="admin-guide-confirm-overlay" onClick={() => setDeleteConfirm(null)}>
            <div className="admin-guide-confirm-box" onClick={(e) => e.stopPropagation()}>
              <h3><i className="fa-solid fa-triangle-exclamation" /> Supprimer cette étape ?</h3>
              <p>L'étape &quot;{(steps[deleteConfirm]?.text || "").slice(0, 80)}{(steps[deleteConfirm]?.text || "").length > 80 ? "…" : ""}&quot; sera définitivement supprimée.</p>
              <div className="admin-guide-confirm-actions">
                <button type="button" className="admin-guide-btn admin-guide-btn-ghost" onClick={() => setDeleteConfirm(null)}>Annuler</button>
                <button type="button" className="admin-guide-btn admin-guide-btn-danger" onClick={() => handleDelete(deleteConfirm)}>
                  <i className="fa-solid fa-trash" /> Supprimer
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {selectedCharacter &&
        createPortal(
          <CharacterModal character={selectedCharacter} onClose={() => setSelectedCharacter(null)} />,
          document.body
        )}
    </div>
  );
}
