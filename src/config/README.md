# Configuration

Les fichiers `*.json` dans ce dossier sont **exclus du versioning** pour éviter d’écraser les modifications faites via l’admin en production.

- **`*.example.json`** : templates versionnés (valeurs par défaut)
- **`*.json`** : config réelle, créée automatiquement au `npm install` si absente

## En production

**Avant le premier `git pull` après cette mise à jour** : sauvegardez vos fichiers `*.json` (pokedex, extradex, etc.) si vous avez des modifications.

Après le pull, les fichiers seront recréés depuis les templates. Restaurez votre sauvegarde si nécessaire.
