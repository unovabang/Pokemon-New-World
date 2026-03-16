import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import LanguageSelector from "../components/LanguageSelector";
import { useLanguage } from "../contexts/LanguageContext";
import loreData from "../config/lore.json";

export default function LorePage() {
  const { t, language } = useLanguage();
  const stories = loreData.stories || [];
  const isEn = language === "en";

  return (
    <main className="page page-with-sidebar lore-page">
      <Sidebar />
      <div className="lore-page-inner">
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

        <section className="lore-banners">
          {stories.map((story, index) => {
            const title = isEn && story.titleEn ? story.titleEn : story.title;
            const description = isEn && story.descriptionEn ? story.descriptionEn : story.description;
            const hasBg = Boolean(story.backgroundImage && story.backgroundImage.trim());

            return (
              <article key={story.slug} className="lore-banner-wrap">
                {index > 0 && <div className="lore-banner-sep" aria-hidden />}
                <Link to={`/lore/${story.slug}`} className="lore-banner">
                  <div
                    className="lore-banner-bg"
                    style={
                      hasBg
                        ? { backgroundImage: `url(${story.backgroundImage})` }
                        : {
                            background: `linear-gradient(135deg, rgba(15, 25, 45, 0.97) 0%, rgba(8, 14, 28, 0.98) 50%, rgba(20, 15, 35, 0.97) 100%)`,
                          }
                    }
                    aria-hidden
                  />
                  <div className="lore-banner-overlay" aria-hidden />
                  <div className="lore-banner-content">
                    {story.isNew && (
                      <span className="lore-banner-tag">
                        {t("lorePage.newTag") || "NOUVELLE"}
                      </span>
                    )}
                    <h2 className="lore-banner-title">{title}</h2>
                    <p className="lore-banner-desc">{description}</p>
                    <span className="lore-banner-btn">
                      {t("lorePage.readStory") || "LIRE L'HISTOIRE"}
                      <i className="fa-solid fa-arrow-right" aria-hidden />
                    </span>
                  </div>
                </Link>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
