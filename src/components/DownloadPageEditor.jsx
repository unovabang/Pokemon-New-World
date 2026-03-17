import { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:3001/api`
    : `${window.location.origin}/api`;

function SectionCard({ icon, iconColor, title, children }) {
  return (
    <section className="dp-editor-section">
      <h3 className="dp-editor-section-title" style={{ "--accent": iconColor || "var(--primary-2)" }}>
        <i className={`fa-solid ${icon}`} aria-hidden />
        <span>{title}</span>
      </h3>
      <div className="dp-editor-section-body">
        {children}
      </div>
    </section>
  );
}

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
    pageBackground: "",
    gallery: [],
    videoUrl: "",
    videoTitle: "",
    videoTitleEn: "",
    soundcloudPlaylistUrl: ""
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
            pageBackground: d.pageBackground ?? "",
            gallery: Array.isArray(d.gallery) ? d.gallery : [],
            videoUrl: d.videoUrl ?? "",
            videoTitle: d.videoTitle ?? "",
            videoTitleEn: d.videoTitleEn ?? "",
            soundcloudPlaylistUrl: d.soundcloudPlaylistUrl ?? ""
          });
        }
      })
      .catch(() => setMessage({ type: "error", text: "Erreur lors du chargement." }))
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
        setMessage({ type: "success", text: "Page téléchargement enregistrée." });
        onSave?.(form);
      } else {
        setMessage({ type: "error", text: data.error || "Erreur" });
      }
    } catch (e) {
      setMessage({ type: "error", text: "Erreur réseau." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="dp-editor-loading">
        <i className="fa-solid fa-spinner fa-spin" aria-hidden />
        <span>Chargement de la page téléchargement…</span>
      </div>
    );
  }

  return (
    <div className="dp-editor">
      <header className="dp-editor-header">
        <div className="dp-editor-header-text">
          <h2 className="dp-editor-title">
            <i className="fa-solid fa-cloud-arrow-down" aria-hidden />
            Page Téléchargement
          </h2>
          <p className="dp-editor-subtitle">
            Contenu de la page publique <strong>/telechargement</strong> : hero, description, galerie, vidéo.
          </p>
        </div>
        <div className="dp-editor-header-actions">
          <a href="/telechargement" target="_blank" rel="noopener noreferrer" className="btn btn-ghost dp-editor-btn-preview">
            <i className="fa-solid fa-external-link-alt" aria-hidden />
            Voir la page
          </a>
          <button type="button" onClick={handleSave} className="btn btn-primary" disabled={saving}>
            {saving ? <><i className="fa-solid fa-spinner fa-spin" aria-hidden /> Enregistrement…</> : <><i className="fa-solid fa-save" aria-hidden /> Enregistrer</>}
          </button>
        </div>
      </header>

      {message && (
        <div className={`dp-editor-message dp-editor-message--${message.type}`} role="alert">
          <i className={`fa-solid ${message.type === "success" ? "fa-circle-check" : "fa-circle-exclamation"}`} aria-hidden />
          {message.text}
        </div>
      )}

      <div className="dp-editor-grid">
        <SectionCard icon="fa-heading" iconColor="#7ecdf2" title="Hero & titres">
          <div className="dp-editor-fields">
            <div className="dp-editor-field">
              <label>Titre (FR)</label>
              <input type="text" value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="Télécharger Pokémon New World" />
            </div>
            <div className="dp-editor-field">
              <label>Titre (EN)</label>
              <input type="text" value={form.titleEn} onChange={(e) => update("titleEn", e.target.value)} placeholder="Download Pokémon New World" />
            </div>
            <div className="dp-editor-field">
              <label>Sous-titre (FR)</label>
              <input type="text" value={form.subtitle} onChange={(e) => update("subtitle", e.target.value)} placeholder="Rejoignez l'aventure avec le Launcher officiel" />
            </div>
            <div className="dp-editor-field">
              <label>Sous-titre (EN)</label>
              <input type="text" value={form.subtitleEn} onChange={(e) => update("subtitleEn", e.target.value)} placeholder="Join the adventure with the official Launcher" />
            </div>
            <div className="dp-editor-field">
              <label>Image hero (URL)</label>
              <input type="url" value={form.heroImage} onChange={(e) => update("heroImage", e.target.value)} placeholder="https://…" />
            </div>
            <div className="dp-editor-field">
              <label>Fond de page (URL image)</label>
              <input type="url" value={form.pageBackground} onChange={(e) => update("pageBackground", e.target.value)} placeholder="https://… (image de fond de la page)" />
            </div>
          </div>
        </SectionCard>

        <SectionCard icon="fa-align-left" iconColor="#a78bfa" title="Description du jeu">
          <div className="dp-editor-fields">
            <div className="dp-editor-field">
              <label>Description (FR)</label>
              <textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={4} placeholder="Présentation du jeu pour les visiteurs…" />
            </div>
            <div className="dp-editor-field">
              <label>Description (EN)</label>
              <textarea value={form.descriptionEn} onChange={(e) => update("descriptionEn", e.target.value)} rows={4} placeholder="Game description for visitors…" />
            </div>
          </div>
        </SectionCard>

        <SectionCard icon="fa-images" iconColor="#34d399" title="Galerie d’images">
          <p className="dp-editor-hint">URLs d’images affichées en grille sur la page. Ordre = ordre d’affichage.</p>
          <div className="dp-editor-gallery-list">
            {form.gallery.map((url, i) => (
              <div key={i} className="dp-editor-gallery-row">
                <input type="url" value={url} onChange={(e) => setGalleryUrl(i, e.target.value)} placeholder="https://…" />
                <button type="button" onClick={() => removeGalleryUrl(i)} className="dp-editor-btn-remove" aria-label="Supprimer cette image">
                  <i className="fa-solid fa-trash" aria-hidden />
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addGalleryUrl} className="dp-editor-btn-add">
            <i className="fa-solid fa-plus" aria-hidden />
            Ajouter une image
          </button>
        </SectionCard>

        <SectionCard icon="fa-film" iconColor="#f472b6" title="Vidéo">
          <p className="dp-editor-hint">Lien direct vers un fichier .mp4 (ou autre URL de vidéo). La vidéo sera lue directement sur la page.</p>
          <div className="dp-editor-fields">
            <div className="dp-editor-field">
              <label>URL vidéo (.mp4 ou lien direct)</label>
              <input type="url" value={form.videoUrl} onChange={(e) => update("videoUrl", e.target.value)} placeholder="https://…/video.mp4" />
            </div>
            <div className="dp-editor-field">
              <label>Titre de la section vidéo (FR)</label>
              <input type="text" value={form.videoTitle} onChange={(e) => update("videoTitle", e.target.value)} placeholder="Vidéo d’installation" />
            </div>
            <div className="dp-editor-field">
              <label>Titre de la section vidéo (EN)</label>
              <input type="text" value={form.videoTitleEn} onChange={(e) => update("videoTitleEn", e.target.value)} placeholder="Installation video" />
            </div>
          </div>
        </SectionCard>

        <SectionCard icon="fa-music" iconColor="#a78bfa" title="Bande son (SoundCloud)">
          <p className="dp-editor-hint">URL de la playlist SoundCloud (ex. https://soundcloud.com/…/sets/…). La section « Quelques bande son de PNW » s'affiche avec un lecteur play/pause et volume. Laissez vide pour masquer.</p>
          <div className="dp-editor-fields">
            <div className="dp-editor-field">
              <label>URL playlist SoundCloud</label>
              <input type="url" value={form.soundcloudPlaylistUrl} onChange={(e) => update("soundcloudPlaylistUrl", e.target.value)} placeholder="https://soundcloud.com/…/sets/…" />
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="dp-editor-footer">
        <a href="/telechargement" target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
          <i className="fa-solid fa-external-link-alt" aria-hidden />
          Voir la page
        </a>
        <button type="button" onClick={handleSave} className="btn btn-primary" disabled={saving}>
          {saving ? <><i className="fa-solid fa-spinner fa-spin" aria-hidden /> Enregistrement…</> : <><i className="fa-solid fa-save" aria-hidden /> Enregistrer</>}
        </button>
      </div>
    </div>
  );
}
