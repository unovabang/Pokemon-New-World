await import('dotenv/config').catch(() => {});
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs-extra';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { initDb } from './db.js';
import authRoutes from './auth.js';
import { S3Client, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand, DeleteObjectCommand, ListObjectsV2Command, ListMultipartUploadsCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

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

// Chemins vers les dossiers (volume persistant en prod ; en dev, config dans le projet)
const PROJECT_ROOT = path.join(__dirname, '..');
const DATA_DIR = process.env.DATA_DIR || (process.env.NODE_ENV === 'production' ? '/app/data' : path.join(PROJECT_ROOT, 'data'));
const NEWS_IMAGES_DIR = path.join(DATA_DIR, 'news-images');
const CONFIG_DIR = path.join(DATA_DIR, 'config');
const SOURCE_CONFIG_DIR = path.join(PROJECT_ROOT, 'src/config');
const SOURCE_NEWS_IMAGES_DIR = path.join(PROJECT_ROOT, 'public/news-images');

/** Au premier démarrage avec un volume vide : copie les JSON (et images news) du repo vers le volume. */
function seedDataFromRepo() {
  fs.ensureDirSync(CONFIG_DIR);
  fs.ensureDirSync(NEWS_IMAGES_DIR);
  let copied = 0;
  if (fs.existsSync(SOURCE_CONFIG_DIR)) {
    const files = fs.readdirSync(SOURCE_CONFIG_DIR);
    for (const name of files) {
      if (!name.endsWith('.json')) continue;
      const src = path.join(SOURCE_CONFIG_DIR, name);
      const dest = path.join(CONFIG_DIR, name);
      if (!fs.existsSync(dest) && fs.statSync(src).isFile()) {
        fs.copyFileSync(src, dest);
        copied++;
      }
    }
  }
  if (fs.existsSync(SOURCE_NEWS_IMAGES_DIR)) {
    const files = fs.readdirSync(SOURCE_NEWS_IMAGES_DIR);
    for (const name of files) {
      const src = path.join(SOURCE_NEWS_IMAGES_DIR, name);
      const dest = path.join(NEWS_IMAGES_DIR, name);
      if (!fs.existsSync(dest) && fs.statSync(src).isFile()) {
        fs.copyFileSync(src, dest);
        copied++;
      }
    }
  }
  if (copied > 0) console.log(`📋 Volume initialisé : ${copied} fichier(s) copié(s) depuis le repo.`);
}

/** Commit + push automatique du JSON modifié (local ou production si env configurées). */
function autoCommitConfig(filename) {
  if (process.env.AUTO_COMMIT_CONFIG !== 'true') return;
  const relPath = `src/config/${filename}`;
  const msg = `chore(admin): update ${filename}`;
  const repo = process.env.GITHUB_REPO || 'Jiromk/Pokemon-New-World-2.0';
  const branch = process.env.GITHUB_BRANCH || 'main';
  const token = process.env.GITHUB_TOKEN;

  function doCommit() {
    exec(`git add "${relPath}" && git commit -m "${msg}"`, { cwd: PROJECT_ROOT }, (err, stdout, stderr) => {
      if (err && !/nothing to commit/.test(stderr || '')) {
        console.warn('⚠️ Auto-commit config:', stderr || err.message);
      }
      if (process.env.AUTO_PUSH_CONFIG === 'true' && !err) {
        const pushCmd = token
          ? `git push https://x-access-token:${token}@github.com/${repo}.git ${branch}`
          : 'git push';
        exec(pushCmd, { cwd: PROJECT_ROOT }, (pushErr, pushOut, pushErrOut) => {
          if (pushErr) console.warn('⚠️ Auto-push config:', pushErrOut || pushErr.message);
        });
      }
    });
  }

  if (token && process.env.NODE_ENV === 'production') {
    exec('git config user.email "deploy@railway.app" && git config user.name "Railway Deploy"', { cwd: PROJECT_ROOT }, () => doCommit());
  } else {
    doCommit();
  }
}

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

/** Compare deux chaînes de version type "0.8", "1.0.2" (ordre décroissant = plus récent en premier). */
function comparePatchVersionStringsDesc(va, vb) {
  const parse = (v) => {
    if (v == null || typeof v !== 'string') return [0];
    const s = String(v).trim().replace(/^v/i, '');
    if (!s) return [0];
    return s.split('.').map((p) => {
      const n = parseInt(p, 10);
      return Number.isFinite(n) ? n : 0;
    });
  };
  const A = parse(va);
  const B = parse(vb);
  const len = Math.max(A.length, B.length);
  for (let i = 0; i < len; i++) {
    const x = A[i] ?? 0;
    const y = B[i] ?? 0;
    if (x !== y) return y - x;
  }
  return 0;
}

function sortPatchnotesVersionsByVersionDesc(versions) {
  if (!Array.isArray(versions)) return [];
  return [...versions].sort((a, b) =>
    comparePatchVersionStringsDesc(a?.version, b?.version)
  );
}

/** Réponse API : versions toujours triées par numéro (plus récent en premier), sans modifier l’ordre stocké sur disque. */
function patchnotesResponsePayload(data) {
  if (!data || typeof data !== 'object') return data;
  return {
    ...data,
    versions: sortPatchnotesVersionsByVersionDesc(data.versions),
  };
}

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
        versions: [],
        background: null
      };
      fs.writeJsonSync(patchnotesPath, defaultData, { spaces: 2 });
      return res.json({ success: true, patchnotes: patchnotesResponsePayload(defaultData) });
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
      data.versions = [];
    }
    if (data.background === undefined) {
      data.background = null;
    }

    res.json({ success: true, patchnotes: patchnotesResponsePayload(data) });
  } catch (error) {
    console.error('❌ Erreur API /api/patchnotes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Fichier de config pour le webhook Discord (pas versionné)
const DISCORD_WEBHOOK_PATH = path.join(CONFIG_DIR, 'discord-webhook.json');

function getDiscordWebhookConfig() {
  try {
    if (fs.existsSync(DISCORD_WEBHOOK_PATH)) {
      const data = fs.readJsonSync(DISCORD_WEBHOOK_PATH);
      const url = data?.webhookUrl?.trim();
      const imageStyle = (data?.imageStyle === 'banner' || data?.imageStyle === 'thumbnail') ? data.imageStyle : 'thumbnail';
      if (url && url.startsWith('https://discord.com/api/webhooks/')) return { webhookUrl: url, imageStyle };
      return { webhookUrl: null, imageStyle };
    }
  } catch (e) {
    console.warn('Discord webhook config read error:', e.message);
  }
  return { webhookUrl: null, imageStyle: 'thumbnail' };
}

function resolvePatchImageUrl(patchImage, baseUrl) {
  if (!patchImage || !patchImage.trim()) return null;
  const u = patchImage.trim();
  if (u.startsWith('http')) return u;
  if (u.startsWith('/') && baseUrl) return baseUrl + u;
  return null;
}

// URLs fixes pour l’embed Discord (logo du site + avatar auteur)
const SITE_BASE = (process.env.SITE_PUBLIC_URL || 'https://www.pokemonnewworld.fr').replace(/\/$/, '');
const DISCORD_LOGO_URL = 'https://i.imgur.com/dnom6sx.png';
const DISCORD_AUTHOR_AVATAR_URL = 'https://media.discordapp.net/attachments/1412015491026784327/1480268790829678815/pp3.png?ex=69af0f3d&is=69adbdbd&hm=93ece592e96c036bc109f295eea70b9f9ab94f12bd0f9a457efc587dc51cf947&=&format=webp&quality=lossless';
const DISCORD_PATCHNOTES_URL = `${SITE_BASE}/patchnotes`;
const DISCORD_DOWNLOAD_URL = `${SITE_BASE}/#`;
const DISCORD_TELECHARGEMENT_URL = `${SITE_BASE}/telechargement`;

/** Envoie un embed Discord pour un nouveau patchnote (appelé après POST version) */
async function sendPatchnoteToDiscord(patch) {
  const { webhookUrl, imageStyle } = getDiscordWebhookConfig();
  if (!webhookUrl) return;
  const baseUrl = (process.env.SITE_PUBLIC_URL || '').replace(/\/$/, '');
  const imageUrl = resolvePatchImageUrl(patch.image, baseUrl);

  const logoUrl = DISCORD_LOGO_URL;

  const fields = [];
  const sections = Array.isArray(patch.sections) ? patch.sections : [];
  const maxFieldValue = 900;
  for (const section of sections.slice(0, 25)) {
    const title = (section.title || 'Sans titre').slice(0, 150);
    let body = (section.items || []).filter(Boolean).map((item) => `• ${item}`).join('\n');
    if (body.length > maxFieldValue) body = body.slice(0, maxFieldValue - 3) + '…';
    if (!body) body = '—';
    const value = `> ### ${title}\n\n${body}`;
    fields.push({ name: '\u200b', value, inline: false });
  }

  const embed = {
    author: { name: 'Pokémon New World', icon_url: DISCORD_AUTHOR_AVATAR_URL },
    title: `📌 Version ${patch.version}`,
    description: patch.date ? `**${patch.date}**\n\nNouveau patch disponible avec les détails ci‑dessous.` : 'Nouveau patch disponible.',
    color: 0x5865F2,
    url: DISCORD_PATCHNOTES_URL,
    timestamp: new Date().toISOString(),
    footer: { text: 'Notes de patch' },
    fields
  };

  if (imageUrl && imageStyle === 'banner') {
    embed.image = { url: imageUrl };
  }
  if (imageUrl && imageStyle === 'thumbnail') {
    embed.thumbnail = { url: imageUrl };
  }
  if (!embed.thumbnail && logoUrl) {
    embed.thumbnail = { url: logoUrl };
  }

  const payload = { embeds: [embed] };
  payload.components = [{
    type: 1,
    components: [
      { type: 2, style: 5, label: 'Patchnote', url: DISCORD_PATCHNOTES_URL }
    ]
  }];

  // Les webhooks Discord n’affichent les boutons que si on ajoute ?with_components=true à l’URL
  const webhookUrlWithComponents = payload.components
    ? webhookUrl + (webhookUrl.includes('?') ? '&' : '?') + 'with_components=true'
    : webhookUrl;

  try {
    const resp = await fetch(webhookUrlWithComponents, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!resp.ok) console.warn('Discord webhook error:', resp.status, await resp.text());
  } catch (e) {
    console.warn('Discord webhook send error:', e.message);
  }
}

/** Envoie un embed Discord pour une mise à jour du launcher (appelé après POST downloads si launcher URL change) */
async function sendLauncherUpdateToDiscord(newLauncherUrl) {
  const { webhookUrl } = getDiscordWebhookConfig();
  if (!webhookUrl) return;
  const embed = {
    author: { name: 'Pokémon New World', icon_url: DISCORD_AUTHOR_AVATAR_URL },
    title: '🚀 Nouvelle version du Launcher disponible',
    description: 'Une mise à jour du launcher est sortie.\n\nLa mise à jour est disponible automatiquement sur le launcher PNW.',
    color: 0x9B59B6,
    url: DISCORD_TELECHARGEMENT_URL,
    timestamp: new Date().toISOString(),
    footer: { text: 'Launcher' },
    thumbnail: { url: DISCORD_LOGO_URL }
  };
  const payload = {
    embeds: [embed],
    components: [{ type: 1, components: [{ type: 2, style: 5, label: 'Télécharger', url: DISCORD_TELECHARGEMENT_URL }] }]
  };
  const url = webhookUrl + (webhookUrl.includes('?') ? '&' : '?') + 'with_components=true';
  try {
    const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!resp.ok) console.warn('Discord webhook launcher error:', resp.status, await resp.text());
  } catch (e) {
    console.warn('Discord webhook launcher send error:', e.message);
  }
}

// GET /api/config/discord-webhook - Lire l’URL du webhook (masquée partiellement)
app.get('/api/config/discord-webhook', (req, res) => {
  try {
    const { webhookUrl, imageStyle } = getDiscordWebhookConfig();
    res.json({ success: true, webhookUrl: webhookUrl || '', imageStyle: imageStyle || 'thumbnail' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// PUT /api/config/discord-webhook - Enregistrer l’URL du webhook
app.put('/api/config/discord-webhook', (req, res) => {
  try {
    let { webhookUrl, imageStyle } = req.body || {};
    webhookUrl = typeof webhookUrl === 'string' ? webhookUrl.trim() : '';
    if (webhookUrl && !webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
      return res.status(400).json({ success: false, error: 'URL de webhook Discord invalide.' });
    }
    const imageStyleVal = (imageStyle === 'banner' || imageStyle === 'thumbnail') ? imageStyle : 'thumbnail';
    fs.ensureDirSync(CONFIG_DIR);
    fs.writeJsonSync(DISCORD_WEBHOOK_PATH, { webhookUrl: webhookUrl || '', imageStyle: imageStyleVal }, { spaces: 2 });
    res.json({ success: true, webhookUrl: webhookUrl ? 'saved' : 'cleared' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/patchnotes/:lang/version - Ajouter une nouvelle version
app.post('/api/patchnotes/:lang/version', (req, res) => {
  try {
    const lang = req.params.lang || 'fr';
    const filename = lang === 'en' ? 'patchnotes-en.json' : 'patchnotes.json';
    const { version, date, sections, image } = req.body;
    
    if (!version || !date) {
      return res.status(400).json({ success: false, error: 'Version et date requis' });
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
    
    // Ajouter la nouvelle version (en premier = plus récent)
    const newVersion = {
      version,
      date,
      image: image || null,
      sections: Array.isArray(sections) ? sections : []
    };
    data.versions = data.versions || [];
    data.versions.unshift(newVersion);

    fs.writeJsonSync(patchnotesPath, data, { spaces: 2 });

    // Notifier Discord (non bloquant)
    sendPatchnoteToDiscord(newVersion).catch(() => {});
    
    res.json({ 
      success: true, 
      message: `Version ${version} ajoutée avec succès`,
      patchnotes: patchnotesResponsePayload(data) 
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
    const { date, sections, image } = req.body;
    
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
    if (date !== undefined) data.versions[versionIndex].date = date;
    if (sections !== undefined) data.versions[versionIndex].sections = sections;
    if (image !== undefined) data.versions[versionIndex].image = image;
    
    fs.writeJsonSync(patchnotesPath, data, { spaces: 2 });
    
    res.json({ 
      success: true, 
      message: `Version ${version} mise à jour`,
      patchnotes: patchnotesResponsePayload(data) 
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
      patchnotes: patchnotesResponsePayload(data) 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/patchnotes/:lang/reorder - Réordonner les versions (ordre = [versionId, ...])
app.put('/api/patchnotes/:lang/reorder', (req, res) => {
  try {
    const lang = req.params.lang || 'fr';
    const filename = lang === 'en' ? 'patchnotes-en.json' : 'patchnotes.json';
    const { order } = req.body;
    if (!Array.isArray(order) || order.length === 0) {
      return res.status(400).json({ success: false, error: 'order (tableau de versions) requis' });
    }
    const patchnotesPath = path.join(CONFIG_DIR, filename);
    if (!fs.existsSync(patchnotesPath)) {
      return res.status(404).json({ success: false, error: 'Fichier non trouvé' });
    }
    const data = fs.readJsonSync(patchnotesPath);
    const byVersion = new Map(data.versions.map(v => [v.version, v]));
    const reordered = order.map(ver => byVersion.get(ver)).filter(Boolean);
    if (reordered.length !== order.length) {
      return res.status(400).json({ success: false, error: 'Une ou plusieurs versions introuvables' });
    }
    data.versions = reordered;
    fs.writeJsonSync(patchnotesPath, data, { spaces: 2 });
    res.json({ success: true, patchnotes: patchnotesResponsePayload(data) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/patchnotes/background - Mettre à jour l'image de fond (patchnotes.json fr)
app.put('/api/patchnotes/background', (req, res) => {
  try {
    const { background } = req.body || {};
    const patchnotesPath = path.join(CONFIG_DIR, 'patchnotes.json');
    let data = { versions: [], background: null };
    if (fs.existsSync(patchnotesPath)) {
      data = fs.readJsonSync(patchnotesPath);
      if (!Array.isArray(data.versions)) data.versions = [];
    }
    data.background = background !== undefined && background !== null && String(background).trim() ? String(background).trim() : null;
    fs.writeJsonSync(patchnotesPath, data, { spaces: 2 });
    res.json({ success: true, patchnotes: patchnotesResponsePayload(data) });
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
      patchnotes: patchnotesResponsePayload(data) 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// === CONFIGURATIONS GÉNÉRALES API ===
// Fonction générique pour gérer les configurations JSON
const getConfig = (configName) => {
  fs.ensureDirSync(CONFIG_DIR);
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
  fs.ensureDirSync(CONFIG_DIR);
  const configPath = path.join(CONFIG_DIR, `${configName}.json`);
  const repoConfigPath = path.join(SOURCE_CONFIG_DIR, `${configName}.json`);
  const opts = { spaces: 2 };
  try {
    fs.writeJsonSync(configPath, data, opts);
    fs.ensureDirSync(SOURCE_CONFIG_DIR);
    fs.writeJsonSync(repoConfigPath, data, opts);
    return true;
  } catch (error) {
    console.error(`❌ Erreur sauvegarde ${configName}:`, error);
    return false;
  }
};

/** Lecture contact-webhook comme les autres configs : CONFIG_DIR puis seed (src/config). */
function getContactWebhookData() {
  let data = getConfig('contact-webhook');
  if (!data) {
    const seedPath = path.join(SOURCE_CONFIG_DIR, 'contact-webhook.json');
    if (fs.existsSync(seedPath)) {
      try { data = fs.readJsonSync(seedPath); } catch {}
    }
  }
  return data || {};
}

app.get('/api/config/contact-webhook', (req, res) => {
  try {
    const data = getContactWebhookData();
    const webhookUrl = (data.webhookUrl || '').trim();
    const backgroundImage = (data.backgroundImage || '').trim();
    res.json({ success: true, webhookUrl, backgroundImage });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.put('/api/config/contact-webhook', (req, res) => {
  try {
    let { webhookUrl, backgroundImage } = req.body || {};
    webhookUrl = typeof webhookUrl === 'string' ? webhookUrl.trim() : '';
    backgroundImage = typeof backgroundImage === 'string' ? backgroundImage.trim() : '';
    if (webhookUrl && !webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
      return res.status(400).json({ success: false, error: 'URL de webhook Discord invalide.' });
    }
    const payload = { webhookUrl, backgroundImage };
    if (!saveConfig('contact-webhook', payload)) {
      return res.status(500).json({ success: false, error: 'Erreur sauvegarde.' });
    }
    autoCommitConfig('contact-webhook.json');
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/config/:name - Lire une configuration
app.get('/api/config/:name', (req, res) => {
  try {
    const { name } = req.params;
    let configData = getConfig(name);
    if (!configData && name === 'news') {
      configData = { banners: [], interval: 5000, bannerMaxHeight: 400 };
    }
    if (!configData && name === 'item-location') {
      const seedPath = path.join(__dirname, '../src/config/item-location.json');
      if (fs.existsSync(seedPath)) {
        try {
          configData = fs.readJsonSync(seedPath);
        } catch (e) {
          configData = { entries: [] };
        }
      } else {
        configData = { entries: [] };
      }
    }
    if (!configData && name === 'team') {
      const seedPath = path.join(__dirname, '../src/config/team.json');
      if (fs.existsSync(seedPath)) {
        try {
          configData = fs.readJsonSync(seedPath);
        } catch (e) {
          configData = { members: [], thanks: [], showBackground: true };
        }
      } else {
        configData = { members: [], thanks: [], showBackground: true };
      }
    }
    if (!configData && name === 'sidebar') {
      const seedPath = path.join(__dirname, '../src/config/sidebar.json');
      if (fs.existsSync(seedPath)) {
        try { configData = fs.readJsonSync(seedPath); } catch (e) { configData = { items: [], backgroundImage: "" }; }
      } else {
        configData = { items: [], backgroundImage: "" };
      }
    }
    if (!configData && name === 'evs-location') {
      const seedPath = path.join(__dirname, '../src/config/evs-location.json');
      if (fs.existsSync(seedPath)) {
        try {
          configData = fs.readJsonSync(seedPath);
        } catch (e) {
          configData = { entries: [] };
        }
      } else {
        configData = { entries: [] };
      }
    }
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

// === CLOUDFLARE R2 UPLOAD API ===
const r2Client = process.env.R2_ACCOUNT_ID ? new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
}) : null;

const R2_BUCKET = process.env.R2_BUCKET_NAME || 'pokemon-new-world';
const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');

// POST /api/r2/start-upload — Initiate multipart upload
app.post('/api/r2/start-upload', async (req, res) => {
  try {
    if (!r2Client) return res.status(500).json({ success: false, error: 'R2 non configuré' });
    const { filename, contentType } = req.body;
    if (!filename) return res.status(400).json({ success: false, error: 'filename requis' });

    const key = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const cmd = new CreateMultipartUploadCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: contentType || 'application/octet-stream',
    });
    const result = await r2Client.send(cmd);
    res.json({ success: true, uploadId: result.UploadId, key });
  } catch (error) {
    console.error('R2 start-upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/r2/get-presigned-urls — Generate presigned URLs for direct browser→R2 upload
app.post('/api/r2/get-presigned-urls', async (req, res) => {
  try {
    if (!r2Client) return res.status(500).json({ success: false, error: 'R2 non configuré' });
    const { key, uploadId, totalParts } = req.body;
    if (!key || !uploadId || !totalParts) {
      return res.status(400).json({ success: false, error: 'key, uploadId, totalParts requis' });
    }

    const urls = [];
    for (let i = 1; i <= totalParts; i++) {
      const cmd = new UploadPartCommand({
        Bucket: R2_BUCKET,
        Key: key,
        UploadId: uploadId,
        PartNumber: i,
      });
      const url = await getSignedUrl(r2Client, cmd, { expiresIn: 3600 });
      urls.push({ partNumber: i, url });
    }
    res.json({ success: true, urls });
  } catch (error) {
    console.error('R2 get-presigned-urls error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/r2/complete-upload — Complete multipart upload
app.post('/api/r2/complete-upload', async (req, res) => {
  try {
    if (!r2Client) return res.status(500).json({ success: false, error: 'R2 non configuré' });
    const { key, uploadId, parts } = req.body;
    if (!key || !uploadId || !parts || !Array.isArray(parts)) {
      return res.status(400).json({ success: false, error: 'key, uploadId, parts requis' });
    }

    // R2/S3 exige des ETag entre guillemets et les parts triées par PartNumber
    const normalizeEtag = (etag) => {
      const s = String(etag || '').trim();
      if (!s) return '""';
      return s.startsWith('"') && s.endsWith('"') ? s : `"${s}"`;
    };
    const sortedParts = [...parts].sort((a, b) => (a.partNumber || 0) - (b.partNumber || 0));
    const uploadParts = sortedParts.map(p => ({
      PartNumber: Number(p.partNumber),
      ETag: normalizeEtag(p.etag),
    }));

    const cmd = new CompleteMultipartUploadCommand({
      Bucket: R2_BUCKET,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: { Parts: uploadParts },
    });
    await r2Client.send(cmd);
    const publicUrl = R2_PUBLIC_URL ? `${R2_PUBLIC_URL}/${key}` : key;
    res.json({ success: true, url: publicUrl, key });
  } catch (error) {
    console.error('R2 complete-upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/r2/abort-upload — Abort a multipart upload
app.post('/api/r2/abort-upload', async (req, res) => {
  try {
    if (!r2Client) return res.status(500).json({ success: false, error: 'R2 non configuré' });
    const { key, uploadId } = req.body;
    if (!key || !uploadId) return res.status(400).json({ success: false, error: 'key, uploadId requis' });

    await r2Client.send(new AbortMultipartUploadCommand({ Bucket: R2_BUCKET, Key: key, UploadId: uploadId }));
    res.json({ success: true });
  } catch (error) {
    console.error('R2 abort-upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/r2/list-multipart-uploads — Liste les uploads multipart en cours (incomplets)
app.get('/api/r2/list-multipart-uploads', async (req, res) => {
  try {
    if (!r2Client) return res.status(500).json({ success: false, error: 'R2 non configuré' });
    const result = await r2Client.send(new ListMultipartUploadsCommand({ Bucket: R2_BUCKET, MaxUploads: 100 }));
    const uploads = (result.Uploads || []).map(u => ({
      key: u.Key,
      uploadId: u.UploadId,
      initiated: u.Initiated,
    }));
    res.json({ success: true, uploads });
  } catch (error) {
    console.error('R2 list-multipart-uploads error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/r2/object/:key — Delete an object from R2
app.delete('/api/r2/object/:key', async (req, res) => {
  try {
    if (!r2Client) return res.status(500).json({ success: false, error: 'R2 non configuré' });
    await r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: req.params.key }));
    res.json({ success: true });
  } catch (error) {
    console.error('R2 delete error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/r2/list — List objects in the bucket
app.get('/api/r2/list', async (req, res) => {
  try {
    if (!r2Client) return res.status(500).json({ success: false, error: 'R2 non configuré' });
    const result = await r2Client.send(new ListObjectsV2Command({ Bucket: R2_BUCKET, MaxKeys: 100 }));
    const objects = (result.Contents || []).map(o => ({
      key: o.Key,
      size: o.Size,
      lastModified: o.LastModified,
      url: R2_PUBLIC_URL ? `${R2_PUBLIC_URL}/${o.Key}` : o.Key,
    }));
    res.json({ success: true, objects });
  } catch (error) {
    console.error('R2 list error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/** Corps manifest launcher (FR ou EN selon la piste). */
function buildLauncherManifestBody(dl, version, downloadUrl) {
  return {
    name: 'Pokemon New World',
    version,
    releaseDate: dl.gameReleaseDate || new Date().toISOString(),
    minimumLauncherVersion: '1.0.0',
    changelog: { fr: dl.gameChangelog || '', en: dl.gameChangelogEn || '' },
    downloadUrl,
    downloadSize: 0,
    files: [],
    requirements: { minimumRAM: 2048, diskSpace: 500000000 },
    integrity: { archiveHash: 'sha256:pending', archiveSize: 0 },
    ...(dl.launcherBackgroundUrl && { launcherBackgroundUrl: dl.launcherBackgroundUrl }),
    ...(dl.launcherSidebarImageUrl && { launcherSidebarImageUrl: dl.launcherSidebarImageUrl }),
  };
}

// GET /api/downloads/launcher-update — Version + URL du setup pour mise à jour in-app du launcher
app.get('/api/downloads/launcher-update', (req, res) => {
  try {
    const dl = getConfig('downloads') || {};
    const version = String(dl.launcherVersion || '').trim();
    const downloadUrl = String(dl.launcher || '').trim();
    if (!version || !downloadUrl) {
      return res.json({ configured: false, version: null, downloadUrl: null });
    }
    res.json({ configured: true, version, downloadUrl });
  } catch (error) {
    console.error('❌ Erreur API /api/downloads/launcher-update:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/downloads/version-hints — Versions distantes FR/EN pour migration launcher (sans URLs lourdes)
app.get('/api/downloads/version-hints', (req, res) => {
  try {
    const dl = getConfig('downloads') || {};
    const frVer = String(dl.gameVersion || '0.52').trim();
    const enVer = String(dl.gameVersionEn || '').trim();
    const enUrl = String(dl.windowsEn || '').trim();
    const enAvailable = !!(enVer && enUrl);
    res.json({
      fr: { version: frVer },
      en: enAvailable ? { version: enVer } : null,
    });
  } catch (error) {
    console.error('❌ Erreur API /api/downloads/version-hints:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/downloads/manifest — Manifest JSON pour le launcher (format compatible)
// ?lang=fr (défaut) | en — piste FR = windows + gameVersion ; piste EN = windowsEn + gameVersionEn
app.get('/api/downloads/manifest', (req, res) => {
  try {
    const dl = getConfig('downloads') || {};
    const rawLang = (req.query.lang || 'fr').toString().toLowerCase();
    const lang = rawLang === 'en' ? 'en' : 'fr';

    if (lang === 'en') {
      const downloadUrl = String(dl.windowsEn || '').trim();
      const version = String(dl.gameVersionEn || '').trim();
      if (!downloadUrl || !version) {
        return res.status(400).json({
          error: 'Build anglais non configuré (windowsEn et gameVersionEn requis dans les téléchargements).',
        });
      }
      return res.json(buildLauncherManifestBody(dl, version, downloadUrl));
    }

    const version = String(dl.gameVersion || '0.52').trim();
    const downloadUrl = String(dl.windows || '').trim();
    return res.json(buildLauncherManifestBody(dl, version, downloadUrl));
  } catch (error) {
    console.error('❌ Erreur API /api/downloads/manifest:', error);
    res.status(500).json({ error: error.message });
  }
});

// API spécifique pour les téléchargements
app.get('/api/downloads', (req, res) => {
  try {
    let downloadsData = getConfig('downloads');
    if (!downloadsData) {
      const seedPath = path.join(SOURCE_CONFIG_DIR, 'downloads.json');
      if (fs.existsSync(seedPath)) {
        try { downloadsData = fs.readJsonSync(seedPath); } catch (_) { /* ignore */ }
      }
    }
    res.json({ success: true, downloads: downloadsData || {} });
  } catch (error) {
    console.error('❌ Erreur API /api/downloads:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/downloads', (req, res) => {
  try {
    const { downloads } = req.body;
    const prevDownloads = getConfig('downloads') || {};
    const success = saveConfig('downloads', downloads);
    
    if (!success) {
      return res.status(500).json({ success: false, error: 'Erreur lors de la sauvegarde' });
    }
    
    // Notification Discord : launcher uniquement si URL change
    const prevLauncher = (prevDownloads.launcher || '').trim();
    const newLauncher = (downloads?.launcher || '').trim();
    if (newLauncher && prevLauncher !== newLauncher) {
      sendLauncherUpdateToDiscord(newLauncher).catch(() => {});
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

// === PAGE TÉLÉCHARGEMENT (contenu éditable: galerie, vidéo, description) ===
/** Retourne un objet plat pour la page téléchargement (gère structure imbriquée { downloadPage: {...} }). */
function getDownloadPageConfig() {
  let raw = getConfig('downloadPage');
  if (!raw || !Object.keys(raw).length) {
    const seedPath = path.join(SOURCE_CONFIG_DIR, 'downloadPage.json');
    if (fs.existsSync(seedPath)) {
      try { raw = fs.readJsonSync(seedPath); } catch (_) { raw = {}; }
    } else {
      raw = {};
    }
  }
  const data = raw && typeof raw.downloadPage === 'object' && raw.downloadPage !== null && !Array.isArray(raw.downloadPage)
    ? raw.downloadPage
    : raw;
  let pageBackground = (data.pageBackground != null && data.pageBackground !== '') ? String(data.pageBackground).trim() : '';
  if (!pageBackground) {
    const seedPath = path.join(SOURCE_CONFIG_DIR, 'downloadPage.json');
    if (fs.existsSync(seedPath)) {
      try {
        const seed = fs.readJsonSync(seedPath);
        const seedData = seed && seed.downloadPage ? seed.downloadPage : seed;
        const bg = seedData?.pageBackground;
        if (bg != null && String(bg).trim() !== '') pageBackground = String(bg).trim();
      } catch (_) {}
    }
  }
  return {
    title: data.title ?? '',
    titleEn: data.titleEn ?? '',
    subtitle: data.subtitle ?? '',
    subtitleEn: data.subtitleEn ?? '',
    description: data.description ?? '',
    descriptionEn: data.descriptionEn ?? '',
    heroImage: (data.heroImage != null && data.heroImage !== '') ? String(data.heroImage).trim() : '',
    pageBackground,
    gallery: Array.isArray(data.gallery) ? data.gallery : [],
    videoUrl: (data.videoUrl != null && data.videoUrl !== '') ? String(data.videoUrl).trim() : '',
    videoTitle: data.videoTitle ?? '',
    videoTitleEn: data.videoTitleEn ?? '',
    soundcloudPlaylistUrl: (data.soundcloudPlaylistUrl != null && data.soundcloudPlaylistUrl !== '') ? String(data.soundcloudPlaylistUrl).trim() : '',
  };
}

app.get('/api/download-page', (req, res) => {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    const data = getDownloadPageConfig();
    res.json({ success: true, ...data });
  } catch (error) {
    console.error('❌ Erreur API /api/download-page:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/download-page', (req, res) => {
  try {
    const body = req.body || {};
    const data = {
      title: body.title ?? '',
      titleEn: body.titleEn ?? '',
      subtitle: body.subtitle ?? '',
      subtitleEn: body.subtitleEn ?? '',
      description: body.description ?? '',
      descriptionEn: body.descriptionEn ?? '',
      heroImage: body.heroImage ?? '',
      pageBackground: body.pageBackground ?? '',
      gallery: Array.isArray(body.gallery) ? body.gallery : [],
      videoUrl: body.videoUrl ?? '',
      videoTitle: body.videoTitle ?? '',
      videoTitleEn: body.videoTitleEn ?? '',
      soundcloudPlaylistUrl: body.soundcloudPlaylistUrl ?? ''
    };
    const success = saveConfig('downloadPage', data);
    if (!success) return res.status(500).json({ success: false, error: 'Erreur sauvegarde' });
    res.json({ success: true, message: 'Page téléchargement mise à jour' });
  } catch (error) {
    console.error('❌ Erreur API PUT /api/download-page:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// === LORE API ===
// GET /api/lore - Lire les chapitres du lore
app.get('/api/lore', (req, res) => {
  try {
    let loreData = getConfig('lore');
    if (!loreData) {
      const seedPath = path.join(__dirname, '../src/config/lore.json');
      if (fs.existsSync(seedPath)) {
        try { loreData = fs.readJsonSync(seedPath); } catch { loreData = { stories: [] }; }
      } else {
        loreData = { stories: [] };
      }
    }
    res.json({
      success: true,
      lore: {
        stories: Array.isArray(loreData.stories) ? loreData.stories : [],
        pageBackground: loreData.pageBackground || "",
      }
    });
  } catch (error) {
    console.error('❌ Erreur API /api/lore:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/lore - Sauvegarder les chapitres du lore
app.put('/api/lore', (req, res) => {
  try {
    const { stories, pageBackground } = req.body;
    if (!Array.isArray(stories)) {
      return res.status(400).json({ success: false, error: 'stories (tableau) requis' });
    }
    const current = getConfig('lore') || {};
    const updated = {
      stories,
      pageBackground: pageBackground !== undefined ? (pageBackground || "") : (current.pageBackground || ""),
    };
    if (!saveConfig('lore', updated)) {
      return res.status(500).json({ success: false, error: 'Échec écriture lore.json' });
    }
    autoCommitConfig('lore.json');
    res.json({ success: true, message: 'Lore sauvegardé.', lore: updated });
  } catch (error) {
    console.error('❌ Erreur API PUT /api/lore:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// === CONTACT FORM API ===
const CONTACT_CATEGORY_LABELS = {
  bug: { label: 'Bug / Problème technique', color: 0xe74c3c },
  suggestion: { label: 'Suggestion', color: 0xf1c40f },
  recrutement: { label: 'Recrutement', color: 0x3498db },
  question: { label: 'Question générale', color: 0x9b59b6 },
  autre: { label: 'Autre', color: 0x95a5a6 },
};

app.post('/api/contact', async (req, res) => {
  try {
    const { category, contact, subject, message } = req.body;
    if (!category || !contact || !subject || !message) {
      return res.status(400).json({ success: false, error: 'Tous les champs sont requis.' });
    }
    const cat = CONTACT_CATEGORY_LABELS[category] || { label: category, color: 0x95a5a6 };

    const contactData = getContactWebhookData();
    const webhookUrl = contactData?.webhookUrl?.trim() || null;

    if (webhookUrl && webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
      const embed = {
        author: { name: 'Formulaire de contact', icon_url: DISCORD_LOGO_URL },
        title: subject,
        color: cat.color,
        fields: [
          { name: 'Catégorie', value: cat.label, inline: true },
          { name: 'Contact', value: contact, inline: true },
          { name: 'Message', value: message.length > 1024 ? message.slice(0, 1021) + '…' : message, inline: false },
        ],
        timestamp: new Date().toISOString(),
        footer: { text: `Catégorie : ${cat.label}` },
      };
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ embeds: [embed] }),
        });
      } catch (e) {
        console.warn('Contact webhook error:', e.message);
      }
    }

    res.json({ success: true, message: 'Message envoyé.' });
  } catch (error) {
    console.error('❌ Erreur API /api/contact:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// === POKÉDEX API ===
// GET /api/pokedex - Lire le Pokédex (entries + background + customTypes)
app.get('/api/pokedex', (req, res) => {
  try {
    let raw = getConfig('pokedex');
    if (!raw) {
      return res.status(404).json({ success: false, error: 'Fichier Pokédex non trouvé' });
    }
    const pokedexData = unwrapConfig(raw, 'pokedex');
    res.json({
      success: true,
      pokedex: {
        source: pokedexData.source,
        updated: pokedexData.updated,
        entries: Array.isArray(pokedexData.entries) ? pokedexData.entries : [],
        background: (pokedexData.background && String(pokedexData.background).trim()) ? String(pokedexData.background).trim() : null,
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

    const opts = { spaces: 2 };
    fs.writeJsonSync(pokedexPath, updated, opts);
    fs.ensureDirSync(SOURCE_CONFIG_DIR);
    fs.writeJsonSync(path.join(SOURCE_CONFIG_DIR, 'pokedex.json'), updated, opts);
    autoCommitConfig('pokedex.json');

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

// === POKÉDEX + EXTRADEX PUBLIC (pour le launcher) ===
// GET /api/dex - Retourne pokedex + extradex en une requête (sans auth)
app.get('/api/dex', (req, res) => {
  try {
    const pokedexData = getConfig('pokedex');
    const extradexData = getConfig('extradex');
    res.json({
      success: true,
      pokedex: {
        entries: Array.isArray(pokedexData?.entries) ? pokedexData.entries : [],
        count: Array.isArray(pokedexData?.entries) ? pokedexData.entries.length : 0,
      },
      extradex: {
        title: extradexData?.title || 'Extradex',
        entries: Array.isArray(extradexData?.entries) ? extradexData.entries : [],
        count: Array.isArray(extradexData?.entries) ? extradexData.entries.length : 0,
      },
    });
  } catch (error) {
    console.error('❌ Erreur API /api/dex:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// === EXTRADEX API ===
// GET /api/extradex - Lire l'Extradex (title + entries + background + customTypes)
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
        entries: Array.isArray(extradexData.entries) ? extradexData.entries : [],
        background: extradexData.background || null,
        customTypes: Array.isArray(extradexData.customTypes) ? extradexData.customTypes : []
      }
    });
  } catch (error) {
    console.error('❌ Erreur API /api/extradex:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Désimbriquer une config si elle a été sauvegardée sous la forme { guide: {...} }, { pokedex: {...} }, etc.
function unwrapConfig(raw, key) {
  if (!raw || typeof raw !== 'object') return raw;
  const inner = raw[key];
  if (inner && typeof inner === 'object' && !Array.isArray(inner)) return inner;
  return raw;
}

// === GUIDE API ===
// GET /api/guide - Lire le guide (title, subtitle, disclaimer, steps)
app.get('/api/guide', (req, res) => {
  try {
    let raw = getConfig('guide');
    if (!raw) {
      return res.status(404).json({ success: false, error: 'Fichier guide non trouvé' });
    }
    const guideData = unwrapConfig(raw, 'guide');
    res.json({
      success: true,
      guide: {
        title: guideData.title || 'Guide Pokémon New World',
        subtitle: guideData.subtitle || '',
        disclaimer: guideData.disclaimer || '',
        steps: Array.isArray(guideData.steps) ? guideData.steps : [],
        background: guideData.background && String(guideData.background).trim() ? String(guideData.background).trim() : null
      }
    });
  } catch (error) {
    console.error('❌ Erreur API /api/guide:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/guide - Sauvegarder le guide (écrit dans guide.json)
app.put('/api/guide', (req, res) => {
  try {
    const { title, subtitle, disclaimer, steps, background } = req.body;
    const guidePath = path.join(CONFIG_DIR, 'guide.json');

    let current = { title: '', subtitle: '', disclaimer: '', steps: [] };
    if (fs.existsSync(guidePath)) {
      current = fs.readJsonSync(guidePath);
    }
    if (!Array.isArray(current.steps)) {
      current.steps = [];
    }

    const updated = {
      title: typeof title === 'string' ? title : (current.title || 'Guide Pokémon New World'),
      subtitle: typeof subtitle === 'string' ? subtitle : (current.subtitle || ''),
      disclaimer: typeof disclaimer === 'string' ? disclaimer : (current.disclaimer || ''),
      steps: Array.isArray(steps) ? steps : current.steps,
      background: background !== undefined ? (background && String(background).trim() ? String(background).trim() : null) : (current.background !== undefined ? current.background : null)
    };

    const opts = { spaces: 2 };
    fs.writeJsonSync(guidePath, updated, opts);
    fs.ensureDirSync(SOURCE_CONFIG_DIR);
    fs.writeJsonSync(path.join(SOURCE_CONFIG_DIR, 'guide.json'), updated, opts);
    autoCommitConfig('guide.json');

    res.json({
      success: true,
      message: 'Guide sauvegardé dans le fichier JSON.',
      guide: updated
    });
  } catch (error) {
    console.error('❌ Erreur API PUT /api/guide:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/extradex - Sauvegarder l'Extradex (écrit dans extradex.json)
app.put('/api/extradex', (req, res) => {
  try {
    const { title, entries, background, customTypes } = req.body;
    const extradexPath = path.join(CONFIG_DIR, 'extradex.json');

    let current = { title: 'Extradex', entries: [], background: null, customTypes: [] };
    if (fs.existsSync(extradexPath)) {
      current = fs.readJsonSync(extradexPath);
    }
    if (!Array.isArray(current.entries)) {
      current.entries = [];
    }
    if (!Array.isArray(current.customTypes)) {
      current.customTypes = [];
    }

    const updated = {
      title: typeof title === 'string' ? title : (current.title || 'Extradex'),
      entries: Array.isArray(entries) ? entries : current.entries,
      ...(background !== undefined && { background: background || null }),
      ...(customTypes !== undefined && { customTypes: Array.isArray(customTypes) ? customTypes : [] })
    };
    if (background === undefined && current.background !== undefined) updated.background = current.background;
    if (customTypes === undefined && current.customTypes !== undefined) updated.customTypes = current.customTypes;

    const opts = { spaces: 2 };
    fs.writeJsonSync(extradexPath, updated, opts);
    fs.ensureDirSync(SOURCE_CONFIG_DIR);
    fs.writeJsonSync(path.join(SOURCE_CONFIG_DIR, 'extradex.json'), updated, opts);
    autoCommitConfig('extradex.json');

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

// === NERFS AND BUFFS API ===
// GET /api/nerfs-and-buffs - Lire les données Nerfs & Buffs
app.get('/api/nerfs-and-buffs', (req, res) => {
  try {
    let raw = getConfig('nerfs-and-buffs');
    if (!raw) {
      const seedPath = path.join(__dirname, '../src/config/nerfs-and-buffs.json');
      if (fs.existsSync(seedPath)) {
        try {
          raw = fs.readJsonSync(seedPath);
        } catch (e) {
          raw = { lastModified: null, nerfs: [], buffs: [], ajustements: [], background: null };
        }
      } else {
        raw = { lastModified: null, nerfs: [], buffs: [], ajustements: [], background: null };
      }
    }
    const data = unwrapConfig(raw, 'nerfsBuffs') || raw;
    const bg = data.background != null && String(data.background).trim() ? String(data.background).trim() : null;
    res.json({
      success: true,
      nerfsBuffs: {
        lastModified: data.lastModified ?? null,
        nerfs: Array.isArray(data.nerfs) ? data.nerfs : [],
        buffs: Array.isArray(data.buffs) ? data.buffs : [],
        ajustements: Array.isArray(data.ajustements) ? data.ajustements : [],
        background: bg,
      },
    });
  } catch (error) {
    console.error('❌ Erreur API /api/nerfs-and-buffs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/nerfs-and-buffs - Sauvegarder Nerfs & Buffs
app.put('/api/nerfs-and-buffs', (req, res) => {
  try {
    const { lastModified, nerfs, buffs, ajustements, background } = req.body;
    const configPath = path.join(CONFIG_DIR, 'nerfs-and-buffs.json');

    let current = { lastModified: null, nerfs: [], buffs: [], ajustements: [], background: null };
    if (fs.existsSync(configPath)) {
      current = fs.readJsonSync(configPath);
    }

    const updated = {
      lastModified: lastModified !== undefined ? (lastModified && String(lastModified).trim() ? String(lastModified).trim() : new Date().toISOString().slice(0, 10)) : (current.lastModified || new Date().toISOString().slice(0, 10)),
      nerfs: Array.isArray(nerfs) ? nerfs : (current.nerfs || []),
      buffs: Array.isArray(buffs) ? buffs : (current.buffs || []),
      ajustements: Array.isArray(ajustements) ? ajustements : (current.ajustements || []),
      background: background !== undefined ? (background && String(background).trim() ? String(background).trim() : null) : (current.background ?? null),
    };

    const opts = { spaces: 2 };
    fs.ensureDirSync(CONFIG_DIR);
    fs.writeJsonSync(configPath, updated, opts);
    fs.ensureDirSync(SOURCE_CONFIG_DIR);
    fs.writeJsonSync(path.join(SOURCE_CONFIG_DIR, 'nerfs-and-buffs.json'), updated, opts);
    autoCommitConfig('nerfs-and-buffs.json');

    res.json({
      success: true,
      message: 'Nerfs and Buffs sauvegardés.',
      nerfsBuffs: updated,
    });
  } catch (error) {
    console.error('❌ Erreur API PUT /api/nerfs-and-buffs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// === BST API (All BST + Abilities) ===
// GET /api/bst - Lire les données BST (fakemon, megas, speciaux)
app.get('/api/bst', (req, res) => {
  try {
    let raw = getConfig('bst');
    if (!raw) {
      return res.status(404).json({ success: false, error: 'Fichier BST non trouvé' });
    }
    const bstData = unwrapConfig(raw, 'bst');
    const bg = bstData.background != null && String(bstData.background).trim() ? String(bstData.background).trim() : null;
    res.json({
      success: true,
      bst: {
        fakemon: Array.isArray(bstData.fakemon) ? bstData.fakemon : [],
        megas: Array.isArray(bstData.megas) ? bstData.megas : [],
        speciaux: Array.isArray(bstData.speciaux) ? bstData.speciaux : [],
        background: bg,
      },
    });
  } catch (error) {
    console.error('❌ Erreur API /api/bst:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/bst - Sauvegarder le BST (écrit dans bst.json)
app.put('/api/bst', (req, res) => {
  try {
    const { fakemon, megas, speciaux, background } = req.body;
    const bstPath = path.join(CONFIG_DIR, 'bst.json');

    let current = { fakemon: [], megas: [], speciaux: [], background: null };
    if (fs.existsSync(bstPath)) {
      current = fs.readJsonSync(bstPath);
    }

    const updated = {
      fakemon: Array.isArray(fakemon) ? fakemon : (current.fakemon || []),
      megas: Array.isArray(megas) ? megas : (current.megas || []),
      speciaux: Array.isArray(speciaux) ? speciaux : (current.speciaux || []),
      background: background !== undefined ? (background && String(background).trim() ? String(background).trim() : null) : (current.background ?? null),
    };

    if (!saveConfig('bst', updated)) {
      return res.status(500).json({ success: false, error: 'Échec écriture bst.json' });
    }
    autoCommitConfig('bst.json');

    res.json({
      success: true,
      message: 'BST sauvegardé dans le fichier JSON.',
      bst: updated,
    });
  } catch (error) {
    console.error('❌ Erreur API PUT /api/bst:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// === EVs LOCATION API ===
// GET /api/evs-location - Lire la table EVs (entries)
app.get('/api/evs-location', (req, res) => {
  try {
    let raw = getConfig('evs-location');
    if (!raw) {
      const seedPath = path.join(__dirname, '../src/config/evs-location.json');
      if (fs.existsSync(seedPath)) {
        try {
          raw = fs.readJsonSync(seedPath);
        } catch (e) {
          raw = { entries: [], background: null };
        }
      } else {
        raw = { entries: [], background: null };
      }
    }
    const configData = unwrapConfig(raw, 'evs') || raw;
    const entries = Array.isArray(configData?.entries) ? configData.entries : [];
    const bg = configData.background != null && String(configData.background).trim() ? String(configData.background).trim() : null;
    res.json({
      success: true,
      evs: { entries, background: bg },
    });
  } catch (error) {
    console.error('❌ Erreur API /api/evs-location:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/evs-location - Sauvegarder la table EVs (écrit dans evs-location.json)
app.put('/api/evs-location', (req, res) => {
  try {
    const { entries, background } = req.body;
    const evsPath = path.join(CONFIG_DIR, 'evs-location.json');

    let current = { entries: [], background: null };
    if (fs.existsSync(evsPath)) {
      current = fs.readJsonSync(evsPath);
    }

    const updated = {
      entries: Array.isArray(entries) ? entries : (current.entries || []),
      background: background !== undefined ? (background && String(background).trim() ? String(background).trim() : null) : (current.background ?? null),
    };

    const opts = { spaces: 2 };
    fs.ensureDirSync(CONFIG_DIR);
    fs.writeJsonSync(evsPath, updated, opts);
    fs.ensureDirSync(SOURCE_CONFIG_DIR);
    fs.writeJsonSync(path.join(SOURCE_CONFIG_DIR, 'evs-location.json'), updated, opts);
    autoCommitConfig('evs-location.json');

    res.json({
      success: true,
      message: 'EVs Location sauvegardée.',
      evs: updated,
    });
  } catch (error) {
    console.error('❌ Erreur API PUT /api/evs-location:', error);
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
  seedDataFromRepo();

  try {
    await initDb();
  } catch (err) {
    console.error('⚠️ Init DB:', err.message);
  }
});

export default app;