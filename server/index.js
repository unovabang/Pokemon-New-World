import express from 'express';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

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

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur API démarré sur le port ${PORT}`);
  console.log(`📂 Dossier des images: ${NEWS_IMAGES_DIR}`);
  console.log(`⚙️  Dossier de config: ${CONFIG_DIR}`);
  
  // Créer les dossiers s'ils n'existent pas
  fs.ensureDirSync(NEWS_IMAGES_DIR);
  fs.ensureDirSync(CONFIG_DIR);
});

export default app;