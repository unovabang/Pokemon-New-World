import { useState, useEffect, useCallback } from "react";
import { credentialsInit, authHeaders } from "../utils/authHeaders";
import BanlistEditor from "./BanlistEditor";
import BattleTowerMatches from "./BattleTowerMatches";
import BattleTowerPlayers from "./BattleTowerPlayers";
import BattleTowerBans from "./BattleTowerBans";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : `${window.location.origin}/api`;

const SECTIONS = [
  { id: "overview", name: "Vue d'ensemble", icon: "fa-chart-line" },
  { id: "matches", name: "Historique des matchs", icon: "fa-clock-rotate-left" },
  { id: "players", name: "Joueurs", icon: "fa-users" },
  { id: "bans", name: "Joueurs bannis", icon: "fa-gavel" },
  { id: "banlist", name: "Banlist Pokémon", icon: "fa-ban" },
  { id: "config", name: "Saison & Maintenance", icon: "fa-sliders" },
  { id: "audit", name: "Journal d'audit", icon: "fa-list" },
];

export default function BattleTowerAdmin() {
  const [section, setSection] = useState("overview");

  return (
    <div className="bt-admin">
      <div className="bt-admin-header">
        <h2 className="admin-panel-card-title">
          <i className="fa-solid fa-trophy" /> Tour de Combat — Administration
        </h2>
        <p style={{ color: "var(--muted)", margin: "0.25rem 0 0", fontSize: ".85rem" }}>
          Gestion centralisée du PvP : matchs, joueurs, bans, banlist Pokémon, saison et maintenance.
        </p>
      </div>

      <div className="bt-admin-subnav">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id)}
            className={`bt-admin-subnav-btn ${section === s.id ? "bt-admin-subnav-btn--active" : ""}`}
          >
            <i className={`fa-solid ${s.icon}`} />
            <span>{s.name}</span>
          </button>
        ))}
      </div>

      <div className="bt-admin-content">
        {section === "overview" && <OverviewSection />}
        {section === "matches" && <BattleTowerMatches />}
        {section === "players" && <BattleTowerPlayers />}
        {section === "bans" && <BattleTowerBans />}
        {section === "banlist" && <BanlistEditor />}
        {section === "config" && <ConfigSection />}
        {section === "audit" && <AuditLogSection />}
      </div>
    </div>
  );
}

/* ─────────── Overview ─────────── */

const TIER_ORDER = ["unranked", "iron", "bronze", "silver", "gold", "platinum", "emerald", "diamond", "master", "grandmaster", "challenger"];
const TIER_LABELS = {
  unranked: "Non classé", iron: "Fer", bronze: "Bronze", silver: "Argent",
  gold: "Or", platinum: "Platine", emerald: "Émeraude", diamond: "Diamant",
  master: "Maître", grandmaster: "Grand Maître", challenger: "Challenger",
};
const TIER_COLORS = {
  unranked: "#6b7280", iron: "#9ca3af", bronze: "#a16207", silver: "#94a3b8",
  gold: "#eab308", platinum: "#22d3ee", emerald: "#10b981", diamond: "#3b82f6",
  master: "#a855f7", grandmaster: "#ec4899", challenger: "#ef4444",
};

