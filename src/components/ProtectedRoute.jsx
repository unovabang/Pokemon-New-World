import { useAuth0 } from "@auth0/auth0-react";
import { useState } from "react";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth0();
  const [accessCode, setAccessCode] = useState("");
  const [isCodeVerified, setIsCodeVerified] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [isAdminVerified, setIsAdminVerified] = useState(false);

  // Définir les credentials admin (en production, ces données seraient stockées de manière sécurisée)
  const ADMIN_EMAIL = "admin@pokemonnewworld.com";
  const ADMIN_PASSWORD = "AdminPNW2024!";
  const ADMIN_CODE = "1234";

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: 'var(--bg-dark)',
        color: 'white'
      }}>
        <div>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem', marginBottom: '1rem' }}></i>
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: 'var(--bg-dark)',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h2>Accès non autorisé</h2>
          <p>Vous devez vous connecter pour accéder à cette page.</p>
          <a href="/" className="btn btn-primary">
            <i className="fa-solid fa-home"></i> Retour à l'accueil
          </a>
        </div>
      </div>
    );
  }

  // Vérification des credentials admin
  if (!isAdminVerified) {
    const handleAdminSubmit = (e) => {
      e.preventDefault();
      if (adminEmail === ADMIN_EMAIL && adminPassword === ADMIN_PASSWORD) {
        setIsAdminVerified(true);
      } else {
        alert("Email ou mot de passe administrateur incorrect");
      }
    };

    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: 'var(--bg-dark)',
        color: 'white'
      }}>
        <div style={{ 
          background: 'rgba(255,255,255,0.1)', 
          padding: '2rem', 
          borderRadius: '10px', 
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.2)',
          maxWidth: '400px',
          width: '100%'
        }}>
          <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <i className="fa-solid fa-shield-halved"></i> Vérification Administrateur
          </h2>
          <form onSubmit={handleAdminSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Email Administrateur:</label>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '5px',
                  border: '1px solid rgba(255,255,255,0.3)',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white'
                }}
                placeholder="admin@pokemonnewworld.com"
              />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Mot de passe Administrateur:</label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '5px',
                  border: '1px solid rgba(255,255,255,0.3)',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white'
                }}
                placeholder="••••••••••"
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              <i className="fa-solid fa-key"></i> Vérifier
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Vérification du code à 4 chiffres
  if (!isCodeVerified) {
    const handleCodeSubmit = (e) => {
      e.preventDefault();
      if (accessCode === ADMIN_CODE) {
        setIsCodeVerified(true);
      } else {
        alert("Code d'accès incorrect");
        setAccessCode("");
      }
    };

    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: 'var(--bg-dark)',
        color: 'white'
      }}>
        <div style={{ 
          background: 'rgba(255,255,255,0.1)', 
          padding: '2rem', 
          borderRadius: '10px', 
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.2)',
          textAlign: 'center',
          maxWidth: '400px',
          width: '100%'
        }}>
          <h2 style={{ marginBottom: '1rem' }}>
            <i className="fa-solid fa-lock"></i> Code d'Accès
          </h2>
          <p style={{ marginBottom: '2rem', opacity: 0.8 }}>
            Bonjour {user?.name}!<br/>
            Entrez le code d'accès administrateur (4 chiffres)
          </p>
          <form onSubmit={handleCodeSubmit}>
            <input
              type="text"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="••••"
              maxLength="4"
              required
              style={{
                width: '120px',
                padding: '1rem',
                fontSize: '1.5rem',
                textAlign: 'center',
                borderRadius: '10px',
                border: '2px solid rgba(255,255,255,0.3)',
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                letterSpacing: '0.5rem',
                marginBottom: '1.5rem'
              }}
            />
            <br/>
            <button type="submit" className="btn btn-primary">
              <i className="fa-solid fa-check"></i> Valider
            </button>
          </form>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;