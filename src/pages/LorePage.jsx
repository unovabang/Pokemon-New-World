import Sidebar from "../components/Sidebar";
import LanguageSelector from "../components/LanguageSelector";
import { useLanguage } from "../contexts/LanguageContext";

export default function LorePage() {
  const { t } = useLanguage();

  return (
    <main className="page page-with-sidebar lore-page">
      <Sidebar />
      <div className="container lore-container">
        <header className="lore-hero">
          <LanguageSelector className="lore-lang-selector" />
          <h1 className="lore-title">
            <i className="fa-solid fa-scroll" aria-hidden />
            <span>Le Lore</span>
          </h1>
          <p className="lore-subtitle">
            {t("lorePage.subtitle") || "L'histoire et l'univers de Pokémon New World."}
          </p>
        </header>
        <section className="lore-content">
          <p className="lore-placeholder">
            {t("lorePage.placeholder") || "Le contenu du lore sera ajouté ici."}
          </p>
        </section>
      </div>
    </main>
  );
}
