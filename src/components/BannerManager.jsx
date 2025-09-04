import { useState, useEffect } from 'react';

// Utiliser l'URL directe pour éviter les problèmes de domaine
const API_BASE = 'http://localhost:3001/api';

const BannerManager = ({ onSave }) => {
  const [bannerImages, setBannerImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    type: 'info', // 'info', 'success', 'error', 'confirm'
    onConfirm: null
  });

  useEffect(() => {
    loadBannerImages();
  }, []);

  const loadBannerImages = async () => {
    try {
      setLoading(true);
      // Ajouter un timestamp pour éviter le cache
      const response = await fetch(`${API_BASE}/banners?t=${Date.now()}`);
      const data = await response.json();
      
      if (data.success) {
        setBannerImages(data.banners);
      } else {
        console.error('Erreur lors du chargement:', data.error);
        // Fallback vers les images par défaut
        setBannerImages([
          { name: 'banniere1.png', position: 1 },
          { name: 'banniere2.png', position: 2 },
          { name: 'banniere3.png', position: 3 }
        ]);
      }
    } catch (error) {
      console.error('Erreur de connexion à l\'API:', error);
      // Fallback vers les images par défaut
      setBannerImages([
        { name: 'banniere1.png', position: 1 },
        { name: 'banniere2.png', position: 2 },
        { name: 'banniere3.png', position: 3 }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setUploading(true);
    
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('banner', file);
        
        const response = await fetch(`${API_BASE}/banners/upload`, {
          method: 'POST',
          body: formData
        });
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error);
        }
      }
      
      // Recharger la liste des bannières
      await loadBannerImages();
      showMessage('Succès !', `${files.length} bannière(s) uploadée(s) avec succès !`, 'success');
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      showMessage('Erreur', `Erreur lors du téléchargement: ${error.message}`, 'error');
    } finally {
      setUploading(false);
    }
  };

  const getNextAvailablePosition = () => {
    const usedPositions = bannerImages.map(img => img.position);
    for (let i = 1; i <= 10; i++) {
      if (!usedPositions.includes(i)) {
        return i;
      }
    }
    return usedPositions.length + 1;
  };

  const deleteBannerImage = (imageName) => {
    showConfirm(
      'Supprimer la bannière',
      `Êtes-vous sûr de vouloir supprimer définitivement l'image "${imageName}" ?`,
      async () => {
        try {
          const response = await fetch(`${API_BASE}/banners/${imageName}`, {
            method: 'DELETE'
          });
          
          const data = await response.json();
          
          if (data.success) {
            await loadBannerImages();
            showMessage('Succès !', 'Image supprimée avec succès !', 'success');
          } else {
            throw new Error(data.error);
          }
        } catch (error) {
          console.error('Erreur lors de la suppression:', error);
          showMessage('Erreur', `Erreur lors de la suppression: ${error.message}`, 'error');
        }
      }
    );
  };

  const moveUp = async (imageName) => {
    console.log('moveUp appelé pour:', imageName);
    console.log('Bannières actuelles:', bannerImages);
    
    const currentIndex = bannerImages.findIndex(img => img.name === imageName);
    console.log('Index actuel:', currentIndex);
    
    if (currentIndex <= 0) {
      console.log('Déjà en première position, rien à faire');
      return; // Déjà en première position
    }
    
    const currentImage = bannerImages[currentIndex];
    const previousImage = bannerImages[currentIndex - 1];
    console.log('Image actuelle:', currentImage);
    console.log('Image précédente:', previousImage);
    
    try {
      console.log('Envoi requête API...', `${API_BASE}/banners/${imageName}/position`);
      const response = await fetch(`${API_BASE}/banners/${imageName}/position`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ position: previousImage.position })
      });
      
      console.log('Réponse API:', response.status);
      const data = await response.json();
      console.log('Données reçues:', data);
      
      if (data.success) {
        // Mettre à jour immédiatement avec les données du serveur
        setBannerImages(data.banners.sort((a, b) => a.position - b.position));
        showMessage('Succès', 'Position mise à jour !', 'success');
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Erreur lors du déplacement:', error);
      showMessage('Erreur', `Erreur lors du déplacement: ${error.message}`, 'error');
    }
  };

  const moveDown = async (imageName) => {
    const currentIndex = bannerImages.findIndex(img => img.name === imageName);
    if (currentIndex >= bannerImages.length - 1) return; // Déjà en dernière position
    
    const currentImage = bannerImages[currentIndex];
    const nextImage = bannerImages[currentIndex + 1];
    
    try {
      const response = await fetch(`${API_BASE}/banners/${imageName}/position`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ position: nextImage.position })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Mettre à jour immédiatement avec les données du serveur
        setBannerImages(data.banners.sort((a, b) => a.position - b.position));
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Erreur lors du déplacement:', error);
      showMessage('Erreur', `Erreur lors du déplacement: ${error.message}`, 'error');
    }
  };

  // Fonctions pour les modals
  const showMessage = (title, message, type = 'info') => {
    setModalConfig({
      title,
      message,
      type,
      onConfirm: null
    });
    setShowModal(true);
  };

  const showConfirm = (title, message, onConfirm) => {
    setModalConfig({
      title,
      message,
      type: 'confirm',
      onConfirm
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalConfig({ title: '', message: '', type: 'info', onConfirm: null });
  };

  const handleSave = () => {
    const newsConfig = {
      autoLoad: {
        enabled: true,
        folder: "/news-images/",
        description: "Chargement automatique des images depuis le dossier public/news-images/"
      },
      banners: [],
      interval: 5000
    };
    onSave(newsConfig);
    showMessage('Succès !', 'Configuration des bannières sauvegardée !', 'success');
  };

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '2rem' 
      }}>
        <h2>
          <i className="fa-solid fa-images"></i> Gestion des Bannières d'Actualités
        </h2>
        <button onClick={handleSave} className="btn btn-primary">
          <i className="fa-solid fa-save"></i> Sauvegarder
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
          Gestionnaire Automatique Activé
        </h3>
        <div style={{ 
          background: 'rgba(255,255,255,0.1)', 
          padding: '1rem', 
          borderRadius: '5px',
          marginBottom: '1rem'
        }}>
          <strong>✅ Gestion Automatique :</strong>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
            Toutes les modifications sont automatiquement appliquées aux fichiers du serveur. 
            Aucune action manuelle requise !
          </p>
        </div>
        <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.9rem' }}>
          <li>Les bannières sont des <strong>images uniquement</strong> (pas de texte)</li>
          <li>Elles s'affichent en <strong>rotation automatique</strong> sur la page d'accueil</li>
          <li>Les images sont nommées <strong>banniere1.png, banniere2.png, etc.</strong></li>
          <li>Vous pouvez <strong>réorganiser l'ordre</strong> en changeant les positions</li>
          <li>Format recommandé : <strong>1200x300 pixels, PNG ou JPG</strong></li>
          <li><strong>Limite :</strong> 5MB par image</li>
        </ul>
      </div>

      {/* Upload */}
      <div style={{ 
        border: '2px dashed rgba(255,255,255,0.3)', 
        borderRadius: '10px', 
        padding: '2rem', 
        textAlign: 'center',
        marginBottom: '2rem',
        background: 'rgba(255,255,255,0.02)'
      }}>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleImageUpload}
          disabled={uploading}
          style={{ display: 'none' }}
          id="upload-banners"
        />
        <label 
          htmlFor="upload-banners"
          style={{
            cursor: uploading ? 'not-allowed' : 'pointer',
            display: 'inline-block'
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: uploading ? 0.5 : 1 }}>
            {uploading ? (
              <i className="fa-solid fa-spinner fa-spin"></i>
            ) : (
              <i className="fa-solid fa-cloud-upload-alt" style={{ color: 'var(--accent)' }}></i>
            )}
          </div>
          <h3 style={{ margin: '0 0 0.5rem 0' }}>
            {uploading ? 'Téléchargement en cours...' : 'Ajouter de nouvelles bannières'}
          </h3>
          <p style={{ margin: 0, opacity: 0.7 }}>
            Cliquez ou glissez vos images ici (PNG, JPG, WebP)
          </p>
        </label>
      </div>

      {/* Liste des bannières */}
      <div style={{ 
        background: 'rgba(255,255,255,0.05)', 
        borderRadius: '10px', 
        padding: '2rem' 
      }}>
        <h3 style={{ marginBottom: '1.5rem' }}>
          <i className="fa-solid fa-list"></i> Bannières Actuelles ({bannerImages.length})
        </h3>

        {loading ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '3rem', 
            opacity: 0.6
          }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '3rem', marginBottom: '1rem' }}></i>
            <p>Chargement des bannières...</p>
          </div>
        ) : bannerImages.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '3rem', 
            opacity: 0.6,
            fontStyle: 'italic'
          }}>
            <i className="fa-solid fa-image" style={{ fontSize: '3rem', marginBottom: '1rem' }}></i>
            <p>Aucune bannière présente. Téléchargez vos premières images !</p>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gap: '1.5rem'
          }}>
            {bannerImages
              .sort((a, b) => a.position - b.position)
              .map((banner, index) => (
              <div 
                key={banner.name}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  padding: '1.5rem',
                  border: '1px solid rgba(255,255,255,0.2)',
                  display: 'grid',
                  gridTemplateColumns: '200px 1fr auto',
                  gap: '1.5rem',
                  alignItems: 'center'
                }}
              >
                {/* Aperçu de l'image */}
                <div style={{ 
                  width: '200px', 
                  height: '60px', 
                  background: `url(${banner.url || `/news-images/${banner.name}`}) center/cover`,
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)'
                }}></div>

                {/* Informations */}
                <div>
                  <h4 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <i className="fa-solid fa-image"></i>
                    {banner.name}
                    {banner.isNew && (
                      <span style={{
                        background: 'rgba(40, 167, 69, 0.2)',
                        border: '1px solid rgba(40, 167, 69, 0.4)',
                        color: '#28a745',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '3px',
                        fontSize: '0.7rem'
                      }}>
                        NOUVEAU
                      </span>
                    )}
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <i className="fa-solid fa-arrows-alt-v" style={{ color: '#007bff' }}></i>
                      <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Position {banner.position}:</span>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button 
                          onClick={(e) => {
                            console.log('Bouton up cliqué pour:', banner.name);
                            e.preventDefault();
                            moveUp(banner.name);
                          }}
                          disabled={bannerImages.findIndex(img => img.name === banner.name) === 0}
                          style={{
                            padding: '0.3rem 0.5rem',
                            border: 'none',
                            borderRadius: '3px',
                            background: bannerImages.findIndex(img => img.name === banner.name) === 0 
                              ? 'rgba(255,255,255,0.1)' 
                              : 'rgba(0, 123, 255, 0.8)',
                            color: bannerImages.findIndex(img => img.name === banner.name) === 0 
                              ? 'rgba(255,255,255,0.5)' 
                              : 'white',
                            cursor: bannerImages.findIndex(img => img.name === banner.name) === 0 
                              ? 'not-allowed' 
                              : 'pointer',
                            fontSize: '0.8rem'
                          }}
                          title="Déplacer vers le haut"
                        >
                          <i className="fa-solid fa-chevron-up"></i>
                        </button>
                        <button 
                          onClick={(e) => {
                            console.log('Bouton down cliqué pour:', banner.name);
                            e.preventDefault();
                            moveDown(banner.name);
                          }}
                          disabled={bannerImages.findIndex(img => img.name === banner.name) === bannerImages.length - 1}
                          style={{
                            padding: '0.3rem 0.5rem',
                            border: 'none',
                            borderRadius: '3px',
                            background: bannerImages.findIndex(img => img.name === banner.name) === bannerImages.length - 1 
                              ? 'rgba(255,255,255,0.1)' 
                              : 'rgba(0, 123, 255, 0.8)',
                            color: bannerImages.findIndex(img => img.name === banner.name) === bannerImages.length - 1 
                              ? 'rgba(255,255,255,0.5)' 
                              : 'white',
                            cursor: bannerImages.findIndex(img => img.name === banner.name) === bannerImages.length - 1 
                              ? 'not-allowed' 
                              : 'pointer',
                            fontSize: '0.8rem'
                          }}
                          title="Déplacer vers le bas"
                        >
                          <i className="fa-solid fa-chevron-down"></i>
                        </button>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                      Ordre d'affichage dans la rotation
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ textAlign: 'right' }}>
                  <button
                    onClick={() => deleteBannerImage(banner.name)}
                    style={{
                      background: 'rgba(220, 53, 69, 0.2)',
                      border: '1px solid rgba(220, 53, 69, 0.4)',
                      color: '#ff6b7a',
                      borderRadius: '6px',
                      padding: '0.5rem 1rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <i className="fa-solid fa-trash"></i>
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Aperçu de la rotation */}
        {bannerImages.length > 0 && (
          <div style={{ 
            marginTop: '2rem',
            padding: '1.5rem',
            background: 'rgba(0, 123, 255, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(0, 123, 255, 0.3)'
          }}>
            <h4 style={{ 
              marginBottom: '1rem',
              color: '#007bff',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <i className="fa-solid fa-play-circle"></i>
              Ordre de rotation
            </h4>
            <div style={{ 
              display: 'flex', 
              gap: '0.5rem', 
              flexWrap: 'wrap',
              alignItems: 'center'
            }}>
              {bannerImages
                .sort((a, b) => a.position - b.position)
                .map((banner, index) => (
                <div key={banner.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{
                    background: 'rgba(255,255,255,0.2)',
                    padding: '0.3rem 0.8rem',
                    borderRadius: '15px',
                    fontSize: '0.8rem',
                    fontWeight: 'bold'
                  }}>
                    {index + 1}. {banner.name}
                  </span>
                  {index < bannerImages.length - 1 && (
                    <i className="fa-solid fa-arrow-right" style={{ opacity: 0.5 }}></i>
                  )}
                </div>
              ))}
              <div style={{ 
                opacity: 0.6, 
                fontSize: '0.8rem',
                marginLeft: '1rem'
              }}>
                <i className="fa-solid fa-repeat"></i> Puis recommence...
              </div>
            </div>
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

export default BannerManager;