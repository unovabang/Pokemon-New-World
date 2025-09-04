import { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import LogoutButton from "../components/LogoutButton";
import NewsEditor from "../components/NewsEditor";
import DownloadsEditor from "../components/DownloadsEditor";
import PatchNotesEditor from "../components/PatchNotesEditor";

// Import des configurations JSON
import siteConfig from "../config/site.json";
import sectionsConfig from "../config/sections.json";
import newsConfig from "../config/news.json";
import downloadsConfig from "../config/downloads.json";
import patchnotesConfig from "../config/patchnotes.json";
import patreonConfig from "../config/patreon.json";
import footerConfig from "../config/footer.json";
import externalConfig from "../config/external.json";

const AdminPanel = () => {
  const { user } = useAuth0();
  const [activeTab, setActiveTab] = useState('news');
  const [configs, setConfigs] = useState({
    site: siteConfig,
    sections: sectionsConfig,
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
    { id: 'sections', name: 'Sections', icon: 'fa-th-large' },
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
      background: 'var(--bg-dark)', 
      color: 'white'
    }}>
      {/* Header */}
      <header style={{ 
        background: 'rgba(255,255,255,0.1)', 
        padding: '1rem 2rem',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255,255,255,0.2)'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <div>
            <h1>
              <i className="fa-solid fa-shield-halved"></i> Panneau d'Administration
            </h1>
            <p style={{ opacity: 0.8, margin: 0 }}>
              Bienvenue, {user?.name} | Pokémon New World
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <a href="/" className="btn btn-ghost">
              <i className="fa-solid fa-home"></i> Site Principal
            </a>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div style={{ display: 'flex', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Sidebar */}
        <nav style={{ 
          width: '250px', 
          background: 'rgba(255,255,255,0.05)', 
          minHeight: 'calc(100vh - 100px)',
          padding: '2rem 1rem'
        }}>
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--accent)' }}>
            <i className="fa-solid fa-cogs"></i> Configuration
          </h3>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                margin: '0.25rem 0',
                background: activeTab === tab.id ? 'var(--accent)' : 'transparent',
                color: activeTab === tab.id ? 'white' : 'rgba(255,255,255,0.8)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.3s ease'
              }}
            >
              <i className={`fa-solid ${tab.icon}`}></i>
              {tab.name}
            </button>
          ))}
        </nav>

        {/* Main Content */}
        <main style={{ flex: 1, padding: '2rem' }}>
          {activeTab === 'news' && (
            <NewsEditor 
              newsData={configs.news}
              onSave={(newConfig) => handleSaveConfig('news', newConfig)}
            />
          )}
          
          {activeTab === 'downloads' && (
            <DownloadsEditor 
              downloadsData={configs.downloads}
              onSave={(newConfig) => handleSaveConfig('downloads', newConfig)}
            />
          )}
          
          {activeTab === 'patchnotes' && (
            <PatchNotesEditor 
              patchnotesData={configs.patchnotes}
              onSave={(newConfig) => handleSaveConfig('patchnotes', newConfig)}
            />
          )}
          
          {activeTab !== 'news' && activeTab !== 'downloads' && activeTab !== 'patchnotes' && (
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '10px',
              padding: '2rem'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '2rem'
              }}>
                <h2>
                  <i className={`fa-solid ${tabs.find(t => t.id === activeTab)?.icon}`}></i>{' '}
                  {tabs.find(t => t.id === activeTab)?.name}
                </h2>
                <div style={{
                  background: 'rgba(255, 165, 0, 0.2)',
                  border: '1px solid rgba(255, 165, 0, 0.4)',
                  color: '#ffa500',
                  padding: '0.5rem 1rem',
                  borderRadius: '5px',
                  fontSize: '0.9rem'
                }}>
                  <i className="fa-solid fa-tools"></i> Interface en développement
                </div>
              </div>

              {/* Preview temporaire du contenu */}
              <div style={{
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '5px',
                padding: '1rem',
                maxHeight: '60vh',
                overflow: 'auto'
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
                padding: '1rem',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '5px',
                borderLeft: '4px solid var(--accent)'
              }}>
                <h4><i className="fa-solid fa-info-circle"></i> Instructions</h4>
                {activeTab === 'downloads' && (
                  <p>Interface graphique en développement. Cette section permettra de modifier facilement les liens de téléchargement du jeu et des patchs avec des formulaires simples.</p>
                )}
                {activeTab === 'patchnotes' && (
                  <p>Interface graphique en développement. Vous pourrez bientôt ajouter et modifier les notes de patch avec un éditeur visuel.</p>
                )}
                {activeTab === 'site' && (
                  <p>Interface graphique en développement. Configuration du site avec des champs de formulaire pour le titre, la description, les métadonnées SEO, etc.</p>
                )}
                {activeTab === 'sections' && (
                  <p>Interface graphique en développement. Éditeur visuel pour le contenu des différentes sections de la page.</p>
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