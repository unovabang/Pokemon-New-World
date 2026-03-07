import { useState } from "react";

const TIPS = [
  {
    id: "autosave-pokedex",
    icon: "fa-book-open",
    title: "Sauvegarde automatique (Pokédex)",
    content: "Les modifications du Pokédex sont enregistrées automatiquement environ 1,5 seconde après votre dernier changement. Vous n’avez pas besoin de cliquer sur « Sauvegarder ». Un message « Sauvegardé automatiquement » confirme l’enregistrement. Le bouton « Sauvegarder maintenant » permet de forcer une sauvegarde immédiate si besoin.",
  },
  {
    id: "data-persist",
    icon: "fa-database",
    title: "Où sont stockées les données ?",
    content: "En production, les fichiers de configuration (Pokédex, Guide, Extradex, BST, actualités, etc.) sont enregistrés sur un volume persistant. Les changements ne sont pas perdus lors d’un redéploiement. Ils sont aussi synchronisés vers le dépôt Git lorsque l’option est activée.",
  },
  {
    id: "images-urls",
    icon: "fa-image",
    title: "Images : privilégier les liens web",
    content: "Pour le Guide (cartes, sprites de personnages) et les fonds d’écran, vous pouvez utiliser des URLs complètes (https://...) au lieu d’uploader des fichiers. Collez simplement le lien dans le champ prévu.",
  },
  {
    id: "news-banners",
    icon: "fa-newspaper",
    title: "Bannières actualités",
    content: "Les bannières sont uploadées via l’onglet Actualités et stockées sur le serveur. Vous pouvez les réordonner par glisser-déposer et les renommer. Format recommandé : JPG, PNG ou WebP, 5 Mo max par image.",
  },
  {
    id: "guide-steps",
    icon: "fa-route",
    title: "Guide : étapes et personnages",
    content: "Chaque étape peut avoir une image (carte) et une liste de personnages avec nom, description et image (sprite). Utilisez des URLs d’images pour éviter de gérer des fichiers. Pensez à sauvegarder le Guide après vos modifications.",
  },
  {
    id: "bst-fakemon",
    icon: "fa-chart-line",
    title: "BST et Abilities",
    content: "L’éditeur BST permet de gérer les Fakemon, Mégas et Pokémon spéciaux avec leurs stats et capacités. Les données sont sauvegardées dans bst.json. Pensez à cliquer sur « Sauvegarder » après vos changements.",
  },
  {
    id: "logs",
    icon: "fa-list-alt",
    title: "Logs de connexion",
    content: "L’onglet « Logs de connexion » affiche les tentatives de connexion à l’admin (date, email, IP, succès ou échec). Utile pour surveiller les accès.",
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
          Quelques rappels et astuces pour utiliser le panneau d’administration.
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
                <p>{tip.content}</p>
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
        .admin-tips-item:not(.admin-tips-item--open) .admin-tips-item-body { display: none; }
      `}</style>
    </div>
  );
}
