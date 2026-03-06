import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:3001/api`
    : `${window.location.origin}/api`;

const PatchNotesEditor = ({ onSave }) => {
  const [currentLang, setCurrentLang] = useState('fr');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    type: 'info',
    onConfirm: null
  });

  // États pour l'édition du patch actuel
  const [currentPatch, setCurrentPatch] = useState({
    version: '',
    date: '',
    image: '',
    sections: []
  });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadPatchNotes();
  }, [currentLang]);

  const loadPatchNotes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/patchnotes/${currentLang}?t=${Date.now()}`);
      const data = await response.json();
      
      if (data.success) {
        // Charger la première version (version actuelle) pour édition
        if (data.patchnotes.versions && data.patchnotes.versions.length > 0) {
          const currentVersion = data.patchnotes.versions[0];
          setCurrentPatch({
            version: currentVersion.version || '',
            date: currentVersion.date || '',
            image: `/PATCHNOTE${currentVersion.version?.replace('.', '')}.png` || '',
            sections: currentVersion.sections || []
          });
        }
      } else {
        console.error('Erreur lors du chargement:', data.error);
      }
    } catch (error) {
      console.error('Erreur de connexion à l\'API:', error);
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

  // Sauvegarder le patch actuel
  const savePatch = async () => {
    if (!currentPatch.version || !currentPatch.date) {
      showMessage('Erreur', 'Veuillez remplir la version et la date', 'error');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/patchnotes/${currentLang}/version/${currentPatch.version}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: currentPatch.version,
          date: currentPatch.date,
          sections: currentPatch.sections
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setIsEditing(false);
        showMessage('Succès', 'Patch mis à jour avec succès!', 'success');
        loadPatchNotes();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      showMessage('Erreur', `Erreur lors de la sauvegarde: ${error.message}`, 'error');
    }
  };

  // Mettre à jour les propriétés du patch
  const updatePatchProperty = (property, value) => {
    setCurrentPatch(prev => ({
      ...prev,
      [property]: value
    }));
  };

  // Commencer l'édition
  const startEditing = () => {
    setIsEditing(true);
  };

  // Annuler l'édition
  const cancelEditing = () => {
    setIsEditing(false);
    loadPatchNotes(); // Recharger les données originales
  };

  // Ajouter une section
  const addSection = () => {
    const newSections = [...currentPatch.sections, { title: '', items: [''] }];
    setCurrentPatch(prev => ({ ...prev, sections: newSections }));
  };

  // Mettre à jour le titre d'une section
  const updateSectionTitle = (sectionIndex, title) => {
    const newSections = [...currentPatch.sections];
    newSections[sectionIndex].title = title;
    setCurrentPatch(prev => ({ ...prev, sections: newSections }));
  };

  // Ajouter un élément à une section
  const addItem = (sectionIndex) => {
    const newSections = [...currentPatch.sections];
    if (!newSections[sectionIndex].items) {
      newSections[sectionIndex].items = [];
    }
    newSections[sectionIndex].items.push('');
    setCurrentPatch(prev => ({ ...prev, sections: newSections }));
  };

  // Mettre à jour un élément
  const updateItem = (sectionIndex, itemIndex, value) => {
    const newSections = [...currentPatch.sections];
    if (!newSections[sectionIndex].items) {
      newSections[sectionIndex].items = [];
    }
    newSections[sectionIndex].items[itemIndex] = value;
    setCurrentPatch(prev => ({ ...prev, sections: newSections }));
  };

  // Supprimer un élément
  const deleteItem = (sectionIndex, itemIndex) => {
    const newSections = [...currentPatch.sections];
    if (newSections[sectionIndex].items) {
      newSections[sectionIndex].items.splice(itemIndex, 1);
      setCurrentPatch(prev => ({ ...prev, sections: newSections }));
    }
  };

  // Supprimer une section
  const deleteSection = (sectionIndex) => {
    showConfirm(
      'Supprimer la section',
      'Êtes-vous sûr de vouloir supprimer cette section ?',
      () => {
        const newSections = currentPatch.sections.filter((_, i) => i !== sectionIndex);
        setCurrentPatch(prev => ({ ...prev, sections: newSections }));
      }
    );
  };

  const commonSectionTitles = currentLang === 'fr' ? [
    '🆕 Nouveautés',
    '🔧 Corrections', 
    '⚖️ Équilibrage',
    '🎨 Améliorations visuelles',
    '🎵 Audio',
    '🌟 Contenu'
  ] : [
    '🆕 New Features',
    '🔧 Bug Fixes', 
    '⚖️ Balance Changes',
    '🎨 Visual Improvements',
    '🎵 Audio',
    '🌟 Content'
  ];

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '2rem' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h2>
            <i className="fa-solid fa-file-text"></i> Édition du Patch Actuel
          </h2>
          
          {/* Sélecteur de langue */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>Langue:</span>
            <select 
              value={currentLang} 
              onChange={(e) => setCurrentLang(e.target.value)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.3)',
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              <option value="fr" style={{ background: '#1a1a1a', color: 'white' }}>
                🇫🇷 Français
              </option>
              <option value="en" style={{ background: '#1a1a1a', color: 'white' }}>
                🇺🇸 English
              </option>
            </select>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          {!isEditing ? (
            <button onClick={startEditing} className="btn btn-primary">
              <i className="fa-solid fa-edit"></i> Modifier le Patch
            </button>
          ) : (
            <>
              <button onClick={savePatch} className="btn btn-success">
                <i className="fa-solid fa-save"></i> Sauvegarder
              </button>
              <button onClick={cancelEditing} className="btn btn-ghost">
                <i className="fa-solid fa-times"></i> Annuler
              </button>
            </>
          )}
        </div>
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
          Édition des Notes de Patch
        </h3>
        <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.9rem' }}>
          <li>Modifiez directement les informations du <strong>patch actuel</strong></li>
          <li>Ajoutez l'URL de <strong>l'image du patch</strong> pour l'afficher sur le site</li>
          <li>Créez des <strong>sections thématiques</strong> (Nouveautés, Corrections, etc.)</li>
          <li>Les modifications sont <strong>sauvegardées automatiquement</strong> dans le fichier JSON</li>
        </ul>
      </div>

      {/* Éditeur du patch actuel */}
      <div style={{ 
        background: 'rgba(255,255,255,0.05)', 
        borderRadius: '10px', 
        padding: '2rem' 
      }}>
        {loading ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '3rem', 
            opacity: 0.6
          }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '3rem', marginBottom: '1rem' }}></i>
            <p>Chargement du patch...</p>
          </div>
        ) : (
          <div>
            {/* Informations de base du patch */}
            <div style={{ 
              background: 'rgba(255,255,255,0.1)', 
              borderRadius: '10px', 
              padding: '1.5rem',
              marginBottom: '2rem',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              <h3 style={{ marginBottom: '1.5rem' }}>
                <i className="fa-solid fa-info-circle"></i> Informations du Patch
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Version:
                  </label>
                  <input
                    type="text"
                    value={currentPatch.version}
                    onChange={(e) => updatePatchProperty('version', e.target.value)}
                    placeholder="Ex: 0.6, 1.0, 2.1"
                    disabled={!isEditing}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '5px',
                      border: '1px solid rgba(255,255,255,0.3)',
                      background: isEditing ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
                      color: 'white',
                      opacity: isEditing ? 1 : 0.7
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Date:
                  </label>
                  <input
                    type="text"
                    value={currentPatch.date}
                    onChange={(e) => updatePatchProperty('date', e.target.value)}
                    placeholder="Ex: Janvier 2025"
                    disabled={!isEditing}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '5px',
                      border: '1px solid rgba(255,255,255,0.3)',
                      background: isEditing ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
                      color: 'white',
                      opacity: isEditing ? 1 : 0.7
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    URL Image:
                  </label>
                  <input
                    type="text"
                    value={currentPatch.image}
                    onChange={(e) => updatePatchProperty('image', e.target.value)}
                    placeholder="https://example.com/patch-image.png"
                    disabled={!isEditing}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '5px',
                      border: '1px solid rgba(255,255,255,0.3)',
                      background: isEditing ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
                      color: 'white',
                      opacity: isEditing ? 1 : 0.7
                    }}
                  />
                </div>
              </div>
              
              {/* Aperçu de l'image */}
              {currentPatch.image && (
                <div style={{ marginTop: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Aperçu de l'image:
                  </label>
                  <img 
                    src={currentPatch.image} 
                    alt="Aperçu patch" 
                    style={{ 
                      maxWidth: '200px', 
                      maxHeight: '120px', 
                      borderRadius: '5px',
                      border: '1px solid rgba(255,255,255,0.3)'
                    }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            {/* Éditeur de sections */}
            {isEditing && (
              <div style={{ 
                background: 'rgba(255,255,255,0.1)', 
                borderRadius: '10px', 
                padding: '1.5rem',
                border: '1px solid rgba(255,255,255,0.2)'
              }}>
                <h3 style={{ marginBottom: '1.5rem' }}>
                  <i className="fa-solid fa-list"></i> Sections du Patch
                </h3>
                
                {/* Boutons de sections rapides */}
                <div style={{ marginBottom: '2rem' }}>
                  <h4 style={{ marginBottom: '1rem', fontSize: '0.9rem', opacity: 0.8 }}>
                    Sections rapides :
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                    {commonSectionTitles.map((title, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          const newSections = [...currentPatch.sections, { title, items: [''] }];
                          setCurrentPatch(prev => ({ ...prev, sections: newSections }));
                        }}
                        className="btn btn-ghost"
                        style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem' }}
                      >
                        {title}
                      </button>
                    ))}
                  </div>
                  <button onClick={addSection} className="btn btn-primary" style={{ fontSize: '0.8rem' }}>
                    <i className="fa-solid fa-plus"></i> Section personnalisée
                  </button>
                </div>

                {/* Liste des sections */}
                {currentPatch.sections.map((section, sectionIndex) => (
                  <div key={sectionIndex} style={{
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    padding: '1rem',
                    marginBottom: '1rem',
                    border: '1px solid rgba(255,255,255,0.2)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h4 style={{ margin: 0, fontSize: '1rem' }}>Section {sectionIndex + 1}</h4>
                      <button
                        onClick={() => deleteSection(sectionIndex)}
                        style={{
                          background: 'rgba(220, 53, 69, 0.2)',
                          border: '1px solid rgba(220, 53, 69, 0.4)',
                          color: '#ff6b7a',
                          borderRadius: '4px',
                          padding: '0.25rem 0.5rem',
                          cursor: 'pointer',
                          fontSize: '0.8rem'
                        }}
                      >
                        <i className="fa-solid fa-trash"></i> Supprimer
                      </button>
                    </div>
                    
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                        Titre de la section:
                      </label>
                      <input
                        type="text"
                        value={section.title || ''}
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <label style={{ fontWeight: 'bold' }}>
                          Éléments de la section:
                        </label>
                        <button
                          onClick={() => addItem(sectionIndex)}
                          className="btn btn-ghost"
                          style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                        >
                          <i className="fa-solid fa-plus"></i> Ajouter
                        </button>
                      </div>
                      
                      {(section.items || []).map((item, itemIndex) => (
                        <div key={itemIndex} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <input
                            type="text"
                            value={item || ''}
                            onChange={(e) => updateItem(sectionIndex, itemIndex, e.target.value)}
                            placeholder="Décrivez la nouveauté, correction ou amélioration..."
                            style={{
                              flex: 1,
                              padding: '0.5rem',
                              borderRadius: '5px',
                              border: '1px solid rgba(255,255,255,0.3)',
                              background: 'rgba(255,255,255,0.1)',
                              color: 'white'
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
                              cursor: 'pointer'
                            }}
                          >
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

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
            borderRadius: '15px',
            padding: '2rem',
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center',
            color: 'white'
          }}>
            <h3 style={{ marginBottom: '1rem' }}>
              <i className={`fa-solid ${modalConfig.type === 'error' ? 'fa-exclamation-triangle' : 'fa-info-circle'}`} 
                 style={{ color: modalConfig.type === 'error' ? '#ff6b7a' : '#3b82f6' }}></i>
              {' ' + modalConfig.title}
            </h3>
            <p style={{ marginBottom: '2rem', opacity: 0.9 }}>{modalConfig.message}</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
              {modalConfig.type === 'confirm' && (
                <button
                  onClick={() => {
                    modalConfig.onConfirm && modalConfig.onConfirm();
                    closeModal();
                  }}
                  className="btn btn-primary"
                >
                  <i className="fa-solid fa-check"></i> Confirmer
                </button>
              )}
              <button
                onClick={closeModal}
                className={modalConfig.type === 'confirm' ? 'btn btn-ghost' : 'btn btn-primary'}
              >
                <i className="fa-solid fa-times"></i> {modalConfig.type === 'confirm' ? 'Annuler' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatchNotesEditor;