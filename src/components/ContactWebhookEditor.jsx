import { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:3001/api`
    : `${window.location.origin}/api`;

export default function ContactWebhookEditor() {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [backgroundImage, setBackgroundImage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/config/contact-webhook?t=${Date.now()}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.success) {
          setWebhookUrl(d.webhookUrl || "");
          setBackgroundImage(d.backgroundImage || "");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/config/contact-webhook`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl: webhookUrl.trim(), backgroundImage: backgroundImage.trim() }),
      });
      const data = await res.json();
      if (data?.success) {
        setMessage({ type: "success", text: "Configuration contact sauvegardée." });
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
        Les messages envoyés via le formulaire de contact seront transmis à ce webhook Discord sous forme d'embeds colorés par catégorie.
      </p>
      <label style={labelStyle}>
        <span style={spanStyle}>URL du Webhook Discord</span>
        <input type="text" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://discord.com/api/webhooks/..." style={inputStyle} />
      </label>
      <label style={labelStyle}>
        <span style={spanStyle}>Image de fond de la page Contact (URL)</span>
        <input type="text" value={backgroundImage} onChange={(e) => setBackgroundImage(e.target.value)} placeholder="https://exemple.com/contact-bg.jpg" style={inputStyle} />
      </label>
      {backgroundImage && <img src={backgroundImage} alt="" style={{ maxWidth: 240, maxHeight: 100, borderRadius: 8, objectFit: "cover" }} />}
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
