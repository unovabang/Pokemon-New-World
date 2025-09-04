import { useNavigate } from "react-router-dom";

const Page404 = () => {
  const navigate = useNavigate();

  const goHome = () => {
    navigate('/');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0e27 0%, #1a1a2e 50%, #16213e 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    }}>
      {/* Particules d'arrière-plan */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'radial-gradient(circle at 20% 80%, rgba(102, 126, 234, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(118, 75, 162, 0.1) 0%, transparent 50%), radial-gradient(circle at 40% 40%, rgba(59, 130, 246, 0.05) 0%, transparent 50%)',
        pointerEvents: 'none',
        zIndex: 1
      }} />
      
      <div style={{
        position: 'relative',
        zIndex: 2,
        textAlign: 'center',
        maxWidth: '600px',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
        borderRadius: '24px',
        padding: window.innerWidth <= 768 ? '2rem' : '3rem',
        border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 25px 50px rgba(0,0,0,0.2)'
      }}>
        {/* Icône 404 */}
        <div style={{
          fontSize: window.innerWidth <= 768 ? '4rem' : '6rem',
          fontWeight: '800',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '1.5rem',
          lineHeight: '1'
        }}>
          404
        </div>

        {/* Titre principal */}
        <h1 style={{
          fontSize: window.innerWidth <= 768 ? '1.8rem' : '2.5rem',
          fontWeight: '700',
          color: 'white',
          marginBottom: '1rem',
          lineHeight: '1.2'
        }}>
          Page Introuvable
        </h1>

        {/* Description */}
        <p style={{
          fontSize: window.innerWidth <= 768 ? '1rem' : '1.2rem',
          color: 'rgba(255,255,255,0.7)',
          marginBottom: '2.5rem',
          lineHeight: '1.6'
        }}>
          Désolé, la page que vous cherchez n'existe pas ou a été déplacée.
          <br />
          <span style={{ fontSize: '0.9rem', opacity: '0.8' }}>
            Peut-être qu'un Pokémon l'a emportée dans ses aventures...
          </span>
        </p>

        {/* Bouton Accueil */}
        <button
          onClick={goHome}
          style={{
            padding: window.innerWidth <= 768 ? '0.8rem 2rem' : '1rem 2.5rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            borderRadius: '50px',
            color: 'white',
            fontSize: window.innerWidth <= 768 ? '1rem' : '1.1rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 10px 25px rgba(102, 126, 234, 0.3)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.8rem',
            textTransform: 'none'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-3px)';
            e.target.style.boxShadow = '0 15px 35px rgba(102, 126, 234, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 10px 25px rgba(102, 126, 234, 0.3)';
          }}
        >
          <span style={{ fontSize: '1.2rem' }}>🏠</span>
          Retour à l'Accueil
        </button>

        {/* Message supplémentaire */}
        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          background: 'rgba(102, 126, 234, 0.1)',
          borderRadius: '12px',
          border: '1px solid rgba(102, 126, 234, 0.2)'
        }}>
          <p style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: '0.9rem',
            margin: 0,
            lineHeight: '1.5'
          }}>
            💡 <strong>Conseil :</strong> Vérifiez l'URL ou utilisez le menu de navigation pour explorer Pokémon New World.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Page404;