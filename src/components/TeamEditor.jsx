import { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:3001/api`
    : `${window.location.origin}/api`;

const DEFAULT_ROLE_COLOR = "#7ecdf2";

function generateId() {
  return String(Date.now() + Math.random().toString(36).slice(2, 9));
}

export default function TeamEditor() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [members, setMembers] = useState([]);
  const [thanks, setThanks] = useState([]);
  const [showBackground, setShowBackground] = useState(true);
  const [backgroundImage, setBackgroundImage] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/config/team?t=${Date.now()}`);
      const data = await res.json();
      if (data?.success && data?.config) {
        const m = Array.isArray(data.config.members) ? data.config.members : [];
        setMembers(m.map((x) => ({ ...x, id: x.id || generateId() })));
        setThanks(Array.isArray(data.config.thanks) ? data.config.thanks : []);
        setShowBackground(data.config.showBackground !== false);
        setBackgroundImage(typeof data.config.backgroundImage === "string" ? data.config.backgroundImage.trim() : "");
      } else {
        setMembers([]);
        setThanks([]);
        setShowBackground(true);
        setBackgroundImage("");
      }
    } catch (e) {
      setMembers([]);
      setThanks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const saveConfig = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        showBackground,
        backgroundImage: (backgroundImage || "").trim(),
        members: members.map(({ id, pseudo, role, avatar, roleColor }) => ({
          id: id || generateId(),
          pseudo: (pseudo || "").trim(),
          role: (role || "").trim(),
          avatar: (avatar || "").trim(),
          roleColor: (roleColor || DEFAULT_ROLE_COLOR).trim() || DEFAULT_ROLE_COLOR,
        })),
        thanks: thanks.map((t) => (typeof t === "string" ? t.trim() : "")).filter(Boolean),
      };
      const res = await fetch(`${API_BASE}/config/team`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: payload }),
      });
      const data = await res.json();
      if (data?.success) {
        setMessage({ type: "success", text: "Équipe et remerciements enregistrés." });
        setMembers(payload.members);
        setThanks(payload.thanks);
        setShowBackground(payload.showBackground);
        setBackgroundImage(payload.backgroundImage || "");
      } else {
        setMessage({ type: "error", text: data?.error || "Erreur lors de l’enregistrement." });
      }
    } catch (e) {
      setMessage({ type: "error", text: "Erreur réseau." });
    } finally {
      setSaving(false);
    }
  };

  const addMember = () => {
    setMembers((prev) => [...prev, { id: generateId(), pseudo: "", role: "", avatar: "", roleColor: DEFAULT_ROLE_COLOR }]);
  };

  const updateMember = (id, field, value) => {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)));
  };

  const removeMember = (id) => {
    if (window.confirm("Supprimer ce membre de l’équipe ?")) {
      setMembers((prev) => prev.filter((m) => m.id !== id));
    }
  };

  const moveMember = (id, dir) => {
    const idx = members.findIndex((m) => m.id === id);
    if (idx === -1) return;
    if (dir === "up" && idx <= 0) return;
    if (dir === "down" && idx >= members.length - 1) return;
    const swap = dir === "up" ? idx - 1 : idx + 1;
    setMembers((prev) => {
      const next = [...prev];
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  };

  const addThanks = () => {
    setThanks((prev) => [...prev, ""]);
  };

  const updateThanks = (index, value) => {
    setThanks((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const removeThanks = (index) => {
    setThanks((prev) => prev.filter((_, i) => i !== index));
  };

  const moveThanks = (index, dir) => {
    if (dir === "up" && index <= 0) return;
    if (dir === "down" && index >= thanks.length - 1) return;
    const swap = dir === "up" ? index - 1 : index + 1;
    setThanks((prev) => {
      const next = [...prev];
      [next[index], next[swap]] = [next[swap], next[index]];
      return next;
    });
  };

  if (loading) {
    return (
      <div className="admin-panel-card team-editor">
        <p className="admin-panel-loading"><i className="fa-solid fa-spinner fa-spin" aria-hidden /> Chargement…</p>
      </div>
    );
  }

  return (
    <div className="admin-panel-card team-editor">
      <div className="team-editor-head">
        <h2 className="admin-panel-card-title">
          <i className="fa-solid fa-users" aria-hidden /> L’équipe & remerciements
        </h2>
        <div className="team-editor-actions">
          <a href="/equipe" target="_blank" rel="noopener noreferrer" className="team-editor-preview-link">
            <i className="fa-solid fa-external-link" aria-hidden /> Voir la page
          </a>
          <button type="button" className="admin-panel-btn admin-panel-btn--primary" onClick={saveConfig} disabled={saving}>
            {saving ? <><i className="fa-solid fa-spinner fa-spin" aria-hidden /> Enregistrement…</> : <><i className="fa-solid fa-save" aria-hidden /> Enregistrer</>}
          </button>
        </div>
      </div>
      {message && (
        <p className={`team-editor-message team-editor-message--${message.type}`}>
          {message.type === "success" ? <i className="fa-solid fa-check" aria-hidden /> : <i className="fa-solid fa-exclamation-triangle" aria-hidden />} {message.text}
        </p>
      )}

      <section className="team-editor-section">
        <h3 className="team-editor-section-title">
          <i className="fa-solid fa-image" aria-hidden /> Apparence de la page
        </h3>
        <label className="team-editor-label">
          <span>Image de fond (URL)</span>
          <input
            type="url"
            value={backgroundImage}
            onChange={(e) => setBackgroundImage(e.target.value)}
            placeholder="https://... ou /image.png"
            className="team-editor-input"
          />
        </label>
        <p className="team-editor-section-desc">
          Lien vers une image (PNG, JPG, etc.) en arrière-plan de la page équipe. Laisser vide pour aucun fond image.
        </p>
        <label className="team-editor-toggle">
          <input
            type="checkbox"
            checked={showBackground}
            onChange={(e) => setShowBackground(e.target.checked)}
          />
          <span>Afficher le fond décoratif (dégradé) par-dessus</span>
        </label>
      </section>

      <section className="team-editor-section">
        <h3 className="team-editor-section-title">
          <i className="fa-solid fa-user" aria-hidden /> Membres de l’équipe
        </h3>
        <p className="team-editor-section-desc">
          Pseudo, rôle, avatar (URL) et couleur du badge. L’ordre définit l’affichage sur la page.
        </p>
        <div className="team-editor-members">
          {members.length === 0 ? (
            <p className="team-editor-empty">Aucun membre. Cliquez sur « Ajouter un membre ».</p>
          ) : (
            members.map((member, index) => (
              <div key={member.id} className="team-editor-member-card">
                <div className="team-editor-member-order">
                  <button type="button" onClick={() => moveMember(member.id, "up")} disabled={index === 0} title="Monter"><i className="fa-solid fa-chevron-up" /></button>
                  <span>{index + 1}</span>
                  <button type="button" onClick={() => moveMember(member.id, "down")} disabled={index === members.length - 1} title="Descendre"><i className="fa-solid fa-chevron-down" /></button>
                </div>
                <div className="team-editor-member-avatar-preview">
                  <img
                    src={member.avatar?.trim() || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle fill='%23313538' cx='50' cy='50' r='50'/%3E%3C/svg%3E"}
                    alt=""
                    className="team-editor-member-avatar-img"
                  />
                </div>
                <div className="team-editor-member-fields">
                  <label className="team-editor-label">
                    <span>Pseudo</span>
                    <input type="text" value={member.pseudo || ""} onChange={(e) => updateMember(member.id, "pseudo", e.target.value)} placeholder="ex. Unovabang" className="team-editor-input" />
                  </label>
                  <label className="team-editor-label">
                    <span>Rôle</span>
                    <input type="text" value={member.role || ""} onChange={(e) => updateMember(member.id, "role", e.target.value)} placeholder="ex. Fondateur" className="team-editor-input" />
                  </label>
                  <label className="team-editor-label">
                    <span>Avatar (URL)</span>
                    <input type="url" value={member.avatar || ""} onChange={(e) => updateMember(member.id, "avatar", e.target.value)} placeholder="https://..." className="team-editor-input" />
                  </label>
                  <label className="team-editor-label team-editor-label--color">
                    <span>Couleur du badge</span>
                    <div className="team-editor-color-wrap">
                      <input
                        type="color"
                        value={member.roleColor || DEFAULT_ROLE_COLOR}
                        onChange={(e) => updateMember(member.id, "roleColor", e.target.value)}
                        className="team-editor-color-input"
                        title="Couleur du badge"
                      />
                      <input
                        type="text"
                        value={member.roleColor || DEFAULT_ROLE_COLOR}
                        onChange={(e) => updateMember(member.id, "roleColor", e.target.value)}
                        placeholder="#7ecdf2"
                        className="team-editor-input team-editor-input--hex"
                      />
                    </div>
                  </label>
                </div>
                <button type="button" className="team-editor-delete" onClick={() => removeMember(member.id)} title="Supprimer ce membre">
                  <i className="fa-solid fa-trash" aria-hidden />
                </button>
              </div>
            ))
          )}
        </div>
        <button type="button" className="admin-panel-btn admin-panel-btn--secondary" onClick={addMember}>
          <i className="fa-solid fa-plus" aria-hidden /> Ajouter un membre
        </button>
      </section>

      <section className="team-editor-section">
        <h3 className="team-editor-section-title">
          <i className="fa-solid fa-heart" aria-hidden /> Remerciements
        </h3>
        <p className="team-editor-section-desc">
          Lignes affichées dans la section « Remerciements » sur la page publique.
        </p>
        <div className="team-editor-thanks-list">
          {thanks.length === 0 ? (
            <p className="team-editor-empty">Aucune ligne. Cliquez sur « Ajouter une ligne ».</p>
          ) : (
            thanks.map((line, index) => (
              <div key={index} className="team-editor-thanks-row">
                <div className="team-editor-member-order">
                  <button type="button" onClick={() => moveThanks(index, "up")} disabled={index === 0} title="Monter"><i className="fa-solid fa-chevron-up" /></button>
                  <span>{index + 1}</span>
                  <button type="button" onClick={() => moveThanks(index, "down")} disabled={index === thanks.length - 1} title="Descendre"><i className="fa-solid fa-chevron-down" /></button>
                </div>
                <input
                  type="text"
                  value={line}
                  onChange={(e) => updateThanks(index, e.target.value)}
                  placeholder="ex. La communauté Pokemon New World"
                  className="team-editor-input team-editor-input--full"
                />
                <button type="button" className="team-editor-delete" onClick={() => removeThanks(index)} title="Supprimer">
                  <i className="fa-solid fa-trash" aria-hidden />
                </button>
              </div>
            ))
          )}
        </div>
        <button type="button" className="admin-panel-btn admin-panel-btn--secondary" onClick={addThanks}>
          <i className="fa-solid fa-plus" aria-hidden /> Ajouter une ligne
        </button>
      </section>
    </div>
  );
}
