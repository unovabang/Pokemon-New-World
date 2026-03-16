import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import LanguageSelector from "../components/LanguageSelector";
import { useLanguage } from "../contexts/LanguageContext";
import loreData from "../config/lore.json";

const LORE_PAGE_BACKGROUND =
  "https://cdn.discordapp.com/attachments/418440039652130816/1482703693680873584/photo-1749062671992-ea1d9676487e.png?ex=69b7eaeb&is=69b6996b&hm=90deaeaf1108be720d0f0ef1c5e2a70c905c764e5b9d3c6821791720cb55ce77&";

const CHAPTER_BANNER_IMAGES = [
  "https://i.ibb.co/0VVYY8Kr/background-administrateur4.jpg",
  "https://i.ibb.co/5hTQRLsT/background-login-admin.jpg",
  "https://i.ibb.co/SDW19HLT/background-administrateur2.jpg",
];

export default function LorePage() {
  const { t, language } = useLanguage();
  const stories = loreData.stories || [];
  const isEn = language === "en";

  return (
    <main
      className="page page-with-sidebar lore-page"
      style={{ backgroundImage: `url(${LORE_PAGE_BACKGROUND})` }}
    >
      <div className="lore-page-bg-overlay" aria-hidden />
      <Sidebar />
      <div className="lore-page-inner">
        <header className="lore-hero">
          <LanguageSelector className="lore-lang-selector" />
          <div className="lore-hero-card">
            <h1 className="lore-title">
              <i className="fa-solid fa-scroll" aria-hidden />
              <span>Le Lore</span>
            </h1>
            <p className="lore-subtitle">
              {t("lorePage.subtitle") || "L'histoire et l'univers de Pokémon New World."}
            </p>
          </div>
        </header>

        <section className="lore-banners">
          {stories.map((story, index) => {
            const title = isEn && story.titleEn ? story.titleEn : story.title;
            const description = isEn && story.descriptionEn ? story.descriptionEn : story.description;
            const bannerImage = CHAPTER_BANNER_IMAGES[index % CHAPTER_BANNER_IMAGES.length];

            return (
              <article key={story.slug} className="lore-banner-wrap">
                {index > 0 && <div className="lore-banner-sep" aria-hidden />}
                <Link
                  to={`/lore/${story.slug}`}
                  className="lore-banner"
                  state={{ bannerImage }}
                >
                  <div
                    className="lore-banner-bg"
                    style={{ backgroundImage: `url(${bannerImage})` }}
                    aria-hidden
                  />
                  <div className="lore-banner-overlay" aria-hidden />
                  {story.musicYoutubeId && (
                    <span
                      className="lore-banner-music"
                      title={isEn ? "Background music" : "Fond sonore"}
                      aria-label={isEn ? "Background music" : "Fond sonore"}
                    >
                      <i className="fa-solid fa-music" aria-hidden />
                    </span>
                  )}
                  {story.isNew && (
                    <span
                      className="lore-banner-new"
                      title={isEn ? "New chapter" : "Nouveau chapitre"}
                      aria-label={isEn ? "New chapter" : "Nouveau chapitre"}
                    >
                      <i className="fa-solid fa-certificate" aria-hidden />
                    </span>
                  )}
                  <div className="lore-banner-content">
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
