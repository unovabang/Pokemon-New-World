import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import LanguageSelector from "../components/LanguageSelector";
import HologramGlobe from "../components/HologramGlobe";
import TradeGlobe from "../components/TradeGlobe";
import { useLanguage } from "../contexts/LanguageContext";
import content from "../config/index.js";
import downloadPageSeed from "../config/downloadPage.json";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : `${window.location.origin}/api`;

const toPublicUrl = (v) => {
  if (!v || typeof v !== "string") return null;
  const s = v.trim();
  if (s.startsWith("public/")) return "/" + s.slice(7);
  return s;
};

export default function DownloadPage() {
  const { language, t } = useLanguage();
  const isEn = language === "en";
  const [pageContent, setPageContent] = useState(null);
  const [downloads, setDownloads] = useState(null);
  const [galleryIndex, setGalleryIndex] = useState(-1);
  const [siteConfig, setSiteConfig] = useState(null);
  const [externalConfig, setExternalConfig] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setLoadError(false);
    Promise.all([
      fetch(`${API_BASE}/download-page?t=${Date.now()}`).then((r) => r.json()).catch(() => ({})),
      fetch(`${API_BASE}/downloads?t=${Date.now()}`).then((r) => r.json()).catch(() => ({}))
    ]).then(([pageRes, dlRes]) => {
      if (pageRes && pageRes.success) {
        setPageContent(pageRes);
        setLoadError(false);
      } else {
        setPageContent({ success: true, ...downloadPageSeed });
        setLoadError(false);
      }
      if (dlRes.success && dlRes.downloads) setDownloads(dlRes.downloads);
      setIsReady(true);
    }).catch(() => {
      setPageContent({ success: true, ...downloadPageSeed });
      setLoadError(false);
      setIsReady(true);
    });
  }, []);

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/config/site?t=${Date.now()}`).then((r) => r.json()).catch(() => null),
      fetch(`${API_BASE}/config/external?t=${Date.now()}`).then((r) => r.json()).catch(() => null)
    ]).then(([siteData, externalData]) => {
      if (siteData?.success && siteData?.config) setSiteConfig(siteData.config);
      if (externalData?.success && externalData?.config) setExternalConfig(externalData.config);
    });
  }, []);

  const baseContent = siteConfig ? { ...content, ...siteConfig } : content;
  const effectiveContent = externalConfig ? { ...baseContent, ...externalConfig } : baseContent;
  const footer = effectiveContent.footer;
  const discord = typeof effectiveContent.discord === "string"
    ? effectiveContent.discord
    : (effectiveContent.discord?.invite ?? effectiveContent.discord ?? "#");
  const logoUrl = toPublicUrl(effectiveContent.branding?.logo);

  const title = isEn && pageContent?.titleEn ? pageContent.titleEn : (pageContent?.title || "Télécharger");
  const subtitle = isEn && pageContent?.subtitleEn ? pageContent.subtitleEn : (pageContent?.subtitle || "");
  const description = isEn && pageContent?.descriptionEn ? pageContent.descriptionEn : (pageContent?.description || "");
  const videoTitle = isEn && pageContent?.videoTitleEn ? pageContent.videoTitleEn : (pageContent?.videoTitle || "");
  const gallery = pageContent?.gallery || [];
  const heroImage = pageContent?.heroImage?.trim() || "";
  const videoUrl = pageContent?.videoUrl?.trim() || "";
  const pageBackground = (pageContent?.pageBackground?.trim() || downloadPageSeed?.pageBackground?.trim() || "").trim();

  const battleTowerTiers = [
    { id: "iron",         fr: "Fer",          en: "Iron",         color: "#9ca3af" },
    { id: "bronze",       fr: "Bronze",       en: "Bronze",       color: "#a16207" },
    { id: "silver",       fr: "Argent",       en: "Silver",       color: "#94a3b8" },
    { id: "gold",         fr: "Or",           en: "Gold",         color: "#eab308" },
    { id: "platinum",     fr: "Platine",      en: "Platinum",     color: "#22d3ee" },
    { id: "emerald",      fr: "Émeraude",     en: "Emerald",      color: "#10b981" },
    { id: "diamond",      fr: "Diamant",      en: "Diamond",      color: "#3b82f6" },
    { id: "master",       fr: "Maître",       en: "Master",       color: "#a855f7" },
    { id: "grandmaster",  fr: "Grand Maître", en: "Grandmaster",  color: "#ec4899" },
    { id: "challenger",   fr: "Challenger",   en: "Challenger",   color: "#ef4444" },
  ];

  const battleTowerFeatures = isEn ? [
    { icon: "fa-calendar-check", title: "Ranked Seasons", desc: "Climb the ladder over recurring seasons. Final tier and rewards reset each cycle to keep the competition fresh." },
    { icon: "fa-shield-halved",  title: "Pokémon Banlist", desc: "A curated banlist keeps the meta balanced. Updates and clauses are managed live by the admin team." },
    { icon: "fa-handshake-angle", title: "Fair Play",      desc: "Anti-cheat checks, match audit logs, and a moderation team handle reports and bans transparently." },
    { icon: "fa-medal",           title: "Real-Time Stats", desc: "Match history, win rate, current tier and rank are tracked and visible to every player." },
  ] : [
    { icon: "fa-calendar-check", title: "Saisons classées", desc: "Grimpez l'échelle au fil des saisons récurrentes. Le rang final et les récompenses sont réinitialisés à chaque cycle." },
    { icon: "fa-shield-halved",  title: "Banlist Pokémon",  desc: "Une banlist régulièrement mise à jour garde la méta équilibrée. Clauses et règles sont gérées par l'équipe admin." },
    { icon: "fa-handshake-angle", title: "Fair-play",       desc: "Anti-triche, journaux d'audit des matchs et une équipe de modération qui traite signalements et bans en toute transparence." },
    { icon: "fa-medal",           title: "Stats en temps réel", desc: "Historique des matchs, ratio de victoires, palier et classement sont suivis en direct pour chaque joueur." },
  ];

  const chatFeatures = isEn ? [
    { icon: "fa-hashtag",       title: "Public channels",     desc: "Talk with the whole community in dedicated rooms — general, help, looking-for-trade, off-topic and more." },
    { icon: "fa-envelope",      title: "Private messages",    desc: "Send DMs with images (up to 5 MB), customize your DM background and pin important messages." },
    { icon: "fa-user-group",    title: "Friends & presence",  desc: "Add friends, accept incoming requests, see who's online, and block toxic users in one click." },
    { icon: "fa-shield-cat",    title: "Roles & badges",      desc: "Admin, Dev Team, Patreon and VIP roles get distinctive badges and aura — your profile reflects your contribution." },
    { icon: "fa-gavel",         title: "Active moderation",   desc: "Slowmode, mutes, temporary or permanent bans with reasons. The mod team keeps the chat healthy." },
    { icon: "fa-image",         title: "Rich profiles",       desc: "Custom bio, avatar and banner — make your profile yours, viewable by anyone in chat." },
  ] : [
    { icon: "fa-hashtag",       title: "Salons publics",      desc: "Discutez avec toute la communauté dans des salons dédiés — général, aide, recherche d'échange, hors-sujet et plus." },
    { icon: "fa-envelope",      title: "Messages privés",     desc: "Envoyez des MP avec images (jusqu'à 5 Mo), personnalisez le fond de vos MP et épinglez les messages importants." },
    { icon: "fa-user-group",    title: "Amis & présence",     desc: "Ajoutez des amis, acceptez les demandes, voyez qui est en ligne et bloquez les joueurs toxiques en un clic." },
    { icon: "fa-shield-cat",    title: "Rôles & badges",      desc: "Admin, Dev Team, Patreon et VIP ont des badges et auras distinctifs — votre profil reflète votre contribution." },
    { icon: "fa-gavel",         title: "Modération active",   desc: "Slowmode, mutes, bans temporaires ou permanents avec motifs. L'équipe de modération garde le chat sain." },
    { icon: "fa-image",         title: "Profils enrichis",    desc: "Bio, avatar et bannière personnalisés — rendez votre profil unique, visible par tous dans le chat." },
  ];

  const gtsFeatures = isEn ? [
    { icon: "fa-arrow-right-arrow-left", title: "Deposit & search", desc: "Deposit a Pokémon and define what you want in return — species, level, gender. Browse up to 30 deposits at once." },
    { icon: "fa-sliders",                title: "Advanced filters", desc: "Filter by nature, shiny / alt form, individual IVs (HP, Atk, Def, Spe, SpA, SpD) with a per-stat gauge. Total IV up to 186." },
    { icon: "fa-star",                   title: "Patreon wishlist", desc: "Patreons can pin up to 5 wanted Pokémon and receive an automatic DM the moment a matching deposit lands." },
    { icon: "fa-bolt",                   title: "Realtime updates", desc: "New deposits and removals push live — no refresh needed. The latest offers always on top." },
    { icon: "fa-clock-rotate-left",      title: "Trade history",    desc: "Every accepted trade is logged so you can review your past exchanges and the Pokémon you sent or received." },
    { icon: "fa-globe",                  title: "Global reach",     desc: "Trade with players around the world, asynchronously — no need to be online at the same time." },
  ] : [
    { icon: "fa-arrow-right-arrow-left", title: "Dépôt & recherche", desc: "Déposez un Pokémon et définissez ce que vous voulez en retour — espèce, niveau, genre. Jusqu'à 30 dépôts visibles." },
    { icon: "fa-sliders",                title: "Filtres avancés",   desc: "Filtrez par nature, shiny / forme alternative, IV individuels (PV, Atk, Déf, Vit, AS, DS) avec jauge par stat. IV total jusqu'à 186." },
    { icon: "fa-star",                   title: "Wishlist Patreon",  desc: "Les Patreons épinglent jusqu'à 5 Pokémon recherchés et reçoivent un MP automatique dès qu'un dépôt correspond." },
    { icon: "fa-bolt",                   title: "Temps réel",        desc: "Nouveaux dépôts et retraits poussés en direct — pas besoin de rafraîchir. Les dernières offres toujours en tête." },
    { icon: "fa-clock-rotate-left",      title: "Historique",        desc: "Chaque échange accepté est enregistré, pour relire vos anciens trades et les Pokémon reçus ou envoyés." },
    { icon: "fa-globe",                  title: "Portée mondiale",   desc: "Échangez avec des joueurs du monde entier, en asynchrone — pas besoin d'être en ligne en même temps." },
  ];

  if (!isReady) {
    return (
      <main className="page page-with-sidebar download-page">
        <Sidebar />
        <div className="download-page-inner">
          <div className="download-page-main">
            <div className="lore-page-loading-spinner" style={{ padding: "4rem" }}>
              <i className="fa-solid fa-spinner fa-spin" aria-hidden />
              <span>{isEn ? "Loading..." : "Chargement..."}</span>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="page page-with-sidebar download-page">
        <Sidebar />
        <div className="download-page-inner">
          <div className="download-page-main">
            <div className="lore-page-unavailable">
              <p className="lore-page-unavailable-text">
                {isEn ? "The download page is temporarily unavailable. Please try again later." : "La page de téléchargement est temporairement indisponible. Réessayez plus tard."}
              </p>
              <button type="button" className="lore-page-unavailable-retry" onClick={() => window.location.reload()}>
                <i className="fa-solid fa-rotate-right" aria-hidden />
                {isEn ? "Retry" : "Réessayer"}
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page page-with-sidebar download-page">
      <div
        className={`download-page-bg${pageBackground ? " download-page-bg--image" : ""}`}
        aria-hidden
        style={pageBackground ? { backgroundImage: `url(${pageBackground})` } : undefined}
      />
      <Sidebar />
      <div className="download-page-inner">
        <div className="download-page-col-main">
          <header className="download-hero">
            <LanguageSelector className="download-lang-selector" />
            {heroImage ? (
              <div className="download-hero-bg" style={{ backgroundImage: `url(${heroImage})` }} aria-hidden />
            ) : (
              <div className="download-hero-gradient" aria-hidden />
            )}
            <div className="download-hero-content">
              <h1 className="download-title">
                <i className="fa-solid fa-cloud-arrow-down" aria-hidden />
                <span>{title}</span>
              </h1>
              {subtitle && <p className="download-subtitle">{subtitle}</p>}
              {description && <p className="download-hero-desc">{description}</p>}
            </div>
          </header>

          <div className="download-page-main">
        {/* 1. Téléchargements tout en haut */}
        <section id="download-section" className="download-section download-actions">
          <h2 className="download-section-title">
            <i className="fa-solid fa-download" aria-hidden />
            {isEn ? "Downloads" : "Téléchargements"}
          </h2>
          <div className="download-cards">
            {(downloads?.launcherDownloadEnabled !== false && downloads?.launcher?.trim() && downloads.launcher !== "#") ? (
              <a className="download-card-btn download-card-btn--launcher" href={downloads.launcher.trim()} rel="noopener noreferrer">
                <span className="download-card-btn-icon"><i className="fa-solid fa-rocket" /></span>
                <span className="download-card-btn-body">
                  <span className="download-card-btn-title">{isEn ? "Download the Game" : "Télécharger le Jeu"}</span>
                  <span className="download-card-btn-sub">{isEn ? "Launcher with auto-updates" : "Launcher avec mises à jour auto"}</span>
                </span>
                <span className="download-card-btn-arrow"><i className="fa-solid fa-arrow-down" /></span>
              </a>
            ) : (
              <div className="download-card-btn download-card-btn--launcher download-card-btn--disabled">
                <span className="download-card-btn-icon"><i className="fa-solid fa-pause-circle" /></span>
                <span className="download-card-btn-body">
                  <span className="download-card-btn-title">{isEn ? "Download disabled for now!" : "Téléchargement désactivé pour l'instant !"}</span>
                  <span className="download-card-btn-sub">{isEn ? "The Launcher will be available again soon." : "Le Launcher sera à nouveau disponible bientôt."}</span>
                </span>
              </div>
            )}
          </div>
        </section>

        {/* 2. Tour de Combat — PvP classé */}
        <section className="download-section download-battle-tower">
          <h2 className="download-section-title">
            <i className="fa-solid fa-trophy" aria-hidden />
            {isEn ? "Battle Tower — Ranked PvP" : "Tour de Combat — PvP classé"}
          </h2>

          <div className="dl-bt-hero">
            <div className="dl-bt-hero-text">
              <h3 className="dl-bt-hero-title">
                {isEn ? "Step into the arena." : "Entrez dans l'arène."}
              </h3>
              <p className="dl-bt-hero-desc">
                {isEn
                  ? "The Battle Tower is the official ranked PvP mode of Pokémon New World. Build your team, challenge other trainers in real time, climb the ladder across recurring seasons, and prove yourself among the best."
                  : "La Tour de Combat est le mode PvP classé officiel de Pokémon New World. Construisez votre équipe, affrontez d'autres dresseurs en direct, gravissez les paliers au fil des saisons et prouvez votre valeur parmi les meilleurs."}
              </p>
              <p className="dl-bt-hero-desc">
                {isEn
                  ? "Every match is logged, every rank is earned. The system features a curated Pokémon banlist, anti-cheat checks, a moderation team, and live season management — all directly from the in-game launcher."
                  : "Chaque match est enregistré, chaque rang se mérite. Le système intègre une banlist Pokémon active, un anti-triche, une équipe de modération et la gestion des saisons en direct — le tout depuis le launcher du jeu."}
              </p>
            </div>

            <div className="dl-globe-wrap" aria-hidden>
              <HologramGlobe size={260} tier="master" intensity="searching" />
              <div className="dl-globe-base" aria-hidden>
                <i className="fa-solid fa-trophy" />
              </div>
            </div>
          </div>

          <ul className="dl-bt-features">
            {battleTowerFeatures.map((f, i) => (
              <li key={i} className="dl-bt-feature">
                <span className="dl-bt-feature-icon">
                  <i className={`fa-solid ${f.icon}`} aria-hidden />
                </span>
                <div className="dl-bt-feature-body">
                  <h4 className="dl-bt-feature-title">{f.title}</h4>
                  <p className="dl-bt-feature-desc">{f.desc}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="dl-bt-tiers-block">
            <div className="dl-bt-tiers-head">
              <span className="dl-bt-tiers-label">
                <i className="fa-solid fa-ranking-star" aria-hidden />
                {isEn ? "Rank ladder" : "Échelle de paliers"}
              </span>
              <span className="dl-bt-tiers-sub">
                {isEn ? "From Iron to Challenger" : "De Fer à Challenger"}
              </span>
            </div>
            <ol className="dl-bt-tiers">
              {battleTowerTiers.map((tier, i) => (
                <li
                  key={tier.id}
                  className="dl-bt-tier"
                  style={{
                    "--tier-color": tier.color,
                    "--tier-step": i,
                  }}
                >
                  <span className="dl-bt-tier-dot" />
                  <span className="dl-bt-tier-name">{isEn ? tier.en : tier.fr}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="dl-bt-howto dl-bt-howto--discord">
            <i className="fa-brands fa-discord" aria-hidden />
            <span>
              {isEn
                ? "Login is done with your Discord account directly in the launcher. Once installed, head to the Battle Tower tab and queue your first ranked match."
                : "La connexion se fait avec votre compte Discord directement depuis le launcher. Une fois installé, rendez-vous dans l'onglet Tour de Combat et lancez votre premier match classé."}
            </span>
          </div>
        </section>

        {/* 3. Chat communautaire */}
        <section className="download-section download-feature download-feature--chat">
          <h2 className="download-section-title">
            <i className="fa-solid fa-comments" aria-hidden />
            {isEn ? "Community Chat" : "Chat communautaire"}
          </h2>

          <div className="dl-feat-hero">
            <div className="dl-feat-hero-text">
              <h3 className="dl-feat-hero-title dl-feat-hero-title--chat">
                {isEn ? "One launcher, the whole community." : "Un launcher, toute la communauté."}
              </h3>
              <p className="dl-feat-hero-desc">
                {isEn
                  ? "The integrated chat connects every trainer in real time — public channels, private messages, friends list, profiles, roles. Everything happens directly inside the launcher, no extra software needed."
                  : "Le chat intégré relie tous les dresseurs en temps réel — salons publics, messages privés, liste d'amis, profils, rôles. Tout se passe directement dans le launcher, sans logiciel supplémentaire."}
              </p>
              <p className="dl-feat-hero-desc">
                {isEn
                  ? "Active moderation, slowmode, mutes, blocks and reports keep the conversation friendly. A free Discord login is all you need to join in."
                  : "Modération active, slowmode, mutes, blocages et signalements gardent les conversations agréables. Une connexion Discord gratuite suffit pour rejoindre."}
              </p>
            </div>

            <div className="dl-chat-preview" aria-hidden>
              <div className="dl-chat-preview-header">
                <span className="dl-chat-preview-dot dl-chat-preview-dot--red" />
                <span className="dl-chat-preview-dot dl-chat-preview-dot--yellow" />
                <span className="dl-chat-preview-dot dl-chat-preview-dot--green" />
                <span className="dl-chat-preview-channel">
                  <i className="fa-solid fa-hashtag" aria-hidden />
                  général
                </span>
                <span className="dl-chat-preview-presence">
                  <span className="dl-chat-preview-online" />
                  142
                </span>
              </div>
              <div className="dl-chat-preview-body">
                <div className="dl-chat-msg">
                  <div className="dl-chat-msg-avatar" style={{ background: "linear-gradient(135deg,#60A5FA,#3B82F6)" }}>S</div>
                  <div className="dl-chat-msg-body">
                    <div className="dl-chat-msg-meta">
                      <span className="dl-chat-msg-author">Steven</span>
                      <span className="dl-chat-badge dl-chat-badge--admin">Admin</span>
                      <span className="dl-chat-msg-time">12:34</span>
                    </div>
                    <p className="dl-chat-msg-text">
                      {isEn ? "Hey trainers, season 4 just started." : "Hey les dresseurs, la saison 4 vient de commencer."}
                    </p>
                  </div>
                </div>
                <div className="dl-chat-msg">
                  <div className="dl-chat-msg-avatar" style={{ background: "linear-gradient(135deg,#F472B6,#C084FC)" }}>M</div>
                  <div className="dl-chat-msg-body">
                    <div className="dl-chat-msg-meta">
                      <span className="dl-chat-msg-author">Misa</span>
                      <span className="dl-chat-badge dl-chat-badge--patreon">Patreon</span>
                      <span className="dl-chat-msg-time">12:35</span>
                    </div>
                    <p className="dl-chat-msg-text">
                      {isEn ? "Already master tier, who's up for a friendly?" : "Déjà maître, qui veut faire un combat amical ?"}
                    </p>
                  </div>
                </div>
                <div className="dl-chat-msg">
                  <div className="dl-chat-msg-avatar" style={{ background: "linear-gradient(135deg,#34D399,#10B981)" }}>L</div>
                  <div className="dl-chat-msg-body">
                    <div className="dl-chat-msg-meta">
                      <span className="dl-chat-msg-author">Léo</span>
                      <span className="dl-chat-msg-time">12:36</span>
                    </div>
                    <p className="dl-chat-msg-text">
                      {isEn ? "I'm in! See you on the Battle Tower." : "Je suis chaud ! On se retrouve sur la Tour de Combat."}
                    </p>
                  </div>
                </div>
              </div>
              <div className="dl-chat-preview-input">
                <i className="fa-solid fa-face-smile" />
                <span>{isEn ? "Write a message…" : "Écrire un message…"}</span>
                <i className="fa-solid fa-paper-plane" />
              </div>
            </div>
          </div>

          <ul className="dl-feat-grid">
            {chatFeatures.map((f, i) => (
              <li key={i} className="dl-feat-card dl-feat-card--chat">
                <span className="dl-feat-card-icon">
                  <i className={`fa-solid ${f.icon}`} aria-hidden />
                </span>
                <div className="dl-feat-card-body">
                  <h4 className="dl-feat-card-title">{f.title}</h4>
                  <p className="dl-feat-card-desc">{f.desc}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="dl-feat-howto dl-feat-howto--discord">
            <i className="fa-brands fa-discord" aria-hidden />
            <span>
              {isEn
                ? "Sign in with Discord on first launch — no separate password to remember. Your nickname, avatar and friends are linked to your Discord identity."
                : "Connectez-vous via Discord au premier lancement — aucun mot de passe séparé à retenir. Votre pseudo, avatar et amis sont liés à votre identité Discord."}
            </span>
          </div>
        </section>

        {/* 4. GTS — Global Trade System */}
        <section className="download-section download-feature download-feature--gts">
          <h2 className="download-section-title">
            <i className="fa-solid fa-arrow-right-arrow-left" aria-hidden />
            {isEn ? "GTS — Global Trade System" : "GTS — Échange mondial"}
          </h2>

          <div className="dl-feat-hero dl-feat-hero--reverse">
            <div className="dl-feat-hero-text">
              <h3 className="dl-feat-hero-title dl-feat-hero-title--gts">
                {isEn ? "Trade with the whole world." : "Échangez avec le monde entier."}
              </h3>
              <p className="dl-feat-hero-desc">
                {isEn
                  ? "Deposit a Pokémon, set what you want in return, and let the GTS find a match for you. The system runs asynchronously — players don't need to be online at the same time."
                  : "Déposez un Pokémon, indiquez ce que vous voulez en retour, et laissez le GTS trouver un match. Le système fonctionne en asynchrone — pas besoin d'être en ligne en même temps."}
              </p>
              <p className="dl-feat-hero-desc">
                {isEn
                  ? "Advanced filters cover IVs, nature, shiny status, level and more. Patreons even get a wishlist that pings them by DM the second a matching deposit lands."
                  : "Les filtres avancés couvrent IV, nature, shiny, niveau et plus. Les Patreons ont même une wishlist qui les notifie en MP dès qu'un dépôt correspond."}
              </p>
            </div>

            <div className="dl-trade-globe-wrap" aria-hidden>
              <TradeGlobe size={240} />
              <div className="dl-trade-globe-base">
                <i className="fa-solid fa-arrow-right-arrow-left" />
              </div>
            </div>
          </div>

          <ul className="dl-feat-grid">
            {gtsFeatures.map((f, i) => (
              <li key={i} className="dl-feat-card dl-feat-card--gts">
                <span className="dl-feat-card-icon">
                  <i className={`fa-solid ${f.icon}`} aria-hidden />
                </span>
                <div className="dl-feat-card-body">
                  <h4 className="dl-feat-card-title">{f.title}</h4>
                  <p className="dl-feat-card-desc">{f.desc}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="dl-feat-howto dl-feat-howto--discord">
            <i className="fa-brands fa-discord" aria-hidden />
            <span>
              {isEn
                ? "Like the Battle Tower and chat, the GTS uses your Discord login — your trade history is tied to your Discord profile."
                : "Comme la Tour de Combat et le chat, le GTS utilise votre connexion Discord — votre historique d'échanges est lié à votre profil Discord."}
            </span>
          </div>
        </section>

        {videoUrl && (
          <section className="download-section download-video-section">
            <h2 className="download-section-title">
              <i className="fa-solid fa-play-circle" aria-hidden />
              {videoTitle || (isEn ? "Installation video" : "Vidéo d'installation")}
            </h2>
            <div className="download-video-wrap download-video-wrap--glass">
              {/\.(mp4|webm|ogg)(\?|$)/i.test(videoUrl) ? (
                <video src={videoUrl} controls playsInline className="download-video-native">
                  <track kind="captions" />
                </video>
              ) : (
                <iframe
                  src={videoUrl}
                  title={videoTitle || "Tutoriel"}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              )}
            </div>
          </section>
        )}

        {gallery.length > 0 && (
          <section className="download-section download-gallery-section">
            <h2 className="download-section-title">
              <i className="fa-solid fa-images" aria-hidden />
              {isEn ? "Gallery" : "Galerie"}
            </h2>
            <div className="download-gallery">
              {gallery.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  className="download-gallery-item"
                  onClick={() => setGalleryIndex(i)}
                  style={{ backgroundImage: `url(${url})` }}
                >
                  <span className="sr-only">{isEn ? "View image" : "Voir l'image"}</span>
                </button>
              ))}
            </div>
            {gallery.length > 0 && galleryIndex >= 0 && (
              <div className="download-gallery-lightbox" onClick={() => setGalleryIndex(-1)} role="dialog" aria-modal="true" aria-label={isEn ? "Gallery" : "Galerie"}>
                <button type="button" className="download-gallery-lightbox-close" aria-label="Fermer">
                  <i className="fa-solid fa-xmark" />
                </button>
                {gallery[galleryIndex] && (
                  <img src={gallery[galleryIndex]} alt={`Screenshot ${galleryIndex + 1}`} onClick={(e) => e.stopPropagation()} />
                )}
              </div>
            )}
          </section>
        )}

          </div>
        </div>
      </div>

      <footer className="site-footer download-page-footer">
        <div className="container footer-top">
          <div className="footer-grid">
            <div className="footer-col footer-col--brand">
              <div className="footer-brand">
                {logoUrl ? <img src={logoUrl} alt={effectiveContent.game?.title || "Pokemon New World"} /> : null}
                <strong>{effectiveContent.game?.title || "Pokémon New World"}</strong>
              </div>
              <p className="footer-desc">{t("footer.description")}</p>
              <div className="social">
                <a href={discord || "#"} target="_blank" rel="noreferrer" title="Discord">
                  <i className="fa-brands fa-discord" />
                </a>
                <a href="#download-section" className="social-btn" title={t("buttons.download")}>
                  <i className="fa-solid fa-download" />
                </a>
              </div>
            </div>
            <div className="footer-col">
              <h4>{t("navigation.navigation")}</h4>
              <ul>
                <li><a href="/#news"><i className="fa-solid fa-newspaper" /> {t("navigation.news")}</a></li>
                <li>
                  <a href="#download-section" className="footer-link-btn">
                    <i className="fa-solid fa-cloud-arrow-down" /> {t("navigation.download")}
                  </a>
                </li>
                <li><Link to="/lore"><i className="fa-solid fa-scroll" /> Lore</Link></li>
                <li><Link to="/pokedex"><i className="fa-solid fa-book" /> Pokédex</Link></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>{t("navigation.legal")}</h4>
              <ul>
                <li>{t("footer.legal.disclaimer1")}</li>
                <li>{t("footer.legal.disclaimer2")}</li>
              </ul>
            </div>
            {footer?.links && footer.links.length > 0 && (
              <div className="footer-col">
                <h4>Liens</h4>
                <ul>
                  {footer.links.map((link, index) => (
                    <li key={link.id || index}>
                      <a href={link.url} target="_blank" rel="noreferrer">
                        {link.icon && <i className={link.icon} />} {link.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="footer-contact-wrap">
            <Link to="/contact" className="footer-contact-btn">
              <i className="fa-solid fa-envelope" />
              <span>{isEn ? "Contact the team" : "Contacter l'équipe"}</span>
            </Link>
          </div>
        </div>
        <div className="container footnote">
          <span>{footer?.copyright ? footer.copyright.replace("{year}", new Date().getFullYear()) : `© ${new Date().getFullYear()} Pokémon New World — ${t("footer.copyright")}`}</span>
          {footer?.developedBy && <span className="footnote-sep">·</span>}
          {footer?.developedBy && <span>Développé par : {footer.developedBy}</span>}
          {footer?.version && <span className="footnote-sep">·</span>}
          {footer?.version && <span>{footer.version}</span>}
        </div>
      </footer>
    </main>
  );
}
