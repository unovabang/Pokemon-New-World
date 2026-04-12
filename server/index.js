await import('dotenv/config').catch(() => {});
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import fs from 'fs-extra';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { initDb } from './db.js';
import authRoutes, { requireAuth, optionalAuth } from './auth.js';
import { maskDiscordWebhookUrl } from './webhookMask.js';
import { handleChatPublicPreview } from './chatPublicPreview.js';
import { S3Client, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand, DeleteObjectCommand, ListObjectsV2Command, ListMultipartUploadsCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { stripLeadingEmojiFromTitle } from '../src/utils/patchSectionTitle.js';
import { stripPatchMarkdownForPlain, patchItemPlainText, patchItemDiscordPrefix } from './stripPatchMarkdown.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Compare deux versions semver (ex. "1.0.4" vs "1.0.5"). Retourne <0 si a<b, 0 si a==b, >0 si a>b. */
function compareSemver(a, b) {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na !== nb) return na - nb;
  }
  return 0;
}

const app = express();
const PORT = process.env.PORT || 3001;

/** Derrière Railway / Cloudflare : limiteur d’IP et logs utilisent la bonne IP client. */
const trustHops = (process.env.TRUST_PROXY_HOPS ?? '1').trim();
if (trustHops === '0') app.set('trust proxy', false);
else if (trustHops !== '' && !Number.isNaN(Number(trustHops))) app.set('trust proxy', Number(trustHops));
else app.set('trust proxy', 1);

// Middleware (limite large pour PUT /api/pokedex et autres configs volumineuses — évolutif)
app.use(cors({
  origin: (origin, callback) => {
    // Autorise : pas d'origin (Tauri, curl, requêtes serveur), site officiel, localhost dev
    if (!origin
      || origin === 'https://pokemonnewworld.fr'
      || origin === 'https://www.pokemonnewworld.fr'
      || origin.startsWith('http://localhost')
      || origin.startsWith('http://127.0.0.1')
      || origin === 'tauri://localhost'
      || origin === 'http://tauri.localhost'
      || origin.startsWith('https://tauri.')
    ) {
      return callback(null, true);
    }
    callback(new Error('CORS non autorisé'));
  },
  credentials: true,
}));
app.use(compression());
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
app.use(cookieParser());
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '25mb' }));

// Rate limit global : 100 requêtes / minute par IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { success: false, error: 'Trop de requêtes. Réessayez dans quelques instants.' },
});
app.use('/api/', globalLimiter);

// Rate limit strict pour le contact : 3 requêtes / 5 min par IP
const contactLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 3,
  message: { success: false, error: 'Trop de messages envoyés. Réessayez dans quelques minutes.' },
});

// Rate limit login : 5 tentatives / 15 min par IP (anti brute-force)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, error: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.' },
});
app.use('/api/auth/login', loginLimiter);

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

