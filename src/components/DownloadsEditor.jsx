import { useState, useEffect } from 'react';
import AdvancedModal from './AdvancedModal';

const API_BASE = `${window.location.protocol}//${window.location.hostname.replace(/:\d+$/, '')}:3001/api`;

const DownloadsEditor = ({ onSave }) => {
  const [windowsLink, setWindowsLink] = useState('');
  const [patchLink, setPatchLink] = useState('');
  const [patchVideo, setPatchVideo] = useState('');
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
    loadDownloads();
  }, []);

  const loadDownloads = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/downloads?t=${Date.now()}`);
      const data = await response.json();
      
      if (data.success && data.downloads) {
        setWindowsLink(data.downloads.windows || '');
        setPatchLink(data.downloads.patch || '');
        setPatchVideo(data.downloads.patchVideo || '');
      }
    } catch (error) {
      console.error('Erreur lors du chargement des téléchargements:', error);
      showMessage('Erreur', 'Impossible de charger les téléchargements', 'error');
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

  const handleSave = async () => {
    showConfirm(
      'Confirmer la sauvegarde',
      'Êtes-vous sûr de vouloir sauvegarder les modifications des téléchargements ?',
      async () => {
        try {
          setSaving(true);
          const downloadsConfig = {
            windows: windowsLink,
            patch: patchLink,
            patchVideo: patchVideo
          };
          
          const response = await fetch(`${API_BASE}/downloads`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ downloads: downloadsConfig })
          });
          
          const data = await response.json();
          
          if (data.success) {
            onSave(downloadsConfig);
            showMessage('Succès !', 'Liens de téléchargement sauvegardés avec succès !', 'success');
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

  const testLink = (url) => {
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
        <span>Chargement des téléchargements...</span>
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
          <i className="fa-solid fa-download"></i> Gestion des Téléchargements
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

      <div style={{ 
        display: 'grid', 
        gap: '2rem'
      }}>
        {/* Téléchargement Windows */}
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
            gap: '0.5rem'
          }}>
            <i className="fa-brands fa-windows" style={{ color: '#0078d4' }}></i>
            Jeu Principal (Windows)
          </h3>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontWeight: 'bold' 
            }}>
              <i className="fa-solid fa-link"></i> Lien de téléchargement:
            </label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <input
                type="url"
                value={windowsLink}
                onChange={(e) => setWindowsLink(e.target.value)}
                placeholder="https://exemple.com/pokemon-new-world.zip"
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
                onClick={() => testLink(windowsLink)}
                className="btn btn-ghost"
                style={{ padding: '1rem' }}
              >
                <i className="fa-solid fa-external-link-alt"></i> Tester
              </button>
            </div>
          </div>

          <div style={{ 
            background: 'rgba(255,255,255,0.1)',
            padding: '1rem',
            borderRadius: '5px',
            fontSize: '0.9rem',
            opacity: 0.8
          }}>
            <i className="fa-solid fa-info-circle"></i> Ce lien sera utilisé pour le bouton "Télécharger le jeu" sur votre site.
          </div>
        </div>

        {/* Téléchargement Patch */}
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
            gap: '0.5rem'
          }}>
            <i className="fa-solid fa-file-arrow-up" style={{ color: '#28a745' }}></i>
            Patch / Mise à jour
          </h3>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontWeight: 'bold' 
            }}>
              <i className="fa-solid fa-link"></i> Lien du patch:
            </label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <input
                type="url"
                value={patchLink}
                onChange={(e) => setPatchLink(e.target.value)}
                placeholder="https://exemple.com/patch-v1.2.zip"
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
                onClick={() => testLink(patchLink)}
                className="btn btn-ghost"
                style={{ padding: '1rem' }}
              >
                <i className="fa-solid fa-external-link-alt"></i> Tester
              </button>
            </div>
          </div>

          <div style={{ 
            background: 'rgba(255,255,255,0.1)',
            padding: '1rem',
            borderRadius: '5px',
            fontSize: '0.9rem',
            opacity: 0.8
          }}>
            <i className="fa-solid fa-info-circle"></i> Ce lien sera utilisé pour le bouton "Télécharger le patch" sur votre site.
          </div>
        </div>

        {/* Vidéo tutoriel (optionnel) */}
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
            gap: '0.5rem'
          }}>
            <i className="fa-solid fa-play-circle" style={{ color: '#dc3545' }}></i>
            Vidéo Tutoriel (Optionnel)
          </h3>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontWeight: 'bold' 
            }}>
              <i className="fa-solid fa-video"></i> Lien YouTube (embed):
            </label>
            <input
              type="url"
              value={patchVideo}
              onChange={(e) => setPatchVideo(e.target.value)}
              placeholder="https://www.youtube.com/embed/VIDEO_ID"
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

          <div style={{ 
            background: 'rgba(255,255,255,0.1)',
            padding: '1rem',
            borderRadius: '5px',
            fontSize: '0.9rem',
            opacity: 0.8
          }}>
            <i className="fa-solid fa-info-circle"></i> 
            Lien YouTube pour le tutoriel d'installation. Utilisez le format "embed" : 
            https://www.youtube.com/embed/ID_VIDEO
          </div>
        </div>

        {/* Aperçu */}
        <div style={{ 
          background: 'rgba(0, 123, 255, 0.1)', 
          borderRadius: '10px', 
          padding: '2rem',
          border: '1px solid rgba(0, 123, 255, 0.3)'
        }}>
          <h3 style={{ 
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#007bff'
          }}>
            <i className="fa-solid fa-eye"></i>
            Aperçu des boutons
          </h3>
          
          <div style={{ 
            display: 'flex', 
            gap: '1rem', 
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
            <div style={{ textAlign: 'center' }}>
              <button className="btn btn-primary" style={{ marginBottom: '0.5rem' }}>
                <i className="fa-solid fa-download"></i> Télécharger le jeu
              </button>
              <p style={{ fontSize: '0.8rem', opacity: 0.7, margin: 0 }}>
                {windowsLink ? '✅ Lien configuré' : '❌ Lien manquant'}
              </p>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <button className="btn btn-primary" style={{ marginBottom: '0.5rem' }}>
                <i className="fa-solid fa-file-arrow-up"></i> Télécharger le patch
              </button>
              <p style={{ fontSize: '0.8rem', opacity: 0.7, margin: 0 }}>
                {patchLink ? '✅ Lien configuré' : '❌ Lien manquant'}
              </p>
            </div>
            
            {patchVideo && (
              <div style={{ textAlign: 'center' }}>
                <button className="btn btn-ghost" style={{ marginBottom: '0.5rem' }}>
                  <i className="fa-solid fa-play"></i> Voir le tutoriel
                </button>
                <p style={{ fontSize: '0.8rem', opacity: 0.7, margin: 0 }}>
                  ✅ Vidéo configurée
                </p>
              </div>
            )}
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

export default DownloadsEditor;