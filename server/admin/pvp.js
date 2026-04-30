import express from 'express';
import { requireAuth } from '../auth.js';
import { supabaseAdmin, isSupabaseAdminConfigured } from '../supabaseAdmin.js';

const router = express.Router();

router.use(requireAuth);

router.use((req, res, next) => {
  if (!isSupabaseAdminConfigured()) {
    return res.status(503).json({
      success: false,
      error: 'SUPABASE_SERVICE_ROLE_KEY is not configured on the server.',
    });
  }
  next();
});

function adminEmail(req) {
  return req.admin?.email || null;
}

function clamp(n, min, max) {
  const v = parseInt(String(n), 10);
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, v));
}

router.get('/stats', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin().rpc('admin_pvp_stats');
    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.json({ success: true, stats: data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/matches', async (req, res) => {
  try {
    const limit = clamp(req.query.limit, 1, 200);
    const offset = clamp(req.query.offset ?? 0, 0, 1_000_000);
    const userId = req.query.user_id || null;
    const matchType = req.query.match_type || null;
    const fromDate = req.query.from_date || null;
    const toDate = req.query.to_date || null;

    if (matchType && !['amical', 'ranked'].includes(matchType)) {
      return res.status(400).json({ success: false, error: 'invalid_match_type' });
    }

    const { data, error } = await supabaseAdmin().rpc('admin_pvp_match_history', {
      p_limit: limit,
      p_offset: offset,
      p_user_id: userId,
      p_match_type: matchType,
      p_from_date: fromDate,
      p_to_date: toDate,
    });
    if (error) return res.status(500).json({ success: false, error: error.message });

    const totalCount = data?.[0]?.total_count ?? 0;
    return res.json({
      success: true,
      matches: data || [],
      total: Number(totalCount),
      limit,
      offset,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/matches/:room_code/cancel', async (req, res) => {
  try {
    const roomCode = req.params.room_code;
    const reason = (req.body?.reason || '').trim();

    if (!roomCode) {
      return res.status(400).json({ success: false, error: 'invalid_room_code' });
    }

    const { data, error } = await supabaseAdmin().rpc('admin_cancel_match', {
      p_room_code: roomCode,
      p_admin_id: null,
      p_admin_email: adminEmail(req),
      p_reason: reason,
    });
    if (error) return res.status(500).json({ success: false, error: error.message });

    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.success) {
      return res.status(404).json({ success: false, error: row?.message || 'cancel_failed' });
    }
    return res.json({ success: true, rows_affected: row.rows_affected });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/players', async (req, res) => {
  try {
    const query = req.query.q ? String(req.query.q) : '';
    const limit = clamp(req.query.limit, 1, 100);

    const { data, error } = await supabaseAdmin().rpc('admin_pvp_player_search', {
      p_query: query,
      p_limit: limit,
    });
    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.json({ success: true, players: data || [] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/players/:user_id/reset-rank', async (req, res) => {
  try {
    const userId = req.params.user_id;
    const reason = (req.body?.reason || '').trim();
    const resetCounters = Boolean(req.body?.reset_counters);

    if (!userId) {
      return res.status(400).json({ success: false, error: 'invalid_user_id' });
    }

    const { data, error } = await supabaseAdmin().rpc('admin_reset_player_rank', {
      p_user_id: userId,
      p_admin_id: null,
      p_admin_email: adminEmail(req),
      p_reason: reason,
      p_reset_counters: resetCounters,
    });
    if (error) return res.status(500).json({ success: false, error: error.message });

    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.success) {
      return res.status(400).json({ success: false, error: row?.message || 'reset_failed' });
    }
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

const VALID_TIERS = [
  'unranked', 'iron', 'bronze', 'silver', 'gold', 'platinum',
  'emerald', 'diamond', 'master', 'grandmaster', 'challenger',
];

router.post('/players/:user_id/set-rank', async (req, res) => {
  try {
    const userId = req.params.user_id;
    const tier = req.body?.tier;
    const lp = parseInt(req.body?.lp, 10);
    const mmr = parseInt(req.body?.mmr, 10);
    const reason = (req.body?.reason || '').trim();

    if (!userId) return res.status(400).json({ success: false, error: 'invalid_user_id' });
    if (!VALID_TIERS.includes(tier)) return res.status(400).json({ success: false, error: 'invalid_tier' });
    if (!Number.isFinite(lp) || lp < 0) return res.status(400).json({ success: false, error: 'invalid_lp' });
    if (!Number.isFinite(mmr) || mmr < 0) return res.status(400).json({ success: false, error: 'invalid_mmr' });

    const { data, error } = await supabaseAdmin().rpc('admin_set_player_rank', {
      p_user_id: userId,
      p_admin_id: null,
      p_admin_email: adminEmail(req),
      p_tier: tier,
      p_lp: lp,
      p_mmr: mmr,
      p_reason: reason,
    });
    if (error) return res.status(500).json({ success: false, error: error.message });

    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.success) {
      return res.status(400).json({ success: false, error: row?.message || 'set_rank_failed' });
    }
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/players/:user_id/ban', async (req, res) => {
  try {
    const userId = req.params.user_id;
    const reason = (req.body?.reason || '').trim();
    const expiresAt = req.body?.expires_at || null;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'invalid_user_id' });
    }
    if (!reason) {
      return res.status(400).json({ success: false, error: 'reason_required' });
    }
    if (expiresAt && Number.isNaN(Date.parse(expiresAt))) {
      return res.status(400).json({ success: false, error: 'invalid_expires_at' });
    }

    const { data, error } = await supabaseAdmin().rpc('admin_ban_player_pvp', {
      p_user_id: userId,
      p_admin_id: null,
      p_admin_email: adminEmail(req),
      p_reason: reason,
      p_expires_at: expiresAt,
    });
    if (error) return res.status(500).json({ success: false, error: error.message });

    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.success) {
      return res.status(400).json({ success: false, error: row?.message || 'ban_failed' });
    }
    return res.json({ success: true, ban_id: row.ban_id });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/bans', async (req, res) => {
  try {
    const limit = clamp(req.query.limit, 1, 200);
    const offset = clamp(req.query.offset ?? 0, 0, 1_000_000);

    const { data, error } = await supabaseAdmin().rpc('admin_pvp_active_bans', {
      p_limit: limit,
      p_offset: offset,
    });
    if (error) return res.status(500).json({ success: false, error: error.message });

    const totalCount = data?.[0]?.total_count ?? 0;
    return res.json({
      success: true,
      bans: data || [],
      total: Number(totalCount),
      limit,
      offset,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/bans/:ban_id', async (req, res) => {
  try {
    const banId = parseInt(req.params.ban_id, 10);
    if (!Number.isFinite(banId) || banId <= 0) {
      return res.status(400).json({ success: false, error: 'invalid_ban_id' });
    }

    const { data, error } = await supabaseAdmin().rpc('admin_unban_player_pvp', {
      p_ban_id: banId,
      p_admin_id: null,
      p_admin_email: adminEmail(req),
    });
    if (error) return res.status(500).json({ success: false, error: error.message });

    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.success) {
      return res.status(404).json({ success: false, error: row?.message || 'unban_failed' });
    }
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/audit-log', async (req, res) => {
  try {
    const limit = clamp(req.query.limit, 1, 200);
    const offset = clamp(req.query.offset ?? 0, 0, 1_000_000);
    const action = req.query.action || null;
    const targetUserId = req.query.target_user_id || null;

    const { data, error } = await supabaseAdmin().rpc('admin_pvp_audit_log', {
      p_limit: limit,
      p_offset: offset,
      p_action: action,
      p_target_user_id: targetUserId,
    });
    if (error) return res.status(500).json({ success: false, error: error.message });

    const totalCount = data?.[0]?.total_count ?? 0;
    return res.json({
      success: true,
      entries: data || [],
      total: Number(totalCount),
      limit,
      offset,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