function OverviewSection() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/admin/pvp/stats`, credentialsInit());
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);
      setStats(data.stats);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <p className="admin-panel-loading"><i className="fa-solid fa-spinner fa-spin" /> Chargement des stats...</p>;
  if (error) return <p style={{ color: "#f87171" }}>Erreur : {error}</p>;
  if (!stats) return null;

  const m = stats.matches || {};
  const p = stats.players || {};
  const b = stats.bans || {};
  const td = stats.tier_distribution || {};
  const totalRanked = TIER_ORDER.reduce((sum, t) => sum + (Number(td[t]) || 0), 0);

  return (
    <div className="bt-admin-section">
      <div className="bt-admin-section-header">
        <h3 className="bt-admin-section-title"><i className="fa-solid fa-chart-line" /> Vue d'ensemble</h3>
        <button type="button" onClick={load} className="admin-pokedex-btn admin-pokedex-btn-ghost">
          <i className="fa-solid fa-rotate-right" /> Rafraîchir
        </button>
      </div>

      <div className="bt-admin-stat-grid">
        <StatCard label="Matchs (total)" value={m.total} icon="fa-database" />
        <StatCard label="Matchs (24h)" value={m.last_24h} icon="fa-clock" accent="#22d3ee" />
        <StatCard label="Matchs (7j)" value={m.last_7d} icon="fa-calendar-week" accent="#3b82f6" />
        <StatCard label="Ranked (total)" value={m.ranked_total} icon="fa-trophy" accent="#a855f7" />
        <StatCard label="Amical (total)" value={m.amical_total} icon="fa-handshake" accent="#10b981" />
        <StatCard label="Ranked (24h)" value={m.ranked_24h} icon="fa-trophy" accent="#a855f7" />
      </div>

      <div className="bt-admin-stat-grid" style={{ marginTop: "1rem" }}>
        <StatCard label="Joueurs avec score" value={p.total_with_scores} icon="fa-users" />
        <StatCard label="Placements terminés" value={p.placed} icon="fa-circle-check" accent="#86efac" />
        <StatCard label="En placement" value={p.in_placement} icon="fa-spinner" accent="#fbbf24" />
        <StatCard label="Non classés" value={p.unranked} icon="fa-user" accent="#6b7280" />
        <StatCard label="Bans actifs" value={b.active} icon="fa-gavel" accent="#f87171" />
        <StatCard label="Bans (total historique)" value={b.total} icon="fa-history" />
      </div>

      <div className="bt-admin-card" style={{ marginTop: "1.5rem" }}>
        <h4 style={{ marginTop: 0 }}><i className="fa-solid fa-chart-bar" /> Distribution des tiers</h4>
        {totalRanked === 0 ? (
          <p style={{ color: "var(--muted)" }}>Aucun joueur classé.</p>
        ) : (
          <div className="bt-admin-tier-dist">
            {TIER_ORDER.map((tier) => {
              const count = Number(td[tier]) || 0;
              const pct = totalRanked > 0 ? (count / totalRanked) * 100 : 0;
              return (
                <div key={tier} className="bt-admin-tier-row">
                  <span style={{ minWidth: "120px", color: TIER_COLORS[tier], fontWeight: 600 }}>
                    {TIER_LABELS[tier]}
                  </span>
                  <div className="bt-admin-tier-bar-wrap">
                    <div className="bt-admin-tier-bar" style={{ width: `${pct}%`, background: TIER_COLORS[tier] }} />
                  </div>
                  <span style={{ minWidth: "80px", textAlign: "right", fontSize: ".85rem" }}>
                    {count} ({pct.toFixed(1)}%)
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, accent }) {
  return (
    <div className="bt-admin-stat-card">
      <div className="bt-admin-stat-icon" style={{ color: accent || "var(--accent, #a855f7)" }}>
        <i className={`fa-solid ${icon}`} />
      </div>
      <div className="bt-admin-stat-value">{value ?? 0}</div>
      <div className="bt-admin-stat-label">{label}</div>
    </div>
  );
}

/* ─────────── Config (Saison + Maintenance + Annonces) ─────────── */

function ConfigSection() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/battle-tower`, credentialsInit())
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.success) setConfig(d.battleTower);
        else setError(d.error || "Erreur chargement");
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  const update = (path, value) => {
    setConfig((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      const parts = path.split(".");
      let cur = next;
      for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]];
      cur[parts[parts.length - 1]] = value;
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/battle-tower`, {
        ...credentialsInit(),
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          season: config.season,
          maintenance: config.maintenance,
          announcements: config.announcements,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);
      setMessage("Configuration sauvegardée.");
      setConfig(data.battleTower);
      setTimeout(() => setMessage(null), 3000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="admin-panel-loading"><i className="fa-solid fa-spinner fa-spin" /> Chargement...</p>;
  if (!config) return <p style={{ color: "#f87171" }}>Erreur : {error || "config indisponible"}</p>;

  return (
    <div className="bt-admin-section">
      <div className="bt-admin-section-header">
        <h3 className="bt-admin-section-title"><i className="fa-solid fa-sliders" /> Saison & Maintenance</h3>
        <div style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
          {message && <span style={{ fontSize: ".85rem", color: "#86efac" }}>{message}</span>}
          {error && <span style={{ fontSize: ".85rem", color: "#f87171" }}>{error}</span>}
          <button type="button" onClick={save} disabled={saving} className="admin-pokedex-btn admin-pokedex-btn-primary">
            <i className="fa-solid fa-save" /> {saving ? "Sauvegarde..." : "Sauvegarder"}
          </button>
        </div>
      </div>

      <div className="bt-admin-card">
        <h4 style={{ marginTop: 0 }}><i className="fa-solid fa-trophy" /> Saison courante</h4>
        <div className="bt-admin-form-grid">
          <div>
            <label className="admin-pokedex-label">Numéro de saison</label>
            <input
              type="number"
              min="1"
              className="admin-pokedex-input"
              value={config.season.number}
              onChange={(e) => update("season.number", parseInt(e.target.value, 10) || 1)}
            />
          </div>
          <div>
            <label className="admin-pokedex-label">Nom</label>
            <input
              type="text"
              className="admin-pokedex-input"
              value={config.season.name}
              onChange={(e) => update("season.name", e.target.value)}
              maxLength={100}
            />
          </div>
          <div>
            <label className="admin-pokedex-label">Date de début</label>
            <input
              type="datetime-local"
              className="admin-pokedex-input"
              value={config.season.startDate ? config.season.startDate.slice(0, 16) : ""}
              onChange={(e) => update("season.startDate", e.target.value ? new Date(e.target.value).toISOString() : null)}
            />
          </div>
          <div>
            <label className="admin-pokedex-label">Date de fin</label>
            <input
              type="datetime-local"
              className="admin-pokedex-input"
              value={config.season.endDate ? config.season.endDate.slice(0, 16) : ""}
              onChange={(e) => update("season.endDate", e.target.value ? new Date(e.target.value).toISOString() : null)}
            />
          </div>
        </div>
        <label className="admin-pokedex-label" style={{ marginTop: ".75rem" }}>URL bannière (optionnel)</label>
        <input
          type="url"
          className="admin-pokedex-input"
          value={config.season.bannerUrl || ""}
          onChange={(e) => update("season.bannerUrl", e.target.value || null)}
          placeholder="https://..."
        />
        <label className="admin-pokedex-label" style={{ marginTop: ".75rem" }}>Description / thème de la saison</label>
        <textarea
          className="admin-pokedex-input"
          value={config.season.description}
          onChange={(e) => update("season.description", e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Saison spéciale Halloween, double LP weekend, etc."
        />
      </div>

      <div className="bt-admin-card" style={{ marginTop: "1rem", borderColor: config.maintenance.enabled ? "rgba(248,113,113,.4)" : undefined }}>
        <h4 style={{ marginTop: 0, color: config.maintenance.enabled ? "#f87171" : undefined }}>
          <i className="fa-solid fa-wrench" /> Maintenance globale
        </h4>
        <p style={{ color: "var(--muted)", fontSize: ".85rem", marginTop: 0 }}>
          Active la maintenance sur <strong>toute la Tour de Combat</strong> (ranked + amical). Les joueurs ne peuvent plus accéder au mode PvP.
        </p>
        <label style={{ display: "flex", alignItems: "center", gap: ".5rem", marginTop: ".5rem", fontSize: ".95rem" }}>
          <input
            type="checkbox"
            checked={config.maintenance.enabled}
            onChange={(e) => update("maintenance.enabled", e.target.checked)}
          />
          <strong>Activer la maintenance</strong>
        </label>
        <label className="admin-pokedex-label" style={{ marginTop: ".75rem" }}>Message affiché aux joueurs</label>
        <textarea
          className="admin-pokedex-input"
          value={config.maintenance.message}
          onChange={(e) => update("maintenance.message", e.target.value)}
          rows={2}
          maxLength={1000}
          placeholder="Maintenance en cours, retour estimé à 18h."
        />
      </div>

      <div className="bt-admin-card" style={{ marginTop: "1rem" }}>
        <h4 style={{ marginTop: 0 }}><i className="fa-solid fa-bullhorn" /> Annonces / règles PvP</h4>
        <p style={{ color: "var(--muted)", fontSize: ".85rem", marginTop: 0 }}>
          Affiché dans la home Tour de Combat du launcher.
        </p>
        <textarea
          className="admin-pokedex-input"
          value={config.announcements}
          onChange={(e) => update("announcements", e.target.value)}
          rows={4}
          maxLength={5000}
          placeholder="Tournoi du week-end, règles particulières, etc."
        />
      </div>
    </div>
  );
}

/* ─────────── Audit Log ─────────── */

const ACTION_LABELS = {
  reset_player_rank: "Reset rank",
  ban_player_pvp: "Ban PvP",
  unban_player_pvp: "Unban PvP",
  cancel_match: "Annulation match",
};

function AuditLogSection() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [filterAction, setFilterAction] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "50", offset: String(offset) });
      if (filterAction) params.set("action", filterAction);
      const res = await fetch(`${API_BASE}/admin/pvp/audit-log?${params}`, credentialsInit());
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);
      setEntries(data.entries || []);
      setTotal(data.total || 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [offset, filterAction]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="bt-admin-section">
      <div className="bt-admin-section-header">
        <h3 className="bt-admin-section-title"><i className="fa-solid fa-list" /> Journal d'audit</h3>
        <span className="bt-admin-section-count">{total} entrées</span>
      </div>

      <div className="bt-admin-filters">
        <select
          value={filterAction}
          onChange={(e) => { setFilterAction(e.target.value); setOffset(0); }}
          className="admin-pokedex-input"
          style={{ maxWidth: "240px" }}
        >
          <option value="">Toutes les actions</option>
          {Object.entries(ACTION_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {loading && <p className="admin-panel-loading"><i className="fa-solid fa-spinner fa-spin" /> Chargement...</p>}
      {error && <p style={{ color: "#f87171" }}>Erreur : {error}</p>}

      {!loading && !error && (
        <div className="admin-panel-table-wrap">
          <table className="admin-panel-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Action</th>
                <th>Cible</th>
                <th>Effectué par</th>
                <th>Détails</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr><td colSpan={5} className="admin-panel-table-empty">Aucune action enregistrée.</td></tr>
              ) : (
                entries.map((e) => (
                  <tr key={e.id}>
                    <td>{new Date(e.created_at).toLocaleString("fr-FR")}</td>
                    <td><strong>{ACTION_LABELS[e.action] || e.action}</strong></td>
                    <td>
                      {e.target_username || (e.target_user_id ? `${e.target_user_id.slice(0, 8)}…` : "—")}
                      {e.target_room_code && <div style={{ fontSize: ".75rem", color: "var(--muted)" }}>match: {e.target_room_code}</div>}
                    </td>
                    <td>{e.payload?.admin_email || e.performed_by_username || "—"}</td>
                    <td style={{ maxWidth: "400px" }}>
                      <pre style={{ fontSize: ".75rem", margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                        {JSON.stringify(e.payload, null, 0).slice(0, 200)}
                      </pre>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {total > 50 && (
        <div className="bt-admin-pagination">
          <button type="button" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 50))} className="admin-pokedex-btn admin-pokedex-btn-ghost">
            <i className="fa-solid fa-chevron-left" /> Précédent
          </button>
          <span>Page {Math.floor(offset / 50) + 1} / {Math.ceil(total / 50)}</span>
          <button type="button" disabled={offset + 50 >= total} onClick={() => setOffset(offset + 50)} className="admin-pokedex-btn admin-pokedex-btn-ghost">
            Suivant <i className="fa-solid fa-chevron-right" />
          </button>
        </div>
      )}
    </div>
  );
}
