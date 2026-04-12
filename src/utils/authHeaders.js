/**
 * Headers d'authentification pour les requêtes admin.
 * L'authentification est gérée par cookies httpOnly (envoyés automatiquement en same-origin).
 */
export function authHeaders() {
  return {};
}

/**
 * Envoie les cookies sur les appels `fetch` (requis si l’API est sur un autre domaine avec CORS credentials).
 * À fusionner dans le 2ᵉ argument de `fetch`.
 */
export function credentialsInit(init = {}) {
  return { credentials: "include", ...init };
}
