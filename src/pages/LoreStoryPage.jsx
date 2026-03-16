import { useParams, Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import LanguageSelector from "../components/LanguageSelector";
import { useLanguage } from "../contexts/LanguageContext";
import loreData from "../config/lore.json";

export default function LoreStoryPage() {
  const { slug } = useParams();
  const { language } = useLanguage();
  const isEn = language === "en";
  const stories = loreData.stories || [];
  const story = stories.find((s) => s.slug === slug);

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
      <div className="lore-story-container">
        <div className="lore-story-inner">
          <Link to="/lore" className="lore-story-back">
            <i className="fa-solid fa-arrow-left" aria-hidden />
            {isEn ? "Back to Lore" : "Retour au Lore"}
          </Link>
          <div className="lore-story-divider" aria-hidden />
          <h1 className="lore-story-title">{title}</h1>
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
