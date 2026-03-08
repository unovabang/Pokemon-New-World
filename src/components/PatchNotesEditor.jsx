import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

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
            image: currentVersion.image || `/PATCHNOTE${String(currentVersion.version || '').replace('.', '')}.png` || '',
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
          image: currentPatch.image || undefined,
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
    <div className="patchnotes-editor">
      <div className="patchnotes-editor-head">
        <div className="patchnotes-editor-title-wrap">
          <h2 className="patchnotes-editor-title"><i className="fa-solid fa-file-lines" /> Notes de patch</h2>
          <div className="patchnotes-editor-lang">
            <span className="patchnotes-editor-lang-label">Langue</span>
            <select value={currentLang} onChange={(e) => setCurrentLang(e.target.value)} className="patchnotes-editor-select">
              <option value="fr">🇫🇷 Français</option>
              <option value="en">🇺🇸 English</option>
            </select>
          </div>
        </div>
        <div className="patchnotes-editor-actions">
          {!isEditing ? (
            <button type="button" onClick={startEditing} className="btn btn-primary">
              <i className="fa-solid fa-pen" /> Modifier le patch
            </button>
          ) : (
            <>
              <button type="button" onClick={savePatch} className="btn btn-primary">
                <i className="fa-solid fa-save" /> Sauvegarder
              </button>
              <button type="button" onClick={cancelEditing} className="btn btn-ghost">
                <i className="fa-solid fa-times" /> Annuler
              </button>
            </>
          )}
        </div>
      </div>

      <p className="patchnotes-editor-desc">
        Modifiez le patch actuel (version, date, image, sections). Les changements sont enregistrés sur le serveur et visibles sur l’accueil et la page PatchNotes.
      </p>

      <div className="patchnotes-editor-card card">
        {loading ? (
          <div className="patchnotes-editor-loading">
            <i className="fa-solid fa-spinner fa-spin" />
            <span>Chargement du patch…</span>
          </div>
        ) : (
          <div className="patchnotes-editor-body">
            <div className="patchnotes-editor-info card">
              <h3 className="patchnotes-editor-info-title"><i className="fa-solid fa-info-circle" /> Informations du patch</h3>
              <div className="patchnotes-editor-fields">
                <label className="patchnotes-editor-field">
                  <span>Version</span>
                  <input type="text" value={currentPatch.version} onChange={(e) => updatePatchProperty('version', e.target.value)} placeholder="Ex: 0.6, 1.0" disabled={!isEditing} className="patchnotes-editor-input" />
                </label>
                <label className="patchnotes-editor-field">
                  <span>Date</span>
                  <input type="text" value={currentPatch.date} onChange={(e) => updatePatchProperty('date', e.target.value)} placeholder="Ex: Janvier 2025" disabled={!isEditing} className="patchnotes-editor-input" />
                </label>
                <label className="patchnotes-editor-field">
                  <span>URL image</span>
                  <input type="text" value={currentPatch.image} onChange={(e) => updatePatchProperty('image', e.target.value)} placeholder="/PATCHNOTE06.png ou https://…" disabled={!isEditing} className="patchnotes-editor-input" />
                </label>
              </div>
              {currentPatch.image && (
                <div className="patchnotes-editor-preview">
                  <span>Aperçu</span>
                  <img src={currentPatch.image} alt="Aperçu patch" className="patchnotes-editor-preview-img" onError={(e) => { e.target.style.display = 'none'; }} />
                </div>
              )}
            </div>

            {isEditing && (
              <div className="patchnotes-editor-sections card">
                <h3 className="patchnotes-editor-sections-title"><i className="fa-solid fa-list" /> Sections</h3>
                <div className="patchnotes-editor-quick">
                  <span>Sections rapides</span>
                  <div className="patchnotes-editor-quick-btns">
                    {commonSectionTitles.map((title, index) => (
                      <button key={index} type="button" className="btn btn-ghost patchnotes-editor-quick-btn" onClick={() => setCurrentPatch(prev => ({ ...prev, sections: [...prev.sections, { title, items: [''] }] }))}>
                        {title}
                      </button>
                    ))}
                  </div>
                  <button type="button" onClick={addSection} className="btn btn-primary">
                    <i className="fa-solid fa-plus" /> Section personnalisée
                  </button>
                </div>
                {currentPatch.sections.map((section, sectionIndex) => (
                  <div key={sectionIndex} className="patchnotes-editor-section card">
                    <div className="patchnotes-editor-section-head">
                      <h4>Section {sectionIndex + 1}</h4>
                      <button type="button" onClick={() => deleteSection(sectionIndex)} className="btn btn-ghost patchnotes-editor-delete-btn">
                        <i className="fa-solid fa-trash" /> Supprimer
                      </button>
                    </div>
                    <label className="patchnotes-editor-field">
                      <span>Titre</span>
                      <input type="text" value={section.title || ''} onChange={(e) => updateSectionTitle(sectionIndex, e.target.value)} placeholder="Ex: 🆕 Nouveautés" className="patchnotes-editor-input" />
                    </label>
                    <div className="patchnotes-editor-items">
                      <div className="patchnotes-editor-items-head">
                        <span>Éléments</span>
                        <button type="button" onClick={() => addItem(sectionIndex)} className="btn btn-ghost"><i className="fa-solid fa-plus" /> Ajouter</button>
                      </div>
                      {(section.items || []).map((item, itemIndex) => (
                        <div key={itemIndex} className="patchnotes-editor-item-row">
                          <input type="text" value={item || ''} onChange={(e) => updateItem(sectionIndex, itemIndex, e.target.value)} placeholder="Description…" className="patchnotes-editor-input" />
                          <button type="button" onClick={() => deleteItem(sectionIndex, itemIndex)} className="patchnotes-editor-delete-btn" title="Supprimer"><i className="fa-solid fa-trash" /></button>
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

      {showModal && createPortal(
        <div className="admin-pokedex-modal-overlay" onClick={closeModal}>
          <div className="admin-pokedex-modal" onClick={(e) => e.stopPropagation()} style={{ padding: '2rem', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 1rem', color: '#fff' }}>
              <i className={`fa-solid ${modalConfig.type === 'error' ? 'fa-exclamation-triangle' : 'fa-info-circle'}`} style={{ color: modalConfig.type === 'error' ? '#f87171' : 'var(--primary-2)', marginRight: '.5rem' }} />
              {modalConfig.title}
            </h3>
            <p style={{ margin: '0 0 1.5rem', color: 'rgba(255,255,255,0.85)' }}>{modalConfig.message}</p>
            <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              {modalConfig.type === 'confirm' && (
                <button type="button" className="btn btn-primary" onClick={() => { modalConfig.onConfirm?.(); closeModal(); }}>
                  <i className="fa-solid fa-check" /> Confirmer
                </button>
              )}
              <button type="button" className="btn btn-ghost" onClick={closeModal}>
                <i className="fa-solid fa-times" /> {modalConfig.type === 'confirm' ? 'Annuler' : 'OK'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default PatchNotesEditor;