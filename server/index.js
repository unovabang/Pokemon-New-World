import express from 'express';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb } from './db.js';
import authRoutes from './auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware (limite large pour PUT /api/pokedex et autres configs volumineuses — évolutif)
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));

// Auth & logs (login, /me, /logs)
app.use('/api/auth', authRoutes);

// Health check (pour Railway / load balancers)
app.get('/health', (req, res) => res.status(200).json({ ok: true }));

// Chemins vers les dossiers
const NEWS_IMAGES_DIR = path.join(__dirname, '../public/news-images');
const CONFIG_DIR = path.join(__dirname, '../src/config');

// Configuration multer pour l'upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Assurer que le dossier existe
    fs.ensureDirSync(NEWS_IMAGES_DIR);
    cb(null, NEWS_IMAGES_DIR);
  },
  filename: (req, file, cb) => {
    const position = req.body.position || getNextPosition();
    const extension = path.extname(file.originalname);
    cb(null, `banniere${position}.png`);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non supporté. Utilisez JPG, PNG ou WebP.'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  }
});

// Fonction pour obtenir la prochaine position disponible
function getNextPosition() {
  try {
    const files = fs.readdirSync(NEWS_IMAGES_DIR);
    const bannerFiles = files.filter(file => file.startsWith('banniere') && file.endsWith('.png'));
    
    const positions = bannerFiles.map(file => {
      const match = file.match(/banniere(\d+)\.png/);
      return match ? parseInt(match[1]) : 0;
    });
    
    for (let i = 1; i <= 10; i++) {
      if (!positions.includes(i)) {
        return i;
      }
    }
    
    return Math.max(...positions) + 1;
  } catch (error) {
    return 1;
  }
}

// Fonction pour lister les bannières existantes
function getBannerList() {
  try {
    fs.ensureDirSync(NEWS_IMAGES_DIR);
    const files = fs.readdirSync(NEWS_IMAGES_DIR);
    const bannerFiles = files.filter(file => file.startsWith('banniere') && file.endsWith('.png'));
    
    return bannerFiles.map(file => {
      const match = file.match(/banniere(\d+)\.png/);
      const position = match ? parseInt(match[1]) : 0;
      const stats = fs.statSync(path.join(NEWS_IMAGES_DIR, file));
      
      return {
        name: file,
        position,
        size: stats.size,
        created: stats.birthtime
      };
    }).sort((a, b) => a.position - b.position);
  } catch (error) {
    console.error('Erreur lors de la lecture des bannières:', error);
    return [];
  }
}

// API Routes

