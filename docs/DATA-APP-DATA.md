# Données d'enregistrement et `/app/data`

Vérification : toutes les données enregistrées par l’admin / l’API sont bien stockées sous le volume **`/app/data`** (CONFIG_DIR et NEWS_IMAGES_DIR).

---

## ✅ `/app/data/config/` (CONFIG_DIR)

| Donnée | Fichier | Route / usage | Enregistrement dans /app/data |
|--------|---------|----------------|-------------------------------|
| Pokédex | `pokedex.json` | PUT /api/pokedex | ✅ `CONFIG_DIR` (pokedexPath) |
| Guide | `guide.json` | PUT /api/guide | ✅ `CONFIG_DIR` (guidePath) |
| Extradex | `extradex.json` | PUT /api/extradex | ✅ `CONFIG_DIR` (extradexPath) |
| BST (fakemon, megas, speciaux) | `bst.json` | PUT /api/bst → saveConfig() | ✅ `CONFIG_DIR` + repo (dual-write) |
| Config générique | `*.json` (nom dynamique) | POST /api/config/:name → saveConfig() | ✅ `CONFIG_DIR` + repo (dual-write) |
| Téléchargements | `downloads.json` | PUT /api/downloads → saveConfig() | ✅ `CONFIG_DIR` + repo |
| Patchnotes FR | `patchnotes.json` | GET/POST/PUT/DELETE /api/patchnotes | ✅ `CONFIG_DIR` (patchnotesPath) |
| Patchnotes EN | `patchnotes-en.json` | idem avec `?lang=en` | ✅ `CONFIG_DIR` (patchnotesPath) |

**Lecture** : getConfig(), GET /api/config/:name, GET /api/pokedex, /api/guide, /api/extradex, /api/bst, /api/dex, etc. utilisent tous `CONFIG_DIR` (donc `/app/data/config`).

---

## ✅ `/app/data/news-images/` (NEWS_IMAGES_DIR)

| Donnée | Usage | Enregistrement dans /app/data |
|--------|--------|-------------------------------|
| Bannières news | Upload, liste, renommage, réordre | ✅ Multer → `NEWS_IMAGES_DIR`, tous les chemins (filePath, oldPath, newPath, tempPath pour échange) utilisent `NEWS_IMAGES_DIR` |

Fichiers typiques : `banniere1.png`, `banniere2.png`, …

---

## ⚠️ Hors `/app/data` (volontaire ou temporaire)

| Élément | Chemin | Remarque |
|--------|--------|----------|
| Dossier temporaire (réordre bannières) | `../temp-banners` (relatif au serveur) | Temporaire pendant le réordre ; pas une donnée persistante. |

---

## Résumé

- **Config JSON** : tout passe par `CONFIG_DIR` = `/app/data/config` ✅  
- **Images news** : tout passe par `NEWS_IMAGES_DIR` = `/app/data/news-images` ✅  
- Aucune autre donnée d’enregistrement n’est écrite en dehors de `/app/data`.
