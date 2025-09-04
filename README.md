
# 🌟 Pokémon New World - Site Officiel

Site web officiel du fangame **Pokémon New World**, développé avec React et Vite pour une expérience utilisateur moderne et rapide.

## 📖 À propos du projet

Pokémon New World est un fangame Pokémon qui vous emmène dans la région de **Bélamie**, avec de nouveaux types **Aspic & Malice**, des mécaniques innovantes et une histoire captivante. Ce site présente le jeu, ses fonctionnalités et permet le téléchargement.

## 🚀 Démarrage rapide

### Prérequis
- Node.js 18+ 
- npm ou yarn

### Installation et lancement
```bash
# Cloner le projet
git clone [URL_DU_REPO]

# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev
```

Le site sera accessible à l'adresse : `http://localhost:5000`

### Scripts disponibles
- `npm run dev` - Lance le serveur de développement
- `npm run build` - Compile le projet pour la production
- `npm run preview` - Prévisualise la version compilée

## 🏗️ Architecture du projet

```
src/
├── components/          # Composants React réutilisables
│   ├── HeroVideo.jsx    # Lecteur vidéo principal
│   ├── Carousel.jsx     # Carrousel d'images
│   ├── Modal.jsx        # Fenêtres modales
│   ├── NewsBanner.jsx   # Bannières d'actualités
│   └── YouTubeAudio.jsx # Lecteur audio YouTube
├── config/              # Fichiers de configuration JSON
│   ├── site.json        # Configuration générale du site
│   ├── sections.json    # Contenu des sections
│   ├── news.json        # Configuration des actualités
│   ├── downloads.json   # Liens de téléchargement
│   ├── patchnotes.json  # Notes de patch
│   ├── patreon.json     # Configuration Patreon
│   ├── footer.json      # Configuration du footer
│   └── external.json    # Liens externes
├── App.jsx              # Composant principal
├── main.jsx             # Point d'entrée React
└── styles.css           # Styles globaux
```

## ⚙️ Configuration

### Métadonnées SEO (`src/config/site.json`)
```json
{
  "seo": {
    "title": "Pokémon New World • Site officiel",
    "description": "Site officiel du fangame Pokémon New World...",
    "keywords": ["pokemon", "fangame", "new world", "belamie"]
  }
}
```

### Notes de patch (`src/config/patchnotes.json`)
Pour ajouter une nouvelle version :
1. Modifiez la `version` (ex: "0.7")
2. Ajoutez l'image `PATCHNOTE07.png` dans `/public/`
3. Mettez à jour le contenu des sections

### Actualités (`src/config/news.json`)
Gérez les bannières d'actualités avec rotation automatique.

## 🎨 Personnalisation

### Couleurs et thème
Les styles sont centralisés dans `src/styles.css` avec des variables CSS personnalisables.

### Images
- Logo : `/public/logo.png`
- Favicon : `/public/favicon.svg` 
- Images de patch : `/public/PATCHNOTE{VERSION}.png`
- Bannières news : `/news-images/`

### Vidéos
Configurez l'ID YouTube dans `site.json` :
```json
{
  "heroVideo": {
    "youtubeId": "VOTRE_VIDEO_ID"
  }
}
```

## 🚀 Déploiement sur Replit

Ce projet est optimisé pour Replit :

1. **Développement** : Cliquez sur "Run" pour lancer le serveur
2. **Production** : Le déploiement se fait automatiquement via la configuration `.replit`

### Configuration de déploiement
- Build : `npm run build`
- Dossier public : `dist/`
- Port : `5000`

## 🔧 Fonctionnalités

### ✅ Implémentées
- 📱 Design responsive (mobile/desktop)
- 🎥 Lecteur vidéo YouTube intégré
- 🎵 Audio d'ambiance optionnel
- 📰 Système d'actualités avec bannières
- 📋 Notes de patch avec modal dédié
- 💰 Intégration Patreon
- 🔗 Liens de téléchargement dynamiques
- 📊 Métadonnées Open Graph pour réseaux sociaux

### 🎯 SEO & Performance
- Métadonnées dynamiques
- Images optimisées
- Chargement rapide avec Vite
- Support PWA-ready

## 🤝 Contribution

### Structure des commits
```
feat: nouvelle fonctionnalité
fix: correction de bug
docs: documentation
style: mise en forme
refactor: refactoring
```

### Guidelines
1. Respecter la structure de fichiers existante
2. Utiliser les configurations JSON pour le contenu
3. Tester la responsivité mobile/desktop
4. Vérifier les métadonnées Open Graph

## 📱 Compatibilité

- ✅ Chrome/Chromium 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobiles iOS/Android

## 🐛 Résolution de problèmes

### Erreur de parsing JSON
Vérifiez la syntaxe des fichiers dans `src/config/`

### Vidéo YouTube ne charge pas
Vérifiez l'ID YouTube dans `site.json`

### Images manquantes
Assurez-vous que les images sont dans `/public/`

## 📄 Licence

Ce projet est un fangame non commercial. Pokémon appartient à Nintendo/Creatures/GAME FREAK.

## 📞 Contact & Support

- Discord : [Lien vers votre Discord]
- Patreon : [Lien vers votre Patreon]
- Issues : Utilisez le système d'issues de ce repository

---

**⭐ N'hésitez pas à donner une étoile si ce projet vous plaît !**
