import { useState, useEffect, useRef } from "react";
import MarkdownToolbar from "./MarkdownToolbar";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:3001/api`
    : `${window.location.origin}/api`;

function generateSlug(title) {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function extractYoutubeId(input) {
  if (!input) return "";
  const s = input.trim();
  const m = s.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?.*v=|embed\/|v\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
  return s;
}

function emptyStory() {
  return {
    slug: "",
    title: "",
    titleEn: "",
    description: "",
    descriptionEn: "",
    backgroundImage: "",
    isNew: false,
    musicYoutubeId: "",
    author: "",
    authorEn: "",
    intro: "",
    introEn: "",
    content: [""],
    contentEn: [""],
  };
}

function ContentBlock({ lang, items, onUpdate, onAdd, onRemove, onAddImage }) {
  const refs = useRef({});
  const getRef = (i) => {
    if (!refs.current[i]) refs.current[i] = { current: null };
    return refs.current[i];
  };
  const labelFr = lang === "fr";

  return (
    <fieldset style={fieldsetStyle}>
      <legend style={legendStyle}>
        <i className="fa-solid fa-paragraph" aria-hidden /> {labelFr ? "Contenu FR" : "Contenu EN"} ({items.length} élément{items.length > 1 ? "s" : ""})
      </legend>
      {items.map((p, i) => {
        const isImage = typeof p === "string" && p.startsWith("![");
        if (isImage) {
          const srcMatch = p.match(/!\[.*?\]\((.*?)\)/);
          const src = srcMatch ? srcMatch[1] : "";
          return (
            <div key={i} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem", alignItems: "center" }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <span style={{ fontSize: "0.75rem", color: "rgba(212,175,55,0.7)", fontWeight: 600 }}><i className="fa-solid fa-image" /> IMAGE</span>
                <input
                  type="text"
                  value={src}
                  onChange={(e) => onUpdate(i, `![image](${e.target.value})`)}
                  placeholder="https://exemple.com/image.png"
                  style={inputStyle}
                />
                {src && <img src={src} alt="" style={{ maxWidth: 200, maxHeight: 100, borderRadius: 6, objectFit: "cover", marginTop: 2 }} />}
              </div>
              <button type="button" onClick={() => onRemove(i)} className="admin-panel-btn admin-panel-btn--danger" style={{ height: "fit-content", padding: "0.45rem 0.6rem", fontSize: "0.8rem" }} title="Supprimer"><i className="fa-solid fa-trash" /></button>
            </div>
          );
        }
        const ref = getRef(i);
        return (
          <div key={i} style={{ marginBottom: "0.5rem" }}>
            <MarkdownToolbar textareaRef={ref} onUpdate={(v) => onUpdate(i, v)} />
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <textarea
                ref={(el) => { ref.current = el; }}
                value={p}
                onChange={(e) => onUpdate(i, e.target.value)}
                rows={3}
                style={{ ...textareaStyle, flex: 1 }}
                placeholder={labelFr ? `Paragraphe ${i + 1}...` : `Paragraph ${i + 1}...`}
              />
              <button type="button" onClick={() => onRemove(i)} className="admin-panel-btn admin-panel-btn--danger" style={{ height: "fit-content", padding: "0.45rem 0.6rem", fontSize: "0.8rem" }} title="Supprimer"><i className="fa-solid fa-trash" /></button>
            </div>
          </div>
        );
      })}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button type="button" onClick={onAdd} className="admin-panel-btn admin-panel-btn--secondary" style={{ fontSize: "0.85rem" }}>
          <i className="fa-solid fa-plus" /> {labelFr ? "Ajouter un paragraphe" : "Add paragraph"}
        </button>
        <button type="button" onClick={onAddImage} className="admin-panel-btn admin-panel-btn--secondary" style={{ fontSize: "0.85rem" }}>
          <i className="fa-solid fa-image" /> {labelFr ? "Ajouter une image" : "Add image"}
        </button>
      </div>
    </fieldset>
  );
}

export default function LoreEditor() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [stories, setStories] = useState([]);
  const [pageBackground, setPageBackground] = useState("");
  const [editIndex, setEditIndex] = useState(null);
  const [form, setForm] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/lore?t=${Date.now()}`);
      const data = await res.json();
      if (data?.success) {
        setStories(Array.isArray(data.lore?.stories) ? data.lore.stories : []);
        setPageBackground(data.lore?.pageBackground || "");
      }
    } catch {
      setStories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async (newStories, newBg) => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/lore`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stories: newStories, pageBackground: newBg !== undefined ? newBg : pageBackground }),
      });
      const data = await res.json();
      if (data?.success) {
        setStories(data.lore?.stories || newStories);
        if (data.lore?.pageBackground !== undefined) setPageBackground(data.lore.pageBackground);
        setMessage({ type: "success", text: "Lore sauvegardé avec succès." });
      } else {
        setMessage({ type: "error", text: data?.error || "Erreur lors de la sauvegarde." });
      }
    } catch {
      setMessage({ type: "error", text: "Impossible de joindre le serveur." });
    } finally {
      setSaving(false);
    }
  };

  const saveBackground = () => save(stories, pageBackground);

  const openNew = () => { setEditIndex(-1); setForm(emptyStory()); };

  const openEdit = (i) => {
    const s = stories[i];
    setEditIndex(i);
    setForm({
      ...emptyStory(),
      ...s,
      content: Array.isArray(s.content) && s.content.length ? s.content : [""],
      contentEn: Array.isArray(s.contentEn) && s.contentEn.length ? s.contentEn : [""],
    });
  };

  const closeForm = () => { setEditIndex(null); setForm(null); };

  const updateField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleMusicInput = (value) => {
    updateField("musicYoutubeId", extractYoutubeId(value));
  };

  const updateTitleAndSlug = (value) => {
    setForm((f) => {
      const isNewEntry = editIndex === -1;
      const slugAuto = isNewEntry || f.slug === generateSlug(f.title);
      return { ...f, title: value, ...(slugAuto ? { slug: generateSlug(value) } : {}) };
    });
  };

  const updateItem = (lang, idx, value) => {
    const key = lang === "en" ? "contentEn" : "content";
    setForm((f) => { const arr = [...f[key]]; arr[idx] = value; return { ...f, [key]: arr }; });
  };
  const addItem = (lang) => {
    const key = lang === "en" ? "contentEn" : "content";
    setForm((f) => ({ ...f, [key]: [...f[key], ""] }));
  };
  const addImage = (lang) => {
    const key = lang === "en" ? "contentEn" : "content";
    setForm((f) => ({ ...f, [key]: [...f[key], "![image](https://)"] }));
  };
  const removeItem = (lang, idx) => {
    const key = lang === "en" ? "contentEn" : "content";
    setForm((f) => { const arr = f[key].filter((_, i) => i !== idx); return { ...f, [key]: arr.length ? arr : [""] }; });
  };

  const submitForm = () => {
    if (!form.title.trim()) { setMessage({ type: "error", text: "Le titre FR est obligatoire." }); return; }
    const slug = form.slug.trim() || generateSlug(form.title);
    const entry = { ...form, slug, content: form.content.filter((p) => p.trim()), contentEn: form.contentEn.filter((p) => p.trim()) };
    if (!entry.content.length) entry.content = [""];
    let updated;
    if (editIndex === -1) {
      if (stories.some((s) => s.slug === slug)) { setMessage({ type: "error", text: "Un chapitre avec ce slug existe déjà." }); return; }
      updated = [...stories, entry];
    } else {
      updated = stories.map((s, i) => (i === editIndex ? entry : s));
    }
    save(updated);
    closeForm();
  };

  const deleteStory = (i) => { save(stories.filter((_, idx) => idx !== i)); setDeleteConfirm(null); };
  const moveStory = (i, dir) => { const j = i + dir; if (j < 0 || j >= stories.length) return; const arr = [...stories]; [arr[i], arr[j]] = [arr[j], arr[i]]; save(arr); };

  if (loading) return <div className="admin-panel-card"><p className="admin-panel-loading"><i className="fa-solid fa-spinner fa-spin" /> Chargement du lore...</p></div>;

  if (form) {
    return (
      <div className="admin-panel-card" style={{ maxWidth: 860, margin: "0 auto" }}>
        <div className="admin-panel-card-head" style={{ marginBottom: "1.5rem" }}>
          <h2 className="admin-panel-card-title">
            <i className="fa-solid fa-scroll" />{" "}
            {editIndex === -1 ? "Nouveau chapitre" : `Éditer : ${form.title || "Sans titre"}`}
          </h2>
          <button type="button" onClick={closeForm} className="admin-panel-btn admin-panel-btn--secondary" style={{ marginLeft: "auto" }}>
            <i className="fa-solid fa-xmark" /> Annuler
          </button>
        </div>

        {message && <div className={`admin-panel-message admin-panel-message--${message.type}`} style={{ marginBottom: "1rem" }}>{message.text}</div>}

        <div style={{ display: "grid", gap: "1rem" }}>
          <label style={labelStyle}><span style={spanStyle}>Slug (URL)</span>
            <input type="text" value={form.slug} onChange={(e) => updateField("slug", e.target.value.replace(/[^a-z0-9-]/g, ""))} placeholder="chant-des-origines" style={inputStyle} />
          </label>

          <div style={rowStyle}>
            <label style={{ ...labelStyle, flex: 1 }}><span style={spanStyle}>Titre FR *</span>
              <input type="text" value={form.title} onChange={(e) => updateTitleAndSlug(e.target.value)} placeholder="Le chant des origines" style={inputStyle} />
            </label>
            <label style={{ ...labelStyle, flex: 1 }}><span style={spanStyle}>Titre EN</span>
              <input type="text" value={form.titleEn} onChange={(e) => updateField("titleEn", e.target.value)} placeholder="The Song of Origins" style={inputStyle} />
            </label>
          </div>

          <label style={labelStyle}><span style={spanStyle}>Description FR</span>
            <textarea value={form.description} onChange={(e) => updateField("description", e.target.value)} rows={2} style={textareaStyle} placeholder="Résumé court du chapitre..." />
          </label>
          <label style={labelStyle}><span style={spanStyle}>Description EN</span>
            <textarea value={form.descriptionEn} onChange={(e) => updateField("descriptionEn", e.target.value)} rows={2} style={textareaStyle} placeholder="Short chapter summary..." />
          </label>

          <div style={rowStyle}>
            <label style={{ ...labelStyle, flex: 1 }}><span style={spanStyle}>Auteur FR</span>
              <input type="text" value={form.author} onChange={(e) => updateField("author", e.target.value)} placeholder="Chroniques de Bélamie" style={inputStyle} />
            </label>
            <label style={{ ...labelStyle, flex: 1 }}><span style={spanStyle}>Auteur EN</span>
              <input type="text" value={form.authorEn} onChange={(e) => updateField("authorEn", e.target.value)} placeholder="Bélamie Chronicles" style={inputStyle} />
            </label>
          </div>

          <label style={labelStyle}><span style={spanStyle}>Introduction FR</span>
            <textarea value={form.intro} onChange={(e) => updateField("intro", e.target.value)} rows={2} style={textareaStyle} placeholder="Texte d'introduction en italique..." />
          </label>
          <label style={labelStyle}><span style={spanStyle}>Introduction EN</span>
            <textarea value={form.introEn} onChange={(e) => updateField("introEn", e.target.value)} rows={2} style={textareaStyle} placeholder="Italic introduction text..." />
          </label>

          <div style={rowStyle}>
            <label style={{ ...labelStyle, flex: 1 }}><span style={spanStyle}>Image de fond du chapitre (URL)</span>
              <input type="text" value={form.backgroundImage} onChange={(e) => updateField("backgroundImage", e.target.value)} placeholder="https://..." style={inputStyle} />
            </label>
            <label style={{ ...labelStyle, flex: 1 }}><span style={spanStyle}>Musique YouTube (lien ou ID)</span>
              <input type="text" value={form.musicYoutubeId} onChange={(e) => handleMusicInput(e.target.value)} placeholder="https://youtu.be/Uz1sz9cc2PI ou Uz1sz9cc2PI" style={inputStyle} />
            </label>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
            <input type="checkbox" checked={form.isNew} onChange={(e) => updateField("isNew", e.target.checked)} style={{ width: 18, height: 18, accentColor: "#d4af37" }} />
            <span style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.85)" }}>Marquer comme « Nouveau »</span>
          </label>

          <ContentBlock lang="fr" items={form.content} onUpdate={(i, v) => updateItem("fr", i, v)} onAdd={() => addItem("fr")} onRemove={(i) => removeItem("fr", i)} onAddImage={() => addImage("fr")} />
          <ContentBlock lang="en" items={form.contentEn} onUpdate={(i, v) => updateItem("en", i, v)} onAdd={() => addItem("en")} onRemove={(i) => removeItem("en", i)} onAddImage={() => addImage("en")} />

          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
            <button type="button" onClick={closeForm} className="admin-panel-btn admin-panel-btn--secondary"><i className="fa-solid fa-xmark" /> Annuler</button>
            <button type="button" onClick={submitForm} className="admin-panel-btn admin-panel-btn--primary" disabled={saving}>
              <i className={saving ? "fa-solid fa-spinner fa-spin" : "fa-solid fa-save"} />{" "}
              {editIndex === -1 ? "Créer le chapitre" : "Sauvegarder"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Background page lore */}
      <div className="admin-panel-card">
        <h3 className="admin-panel-card-title" style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>
          <i className="fa-solid fa-image" /> Fond de la page d'accueil Lore
        </h3>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end", flexWrap: "wrap" }}>
          <label style={{ ...labelStyle, flex: 1 }}>
            <span style={spanStyle}>URL de l'image de fond</span>
            <input type="text" value={pageBackground} onChange={(e) => setPageBackground(e.target.value)} placeholder="https://..." style={inputStyle} />
          </label>
          <button type="button" onClick={saveBackground} disabled={saving} className="admin-panel-btn admin-panel-btn--primary" style={{ height: "fit-content" }}>
            <i className={saving ? "fa-solid fa-spinner fa-spin" : "fa-solid fa-save"} /> Sauvegarder
          </button>
        </div>
        {pageBackground && <img src={pageBackground} alt="" style={{ marginTop: "0.75rem", maxWidth: 320, maxHeight: 120, borderRadius: 8, objectFit: "cover" }} />}
      </div>

      {/* Liste chapitres */}
      <div className="admin-panel-card">
        <div className="admin-panel-card-head" style={{ marginBottom: "1.5rem" }}>
          <h2 className="admin-panel-card-title"><i className="fa-solid fa-scroll" /> Gestion du Lore</h2>
          <button type="button" onClick={openNew} className="admin-panel-btn admin-panel-btn--primary" style={{ marginLeft: "auto" }}>
            <i className="fa-solid fa-plus" /> Nouveau chapitre
          </button>
        </div>

        {message && <div className={`admin-panel-message admin-panel-message--${message.type}`} style={{ marginBottom: "1rem" }}>{message.text}</div>}

        {stories.length === 0 ? (
          <p style={{ textAlign: "center", color: "rgba(255,255,255,0.5)", padding: "2rem 0" }}>Aucun chapitre pour le moment.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {stories.map((story, i) => (
              <div key={story.slug || i} style={cardStyle}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: "1.5rem", opacity: 0.6, fontWeight: 700, minWidth: 30, textAlign: "center", color: "rgba(212,175,55,0.5)" }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, fontSize: "1rem", color: "#fff" }}>{story.title || "Sans titre"}</span>
                      {story.isNew && <span style={badgeNew}><i className="fa-solid fa-bolt" style={{ fontSize: "0.6rem" }} /> Nouveau</span>}
                      {story.musicYoutubeId && <span style={badgeMusic}><i className="fa-solid fa-music" style={{ fontSize: "0.6rem" }} /> Musique</span>}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.45)", marginTop: "0.2rem" }}>
                      /{story.slug} — {story.content?.length || 0} élément{(story.content?.length || 0) > 1 ? "s" : ""} — {story.author || "—"}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.35rem", alignItems: "center", flexShrink: 0 }}>
                  <button type="button" onClick={() => moveStory(i, -1)} disabled={i === 0 || saving} className="admin-panel-btn admin-panel-btn--secondary" style={smallBtnStyle} title="Monter"><i className="fa-solid fa-arrow-up" /></button>
                  <button type="button" onClick={() => moveStory(i, 1)} disabled={i === stories.length - 1 || saving} className="admin-panel-btn admin-panel-btn--secondary" style={smallBtnStyle} title="Descendre"><i className="fa-solid fa-arrow-down" /></button>
                  <button type="button" onClick={() => openEdit(i)} className="admin-panel-btn admin-panel-btn--secondary" style={smallBtnStyle} title="Modifier"><i className="fa-solid fa-pen" /></button>
                  {deleteConfirm === i ? (
                    <>
                      <button type="button" onClick={() => deleteStory(i)} className="admin-panel-btn admin-panel-btn--danger" style={smallBtnStyle} title="Confirmer"><i className="fa-solid fa-check" /></button>
                      <button type="button" onClick={() => setDeleteConfirm(null)} className="admin-panel-btn admin-panel-btn--secondary" style={smallBtnStyle} title="Annuler"><i className="fa-solid fa-xmark" /></button>
                    </>
                  ) : (
                    <button type="button" onClick={() => setDeleteConfirm(i)} className="admin-panel-btn admin-panel-btn--danger" style={smallBtnStyle} title="Supprimer"><i className="fa-solid fa-trash" /></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const labelStyle = { display: "flex", flexDirection: "column", gap: "0.3rem" };
const spanStyle = { fontSize: "0.8rem", fontWeight: 600, color: "rgba(255,255,255,0.65)", textTransform: "uppercase", letterSpacing: "0.06em" };
const inputStyle = { padding: "0.55rem 0.75rem", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: "0.95rem", outline: "none", width: "100%", boxSizing: "border-box" };
const textareaStyle = { ...inputStyle, resize: "vertical", fontFamily: "inherit", lineHeight: 1.55 };
const rowStyle = { display: "flex", gap: "1rem", flexWrap: "wrap" };
const fieldsetStyle = { border: "1px solid rgba(212,175,55,0.2)", borderRadius: 12, padding: "1rem", margin: 0 };
const legendStyle = { fontSize: "0.85rem", fontWeight: 700, color: "var(--lore-gold, #d4af37)", padding: "0 0.5rem" };
const cardStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", padding: "0.85rem 1rem", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", flexWrap: "wrap" };
const smallBtnStyle = { padding: "0.4rem 0.55rem", fontSize: "0.8rem", minWidth: 0 };
const badgeNew = { display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.65rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: 999, background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.35)", color: "#d4af37" };
const badgeMusic = { display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.65rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: 999, background: "rgba(100,160,255,0.1)", border: "1px solid rgba(100,160,255,0.3)", color: "#7eb8f0" };
