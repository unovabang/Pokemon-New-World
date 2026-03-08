import { useState } from "react";

const TIPS = [
  {
    id: "domain-login",
    icon: "fa-globe",
    title: "Connexion sur le site officiel",
    content: (
      <p>
        <i className="fa-solid fa-link" style={{ marginRight: "0.35rem", opacity: 0.9 }} aria-hidden />
        Le site officiel est <strong>https://www.pokemonnewworld.fr</strong>. Si vous ne parvenez plus à accéder à l’admin après un changement de domaine, allez sur{" "}
        <strong>/admin-login</strong> sur le nouveau site et reconnectez-vous avec vos identifiants. <em>Le token de session est stocké par origine (domaine), donc une reconnexion est nécessaire une seule fois.</em>
      </p>
    ),
  },
  {
    id: "autosave-pokedex",
    icon: "fa-book-open",
    title: "Sauvegarde automatique (Pokédex)",
    content: (
      <p>
        <i className="fa-solid fa-floppy-disk" style={{ marginRight: "0.35rem", opacity: 0.9 }} aria-hidden />
        Les modifications du <strong>Pokédex</strong> sont enregistrées <em>automatiquement</em> environ 1,5 seconde après votre dernier changement. Vous n’avez pas besoin de cliquer sur « Sauvegarder ». Un message <strong>« Sauvegardé automatiquement »</strong> confirme l’enregistrement. Le bouton <strong>« Sauvegarder maintenant »</strong> permet de forcer une sauvegarde immédiate si besoin.
      </p>
    ),
  },
  {
    id: "data-persist",
    icon: "fa-database",
    title: "Où sont stockées les données ?",
    content: (
      <p>
        <i className="fa-solid fa-server" style={{ marginRight: "0.35rem", opacity: 0.9 }} aria-hidden />
        En production, les fichiers de configuration (<strong>Pokédex, Guide, Extradex, BST, actualités</strong>, etc.) sont enregistrés sur un <strong>volume persistant</strong>. Les changements ne sont pas perdus lors d’un redéploiement. Ils sont aussi synchronisés vers le dépôt Git lorsque l’option est activée.
      </p>
    ),
  },
  {
    id: "images-urls",
    icon: "fa-image",
    title: "Images : privilégier les liens web",
    content: (
      <p>
        <i className="fa-solid fa-link" style={{ marginRight: "0.35rem", opacity: 0.9 }} aria-hidden />
        Pour le <strong>Guide</strong> (cartes, sprites de personnages) et les fonds d’écran, vous pouvez utiliser des <strong>URLs complètes</strong> (<code>https://...</code>) au lieu d’uploader des fichiers. <em>Collez simplement le lien dans le champ prévu.</em>
      </p>
    ),
  },
  {
    id: "news-banners",
    icon: "fa-newspaper",
    title: "Bannières d’actualités",
    content: (
      <>
        <p>
          <i className="fa-solid fa-images" style={{ marginRight: "0.35rem", opacity: 0.9 }} aria-hidden />
          Les bannières se gèrent via l’onglet <strong>Actualités</strong> : ajoutez des <strong>URLs d’images</strong> (hébergement externe), réordonnez-les avec les flèches, supprimez si besoin.
        </p>
        <p style={{ marginTop: "0.75rem", marginBottom: 0 }}>
          <i className="fa-solid fa-ruler-vertical" style={{ marginRight: "0.35rem", opacity: 0.9 }} aria-hidden />
          <strong>Hauteur max des bannières</strong> : vous pouvez définir une <em>hauteur max en pixels</em> (entre 150 et 1200). Les images seront <strong>rognées</strong> à cette hauteur sur le site. <strong>Intervalle de rotation</strong> : réglez le délai (en ms) entre chaque bannière.
        </p>
      </>
    ),
  },
  {
    id: "guide-steps",
    icon: "fa-route",
    title: "Guide : étapes et personnages",
    content: (
      <p>
        <i className="fa-solid fa-layer-group" style={{ marginRight: "0.35rem", opacity: 0.9 }} aria-hidden />
        Chaque étape peut avoir une <strong>image (carte)</strong> et une liste de <strong>personnages</strong> avec nom, description et image (sprite). Utilisez des <em>URLs d’images</em> pour éviter de gérer des fichiers. Pensez à <strong>sauvegarder le Guide</strong> après vos modifications.
      </p>
    ),
  },
  {
    id: "extradex",
    icon: "fa-star",
    title: "Extradex",
    content: (
      <p>
        <i className="fa-solid fa-wand-magic-sparkles" style={{ marginRight: "0.35rem", opacity: 0.9 }} aria-hidden />
        Comme le Pokédex et le BST, l’<strong>Extradex</strong> est sauvegardé <em>automatiquement</em> environ 1,5 seconde après chaque modification (titre, fond, types personnalisés, ajout/édition/suppression d’entrées). Le bouton <strong>« Sauvegarder maintenant »</strong> permet de forcer une sauvegarde immédiate.
      </p>
    ),
  },
  {
    id: "bst-fakemon",
    icon: "fa-chart-line",
    title: "BST et Abilities",
    content: (
      <p>
        <i className="fa-solid fa-dragon" style={{ marginRight: "0.35rem", opacity: 0.9 }} aria-hidden />
        L’éditeur <strong>BST</strong> permet de gérer les <em>Fakemon, Mégas et Pokémon spéciaux</em> avec leurs stats et capacités. Les modifications sont enregistrées <strong>automatiquement</strong> environ 1,5 seconde après un ajout, une modification ou une suppression. Le bouton <strong>« Sauvegarder maintenant »</strong> permet de forcer une sauvegarde immédiate.
      </p>
    ),
  },
  {
    id: "logs",
    icon: "fa-list-alt",
    title: "Logs de connexion",
    content: (
      <p>
        <i className="fa-solid fa-shield-halved" style={{ marginRight: "0.35rem", opacity: 0.9 }} aria-hidden />
        L’onglet <strong>« Logs de connexion »</strong> affiche les <em>tentatives de connexion</em> à l’admin (date, email, IP, succès ou échec). <strong>Utile pour surveiller les accès</strong> et repérer d’éventuelles tentatives non autorisées.
      </p>
    ),
  },
];

export default function AdminTips() {
  const [openId, setOpenId] = useState(TIPS[0]?.id ?? null);

  return (
    <div className="admin-tips">
      <div className="admin-panel-card">
        <h2 className="admin-panel-card-title">
          <i className="fa-solid fa-lightbulb" aria-hidden /> Conseils pour les administrateurs
        </h2>
        <p style={{ marginBottom: "1.5rem", opacity: 0.9, fontSize: "0.95rem" }}>
          <em>Quelques rappels et astuces pour utiliser le panneau d’administration.</em>
        </p>

        <div className="admin-tips-list">
          {TIPS.map((tip) => (
            <div
              key={tip.id}
              className={`admin-tips-item ${openId === tip.id ? "admin-tips-item--open" : ""}`}
            >
              <button
                type="button"
                className="admin-tips-item-head"
                onClick={() => setOpenId(openId === tip.id ? null : tip.id)}
                aria-expanded={openId === tip.id}
              >
                <i className={`fa-solid ${tip.icon}`} aria-hidden />
                <span>{tip.title}</span>
                <i className={`fa-solid fa-chevron-${openId === tip.id ? "up" : "down"} admin-tips-chevron`} aria-hidden />
              </button>
              <div className="admin-tips-item-body">
                {tip.content}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .admin-tips-list { display: flex; flex-direction: column; gap: 0.5rem; }
        .admin-tips-item { border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; overflow: hidden; }
        .admin-tips-item-head {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 1.25rem;
          background: rgba(255,255,255,0.04);
          border: none;
          color: inherit;
          font-size: 1rem;
          font-weight: 600;
          text-align: left;
          cursor: pointer;
          transition: background 0.2s;
        }
        .admin-tips-item-head:hover { background: rgba(255,255,255,0.08); }
        .admin-tips-item-head .fa-solid:first-of-type { color: var(--admin-accent, #7c3aed); opacity: 0.95; }
        .admin-tips-chevron { margin-left: auto; opacity: 0.6; font-size: 0.85rem; }
        .admin-tips-item-body { padding: 0 1.25rem 1rem; }
        .admin-tips-item-body p { margin: 0; padding: 0.5rem 0 0; line-height: 1.55; opacity: 0.9; font-size: 0.95rem; }
        .admin-tips-item-body p:first-child { padding-top: 0.25rem; }
        .admin-tips-item-body code { background: rgba(255,255,255,0.1); padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.9em; }
        .admin-tips-item:not(.admin-tips-item--open) .admin-tips-item-body { display: none; }
      `}</style>
    </div>
  );
}
