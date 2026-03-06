import { useState, useEffect } from 'react';
import AdvancedModal from './AdvancedModal';

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:3001/api`
    : `${window.location.origin}/api`;

const FooterEditor = ({ onSave }) => {
  const [copyright, setCopyright] = useState('');
  const [developedBy, setDevelopedBy] = useState('');
  const [version, setVersion] = useState('');
  const [links, setLinks] = useState([]);
  const [showAddLink, setShowAddLink] = useState(false);
  const [newLinkName, setNewLinkName] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkIcon, setNewLinkIcon] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    type: 'info',
    onConfirm: null
  });

  useEffect(() => {
    loadFooterConfig();
  }, []);

  const loadFooterConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/config/footer?t=${Date.now()}`);
      const data = await response.json();
      
      if (data.success && data.config) {
        const config = data.config;
        setCopyright(config.copyright || '');
        setDevelopedBy(config.developedBy || '');
        setVersion(config.version || '');
        setLinks(config.links || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du footer:', error);
      showMessage('Erreur', 'Impossible de charger la configuration du footer', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (title, message, type = 'info') => {
    setModalConfig({ title, message, type, onConfirm: null });
    setShowModal(true);
  };

  const showConfirm = (title, message, onConfirm) => {
    setModalConfig({ title, message, type: 'confirm', onConfirm });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalConfig({ title: '', message: '', type: 'info', onConfirm: null });
  };

  const handleSave = () => {
    showConfirm(
      'Confirmer la sauvegarde',
      'Êtes-vous sûr de vouloir sauvegarder la configuration du footer ?',
      async () => {
        try {
          setSaving(true);
          
          const footerConfig = {
            copyright,
            developedBy,
            version,
            links
          };
          
          const response = await fetch(`${API_BASE}/config/footer`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ config: footerConfig })
          });
          
          const data = await response.json();
          
          if (data.success) {
            onSave(footerConfig);
            showMessage('Succès !', 'Configuration du footer sauvegardée avec succès !', 'success');
          } else {
            throw new Error(data.error || 'Erreur lors de la sauvegarde');
          }
        } catch (error) {
          console.error('Erreur lors de la sauvegarde:', error);
          showMessage('Erreur', `Impossible de sauvegarder: ${error.message}`, 'error');
        } finally {
          setSaving(false);
        }
      }
    );
  };

  const addLink = () => {
    if (!newLinkName || !newLinkUrl) {
      showMessage('Erreur', 'Veuillez remplir le nom et l\'URL du lien', 'error');
      return;
    }

    const newLink = {
      name: newLinkName,
      url: newLinkUrl,
      icon: newLinkIcon,
      id: Date.now().toString()
    };

    setLinks([...links, newLink]);
    setNewLinkName('');
    setNewLinkUrl('');
    setNewLinkIcon('');
    setShowAddLink(false);
  };

  const removeLink = (linkId) => {
    showConfirm(
      'Supprimer le lien',
      'Êtes-vous sûr de vouloir supprimer ce lien ?',
      () => {
        setLinks(links.filter(link => link.id !== linkId));
      }
    );
  };

  const updateLink = (linkId, field, value) => {
    setLinks(links.map(link => 
      link.id === linkId ? { ...link, [field]: value } : link
    ));
  };

  const testUrl = (url) => {
    if (url) {
      window.open(url, '_blank');
    } else {
      showMessage('Aucun lien', 'Aucun lien à tester', 'info');
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '400px',
        gap: '1rem'
      }}>
        <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--primary)' }}></i>
        <span>Chargement du footer...</span>
      </div>
    );
  }

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '2rem' 
      }}>
        <h2>
          <i className="fa-solid fa-window-minimize"></i> Configuration du Footer
        </h2>
        <button 
          onClick={handleSave} 
          className="btn btn-primary"
          disabled={saving}
        >
          {saving ? (
            <><i className="fa-solid fa-spinner fa-spin"></i> Sauvegarde...</>
          ) : (
            <><i className="fa-solid fa-save"></i> Sauvegarder</>
          )}
        </button>
      </div>

      <div style={{ display: 'grid', gap: '2rem' }}>
        {/* Informations principales */}
        <div style={{ 
          background: 'rgba(255,255,255,0.05)', 
          borderRadius: '10px', 
          padding: '2rem',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <h3 style={{ 
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#3b82f6'
          }}>
            <i className="fa-solid fa-info-circle"></i> Informations Principales
          </h3>
          
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontWeight: 'bold' 
              }}>
                <i className="fa-solid fa-copyright"></i> Copyright :
              </label>
              <input
                type="text"
                value={copyright}
                onChange={(e) => setCopyright(e.target.value)}
                placeholder="© 2025 Pokémon New World. Tous droits réservés."
                style={{
                  width: '100%',
                  padding: '1rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.3)',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  fontSize: '1rem'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontWeight: 'bold' 
                }}>
                  <i className="fa-solid fa-user-friends"></i> Développé par :
                </label>
                <input
                  type="text"
                  value={developedBy}
                  onChange={(e) => setDevelopedBy(e.target.value)}
                  placeholder="Équipe Pokémon New World"
                  style={{
                    width: '100%',
                    padding: '1rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.3)',
                    background: 'rgba(255,255,255,0.1)',
                    color: 'white',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontWeight: 'bold' 
                }}>
                  <i className="fa-solid fa-code-branch"></i> Version :
                </label>
                <input
                  type="text"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="v1.0.0"
                  style={{
                    width: '100%',
                    padding: '1rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.3)',
                    background: 'rgba(255,255,255,0.1)',
                    color: 'white',
                    fontSize: '1rem'
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Liens du footer */}
        <div style={{ 
          background: 'rgba(255,255,255,0.05)', 
          borderRadius: '10px', 
          padding: '2rem',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem'
          }}>
            <h3 style={{ 
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#22c55e'
            }}>
              <i className="fa-solid fa-link"></i> Liens du Footer
            </h3>
            <button 
              onClick={() => setShowAddLink(true)}
              className="btn btn-ghost"
              style={{ fontSize: '0.9rem' }}
            >
              <i className="fa-solid fa-plus"></i> Ajouter un lien
            </button>
          </div>
          
          {/* Formulaire d'ajout de lien */}
          {showAddLink && (
            <div style={{
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: '8px',
              padding: '1.5rem',
              marginBottom: '1.5rem'
            }}>
              <h4 style={{ margin: '0 0 1rem 0', color: '#22c55e' }}>Nouveau lien</h4>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: '1rem' }}>
                  <input
                    type="text"
                    value={newLinkName}
                    onChange={(e) => setNewLinkName(e.target.value)}
                    placeholder="Nom du lien"
                    style={{
                      padding: '0.75rem',
                      borderRadius: '5px',
                      border: '1px solid rgba(255,255,255,0.3)',
                      background: 'rgba(255,255,255,0.1)',
                      color: 'white',
                      fontSize: '0.9rem'
                    }}
                  />
                  <input
                    type="url"
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    placeholder="https://..."
                    style={{
                      padding: '0.75rem',
                      borderRadius: '5px',
                      border: '1px solid rgba(255,255,255,0.3)',
                      background: 'rgba(255,255,255,0.1)',
                      color: 'white',
                      fontSize: '0.9rem'
                    }}
                  />
                  <input
                    type="text"
                    value={newLinkIcon}
                    onChange={(e) => setNewLinkIcon(e.target.value)}
                    placeholder="fa-link"
                    style={{
                      padding: '0.75rem',
                      borderRadius: '5px',
                      border: '1px solid rgba(255,255,255,0.3)',
                      background: 'rgba(255,255,255,0.1)',
                      color: 'white',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button 
                    onClick={() => setShowAddLink(false)}
                    className="btn btn-ghost"
                    style={{ fontSize: '0.9rem' }}
                  >
                    Annuler
                  </button>
                  <button 
                    onClick={addLink}
                    className="btn btn-primary"
                    style={{ fontSize: '0.9rem' }}
                  >
                    <i className="fa-solid fa-plus"></i> Ajouter
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Liste des liens */}
          <div style={{ display: 'grid', gap: '1rem' }}>
            {links.map((link) => (
              <div
                key={link.id}
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: '8px',
                  padding: '1rem',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}
              >
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ 
                    width: '40px', 
                    minWidth: '40px',
                    textAlign: 'center',
                    color: '#3b82f6'
                  }}>
                    <i className={`fa-solid ${link.icon || 'fa-link'}`} style={{ fontSize: '1.2rem' }}></i>
                  </div>
                  
                  <input
                    type="text"
                    value={link.name}
                    onChange={(e) => updateLink(link.id, 'name', e.target.value)}
                    placeholder="Nom du lien"
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      borderRadius: '5px',
                      border: '1px solid rgba(255,255,255,0.3)',
                      background: 'rgba(255,255,255,0.1)',
                      color: 'white',
                      fontSize: '0.9rem'
                    }}
                  />
                  
                  <input
                    type="url"
                    value={link.url}
                    onChange={(e) => updateLink(link.id, 'url', e.target.value)}
                    placeholder="https://..."
                    style={{
                      flex: 2,
                      padding: '0.75rem',
                      borderRadius: '5px',
                      border: '1px solid rgba(255,255,255,0.3)',
                      background: 'rgba(255,255,255,0.1)',
                      color: 'white',
                      fontSize: '0.9rem'
                    }}
                  />
                  
                  <input
                    type="text"
                    value={link.icon}
                    onChange={(e) => updateLink(link.id, 'icon', e.target.value)}
                    placeholder="fa-link"
                    style={{
                      width: '100px',
                      padding: '0.75rem',
                      borderRadius: '5px',
                      border: '1px solid rgba(255,255,255,0.3)',
                      background: 'rgba(255,255,255,0.1)',
                      color: 'white',
                      fontSize: '0.9rem'
                    }}
                  />
                  
                  <button
                    onClick={() => testUrl(link.url)}
                    className="btn btn-ghost"
                    style={{ padding: '0.75rem', minWidth: 'auto' }}
                  >
                    <i className="fa-solid fa-external-link-alt"></i>
                  </button>
                  
                  <button
                    onClick={() => removeLink(link.id)}
                    className="btn btn-ghost"
                    style={{ 
                      padding: '0.75rem', 
                      minWidth: 'auto',
                      color: '#ef4444'
                    }}
                  >
                    <i className="fa-solid fa-trash"></i>
                  </button>
                </div>
              </div>
            ))}
            
            {links.length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: '2rem',
                color: 'rgba(255,255,255,0.6)',
                fontStyle: 'italic'
              }}>
                Aucun lien configuré. Cliquez sur "Ajouter un lien" pour commencer.
              </div>
            )}
          </div>
        </div>

        {/* Aperçu */}
        <div style={{ 
          background: 'rgba(59, 130, 246, 0.1)', 
          borderRadius: '10px', 
          padding: '2rem',
          border: '1px solid rgba(59, 130, 246, 0.3)'
        }}>
          <h3 style={{ 
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#3b82f6'
          }}>
            <i className="fa-solid fa-eye"></i> Aperçu du Footer
          </h3>
          
          <div style={{
            background: 'rgba(0,0,0,0.5)',
            borderRadius: '10px',
            padding: '2rem',
            border: '1px solid rgba(255,255,255,0.1)',
            textAlign: 'center'
          }}>
            <div style={{ marginBottom: '1rem' }}>
              {links.length > 0 && (
                <div style={{ 
                  display: 'flex', 
                  gap: '1rem', 
                  justifyContent: 'center',
                  marginBottom: '1rem',
                  flexWrap: 'wrap'
                }}>
                  {links.map((link) => (
                    <span 
                      key={link.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: '#3b82f6',
                        fontSize: '0.9rem'
                      }}
                    >
                      <i className={`fa-solid ${link.icon || 'fa-link'}`}></i>
                      {link.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            
            <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)' }}>
              <div>{copyright || 'Copyright'}</div>
              {developedBy && (
                <div style={{ marginTop: '0.5rem' }}>
                  Développé par {developedBy}
                </div>
              )}
              {version && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', opacity: 0.7 }}>
                  Version {version}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      <AdvancedModal
        open={showModal}
        onClose={closeModal}
        title={modalConfig.title}
        type={modalConfig.type}
        onConfirm={modalConfig.onConfirm}
      >
        {modalConfig.message}
      </AdvancedModal>
    </div>
  );
};

export default FooterEditor;