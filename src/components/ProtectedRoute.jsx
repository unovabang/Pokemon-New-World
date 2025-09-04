import { useAuth0 } from "@auth0/auth0-react";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth0();

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

  // Si pas authentifié, rediriger vers la page de connexion admin
  if (!isAuthenticated) {
    return <Navigate to="/login-admin" replace />;
  }

  // Si authentifié, afficher le contenu protégé
  return children;
};

export default ProtectedRoute;