import { useAuth0 } from "@auth0/auth0-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const LoginAdmin = () => {
  const { loginWithRedirect, isAuthenticated, isLoading, user } = useAuth0();
  const [accessCode, setAccessCode] = useState("");
  const [isCodeVerified, setIsCodeVerified] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [isAdminVerified, setIsAdminVerified] = useState(false);
  const navigate = useNavigate();

  // Définir les credentials admin
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
        <div style={{ textAlign: 'center' }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem', marginBottom: '1rem' }}></i>
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  // Si pas connecté via Auth0, proposer la connexion
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
        <div style={{ 
          background: 'rgba(255,255,255,0.1)', 
          padding: '3rem', 
          borderRadius: '15px', 
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.2)',
          textAlign: 'center',
          maxWidth: '500px',
          width: '100%'
        }}>
          <div style={{ marginBottom: '2rem' }}>
            <i className="fa-solid fa-shield-halved" style={{ fontSize: '3rem', color: 'var(--accent)', marginBottom: '1rem' }}></i>
            <h1 style={{ marginBottom: '0.5rem' }}>Connexion Administrateur</h1>
            <p style={{ opacity: 0.8 }}>Pokémon New World - Panneau d'Administration</p>
          </div>
          
          <div style={{ marginBottom: '2rem' }}>
            <p style={{ marginBottom: '1.5rem' }}>Étape 1/3 : Authentification OAuth</p>
            <button 
              className="btn btn-primary"
              onClick={() => loginWithRedirect()}
              style={{ 
                width: '100%',
                padding: '1rem',
                fontSize: '1.1rem'
              }}
            >
              <i className="fa-solid fa-sign-in-alt"></i> Se connecter avec Auth0
            </button>
          </div>

          <div style={{ 
            borderTop: '1px solid rgba(255,255,255,0.2)',
            paddingTop: '1.5rem'
          }}>
            <a href="/" className="btn btn-ghost">
              <i className="fa-solid fa-home"></i> Retour à l'accueil
            </a>
          </div>
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
          padding: '3rem', 
          borderRadius: '15px', 
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.2)',
          maxWidth: '500px',
          width: '100%'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <i className="fa-solid fa-user-shield" style={{ fontSize: '2.5rem', color: 'var(--accent)', marginBottom: '1rem' }}></i>
            <h2>Vérification Administrateur</h2>
            <p style={{ opacity: 0.8, marginBottom: '1rem' }}>
              Connecté en tant que: <strong>{user?.name}</strong>
            </p>
            <p style={{ opacity: 0.6 }}>Étape 2/3 : Credentials Administrateur</p>
          </div>
          
          <form onSubmit={handleAdminSubmit}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Email Administrateur:
              </label>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
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
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Mot de passe Administrateur:
              </label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
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
            
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '1rem' }}>
              <i className="fa-solid fa-key"></i> Vérifier les identifiants
            </button>
          </form>
          
          <div style={{ 
            borderTop: '1px solid rgba(255,255,255,0.2)',
            paddingTop: '1.5rem',
            marginTop: '2rem',
            textAlign: 'center'
          }}>
            <a href="/" className="btn btn-ghost">
              <i className="fa-solid fa-home"></i> Retour à l'accueil
            </a>
          </div>
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
        // Rediriger vers le panneau admin après succès
        setTimeout(() => {
          navigate('/admin');
        }, 1000);
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
          padding: '3rem', 
          borderRadius: '15px', 
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.2)',
          textAlign: 'center',
          maxWidth: '500px',
          width: '100%'
        }}>
          <div style={{ marginBottom: '2rem' }}>
            <i className="fa-solid fa-lock" style={{ fontSize: '2.5rem', color: 'var(--accent)', marginBottom: '1rem' }}></i>
            <h2>Code d'Accès Final</h2>
            <p style={{ opacity: 0.8, marginBottom: '1rem' }}>
              Parfait {user?.name}! Dernière étape.
            </p>
            <p style={{ opacity: 0.6 }}>Étape 3/3 : Code de sécurité (4 chiffres)</p>
          </div>
          
          <form onSubmit={handleCodeSubmit}>
            <div style={{ marginBottom: '2rem' }}>
              <input
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                maxLength="4"
                required
                style={{
                  width: '150px',
                  padding: '1.5rem',
                  fontSize: '2rem',
                  textAlign: 'center',
                  borderRadius: '12px',
                  border: '2px solid var(--accent)',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  letterSpacing: '1rem',
                  fontWeight: 'bold'
                }}
              />
            </div>
            
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '1rem' }}>
              <i className="fa-solid fa-unlock"></i> Accéder au Panneau d'Administration
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Si tout est vérifié, redirection en cours
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      background: 'var(--bg-dark)',
      color: 'white'
    }}>
      <div style={{ textAlign: 'center' }}>
        <i className="fa-solid fa-check-circle" style={{ fontSize: '3rem', color: 'var(--accent)', marginBottom: '1rem' }}></i>
        <h2>Authentification réussie !</h2>
        <p>Redirection vers le panneau d'administration...</p>
      </div>
    </div>
  );
};

export default LoginAdmin;