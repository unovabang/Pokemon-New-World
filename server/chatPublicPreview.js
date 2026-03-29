/**
 * Aperçu public du chat (lecture seule) pour le widget site.
 * Configure SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (recommandé) ou SUPABASE_ANON_KEY
 * si les politiques RLS autorisent SELECT anonyme sur messages/profiles.
 * Optionnel : PNW_PUBLIC_CHAT_CHANNEL_ID (nombre) pour forcer le salon.
 */

const LOG_PREFIX = "📋LOG:";

async function supabaseGet(pathWithQuery) {
  const base = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_KEY ||
    "";
  if (!base || !key) return { ok: false, status: 0, body: null };

  const url = `${base}/rest/v1/${pathWithQuery}`;
  const res = await fetch(url, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, status: res.status, body: text };
  }
  const data = await res.json();
  return { ok: true, status: res.status, body: data };
}

export async function handleChatPublicPreview(_req, res) {
  try {
    const base = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
    const hasKey = !!(
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.SUPABASE_KEY
    );

    if (!base || !hasKey) {
      return res.json({
        success: true,
        configured: false,
        channelName: "",
        messages: [],
      });
    }

    let channelId = null;
    let channelName = "";
    const forced = process.env.PNW_PUBLIC_CHAT_CHANNEL_ID;
    if (forced && String(forced).trim() !== "") {
      channelId = Number.parseInt(String(forced).trim(), 10);
      if (Number.isNaN(channelId)) channelId = null;
    }

    if (channelId == null) {
      const ch = await supabaseGet(
        "channels?type=eq.public&select=id,name&order=id.asc&limit=1"
      );
      if (!ch.ok) {
        console.warn("[chat public-preview] channels HTTP:", ch.status, ch.body);
        const hint =
          ch.status === 401 || ch.status === 403
            ? " Clé refusée ou RLS : ajoute SUPABASE_SERVICE_ROLE_KEY sur Railway (la clé publishable seule ne suffit souvent pas)."
            : "";
        return res.json({
          success: true,
          configured: true,
          channelName: "",
          messages: [],
          error: `Impossible de lire la liste des salons (${ch.status || "erreur"}).${hint}`,
        });
      }
      if (!Array.isArray(ch.body) || !ch.body.length) {
        console.warn("[chat public-preview] channels: liste vide (RLS ou aucun type « public »)");
        return res.json({
          success: true,
          configured: true,
          channelName: "",
          messages: [],
          error:
            "Aucun salon « public » visible avec cette clé. Sur Railway, ajoute SUPABASE_SERVICE_ROLE_KEY (clé secrète sb_secret_…), ou définis PNW_PUBLIC_CHAT_CHANNEL_ID avec l’id numérique du salon (visible dans Supabase → Table Editor → channels).",
        });
      }
      channelId = ch.body[0].id;
      channelName = ch.body[0].name || "";
    } else {
      const meta = await supabaseGet(
        `channels?id=eq.${channelId}&select=id,name&limit=1`
      );
      if (meta.ok && Array.isArray(meta.body) && meta.body[0]) {
        channelName = meta.body[0].name || "";
      }
    }

    const msg = await supabaseGet(
      `messages?select=id,content,created_at,user_id,profiles(username,display_name,avatar_url)&channel_id=eq.${channelId}&order=created_at.desc&limit=60`
    );
    if (!msg.ok) {
      console.warn("[chat public-preview] messages:", msg.status, msg.body);
      return res.status(502).json({
        success: false,
        configured: true,
        error: "Impossible de lire les messages (droits Supabase ou clé).",
        messages: [],
      });
    }

    const rows = Array.isArray(msg.body) ? msg.body : [];
    const filtered = rows.filter((r) => {
      const c = typeof r.content === "string" ? r.content.trim() : "";
      return c && !c.startsWith(LOG_PREFIX);
    });
    filtered.reverse();

    return res.json({
      success: true,
      configured: true,
      channelName,
      messages: filtered,
    });
  } catch (e) {
    console.error("[chat public-preview]", e);
    return res.status(500).json({
      success: false,
      error: e.message || "Erreur serveur",
      messages: [],
    });
  }
}