// GET /api/banners - Lister toutes les bannières
app.get('/api/banners', (req, res) => {
  try {
    const banners = getBannerList();
    res.json({ success: true, banners });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/banners/upload - Upload une nouvelle bannière
app.post('/api/banners/upload', upload.single('banner'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Aucun fichier fourni' });
    }

    const position = req.body.position || getNextPosition();
    
    res.json({ 
      success: true, 
      message: 'Bannière uploadée avec succès',
      banner: {
        name: req.file.filename,
        position: parseInt(position),
        size: req.file.size
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/banners/:filename - Supprimer une bannière
app.delete('/api/banners/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(NEWS_IMAGES_DIR, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Fichier non trouvé' });
    }
    
    fs.unlinkSync(filePath);
    
    res.json({ 
      success: true, 
      message: `Bannière ${filename} supprimée avec succès` 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/banners/reposition - Réorganiser les positions des bannières
app.put('/api/banners/reposition', (req, res) => {
  try {
    const { changes } = req.body; // { "banniere1.png": 3, "banniere2.png": 1 }
    
    if (!changes || typeof changes !== 'object') {
      return res.status(400).json({ success: false, error: 'Format de données invalide' });
    }
    
    // Créer un mapping temporaire pour éviter les conflits
    const tempDir = path.join(__dirname, '../temp-banners');
    fs.ensureDirSync(tempDir);
    
    // Déplacer tous les fichiers vers le dossier temporaire
    const banners = getBannerList();
    banners.forEach(banner => {
      const oldPath = path.join(NEWS_IMAGES_DIR, banner.name);
      const tempPath = path.join(tempDir, banner.name);
      if (fs.existsSync(oldPath)) {
        fs.moveSync(oldPath, tempPath);
      }
    });
    
    // Renommer et déplacer selon les nouvelles positions
    Object.entries(changes).forEach(([oldName, newPosition]) => {
      const tempPath = path.join(tempDir, oldName);
      const newName = `banniere${newPosition}.png`;
      const newPath = path.join(NEWS_IMAGES_DIR, newName);
      
      if (fs.existsSync(tempPath)) {
        fs.moveSync(tempPath, newPath);
      }
    });
    
    // Nettoyer le dossier temporaire
    fs.removeSync(tempDir);
    
    res.json({ 
      success: true, 
      message: 'Positions mises à jour avec succès',
      banners: getBannerList()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/banners/:filename/position - Changer la position d'une bannière spécifique
app.put('/api/banners/:filename/position', (req, res) => {
  try {
    const { filename } = req.params;
    const { position } = req.body;
    
    if (!position || position < 1 || position > 10) {
      return res.status(400).json({ success: false, error: 'Position invalide (1-10)' });
    }
    
    const oldPath = path.join(NEWS_IMAGES_DIR, filename);
    const newName = `banniere${position}.png`;
    const newPath = path.join(NEWS_IMAGES_DIR, newName);
    
    if (!fs.existsSync(oldPath)) {
      return res.status(404).json({ success: false, error: 'Fichier non trouvé' });
    }
    
    // Si c'est déjà à la bonne position, ne rien faire
    if (oldPath === newPath) {
      return res.json({ 
        success: true, 
        message: `${filename} est déjà à la position ${position}`,
        banners: getBannerList()
      });
    }
    
    // Si la nouvelle position est occupée, échanger les fichiers
    if (fs.existsSync(newPath)) {
      const tempPath = path.join(NEWS_IMAGES_DIR, `temp_${Date.now()}.png`);
      
      // Étape 1: Déplacer le fichier cible vers un nom temporaire
      fs.moveSync(newPath, tempPath);
      
      // Étape 2: Déplacer notre fichier vers la nouvelle position
      fs.moveSync(oldPath, newPath);
      
      // Étape 3: Trouver l'ancienne position et y déplacer le fichier temporaire
      const oldMatch = filename.match(/banniere(\d+)\.png/);
      if (oldMatch) {
        const oldPosition = oldMatch[1];
        const exchangePath = path.join(NEWS_IMAGES_DIR, `banniere${oldPosition}.png`);
        fs.moveSync(tempPath, exchangePath);
      } else {
        // Si on ne peut pas déterminer l'ancienne position, remettre le fichier
        fs.moveSync(tempPath, newPath);
        fs.moveSync(newPath, oldPath);
        throw new Error('Impossible de déterminer l\'ancienne position');
      }
    } else {
      // Position libre, simple déplacement
      fs.moveSync(oldPath, newPath);
    }
    
    res.json({ 
      success: true, 
      message: `Position de ${filename} changée vers ${position}`,
      banners: getBannerList()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Gestion des erreurs multer
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, error: 'Fichier trop volumineux (max 5MB)' });
    }
  }
  res.status(500).json({ success: false, error: error.message });
});

// === PATCH NOTES API ===

// GET /api/patchnotes et /api/patchnotes/:lang - Lister toutes les notes de patch (avec support multilingue)
app.get('/api/patchnotes', (req, res) => {
  req.params.lang = 'fr';
  handlePatchnotesGet(req, res);
});

app.get('/api/patchnotes/:lang', (req, res) => {
  handlePatchnotesGet(req, res);
});

function handlePatchnotesGet(req, res) {
  try {
    const lang = req.params.lang || 'fr';
    const filename = lang === 'en' ? 'patchnotes-en.json' : 'patchnotes.json';
    const patchnotesPath = path.join(CONFIG_DIR, filename);
    
    if (!fs.existsSync(patchnotesPath)) {
      // Créer un fichier vide s'il n'existe pas
      const defaultData = {
        versions: []
      };
      fs.writeJsonSync(patchnotesPath, defaultData, { spaces: 2 });
      return res.json({ success: true, patchnotes: defaultData });
    }
    
    let data = fs.readJsonSync(patchnotesPath);
    
    // Migration automatique de l'ancien format vers le nouveau
    if (data.version && data.date && data.content && !data.versions && data._documentation) {
      console.log('🔄 Migration automatique de l\'ancien format vers le nouveau format');
      
      const migratedData = {
        versions: [{
          version: data.version,
          date: data.date,
          sections: data.content.sections || []
        }]
      };
      
      // Sauvegarder le nouveau format
      fs.writeJsonSync(patchnotesPath, migratedData, { spaces: 2 });
      data = migratedData;
      
      console.log('✅ Migration terminée avec succès');
    }
    
    // S'assurer que le format est correct
    if (!data.versions) {
      data = { versions: [] };
    }
    
    res.json({ success: true, patchnotes: data });
  } catch (error) {
    console.error('❌ Erreur API /api/patchnotes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// POST /api/patchnotes/:lang/version - Ajouter une nouvelle version
app.post('/api/patchnotes/:lang/version', (req, res) => {
  try {
    const lang = req.params.lang || 'fr';
    const filename = lang === 'en' ? 'patchnotes-en.json' : 'patchnotes.json';
    const { version, date, sections } = req.body;
    
    if (!version || !date || !sections) {
      return res.status(400).json({ success: false, error: 'Version, date et sections requis' });
    }
    
    const patchnotesPath = path.join(CONFIG_DIR, filename);
    let data = { versions: [] };
    
    if (fs.existsSync(patchnotesPath)) {
      data = fs.readJsonSync(patchnotesPath);
    }
    
    // Vérifier si la version existe déjà
    const existingIndex = data.versions.findIndex(v => v.version === version);
    if (existingIndex !== -1) {
      return res.status(400).json({ success: false, error: 'Cette version existe déjà' });
    }
    
    // Ajouter la nouvelle version
    const newVersion = {
      version,
      date,
      sections: sections || []
    };
    
    data.versions.unshift(newVersion); // Ajouter en premier (plus récent)
    
    fs.writeJsonSync(patchnotesPath, data, { spaces: 2 });
    
    res.json({ 
      success: true, 
      message: `Version ${version} ajoutée avec succès`,
      patchnotes: data 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/patchnotes/:lang/version/:version - Modifier une version
app.put('/api/patchnotes/:lang/version/:version', (req, res) => {
  try {
    const lang = req.params.lang || 'fr';
    const filename = lang === 'en' ? 'patchnotes-en.json' : 'patchnotes.json';
    const { version } = req.params;
    const { date, sections } = req.body;
    
    const patchnotesPath = path.join(CONFIG_DIR, filename);
    
    if (!fs.existsSync(patchnotesPath)) {
      return res.status(404).json({ success: false, error: 'Fichier de notes de patch non trouvé' });
    }
    
    const data = fs.readJsonSync(patchnotesPath);
    const versionIndex = data.versions.findIndex(v => v.version === version);
    
    if (versionIndex === -1) {
      return res.status(404).json({ success: false, error: 'Version non trouvée' });
    }
    
    // Mettre à jour la version
    if (date) data.versions[versionIndex].date = date;
    if (sections) data.versions[versionIndex].sections = sections;
    
    fs.writeJsonSync(patchnotesPath, data, { spaces: 2 });
    
    res.json({ 
      success: true, 
      message: `Version ${version} mise à jour`,
      patchnotes: data 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/patchnotes/:lang/version/:version - Supprimer une version
app.delete('/api/patchnotes/:lang/version/:version', (req, res) => {
  try {
    const lang = req.params.lang || 'fr';
    const filename = lang === 'en' ? 'patchnotes-en.json' : 'patchnotes.json';
    const { version } = req.params;
    
    const patchnotesPath = path.join(CONFIG_DIR, filename);
    
    if (!fs.existsSync(patchnotesPath)) {
      return res.status(404).json({ success: false, error: 'Fichier de notes de patch non trouvé' });
    }
    
    const data = fs.readJsonSync(patchnotesPath);
    const initialLength = data.versions.length;
    
    data.versions = data.versions.filter(v => v.version !== version);
    
    if (data.versions.length === initialLength) {
      return res.status(404).json({ success: false, error: 'Version non trouvée' });
    }
    
    fs.writeJsonSync(patchnotesPath, data, { spaces: 2 });
    
    res.json({ 
      success: true, 
      message: `Version ${version} supprimée`,
      patchnotes: data 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/patchnotes/version/:version/section - Ajouter une section à une version
app.post('/api/patchnotes/version/:version/section', (req, res) => {
  try {
    const { version } = req.params;
    const { title, items } = req.body;
    
    if (!title || !items) {
      return res.status(400).json({ success: false, error: 'Titre et éléments requis' });
    }
    
    const patchnotesPath = path.join(CONFIG_DIR, 'patchnotes.json');
    
    if (!fs.existsSync(patchnotesPath)) {
      return res.status(404).json({ success: false, error: 'Fichier de notes de patch non trouvé' });
    }
    
    const data = fs.readJsonSync(patchnotesPath);
    const versionIndex = data.versions.findIndex(v => v.version === version);
    
    if (versionIndex === -1) {
      return res.status(404).json({ success: false, error: 'Version non trouvée' });
    }
    
    const newSection = { title, items };
    data.versions[versionIndex].sections.push(newSection);
    
    fs.writeJsonSync(patchnotesPath, data, { spaces: 2 });
    
    res.json({ 
      success: true, 
      message: `Section "${title}" ajoutée à la version ${version}`,
      patchnotes: data 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// === CONFIGURATIONS GÉNÉRALES API ===
// Fonction générique pour gérer les configurations JSON
const getConfig = (configName) => {
  const configPath = path.join(CONFIG_DIR, `${configName}.json`);
  if (!fs.existsSync(configPath)) {
    return null;
  }
  try {
    return fs.readJsonSync(configPath);
  } catch (error) {
    console.error(`❌ Erreur lecture ${configName}:`, error);
    return null;
  }
};

const saveConfig = (configName, data) => {
  const configPath = path.join(CONFIG_DIR, `${configName}.json`);
  try {
    fs.writeJsonSync(configPath, data, { spaces: 2 });
    return true;
  } catch (error) {
    console.error(`❌ Erreur sauvegarde ${configName}:`, error);
    return false;
  }
};

// GET /api/config/:name - Lire une configuration
app.get('/api/config/:name', (req, res) => {
  try {
    const { name } = req.params;
    const configData = getConfig(name);
    
    if (!configData) {
      return res.status(404).json({ success: false, error: `Configuration ${name} non trouvée` });
    }
    
    res.json({ success: true, config: configData });
  } catch (error) {
    console.error(`❌ Erreur API /api/config/${req.params.name}:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/config/:name - Sauvegarder une configuration
app.post('/api/config/:name', (req, res) => {
  try {
    const { name } = req.params;
    const { config } = req.body;
    
    if (!config) {
      return res.status(400).json({ success: false, error: 'Données de configuration manquantes' });
    }
    
    const success = saveConfig(name, config);
    
    if (!success) {
      return res.status(500).json({ success: false, error: 'Erreur lors de la sauvegarde' });
    }
    
    res.json({ 
      success: true, 
      message: `Configuration ${name} sauvegardée avec succès`,
      config: config 
    });
  } catch (error) {
    console.error(`❌ Erreur API /api/config/${req.params.name}:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API spécifique pour les téléchargements
app.get('/api/downloads', (req, res) => {
  try {
    const downloadsData = getConfig('downloads');
    res.json({ success: true, downloads: downloadsData || {} });
  } catch (error) {
    console.error('❌ Erreur API /api/downloads:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/downloads', (req, res) => {
  try {
    const { downloads } = req.body;
    const success = saveConfig('downloads', downloads);
    
    if (!success) {
      return res.status(500).json({ success: false, error: 'Erreur lors de la sauvegarde' });
    }
    
    res.json({ 
      success: true, 
      message: 'Téléchargements sauvegardés avec succès',
      downloads: downloads 
    });
  } catch (error) {
    console.error('❌ Erreur API /api/downloads:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// === POKÉDEX API ===
// GET /api/pokedex - Lire le Pokédex (entries + background + customTypes)
app.get('/api/pokedex', (req, res) => {
  try {
    const pokedexData = getConfig('pokedex');
    if (!pokedexData) {
      return res.status(404).json({ success: false, error: 'Fichier Pokédex non trouvé' });
    }
    res.json({
      success: true,
      pokedex: {
        source: pokedexData.source,
        updated: pokedexData.updated,
        entries: Array.isArray(pokedexData.entries) ? pokedexData.entries : [],
        background: pokedexData.background || null,
        customTypes: Array.isArray(pokedexData.customTypes) ? pokedexData.customTypes : []
      }
    });
  } catch (error) {
    console.error('❌ Erreur API /api/pokedex:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/pokedex - Sauvegarder le Pokédex (écrit dans pokedex.json)
app.put('/api/pokedex', (req, res) => {
  try {
    const { entries, background, customTypes } = req.body;
    const pokedexPath = path.join(CONFIG_DIR, 'pokedex.json');

    let current = { source: '', updated: '', entries: [] };
    if (fs.existsSync(pokedexPath)) {
      current = fs.readJsonSync(pokedexPath);
    }
    if (!Array.isArray(current.entries)) {
      current.entries = [];
    }

    const updated = {
      source: current.source || 'https://pokemon-new-world-fr.fandom.com/fr/wiki/Pok%C3%A9dex',
      updated: new Date().toISOString().slice(0, 10),
      entries: Array.isArray(entries) ? entries : current.entries,
      ...(background !== undefined && { background: background || null }),
      ...(customTypes !== undefined && { customTypes: Array.isArray(customTypes) ? customTypes : [] })
    };

    // Si on n'a pas envoyé background/customTypes, garder les anciennes valeurs
    if (background === undefined && current.background !== undefined) updated.background = current.background;
    if (customTypes === undefined && current.customTypes !== undefined) updated.customTypes = current.customTypes;

    fs.writeJsonSync(pokedexPath, updated, { spaces: 2 });

    res.json({
      success: true,
      message: 'Pokédex sauvegardé dans le fichier JSON.',
      pokedex: updated
    });
  } catch (error) {
    console.error('❌ Erreur API PUT /api/pokedex:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// === EXTRADEX API ===
// GET /api/extradex - Lire l'Extradex (title + entries)
app.get('/api/extradex', (req, res) => {
  try {
    const extradexData = getConfig('extradex');
    if (!extradexData) {
      return res.status(404).json({ success: false, error: 'Fichier Extradex non trouvé' });
    }
    res.json({
      success: true,
      extradex: {
        title: extradexData.title || 'Extradex',
        entries: Array.isArray(extradexData.entries) ? extradexData.entries : []
      }
    });
  } catch (error) {
    console.error('❌ Erreur API /api/extradex:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/extradex - Sauvegarder l'Extradex (écrit dans extradex.json)
app.put('/api/extradex', (req, res) => {
  try {
    const { title, entries } = req.body;
    const extradexPath = path.join(CONFIG_DIR, 'extradex.json');

    let current = { title: 'Extradex', entries: [] };
    if (fs.existsSync(extradexPath)) {
      current = fs.readJsonSync(extradexPath);
    }
    if (!Array.isArray(current.entries)) {
      current.entries = [];
    }

    const updated = {
      title: typeof title === 'string' ? title : (current.title || 'Extradex'),
      entries: Array.isArray(entries) ? entries : current.entries
    };

    fs.writeJsonSync(extradexPath, updated, { spaces: 2 });

    res.json({
      success: true,
      message: 'Extradex sauvegardé dans le fichier JSON.',
      extradex: updated
    });
  } catch (error) {
    console.error('❌ Erreur API PUT /api/extradex:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Servir le frontend React (build Vite) en production — doit être en dernier
const DIST_DIR = path.join(__dirname, '../dist');
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get('*', (req, res) => res.sendFile(path.join(DIST_DIR, 'index.html')));
}

// Démarrage du serveur
const port = Number(PORT) || 3000;
app.listen(port, '0.0.0.0', async () => {
  console.log(`🚀 Serveur démarré sur le port ${port}`);
  console.log(`📂 Dossier des images: ${NEWS_IMAGES_DIR}`);
  console.log(`⚙️  Dossier de config: ${CONFIG_DIR}`);
  
  fs.ensureDirSync(NEWS_IMAGES_DIR);
  fs.ensureDirSync(CONFIG_DIR);

  try {
    await initDb();
  } catch (err) {
    console.error('⚠️ Init DB:', err.message);
  }
});

export default app;