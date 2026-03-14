import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import BannerManager from "../components/BannerManager";

import bgAdmin1 from "../assets/background-administrateur1.jpg";
import bgAdmin2 from "../assets/background-administrateur2.jpg";
import bgAdmin3 from "../assets/background-administrateur3.jpg";
import bgAdmin4 from "../assets/background-administrateur4.jpg";

const ADMIN_BACKGROUNDS = [bgAdmin1, bgAdmin2, bgAdmin3, bgAdmin4];
const ADMIN_BG_INTERVAL_MS = 12000;
import DownloadsEditor from "../components/DownloadsEditor";
import PatchNotesEditor from "../components/PatchNotesEditor";
import SiteSettingsEditor from "../components/SiteSettingsEditor";
import PokedexEditor from "../components/PokedexEditor";
import ExtradexEditor from "../components/ExtradexEditor";
import GuideEditor from "../components/GuideEditor";
import BSTEditor from "../components/BSTEditor";
import AdminTips from "../components/AdminTips";
import ItemLocationEditor from "../components/ItemLocationEditor";
import EVsLocationEditor from "../components/EVsLocationEditor";
import EmbedEditor from "../components/EmbedEditor";
import TeamEditor from "../components/TeamEditor";
import UnderConstructionPage from "./UnderConstructionPage";

// Import des configurations JSON
import siteConfig from "../config/site.json";
import pokedexData from "../config/pokedex.json";
import newsConfig from "../config/news.json";
import downloadsConfig from "../config/downloads.json";
import patchnotesConfig from "../config/patchnotes.json";
import patreonConfig from "../config/patreon.json";
import footerConfig from "../config/footer.json";
import externalConfig from "../config/external.json";
import extradexData from "../config/extradex.json";
import guideData from "../config/guide.json";
import bstData from "../config/bst.json";

const API_BASE = import.meta.env.VITE_API_URL
  || (import.meta.env.DEV ? `${window.location.protocol}//${window.location.hostname}:3001` : window.location.origin);

