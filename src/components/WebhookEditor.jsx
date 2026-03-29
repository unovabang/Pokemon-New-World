import { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:3001/api`
    : `${window.location.origin}/api`;

export default function WebhookEditor() {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [embed, setEmbed] = useState({ title: "", description: "", color: "#5865F2", image: "", thumbnail: "", footer: "", buttonLabel: "", buttonUrl: "" });
  const [intervalHours, setIntervalHours] = useState(2);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/config/webhook?t=${Date.now()}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.success) {
          setWebhookUrl(d.webhookUrl || "");
          setUsername(d.username || "");
          setAvatarUrl(d.avatarUrl || "");
          setEmbed(d.embed || { title: "", description: "", color: "#5865F2", image: "", thumbnail: "", footer: "", buttonLabel: "", buttonUrl: "" });
          setIntervalHours(d.intervalHours || 2);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updateEmbed = (key, value) => setEmbed((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/config/webhook`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl: webhookUrl.trim(), username: username.trim(), avatarUrl: avatarUrl.trim(), embed, intervalHours }),
      });
      const data = await res.json();
      if (data?.success) {
        setMessage({ type: "success", text: "Configuration webhook sauvegardée." });
      } else {
        setMessage({ type: "error", text: data?.error || "Erreur." });
      }
    } catch {
      setMessage({ type: "error", text: "Impossible de joindre le serveur." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p style={{ color: "rgba(255,255,255,0.5)" }}><i className="fa-solid fa-spinner fa-spin" /> Chargement...</p>;

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      {message && <div className={`admin-panel-message admin-panel-message--${message.type}`}>{message.text}</div>}
      <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.55)", margin: 0 }}>
        Configurez un message automatique (embed) envoyé périodiquement via le webhook Discord.
      </p>

      {/* Webhook settings */}
      <label style={labelStyle}>
        <span style={spanStyle}>URL du Webhook Discord</span>
        <input type="text" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://discord.com/api/webhooks/..." style={inputStyle} />
      </label>
      <label style={labelStyle}>
        <span style={spanStyle}>Nom du Webhook</span>
        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Bot PNW" style={inputStyle} />
      </label>
      <label style={labelStyle}>
        <span style={spanStyle}>Photo de profil du Webhook (URL)</span>
        <input type="text" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://exemple.com/avatar.png" style={inputStyle} />
      </label>
      {avatarUrl && <img src={avatarUrl} alt="" style={{ maxWidth: 64, maxHeight: 64, borderRadius: "50%", objectFit: "cover" }} />}

      {/* Embed settings */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "1rem", marginTop: "0.25rem" }}>
        <span style={{ ...spanStyle, fontSize: "0.85rem", marginBottom: "0.5rem", display: "block" }}>Embed Discord</span>
      </div>
      <label style={labelStyle}>
        <span style={spanStyle}>Titre</span>
        <input type="text" value={embed.title} onChange={(e) => updateEmbed("title", e.target.value)} placeholder="Titre de l'embed" style={inputStyle} />
      </label>
      <label style={labelStyle}>
        <span style={spanStyle}>Description</span>
        <textarea value={embed.description} onChange={(e) => updateEmbed("description", e.target.value)} placeholder="Description de l'embed..." rows={4} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
      </label>
      <label style={labelStyle}>
        <span style={spanStyle}>Couleur</span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input type="color" value={embed.color} onChange={(e) => updateEmbed("color", e.target.value)} style={{ width: 40, height: 34, border: "none", background: "none", cursor: "pointer" }} />
          <input type="text" value={embed.color} onChange={(e) => updateEmbed("color", e.target.value)} placeholder="#5865F2" style={{ ...inputStyle, flex: 1 }} />
        </div>
      </label>
      <label style={labelStyle}>
        <span style={spanStyle}>Image (URL)</span>
        <input type="text" value={embed.image} onChange={(e) => updateEmbed("image", e.target.value)} placeholder="https://exemple.com/image.png" style={inputStyle} />
      </label>
      {embed.image && <img src={embed.image} alt="" style={{ maxWidth: 240, maxHeight: 120, borderRadius: 8, objectFit: "cover" }} />}
      <label style={labelStyle}>
        <span style={spanStyle}>Miniature / Thumbnail (URL)</span>
        <input type="text" value={embed.thumbnail} onChange={(e) => updateEmbed("thumbnail", e.target.value)} placeholder="https://exemple.com/thumb.png" style={inputStyle} />
      </label>
      <label style={labelStyle}>
        <span style={spanStyle}>Footer</span>
        <input type="text" value={embed.footer} onChange={(e) => updateEmbed("footer", e.target.value)} placeholder="Texte du footer" style={inputStyle} />
      </label>

      {/* Button */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "1rem", marginTop: "0.25rem" }}>
        <span style={{ ...spanStyle, fontSize: "0.85rem", marginBottom: "0.5rem", display: "block" }}>Bouton (optionnel)</span>
      </div>
      <label style={labelStyle}>
        <span style={spanStyle}>Texte du bouton</span>
        <input type="text" value={embed.buttonLabel || ""} onChange={(e) => updateEmbed("buttonLabel", e.target.value)} placeholder="Rejoindre le serveur" style={inputStyle} />
      </label>
      <label style={labelStyle}>
        <span style={spanStyle}>URL du bouton</span>
        <input type="text" value={embed.buttonUrl || ""} onChange={(e) => updateEmbed("buttonUrl", e.target.value)} placeholder="https://exemple.com" style={inputStyle} />
      </label>

      {/* Interval */}
      <label style={labelStyle}>
        <span style={spanStyle}>Intervalle d'envoi (heures)</span>
        <input type="number" min={1} value={intervalHours} onChange={(e) => setIntervalHours(Math.max(1, parseInt(e.target.value) || 2))} style={{ ...inputStyle, maxWidth: 120 }} />
      </label>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" onClick={save} disabled={saving} className="admin-panel-btn admin-panel-btn--primary">
          <i className={saving ? "fa-solid fa-spinner fa-spin" : "fa-solid fa-save"} /> Sauvegarder
        </button>
      </div>
    </div>
  );
}

const labelStyle = { display: "flex", flexDirection: "column", gap: "0.3rem" };
const spanStyle = { fontSize: "0.8rem", fontWeight: 600, color: "rgba(255,255,255,0.65)", textTransform: "uppercase", letterSpacing: "0.06em" };
const inputStyle = { padding: "0.55rem 0.75rem", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: "0.95rem", outline: "none", width: "100%", boxSizing: "border-box" };
