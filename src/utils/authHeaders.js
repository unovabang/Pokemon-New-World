/**
 * Retourne les headers d'authentification pour les requêtes admin.
 * À utiliser avec le spread operator dans les options de fetch :
 *   fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeaders() } })
 */
export function authHeaders() {
  const token = localStorage.getItem('admin_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}
