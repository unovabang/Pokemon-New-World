import { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:3001/api`
    : `${window.location.origin}/api`;

export default function DownloadPageEditor({ onSave }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [form, setForm] = useState({
    title: "",
    titleEn: "",
    subtitle: "",
    subtitleEn: "",
    description: "",
    descriptionEn: "",
    heroImage: "",
    gallery: [],
    videoUrl: "",
    videoTitle: "",
    videoTitleEn: ""
  });

  useEffect(() => {
    fetch(`${API_BASE}/download-page?t=${Date.now()}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setForm({
            title: d.title ?? "",
            titleEn: d.titleEn ?? "",
            subtitle: d.subtitle ?? "",
            subtitleEn: d.subtitleEn ?? "",
            description: d.description ?? "",
            descriptionEn: d.descriptionEn ?? "",
            heroImage: d.heroImage ?? "",
            gallery: Array.isArray(d.gallery) ? d.gallery : [],
            videoUrl: d.videoUrl ?? "",
            videoTitle: d.videoTitle ?? "",
            videoTitleEn: d.videoTitleEn ?? ""
          });
        }
      })
      .catch(() => setMessage({ type: "error", text: "Erreur chargement" }))
      .finally(() => setLoading(false));
  }, []);

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const addGalleryUrl = () => setForm((f) => ({ ...f, gallery: [...f.gallery, ""] }));
  const setGalleryUrl = (index, url) => setForm((f) => ({
    ...f,
    gallery: f.gallery.map((u, i) => (i === index ? url : u))
  }));
  const removeGalleryUrl = (index) => setForm((f) => ({
    ...f,
    gallery: f.gallery.filter((_, i) => i !== index)
  }));

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/download-page`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "Page téléchargement mise à jour." });
        onSave?.(form);
      } else {
        setMessage({ type: "error", text: data.error || "Erreur" });
      }
    } catch (e) {
      setMessage({ type: "error", text: "Erreur réseau" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-panel-card" style={{ textAlign: "center", padding: "3rem" }}>
        <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: "2rem", color: "var(--primary-2)" }} aria-hidden />
        <p style={{ marginTop: "1rem" }}>Chargement…</p>
      </div>
    );
  }

  return (
    <div className="download-page-editor">
      {message && (
        <div className={`admin-message admin-message--${message.type}`} role="alert">
          {message.text}
        </div>
      )}
      <div className="admin-panel-card" style={{ marginBottom: "1.5rem" }}>
        <h3 style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <i className="fa-solid fa-heading" style={{ color: "var(--primary-2)" }} />
          Hero & titres
        </h3>
        <div style={{ display: "grid", gap: "1rem" }}>
          <div>
            <label className="admin-label">Titre (FR)</label>
            <input type="text" value={form.title} onChange={(e) => update("title", e.target.value)} className="admin-input" placeholder="Télécharger Pokémon New World" />
          </div>
          <div>
            <label className="admin-label">Titre (EN)</label>
            <input type="text" value={form.titleEn} onChange={(e) => update("titleEn", e.target.value)} className="admin-input" placeholder="Download Pokémon New World" />
          </div>
          <div>
            <label className="admin-label">Sous-titre (FR)</label>
            <input type="text" value={form.subtitle} onChange={(e) => update("subtitle", e.target.value)} className="admin-input" placeholder="Rejoignez l'aventure avec le Launcher officiel" />
          </div>
          <div>
            <label className="admin-label">Sous-titre (EN)</label>
            <input type="text" value={form.subtitleEn} onChange={(e) => update("subtitleEn", e.target.value)} className="admin-input" />
          </div>
          <div>
            <label className="admin-label">Image hero (URL)</label>
            <input type="url" value={form.heroImage} onChange={(e) => update("heroImage", e.target.value)} className="admin-input" placeholder="https://..." />
          </div>
        </div>
      </div>

      <div className="admin-panel-card" style={{ marginBottom: "1.5rem" }}>
        <h3 style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <i className="fa-solid fa-align-left" style={{ color: "var(--primary-2)" }} />
          Description du jeu
        </h3>
        <div style={{ display: "grid", gap: "1rem" }}>
          <div>
            <label className="admin-label">Description (FR)</label>
            <textarea value={form.description} onChange={(e) => update("description", e.target.value)} className="admin-input" rows={4} placeholder="Texte de présentation…" />
          </div>
          <div>
            <label className="admin-label">Description (EN)</label>
            <textarea value={form.descriptionEn} onChange={(e) => update("descriptionEn", e.target.value)} className="admin-input" rows={4} />
          </div>
        </div>
      </div>

      <div className="admin-panel-card" style={{ marginBottom: "1.5rem" }}>
        <h3 style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <i className="fa-solid fa-images" style={{ color: "var(--primary-2)" }} />
          Galerie d&apos;images
        </h3>
        <p style={{ fontSize: "0.9rem", color: "var(--muted)", marginBottom: "1rem" }}>
          Ajoutez des URLs d&apos;images. Elles s&apos;afficheront en grille sur la page.
        </p>
        {form.gallery.map((url, i) => (
          <div key={i} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem", alignItems: "center" }}>
            <input type="url" value={url} onChange={(e) => setGalleryUrl(i, e.target.value)} className="admin-input" style={{ flex: 1 }} placeholder="https://..." />
            <button type="button" onClick={() => removeGalleryUrl(i)} className="btn btn-ghost" style={{ color: "#dc3545" }} aria-label="Supprimer">
              <i className="fa-solid fa-trash" />
            </button>
          </div>
        ))}
        <button type="button" onClick={addGalleryUrl} className="btn btn-ghost" style={{ marginTop: "0.5rem" }}>
          <i className="fa-solid fa-plus" /> Ajouter une image
        </button>
      </div>

      <div className="admin-panel-card" style={{ marginBottom: "1.5rem" }}>
        <h3 style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <i className="fa-solid fa-video" style={{ color: "var(--primary-2)" }} />
          Vidéo
        </h3>
        <div style={{ display: "grid", gap: "1rem" }}>
          <div>
            <label className="admin-label">URL vidéo (YouTube embed)</label>
            <input type="url" value={form.videoUrl} onChange={(e) => update("videoUrl", e.target.value)} className="admin-input" placeholder="https://www.youtube.com/embed/..." />
          </div>
          <div>
            <label className="admin-label">Titre section vidéo (FR)</label>
            <input type="text" value={form.videoTitle} onChange={(e) => update("videoTitle", e.target.value)} className="admin-input" placeholder="Vidéo d'installation" />
          </div>
          <div>
            <label className="admin-label">Titre section vidéo (EN)</label>
            <input type="text" value={form.videoTitleEn} onChange={(e) => update("videoTitleEn", e.target.value)} className="admin-input" placeholder="Installation video" />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
        <a href="/telechargement" target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
          <i className="fa-solid fa-external-link-alt" /> Voir la page
        </a>
        <button type="button" onClick={handleSave} className="btn btn-primary" disabled={saving}>
          {saving ? <><i className="fa-solid fa-spinner fa-spin" /> Enregistrement…</> : <><i className="fa-solid fa-save" /> Enregistrer</>}
        </button>
      </div>
    </div>
  );
}
