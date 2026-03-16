import { useParams, Link, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import LanguageSelector from "../components/LanguageSelector";
import { useLanguage } from "../contexts/LanguageContext";
import loreData from "../config/lore.json";

const CHAPTER_BANNER_IMAGES = [
  "https://i.ibb.co/0VVYY8Kr/background-administrateur4.jpg",
  "https://i.ibb.co/5hTQRLsT/background-login-admin.jpg",
  "https://i.ibb.co/SDW19HLT/background-administrateur2.jpg",
];

export default function LoreStoryPage() {
  const { slug } = useParams();
  const { state: locationState } = useLocation();
  const { language } = useLanguage();
  const isEn = language === "en";
  const stories = loreData.stories || [];
  const story = stories.find((s) => s.slug === slug);
  const storyIndex = stories.findIndex((s) => s.slug === slug);
  const bannerImage =
    locationState?.bannerImage ||
    CHAPTER_BANNER_IMAGES[storyIndex >= 0 ? storyIndex % CHAPTER_BANNER_IMAGES.length : 0];

  if (!story) {
    return (
      <main className="page page-with-sidebar lore-story-page">
        <Sidebar />
        <div className="lore-story-container">
          <p className="lore-story-notfound">
            {isEn ? "Story not found." : "Histoire introuvable."}
          </p>
          <Link to="/lore" className="lore-story-back">
            <i className="fa-solid fa-arrow-left" aria-hidden />
            {isEn ? "Back to Lore" : "Retour au Lore"}
          </Link>
        </div>
      </main>
    );
  }

  const title = isEn && story.titleEn ? story.titleEn : story.title;
  const author = isEn && story.authorEn ? story.authorEn : story.author;
  const intro = isEn && story.introEn ? story.introEn : story.intro;
  const paragraphs = isEn && story.contentEn ? story.contentEn : story.content;

  return (
    <main className="page page-with-sidebar lore-story-page">
      <Sidebar />
      <aside className="lore-story-sidebar" aria-hidden>
        <span className="lore-story-sidebar-title">{title}</span>
        <span className="lore-story-sidebar-dot" aria-hidden />
      </aside>

      <header
        className="lore-story-hero"
        style={{ backgroundImage: `url(${bannerImage})` }}
      >
        <div className="lore-story-hero-overlay" aria-hidden />
        <h1 className="lore-story-hero-title">{title}</h1>
      </header>

      <div className="lore-story-container lore-story-content-wrap">
        <div className="lore-story-content">
          <Link to="/lore" className="lore-story-back">
            <i className="fa-solid fa-arrow-left" aria-hidden />
            {isEn ? "Back to Lore" : "Retour au Lore"}
          </Link>
          <h2 className="lore-story-content-title">{title}</h2>
          <p className="lore-story-intro">{intro}</p>
          <p className="lore-story-author">
            {isEn ? "Reported by" : "Rapporté par"} {author}.
          </p>
          <div className="lore-story-body">
            {Array.isArray(paragraphs) &&
              paragraphs.map((paragraph, i) => (
                <p key={i} className="lore-story-p">
                  {paragraph}
                </p>
              ))}
          </div>
        </div>
      </div>
      <LanguageSelector className="lore-story-lang" />
    </main>
  );
}
