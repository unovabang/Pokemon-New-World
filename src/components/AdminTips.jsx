import { useMemo, useState } from "react";

const CATEGORY_LABELS = {
  general: "Général",
  content: "Contenu",
  workflow: "Workflow",
  security: "Sécurité",
};

const TIPS = [
  {
    id: "domain-login",
    category: "general",
    icon: "fa-globe",
    title: "Connexion sur le site officiel",
    keywords: "domaine url token session admin-login",
    content: (
      <p>
        <i className="fa-solid fa-link admin-tips-inline-icon" aria-hidden />
        Le site officiel est <strong>https://www.pokemonnewworld.fr</strong>. Si vous ne parvenez plus à accéder à l’admin après un changement de domaine, allez sur{" "}
        <strong>/admin-login</strong> sur le nouveau site et reconnectez-vous avec vos identifiants.{" "}
        <em>Le token de session est stocké par origine (domaine) : une reconnexion suffit une fois.</em>
      </p>
    ),
  },
  {
    id: "autosave-pokedex",
    category: "workflow",
    icon: "fa-book-open",
    title: "Sauvegarde automatique (Pokédex)",
    keywords: "délai floppydisk",
    content: (
      <p>
        <i className="fa-solid fa-floppy-disk admin-tips-inline-icon" aria-hidden />
        Les modifications du <strong>Pokédex</strong> sont enregistrées <em>automatiquement</em> environ 1,5 seconde après votre dernier changement. Vous n’avez pas besoin de cliquer sur « Sauvegarder » dans cet écran. Le message{" "}
        <strong>« Sauvegardé automatiquement »</strong> confirme l’enregistrement. Le bouton{" "}
        <strong>« Sauvegarder maintenant »</strong> force une sauvegarde immédiate avant une fermeture d’onglet, par exemple.
      </p>
    ),
  },
  {
    id: "manual-editors",
    category: "workflow",
    icon: "fa-file-export",
    title: "Éditeurs avec sauvegarde manuelle",
    keywords: "patch notes téléchargements actualités bannières",
    content: (
      <>
        <p>
          <i className="fa-solid fa-hand-pointer admin-tips-inline-icon" aria-hidden />
          Tout n’est pas en auto-save : <strong>Actualités</strong> (bannières), <strong>Téléchargements</strong>,{" "}
          <strong>Notes de patch</strong>, <strong>Paramètres</strong>, <strong>Item / EVs Location</strong>, etc. utilisent en général un bouton{" "}
          <strong>Sauvegarder</strong> dans leur propre écran. Pensez à l’utiliser avant de quitter l’onglet.
        </p>
        <p>
          <i className="fa-solid fa-triangle-exclamation admin-tips-inline-icon" aria-hidden />
          Le bouton vert <strong>Sauvegarder</strong> en haut du panneau sert surtout d’indicateur visuel ;{" "}
          <em>c’est l’éditeur ouvert</em> qui enregistre réellement vos changements côté serveur.
        </p>
      </>
    ),
  },
  {
    id: "data-persist",
    category: "general",
    icon: "fa-database",
    title: "Où sont stockées les données ?",
    keywords: "volume railway git production",
    content: (
      <p>
        <i className="fa-solid fa-server admin-tips-inline-icon" aria-hidden />
        En production, les fichiers de configuration (<strong>Pokédex, Guide, Extradex, BST, actualités</strong>, etc.) sont enregistrés sur un{" "}
        <strong>volume persistant</strong> : les changements survivent aux redéploiements. Selon la configuration serveur, ils peuvent aussi être synchronisés vers le dépôt Git.
      </p>
    ),
  },
  {
    id: "images-urls",
    category: "content",
    icon: "fa-image",
    title: "Images : privilégier les liens web",
    keywords: "url cdn hébergement sprite carte",
    content: (
      <p>
        <i className="fa-solid fa-link admin-tips-inline-icon" aria-hidden />
        Pour le <strong>Guide</strong> (cartes, sprites de personnages) et les fonds, privilégiez des <strong>URLs complètes</strong> (<code>https://...</code>) plutôt que des fichiers locaux difficiles à versionner.{" "}
        <em>Vérifiez que le lien est public et stable</em> (pas d’expiration) pour éviter les images cassées sur le site.
      </p>
    ),
  },
  {
    id: "news-banners",
    category: "content",
    icon: "fa-newspaper",
    title: "Bannières d’actualités",
    keywords: "rotation hauteur pixels",
    content: (
      <>
        <p>
          <i className="fa-solid fa-images admin-tips-inline-icon" aria-hidden />
          Les bannières se gèrent dans <strong>Actualités</strong> : URLs d’images externes, ordre avec les flèches, suppression si besoin. Pensez à <strong>sauvegarder</strong> après vos changements.
        </p>
        <p>
          <i className="fa-solid fa-ruler-vertical admin-tips-inline-icon" aria-hidden />
          <strong>Hauteur max</strong> (150–1200 px) : les visuels sont <strong>rognés</strong> à cette hauteur.{" "}
          <strong>Intervalle de rotation</strong> : délai en millisecondes entre deux bannières ; testez sur le site public pour valider le rendu.
        </p>
      </>
    ),
  },
  {
    id: "guide-steps",
    category: "content",
    icon: "fa-route",
    title: "Guide : étapes et personnages",
    keywords: "étape sprite carte walkthrough",
    content: (
      <p>
        <i className="fa-solid fa-layer-group admin-tips-inline-icon" aria-hidden />
        Chaque étape peut avoir une <strong>image (carte)</strong> et des <strong>personnages</strong> (nom, description, sprite). Après édition, utilisez le bouton de sauvegarde du <strong>Guide</strong>. Gardez un ordre d’étapes logique pour les joueurs.
      </p>
    ),
  },
  {
    id: "lore-chapters",
    category: "content",
    icon: "fa-scroll",
    title: "Lore : chapitres et URLs",
    keywords: "slug lore story url",
    content: (
      <p>
        <i className="fa-solid fa-bookmark admin-tips-inline-icon" aria-hidden />
        Dans <strong>Le Lore</strong>, chaque histoire peut avoir un identifiant (slug) utilisé dans l’URL (<code>/lore/nom-du-chapitre</code>).{" "}
        <em>Évitez de renommer un slug déjà partagé</em> pour ne pas casser les liens ; si vous le faites, mettez à jour les liens Discord ou articles qui pointent vers l’ancienne adresse.
      </p>
    ),
  },
  {
    id: "download-page",
    category: "content",
    icon: "fa-file-image",
    title: "Page Téléchargement publique",
    keywords: "galerie vidéo telechargement",
    content: (
      <p>
        <i className="fa-solid fa-display admin-tips-inline-icon" aria-hidden />
        L’onglet <strong>Page Téléchargement</strong> contrôle le contenu de <code>/telechargement</code> (textes, médias, galerie). Les <strong>liens de fichier</strong> du jeu eux-mêmes sont souvent dans <strong>Téléchargements</strong> : gardez les deux cohérents (version affichée = liens à jour).
      </p>
    ),
  },
  {
    id: "extradex",
    category: "workflow",
    icon: "fa-star",
    title: "Extradex",
    keywords: "types fond auto-save",
    content: (
      <p>
        <i className="fa-solid fa-wand-magic-sparkles admin-tips-inline-icon" aria-hidden />
        Comme le Pokédex et le BST, l’<strong>Extradex</strong> se sauvegarde <em>automatiquement</em> après ~1,5 s d’inactivité. Le bouton <strong>« Sauvegarder maintenant »</strong> permet de forcer l’écriture immédiate.
      </p>
    ),
  },
  {
    id: "bst-fakemon",
    category: "workflow",
    icon: "fa-chart-line",
    title: "BST et Abilities",
    keywords: "fakemon megas stats capacités",
    content: (
      <p>
        <i className="fa-solid fa-dragon admin-tips-inline-icon" aria-hidden />
        L’éditeur <strong>BST</strong> couvre Fakemon, Mégas et entrées spéciales (stats + capacités). Sauvegarde <em>automatique</em> avec la même logique de délai ; utilisez <strong>« Sauvegarder maintenant »</strong> si vous enchaînez plusieurs changements rapides.
      </p>
    ),
  },
  {
    id: "nerfs-item-evs",
    category: "content",
    icon: "fa-balance-scale",
    title: "Nerfs, objets et EVs",
    keywords: "localisation cohérence pokédex",
    content: (
      <>
        <p>
          <i className="fa-solid fa-map-location-dot admin-tips-inline-icon" aria-hidden />
          <strong>Nerfs & Buffs</strong> peut s’appuyer sur la liste Pokédex pour rester aligné avec les noms officiels du projet.{" "}
          <strong>Item Location</strong> et <strong>EVs Location</strong> : vérifiez l’orthographe des lieux et objets comme dans le jeu pour limiter les questions des joueurs.
        </p>
        <p>
          <i className="fa-solid fa-floppy-disk admin-tips-inline-icon" aria-hidden />
          Ces écrans utilisent en général une <strong>sauvegarde explicite</strong> : cliquez sur sauvegarder avant de changer d’onglet.
        </p>
      </>
    ),
  },
  {
    id: "site-settings",
    category: "general",
    icon: "fa-sliders",
    title: "Paramètres, équipe et liens externes",
    keywords: "patreon footer équipe",
    content: (
      <p>
        <i className="fa-solid fa-gear admin-tips-inline-icon" aria-hidden />
        <strong>Paramètres</strong> regroupe site, Patreon, pied de page et liens externes : une modification peut impacter plusieurs pages. Après changement, ouvrez la page d’accueil et le pied de page pour contrôler le rendu.{" "}
        <strong>L’équipe</strong> alimente la page des remerciements : gardez noms, rôles et avatars à jour.
      </p>
    ),
  },
  {
    id: "discord-embed",
    category: "general",
    icon: "fa-brands fa-discord",
    title: "Embed Discord (webhooks)",
    keywords: "webhook secret salon",
    content: (
      <p>
        <i className="fa-solid fa-key admin-tips-inline-icon" aria-hidden />
        L’outil <strong>Embed Discord</strong> sert à préparer des messages pour webhook. <strong>Ne publiez jamais</strong> l’URL complète du webhook dans un canal public : toute personne pourrait poster dans votre salon. En cas de fuite, <em>supprimez le webhook</em> dans les paramètres Discord et recréez-en un.
      </p>
    ),
  },
  {
    id: "logs",
    category: "security",
    icon: "fa-list-alt",
    title: "Logs de connexion",
    keywords: "ip email tentatives",
    content: (
      <p>
        <i className="fa-solid fa-shield-halved admin-tips-inline-icon" aria-hidden />
        L’onglet <strong>Logs de connexion</strong> liste les tentatives (date, e-mail, IP, succès ou échec). Utile pour repérer des accès suspects. En cas d’anomalie, changez le mot de passe admin et contactez l’hébergeur si nécessaire.
      </p>
    ),
  },
  {
    id: "session-shared-pc",
    category: "security",
    icon: "fa-user-lock",
    title: "Ordinateur partagé et déconnexion",
    keywords: "logout déconnexion session",
    content: (
      <p>
        <i className="fa-solid fa-right-from-bracket admin-tips-inline-icon" aria-hidden />
        Sur un PC partagé, utilisez le bouton <strong>Déconnexion</strong> (icône de sortie) en haut à droite quand vous avez fini : votre session reste valide tant que le navigateur garde le token. Fermer l’onglet seul ne suffit pas toujours.
      </p>
    ),
  },
];

function normalize(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function tipIconClass(icon) {
  if (icon.includes("fa-brands") || icon.includes("fa-regular")) return icon;
  return `fa-solid ${icon}`;
}

export default function AdminTips() {
  const [openIds, setOpenIds] = useState(() => new Set([TIPS[0]?.id].filter(Boolean)));
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const categories = useMemo(() => {
    const ids = [...new Set(TIPS.map((t) => t.category))];
    return ids.sort((a, b) => (CATEGORY_LABELS[a] || a).localeCompare(CATEGORY_LABELS[b] || b));
  }, []);

  const filteredTips = useMemo(() => {
    const q = normalize(query.trim());
    return TIPS.filter((tip) => {
      if (category !== "all" && tip.category !== category) return false;
      if (!q) return true;
      const hay = normalize(`${tip.title} ${tip.keywords || ""}`);
      return hay.includes(q);
    });
  }, [query, category]);

  const toggleId = (id) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandFiltered = () => setOpenIds(new Set(filteredTips.map((t) => t.id)));
  const collapseAll = () => setOpenIds(new Set());

  return (
    <div className="admin-tips">
      <div className="admin-panel-card admin-tips-card">
        <header className="admin-tips-hero">
          <div className="admin-tips-hero-icon" aria-hidden>
            <i className="fa-solid fa-lightbulb" />
          </div>
          <div className="admin-tips-hero-text">
            <h2 className="admin-panel-card-title admin-tips-title">
              Conseils pour les administrateurs
            </h2>
            <p className="admin-tips-subtitle">
              Raccourcis, bonnes pratiques et pièges à éviter pour utiliser le panneau sans surprise.
            </p>
          </div>
        </header>

        <div className="admin-tips-toolbar">
          <div className="admin-tips-search-wrap">
            <i className="fa-solid fa-magnifying-glass admin-tips-search-icon" aria-hidden />
            <input
              type="search"
              className="admin-tips-search"
              placeholder="Rechercher un conseil…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Rechercher dans les conseils"
            />
          </div>
          <div className="admin-tips-meta">
            <span className="admin-tips-pill">
              <i className="fa-solid fa-layer-group" aria-hidden />
              {filteredTips.length} conseil{filteredTips.length !== 1 ? "s" : ""}
            </span>
            <div className="admin-tips-actions">
              <button type="button" className="admin-tips-btn admin-tips-btn--ghost" onClick={expandFiltered}>
                Tout ouvrir
              </button>
              <button type="button" className="admin-tips-btn admin-tips-btn--ghost" onClick={collapseAll}>
                Tout fermer
              </button>
            </div>
          </div>
        </div>

        <div className="admin-tips-filters" role="tablist" aria-label="Filtrer par catégorie">
          <button
            type="button"
            role="tab"
            aria-selected={category === "all"}
            className={`admin-tips-chip ${category === "all" ? "admin-tips-chip--active" : ""}`}
            onClick={() => setCategory("all")}
          >
            Tout
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={category === cat}
              className={`admin-tips-chip ${category === cat ? "admin-tips-chip--active" : ""}`}
              onClick={() => setCategory(cat)}
            >
              {CATEGORY_LABELS[cat] || cat}
            </button>
          ))}
        </div>

        {filteredTips.length === 0 ? (
          <p className="admin-tips-empty">
            <i className="fa-solid fa-magnifying-glass" aria-hidden />
            Aucun conseil ne correspond à votre recherche. Essayez un autre mot-clé ou réinitialisez le filtre.
          </p>
        ) : (
          <div className="admin-tips-list">
            {filteredTips.map((tip, index) => {
              const open = openIds.has(tip.id);
              return (
                <div
                  key={tip.id}
                  className={`admin-tips-item ${open ? "admin-tips-item--open" : ""}`}
                >
                  <button
                    type="button"
                    className="admin-tips-item-head"
                    onClick={() => toggleId(tip.id)}
                    aria-expanded={open}
                    id={`admin-tip-head-${tip.id}`}
                    aria-controls={`admin-tip-panel-${tip.id}`}
                  >
                    <span className="admin-tips-item-index">{index + 1}</span>
                    <i className={`${tipIconClass(tip.icon)} admin-tips-item-icon`} aria-hidden />
                    <span className="admin-tips-item-title">{tip.title}</span>
                    <span className="admin-tips-item-tag">{CATEGORY_LABELS[tip.category] || tip.category}</span>
                    <i className={`fa-solid fa-chevron-down admin-tips-chevron`} aria-hidden />
                  </button>
                  <div
                    id={`admin-tip-panel-${tip.id}`}
                    role="region"
                    aria-labelledby={`admin-tip-head-${tip.id}`}
                    className="admin-tips-item-panel"
                    hidden={!open}
                  >
                    <div className="admin-tips-item-body">{tip.content}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        .admin-tips-card {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(139, 92, 246, 0.22);
          box-shadow: 0 4px 32px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.06);
        }
        .admin-tips-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, var(--primary, #7c3aed), var(--primary-2, #a855f7), rgba(34, 197, 94, 0.7));
          opacity: 0.95;
          pointer-events: none;
        }
        .admin-tips-hero {
          display: flex;
          align-items: flex-start;
          gap: 1.1rem;
          margin-bottom: 1.5rem;
          padding-top: 0.35rem;
        }
        .admin-tips-hero-icon {
          flex-shrink: 0;
          width: 52px;
          height: 52px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.35rem;
          color: #faf5ff;
          background: linear-gradient(145deg, rgba(124, 58, 237, 0.45), rgba(15, 23, 42, 0.6));
          border: 1px solid rgba(167, 139, 250, 0.35);
          box-shadow: 0 8px 24px rgba(88, 28, 135, 0.25);
        }
        .admin-tips-hero-text { min-width: 0; flex: 1; }
        .admin-tips-title {
          margin: 0 0 0.35rem;
          letter-spacing: -0.02em;
          font-size: 1.4rem;
        }
        .admin-tips-subtitle {
          margin: 0;
          opacity: 0.88;
          font-size: 0.95rem;
          line-height: 1.55;
        }
        .admin-tips-toolbar {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        @media (min-width: 640px) {
          .admin-tips-toolbar {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }
        }
        .admin-tips-search-wrap {
          position: relative;
          flex: 1;
          max-width: 420px;
        }
        .admin-tips-search-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          opacity: 0.45;
          font-size: 0.9rem;
          pointer-events: none;
        }
        .admin-tips-search {
          width: 100%;
          padding: 0.72rem 1rem 0.72rem 2.5rem;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(6, 10, 22, 0.55);
          color: inherit;
          font-size: 0.95rem;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
        }
        .admin-tips-search::placeholder { color: rgba(255, 255, 255, 0.35); }
        .admin-tips-search:focus {
          border-color: rgba(167, 139, 250, 0.55);
          box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.22);
          background: rgba(8, 12, 28, 0.65);
        }
        .admin-tips-meta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.75rem;
        }
        .admin-tips-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.45rem 0.85rem;
          border-radius: 999px;
          font-size: 0.8rem;
          font-weight: 600;
          background: rgba(124, 58, 237, 0.14);
          border: 1px solid rgba(167, 139, 250, 0.28);
          color: #e9d5ff;
        }
        .admin-tips-actions { display: flex; gap: 0.35rem; flex-wrap: wrap; }
        .admin-tips-btn {
          padding: 0.45rem 0.75rem;
          border-radius: 10px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid transparent;
          transition: background 0.2s, border-color 0.2s, color 0.2s;
        }
        .admin-tips-btn--ghost {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.12);
          color: rgba(255, 255, 255, 0.85);
        }
        .admin-tips-btn--ghost:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.18);
        }
        .admin-tips-filters {
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem;
          margin-bottom: 1.25rem;
        }
        .admin-tips-chip {
          padding: 0.4rem 0.85rem;
          border-radius: 999px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.04);
          color: rgba(255, 255, 255, 0.75);
          transition: background 0.2s, border-color 0.2s, color 0.2s, transform 0.15s;
        }
        .admin-tips-chip:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
        }
        .admin-tips-chip--active {
          background: linear-gradient(135deg, rgba(124, 58, 237, 0.35), rgba(88, 28, 135, 0.25));
          border-color: rgba(167, 139, 250, 0.45);
          color: #faf5ff;
        }
        .admin-tips-empty {
          margin: 1rem 0 0;
          padding: 1.25rem 1rem;
          text-align: center;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px dashed rgba(255, 255, 255, 0.12);
          color: rgba(255, 255, 255, 0.65);
          font-size: 0.95rem;
          line-height: 1.5;
        }
        .admin-tips-empty .fa-magnifying-glass { margin-right: 0.5rem; opacity: 0.6; }
        .admin-tips-list { display: flex; flex-direction: column; gap: 0.6rem; }
        .admin-tips-item {
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 14px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.02);
          transition: border-color 0.25s, box-shadow 0.25s, background 0.25s;
        }
        .admin-tips-item--open {
          border-color: rgba(167, 139, 250, 0.35);
          background: rgba(124, 58, 237, 0.06);
          box-shadow: 0 8px 28px rgba(15, 23, 42, 0.4);
        }
        .admin-tips-item-head {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.65rem;
          padding: 0.95rem 1.1rem;
          background: transparent;
          border: none;
          color: inherit;
          font-size: 0.98rem;
          font-weight: 600;
          text-align: left;
          cursor: pointer;
          transition: background 0.2s;
        }
        .admin-tips-item-head:hover { background: rgba(255, 255, 255, 0.04); }
        .admin-tips-item-head:focus-visible {
          outline: 2px solid rgba(167, 139, 250, 0.8);
          outline-offset: 2px;
        }
        .admin-tips-item-index {
          flex-shrink: 0;
          width: 1.65rem;
          height: 1.65rem;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.72rem;
          font-weight: 700;
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.65);
        }
        .admin-tips-item--open .admin-tips-item-index {
          background: rgba(124, 58, 237, 0.35);
          color: #f5f3ff;
        }
        .admin-tips-item-icon {
          flex-shrink: 0;
          color: var(--admin-accent, #a78bfa);
          opacity: 0.95;
          width: 1.1rem;
          text-align: center;
        }
        .admin-tips-item-title { flex: 1; min-width: 0; line-height: 1.35; }
        .admin-tips-item-tag {
          flex-shrink: 0;
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 0.2rem 0.5rem;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.55);
        }
        .admin-tips-item--open .admin-tips-item-tag {
          background: rgba(124, 58, 237, 0.2);
          color: #ddd6fe;
        }
        .admin-tips-chevron {
          flex-shrink: 0;
          margin-left: 0.25rem;
          opacity: 0.55;
          font-size: 0.8rem;
          transition: transform 0.25s ease, opacity 0.2s;
        }
        .admin-tips-item--open .admin-tips-chevron {
          transform: rotate(180deg);
          opacity: 0.9;
        }
        .admin-tips-item-panel {
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          animation: admin-tips-panel-in 0.22s ease;
        }
        @keyframes admin-tips-panel-in {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .admin-tips-item-body { padding: 1rem 1.15rem 1.15rem 1.15rem; }
        .admin-tips-item-body p {
          margin: 0;
          padding: 0.5rem 0 0;
          line-height: 1.6;
          opacity: 0.92;
          font-size: 0.94rem;
        }
        .admin-tips-item-body p:first-child { padding-top: 0; }
        .admin-tips-item-body code {
          background: rgba(255, 255, 255, 0.1);
          padding: 0.15rem 0.45rem;
          border-radius: 5px;
          font-size: 0.88em;
        }
        .admin-tips-inline-icon {
          margin-right: 0.4rem;
          opacity: 0.85;
          color: rgba(196, 181, 253, 0.95);
        }
      `}</style>
    </div>
  );
}