const AdminPanel = () => {
  const { admin, logout, token } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [pokedexSubTab, setPokedexSubTab] = useState('pokedex'); // 'pokedex' | 'extradex'
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [bgIndex, setBgIndex] = useState(0);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    const t = setInterval(
      () => setBgIndex((i) => (i + 1) % ADMIN_BACKGROUNDS.length),
      ADMIN_BG_INTERVAL_MS
    );
    return () => clearInterval(t);
  }, []);
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

  const navSections = [
    {
      title: null,
      items: [{ id: 'dashboard', name: 'Accueil', icon: 'fa-house', description: 'Vue d\'ensemble' }]
    },
    {
      title: 'Contenu',
      items: [
        { id: 'news', name: 'Actualités', icon: 'fa-newspaper', description: 'Bannières news' },
        { id: 'pokedex', name: 'Pokédex', icon: 'fa-book-open', description: 'Pokédex & Extradex' },
        { id: 'bst', name: 'All BST + Abilities', icon: 'fa-chart-line', description: 'Stats & capacités' },
        { id: 'guide', name: 'Guide', icon: 'fa-route', description: 'Walkthrough' },
        { id: 'itemlocation', name: 'Item Location', icon: 'fa-location-dot', description: 'Localisation des objets' },
        { id: 'evs', name: 'EVs Location', icon: 'fa-map-location-dot', description: 'Emplacements des EVs' },
        { id: 'nerfs', name: 'Nerfs and Buffs', icon: 'fa-balance-scale', description: 'Nerfs et buffs' },
        { id: 'downloads', name: 'Téléchargements', icon: 'fa-download', description: 'Liens de téléchargement' },
        { id: 'patchnotes', name: 'Notes de Patch', icon: 'fa-file-lines', description: 'Patch notes' }
      ]
    },
    {
      title: 'Site',
      items: [
        { id: 'settings', name: 'Paramètres', icon: 'fa-sliders', description: 'Site, Patreon, pied de page' },
        { id: 'team', name: "L'équipe", icon: 'fa-users', description: "Membres de l'équipe & remerciements" }
      ]
    },
    {
      title: 'Discord',
      items: [
        { id: 'embed', name: 'Embed Discord', icon: 'fa-code', description: 'Créateur d\'embed pour webhooks' }
      ]
    },
    {
      title: 'Système',
      items: [
        { id: 'tips', name: 'Conseils admin', icon: 'fa-lightbulb', description: 'Aide & bonnes pratiques' },
        { id: 'logs', name: 'Logs de connexion', icon: 'fa-list', description: 'Historique des connexions' }
      ]
    }
  ];
  const tabs = navSections.flatMap(s => s.items);

  useEffect(() => {
    if (activeTab === 'logs' && token) {
      setLogsLoading(true);
      fetch(`${API_BASE}/api/auth/logs`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => { if (d.success) setLogs(d.logs); })
        .finally(() => setLogsLoading(false));
    }
  }, [activeTab, token]);

  if (editingConfig) {
    return (
      <div className="admin-panel admin-panel--editing">
        <div
          className="admin-panel-bg"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(8,14,28,.85) 0%, rgba(5,9,20,.92) 100%), url(${ADMIN_BACKGROUNDS[0]})`
          }}
        />
        <div className="admin-panel-header">
          <div className="admin-panel-header-inner">
            <h2 className="admin-panel-title">
              <i className="fa-solid fa-edit" aria-hidden /> Édition: {tabs.find(t => t.id === editingConfig)?.name}
            </h2>
            <div className="admin-panel-actions">
              <button
                type="button"
                onClick={() => {
                  try {
                    handleSaveConfig(editingConfig, JSON.parse(editContent));
                    setEditingConfig(null);
                    setEditContent("");
                  } catch (err) {
                    alert("JSON invalide.");
                  }
                }}
                className="admin-panel-btn admin-panel-btn--primary"
              >
                <i className="fa-solid fa-save" aria-hidden /> Sauvegarder
              </button>
              <button type="button" onClick={handleCancelEdit} className="admin-panel-btn admin-panel-btn--secondary">
                <i className="fa-solid fa-xmark" aria-hidden /> Annuler
              </button>
            </div>
          </div>
        </div>
        <div className="admin-panel-body" style={{ maxWidth: "900px", margin: "0 auto", padding: "2rem" }}>
          <div className="admin-panel-card">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="admin-panel-json-edit"
              placeholder="Contenu JSON..."
              spellCheck={false}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div
        className="admin-panel-bg"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(8,14,28,.78) 0%, rgba(5,9,20,.88) 100%), url(${ADMIN_BACKGROUNDS[bgIndex]})`
        }}
      />
      <header className="admin-panel-header">
        <div className="admin-panel-header-inner">
          <button
            type="button"
            className="admin-panel-hamburger"
            onClick={() => setNavOpen((v) => !v)}
            aria-label={navOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={navOpen}
          >
            <i className={navOpen ? "fa-solid fa-xmark" : "fa-solid fa-bars"} aria-hidden />
          </button>
          <div className="admin-panel-brand">
            <div className="admin-panel-logo">
              <i className="fa-solid fa-shield-halved" aria-hidden />
            </div>
            <div>
              <h1 className="admin-panel-title">Admin Panel</h1>
              <div className="admin-panel-meta">
                <span className="admin-panel-status">
                  <span className="admin-panel-dot" /> En ligne
                </span>
                <span className="admin-panel-user">
                  <i className="fa-solid fa-user" aria-hidden /> {admin?.name || admin?.email}
                </span>
              </div>
            </div>
          </div>

          <div className="admin-panel-actions">
            <span className="admin-panel-badge admin-panel-badge--success">
              <i className="fa-solid fa-server" aria-hidden /> API Active
            </span>
            <button type="button" className="admin-panel-btn admin-panel-btn--primary">
              <i className="fa-solid fa-save" aria-hidden /> Sauvegarder
            </button>
            <a href="/" target="_blank" rel="noreferrer" className="admin-panel-btn admin-panel-btn--secondary">
              <i className="fa-solid fa-external-link-alt" aria-hidden /> Site Web
            </a>
            <button
              type="button"
              className="admin-panel-btn admin-panel-btn--danger"
              onClick={() => { logout(); navigate('/'); }}
              title="Déconnexion"
            >
              <i className="fa-solid fa-right-from-bracket" aria-hidden />
            </button>
          </div>
        </div>
      </header>

      <div className="admin-panel-body">
        <div
          className="admin-panel-nav-overlay"
          aria-hidden={!navOpen}
          onClick={() => setNavOpen(false)}
        />
        <nav className={`admin-panel-nav ${navOpen ? "admin-panel-nav--open" : ""}`}>
          <div className="admin-panel-nav-brand">
            <i className="fa-solid fa-shield-halved" aria-hidden />
            <span>Administration</span>
          </div>
          {navSections.map((section) => (
            <div key={section.title || 'home'} className="admin-panel-nav-section">
              {section.title && (
                <div className="admin-panel-nav-section-title">{section.title}</div>
              )}
              {section.items.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => { setActiveTab(tab.id); setNavOpen(false); }}
                  className={`admin-panel-nav-btn ${activeTab === tab.id ? "admin-panel-nav-btn--active" : ""}`}
                  title={tab.description}
                >
                  <span className="admin-panel-nav-btn-icon">
                    <i className={`fa-solid ${tab.icon}`} aria-hidden />
                  </span>
                  <span className="admin-panel-nav-btn-label">{tab.name}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <main className="admin-panel-main">
          {activeTab === 'dashboard' && (
            <div className="admin-dashboard">
              <div className="admin-dashboard-hero">
                <h2 className="admin-dashboard-welcome">
                  Bonjour{admin?.name ? `, ${admin.name}` : ''}
                </h2>
                <p className="admin-dashboard-subtitle">
                  Gérez le contenu du site Pokémon New World depuis ce panneau.
                </p>
              </div>
              <div className="admin-dashboard-actions">
                <a href="/" target="_blank" rel="noreferrer" className="admin-dashboard-card admin-dashboard-card--primary">
                  <span className="admin-dashboard-card-icon"><i className="fa-solid fa-external-link" /></span>
                  <span className="admin-dashboard-card-title">Voir le site</span>
                  <span className="admin-dashboard-card-desc">Ouvrir le site public dans un nouvel onglet</span>
                </a>
              </div>
              <h3 className="admin-dashboard-section-title">Accès rapide</h3>
              <div className="admin-dashboard-grid">
                {navSections.flatMap(s => s.items).filter(t => t.id !== 'dashboard').map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className="admin-dashboard-card"
                  >
                    <span className="admin-dashboard-card-icon"><i className={`fa-solid ${tab.icon}`} /></span>
                    <span className="admin-dashboard-card-title">{tab.name}</span>
                    <span className="admin-dashboard-card-desc">{tab.description}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

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

          {activeTab === 'bst' && (
            <BSTEditor
              initialData={bstData || { fakemon: [], megas: [], speciaux: [] }}
              initialPokedexEntries={pokedexData?.entries ?? []}
              onSave={() => {}}
            />
          )}

          {activeTab === 'pokedex' && (
            <>
              <div className="admin-pokedex-subnav" style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => setPokedexSubTab("pokedex")}
                  className={`admin-panel-nav-btn ${pokedexSubTab === "pokedex" ? "admin-panel-nav-btn--active" : ""}`}
                  style={{ padding: "0.5rem 1rem", fontSize: "0.9rem" }}
                >
                  <i className="fa-solid fa-book-open" aria-hidden /> Pokédex
                </button>
                <button
                  type="button"
                  onClick={() => setPokedexSubTab("extradex")}
                  className={`admin-panel-nav-btn ${pokedexSubTab === "extradex" ? "admin-panel-nav-btn--active" : ""}`}
                  style={{ padding: "0.5rem 1rem", fontSize: "0.9rem" }}
                >
                  <i className="fa-solid fa-star" aria-hidden /> Extradex
                </button>
              </div>
              {pokedexSubTab === "pokedex" && (
                <PokedexEditor
                  initialEntries={pokedexData?.entries ?? []}
                  onSave={() => {}}
                />
              )}
              {pokedexSubTab === "extradex" && (
                <ExtradexEditor
                  initialData={extradexData || { title: "Extradex", entries: [] }}
                  onSave={() => {}}
                />
              )}
            </>
          )}

          {activeTab === 'guide' && (
            <GuideEditor
              initialData={guideData || { title: "", subtitle: "", disclaimer: "", steps: [] }}
              onSave={() => {}}
            />
          )}

          {activeTab === 'evs' && (
            <EVsLocationEditor onSave={() => {}} />
          )}
          {activeTab === 'nerfs' && (
            <UnderConstructionPage
              title="Nerfs and Buffs"
              backLabel="Retour à l'admin"
              onBack={() => setActiveTab("dashboard")}
              embedded
            />
          )}
          
          {/* Paramètres unifiés : Site + Patreon + Pied de page + Liens externes */}
          {activeTab === 'settings' && (
            <SiteSettingsEditor
              onSave={(configName, newConfig) => handleSaveConfig(configName, newConfig)}
            />
          )}

          {activeTab === 'itemlocation' && (
            <ItemLocationEditor onSave={(config) => handleSaveConfig('item-location', config)} />
          )}

          {activeTab === 'embed' && <EmbedEditor />}

          {activeTab === 'team' && <TeamEditor />}

          {activeTab === 'tips' && <AdminTips />}

          {activeTab === 'logs' && (
            <div className="admin-panel-card">
              <h2 className="admin-panel-card-title">
                <i className="fa-solid fa-list-alt" aria-hidden /> Logs de connexion
              </h2>
              {logsLoading ? (
                <p className="admin-panel-loading"><i className="fa-solid fa-spinner fa-spin" aria-hidden /> Chargement...</p>
              ) : (
                <div className="admin-panel-table-wrap">
                  <table className="admin-panel-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Email</th>
                        <th>IP</th>
                        <th>Succès</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.length === 0 ? (
                        <tr><td colSpan="4" className="admin-panel-table-empty">Aucun log pour le moment.</td></tr>
                      ) : (
                        logs.map((log) => (
                          <tr key={log.id}>
                            <td>{new Date(log.created_at).toLocaleString('fr-FR')}</td>
                            <td>{log.email}</td>
                            <td>{log.ip || '—'}</td>
                            <td>
                              {log.success ? <span className="admin-panel-log-ok">✓ Oui</span> : <span className="admin-panel-log-fail">✗ Non</span>}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab !== 'dashboard' && activeTab !== 'news' && activeTab !== 'downloads' && activeTab !== 'patchnotes' && 
           activeTab !== 'pokedex' && activeTab !== 'bst' && activeTab !== 'guide' && activeTab !== 'itemlocation' && activeTab !== 'evs' && activeTab !== 'settings' && activeTab !== 'team' && activeTab !== 'embed' && activeTab !== 'tips' && activeTab !== 'logs' && (
            <div className="admin-panel-card">
              <div className="admin-panel-card-head">
                <h2 className="admin-panel-card-title">
                  <i className={`fa-solid ${tabs.find(t => t.id === activeTab)?.icon}`} aria-hidden /> {tabs.find(t => t.id === activeTab)?.name}
                </h2>
                <span className="admin-panel-badge admin-panel-badge--wip">
                  <i className="fa-solid fa-tools" aria-hidden /> Interface en développement
                </span>
              </div>

              <div className="admin-panel-preview">
                <pre>{JSON.stringify(configs[activeTab], null, 2)}</pre>
              </div>

              <div className="admin-panel-info">
                <h4><i className="fa-solid fa-circle-info" aria-hidden /> Instructions</h4>
                {activeTab === 'downloads' && (
                  <p>Interface graphique en développement. Cette section permettra de modifier facilement les liens de téléchargement du jeu et des patchs avec des formulaires simples.</p>
                )}
                {activeTab === 'patchnotes' && (
                  <p>Interface graphique en développement. Vous pourrez bientôt ajouter et modifier les notes de patch avec un éditeur visuel.</p>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      <footer className="admin-panel-footer">
        <div className="admin-panel-footer-inner">
          <span className="admin-panel-footer-brand">Pokémon New World</span>
          <span className="admin-panel-footer-sep">—</span>
          <span className="admin-panel-footer-copy">Panneau d'administration © {new Date().getFullYear()}</span>
          <a href="/" target="_blank" rel="noreferrer" className="admin-panel-footer-link">
            <i className="fa-solid fa-external-link-alt" aria-hidden /> Voir le site
          </a>
        </div>
      </footer>
    </div>
  );
};

export default AdminPanel;