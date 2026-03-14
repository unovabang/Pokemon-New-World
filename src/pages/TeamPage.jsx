import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import LanguageSelector from "../components/LanguageSelector";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:3001/api`
    : `${window.location.origin}/api`;

const DEFAULT_AVATAR = "data:image/svg+xml," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle fill="%23313538" cx="50" cy="50" r="50"/><circle fill="%237ecdf2" cx="50" cy="38" r="18"/><path fill="%237ecdf2" d="M20 95c0-25 13-40 30-40s30 15 30 40z"/></svg>'
);

const DEFAULT_ROLE_COLOR = "#7ecdf2";

export default function TeamPage() {
  const [visible, setVisible] = useState(false);
  const [members, setMembers] = useState([]);
  const [thanks, setThanks] = useState([]);
  const [showBackground, setShowBackground] = useState(true);
  const [backgroundImage, setBackgroundImage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/config/team?t=${Date.now()}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data?.success) return;
        const config = data.config || {};
        setMembers(Array.isArray(config.members) ? config.members : []);
        setThanks(Array.isArray(config.thanks) ? config.thanks : []);
        setShowBackground(config.showBackground !== false);
        setBackgroundImage(typeof config.backgroundImage === "string" ? config.backgroundImage.trim() : "");
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <main className={`page page-with-nav team-page ${showBackground ? "team-page--with-bg" : ""} ${backgroundImage ? "team-page--with-image" : ""}`}>
      <Sidebar />
      {backgroundImage && <div className="team-page-bg-image" style={{ backgroundImage: `url(${backgroundImage})` }} aria-hidden />}
      {showBackground && <div className="team-page-bg" aria-hidden />}
      <div className="container team-container">
        <header className="team-hero">
          <LanguageSelector className="team-lang-selector" />
          <p className="team-hero-subtitle">Qui fait vivre l’aventure</p>
          <h1 className="team-hero-title">
            <span className="team-hero-title-inner">L’équipe Pokemon New World</span>
          </h1>
          <div className="team-hero-line" />
        </header>

        <section
          className={`team-grid ${visible ? "team-grid--visible" : ""}`}
          aria-labelledby="team-heading"
        >
          <h2 id="team-heading" className="sr-only">Membres de l’équipe</h2>
          {loading ? (
            <p className="team-loading"><i className="fa-solid fa-spinner fa-spin" aria-hidden /> Chargement…</p>
          ) : (
            members.map((member, i) => {
              const isFounder = (member.role || "").trim().toLowerCase() === "fondateur";
              return (
                <article
                  key={member.id || member.pseudo + i}
                  className={`team-card ${isFounder ? "team-card--founder" : ""}`}
                  style={{ animationDelay: `${i * 0.08}s` }}
                >
                  <div className="team-card-glow" aria-hidden />
                  <div className="team-card-avatar-wrap">
                    <img
                      src={member.avatar || DEFAULT_AVATAR}
                      alt=""
                      className="team-card-avatar"
                      loading="lazy"
                    />
                  </div>
                  <h3 className="team-card-pseudo">{member.pseudo || "—"}</h3>
                  <span
                    className="team-card-role"
                    style={{
                      "--team-role-color": member.roleColor || DEFAULT_ROLE_COLOR,
                      color: member.roleColor || DEFAULT_ROLE_COLOR,
                      borderColor: member.roleColor || DEFAULT_ROLE_COLOR,
                      backgroundColor: member.roleColor ? `${member.roleColor}22` : "rgba(126,205,242,.15)",
                    }}
                  >
                    {member.role || "—"}
                  </span>
                  {isFounder && <span className="team-card-founder-badge" aria-hidden><i className="fa-solid fa-crown" /></span>}
                </article>
              );
            })
          )}
        </section>

        {!loading && thanks.length > 0 && (
          <section
            className="team-thanks"
            aria-labelledby="thanks-heading"
          >
            <h2 id="thanks-heading" className="team-thanks-title">
              <i className="fa-solid fa-heart" aria-hidden />
              Remerciements
            </h2>
            <p className="team-thanks-intro">
              Un grand merci à toutes les personnes qui rendent ce projet possible.
            </p>
            <ul className="team-thanks-list">
              {thanks.map((item, i) => (
                <li key={i} className="team-thanks-item">
                  <span className="team-thanks-bullet" aria-hidden>✦</span>
                  {item}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
