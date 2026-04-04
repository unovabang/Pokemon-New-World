import { useState, useEffect } from 'react';
import AdvancedModal from './AdvancedModal';
import { authHeaders } from "../utils/authHeaders";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : `${window.location.origin}/api`;

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
  
  // Traductions anglaises
  const [titleEn, setTitleEn] = useState('');
  const [headingEn, setHeadingEn] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [buttonTextEn, setButtonTextEn] = useState('');
  const [goalDescriptionEn, setGoalDescriptionEn] = useState('');
  
  const [activeLanguage, setActiveLanguage] = useState('fr');
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
        setButtonText(config.content?.buttonText || config.content?.button || '');
        setButtonUrl(config.content?.url || '');
        setGoalAmount(config.goal?.amount || '');
        setCurrentAmount(config.goal?.current || '');
        setGoalDescription(config.goal?.description || '');
        
        // Chargement des traductions anglaises
        const enTranslations = config.translations?.en || {};
        setTitleEn(enTranslations.title || '');
        setHeadingEn(enTranslations.content?.heading || '');
        setDescriptionEn(enTranslations.content?.description || '');
        setButtonTextEn(enTranslations.content?.buttonText || enTranslations.content?.button || '');
        setGoalDescriptionEn(enTranslations.goal?.description || '');
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
              buttonText: buttonText,
              button: buttonText,
              url: buttonUrl
            },
            goal: {
              amount: goalAmount,
              current: currentAmount,
              description: goalDescription
            },
            translations: {
              en: {
                title: titleEn,
                content: {
                  heading: headingEn,
                  description: descriptionEn,
                  buttonText: buttonTextEn,
                  button: buttonTextEn
                },
                goal: {
                  description: goalDescriptionEn
                }
              }
            }
          };
          
          const response = await fetch(`${API_BASE}/config/patreon`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...authHeaders(),
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
    <div className="patreon-editor">
      <div className="patreon-editor-header" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '2rem' 
      }}>
        <div>
          <h2 style={{ margin: '0 0 1rem 0' }}>
            <i className="fa-solid fa-heart"></i> Configuration Patreon
          </h2>
          
          {/* Onglets de langue */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setActiveLanguage('fr')}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.3)',
                background: activeLanguage === 'fr' 
                  ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
                  : 'rgba(255,255,255,0.05)',
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.9rem',
                transition: 'all 0.3s ease'
              }}
            >
              🇫🇷 Français
            </button>
            <button
              onClick={() => setActiveLanguage('en')}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.3)',
                background: activeLanguage === 'en' 
                  ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
                  : 'rgba(255,255,255,0.05)',
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.9rem',
                transition: 'all 0.3s ease'
              }}
            >
              🇬🇧 English
            </button>
          </div>
        </div>
        
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
                <i className="fa-solid fa-heading"></i> Titre de la section ({activeLanguage === 'fr' ? 'Français' : 'English'}) :
              </label>
              <input
                type="text"
                value={activeLanguage === 'fr' ? title : titleEn}
                onChange={(e) => activeLanguage === 'fr' ? setTitle(e.target.value) : setTitleEn(e.target.value)}
                placeholder={activeLanguage === 'fr' ? "Obtiens les nouveautés en avance !" : "Get the latest news first!"}
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
                  placeholder="https://…"
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
                  placeholder="https://…"
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
                <i className="fa-solid fa-heading"></i> Titre principal ({activeLanguage === 'fr' ? 'Français' : 'English'}) :
              </label>
              <input
                type="text"
                value={activeLanguage === 'fr' ? heading : headingEn}
                onChange={(e) => activeLanguage === 'fr' ? setHeading(e.target.value) : setHeadingEn(e.target.value)}
                placeholder={activeLanguage === 'fr' ? "Soutenez le projet !!!!" : "Support the project!!!!"}
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
                <i className="fa-solid fa-align-left"></i> Description ({activeLanguage === 'fr' ? 'Français' : 'English'}) :
              </label>
              <textarea
                value={activeLanguage === 'fr' ? description : descriptionEn}
                onChange={(e) => activeLanguage === 'fr' ? setDescription(e.target.value) : setDescriptionEn(e.target.value)}
                placeholder={activeLanguage === 'fr' ? "Accédez aux nouveautés en avant-première et aidez-nous à développer le jeu !" : "Get early access to new content and help us develop the game!"}
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
                  <i className="fa-solid fa-mouse-pointer"></i> Texte du bouton ({activeLanguage === 'fr' ? 'Français' : 'English'}) :
                </label>
                <input
                  type="text"
                  value={activeLanguage === 'fr' ? buttonText : buttonTextEn}
                  onChange={(e) => activeLanguage === 'fr' ? setButtonText(e.target.value) : setButtonTextEn(e.target.value)}
                  placeholder={activeLanguage === 'fr' ? "Soutenir sur Patreon" : "Support on Patreon"}
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
                <i className="fa-solid fa-bullseye"></i> Description de l'objectif ({activeLanguage === 'fr' ? 'Français' : 'English'}) :
              </label>
              <input
                type="text"
                value={activeLanguage === 'fr' ? goalDescription : goalDescriptionEn}
                onChange={(e) => activeLanguage === 'fr' ? setGoalDescription(e.target.value) : setGoalDescriptionEn(e.target.value)}
                placeholder={activeLanguage === 'fr' ? "Prochaine mise à jour majeure" : "Next major update"}
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