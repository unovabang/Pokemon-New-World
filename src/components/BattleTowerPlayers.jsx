import { useState, useEffect, useCallback } from "react";
import { credentialsInit, authHeaders } from "../utils/authHeaders";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : `${window.location.origin}/api`;

const TIER_COLORS = {
  unranked: "#6b7280", iron: "#9ca3af", bronze: "#a16207", silver: "#94a3b8",
  gold: "#eab308", platinum: "#22d3ee", emerald: "#10b981", diamond: "#3b82f6",
  master: "#a855f7", grandmaster: "#ec4899", challenger: "#ef4444",
};

const TIER_LABELS = {
  unranked: "Non classé", iron: "Fer", bronze: "Bronze", silver: "Argent",
  gold: "Or", platinum: "Platine", emerald: "Émeraude", diamond: "Diamant",
  master: "Maître", grandmaster: "Grand Maître", challenger: "Challenger",
};

function TierBadge({ tier }) {
  const color = TIER_COLORS[tier] || TIER_COLORS.unranked;
  return (
    <span className="bt-admin-tier-badge" style={{ background: `${color}33`, borderColor: color, color }}>
      {TIER_LABELS[tier] || tier}
    </span>
  );
}

export default function BattleTowerPlayers() {
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionPlayer, setActionPlayer] = useState(null);
  const [actionType, setActionType] = useState(null);

  const search = useCallback(async (q) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ q: q || "", limit: "50" });
      const res = await fetch(`${API_BASE}/admin/pvp/players?${params}`, credentialsInit());
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);
      setPlayers(data.players || []);
    } catch (e) {
      setError(e.message);
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { search(""); }, [search]);

  const onSearch = (e) => {
    e.preventDefault();
    search(query);
  };

  const closeAction = () => { setActionPlayer(null); setActionType(null); };

  const refreshAndClose = () => {
    closeAction();
    search(query);
  };

  return (
    <div className="bt-admin-section">
      <div className="bt-admin-section-header">
        <h3 className="bt-admin-section-title">
          <i className="fa-solid fa-users" /> Joueurs ranked
        </h3>
        <span className="bt-admin-section-count">{players.length} résultats</span>
      </div>

      <form onSubmit={onSearch} className="bt-admin-filters">
        <input
          type="text"
          placeholder="Pseudo, nom affiché ou UUID exact"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="admin-pokedex-input"
          style={{ flex: 1 }}
        />
        <button type="submit" className="admin-pokedex-btn admin-pokedex-btn-primary">
          <i className="fa-solid fa-magnifying-glass" /> Rechercher
        </button>
      </form>

      {loading && <p className="admin-panel-loading"><i className="fa-solid fa-spinner fa-spin" /> Chargement...</p>}
      {error && <p style={{ color: "#f87171" }}>Erreur : {error}</p>}

      {!loading && !error && (
        <div className="admin-panel-table-wrap">
          <table className="admin-panel-table">
            <thead>
              <tr>
                <th>Joueur</th>
                <th>Tier</th>
                <th>LP</th>
                <th>MMR</th>
                <th>Placements</th>
                <th>W/L/D ranked</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {players.length === 0 ? (
                <tr><td colSpan={8} className="admin-panel-table-empty">Aucun joueur trouvé.</td></tr>
              ) : (
                players.map((p) => (
                  <tr key={p.user_id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                        {p.avatar_url && <img src={p.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: "50%" }} />}
                        <div>
                          <div>{p.display_name || p.username}</div>
                          <div style={{ fontSize: ".7rem", color: "var(--muted)" }}>{p.user_id.slice(0, 8)}…</div>
                        </div>
                      </div>
                    </td>
                    <td><TierBadge tier={p.battle_rank_tier} /></td>
                    <td>{p.battle_lp}</td>
                    <td>{p.battle_mmr}</td>
                    <td>{p.placement_played}/5{p.placement_played > 0 && p.placement_played < 5 ? " (en cours)" : p.placement_played >= 5 ? " ✓" : ""}</td>
                    <td>{p.pvp_wins_ranked}/{p.pvp_losses_ranked}/{p.pvp_draws_ranked}</td>
                    <td>
                      {p.is_banned ? (
                        <span className="bt-admin-result bt-admin-result--loss">
                          <i className="fa-solid fa-ban" /> Banni
                        </span>
                      ) : (
                        <span style={{ color: "#86efac", fontSize: ".85rem" }}>OK</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: ".25rem", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => { setActionPlayer(p); setActionType("set"); }}
                          className="admin-pokedex-btn admin-pokedex-btn-ghost"
                          style={{ padding: ".25rem .5rem", fontSize: ".75rem", color: "#a78bfa" }}
                          title="Modifier le tier / LP / MMR manuellement"
                        >
                          <i className="fa-solid fa-pen" /> Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => { setActionPlayer(p); setActionType("reset"); }}
                          className="admin-pokedex-btn admin-pokedex-btn-ghost"
                          style={{ padding: ".25rem .5rem", fontSize: ".75rem" }}
                          title="Reset MMR/LP/Tier/Placements"
                        >
                          <i className="fa-solid fa-rotate-left" /> Reset
                        </button>
                        {!p.is_banned && (
                          <button
                            type="button"
                            onClick={() => { setActionPlayer(p); setActionType("ban"); }}
                            className="admin-pokedex-btn admin-pokedex-btn-ghost"
                            style={{ padding: ".25rem .5rem", fontSize: ".75rem", color: "#f87171" }}
                            title="Bannir de la Tour de Combat"
                          >
                            <i className="fa-solid fa-ban" /> Bannir
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {actionPlayer && actionType === "set" && (
        <SetRankModal player={actionPlayer} onClose={closeAction} onSuccess={refreshAndClose} />
      )}
      {actionPlayer && actionType === "reset" && (
        <ResetRankModal player={actionPlayer} onClose={closeAction} onSuccess={refreshAndClose} />
      )}
      {actionPlayer && actionType === "ban" && (
        <BanPlayerModal player={actionPlayer} onClose={closeAction} onSuccess={refreshAndClose} />
      )}
    </div>
  );
}

function SetRankModal({ player, onClose, onSuccess }) {
  const [tier, setTier] = useState(player.battle_rank_tier || "unranked");
  const [lp, setLp] = useState(player.battle_lp ?? 0);
  const [mmr, setMmr] = useState(player.battle_mmr ?? 1000);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isApex = ["master", "grandmaster", "challenger"].includes(tier);
  const lpMax = isApex ? 99999 : 100;

  const submit = async () => {
    const lpInt = parseInt(lp, 10);
    const mmrInt = parseInt(mmr, 10);
    if (!Number.isFinite(lpInt) || lpInt < 0) {
      alert("LP invalide.");
      return;
    }
    if (!Number.isFinite(mmrInt) || mmrInt < 0) {
      alert("MMR invalide.");
      return;
    }

    if (!confirm(`Définir le rank de ${player.username} ?\n\nTier : ${TIER_LABELS[tier]}\nLP : ${lpInt}${isApex ? "" : " (capé à 100 hors apex)"}\nMMR : ${mmrInt}\n\nLes placements seront ${tier === "unranked" ? "remis à 0/5" : "marqués comme terminés (5/5)"}.`)) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/admin/pvp/players/${player.user_id}/set-rank`, {
        ...credentialsInit(),
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ tier, lp: lpInt, mmr: mmrInt, reason }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);
      onSuccess();
    } catch (e) {
      alert(`Erreur : ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bt-admin-modal-overlay" onClick={onClose}>
      <div className="bt-admin-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="bt-admin-modal-close" onClick={onClose}><i className="fa-solid fa-xmark" /></button>
        <h3>Modifier le rank — {player.display_name || player.username}</h3>
        <p style={{ color: "var(--muted)", fontSize: ".85rem" }}>
          Définit manuellement tier, LP et MMR. Si tier = "Non classé", remet le joueur en placement.
        </p>

        <label className="admin-pokedex-label">Tier</label>
        <select
          value={tier}
          onChange={(e) => setTier(e.target.value)}
          className="admin-pokedex-input"
        >
          {Object.entries(TIER_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem", marginTop: ".75rem" }}>
          <div>
            <label className="admin-pokedex-label">
              LP {isApex ? "(illimité en apex)" : "(0–100)"}
            </label>
            <input
              type="number"
              min="0"
              max={lpMax}
              className="admin-pokedex-input"
              value={lp}
              onChange={(e) => setLp(e.target.value)}
            />
          </div>
          <div>
            <label className="admin-pokedex-label">MMR (Elo caché)</label>
            <input
              type="number"
              min="0"
              className="admin-pokedex-input"
              value={mmr}
              onChange={(e) => setMmr(e.target.value)}
            />
          </div>
        </div>

        <label className="admin-pokedex-label" style={{ marginTop: ".75rem" }}>Raison (loggée)</label>
        <input
          type="text"
          className="admin-pokedex-input"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ex: ajustement saison, demande joueur, correction"
          maxLength={300}
        />

        <div style={{ marginTop: "1rem", display: "flex", gap: ".5rem", justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} className="admin-pokedex-btn admin-pokedex-btn-ghost">Annuler</button>
          <button type="button" onClick={submit} disabled={submitting} className="admin-pokedex-btn admin-pokedex-btn-primary">
            {submitting ? "Application..." : "Appliquer"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ResetRankModal({ player, onClose, onSuccess }) {
  const [reason, setReason] = useState("");
  const [resetCounters, setResetCounters] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!confirm(`Confirmer le reset complet du rank de ${player.username} ?\nMMR → 1000, LP → 0, Tier → Non classé, Placements → 0/0${resetCounters ? ", Compteurs ranked → 0" : ""}.`)) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/admin/pvp/players/${player.user_id}/reset-rank`, {
        ...credentialsInit(),
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ reason, reset_counters: resetCounters }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);
      onSuccess();
    } catch (e) {
      alert(`Erreur : ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bt-admin-modal-overlay" onClick={onClose}>
      <div className="bt-admin-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="bt-admin-modal-close" onClick={onClose}><i className="fa-solid fa-xmark" /></button>
        <h3>Reset du rank — {player.display_name || player.username}</h3>
        <p style={{ color: "var(--muted)", fontSize: ".85rem" }}>
          MMR → 1000, LP → 0, Tier → Non classé, Placements → 0/0.
        </p>
        <label className="admin-pokedex-label">Raison (loggée)</label>
        <input
          type="text"
          className="admin-pokedex-input"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ex: exploit détecté, demande joueur, etc."
          maxLength={300}
        />
        <label style={{ display: "flex", alignItems: "center", gap: ".5rem", marginTop: ".75rem", fontSize: ".9rem" }}>
          <input type="checkbox" checked={resetCounters} onChange={(e) => setResetCounters(e.target.checked)} />
          Reset aussi les compteurs W/L/D ranked
        </label>
        <div style={{ marginTop: "1rem", display: "flex", gap: ".5rem", justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} className="admin-pokedex-btn admin-pokedex-btn-ghost">Annuler</button>
          <button type="button" onClick={submit} disabled={submitting} className="admin-pokedex-btn admin-pokedex-btn-primary">
            {submitting ? "Reset..." : "Reset"}
          </button>
        </div>
      </div>
    </div>
  );
}

function BanPlayerModal({ player, onClose, onSuccess }) {
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState("permanent");
  const [submitting, setSubmitting] = useState(false);

  const computeExpiresAt = () => {
    if (duration === "permanent") return null;
    const days = parseInt(duration, 10);
    if (!Number.isFinite(days)) return null;
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString();
  };

  const submit = async () => {
    if (!reason.trim()) {
      alert("Une raison est obligatoire (sera affichée au joueur).");
      return;
    }
    const expiresAt = computeExpiresAt();
    const durationLabel = duration === "permanent" ? "PERMANENT" : `${duration} jour(s) (jusqu'au ${new Date(expiresAt).toLocaleString("fr-FR")})`;
    if (!confirm(`Bannir ${player.username} de la Tour de Combat ?\nDurée : ${durationLabel}\nRaison : ${reason}`)) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/admin/pvp/players/${player.user_id}/ban`, {
        ...credentialsInit(),
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ reason, expires_at: expiresAt }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);
      onSuccess();
    } catch (e) {
      alert(`Erreur : ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bt-admin-modal-overlay" onClick={onClose}>
      <div className="bt-admin-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="bt-admin-modal-close" onClick={onClose}><i className="fa-solid fa-xmark" /></button>
        <h3>Bannir — {player.display_name || player.username}</h3>
        <p style={{ color: "var(--muted)", fontSize: ".85rem" }}>
          Le joueur ne pourra plus entrer en queue (ranked OU amical) tant que le ban est actif.
        </p>
        <label className="admin-pokedex-label">Raison (affichée au joueur) *</label>
        <input
          type="text"
          className="admin-pokedex-input"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ex: utilisation d'exploit, comportement toxique"
          maxLength={300}
          required
        />
        <label className="admin-pokedex-label" style={{ marginTop: ".75rem" }}>Durée</label>
        <select value={duration} onChange={(e) => setDuration(e.target.value)} className="admin-pokedex-input">
          <option value="1">1 jour</option>
          <option value="3">3 jours</option>
          <option value="7">7 jours</option>
          <option value="14">14 jours</option>
          <option value="30">30 jours</option>
          <option value="90">90 jours</option>
          <option value="permanent">Permanent (jusqu'à révocation)</option>
        </select>
        <div style={{ marginTop: "1rem", display: "flex", gap: ".5rem", justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} className="admin-pokedex-btn admin-pokedex-btn-ghost">Annuler</button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting || !reason.trim()}
            className="admin-pokedex-btn"
            style={{ background: "rgba(248,113,113,.2)", borderColor: "rgba(248,113,113,.4)", color: "#f87171" }}
          >
            {submitting ? "Ban..." : "Confirmer le ban"}
          </button>
        </div>
      </div>
    </div>
  );
}
