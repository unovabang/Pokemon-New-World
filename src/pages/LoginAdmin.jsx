import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const LoginAdmin = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/admin");
    } catch (err) {
      setError(err.message || "Identifiants incorrects");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-admin-page">
      <div className="login-admin-card">
        <div className="login-admin-header">
          <i className="fa-solid fa-shield-halved login-admin-icon" aria-hidden />
          <h1>Connexion Administrateur</h1>
          <p>Pokémon New World — Panneau d'Administration</p>
        </div>

        <form onSubmit={handleSubmit} className="login-admin-form">
          {error && (
            <div className="login-admin-error" role="alert">
              {error}
            </div>
          )}
          <div className="login-admin-field">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@pokemonnewworld.com"
              autoComplete="email"
            />
          </div>
          <div className="login-admin-field">
            <label htmlFor="login-password">Mot de passe</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••••"
              autoComplete="current-password"
            />
          </div>
          <div className="login-admin-submit-wrap">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? (
                <><i className="fa-solid fa-spinner fa-spin" aria-hidden /> Connexion...</>
              ) : (
                <><i className="fa-solid fa-right-to-bracket" aria-hidden /> Se connecter</>
              )}
            </button>
          </div>
        </form>

        <div className="login-admin-footer">
          <a href="/" className="btn btn-ghost">
            <i className="fa-solid fa-house" aria-hidden /> Retour à l'accueil
          </a>
        </div>
      </div>
    </div>
  );
};

export default LoginAdmin;