/** Fichiers `banniere{n}.png` uniquement (admin upload — évite path traversal). */
function isBannerAssetFilename(filename) {
  return typeof filename === 'string' && /^banniere\d+\.png$/i.test(filename.trim());
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
app.post('/api/banners/upload', requireAuth, upload.single('banner'), (req, res) => {
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
app.delete('/api/banners/:filename', requireAuth, (req, res) => {
  try {
    const filename = req.params.filename;
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ success: false, error: 'Nom de fichier invalide' });
    }
    if (!isBannerAssetFilename(filename)) {
      return res.status(400).json({ success: false, error: 'Nom de fichier invalide' });
    }
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
app.put('/api/banners/reposition', requireAuth, (req, res) => {
  try {
    const { changes } = req.body; // { "banniere1.png": 3, "banniere2.png": 1 }
    
    if (!changes || typeof changes !== 'object') {
      return res.status(400).json({ success: false, error: 'Format de données invalide' });
    }
    for (const [oldName, newPosition] of Object.entries(changes)) {
      if (!isBannerAssetFilename(oldName)) {
        return res.status(400).json({ success: false, error: `Nom de bannière invalide : ${oldName}` });
      }
      const pos = Number(newPosition);
      if (!Number.isInteger(pos) || pos < 1 || pos > 10) {
        return res.status(400).json({ success: false, error: 'Position invalide (1–10)' });
      }
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
app.put('/api/banners/:filename/position', requireAuth, (req, res) => {
  try {
    const { filename } = req.params;
    const { position } = req.body;

    if (!isBannerAssetFilename(filename)) {
      return res.status(400).json({ success: false, error: 'Nom de fichier invalide' });
    }
    
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
    const displayTitle = stripLeadingEmojiFromTitle(section.title || '') || (section.title || '').trim();
    const title = (displayTitle || 'Sans titre').slice(0, 150);
    let body = (section.items || [])
      .filter((item) => patchItemPlainText(item).trim().length > 0)
      .map((item) => {
        const plain = stripPatchMarkdownForPlain(patchItemPlainText(item));
        return `• ${patchItemDiscordPrefix(item)}${plain}`;
      })
      .join('\n');
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

// GET /api/config/discord-webhook — URL complète uniquement si admin authentifié (cookie JWT).
app.get('/api/config/discord-webhook', optionalAuth, (req, res) => {
  try {
    const { webhookUrl, imageStyle } = getDiscordWebhookConfig();
    const style = imageStyle || 'thumbnail';
    if (req.admin) {
      return res.json({ success: true, webhookUrl: webhookUrl || '', imageStyle: style, webhookConfigured: !!webhookUrl });
    }
    return res.json({
      success: true,
      webhookUrl: '',
      webhookUrlMasked: webhookUrl ? maskDiscordWebhookUrl(webhookUrl) : '',
      webhookConfigured: !!webhookUrl,
      imageStyle: style,
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// PUT /api/config/discord-webhook - Enregistrer l’URL du webhook
app.put('/api/config/discord-webhook', requireAuth, (req, res) => {
  try {
    let { webhookUrl, imageStyle } = req.body || {};
    const prev = getDiscordWebhookConfig();
    if (webhookUrl === undefined) {
      webhookUrl = (prev.webhookUrl || '').trim();
    } else {
      webhookUrl = typeof webhookUrl === 'string' ? webhookUrl.trim() : '';
    }
    if (webhookUrl && !webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
      return res.status(400).json({ success: false, error: 'URL de webhook Discord invalide.' });
    }
    const imageStyleVal =
      imageStyle === 'banner' || imageStyle === 'thumbnail'
        ? imageStyle
        : prev.imageStyle === 'banner' || prev.imageStyle === 'thumbnail'
          ? prev.imageStyle
          : 'thumbnail';
    fs.ensureDirSync(CONFIG_DIR);
    fs.writeJsonSync(DISCORD_WEBHOOK_PATH, { webhookUrl: webhookUrl || '', imageStyle: imageStyleVal }, { spaces: 2 });
    res.json({ success: true, webhookUrl: webhookUrl ? 'saved' : 'cleared' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/patchnotes/:lang/version - Ajouter une nouvelle version
app.post('/api/patchnotes/:lang/version', requireAuth, (req, res) => {
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
app.put('/api/patchnotes/:lang/version/:version', requireAuth, (req, res) => {
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
app.delete('/api/patchnotes/:lang/version/:version', requireAuth, (req, res) => {
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
app.put('/api/patchnotes/:lang/reorder', requireAuth, (req, res) => {
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
app.put('/api/patchnotes/background', requireAuth, (req, res) => {
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
app.post('/api/patchnotes/version/:version/section', requireAuth, (req, res) => {
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

/** Lecture webhook config (auto-message). */
function getWebhookData() {
  let data = getConfig('webhook');
  if (!data) {
    const seedPath = path.join(SOURCE_CONFIG_DIR, 'webhook.json');
    if (fs.existsSync(seedPath)) {
      try { data = fs.readJsonSync(seedPath); } catch {}
    }
  }
  return data || {};
}

let webhookIntervalId = null;

async function sendWebhookAutoMessage() {
  const data = getWebhookData();
  const url = (data.webhookUrl || '').trim();
  const embed = data.embed || {};
  if (!url || !embed.title) return;

  const discordEmbed = {
    title: embed.title,
    description: embed.description || undefined,
    color: parseInt((embed.color || '#5865F2').replace('#', ''), 16),
    image: embed.image ? { url: embed.image } : undefined,
    thumbnail: embed.thumbnail ? { url: embed.thumbnail } : undefined,
    footer: embed.footer ? { text: embed.footer } : undefined,
    timestamp: new Date().toISOString(),
  };

  const payload = { embeds: [discordEmbed] };
  if (data.username) payload.username = data.username;
  if (data.avatarUrl) payload.avatar_url = data.avatarUrl;

  const hasButton = embed.buttonLabel && embed.buttonUrl;
  if (hasButton) {
    payload.components = [{
      type: 1,
      components: [{ type: 2, style: 5, label: embed.buttonLabel, url: embed.buttonUrl }]
    }];
  }

  const finalUrl = hasButton
    ? url + (url.includes('?') ? '&' : '?') + 'with_components=true'
    : url;

  try {
    await fetch(finalUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    console.log('✅ Webhook auto-message envoyé.');
  } catch (e) {
    console.warn('⚠️ Webhook auto-message erreur:', e.message);
  }
}

function startWebhookInterval() {
  if (webhookIntervalId) clearInterval(webhookIntervalId);
  const data = getWebhookData();
  const hours = data.intervalHours || 2;
  const ms = hours * 60 * 60 * 1000;
  webhookIntervalId = setInterval(sendWebhookAutoMessage, ms);
  console.log(`⏰ Webhook auto-message: toutes les ${hours}h`);
}

app.get('/api/config/webhook', optionalAuth, (req, res) => {
  try {
    const data = getWebhookData();
    const rawUrl = (data.webhookUrl || '').trim();
    const base = {
      success: true,
      username: (data.username || '').trim(),
      avatarUrl: (data.avatarUrl || '').trim(),
      embed: data.embed || { title: '', description: '', color: '#5865F2', image: '', thumbnail: '', footer: '' },
      intervalHours: data.intervalHours || 2,
      webhookConfigured: !!rawUrl,
    };
    if (req.admin) {
      return res.json({ ...base, webhookUrl: rawUrl });
    }
    return res.json({
      ...base,
      webhookUrl: '',
      webhookUrlMasked: rawUrl ? maskDiscordWebhookUrl(rawUrl) : '',
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.put('/api/config/webhook', requireAuth, (req, res) => {
  try {
    let { webhookUrl, username, avatarUrl, embed, intervalHours } = req.body || {};
    const prev = getWebhookData();
    if (webhookUrl === undefined) {
      webhookUrl = (prev.webhookUrl || '').trim();
    } else {
      webhookUrl = typeof webhookUrl === 'string' ? webhookUrl.trim() : '';
    }
    username = typeof username === 'string' ? username.trim() : '';
    avatarUrl = typeof avatarUrl === 'string' ? avatarUrl.trim() : '';
    embed = typeof embed === 'object' && embed ? embed : {};
    intervalHours = typeof intervalHours === 'number' && intervalHours >= 1 ? intervalHours : 2;

    if (webhookUrl && !webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
      return res.status(400).json({ success: false, error: 'URL de webhook Discord invalide.' });
    }
    const payload = { webhookUrl, username, avatarUrl, embed, intervalHours };
    if (!saveConfig('webhook', payload)) {
      return res.status(500).json({ success: false, error: 'Erreur sauvegarde.' });
    }
    autoCommitConfig('webhook.json');
    startWebhookInterval();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// === ANTI-CHEAT : Rapport de triche (IV/EV) → Discord webhook ===
// Le webhook URL est stocké dans l'env variable CHEAT_WEBHOOK_URL (jamais exposé au client).
// Rate-limit basique : max 1 rapport par joueur par minute.
const _cheatReportTimestamps = new Map();

app.post('/api/report-cheat', async (req, res) => {
  try {
    const webhookUrl = process.env.CHEAT_WEBHOOK_URL;
    if (!webhookUrl) {
      return res.json({ success: false, error: 'Webhook non configuré' });
    }

    const { playerName, playerUsername, discordId, avatarUrl, violations } = req.body || {};
    if (!playerName || !Array.isArray(violations) || violations.length === 0) {
      return res.status(400).json({ success: false, error: 'Données invalides' });
    }

    // Rate-limit : 1 rapport par joueur par minute
    const rateLimitKey = discordId || playerName;
    const lastReport = _cheatReportTimestamps.get(rateLimitKey);
    if (lastReport && Date.now() - lastReport < 60_000) {
      return res.json({ success: true, skipped: true });
    }
    _cheatReportTimestamps.set(rateLimitKey, Date.now());

    // Construire l'embed Discord
    const violationLines = violations.map((v) => {
      const pokeName = v.label || 'Pokémon inconnu';
      const details = (v.violations || []).map((viol) => {
        const statNames = { hp: 'PV', atk: 'Atq', dfe: 'Déf', spd: 'Vit', ats: 'Atq Spé', dfs: 'Déf Spé' };
        if (viol.kind === 'iv_over') return `IV ${statNames[viol.stat] || viol.stat} = **${viol.value}** (max 31)`;
        if (viol.kind === 'ev_over') return `EV ${statNames[viol.stat] || viol.stat} = **${viol.value}** (max 252)`;
        if (viol.kind === 'ev_total_over') return `EV total = **${viol.total}** (max 510)`;
        return JSON.stringify(viol);
      }).join('\n');
      return `**${pokeName}**\n${details}`;
    }).join('\n\n');

    const embed = {
      title: '🚨 Triche détectée — Statistiques invalides',
      description: `Un joueur a tenté de lancer un combat avec des statistiques au-delà des limites autorisées.`,
      color: 0xED4245, // Rouge Discord
      fields: [
        {
          name: '👤 Joueur',
          value: [
            `**Pseudo IG :** ${playerName}`,
            playerUsername ? `**Pseudo chat :** @${playerUsername}` : null,
            discordId ? `**Discord ID :** \`${discordId}\`` : null,
          ].filter(Boolean).join('\n'),
          inline: false,
        },
        {
          name: '⚠️ Violations détectées',
          value: violationLines.slice(0, 1024), // Discord limit
          inline: false,
        },
        {
          name: '📋 Limites autorisées',
          value: '`IV ≤ 31` par stat\n`EV ≤ 252` par stat\n`EV total ≤ 510`',
          inline: true,
        },
        {
          name: '🎮 Contexte',
          value: 'Tour de Combat PvP\nBloqué avant le lancement du combat',
          inline: true,
        },
      ],
      thumbnail: avatarUrl ? { url: avatarUrl } : undefined,
      timestamp: new Date().toISOString(),
      footer: {
        text: 'PNW Battle Tower — Anti-Cheat System',
      },
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'PNW Anti-Cheat',
        avatar_url: 'https://cdn-icons-png.flaticon.com/512/6699/6699366.png',
        embeds: [embed],
      }),
    });

    if (!response.ok) {
      console.warn('⚠️ Discord webhook failed:', response.status, await response.text().catch(() => ''));
    }

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Erreur /api/report-cheat:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/config/contact-webhook', optionalAuth, (req, res) => {
  try {
    const data = getContactWebhookData();
    const webhookUrl = (data.webhookUrl || '').trim();
    const backgroundImage = (data.backgroundImage || '').trim();
    if (req.admin) {
      return res.json({ success: true, webhookUrl, backgroundImage, webhookConfigured: !!webhookUrl });
    }
    return res.json({
      success: true,
      webhookUrl: '',
      webhookUrlMasked: webhookUrl ? maskDiscordWebhookUrl(webhookUrl) : '',
      webhookConfigured: !!webhookUrl,
      backgroundImage,
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.put('/api/config/contact-webhook', requireAuth, (req, res) => {
  try {
    let { webhookUrl, backgroundImage } = req.body || {};
    const prev = getContactWebhookData();
    if (webhookUrl === undefined) {
      webhookUrl = (prev.webhookUrl || '').trim();
    } else {
      webhookUrl = typeof webhookUrl === 'string' ? webhookUrl.trim() : '';
    }
    if (backgroundImage === undefined) {
      backgroundImage = (prev.backgroundImage || '').trim();
    } else {
      backgroundImage = typeof backgroundImage === 'string' ? backgroundImage.trim() : '';
    }
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
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      return res.status(400).json({ success: false, error: 'Nom de configuration invalide' });
    }
    /** Évite de servir des JSON contenant des URLs de webhook via l’URL générique. */
    if (name === 'webhook' || name === 'contact-webhook' || name === 'discord-webhook') {
      return res.status(404).json({ success: false, error: 'Utiliser la route API dédiée.' });
    }
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
app.post('/api/config/:name', requireAuth, (req, res) => {
  try {
    const { name } = req.params;
    const { config } = req.body;

    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      return res.status(400).json({ success: false, error: 'Nom de configuration invalide' });
    }
    if (name === 'webhook' || name === 'contact-webhook' || name === 'discord-webhook') {
      return res.status(400).json({ success: false, error: 'Utiliser la route API dédiée pour ce fichier.' });
    }

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
app.post('/api/r2/start-upload', requireAuth, async (req, res) => {
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
app.post('/api/r2/get-presigned-urls', requireAuth, async (req, res) => {
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
app.post('/api/r2/complete-upload', requireAuth, async (req, res) => {
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
app.post('/api/r2/abort-upload', requireAuth, async (req, res) => {
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
app.get('/api/r2/list-multipart-uploads', requireAuth, async (req, res) => {
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
app.delete('/api/r2/object/:key', requireAuth, async (req, res) => {
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
app.get('/api/r2/list', requireAuth, async (req, res) => {
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

// GET /api/downloads/launcher-update — tauri-plugin-updater endpoint
// Retourne 200 + JSON si mise à jour dispo, 204 sinon.
app.get('/api/downloads/launcher-update', (req, res) => {
  try {
    const dl = getConfig('downloads') || {};
    const version = String(dl.launcherVersion || '').trim();
    const downloadUrl = String(dl.launcher || '').trim();
    const signature = String(dl.launcherSignature || '').trim();
    if (!version || !downloadUrl || !signature) {
      return res.status(204).end();
    }
    // Si current_version est fourni, comparer pour ne renvoyer que si plus récent
    const current = String(req.query.current_version || '').trim();
    if (current) {
      const cmp = compareSemver(current, version);
      if (cmp >= 0) {
        // Pas de mise à jour (version locale >= distante)
        return res.status(204).end();
      }
    }
    const notes = String(dl.launcherNotes || '').trim();
    res.json({
      version,
      url: downloadUrl,
      signature,
      notes,
      pub_date: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Erreur API /api/downloads/launcher-update:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/downloads/launcher-push — Appelé automatiquement par le script post-build du launcher.
// Met à jour la version, la signature et les notes sans toucher aux autres champs.
// Sécurisé par un token secret (env LAUNCHER_PUSH_TOKEN).
app.post('/api/downloads/launcher-push', (req, res) => {
  try {
    const token = (process.env.LAUNCHER_PUSH_TOKEN || '').trim();
    if (!token) {
      return res.status(503).json({ error: 'LAUNCHER_PUSH_TOKEN non configuré sur le serveur' });
    }
    const auth = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
    if (auth !== token) {
      return res.status(401).json({ error: 'Token invalide' });
    }
    const { version, signature, notes, launcherUrl } = req.body;
    if (!version || !signature) {
      return res.status(400).json({ error: 'version et signature sont requis' });
    }
    const dl = getConfig('downloads') || {};
    dl.launcherVersion = String(version).trim();
    dl.launcherSignature = String(signature).trim();
    if (notes !== undefined) {
      dl.launcherNotes = String(notes).trim();
    }
    if (launcherUrl) {
      dl.launcher = String(launcherUrl).trim();
    }
    const success = saveConfig('downloads', dl);
    if (!success) {
      return res.status(500).json({ error: 'Erreur lors de la sauvegarde' });
    }
    console.log(`✅ Launcher push: v${dl.launcherVersion} (signature ${dl.launcherSignature.slice(0, 20)}…)`);
    res.json({ success: true, version: dl.launcherVersion });
  } catch (error) {
    console.error('❌ Erreur API /api/downloads/launcher-push:', error);
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

app.post('/api/downloads', requireAuth, (req, res) => {
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

app.put('/api/download-page', requireAuth, (req, res) => {
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
app.put('/api/lore', requireAuth, (req, res) => {
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

app.post('/api/contact', contactLimiter, async (req, res) => {
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
app.put('/api/pokedex', requireAuth, (req, res) => {
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
app.put('/api/guide', requireAuth, (req, res) => {
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

// === BOSS API ===
// GET /api/boss - Lire les boss du jeu (toujours depuis src/config car pas d'admin editor)
app.get('/api/boss', (req, res) => {
  try {
    // Priorité : volume (modifié par l'admin), fallback vers src/config (repo)
    let raw = getConfig('boss');
    if (!raw) {
      const repoPath = path.join(__dirname, '../src/config/boss.json');
      if (fs.existsSync(repoPath)) {
        try { raw = fs.readJsonSync(repoPath); } catch { raw = { bosses: [] }; }
      } else {
        raw = { bosses: [] };
      }
    }
    const bossData = unwrapConfig(raw, 'boss');
    res.json({
      success: true,
      boss: {
        title: bossData.title || 'Boss du jeu',
        subtitle: bossData.subtitle || '',
        bosses: Array.isArray(bossData.bosses) ? bossData.bosses : [],
        background: bossData.background && String(bossData.background).trim() ? String(bossData.background).trim() : null
      }
    });
  } catch (error) {
    console.error('❌ Erreur API /api/boss:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/boss - Sauvegarder les boss
app.put('/api/boss', requireAuth, (req, res) => {
  try {
    const { title, subtitle, bosses, background } = req.body;
    const updated = {
      title: typeof title === 'string' ? title : 'Boss du jeu',
      subtitle: typeof subtitle === 'string' ? subtitle : '',
      bosses: Array.isArray(bosses) ? bosses : [],
      background: background && String(background).trim() ? String(background).trim() : null,
    };
    const opts = { spaces: 2 };
    fs.writeJsonSync(path.join(CONFIG_DIR, 'boss.json'), updated, opts);
    fs.ensureDirSync(SOURCE_CONFIG_DIR);
    fs.writeJsonSync(path.join(SOURCE_CONFIG_DIR, 'boss.json'), updated, opts);
    autoCommitConfig('boss.json');
    res.json({ success: true, message: 'Boss sauvegardés.', boss: updated });
  } catch (error) {
    console.error('❌ Erreur API PUT /api/boss:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// === BANLIST TOUR DE COMBAT API ===
// GET /api/banlist - Lire la banlist des Pokémons interdits en combat PvP
app.get('/api/banlist', (req, res) => {
  try {
    // Priorité : volume (modifié par l'admin), fallback vers src/config (repo)
    let raw = getConfig('banlist');
    if (!raw) {
      const repoPath = path.join(__dirname, '../src/config/banlist.json');
      if (fs.existsSync(repoPath)) {
        try { raw = fs.readJsonSync(repoPath); } catch { raw = { entries: [] }; }
      } else {
        raw = { entries: [] };
      }
    }
    const data = unwrapConfig(raw, 'banlist');
    res.json({
      success: true,
      banlist: {
        lastModified: data.lastModified || null,
        entries: Array.isArray(data.entries) ? data.entries : [],
      },
    });
  } catch (error) {
    console.error('❌ Erreur API /api/banlist:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/banlist - Sauvegarder la banlist
app.put('/api/banlist', requireAuth, (req, res) => {
  try {
    const { entries } = req.body;
    const cleanEntries = (Array.isArray(entries) ? entries : [])
      .map((e) => ({
        id: String(e?.id || `ban_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
        speciesId: Number(e?.speciesId) || 0,
        form: e?.form == null || e?.form === '' ? null : Number(e.form),
        name: String(e?.name || '').trim(),
        imageUrl: String(e?.imageUrl || '').trim(),
        reason: String(e?.reason || '').trim(),
      }))
      .filter((e) => e.speciesId > 0);

    const updated = {
      lastModified: new Date().toISOString(),
      entries: cleanEntries,
    };
    const opts = { spaces: 2 };
    fs.writeJsonSync(path.join(CONFIG_DIR, 'banlist.json'), updated, opts);
    fs.ensureDirSync(SOURCE_CONFIG_DIR);
    fs.writeJsonSync(path.join(SOURCE_CONFIG_DIR, 'banlist.json'), updated, opts);
    autoCommitConfig('banlist.json');
    res.json({ success: true, message: 'Banlist sauvegardée.', banlist: updated });
  } catch (error) {
    console.error('❌ Erreur API PUT /api/banlist:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/extradex - Sauvegarder l'Extradex (écrit dans extradex.json)
app.put('/api/extradex', requireAuth, (req, res) => {
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
app.put('/api/nerfs-and-buffs', requireAuth, (req, res) => {
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
app.put('/api/bst', requireAuth, (req, res) => {
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
app.put('/api/evs-location', requireAuth, (req, res) => {
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

// Aperçu chat (widget site, lecture seule — voir server/chatPublicPreview.js)
app.get('/api/chat/public-preview', handleChatPublicPreview);

// === SEO AUDIT API ===
import { GoogleAuth } from 'google-auth-library';

// PageSpeed Insights proxy (évite CORS)
app.get('/api/seo/pagespeed', requireAuth, async (req, res) => {
  try {
    const targetUrl = req.query.url || 'https://www.pokemonnewworld.fr';
    const strategy = req.query.strategy || 'mobile';
    const psiKey = process.env.PAGESPEED_API_KEY || '';
    let apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(targetUrl)}&category=performance&category=seo&category=accessibility&category=best-practices&strategy=${strategy}`;
    if (psiKey) apiUrl += `&key=${psiKey}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    const response = await fetch(apiUrl, { signal: controller.signal });
    clearTimeout(timeout);

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch {
      return res.status(502).json({ success: false, error: 'Réponse invalide de PageSpeed API' });
    }

    if (data.error) {
      return res.status(502).json({ success: false, error: data.error.message || 'Erreur PageSpeed API' });
    }

    const cats = data.lighthouseResult?.categories || {};
    const audits = data.lighthouseResult?.audits || {};

    const scores = {
      performance: Math.round((cats.performance?.score || 0) * 100),
      seo: Math.round((cats.seo?.score || 0) * 100),
      accessibility: Math.round((cats.accessibility?.score || 0) * 100),
      bestPractices: Math.round((cats['best-practices']?.score || 0) * 100),
    };

    const webVitals = {
      lcp: { value: audits['largest-contentful-paint']?.displayValue || '—', score: audits['largest-contentful-paint']?.score },
      fid: { value: audits['max-potential-fid']?.displayValue || audits['total-blocking-time']?.displayValue || '—', score: audits['total-blocking-time']?.score },
      cls: { value: audits['cumulative-layout-shift']?.displayValue || '—', score: audits['cumulative-layout-shift']?.score },
      fcp: { value: audits['first-contentful-paint']?.displayValue || '—', score: audits['first-contentful-paint']?.score },
      ttfb: { value: audits['server-response-time']?.displayValue || '—', score: audits['server-response-time']?.score },
      si: { value: audits['speed-index']?.displayValue || '—', score: audits['speed-index']?.score },
    };

    res.json({ success: true, scores, webVitals, strategy, url: targetUrl });
  } catch (error) {
    console.error('❌ Erreur API /api/seo/pagespeed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Audit SEO interne (analyse les configs SPA au lieu de fetch HTML)
app.get('/api/seo/audit', requireAuth, async (req, res) => {
  try {
    const baseUrl = 'https://www.pokemonnewworld.fr';

    // Lire translations.json pour les meta descriptions/titles
    const translationsPath = path.join(SOURCE_CONFIG_DIR, 'translations.json');
    let translations = {};
    try { translations = fs.readJsonSync(translationsPath); } catch {}
    const frSeo = translations.fr?.seo || {};
    const frPages = frSeo.pages || {};

    // Pages et leur clé dans translations.json
    const pageMap = [
      { page: '/', key: null, label: 'Accueil' },
      { page: '/patchnotes', key: 'patchnotes' },
      { page: '/pokedex', key: 'pokedex' },
      { page: '/extradex', key: 'extradex' },
      { page: '/guide', key: 'guide' },
      { page: '/boss', key: 'boss' },
      { page: '/lore', key: 'lore' },
      { page: '/bst', key: 'bst' },
      { page: '/item-location', key: 'itemLocation' },
      { page: '/equipe', key: 'team' },
      { page: '/evs-location', key: 'evsLocation' },
      { page: '/nerfs-and-buffs', key: 'nerfsAndBuffs' },
      { page: '/contact', key: 'contact' },
      { page: '/telechargement', key: 'download' },
    ];

    const results = pageMap.map(({ page, key, label }) => {
      const seo = key ? frPages[key] : { title: frSeo.title, description: frSeo.description };
      const title = seo?.title || '';
      const description = seo?.description || '';

      const issues = [];
      if (!title) issues.push('Titre manquant');
      else if (title.length > 60) issues.push(`Titre long (${title.length}/60)`);
      if (!description) issues.push('Description manquante');
      else if (description.length < 120) issues.push(`Description courte (${description.length}/120)`);
      else if (description.length > 160) issues.push(`Description longue (${description.length}/160)`);
      if (!key && page === '/') {
        // Page d'accueil : vérifier keywords
        if (!frSeo.keywords || frSeo.keywords.length === 0) issues.push('Keywords manquants');
      }

      return {
        page,
        label: label || seo?.title?.split('•')[0]?.trim() || page,
        status: 200,
        title,
        titleLen: title.length,
        description,
        descLen: description.length,
        ogTitle: true, // pageSeo.js injecte og:title pour toutes les pages
        ogImage: true, // pageSeo.js injecte og:image pour toutes les pages
        canonical: true, // pageSeo.js injecte canonical pour toutes les pages
        h1Count: 1, // chaque page a un H1 (vérifié manuellement lors de l'audit)
        issues,
      };
    });

    // Vérifier robots.txt, sitemap, manifest côté serveur (fichiers locaux)
    const checks = {};
    const distDir = path.join(PROJECT_ROOT, 'dist');
    checks.robotsTxt = fs.existsSync(path.join(distDir, 'robots.txt')) || fs.existsSync(path.join(PROJECT_ROOT, 'public/robots.txt'));
    checks.manifest = fs.existsSync(path.join(distDir, 'manifest.webmanifest')) || fs.existsSync(path.join(PROJECT_ROOT, 'public/manifest.webmanifest'));

    // Sitemap dynamique : compter les pages
    const loreData = getConfig('lore');
    const loreSlugs = (loreData?.stories || []).filter(s => s.slug);
    checks.sitemap = true; // route dynamique toujours active
    checks.sitemapPages = 14 + loreSlugs.length;

    // Vérifier index.html pour les meta statiques
    const indexPath = path.join(distDir, 'index.html') || path.join(PROJECT_ROOT, 'index.html');
    let indexChecks = {};
    try {
      const html = fs.readFileSync(fs.existsSync(path.join(distDir, 'index.html')) ? path.join(distDir, 'index.html') : path.join(PROJECT_ROOT, 'index.html'), 'utf-8');
      indexChecks.hasOgUrl = /og:url/.test(html);
      indexChecks.hasOgImage = /og:image/.test(html);
      indexChecks.hasTwitterCard = /twitter:card/.test(html);
      indexChecks.hasJsonLd = /application\/ld\+json/.test(html);
      indexChecks.hasManifestLink = /manifest/.test(html);
      indexChecks.hasAppleTouchIcon = /apple-touch-icon/.test(html);
      indexChecks.hasPreload = /rel="preload"/.test(html);
    } catch {}

    res.json({ success: true, pages: results, checks, indexChecks, baseUrl });
  } catch (error) {
    console.error('❌ Erreur API /api/seo/audit:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Google Search Console API
app.get('/api/seo/search-console', requireAuth, async (req, res) => {
  try {
    const keyJson = process.env.GSC_SERVICE_ACCOUNT_KEY;
    if (!keyJson) {
      return res.status(400).json({ success: false, error: 'Variable GSC_SERVICE_ACCOUNT_KEY non configurée sur le serveur.' });
    }

    let credentials;
    try { credentials = JSON.parse(keyJson); } catch {
      return res.status(400).json({ success: false, error: 'GSC_SERVICE_ACCOUNT_KEY JSON invalide.' });
    }

    const auth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    });
    const client = await auth.getClient();
    const siteUrl = 'https://www.pokemonnewworld.fr/';
    const days = parseInt(req.query.days) || 28;

    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 1);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days);
    const fmt = (d) => d.toISOString().split('T')[0];

    // Requêtes en parallèle : par page + par query
    const [pagesRes, queriesRes, totalRes] = await Promise.all([
      client.request({
        url: `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
        method: 'POST',
        data: {
          startDate: fmt(startDate), endDate: fmt(endDate),
          dimensions: ['page'], rowLimit: 25,
        },
      }),
      client.request({
        url: `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
        method: 'POST',
        data: {
          startDate: fmt(startDate), endDate: fmt(endDate),
          dimensions: ['query'], rowLimit: 20,
        },
      }),
      client.request({
        url: `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
        method: 'POST',
        data: {
          startDate: fmt(startDate), endDate: fmt(endDate),
          dimensions: ['date'],
        },
      }),
    ]);

    const pages = (pagesRes.data.rows || []).map(r => ({
      page: r.keys[0].replace(siteUrl.replace(/\/$/, ''), '') || '/',
      clicks: r.clicks, impressions: r.impressions,
      ctr: Math.round(r.ctr * 1000) / 10,
      position: Math.round(r.position * 10) / 10,
    }));

    const queries = (queriesRes.data.rows || []).map(r => ({
      query: r.keys[0],
      clicks: r.clicks, impressions: r.impressions,
      ctr: Math.round(r.ctr * 1000) / 10,
      position: Math.round(r.position * 10) / 10,
    }));

    const timeline = (totalRes.data.rows || []).map(r => ({
      date: r.keys[0], clicks: r.clicks, impressions: r.impressions,
    }));

    const totals = {
      clicks: pages.reduce((s, p) => s + p.clicks, 0),
      impressions: pages.reduce((s, p) => s + p.impressions, 0),
    };
    totals.ctr = totals.impressions > 0 ? Math.round((totals.clicks / totals.impressions) * 1000) / 10 : 0;

    res.json({ success: true, pages, queries, timeline, totals, days, startDate: fmt(startDate), endDate: fmt(endDate) });
  } catch (error) {
    console.error('❌ Erreur API /api/seo/search-console:', error);
    const msg = error.response?.data?.error?.message || error.message;
    res.status(500).json({ success: false, error: msg });
  }
});

// === SITEMAP XML DYNAMIQUE ===
const SITE_URL = 'https://www.pokemonnewworld.fr';
const STATIC_ROUTES = [
  '/', '/patchnotes', '/pokedex', '/extradex', '/guide', '/lore',
  '/bst', '/item-location', '/equipe', '/evs-location',
  '/nerfs-and-buffs', '/contact', '/telechargement', '/boss',
];

app.get('/sitemap.xml', (req, res) => {
  try {
    const loreData = getConfig('lore');
    const loreSlugs = (loreData?.stories || [])
      .filter(s => s.slug)
      .map(s => `/lore/${s.slug}`);

    const allRoutes = [...STATIC_ROUTES, ...loreSlugs];
    const today = new Date().toISOString().split('T')[0];

    const urls = allRoutes.map(route => {
      const priority = route === '/' ? '1.0' : route.startsWith('/lore/') ? '0.6' : '0.8';
      const changefreq = route === '/patchnotes' ? 'weekly' : 'monthly';
      return `  <url>
    <loc>${SITE_URL}${route}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
    }).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch (error) {
    console.error('❌ Erreur génération sitemap:', error);
    res.status(500).send('Erreur génération sitemap');
  }
});

// Servir le frontend React (build Vite) en production — doit être en dernier
const DIST_DIR = path.join(__dirname, '../dist');
if (fs.existsSync(DIST_DIR)) {
  // Assets Vite (hachés) : cache longue durée ; index.html : pas de cache
  app.use(express.static(DIST_DIR, {
    maxAge: '1y',
    immutable: true,
    setHeaders(res, filePath) {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  }));
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

  startWebhookInterval();
});

export default app;