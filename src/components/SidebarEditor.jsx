import { useState, useEffect } from "react";
import { authHeaders } from "../utils/authHeaders";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : `${window.location.origin}/api`;

const DEFAULT_ITEMS = [
  { id: "accueil", label: "Accueil", icon: "fa-house", to: "/" },
  { id: "lore", label: "Le Lore", icon: "fa-scroll", to: "/lore", highlight: true },
  { id: "pokedex", label: "Pokedex", icon: "fa-book", to: "/pokedex" },
  { id: "guide", label: "Guide", icon: "fa-book-open", to: "/guide" },
  { id: "patchnotes", label: "PatchNotes", icon: "fa-file-lines", to: "/patchnotes" },
  { id: "items", label: "Items locations", icon: "fa-location-dot", to: "/item-location" },
  { id: "evs", label: "EVs locations", icon: "fa-location-dot", to: "/evs-location" },
  { id: "bst", label: "All BST + new Abilities", icon: "fa-table", to: "/bst" },
  { id: "nerfs", label: "Nerfs and buffs", icon: "fa-scale-balanced", to: "/nerfs-and-buffs" },
  { id: "equipe", label: "L'équipe", icon: "fa-users", to: "/equipe" },
];

export default function SidebarEditor({ onSave }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [items, setItems] = useState(DEFAULT_ITEMS);
  const [backgroundImage, setBackgroundImage] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/config/sidebar?t=${Date.now()}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && d?.config) {
          if (Array.isArray(d.config.items) && d.config.items.length) setItems(d.config.items);
          if (typeof d.config.backgroundImage === "string") setBackgroundImage(d.config.backgroundImage);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const payload = { items, backgroundImage: backgroundImage.trim() };
      const res = await fetch(`${API_BASE}/config/sidebar`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ config: payload }),
      });
      const data = await res.json();
      if (data?.success) {
        setMessage({ type: "success", text: "Sidebar sauvegardée." });
        if (onSave) onSave("sidebar", payload);
      } else {
        setMessage({ type: "error", text: data?.error || "Erreur." });
      }
    } catch {
      setMessage({ type: "error", text: "Impossible de joindre le serveur." });
    } finally {
      setSaving(false);
    }
  };

  const updateItem = (index, key, value) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  };

  const moveItem = (index, dir) => {
    const j = index + dir;
    if (j < 0 || j >= items.length) return;
    setItems((prev) => {
      const arr = [...prev];
      [arr[index], arr[j]] = [arr[j], arr[index]];
      return arr;
    });
  };

  if (loading) return <p style={{ color: "rgba(255,255,255,0.5)", padding: "1rem 0" }}><i className="fa-solid fa-spinner fa-spin" /> Chargement...</p>;

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      {message && (
        <div className={`admin-panel-message admin-panel-message--${message.type}`}>{message.text}</div>
      )}

      {/* Background */}
      <div>
        <label style={labelStyle}>
          <span style={spanStyle}>Image de fond de la sidebar (URL)</span>
          <input
            type="text"
            value={backgroundImage}
            onChange={(e) => setBackgroundImage(e.target.value)}
            placeholder="https://exemple.com/sidebar-bg.jpg"
            style={inputStyle}
          />
        </label>
        {backgroundImage && (
          <img src={backgroundImage} alt="" style={{ marginTop: "0.5rem", maxWidth: 200, maxHeight: 80, borderRadius: 8, objectFit: "cover" }} />
        )}
      </div>

      {/* Items */}
      <div>
        <h4 style={{ fontSize: "0.85rem", fontWeight: 700, color: "rgba(255,255,255,0.7)", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          <i className="fa-solid fa-bars" /> Intitulés du menu ({items.length})
        </h4>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {items.map((item, i) => (
            <div key={item.id} style={rowCard}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0, flex: 1, flexWrap: "wrap" }}>
                <span style={{ width: 28, textAlign: "center", color: "rgba(212,175,55,0.5)", fontWeight: 700, fontSize: "0.85rem", flexShrink: 0 }}>{i + 1}</span>
                <i className={`fa-solid ${item.icon}`} style={{ color: "rgba(255,255,255,0.5)", width: 20, textAlign: "center", flexShrink: 0 }} />
                <input
                  type="text"
                  value={item.label}
                  onChange={(e) => updateItem(i, "label", e.target.value)}
                  style={{ ...inputStyle, flex: 1, minWidth: 100 }}
                  placeholder="Intitulé"
                />
                <input
                  type="text"
                  value={item.icon}
                  onChange={(e) => updateItem(i, "icon", e.target.value)}
                  style={{ ...inputStyle, width: 140, flexShrink: 0 }}
                  placeholder="fa-icon"
                  title="Classe Font Awesome (ex: fa-house)"
                />
                <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.35)", flexShrink: 0 }}>{item.to}</span>
              </div>
              <div style={{ display: "flex", gap: "0.25rem", flexShrink: 0 }}>
                <button type="button" onClick={() => moveItem(i, -1)} disabled={i === 0} className="admin-panel-btn admin-panel-btn--secondary" style={arrowBtnStyle} title="Monter">
                  <i className="fa-solid fa-arrow-up" />
                </button>
                <button type="button" onClick={() => moveItem(i, 1)} disabled={i === items.length - 1} className="admin-panel-btn admin-panel-btn--secondary" style={arrowBtnStyle} title="Descendre">
                  <i className="fa-solid fa-arrow-down" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" onClick={save} disabled={saving} className="admin-panel-btn admin-panel-btn--primary">
          <i className={saving ? "fa-solid fa-spinner fa-spin" : "fa-solid fa-save"} /> Sauvegarder la sidebar
        </button>
      </div>
    </div>
  );
}

const labelStyle = { display: "flex", flexDirection: "column", gap: "0.3rem" };
const spanStyle = { fontSize: "0.8rem", fontWeight: 600, color: "rgba(255,255,255,0.65)", textTransform: "uppercase", letterSpacing: "0.06em" };
const inputStyle = { padding: "0.5rem 0.7rem", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: "0.9rem", outline: "none", boxSizing: "border-box" };
const rowCard = { display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.55rem 0.7rem", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" };
const arrowBtnStyle = { padding: "0.35rem 0.5rem", fontSize: "0.75rem", minWidth: 0 };
