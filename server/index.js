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

// Chemin vers le dossier des images
const NEWS_IMAGES_DIR = path.join(__dirname, '../public/news-images');

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

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur API bannières démarré sur le port ${PORT}`);
  console.log(`📂 Dossier des images: ${NEWS_IMAGES_DIR}`);
  
  // Créer le dossier s'il n'existe pas
  fs.ensureDirSync(NEWS_IMAGES_DIR);
});

export default app;