import pg from 'pg';
const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;
const pool = connectionString
  ? new Pool({ connectionString, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false })
  : null;

export async function getPool() {
  return pool;
}

export async function query(text, params) {
  if (!pool) throw new Error('DATABASE_URL (ou DATABASE_PUBLIC_URL) non configurée');
  return pool.query(text, params);
}

export async function initDb() {
  if (!pool) {
    console.warn('⚠️ Base de données non configurée (DATABASE_URL manquant). Auth et logs désactivés.');
    return false;
  }
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS connection_logs (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL,
        ip TEXT,
        user_agent TEXT,
        success BOOLEAN NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_connection_logs_created_at ON connection_logs(created_at DESC);`);
    await query(`
      CREATE TABLE IF NOT EXISTS banlist_entries (
        id TEXT PRIMARY KEY,
        species_id INTEGER NOT NULL,
        form INTEGER,
        name TEXT NOT NULL,
        image_url TEXT,
        reason TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_banlist_species ON banlist_entries(species_id, form);`);
    console.log('✅ Tables admins, connection_logs et banlist_entries prêtes.');

    const seedEmail = process.env.SEED_ADMIN_EMAIL;
    const seedPassword = process.env.SEED_ADMIN_PASSWORD;
    if (seedEmail && seedPassword) {
      const bcrypt = await import('bcrypt');
      const hash = await bcrypt.hash(seedPassword, 10);
      await query(
        `INSERT INTO admins (email, password_hash, name) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING`,
        [seedEmail, hash, 'Admin']
      );
      console.log('✅ Compte admin de seed vérifié/créé.');
    }
    return true;
  } catch (err) {
    console.error('❌ Erreur init DB:', err.message);
    return false;
  }
}

export default { getPool, query, initDb };
