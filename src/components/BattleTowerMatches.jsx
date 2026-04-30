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

function formatDuration(sec) {
  if (sec == null) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m${s.toString().padStart(2, "0")}s` : `${s}s`;
}

export default function BattleTowerMatches() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [filterType, setFilterType] = useState("");
  const [filterUserId, setFilterUserId] = useState("");
  const [selected, setSelected] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
      });
      if (filterType) params.set("match_type", filterType);
      if (filterUserId.trim()) params.set("user_id", filterUserId.trim());

      const res = await fetch(`${API_BASE}/admin/pvp/matches?${params}`, credentialsInit());
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);
      setMatches(data.matches || []);
      setTotal(data.total || 0);
    } catch (e) {
      setError(e.message);
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }, [offset, filterType, filterUserId]);

  useEffect(() => { load(); }, [load]);

  const cancelMatch = async (roomCode) => {
    const reason = prompt(
      `Annuler le match ${roomCode} ?\n\nCela va :\n- Rollback les deltas LP/MMR des 2 joueurs\n- Décrémenter leurs compteurs W/L/D\n- Supprimer le match de l'historique\n\nRaison (loggée dans l'audit) :`,
      "",
    );
    if (reason === null) return;

    setCancelling(true);
    try {
      const res = await fetch(`${API_BASE}/admin/pvp/matches/${encodeURIComponent(roomCode)}/cancel`, {
        ...credentialsInit(),
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);
      setSelected(null);
      load();
    } catch (e) {
      alert(`Erreur : ${e.message}`);
    } finally {
      setCancelling(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="bt-admin-section">
      <div className="bt-admin-section-header">
        <h3 className="bt-admin-section-title">
          <i className="fa-solid fa-clock-rotate-left" /> Historique des matchs
        </h3>
        <span className="bt-admin-section-count">{total} matchs</span>
      </div>

      <div className="bt-admin-filters">
        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setOffset(0); }}
          className="admin-pokedex-input"
          style={{ maxWidth: "200px" }}
        >
          <option value="">Tous les types</option>
          <option value="ranked">Ranked uniquement</option>
          <option value="amical">Amical uniquement</option>
        </select>
        <input
          type="text"
          placeholder="UUID joueur (optionnel)"
          value={filterUserId}
          onChange={(e) => setFilterUserId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (setOffset(0), load())}
          className="admin-pokedex-input"
          style={{ maxWidth: "320px" }}
        />
        <button type="button" onClick={() => { setOffset(0); load(); }} className="admin-pokedex-btn admin-pokedex-btn-ghost">
          <i className="fa-solid fa-rotate-right" /> Rafraîchir
        </button>
      </div>

      {loading && <p className="admin-panel-loading"><i className="fa-solid fa-spinner fa-spin" /> Chargement...</p>}
      {error && <p style={{ color: "#f87171" }}>Erreur : {error}</p>}

      {!loading && !error && (
        <div className="admin-panel-table-wrap">
          <table className="admin-panel-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Joueur</th>
                <th>Adversaire</th>
                <th>Résultat</th>
                <th>LP / MMR Δ</th>
                <th>Durée</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {matches.length === 0 ? (
                <tr><td colSpan={8} className="admin-panel-table-empty">Aucun match.</td></tr>
              ) : (
                matches.map((m) => (
                  <tr key={m.id}>
                    <td>{formatDate(m.created_at)}</td>
                    <td>
                      <span className={`bt-admin-badge bt-admin-badge--${m.match_type}`}>
                        {m.match_type === "ranked" ? "Ranked" : "Amical"}
                      </span>
                    </td>
                    <td>{m.user_username || m.user_id?.slice(0, 8)}</td>
                    <td>{m.opponent_username || m.opponent_id?.slice(0, 8)}</td>
                    <td>
                      <span className={`bt-admin-result bt-admin-result--${m.result}`}>
                        {m.result === "win" ? "Victoire" : m.result === "loss" ? "Défaite" : "Égalité"}
                      </span>
                    </td>
                    <td>
                      {m.match_type === "ranked"
                        ? `${m.lp_delta != null ? (m.lp_delta > 0 ? "+" : "") + m.lp_delta : "—"} LP / ${m.mmr_delta != null ? (m.mmr_delta > 0 ? "+" : "") + m.mmr_delta : "—"} MMR`
                        : "—"}
                    </td>
                    <td>{formatDuration(m.duration_sec)}</td>
                    <td>
                      <button type="button" onClick={() => setSelected(m)} className="admin-pokedex-btn admin-pokedex-btn-ghost" style={{ padding: ".25rem .5rem" }}>
                        Détails
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

      {selected && (
        <div className="bt-admin-modal-overlay" onClick={() => setSelected(null)}>
          <div className="bt-admin-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="bt-admin-modal-close" onClick={() => setSelected(null)}>
              <i className="fa-solid fa-xmark" />
            </button>
            <h3>Match {selected.room_code}</h3>
            <dl className="bt-admin-modal-dl">
              <dt>Date</dt><dd>{formatDate(selected.created_at)}</dd>
              <dt>Type</dt><dd>{selected.match_type}</dd>
              <dt>Joueur</dt><dd>{selected.user_username} ({selected.user_id})</dd>
              <dt>Adversaire</dt><dd>{selected.opponent_username} ({selected.opponent_id})</dd>
              <dt>Résultat (côté joueur)</dt><dd>{selected.result}</dd>
              <dt>Raison fin</dt><dd>{selected.reason || "—"}</dd>
              <dt>Durée</dt><dd>{formatDuration(selected.duration_sec)}</dd>
              {selected.match_type === "ranked" && (
                <>
                  <dt>LP delta</dt><dd>{selected.lp_delta ?? "—"}</dd>
                  <dt>MMR delta</dt><dd>{selected.mmr_delta ?? "—"}</dd>
                </>
              )}
              {selected.bet_mode && <><dt>Pari</dt><dd>Activé</dd></>}
            </dl>
            <div style={{ marginTop: "1rem", display: "flex", gap: ".5rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => cancelMatch(selected.room_code)}
                disabled={cancelling}
                className="admin-pokedex-btn"
                style={{ background: "rgba(248,113,113,.2)", borderColor: "rgba(248,113,113,.4)", color: "#f87171" }}
              >
                <i className="fa-solid fa-trash" /> {cancelling ? "Annulation..." : "Annuler ce match"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
