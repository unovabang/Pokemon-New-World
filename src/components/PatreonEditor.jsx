import { useState, useEffect } from 'react';
import AdvancedModal from './AdvancedModal';

const API_BASE = `${window.location.protocol}//${window.location.hostname.replace(/:\d+$/, '')}:3001/api`;

const PatreonEditor = ({ onSave }) => {
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState('');
  const [image, setImage] = useState('');
  const [heading, setHeading] = useState('');
  const [description, setDescription] = useState('');
  const [buttonText, setButtonText] = useState('');
  const [buttonUrl, setButtonUrl] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [goalDescription, setGoalDescription] = useState('');
  
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
    loadPatreonConfig();
  }, []);

  const loadPatreonConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/config/patreon?t=${Date.now()}`);
      const data = await response.json();
      
      if (data.success && data.config) {
        const config = data.config;
        setTitle(config.title || '');
        setIcon(config.icon || '');
        setImage(config.image || '');
        setHeading(config.content?.heading || '');
        setDescription(config.content?.description || '');
        setButtonText(config.content?.button || '');
        setButtonUrl(config.content?.url || '');
        setGoalAmount(config.goal?.amount || '');
        setCurrentAmount(config.goal?.current || '');
        setGoalDescription(config.goal?.description || '');
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la config Patreon:', error);
      showMessage('Erreur', 'Impossible de charger la configuration Patreon', 'error');
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
      'Êtes-vous sûr de vouloir sauvegarder la configuration Patreon ?',
      async () => {
        try {
          setSaving(true);
          
          const patreonConfig = {
            title,
            icon,
            image,
            content: {
              heading,
              description,
              button: buttonText,
              url: buttonUrl
            },
            goal: {
              amount: goalAmount,
              current: currentAmount,
              description: goalDescription
            }
          };
          
          const response = await fetch(`${API_BASE}/config/patreon`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ config: patreonConfig })
          });
          
          const data = await response.json();
          
          if (data.success) {
            onSave(patreonConfig);
            showMessage('Succès !', 'Configuration Patreon sauvegardée avec succès !', 'success');
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
        <span>Chargement de la configuration Patreon...</span>
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
          <i className="fa-solid fa-heart"></i> Configuration Patreon
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
        {/* Section Titre et Images */}
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
            color: '#f59e0b'
          }}>
            <i className="fa-solid fa-image"></i> Titre et Images
          </h3>
          
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontWeight: 'bold' 
              }}>
                <i className="fa-solid fa-heading"></i> Titre de la section :
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Obtiens les nouveautés en avance !"
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
                  <i className="fa-solid fa-star"></i> Icône :
                </label>
                <input
                  type="url"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  placeholder="/patreonlogo.png"
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
                {icon && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <img 
                      src={icon} 
                      alt="Aperçu icône" 
                      style={{ 
                        width: '40px', 
                        height: '40px', 
                        border: '1px solid rgba(255,255,255,0.3)',
                        borderRadius: '5px'
                      }}
                      onError={(e) => e.target.style.display = 'none'}
                    />
                  </div>
                )}
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontWeight: 'bold' 
                }}>
                  <i className="fa-solid fa-image"></i> Image principale :
                </label>
                <input
                  type="url"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="/patreon.png"
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
                {image && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <img 
                      src={image} 
                      alt="Aperçu image" 
                      style={{ 
                        maxWidth: '100px', 
                        maxHeight: '60px', 
                        border: '1px solid rgba(255,255,255,0.3)',
                        borderRadius: '5px'
                      }}
                      onError={(e) => e.target.style.display = 'none'}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Contenu Principal */}
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
            <i className="fa-solid fa-align-left"></i> Contenu Principal
          </h3>
          
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontWeight: 'bold' 
              }}>
                <i className="fa-solid fa-heading"></i> Titre principal :
              </label>
              <input
                type="text"
                value={heading}
                onChange={(e) => setHeading(e.target.value)}
                placeholder="Soutenez-nous sur Patreon"
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
                <i className="fa-solid fa-align-left"></i> Description :
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Votre soutien nous aide à développer le jeu et à ajouter du nouveau contenu..."
                rows="4"
                style={{
                  width: '100%',
                  padding: '1rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.3)',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  fontSize: '1rem',
                  resize: 'vertical'
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
                  <i className="fa-solid fa-mouse-pointer"></i> Texte du bouton :
                </label>
                <input
                  type="text"
                  value={buttonText}
                  onChange={(e) => setButtonText(e.target.value)}
                  placeholder="Soutenir sur Patreon"
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
                  <i className="fa-solid fa-link"></i> URL Patreon :
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="url"
                    value={buttonUrl}
                    onChange={(e) => setButtonUrl(e.target.value)}
                    placeholder="https://www.patreon.com/votrecompte"
                    style={{
                      flex: 1,
                      padding: '1rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.3)',
                      background: 'rgba(255,255,255,0.1)',
                      color: 'white',
                      fontSize: '1rem'
                    }}
                  />
                  <button
                    onClick={() => testUrl(buttonUrl)}
                    className="btn btn-ghost"
                    style={{ padding: '1rem' }}
                  >
                    <i className="fa-solid fa-external-link-alt"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Objectif de Financement */}
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
            color: '#22c55e'
          }}>
            <i className="fa-solid fa-target"></i> Objectif de Financement (Optionnel)
          </h3>
          
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontWeight: 'bold' 
              }}>
                <i className="fa-solid fa-bullseye"></i> Description de l'objectif :
              </label>
              <input
                type="text"
                value={goalDescription}
                onChange={(e) => setGoalDescription(e.target.value)}
                placeholder="Prochaine mise à jour majeure"
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
                  <i className="fa-solid fa-euro-sign"></i> Montant objectif :
                </label>
                <input
                  type="number"
                  value={goalAmount}
                  onChange={(e) => setGoalAmount(e.target.value)}
                  placeholder="500"
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
                  <i className="fa-solid fa-chart-line"></i> Montant actuel :
                </label>
                <input
                  type="number"
                  value={currentAmount}
                  onChange={(e) => setCurrentAmount(e.target.value)}
                  placeholder="250"
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

            {goalAmount && currentAmount && (
              <div style={{ 
                marginTop: '1rem',
                padding: '1rem',
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: '8px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>Progression</span>
                  <span>{Math.round((currentAmount / goalAmount) * 100)}%</span>
                </div>
                <div style={{
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  height: '20px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    background: '#22c55e',
                    height: '100%',
                    width: `${Math.min((currentAmount / goalAmount) * 100, 100)}%`,
                    transition: 'width 0.3s ease'
                  }}></div>
                </div>
                <div style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.9rem' }}>
                  {currentAmount}€ / {goalAmount}€
                </div>
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
            <i className="fa-solid fa-eye"></i> Aperçu
          </h3>
          
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '10px',
            padding: '2rem',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              {icon && (
                <img src={icon} alt="Icône" style={{ width: '30px', height: '30px' }} />
              )}
              <h4 style={{ margin: 0, color: 'white' }}>{title || 'Titre de la section'}</h4>
            </div>
            
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
              {image && (
                <img 
                  src={image} 
                  alt="Image Patreon" 
                  style={{ 
                    width: '150px', 
                    height: '100px', 
                    objectFit: 'cover',
                    borderRadius: '10px'
                  }} 
                />
              )}
              
              <div style={{ flex: 1 }}>
                <h5 style={{ margin: '0 0 0.5rem 0', color: '#f59e0b' }}>
                  {heading || 'Titre principal'}
                </h5>
                <p style={{ margin: '0 0 1rem 0', color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>
                  {description || 'Description'}
                </p>
                <button 
                  className="btn btn-primary"
                  style={{ 
                    background: '#f59e0b',
                    border: 'none',
                    padding: '0.75rem 1.5rem'
                  }}
                >
                  <i className="fa-brands fa-patreon"></i> {buttonText || 'Bouton'}
                </button>
              </div>
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

export default PatreonEditor;