import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";

const POLL_MS = 20000;
const MAX_PREVIEW_LEN = 280;

function formatTime(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function sanitizePreview(content) {
  if (content == null || typeof content !== "string") return "";
  const t = content.trim();
  if (t.startsWith("\u{1F4CB}LOG:")) return null;
  if (t.startsWith("\u{1F3B4}POKEMON\u{1F3B4}")) return "[Carte Pok\u00e9mon]";
  if (t.length > MAX_PREVIEW_LEN) return `${t.slice(0, MAX_PREVIEW_LEN - 1)}\u2026`;
  return t;
}

function authorName(msg) {
  const p = msg.profiles;
  if (p && typeof p === "object") {
    return (p.display_name || p.username || "Joueur").trim() || "Joueur";
  }
  return "Joueur";
}

export default function SiteChatWidget() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [configured, setConfigured] = useState(true);
  const [channelLabel, setChannelLabel] = useState("");
  const [messages, setMessages] = useState([]);
  const listRef = useRef(null);

  const hidden =
    location.pathname.startsWith("/admin") || location.pathname.startsWith("/admin-login");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/chat/public-preview?t=${Date.now()}`, {
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Impossible de charger le fil.");
        setMessages([]);
        return;
      }
      if (data.error && (!Array.isArray(data.messages) || data.messages.length === 0)) {
        setError(String(data.error));
        setMessages([]);
        setConfigured(data.configured !== false);
        setChannelLabel(typeof data.channelName === "string" ? data.channelName : "");
        return;
      }
      setError(null);
      setConfigured(data.configured !== false);
      setChannelLabel(typeof data.channelName === "string" ? data.channelName : "");
      const raw = Array.isArray(data.messages) ? data.messages : [];
      const mapped = raw
        .map((m) => {
          const text = sanitizePreview(m.content);
          if (text === null) return null;
          return {
            id: m.id,
            created_at: m.created_at,
            author: authorName(m),
            text,
            avatar: m.profiles?.avatar_url || null,
          };
        })
        .filter(Boolean);
      setMessages(mapped);
    } catch (e) {
      setError("R\u00e9seau indisponible.");
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open || hidden) return;
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [open, hidden, load]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current;
    el.scrollTop = el.scrollHeight;
  }, [open, messages]);

  if (hidden) return null;

  return (
    <div className="pnw-site-chat-root" aria-live="polite">
      {!open && (
        <button
          type="button"
          className="pnw-site-chat-fab"
          onClick={() => setOpen(true)}
          aria-expanded={false}
          aria-controls="pnw-site-chat-panel"
          title="Aper\u00e7u du chat"
        >
          <span className="pnw-site-chat-fab-glow" aria-hidden />
          <i className="fa-solid fa-comments" aria-hidden />
          <span className="pnw-site-chat-fab-label">Chat</span>
          <span className="pnw-site-chat-fab-badge" aria-hidden />
        </button>
      )}

      {open && (
        <div
          id="pnw-site-chat-panel"
          className="pnw-site-chat-panel"
          role="dialog"
          aria-label="Aper\u00e7u du chat Pok\u00e9mon New World"
        >
          <div className="pnw-site-chat-accent-line" aria-hidden />
          <header className="pnw-site-chat-head">
            <div className="pnw-site-chat-head-text">
              <div className="pnw-site-chat-title-row">
                <i className="fa-solid fa-comments pnw-site-chat-title-icon" aria-hidden />
                <span className="pnw-site-chat-title">Chat PNW</span>
              </div>
              <div className="pnw-site-chat-sub-row">
                <span className="pnw-site-chat-live-dot" aria-hidden />
                <span className="pnw-site-chat-sub">
                  {channelLabel || "En direct"}
                </span>
              </div>
            </div>
            <button
              type="button"
              className="pnw-site-chat-icon-btn"
              onClick={() => setOpen(false)}
              aria-label="R\u00e9duire le chat"
            >
              <i className="fa-solid fa-xmark" aria-hidden />
            </button>
          </header>

          <div className="pnw-site-chat-body" ref={listRef}>
            {loading && messages.length === 0 && (
              <p className="pnw-site-chat-placeholder">
                <i className="fa-solid fa-spinner fa-spin" aria-hidden /> Chargement\u2026
              </p>
            )}
            {error && (
              <p className="pnw-site-chat-error" role="alert">
                {error}
              </p>
            )}
            {!loading && !error && messages.length === 0 && (
              <p className="pnw-site-chat-placeholder">
                {configured
                  ? "Aucun message r\u00e9cent sur le salon public."
                  : "Le fil en direct sera affich\u00e9 ici une fois le serveur configur\u00e9 (Supabase)."}
              </p>
            )}
            <ul className="pnw-site-chat-list">
              {messages.map((m) => (
                <li key={m.id} className="pnw-site-chat-msg">
                  {m.avatar ? (
                    <img src={m.avatar} alt="" className="pnw-site-chat-avatar" />
                  ) : (
                    <span className="pnw-site-chat-avatar pnw-site-chat-avatar--ph" aria-hidden>
                      {(m.author || "?")[0].toUpperCase()}
                    </span>
                  )}
                  <div className="pnw-site-chat-msg-main">
                    <div className="pnw-site-chat-msg-meta">
                      <span className="pnw-site-chat-msg-author">{m.author}</span>
                      <time className="pnw-site-chat-msg-time" dateTime={m.created_at || undefined}>
                        {formatTime(m.created_at)}
                      </time>
                    </div>
                    <p className="pnw-site-chat-msg-text">{m.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <footer className="pnw-site-chat-foot">
            <p className="pnw-site-chat-foot-hint">
              <i className="fa-solid fa-gamepad" aria-hidden /> Pour envoyer des messages, utilise le{" "}
              <strong>launcher Pok\u00e9mon New World</strong>.
            </p>
            <Link to="/telechargement" className="pnw-site-chat-cta">
              <i className="fa-solid fa-download" aria-hidden />
              T\u00e9l\u00e9charger le launcher
              <i className="fa-solid fa-arrow-right pnw-site-chat-cta-arrow" aria-hidden />
            </Link>
          </footer>
        </div>
      )}
    </div>
  );
}
