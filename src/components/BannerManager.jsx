import { useState, useEffect } from 'react';

const BannerManager = ({ onSave }) => {
  const [bannerImages, setBannerImages] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadBannerImages();
  }, []);

  const loadBannerImages = () => {
    // Charger les images existantes depuis le dossier news-images
    // Pour cette démo, nous utiliserons les images connues
    const existingBanners = [
      { name: 'banniere1.png', position: 1 },
      { name: 'banniere2.png', position: 2 },
      { name: 'banniere3.png', position: 3 }
    ];
    setBannerImages(existingBanners);
  };

  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setUploading(true);
    
    try {
      for (const file of files) {
        // Trouver la prochaine position disponible
        const nextPosition = getNextAvailablePosition();
        const newFileName = `banniere${nextPosition}.png`;
        
        // Créer un URL temporaire pour l'image
        const imageUrl = URL.createObjectURL(file);
        
        // Ajouter l'image à la liste
        const newBanner = {
          name: newFileName,
          position: nextPosition,
          url: imageUrl,
          isNew: true
        };
        
        setBannerImages(prev => [...prev, newBanner]);
      }
      
      alert(`${files.length} bannière(s) ajoutée(s) avec succès !`);
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      alert('Erreur lors du téléchargement des images');
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
    if (!confirm(`Supprimer définitivement l'image "${imageName}" ?`)) return;
    
    setBannerImages(prev => prev.filter(img => img.name !== imageName));
    alert('Image supprimée avec succès !');
  };

  const updatePosition = (imageName, newPosition) => {
    const position = parseInt(newPosition);
    if (position < 1 || position > 10) {
      alert('La position doit être entre 1 et 10');
      return;
    }

    // Vérifier si la position est déjà utilisée
    const existingAtPosition = bannerImages.find(img => img.position === position && img.name !== imageName);
    
    setBannerImages(prev => {
      const updated = [...prev];
      
      // Si la position est occupée, échanger les positions
      if (existingAtPosition) {
        const currentImg = updated.find(img => img.name === imageName);
        const targetImg = updated.find(img => img.name === existingAtPosition.name);
        
        if (currentImg && targetImg) {
          const tempPosition = currentImg.position;
          currentImg.position = targetImg.position;
          targetImg.position = tempPosition;
        }
      } else {
        // Sinon, simplement mettre à jour la position
        const imgToUpdate = updated.find(img => img.name === imageName);
        if (imgToUpdate) {
          imgToUpdate.position = position;
        }
      }
      
      return updated.sort((a, b) => a.position - b.position);
    });
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
    alert('Configuration des bannières sauvegardée !');
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
        background: 'rgba(0, 123, 255, 0.1)', 
        borderRadius: '10px', 
        padding: '1.5rem',
        marginBottom: '2rem',
        border: '1px solid rgba(0, 123, 255, 0.3)'
      }}>
        <h3 style={{ 
          marginBottom: '1rem',
          color: '#007bff',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <i className="fa-solid fa-info-circle"></i>
          Comment ça fonctionne
        </h3>
        <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
          <li>Les bannières sont des <strong>images uniquement</strong> (pas de texte)</li>
          <li>Elles s'affichent en <strong>rotation automatique</strong> sur la page d'accueil</li>
          <li>Les images sont nommées <strong>banniere1.png, banniere2.png, etc.</strong></li>
          <li>Vous pouvez <strong>réorganiser l'ordre</strong> en changeant les positions</li>
          <li>Format recommandé : <strong>1200x300 pixels, PNG ou JPG</strong></li>
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

        {bannerImages.length === 0 ? (
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
                      <label style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
                        <i className="fa-solid fa-sort-numeric-up"></i> Position:
                      </label>
                      <input
                        type="number"
                        value={banner.position}
                        onChange={(e) => updatePosition(banner.name, e.target.value)}
                        min="1"
                        max="10"
                        style={{
                          width: '60px',
                          padding: '0.3rem',
                          borderRadius: '4px',
                          border: '1px solid rgba(255,255,255,0.3)',
                          background: 'rgba(255,255,255,0.1)',
                          color: 'white',
                          textAlign: 'center'
                        }}
                      />
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
    </div>
  );
};

export default BannerManager;