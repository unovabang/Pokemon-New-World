import { useState, useEffect } from 'react';

const API_BASE = `${window.location.protocol}//${window.location.hostname.replace(/:\d+$/, '')}:3001/api`;

const PatchNotesEditor = ({ onSave }) => {
  const [patchNotes, setPatchNotes] = useState({ versions: [] });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    type: 'info',
    onConfirm: null
  });

  // États pour le formulaire de nouvelle version
  const [showNewVersionForm, setShowNewVersionForm] = useState(false);
  const [newVersion, setNewVersion] = useState({
    version: '',
    date: '',
    sections: []
  });

  // États pour l'édition de version
  const [editingVersion, setEditingVersion] = useState(null);
  const [editingSections, setEditingSections] = useState([]);

  useEffect(() => {
    loadPatchNotes();
  }, []);

  const loadPatchNotes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/patchnotes?t=${Date.now()}`);
      const data = await response.json();
      
      if (data.success) {
        setPatchNotes(data.patchnotes);
      } else {
        console.error('Erreur lors du chargement:', data.error);
        setPatchNotes({ versions: [] });
      }
    } catch (error) {
      console.error('Erreur de connexion à l\'API:', error);
      setPatchNotes({ versions: [] });
    } finally {
      setLoading(false);
    }
  };

  // Fonctions pour les modals
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

  // Ajouter une nouvelle version
  const addNewVersion = async () => {
    if (!newVersion.version || !newVersion.date) {
      showMessage('Erreur', 'Veuillez remplir la version et la date', 'error');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/patchnotes/version`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: newVersion.version,
          date: newVersion.date,
          sections: []
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setNewVersion({ version: '', date: '', sections: [] });
        setShowNewVersionForm(false);
        window.location.reload();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      showMessage('Erreur', `Erreur lors de l'ajout: ${error.message}`, 'error');
    }
  };

  // Supprimer une version
  const deleteVersion = (version) => {
    showConfirm(
      'Supprimer la version',
      `Êtes-vous sûr de vouloir supprimer la version "${version}" ?`,
      async () => {
        try {
          const response = await fetch(`${API_BASE}/patchnotes/version/${version}`, {
            method: 'DELETE'
          });

          const data = await response.json();
          
          if (data.success) {
            window.location.reload();
          } else {
            throw new Error(data.error);
          }
        } catch (error) {
          showMessage('Erreur', `Erreur lors de la suppression: ${error.message}`, 'error');
        }
      }
    );
  };

  // Commencer l'édition d'une version
  const startEditingVersion = (version) => {
    setEditingVersion(version.version);
    setEditingSections([...version.sections]);
  };

  // Sauvegarder les modifications d'une version
  const saveVersionEdits = async () => {
    try {
      const response = await fetch(`${API_BASE}/patchnotes/version/${editingVersion}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sections: editingSections
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setEditingVersion(null);
        setEditingSections([]);
        window.location.reload();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      showMessage('Erreur', `Erreur lors de la sauvegarde: ${error.message}`, 'error');
    }
  };

  // Ajouter une section lors de l'édition
  const addSection = () => {
    setEditingSections([...editingSections, { title: '', items: [''] }]);
  };

  // Mettre à jour le titre d'une section
  const updateSectionTitle = (sectionIndex, title) => {
    const newSections = [...editingSections];
    newSections[sectionIndex].title = title;
    setEditingSections(newSections);
  };

  // Ajouter un élément à une section
  const addItem = (sectionIndex) => {
    const newSections = [...editingSections];
    newSections[sectionIndex].items.push('');
    setEditingSections(newSections);
  };

  // Mettre à jour un élément
  const updateItem = (sectionIndex, itemIndex, value) => {
    const newSections = [...editingSections];
    newSections[sectionIndex].items[itemIndex] = value;
    setEditingSections(newSections);
  };

  // Supprimer un élément
  const deleteItem = (sectionIndex, itemIndex) => {
    const newSections = [...editingSections];
    newSections[sectionIndex].items.splice(itemIndex, 1);
    setEditingSections(newSections);
  };

  // Supprimer une section
  const deleteSection = (sectionIndex) => {
    showConfirm(
      'Supprimer la section',
      'Êtes-vous sûr de vouloir supprimer cette section ?',
      () => {
        const newSections = editingSections.filter((_, i) => i !== sectionIndex);
        setEditingSections(newSections);
      }
    );
  };

  const commonSectionTitles = [
    '🆕 Nouveautés',
    '🔧 Corrections', 
    '⚖️ Équilibrage',
    '🎨 Améliorations visuelles',
    '🎵 Audio',
    '🌟 Contenu'
  ];

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '2rem' 
      }}>
        <h2>
          <i className="fa-solid fa-file-text"></i> Gestion des Notes de Patch
        </h2>
        <button 
          onClick={() => setShowNewVersionForm(true)}
          className="btn btn-primary"
        >
          <i className="fa-solid fa-plus"></i> Nouvelle Version
        </button>
      </div>

      {/* Instructions */}
      <div style={{ 
        background: 'rgba(40, 167, 69, 0.1)', 
        borderRadius: '10px', 
        padding: '1.5rem',
        marginBottom: '2rem',
        border: '1px solid rgba(40, 167, 69, 0.3)'
      }}>
        <h3 style={{ 
          marginBottom: '1rem',
          color: '#28a745',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <i className="fa-solid fa-check-circle"></i>
          Système de Patch Notes Automatique
        </h3>
        <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.9rem' }}>
          <li>Créez des <strong>versions</strong> (0.6, 1.0, etc.) avec leurs <strong>sections</strong></li>
          <li>Ajoutez des <strong>sections thématiques</strong> (Nouveautés, Corrections, etc.)</li>
          <li>Les modifications sont <strong>sauvegardées automatiquement</strong> dans le fichier JSON</li>
          <li>L'image du patch sera nommée <strong>PATCHNOTE[version].png</strong> (ex: PATCHNOTE06.png)</li>
        </ul>
      </div>

      {/* Formulaire nouvelle version */}
      {showNewVersionForm && (
        <div style={{ 
          background: 'rgba(0, 123, 255, 0.1)', 
          borderRadius: '10px', 
          padding: '2rem',
          marginBottom: '2rem',
          border: '1px solid rgba(0, 123, 255, 0.3)'
        }}>
          <h3 style={{ marginBottom: '1.5rem', color: '#007bff' }}>
            <i className="fa-solid fa-plus-circle"></i> Nouvelle Version
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Version:
              </label>
              <input
                type="text"
                value={newVersion.version}
                onChange={(e) => setNewVersion({...newVersion, version: e.target.value})}
                placeholder="Ex: 0.6, 1.0, 2.1"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '5px',
                  border: '1px solid rgba(255,255,255,0.3)',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white'
                }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Date:
              </label>
              <input
                type="text"
                value={newVersion.date}
                onChange={(e) => setNewVersion({...newVersion, date: e.target.value})}
                placeholder="Ex: Janvier 2025"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '5px',
                  border: '1px solid rgba(255,255,255,0.3)',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={addNewVersion} className="btn btn-primary">
              <i className="fa-solid fa-check"></i> Créer la Version
            </button>
            <button 
              onClick={() => setShowNewVersionForm(false)}
              className="btn btn-ghost"
            >
              <i className="fa-solid fa-times"></i> Annuler
            </button>
          </div>
        </div>
      )}

      {/* Liste des versions */}
      <div style={{ 
        background: 'rgba(255,255,255,0.05)', 
        borderRadius: '10px', 
        padding: '2rem' 
      }}>
        <h3 style={{ marginBottom: '1.5rem' }}>
          <i className="fa-solid fa-list"></i> Versions ({patchNotes.versions.length})
        </h3>

        {loading ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '3rem', 
            opacity: 0.6
          }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '3rem', marginBottom: '1rem' }}></i>
            <p>Chargement des versions...</p>
          </div>
        ) : patchNotes.versions.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '3rem', 
            opacity: 0.6,
            fontStyle: 'italic'
          }}>
            <i className="fa-solid fa-file-text" style={{ fontSize: '3rem', marginBottom: '1rem' }}></i>
            <p>Aucune version de patch. Commencez par en créer une !</p>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gap: '1.5rem'
          }}>
            {patchNotes.versions.map((version, index) => (
              <div 
                key={version.version}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  padding: '1.5rem',
                  border: '1px solid rgba(255,255,255,0.2)'
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  marginBottom: '1rem' 
                }}>
                  <div>
                    <h4 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <i className="fa-solid fa-tag"></i>
                      Version {version.version}
                      {index === 0 && (
                        <span style={{
                          background: 'rgba(40, 167, 69, 0.2)',
                          border: '1px solid rgba(40, 167, 69, 0.4)',
                          color: '#28a745',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '3px',
                          fontSize: '0.7rem'
                        }}>
                          LATEST
                        </span>
                      )}
                    </h4>
                    <p style={{ margin: 0, opacity: 0.7, fontSize: '0.9rem' }}>
                      <i className="fa-solid fa-calendar"></i> {version.date} • {version.sections.length} section(s)
                    </p>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => startEditingVersion(version)}
                      className="btn btn-ghost"
                      style={{ padding: '0.5rem 1rem' }}
                    >
                      <i className="fa-solid fa-edit"></i> Éditer
                    </button>
                    <button
                      onClick={() => deleteVersion(version.version)}
                      style={{
                        background: 'rgba(220, 53, 69, 0.2)',
                        border: '1px solid rgba(220, 53, 69, 0.4)',
                        color: '#ff6b7a',
                        borderRadius: '6px',
                        padding: '0.5rem 1rem',
                        cursor: 'pointer'
                      }}
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </div>
                </div>

                {/* Aperçu des sections */}
                {version.sections.length > 0 && (
                  <div style={{ 
                    background: 'rgba(255,255,255,0.05)', 
                    borderRadius: '5px', 
                    padding: '1rem' 
                  }}>
                    <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', opacity: 0.8 }}>
                      Aperçu des sections:
                    </h5>
                    {version.sections.map((section, sIndex) => (
                      <div key={sIndex} style={{ marginBottom: '0.5rem', fontSize: '0.8rem' }}>
                        <strong>{section.title}</strong> ({section.items.length} élément(s))
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Éditeur de version */}
      {editingVersion && (
        <div style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.9)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          zIndex: 9999,
          padding: '2rem',
          overflowY: 'auto'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '20px',
            padding: '2rem',
            maxWidth: '800px',
            width: '100%',
            color: 'white',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '2rem' 
            }}>
              <h3>
                <i className="fa-solid fa-edit"></i> Éditer Version {editingVersion}
              </h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={saveVersionEdits} className="btn btn-primary">
                  <i className="fa-solid fa-save"></i> Sauvegarder
                </button>
                <button 
                  onClick={() => {
                    setEditingVersion(null);
                    setEditingSections([]);
                  }}
                  className="btn btn-ghost"
                >
                  <i className="fa-solid fa-times"></i> Fermer
                </button>
              </div>
            </div>

            {/* Boutons sections rapides */}
            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ marginBottom: '1rem', fontSize: '1rem' }}>
                <i className="fa-solid fa-magic"></i> Sections rapides:
              </h4>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {commonSectionTitles.map((title, index) => (
                  <button
                    key={index}
                    onClick={() => setEditingSections([...editingSections, { title, items: [''] }])}
                    className="btn btn-ghost"
                    style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                  >
                    {title}
                  </button>
                ))}
                <button onClick={addSection} className="btn btn-primary" style={{ fontSize: '0.8rem' }}>
                  <i className="fa-solid fa-plus"></i> Section personnalisée
                </button>
              </div>
            </div>

            {/* Sections */}
            {editingSections.map((section, sectionIndex) => (
              <div 
                key={sectionIndex}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  padding: '1.5rem',
                  marginBottom: '1.5rem',
                  border: '1px solid rgba(255,255,255,0.2)'
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  marginBottom: '1rem' 
                }}>
                  <h5 style={{ margin: 0 }}>Section #{sectionIndex + 1}</h5>
                  <button
                    onClick={() => deleteSection(sectionIndex)}
                    style={{
                      background: 'rgba(220, 53, 69, 0.2)',
                      border: '1px solid rgba(220, 53, 69, 0.4)',
                      color: '#ff6b7a',
                      borderRadius: '4px',
                      padding: '0.25rem 0.5rem',
                      cursor: 'pointer'
                    }}
                  >
                    <i className="fa-solid fa-trash"></i>
                  </button>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Titre de la section:
                  </label>
                  <input
                    type="text"
                    value={section.title}
                    onChange={(e) => updateSectionTitle(sectionIndex, e.target.value)}
                    placeholder="Ex: 🆕 Nouveautés, 🔧 Corrections"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '5px',
                      border: '1px solid rgba(255,255,255,0.3)',
                      background: 'rgba(255,255,255,0.1)',
                      color: 'white'
                    }}
                  />
                </div>

                <div>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginBottom: '1rem' 
                  }}>
                    <label style={{ fontWeight: 'bold' }}>
                      Éléments ({section.items.length}):
                    </label>
                    <button
                      onClick={() => addItem(sectionIndex)}
                      className="btn btn-ghost"
                      style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                    >
                      <i className="fa-solid fa-plus"></i> Ajouter
                    </button>
                  </div>

                  {section.items.map((item, itemIndex) => (
                    <div key={itemIndex} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <input
                        type="text"
                        value={item}
                        onChange={(e) => updateItem(sectionIndex, itemIndex, e.target.value)}
                        placeholder="Décrivez la nouveauté, correction ou amélioration..."
                        style={{
                          flex: 1,
                          padding: '0.5rem',
                          borderRadius: '5px',
                          border: '1px solid rgba(255,255,255,0.3)',
                          background: 'rgba(255,255,255,0.05)',
                          color: 'white',
                          fontSize: '0.9rem'
                        }}
                      />
                      <button
                        onClick={() => deleteItem(sectionIndex, itemIndex)}
                        style={{
                          background: 'rgba(220, 53, 69, 0.2)',
                          border: '1px solid rgba(220, 53, 69, 0.4)',
                          color: '#ff6b7a',
                          borderRadius: '4px',
                          padding: '0.5rem',
                          cursor: 'pointer',
                          fontSize: '0.8rem'
                        }}
                      >
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {editingSections.length === 0 && (
              <div style={{ 
                textAlign: 'center', 
                padding: '2rem', 
                opacity: 0.6,
                fontStyle: 'italic',
                border: '1px dashed rgba(255,255,255,0.2)',
                borderRadius: '10px'
              }}>
                <i className="fa-solid fa-plus-circle" style={{ fontSize: '2rem', marginBottom: '1rem' }}></i>
                <p>Aucune section. Utilisez les boutons rapides ci-dessus pour commencer !</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '20px',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%',
            color: 'white',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
          }}>
            <div style={{ marginBottom: '1.5rem' }}>
              {modalConfig.type === 'success' && (
                <i className="fa-solid fa-check-circle" style={{ 
                  fontSize: '3rem', 
                  color: '#28a745',
                  marginBottom: '1rem',
                  display: 'block'
                }}></i>
              )}
              {modalConfig.type === 'error' && (
                <i className="fa-solid fa-exclamation-triangle" style={{ 
                  fontSize: '3rem', 
                  color: '#dc3545',
                  marginBottom: '1rem',
                  display: 'block'
                }}></i>
              )}
              {modalConfig.type === 'confirm' && (
                <i className="fa-solid fa-question-circle" style={{ 
                  fontSize: '3rem', 
                  color: '#ffc107',
                  marginBottom: '1rem',
                  display: 'block'
                }}></i>
              )}
              {modalConfig.type === 'info' && (
                <i className="fa-solid fa-info-circle" style={{ 
                  fontSize: '3rem', 
                  color: '#17a2b8',
                  marginBottom: '1rem',
                  display: 'block'
                }}></i>
              )}
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem' }}>
                {modalConfig.title}
              </h3>
              <p style={{ margin: '0', opacity: 0.9, lineHeight: '1.5' }}>
                {modalConfig.message}
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              {modalConfig.type === 'confirm' ? (
                <>
                  <button
                    onClick={() => {
                      closeModal();
                      if (modalConfig.onConfirm) modalConfig.onConfirm();
                    }}
                    style={{
                      background: 'rgba(220, 53, 69, 0.8)',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '0.75rem 1.5rem',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      fontWeight: 'bold'
                    }}
                  >
                    <i className="fa-solid fa-check"></i> Confirmer
                  </button>
                  <button
                    onClick={closeModal}
                    style={{
                      background: 'rgba(108, 117, 125, 0.8)',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '0.75rem 1.5rem',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '1rem'
                    }}
                  >
                    <i className="fa-solid fa-times"></i> Annuler
                  </button>
                </>
              ) : (
                <button
                  onClick={closeModal}
                  style={{
                    background: 'rgba(0, 123, 255, 0.8)',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '0.75rem 2rem',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: 'bold'
                  }}
                >
                  <i className="fa-solid fa-check"></i> OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatchNotesEditor;