import { useState, useEffect } from 'react';
import AdvancedModal from './AdvancedModal';

const API_BASE = `${window.location.protocol}//${window.location.hostname.replace(/:\d+$/, '')}:3001/api`;

const SectionsEditor = ({ onSave }) => {
  const [sections, setSections] = useState({});
  const [originalSections, setOriginalSections] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    type: 'info',
    onConfirm: null
  });
  const [currentLang, setCurrentLang] = useState('fr');
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionKey, setNewSectionKey] = useState('');
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionIcon, setNewSectionIcon] = useState('');

  // Liste des sections prédéfinies avec leurs propriétés suggérées
  const sectionTemplates = {
    news: {
      title: 'Actualités',
      icon: 'fa-solid fa-newspaper',
      description: 'Section pour les dernières nouvelles'
    },
    gameplay: {
      title: 'Gameplay',
      icon: 'fa-solid fa-gamepad',
      description: 'Présentation du système de jeu'
    },
    story: {
      title: 'Histoire',
      icon: 'fa-solid fa-book-open',
      description: 'Présentation de l\'histoire du jeu'
    },
    pokemon: {
      title: 'Pokémon',
      icon: 'fa-solid fa-dragon',
      description: 'Pokémon exclusifs et nouveaux types'
    },
    tiktok: {
      title: 'TikTok',
      icon: 'fa-brands fa-tiktok',
      description: 'Contenu sur les réseaux sociaux'
    },
    community: {
      title: 'Communauté',
      icon: 'fa-solid fa-users',
      description: 'Section communautaire'
    }
  };

  useEffect(() => {
    loadSections();
  }, [currentLang]);

  const loadSections = async () => {
    try {
      setLoading(true);
      const configFile = currentLang === 'en' ? 'sections-en' : 'sections';
      const response = await fetch(`${API_BASE}/config/${configFile}?t=${Date.now()}`);
      const data = await response.json();
      
      if (data.success && data.config) {
        setSections(data.config);
        setOriginalSections(JSON.parse(JSON.stringify(data.config)));
      }
    } catch (error) {
      console.error('Erreur lors du chargement des sections:', error);
      showMessage('Erreur', 'Impossible de charger les sections', 'error');
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
      `Êtes-vous sûr de vouloir sauvegarder les sections (${currentLang.toUpperCase()}) ?`,
      async () => {
        try {
          setSaving(true);
          const configFile = currentLang === 'en' ? 'sections-en' : 'sections';
          
          const response = await fetch(`${API_BASE}/config/${configFile}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ config: sections })
          });

          const data = await response.json();
          
          if (data.success) {
            setOriginalSections(JSON.parse(JSON.stringify(sections)));
            showMessage('Succès', 'Sections sauvegardées avec succès !', 'success');
            if (onSave) onSave(sections);
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

  const handleReset = () => {
    showConfirm(
      'Confirmer la réinitialisation',
      'Êtes-vous sûr de vouloir annuler tous les changements ?',
      () => {
        setSections(JSON.parse(JSON.stringify(originalSections)));
      }
    );
  };

  const updateSection = (sectionKey, field, value) => {
    setSections(prev => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        [field]: value
      }
    }));
  };

  const deleteSection = (sectionKey) => {
    showConfirm(
      'Supprimer la section',
      `Êtes-vous sûr de vouloir supprimer la section "${sectionKey}" ?`,
      () => {
        setSections(prev => {
          const newSections = { ...prev };
          delete newSections[sectionKey];
          return newSections;
        });
      }
    );
  };

  const addSection = () => {
    if (!newSectionKey || !newSectionTitle) {
      showMessage('Erreur', 'Veuillez remplir la clé et le titre de la section', 'error');
      return;
    }

    if (sections[newSectionKey]) {
      showMessage('Erreur', 'Une section avec cette clé existe déjà', 'error');
      return;
    }

    setSections(prev => ({
      ...prev,
      [newSectionKey]: {
        title: newSectionTitle,
        icon: newSectionIcon || 'fa-solid fa-square'
      }
    }));

    setNewSectionKey('');
    setNewSectionTitle('');
    setNewSectionIcon('');
    setShowAddSection(false);
  };

  const loadTemplate = (templateKey) => {
    const template = sectionTemplates[templateKey];
    setSections(prev => ({
      ...prev,
      [templateKey]: {
        title: template.title,
        icon: template.icon
      }
    }));
  };

  const hasChanges = JSON.stringify(sections) !== JSON.stringify(originalSections);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '300px',
        color: 'var(--muted)'
      }}>
        <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '10px' }}></i>
        Chargement des sections...
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: '30px',
        paddingBottom: '20px',
        borderBottom: '2px solid rgba(255,255,255,0.1)'
      }}>
        <div>
          <h2 style={{ 
            margin: 0, 
            color: 'white', 
            display: 'flex', 
            alignItems: 'center',
            fontSize: '28px'
          }}>
            <i className="fa-solid fa-th-large" style={{ marginRight: '15px', color: '#4FC3F7' }}></i>
            Sections du Site
          </h2>
          <p style={{ 
            margin: '10px 0 0 0', 
            color: 'var(--muted)', 
            fontSize: '16px' 
          }}>
            Gérez le contenu et la structure des sections de votre site
          </p>
        </div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          {/* Sélecteur de langue */}
          <div style={{ display: 'flex', backgroundColor: '#2a2a2a', borderRadius: '8px', overflow: 'hidden' }}>
            <button
              onClick={() => setCurrentLang('fr')}
              style={{
                padding: '8px 16px',
                border: 'none',
                background: currentLang === 'fr' ? '#4FC3F7' : 'transparent',
                color: currentLang === 'fr' ? 'white' : 'var(--muted)',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              FR
            </button>
            <button
              onClick={() => setCurrentLang('en')}
              style={{
                padding: '8px 16px',
                border: 'none',
                background: currentLang === 'en' ? '#4FC3F7' : 'transparent',
                color: currentLang === 'en' ? 'white' : 'var(--muted)',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              EN
            </button>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            style={{
              padding: '12px 24px',
              backgroundColor: hasChanges ? '#4FC3F7' : '#555',
              color: hasChanges ? 'white' : 'var(--muted)',
              border: 'none',
              borderRadius: '8px',
              cursor: hasChanges ? 'pointer' : 'not-allowed',
              fontSize: '16px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            {saving ? (
              <i className="fa-solid fa-spinner fa-spin"></i>
            ) : (
              <i className="fa-solid fa-save"></i>
            )}
            Sauvegarder
          </button>
        </div>
      </div>

      {/* Actions */}
      <div style={{ 
        display: 'flex', 
        gap: '15px', 
        marginBottom: '30px',
        flexWrap: 'wrap' 
      }}>
        <button
          onClick={() => setShowAddSection(true)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <i className="fa-solid fa-plus"></i>
          Ajouter une section
        </button>
        <button
          onClick={handleReset}
          disabled={!hasChanges}
          style={{
            padding: '10px 20px',
            backgroundColor: hasChanges ? '#f44336' : '#555',
            color: hasChanges ? 'white' : 'var(--muted)',
            border: 'none',
            borderRadius: '6px',
            cursor: hasChanges ? 'pointer' : 'not-allowed',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <i className="fa-solid fa-undo"></i>
          Réinitialiser
        </button>
      </div>

      {/* Templates rapides */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ color: 'white', marginBottom: '15px' }}>
          <i className="fa-solid fa-magic" style={{ marginRight: '10px', color: '#FF9800' }}></i>
          Sections prédéfinies
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {Object.entries(sectionTemplates).map(([key, template]) => (
            <button
              key={key}
              onClick={() => loadTemplate(key)}
              disabled={!!sections[key]}
              style={{
                padding: '8px 16px',
                backgroundColor: sections[key] ? '#555' : '#673AB7',
                color: sections[key] ? 'var(--muted)' : 'white',
                border: 'none',
                borderRadius: '20px',
                cursor: sections[key] ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title={template.description}
            >
              <i className={template.icon}></i>
              {template.title}
              {sections[key] && <i className="fa-solid fa-check" style={{ marginLeft: '4px' }}></i>}
            </button>
          ))}
        </div>
      </div>

      {/* Sections existantes */}
      <div>
        <h3 style={{ color: 'white', marginBottom: '20px' }}>
          <i className="fa-solid fa-list" style={{ marginRight: '10px', color: '#4FC3F7' }}></i>
          Sections configurées ({Object.keys(sections).length})
        </h3>

        {Object.keys(sections).length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: 'var(--muted)',
            backgroundColor: '#2a2a2a',
            borderRadius: '8px',
            border: '2px dashed #555'
          }}>
            <i className="fa-solid fa-inbox" style={{ fontSize: '48px', marginBottom: '15px', opacity: 0.5 }}></i>
            <p>Aucune section configurée</p>
            <p style={{ fontSize: '14px' }}>Commencez par ajouter une section ou utilisez les modèles prédéfinis</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '20px' }}>
            {Object.entries(sections).map(([sectionKey, section]) => (
              <div
                key={sectionKey}
                style={{
                  backgroundColor: '#2a2a2a',
                  borderRadius: '12px',
                  padding: '20px',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <i 
                      className={section.icon || 'fa-solid fa-square'} 
                      style={{ fontSize: '20px', color: '#4FC3F7' }}
                    ></i>
                    <span style={{ 
                      color: 'white', 
                      fontWeight: 'bold', 
                      fontSize: '16px',
                      fontFamily: 'monospace',
                      backgroundColor: '#1a1a1a',
                      padding: '4px 8px',
                      borderRadius: '4px'
                    }}>
                      {sectionKey}
                    </span>
                  </div>
                  <button
                    onClick={() => deleteSection(sectionKey)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#f44336',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    <i className="fa-solid fa-trash"></i>
                    Supprimer
                  </button>
                </div>

                <div style={{ display: 'grid', gap: '15px' }}>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '5px', 
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}>
                      <i className="fa-solid fa-heading" style={{ marginRight: '5px', color: '#4FC3F7' }}></i>
                      Titre
                    </label>
                    <input
                      type="text"
                      value={section.title || ''}
                      onChange={(e) => updateSection(sectionKey, 'title', e.target.value)}
                      placeholder="Titre de la section"
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '6px',
                        border: '1px solid #555',
                        backgroundColor: '#1a1a1a',
                        color: 'white',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '5px', 
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}>
                      <i className="fa-solid fa-icons" style={{ marginRight: '5px', color: '#FF9800' }}></i>
                      Icône (Font Awesome)
                    </label>
                    <input
                      type="text"
                      value={section.icon || ''}
                      onChange={(e) => updateSection(sectionKey, 'icon', e.target.value)}
                      placeholder="fa-solid fa-example"
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '6px',
                        border: '1px solid #555',
                        backgroundColor: '#1a1a1a',
                        color: 'white',
                        fontSize: '14px',
                        fontFamily: 'monospace'
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal pour ajouter une section */}
      {showAddSection && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#2a2a2a',
            borderRadius: '12px',
            padding: '30px',
            width: '90%',
            maxWidth: '500px',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <h3 style={{ color: 'white', marginBottom: '20px' }}>
              <i className="fa-solid fa-plus" style={{ marginRight: '10px', color: '#4CAF50' }}></i>
              Ajouter une nouvelle section
            </h3>

            <div style={{ display: 'grid', gap: '15px' }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '5px', 
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}>
                  Clé de la section *
                </label>
                <input
                  type="text"
                  value={newSectionKey}
                  onChange={(e) => setNewSectionKey(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                  placeholder="ex: gameplay, story, community"
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #555',
                    backgroundColor: '#1a1a1a',
                    color: 'white',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '5px', 
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}>
                  Titre *
                </label>
                <input
                  type="text"
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  placeholder="Titre affiché sur le site"
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #555',
                    backgroundColor: '#1a1a1a',
                    color: 'white',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '5px', 
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}>
                  Icône (optionnel)
                </label>
                <input
                  type="text"
                  value={newSectionIcon}
                  onChange={(e) => setNewSectionIcon(e.target.value)}
                  placeholder="fa-solid fa-gamepad"
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #555',
                    backgroundColor: '#1a1a1a',
                    color: 'white',
                    fontSize: '14px',
                    fontFamily: 'monospace'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '25px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowAddSection(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#555',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Annuler
              </button>
              <button
                onClick={addSection}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                <i className="fa-solid fa-plus" style={{ marginRight: '5px' }}></i>
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conseils */}
      <div style={{
        marginTop: '30px',
        padding: '20px',
        backgroundColor: '#1a2332',
        borderRadius: '8px',
        border: '1px solid #4FC3F7'
      }}>
        <h4 style={{ color: '#4FC3F7', marginBottom: '15px' }}>
          <i className="fa-solid fa-info-circle" style={{ marginRight: '10px' }}></i>
          Conseils
        </h4>
        <ul style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: '1.6' }}>
          <li>La <strong>clé</strong> identifie uniquement la section dans le code (minuscules, sans espaces)</li>
          <li>Le <strong>titre</strong> est affiché sur votre site web</li>
          <li>Les <strong>icônes</strong> utilisent Font Awesome (ex: fa-solid fa-gamepad, fa-brands fa-discord)</li>
          <li>Utilisez les <strong>sections prédéfinies</strong> pour un démarrage rapide</li>
          <li>Les modifications ne sont actives qu'après sauvegarde</li>
          <li>Gérez séparément les versions française (FR) et anglaise (EN)</li>
        </ul>
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

export default SectionsEditor;