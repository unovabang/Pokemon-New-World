import { useLanguage } from "../contexts/LanguageContext";

export default function MaintenancePage({ config, discord, logoUrl }) {
  const { language } = useLanguage();
  const isEn = language === "en";

  // Nettoyer le chemin logo (site.json peut stocker "public/logo.png")
  const logo = (logoUrl || "/logo.png").replace(/^public\//, "/");

  const title = isEn
    ? (config?.titleEn || "Under Maintenance")
    : (config?.title || "Maintenance en cours");
  const message = isEn
    ? (config?.messageEn || "The site is temporarily unavailable. Come back soon!")
    : (config?.message || "Le site est temporairement indisponible. Revenez bientôt !");

  return (
    <div className="maintenance-page">
      {/* Particules animées */}
      <div className="maintenance-particles" aria-hidden>
        <div className="maintenance-particle maintenance-particle--1" />
        <div className="maintenance-particle maintenance-particle--2" />
        <div className="maintenance-particle maintenance-particle--3" />
        <div className="maintenance-particle maintenance-particle--4" />
        <div className="maintenance-particle maintenance-particle--5" />
        <div className="maintenance-particle maintenance-particle--6" />
      </div>

      <div className="maintenance-card">
        {/* Logo */}
        <div className="maintenance-logo-wrap">
          <img
            src={logo}
            alt="Pokémon New World"
            className="maintenance-logo"
          />
          <div className="maintenance-logo-glow" aria-hidden />
        </div>

        {/* Icône + titre */}
        <div className="maintenance-badge">
          <i className="fa-solid fa-wrench" aria-hidden />
          {isEn ? "MAINTENANCE" : "MAINTENANCE"}
        </div>

        <h1 className="maintenance-title">{title}</h1>
        <p className="maintenance-message">{message}</p>

        {discord && discord !== "#" && (
          <a
            href={discord}
            target="_blank"
            rel="noopener noreferrer"
            className="maintenance-discord-btn"
          >
            <i className="fa-brands fa-discord" aria-hidden />
            {isEn ? "Join our Discord" : "Rejoindre le Discord"}
          </a>
        )}

        <div className="maintenance-footer">
          <div className="maintenance-pulse" aria-hidden />
          {isEn
            ? "We'll be back shortly. Thank you for your patience!"
            : "Nous revenons bientôt. Merci de votre patience !"}
        </div>
      </div>
    </div>
  );
}
