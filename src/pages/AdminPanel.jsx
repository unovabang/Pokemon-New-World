import { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import BannerManager from "../components/BannerManager";
import DownloadsEditor from "../components/DownloadsEditor";
import PatchNotesEditor from "../components/PatchNotesEditor";
import SiteEditor from "../components/SiteEditor";
import PatreonEditor from "../components/PatreonEditor";
import ExternalLinksEditor from "../components/ExternalLinksEditor";
import FooterEditor from "../components/FooterEditor";

// Import des configurations JSON
import siteConfig from "../config/site.json";
import newsConfig from "../config/news.json";
import downloadsConfig from "../config/downloads.json";
import patchnotesConfig from "../config/patchnotes.json";
import patreonConfig from "../config/patreon.json";
import footerConfig from "../config/footer.json";
import externalConfig from "../config/external.json";

const AdminPanel = () => {
  const { user, logout } = useAuth0();
  const [activeTab, setActiveTab] = useState('news');
  const [configs, setConfigs] = useState({
    site: siteConfig,
    news: newsConfig,
    downloads: downloadsConfig,
    patchnotes: patchnotesConfig,
    patreon: patreonConfig,
    footer: footerConfig,
    external: externalConfig
  });

  const [editingConfig, setEditingConfig] = useState(null);
  const [editContent, setEditContent] = useState('');

  const handleEditConfig = (configName) => {
    setEditingConfig(configName);
    setEditContent(JSON.stringify(configs[configName], null, 2));
  };

  const handleSaveConfig = (configName, newConfig) => {
    setConfigs(prev => ({
      ...prev,
      [configName]: newConfig
    }));
    // Ici on pourrait sauvegarder dans un fichier JSON ou envoyer à une API
    localStorage.setItem(`config_${configName}`, JSON.stringify(newConfig));
  };

  const handleCancelEdit = () => {
    setEditingConfig(null);
    setEditContent('');
  };

  const tabs = [
    { id: 'news', name: 'Actualités', icon: 'fa-newspaper' },
    { id: 'downloads', name: 'Téléchargements', icon: 'fa-download' },
    { id: 'patchnotes', name: 'Notes de Patch', icon: 'fa-file-text' },
    { id: 'site', name: 'Site', icon: 'fa-cog' },
    { id: 'patreon', name: 'Patreon', icon: 'fa-heart' },
    { id: 'footer', name: 'Pied de page', icon: 'fa-window-minimize' },
    { id: 'external', name: 'Liens externes', icon: 'fa-external-link' }
  ];

  if (editingConfig) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'var(--bg-dark)', 
        color: 'white',
        padding: '2rem'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '2rem',
            padding: '1rem',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '10px',
            backdropFilter: 'blur(10px)'
          }}>
            <h2>
              <i className="fa-solid fa-edit"></i> Édition: {tabs.find(t => t.id === editingConfig)?.name}
            </h2>
            <div>
              <button 
                onClick={handleSaveConfig}
                className="btn btn-primary"
                style={{ marginRight: '1rem' }}
              >
                <i className="fa-solid fa-save"></i> Sauvegarder
              </button>
              <button 
                onClick={handleCancelEdit}
                className="btn btn-ghost"
              >
                <i className="fa-solid fa-times"></i> Annuler
              </button>
            </div>
          </div>
          
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '10px',
            padding: '1rem'
          }}>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              style={{
                width: '100%',
                height: '70vh',
                background: 'rgba(0,0,0,0.3)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '5px',
                padding: '1rem',
                fontFamily: 'monospace',
                fontSize: '14px',
                resize: 'vertical'
              }}
              placeholder="Contenu JSON..."
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundImage: 'url(https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/4fda9f2e-bdae-436e-a729-995e442f0245/dejr7my-4643e7e4-2b76-494b-917e-63dc39d8efa2.gif?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7InBhdGgiOiJcL2ZcLzRmZGE5ZjJlLWJkYWUtNDM2ZS1hNzI5LTk5NWU0NDJmMDI0NVwvZGVqcjdteS00NjQzZTdlNC0yYjc2LTQ5NGItOTE3ZS02M2RjMzlkOGVmYTIuZ2lmIn1dXSwiYXVkIjpbInVybjpzZXJ2aWNlOmZpbGUuZG93bmxvYWQiXX0.mLw8xYJ6thBmuTvz0nAPl0-3I80U6Bei6CiFgIGQR4A)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed',
      color: 'white',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      position: 'relative'
    }}>
      {/* Overlay pour améliorer la lisibilité */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0, 0, 0, 0.25)',
        pointerEvents: 'none',
        zIndex: 1
      }}></div>
      
      {/* Header */}
      <header style={{ 
        background: 'linear-gradient(135deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.55) 100%)', 
        padding: window.innerWidth <= 768 ? '1rem' : '1.5rem 2rem',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255,255,255,0.2)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.3)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: window.innerWidth <= 768 ? 'flex-start' : 'center',
          maxWidth: '1400px',
          margin: '0 auto',
          flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
          gap: window.innerWidth <= 768 ? '1.5rem' : '0'
        }}>
          {/* Logo et titre */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '50px',
              height: '50px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 25px rgba(102,126,234,0.4)',
              position: 'relative'
            }}>
              <i className="fa-solid fa-shield-halved" style={{
                fontSize: '1.4rem',
                color: 'white',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
              }}></i>
              <div style={{
                position: 'absolute',
                inset: '-2px',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                borderRadius: '17px',
                opacity: '0.3',
                filter: 'blur(8px)',
                zIndex: -1
              }}></div>
            </div>
            <div>
              <h1 style={{
                fontSize: window.innerWidth <= 480 ? '1.6rem' : window.innerWidth <= 768 ? '1.8rem' : '2.2rem',
                fontWeight: '800',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                margin: '0 0 0.3rem 0',
                letterSpacing: '-0.02em',
                lineHeight: 1.1
              }}>
                Admin Panel
              </h1>
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '0.8rem',
                flexWrap: 'wrap'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'rgba(102,126,234,0.1)',
                  padding: '0.3rem 0.8rem',
                  borderRadius: '20px',
                  border: '1px solid rgba(102,126,234,0.2)'
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    background: '#4ade80',
                    borderRadius: '50%',
                    animation: 'pulse 2s infinite'
                  }}></div>
                  <span style={{ 
                    fontSize: '0.85rem',
                    color: 'rgba(255,255,255,0.9)',
                    fontWeight: '500'
                  }}>
                    En ligne
                  </span>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: '0.9rem'
                }}>
                  <i className="fa-solid fa-user" style={{color: '#667eea'}}></i>
                  <span style={{color: '#667eea', fontWeight: '600'}}>{user?.name}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions de navigation */}
          <div style={{ 
            display: 'flex', 
            gap: '0.8rem', 
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            {/* Indicateur de statut */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1rem',
              background: 'rgba(34,197,94,0.1)',
              border: '1px solid rgba(34,197,94,0.2)',
              borderRadius: '12px',
              fontSize: '0.85rem',
              color: '#4ade80',
              fontWeight: '500'
            }}>
              <i className="fa-solid fa-server"></i>
              API Active
            </div>

            {/* Bouton de sauvegarde rapide */}
            <button style={{
              padding: '0.7rem 1.2rem',
              background: 'linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(22,163,74,0.15) 100%)',
              border: '1px solid rgba(34,197,94,0.3)',
              borderRadius: '12px',
              color: '#4ade80',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.3s ease',
              backdropFilter: 'blur(10px)',
              fontSize: '0.9rem',
              fontWeight: '600'
            }}
            onMouseOver={(e) => {
              e.target.style.background = 'linear-gradient(135deg, rgba(34,197,94,0.25) 0%, rgba(22,163,74,0.25) 100%)';
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 8px 25px rgba(34,197,94,0.3)';
            }}
            onMouseOut={(e) => {
              e.target.style.background = 'linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(22,163,74,0.15) 100%)';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}>
              <i className="fa-solid fa-save"></i>
              Sauvegarder
            </button>

            {/* Lien vers le site principal */}
            <a href="/" style={{
              padding: '0.7rem 1.2rem',
              background: 'linear-gradient(135deg, rgba(102,126,234,0.15) 0%, rgba(118,75,162,0.15) 100%)',
              border: '1px solid rgba(102,126,234,0.3)',
              borderRadius: '12px',
              color: 'white',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.3s ease',
              backdropFilter: 'blur(10px)',
              fontSize: '0.9rem',
              fontWeight: '600'
            }}
            onMouseOver={(e) => {
              e.target.style.background = 'linear-gradient(135deg, rgba(102,126,234,0.25) 0%, rgba(118,75,162,0.25) 100%)';
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 8px 25px rgba(102,126,234,0.3)';
            }}
            onMouseOut={(e) => {
              e.target.style.background = 'linear-gradient(135deg, rgba(102,126,234,0.15) 0%, rgba(118,75,162,0.15) 100%)';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}>
              <i className="fa-solid fa-external-link-alt"></i> 
              Site Web
            </a>

            {/* Menu utilisateur */}
            <div style={{
              position: 'relative',
              display: 'inline-block'
            }}>
              <button style={{
                padding: '0.7rem',
                background: 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(220,38,38,0.15) 100%)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '12px',
                color: '#f87171',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
                backdropFilter: 'blur(10px)',
                fontSize: '1.1rem',
                fontWeight: '600',
                minWidth: '44px',
                height: '44px'
              }}
              onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
              onMouseOver={(e) => {
                e.target.style.background = 'linear-gradient(135deg, rgba(239,68,68,0.25) 0%, rgba(220,38,38,0.25) 100%)';
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 25px rgba(239,68,68,0.3)';
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(220,38,38,0.15) 100%)';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
              title="Déconnexion"
              >
                <i className="fa-solid fa-sign-out-alt"></i>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div style={{ 
        display: 'flex', 
        maxWidth: '1200px', 
        margin: '0 auto',
        flexDirection: window.innerWidth <= 768 ? 'column' : 'row'
      }}>
        {/* Sidebar */}
        <nav style={{ 
          width: window.innerWidth <= 768 ? '100%' : '280px', 
          background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)', 
          minHeight: window.innerWidth <= 768 ? 'auto' : 'calc(100vh - 100px)',
          padding: window.innerWidth <= 768 ? '1rem' : '2rem 1.5rem',
          borderRight: window.innerWidth <= 768 ? 'none' : '1px solid rgba(255,255,255,0.1)',
          borderBottom: window.innerWidth <= 768 ? '1px solid rgba(255,255,255,0.1)' : 'none',
          backdropFilter: 'blur(15px)',
          boxShadow: window.innerWidth <= 768 ? 'none' : 'inset -1px 0 0 rgba(255,255,255,0.1)'
        }}>
          <h3 style={{ 
            marginBottom: window.innerWidth <= 768 ? '1rem' : '2rem', 
            color: '#667eea',
            fontSize: window.innerWidth <= 480 ? '1.1rem' : '1.3rem',
            fontWeight: '600',
            display: window.innerWidth <= 480 ? 'none' : 'flex',
            alignItems: 'center',
            gap: '0.8rem',
            paddingBottom: window.innerWidth <= 768 ? '0.5rem' : '1rem',
            borderBottom: '2px solid rgba(102,126,234,0.2)'
          }}>
            <i className="fa-solid fa-cogs" style={{fontSize: '1.2rem'}}></i> Configuration
          </h3>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                width: '100%',
                padding: window.innerWidth <= 768 ? '0.75rem 1rem' : '1rem 1.25rem',
                margin: window.innerWidth <= 768 ? '0.2rem 0' : '0.4rem 0',
                background: activeTab === tab.id 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                  : 'rgba(255,255,255,0.03)',
                color: activeTab === tab.id ? 'white' : 'rgba(255,255,255,0.85)',
                border: activeTab === tab.id 
                  ? '1px solid rgba(102,126,234,0.5)' 
                  : '1px solid rgba(255,255,255,0.1)',
                borderRadius: window.innerWidth <= 768 ? '8px' : '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: window.innerWidth <= 768 ? '0.5rem' : '0.75rem',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                fontSize: window.innerWidth <= 480 ? '0.85rem' : '0.95rem',
                fontWeight: activeTab === tab.id ? '600' : '500',
                boxShadow: activeTab === tab.id 
                  ? '0 8px 25px rgba(102,126,234,0.25)' 
                  : '0 2px 10px rgba(0,0,0,0.1)',
                backdropFilter: 'blur(10px)'
              }}
              onMouseOver={(e) => {
                if (activeTab !== tab.id) {
                  e.target.style.background = 'rgba(255,255,255,0.08)';
                  e.target.style.transform = 'translateX(4px)';
                  e.target.style.borderColor = 'rgba(102,126,234,0.3)';
                }
              }}
              onMouseOut={(e) => {
                if (activeTab !== tab.id) {
                  e.target.style.background = 'rgba(255,255,255,0.03)';
                  e.target.style.transform = 'translateX(0)';
                  e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                }
              }}
            >
              <i className={`fa-solid ${tab.icon}`} style={{
                fontSize: '1.1rem',
                width: '20px',
                textAlign: 'center'
              }}></i>
              {tab.name}
            </button>
          ))}
        </nav>

        {/* Main Content */}
        <main style={{ 
          flex: 1, 
          padding: window.innerWidth <= 768 ? '1rem' : window.innerWidth <= 1024 ? '1.5rem' : '2rem 2.5rem',
          background: 'rgba(255,255,255,0.02)',
          backdropFilter: 'blur(10px)'
        }}>
          {activeTab === 'news' && (
            <BannerManager 
              onSave={(newConfig) => handleSaveConfig('news', newConfig)}
            />
          )}
          
          {activeTab === 'downloads' && (
            <DownloadsEditor 
              onSave={(newConfig) => handleSaveConfig('downloads', newConfig)}
            />
          )}
          
          {activeTab === 'patchnotes' && (
            <PatchNotesEditor 
              patchnotesData={configs.patchnotes}
              onSave={(newConfig) => handleSaveConfig('patchnotes', newConfig)}
            />
          )}
          
          {/* Configuration générale pour Site */}
          {activeTab === 'site' && (
            <SiteEditor
              onSave={(newConfig) => handleSaveConfig('site', newConfig)}
            />
          )}


          {/* Configuration Patreon */}
          {activeTab === 'patreon' && (
            <PatreonEditor
              onSave={(newConfig) => handleSaveConfig('patreon', newConfig)}
            />
          )}

          {/* Configuration Footer */}
          {activeTab === 'footer' && (
            <FooterEditor
              onSave={(newConfig) => handleSaveConfig('footer', newConfig)}
            />
          )}

          {/* Configuration Liens Externes */}
          {activeTab === 'external' && (
            <ExternalLinksEditor
              onSave={(newConfig) => handleSaveConfig('external', newConfig)}
            />
          )}

          {activeTab !== 'news' && activeTab !== 'downloads' && activeTab !== 'patchnotes' && 
           activeTab !== 'site' && activeTab !== 'patreon' && 
           activeTab !== 'footer' && activeTab !== 'external' && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
              borderRadius: window.innerWidth <= 768 ? '15px' : '20px',
              padding: window.innerWidth <= 480 ? '1.5rem' : window.innerWidth <= 768 ? '2rem' : '2.5rem',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '2rem'
              }}>
                <h2 style={{
                  fontSize: '2rem',
                  fontWeight: '700',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  margin: '0 0 1rem 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.8rem'
                }}>
                  <i className={`fa-solid ${tabs.find(t => t.id === activeTab)?.icon}`} style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    fontSize: '1.8rem'
                  }}></i>
                  {tabs.find(t => t.id === activeTab)?.name}
                </h2>
                <div style={{
                  background: 'linear-gradient(135deg, rgba(255, 165, 0, 0.15) 0%, rgba(255, 140, 0, 0.15) 100%)',
                  border: '1px solid rgba(255, 165, 0, 0.3)',
                  color: '#ffb347',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '12px',
                  fontSize: '0.95rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  backdropFilter: 'blur(10px)'
                }}>
                  <i className="fa-solid fa-tools" style={{fontSize: '1rem'}}></i> Interface en développement
                </div>
              </div>

              {/* Preview temporaire du contenu */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 100%)',
                borderRadius: '15px',
                padding: '1.5rem',
                maxHeight: '60vh',
                overflow: 'auto',
                border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)'
              }}>
                <pre style={{ 
                  margin: 0, 
                  fontFamily: 'monospace', 
                  fontSize: '12px',
                  lineHeight: '1.4',
                  whiteSpace: 'pre-wrap'
                }}>
                  {JSON.stringify(configs[activeTab], null, 2)}
                </pre>
              </div>

              {/* Instructions spécifiques par section */}
              <div style={{ 
                marginTop: '2rem', 
                padding: '1.5rem',
                background: 'linear-gradient(135deg, rgba(102,126,234,0.1) 0%, rgba(118,75,162,0.1) 100%)',
                borderRadius: '15px',
                border: '1px solid rgba(102,126,234,0.2)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 8px 25px rgba(102,126,234,0.1)'
              }}>
                <h4 style={{
                  color: '#667eea',
                  fontSize: '1.2rem',
                  fontWeight: '600',
                  margin: '0 0 1rem 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem'
                }}><i className="fa-solid fa-info-circle" style={{fontSize: '1.1rem'}}></i> Instructions</h4>
                {activeTab === 'downloads' && (
                  <p>Interface graphique en développement. Cette section permettra de modifier facilement les liens de téléchargement du jeu et des patchs avec des formulaires simples.</p>
                )}
                {activeTab === 'patchnotes' && (
                  <p>Interface graphique en développement. Vous pourrez bientôt ajouter et modifier les notes de patch avec un éditeur visuel.</p>
                )}
                {activeTab === 'site' && (
                  <p>Interface graphique en développement. Configuration du site avec des champs de formulaire pour le titre, la description, les métadonnées SEO, etc.</p>
                )}
                {activeTab === 'patreon' && (
                  <p>Interface graphique en développement. Formulaires pour configurer la section Patreon facilement.</p>
                )}
                {activeTab === 'footer' && (
                  <p>Interface graphique en développement. Éditeur pour le contenu du pied de page.</p>
                )}
                {activeTab === 'external' && (
                  <p>Interface graphique en développement. Gestion des liens vers les services externes.</p>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminPanel;