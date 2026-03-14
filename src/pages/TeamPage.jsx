import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import LanguageSelector from "../components/LanguageSelector";

/** Liste des membres de l'équipe : pseudo, avatar (URL ou chemin), rôle */
const TEAM_MEMBERS = [
  { pseudo: "Unovabang", role: "Fondateur", avatar: "" },
  { pseudo: "Jirô", role: "DevTeam", avatar: "" },
  // Ajoute d'autres membres ici : { pseudo: "...", role: "...", avatar: "https://..." ou "/img/..." }
];

/** Remerciements (noms ou phrases) */
const THANKS = [
  "La communauté Pokemon New World",
  "Tous les testeurs et feedbackeurs",
  "Les contributeurs du projet open source",
  "Vous, pour jouer et nous soutenir",
];

const DEFAULT_AVATAR = "data:image/svg+xml," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle fill="%23313538" cx="50" cy="50" r="50"/><circle fill="%237ecdf2" cx="50" cy="38" r="18"/><path fill="%237ecdf2" d="M20 95c0-25 13-40 30-40s30 15 30 40z"/></svg>'
);

export default function TeamPage() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="page page-with-nav team-page">
      <Sidebar />
      <div className="team-page-bg" aria-hidden />
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
          {TEAM_MEMBERS.map((member, i) => (
            <article
              key={member.pseudo + i}
              className="team-card"
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
              <h3 className="team-card-pseudo">{member.pseudo}</h3>
              <span className="team-card-role">{member.role}</span>
            </article>
          ))}
        </section>

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
            {THANKS.map((item, i) => (
              <li key={i} className="team-thanks-item">
                <span className="team-thanks-bullet" aria-hidden>✦</span>
                {item}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
