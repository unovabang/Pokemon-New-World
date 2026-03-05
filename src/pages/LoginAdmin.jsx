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
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'var(--bg-dark)',
      color: 'white'
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        padding: '3rem',
        borderRadius: '15px',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.2)',
        maxWidth: '500px',
        width: '100%'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <i className="fa-solid fa-shield-halved" style={{ fontSize: '3rem', color: 'var(--accent)', marginBottom: '1rem' }}></i>
          <h1 style={{ marginBottom: '0.5rem' }}>Connexion Administrateur</h1>
          <p style={{ opacity: 0.8 }}>Pokémon New World - Panneau d'Administration</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{
              marginBottom: '1rem',
              padding: '0.75rem',
              background: 'rgba(239,68,68,0.2)',
              borderRadius: '8px',
              color: '#fca5a5',
              fontSize: '0.95rem'
            }}>
              {error}
            </div>
          )}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.3)',
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                fontSize: '1rem'
              }}
              placeholder="admin@pokemonnewworld.com"
            />
          </div>
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.3)',
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                fontSize: '1rem'
              }}
              placeholder="••••••••••"
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '1rem' }}
            disabled={submitting}
          >
            {submitting ? <><i className="fa-solid fa-spinner fa-spin"></i> Connexion...</> : <><i className="fa-solid fa-sign-in-alt"></i> Se connecter</>}
          </button>
        </form>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '1.5rem', marginTop: '2rem', textAlign: 'center' }}>
          <a href="/" className="btn btn-ghost">
            <i className="fa-solid fa-home"></i> Retour à l'accueil
          </a>
        </div>
      </div>
    </div>
  );
};

export default LoginAdmin;
