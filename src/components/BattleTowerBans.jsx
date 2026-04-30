import { useState, useEffect, useCallback } from "react";
import { credentialsInit, authHeaders } from "../utils/authHeaders";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : `${window.location.origin}/api`;

const PAGE_SIZE = 25;

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function BattleTowerBans() {
  const [bans, setBans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
      const res = await fetch(`${API_BASE}/admin/pvp/bans?${params}`, credentialsInit());
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);
      setBans(data.bans || []);
      setTotal(data.total || 0);
    } catch (e) {
      setError(e.message);
      setBans([]);
    } finally {
      setLoading(false);
    }
  }, [offset]);

  useEffect(() => { load(); }, [load]);

  const revoke = async (ban) => {
    if (!confirm(`Révoquer le ban de ${ban.user_username || ban.user_id} ?\n\nLe joueur pourra reprendre les combats immédiatement.`)) return;
    try {
      const res = await fetch(`${API_BASE}/admin/pvp/bans/${ban.ban_id}`, {
        ...credentialsInit(),
        method: "DELETE",
        headers: { ...authHeaders() },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);
      load();
    } catch (e) {
      alert(`Erreur : ${e.message}`);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="bt-admin-section">
      <div className="bt-admin-section-header">
        <h3 className="bt-admin-section-title">
          <i className="fa-solid fa-gavel" /> Joueurs bannis (actifs)
        </h3>
        <span className="bt-admin-section-count">{total} ban{total > 1 ? "s" : ""}</span>
      </div>

      {loading && <p className="admin-panel-loading"><i className="fa-solid fa-spinner fa-spin" /> Chargement...</p>}
      {error && <p style={{ color: "#f87171" }}>Erreur : {error}</p>}

      {!loading && !error && (
        <div className="admin-panel-table-wrap">
          <table className="admin-panel-table">
            <thead>
              <tr>
                <th>Joueur</th>
                <th>Raison</th>
                <th>Banni par</th>
                <th>Le</th>
                <th>Expire</th>
                <th>Durée</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {bans.length === 0 ? (
                <tr><td colSpan={7} className="admin-panel-table-empty">Aucun ban actif. 🎉</td></tr>
              ) : (
                bans.map((b) => (
                  <tr key={b.ban_id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                        {b.user_avatar_url && <img src={b.user_avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: "50%" }} />}
                        <div>
                          <div>{b.user_display_name || b.user_username}</div>
                          <div style={{ fontSize: ".7rem", color: "var(--muted)" }}>{b.user_id?.slice(0, 8)}…</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ maxWidth: "300px", whiteSpace: "normal" }}>{b.reason || "—"}</td>
                    <td>{b.banned_by_username || "—"}</td>
                    <td>{formatDate(b.created_at)}</td>
                    <td>{b.is_permanent ? <strong style={{ color: "#f87171" }}>Permanent</strong> : formatDate(b.expires_at)}</td>
                    <td>
                      {b.is_permanent ? (
                        <span style={{ fontSize: ".85rem" }}>—</span>
                      ) : (
                        <span style={{ fontSize: ".85rem" }}>
                          jusqu'à {new Date(b.expires_at).toLocaleDateString("fr-FR")}
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => revoke(b)}
                        className="admin-pokedex-btn admin-pokedex-btn-ghost"
                        style={{ padding: ".25rem .5rem", color: "#86efac" }}
                      >
                        <i className="fa-solid fa-unlock" /> Révoquer
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="bt-admin-pagination">
          <button type="button" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} className="admin-pokedex-btn admin-pokedex-btn-ghost">
            <i className="fa-solid fa-chevron-left" /> Précédent
          </button>
          <span>Page {currentPage} / {totalPages}</span>
          <button type="button" disabled={offset + PAGE_SIZE >= total} onClick={() => setOffset(offset + PAGE_SIZE)} className="admin-pokedex-btn admin-pokedex-btn-ghost">
            Suivant <i className="fa-solid fa-chevron-right" />
          </button>
        </div>
      )}
    </div>
  );
}
