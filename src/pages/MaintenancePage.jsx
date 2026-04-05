import { useLanguage } from "../contexts/LanguageContext";

export default function MaintenancePage({ config, discord }) {
  const { language } = useLanguage();
  const isEn = language === "en";

  const title = isEn
    ? (config?.titleEn || "Under Maintenance")
    : (config?.title || "Maintenance en cours");
  const message = isEn
    ? (config?.messageEn || "The site is temporarily unavailable. Come back soon!")
    : (config?.message || "Le site est temporairement indisponible. Revenez bientôt !");

  return (
    <div className="maintenance-page">
      <div className="maintenance-overlay" aria-hidden />
      <div className="maintenance-card">
        <div className="maintenance-icon" aria-hidden>
          <i className="fa-solid fa-wrench" />
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
          <i className="fa-solid fa-clock" aria-hidden />
          {isEn
            ? "We'll be back shortly. Thank you for your patience!"
            : "Nous revenons bientôt. Merci de votre patience !"}
        </div>
      </div>
    </div>
  );
}
