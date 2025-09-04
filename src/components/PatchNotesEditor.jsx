import { useState, useEffect } from 'react';

const PatchNotesEditor = ({ patchnotesData, onSave }) => {
  const [version, setVersion] = useState('');
  const [date, setDate] = useState('');
  const [title, setTitle] = useState('');
  const [sections, setSections] = useState([]);

  useEffect(() => {
    if (patchnotesData) {
      setVersion(patchnotesData.version || '');
      setDate(patchnotesData.date || '');
      setTitle(patchnotesData.content?.title || '');
      setSections(patchnotesData.content?.sections || []);
    }
  }, [patchnotesData]);

  const addSection = () => {
    setSections([...sections, {
      title: '',
      items: ['']
    }]);
  };

  const updateSectionTitle = (sectionIndex, title) => {
    const newSections = [...sections];
    newSections[sectionIndex].title = title;
    setSections(newSections);
  };

  const addItem = (sectionIndex) => {
    const newSections = [...sections];
    newSections[sectionIndex].items.push('');
    setSections(newSections);
  };

  const updateItem = (sectionIndex, itemIndex, value) => {
    const newSections = [...sections];
    newSections[sectionIndex].items[itemIndex] = value;
    setSections(newSections);
  };

  const deleteItem = (sectionIndex, itemIndex) => {
    const newSections = [...sections];
    newSections[sectionIndex].items.splice(itemIndex, 1);
    setSections(newSections);
  };

  const deleteSection = (sectionIndex) => {
    if (confirm('Supprimer cette section ?')) {
      setSections(sections.filter((_, i) => i !== sectionIndex));
    }
  };

  const moveSection = (sectionIndex, direction) => {
    const newSections = [...sections];
    const targetIndex = direction === 'up' ? sectionIndex - 1 : sectionIndex + 1;
    
    if (targetIndex >= 0 && targetIndex < sections.length) {
      [newSections[sectionIndex], newSections[targetIndex]] = [newSections[targetIndex], newSections[sectionIndex]];
      setSections(newSections);
    }
  };

  const handleSave = () => {
    const patchnotesConfig = {
      version,
      date,
      content: {
        title,
        sections: sections.filter(section => section.title.trim() !== '' || section.items.some(item => item.trim() !== ''))
      }
    };
    onSave(patchnotesConfig);
    alert('Notes de patch sauvegardées avec succès !');
  };

  const getVersionWithoutDot = (ver) => {
    return ver.replace(/\./g, '');
  };

  const commonSectionTitles = [
    { title: '🆕 Nouveautés', icon: '🆕' },
    { title: '🔧 Corrections', icon: '🔧' },
    { title: '⚖️ Équilibrage', icon: '⚖️' },
    { title: '🎨 Améliorations visuelles', icon: '🎨' },
    { title: '🎵 Audio', icon: '🎵' },
    { title: '🌟 Contenu', icon: '🌟' }
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
          <i className="fa-solid fa-file-text"></i> Éditeur de Notes de Patch
        </h2>
        <button onClick={handleSave} className="btn btn-primary">
          <i className="fa-solid fa-save"></i> Sauvegarder
        </button>
      </div>

      {/* Informations générales */}
      <div style={{ 
        background: 'rgba(255,255,255,0.05)', 
        borderRadius: '10px', 
        padding: '2rem', 
        marginBottom: '2rem' 
      }}>
        <h3 style={{ marginBottom: '1.5rem' }}>
          <i className="fa-solid fa-info-circle"></i> Informations du Patch
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              <i className="fa-solid fa-tag"></i> Version:
            </label>
            <input
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
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
              <i className="fa-solid fa-calendar"></i> Date:
            </label>
            <input
              type="text"
              value={date}
              onChange={(e) => setDate(e.target.value)}
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
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              <i className="fa-solid fa-image"></i> Image générée:
            </label>
            <div style={{
              padding: '0.75rem',
              borderRadius: '5px',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.05)',
              color: 'rgba(255,255,255,0.7)'
            }}>
              PATCHNOTE{getVersionWithoutDot(version)}.png
            </div>
          </div>
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            <i className="fa-solid fa-heading"></i> Titre du modal:
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Notes de patch 0.6"
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

        <div style={{ 
          marginTop: '1rem',
          padding: '1rem',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '5px',
          fontSize: '0.9rem',
          opacity: 0.8
        }}>
          <i className="fa-solid fa-lightbulb"></i> L'image du patch sera automatiquement générée avec le nom <strong>PATCHNOTE{getVersionWithoutDot(version)}.png</strong> à placer dans le dossier public/
        </div>
      </div>

      {/* Sections des notes */}
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
          <h3>
            <i className="fa-solid fa-list"></i> Sections du Patch ({sections.length})
          </h3>
          <button onClick={addSection} className="btn btn-primary">
            <i className="fa-solid fa-plus"></i> Ajouter une section
          </button>
        </div>

        {/* Boutons de sections prédéfinies */}
        <div style={{ marginBottom: '2rem' }}>
          <h4 style={{ marginBottom: '1rem', fontSize: '1rem', opacity: 0.8 }}>
            <i className="fa-solid fa-magic"></i> Sections rapides:
          </h4>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {commonSectionTitles.map((preset, index) => (
              <button
                key={index}
                onClick={() => setSections([...sections, { title: preset.title, items: [''] }])}
                className="btn btn-ghost"
                style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
              >
                {preset.title}
              </button>
            ))}
          </div>
        </div>

        {sections.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: '3rem', 
            opacity: 0.6, 
            fontStyle: 'italic' 
          }}>
            <i className="fa-solid fa-file-text" style={{ fontSize: '3rem', marginBottom: '1rem' }}></i>
            <p>Aucune section de notes. Commencez par en ajouter une !</p>
          </div>
        )}

        {sections.map((section, sectionIndex) => (
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
              <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="fa-solid fa-folder-open"></i> 
                Section #{sectionIndex + 1}
              </h4>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => moveSection(sectionIndex, 'up')}
                  disabled={sectionIndex === 0}
                  className="btn btn-ghost"
                  style={{ padding: '0.25rem 0.5rem' }}
                >
                  <i className="fa-solid fa-arrow-up"></i>
                </button>
                <button
                  onClick={() => moveSection(sectionIndex, 'down')}
                  disabled={sectionIndex === sections.length - 1}
                  className="btn btn-ghost"
                  style={{ padding: '0.25rem 0.5rem' }}
                >
                  <i className="fa-solid fa-arrow-down"></i>
                </button>
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
            </div>

            {/* Titre de la section */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                <i className="fa-solid fa-heading"></i> Titre de la section:
              </label>
              <input
                type="text"
                value={section.title}
                onChange={(e) => updateSectionTitle(sectionIndex, e.target.value)}
                placeholder="Ex: 🆕 Nouveautés, 🔧 Corrections, ⚖️ Équilibrage"
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

            {/* Éléments de la section */}
            <div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '1rem' 
              }}>
                <label style={{ fontWeight: 'bold' }}>
                  <i className="fa-solid fa-list-ul"></i> Éléments ({section.items.length}):
                </label>
                <button
                  onClick={() => addItem(sectionIndex)}
                  className="btn btn-ghost"
                  style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                >
                  <i className="fa-solid fa-plus"></i> Ajouter un élément
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

              {section.items.length === 0 && (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '1rem', 
                  opacity: 0.6, 
                  fontStyle: 'italic',
                  border: '1px dashed rgba(255,255,255,0.2)',
                  borderRadius: '5px'
                }}>
                  Aucun élément dans cette section. Cliquez sur "Ajouter un élément" !
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Aperçu */}
        {(title || sections.some(s => s.title || s.items.some(item => item.trim()))) && (
          <div style={{ 
            background: 'rgba(0, 123, 255, 0.1)', 
            borderRadius: '10px', 
            padding: '2rem',
            border: '1px solid rgba(0, 123, 255, 0.3)',
            marginTop: '2rem'
          }}>
            <h3 style={{ 
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#007bff'
            }}>
              <i className="fa-solid fa-eye"></i>
              Aperçu du Modal
            </h3>
            
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '8px',
              padding: '1.5rem',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <div style={{ marginBottom: '1rem' }}>
                <h3>{title || 'Titre du patch'}</h3>
                <p style={{ opacity: 0.8, fontSize: '0.9rem' }}>
                  Version {version || 'X.X'} - {date || 'Date'}
                </p>
              </div>
              
              {sections.filter(s => s.title.trim() || s.items.some(item => item.trim())).map((section, index) => (
                <div key={index} style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ marginBottom: '0.5rem' }}>{section.title || 'Section sans titre'}</h4>
                  <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                    {section.items.filter(item => item.trim()).map((item, itemIndex) => (
                      <li key={itemIndex} style={{ marginBottom: '0.25rem' }}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatchNotesEditor;