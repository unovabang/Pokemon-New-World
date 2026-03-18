import { useParams, Link, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import Sidebar from "../components/Sidebar";
import LanguageSelector from "../components/LanguageSelector";
import { useLanguage } from "../contexts/LanguageContext";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:3001/api`
    : `${window.location.origin}/api`;

const CHAPTER_BANNER_IMAGES = [
  "https://i.ibb.co/0VVYY8Kr/background-administrateur4.jpg",
  "https://i.ibb.co/5hTQRLsT/background-login-admin.jpg",
  "https://i.ibb.co/SDW19HLT/background-administrateur2.jpg",
];

const DEFAULT_VOLUME = 1;
const VOLUME_STEP = 5;
const MIN_VOLUME = 1;

function loadYoutubeAPI() {
  return new Promise((resolve) => {
    if (window.YT?.Player) { resolve(); return; }
    if (window.YT) { resolve(); return; }
    window.onYouTubeIframeAPIReady = () => resolve();
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScript = document.getElementsByTagName("script")[0];
    firstScript.parentNode.insertBefore(tag, firstScript);
  });
}

function getBanner(story, index) {
  if (story?.backgroundImage && story.backgroundImage.trim()) return story.backgroundImage.trim();
  return CHAPTER_BANNER_IMAGES[index >= 0 ? index % CHAPTER_BANNER_IMAGES.length : 0];
}

function renderMarkdown(text) {
  if (!text || typeof text !== "string") return text;
  let k = 0;

  function parseBold(str) {
    const out = [];
    let rest = str;
    while (rest) {
      const a = rest.indexOf("**");
      if (a === -1) { out.push(...parseItalic(rest)); break; }
      const b = rest.indexOf("**", a + 2);
      if (b === -1) { out.push(...parseItalic(rest)); break; }
      if (a > 0) out.push(...parseItalic(rest.slice(0, a)));
      out.push(<strong key={`b${k++}`}>{parseItalic(rest.slice(a + 2, b))}</strong>);
      rest = rest.slice(b + 2);
    }
    return out;
  }

  function parseItalic(str) {
    const out = [];
    let rest = str;
    while (rest) {
      const a = rest.indexOf("*");
      if (a === -1) { if (rest) out.push(rest); break; }
      const b = rest.indexOf("*", a + 1);
      if (b === -1) { out.push(rest); break; }
      if (a > 0) out.push(rest.slice(0, a));
      out.push(<em key={`i${k++}`}>{rest.slice(a + 1, b)}</em>);
      rest = rest.slice(b + 1);
    }
    return out;
  }

  const parts = parseBold(text);
  return parts.length ? parts : text;
}

function RenderContent({ paragraphs }) {
  if (!Array.isArray(paragraphs)) return null;
  return paragraphs.map((p, i) => {
    if (typeof p === "string" && p.startsWith("![")) {
      const m = p.match(/!\[.*?\]\((.*?)\)/);
      const src = m ? m[1] : "";
      if (src) return <img key={i} src={src} alt="" className="lore-story-image" />;
      return null;
    }
    return <p key={i} className="lore-story-p">{renderMarkdown(p)}</p>;
  });
}

export default function LoreStoryPage() {
  const { slug } = useParams();
  const { state: locationState } = useLocation();
  const { language } = useLanguage();
  const isEn = language === "en";

  const [stories, setStories] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/lore?t=${Date.now()}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && Array.isArray(d.lore?.stories)) setStories(d.lore.stories);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const story = stories.find((s) => s.slug === slug);
  const storyIndex = stories.findIndex((s) => s.slug === slug);
  const bannerImage = locationState?.bannerImage || getBanner(story, storyIndex);

  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const [volume, setVolume] = useState(DEFAULT_VOLUME);
  const [muted, setMuted] = useState(true);
  const [volumeBeforeMute, setVolumeBeforeMute] = useState(DEFAULT_VOLUME);

  const prevStory = storyIndex > 0 ? stories[storyIndex - 1] : null;
  const nextStory = storyIndex >= 0 && storyIndex < stories.length - 1 ? stories[storyIndex + 1] : null;
  const prevBanner = prevStory ? getBanner(prevStory, storyIndex - 1) : null;
  const nextBanner = nextStory ? getBanner(nextStory, storyIndex + 1) : null;
  const hasBoth = prevStory && nextStory;
  const hasOne = prevStory || nextStory;

  useEffect(() => {
    if (!story?.musicYoutubeId || !containerRef.current) return;
    loadYoutubeAPI().then(() => {
      const el = document.getElementById("lore-story-youtube-player");
      if (!el) return;
      new window.YT.Player(el, {
        videoId: story.musicYoutubeId,
        playerVars: { autoplay: 1, loop: 1, playlist: story.musicYoutubeId, controls: 0, disablekb: 1, fs: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onReady(e) { playerRef.current = e.target; e.target.setVolume(0); },
        },
      });
    });
    return () => { if (playerRef.current?.stopVideo) playerRef.current.stopVideo(); playerRef.current = null; };
  }, [story?.slug, story?.musicYoutubeId]);

  const setPlayerVolume = (v) => { const val = Math.max(0, Math.min(100, v)); setVolume(val); if (playerRef.current?.setVolume) playerRef.current.setVolume(val); };

  const toggleMute = () => {
    if (muted) { const v = Math.max(MIN_VOLUME, volumeBeforeMute); setVolume(v); if (playerRef.current?.setVolume) playerRef.current.setVolume(v); setMuted(false); }
    else { setVolumeBeforeMute(volume); setVolume(0); if (playerRef.current?.setVolume) playerRef.current.setVolume(0); setMuted(true); }
  };
  const volumeDown = () => { if (muted) return; setPlayerVolume(Math.max(MIN_VOLUME, volume - VOLUME_STEP)); };
  const volumeUp = () => { if (muted) return; setPlayerVolume(Math.min(100, volume + VOLUME_STEP)); };

  if (!story) {
    return (
      <main className="page page-with-sidebar lore-story-page">
        <Sidebar />
        <div className="lore-story-container">
          <p className="lore-story-notfound">
            {loaded ? (isEn ? "Story not found." : "Histoire introuvable.") : (isEn ? "Loading..." : "Chargement...")}
          </p>
          {loaded && (
            <Link to="/lore" className="lore-story-back"><i className="fa-solid fa-arrow-left" aria-hidden />{isEn ? "Back to Lore" : "Retour au Lore"}</Link>
          )}
        </div>
      </main>
    );
  }

  const title = isEn && story.titleEn ? story.titleEn : story.title;
  const description = isEn && story.descriptionEn ? story.descriptionEn : story.description;
  const author = isEn && story.authorEn ? story.authorEn : story.author;
  const intro = isEn && story.introEn ? story.introEn : story.intro;
  const paragraphs = isEn && story.contentEn ? story.contentEn : story.content;

  const wordCount = (intro?.split(/\s+/).length || 0) + (Array.isArray(paragraphs) ? paragraphs.filter((p) => typeof p === "string" && !p.startsWith("![")).join(" ").split(/\s+/).length : 0);
  const readingTime = Math.max(1, Math.round(wordCount / 200));

  const prevTitle = prevStory ? (isEn && prevStory.titleEn ? prevStory.titleEn : prevStory.title) : "";
  const nextTitle = nextStory ? (isEn && nextStory.titleEn ? nextStory.titleEn : nextStory.title) : "";

  return (
    <main key={slug} className="page page-with-sidebar lore-story-page">
      <Sidebar />
      <aside className="lore-story-sidebar" aria-hidden>
        <span className="lore-story-sidebar-title">{title}</span>
        <span className="lore-story-sidebar-dot" aria-hidden />
      </aside>

      {story.musicYoutubeId && (
        <>
          <div id="lore-story-youtube-player" ref={containerRef} className="lore-story-music-iframe" aria-hidden title="Musique de fond" />
          <div className="lore-story-music-tooltip" role="group" aria-label="Contrôle du son">
            <span className="lore-story-music-label">{isEn ? "Sound" : "Son"}</span>
            <button type="button" className="lore-story-music-btn" onClick={toggleMute} title={muted ? (isEn ? "Unmute" : "Réactiver le son") : (isEn ? "Mute" : "Couper le son")}>
              <i className={muted ? "fa-solid fa-volume-xmark" : "fa-solid fa-volume-low"} aria-hidden />
            </button>
            <button type="button" className="lore-story-music-btn" onClick={volumeDown} disabled={muted || volume <= MIN_VOLUME} title={isEn ? "Lower" : "Baisser"}>
              <i className="fa-solid fa-minus" aria-hidden />
            </button>
            <button type="button" className="lore-story-music-btn" onClick={volumeUp} disabled={muted || volume >= 100} title={isEn ? "Raise" : "Augmenter"}>
              <i className="fa-solid fa-plus" aria-hidden />
            </button>
          </div>
        </>
      )}

      <header className="lore-story-hero" style={{ backgroundImage: `url(${bannerImage})` }}>
        <div className="lore-story-hero-overlay" aria-hidden />
        <div className="lore-story-hero-inner">
          <h1 className="lore-story-hero-title">{title}</h1>
          {description && <p className="lore-story-hero-description">{renderMarkdown(description)}</p>}
        </div>
      </header>

      <div className="lore-story-content-wrap">
        <div className="lore-story-content">
          <div className="lore-story-toolbar">
            <Link to="/lore" className="lore-story-back"><i className="fa-solid fa-arrow-left" aria-hidden />{isEn ? "Back to Lore" : "Retour au Lore"}</Link>
            <span className="lore-story-reading-time" aria-hidden><i className="fa-regular fa-clock" aria-hidden />{readingTime} min {isEn ? "read" : "lecture"}</span>
          </div>

          <span className="lore-story-chapter-label">{isEn ? "Chapter" : "Chapitre"}</span>
          <h2 className="lore-story-content-title">{title}</h2>
          <div className="lore-story-meta">
            <p className="lore-story-intro">{renderMarkdown(intro)}</p>
            <p className="lore-story-author">{isEn ? "Reported by" : "Rapporté par"} {author}.</p>
          </div>
          <div className="lore-story-body">
            <RenderContent paragraphs={paragraphs} />
          </div>
          {hasOne && (
            <footer className="lore-story-footer">
              <div className={`lore-story-footer-cards${hasBoth ? "" : " lore-story-footer-cards--single"}`}>
                {prevStory && (
                  <Link to={`/lore/${prevStory.slug}`} className="lore-story-footer-card lore-story-footer-card-prev" state={{ bannerImage: prevBanner }}>
                    <div className="lore-story-footer-card-bg" style={{ backgroundImage: `url(${prevBanner})` }} aria-hidden />
                    <span className="lore-story-footer-card-label">{isEn ? "Previous" : "Précédent"}</span>
                    <span className="lore-story-footer-card-title">{prevTitle}</span>
                    <i className="fa-solid fa-arrow-left" aria-hidden />
                  </Link>
                )}
                {nextStory && (
                  <Link to={`/lore/${nextStory.slug}`} className="lore-story-footer-card lore-story-footer-card-next" state={{ bannerImage: nextBanner }}>
                    <div className="lore-story-footer-card-bg" style={{ backgroundImage: `url(${nextBanner})` }} aria-hidden />
                    <span className="lore-story-footer-card-label">{isEn ? "Next" : "Suivant"}</span>
                    <span className="lore-story-footer-card-title">{nextTitle}</span>
                    <i className="fa-solid fa-arrow-right" aria-hidden />
                  </Link>
                )}
              </div>
            </footer>
          )}
        </div>
      </div>
      <LanguageSelector className="lore-story-lang" />
    </main>
  );
}
