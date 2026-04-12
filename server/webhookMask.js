const DISCORD_WEBHOOK_PREFIX = "https://discord.com/api/webhooks/";

/**
 * Indique si l’URL ressemble à un webhook Discord (hors fuite du token).
 */
export function isDiscordWebhookUrl(url) {
  const u = String(url || "").trim();
  return u.startsWith(DISCORD_WEBHOOK_PREFIX);
}

/**
 * Forme affichable sans exposer le token (réponse GET publique).
 */
export function maskDiscordWebhookUrl(url) {
  const u = String(url || "").trim();
  if (!u) return "";
  if (!isDiscordWebhookUrl(u)) return "•••• (URL non Discord)";
  try {
    const noQuery = u.split("?")[0];
    const rest = noQuery.slice(DISCORD_WEBHOOK_PREFIX.length);
    const [id] = rest.split("/");
    if (id && /^\d+$/.test(id)) {
      return `${DISCORD_WEBHOOK_PREFIX}${id}/••••••••`;
    }
  } catch {
    /* ignore */
  }
  return `${DISCORD_WEBHOOK_PREFIX}••••/••••••••`;
}
