import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from './db.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production-pnw';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';

function getClientInfo(req) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '';
  const userAgent = req.headers['user-agent'] || '';
  return { ip, userAgent };
}

function createToken(admin) {
  return jwt.sign(
    { id: admin.id, email: admin.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ success: false, error: 'Token manquant' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.admin = payload;
    next();
  } catch (e) {
    return res.status(401).json({ success: false, error: 'Token invalide ou expiré' });
  }
}

// POST /api/auth/login — Connexion admin + enregistrement du log
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const { ip, userAgent } = getClientInfo(req);

    if (!email || !password) {
      await logConnection(null, ip, userAgent, false);
      return res.status(400).json({ success: false, error: 'Email et mot de passe requis' });
    }

    const result = await query('SELECT id, email, password_hash, name FROM admins WHERE email = $1', [email]);
    const admin = result.rows[0];

    if (!admin) {
      await logConnection(email, ip, userAgent, false);
      return res.status(401).json({ success: false, error: 'Identifiants incorrects' });
    }

    const ok = await bcrypt.compare(password, admin.password_hash);
    if (!ok) {
      await logConnection(email, ip, userAgent, false);
      return res.status(401).json({ success: false, error: 'Identifiants incorrects' });
    }

    await logConnection(email, ip, userAgent, true);
    const token = createToken(admin);
    return res.json({
      success: true,
      token,
      admin: { id: admin.id, email: admin.email, name: admin.name }
    });
  } catch (err) {
    console.error('Erreur login:', err);
    return res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

async function logConnection(email, ip, userAgent, success) {
  try {
    await query(
      `INSERT INTO connection_logs (email, ip, user_agent, success) VALUES ($1, $2, $3, $4)`,
      [email || 'inconnu', ip, userAgent, success]
    );
  } catch (e) {
    console.error('Erreur écriture log connexion:', e.message);
  }
}

// GET /api/auth/me — Vérifier le token et renvoyer l'admin
router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await query('SELECT id, email, name FROM admins WHERE id = $1', [req.admin.id]);
    const admin = result.rows[0];
    if (!admin) return res.status(401).json({ success: false, error: 'Admin introuvable' });
    return res.json({ success: true, admin });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// GET /api/auth/logs — Liste des logs de connexion (réservé admin)
router.get('/logs', requireAuth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
    const result = await query(
      `SELECT id, email, ip, user_agent, success, created_at FROM connection_logs ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    return res.json({ success: true, logs: result.rows });
  } catch (err) {
    console.error('Erreur récupération logs:', err);
    return res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

export default router;
