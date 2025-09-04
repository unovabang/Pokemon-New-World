import { useState, useEffect } from 'react';

const ImageManager = ({ folder = 'news-images', onImageSelect }) => {
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadImages();
  }, [folder]);

  const loadImages = async () => {
    try {
      // Simuler le chargement des images depuis le dossier
      // En réalité, nous stockerons les noms d'images dans localStorage pour cette démo
      const storedImages = JSON.parse(localStorage.getItem(`images_${folder}`) || '[]');
      setImages(storedImages);
    } catch (error) {
      console.error('Erreur lors du chargement des images:', error);
    }
  };

  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setUploading(true);
    
    try {
      for (const file of files) {
        // Créer un URL temporaire pour l'image
        const imageUrl = URL.createObjectURL(file);
        const imageName = file.name;
        
        // Stocker l'image dans localStorage (simulation)
        const storedImages = JSON.parse(localStorage.getItem(`images_${folder}`) || '[]');
        const newImage = {
          name: imageName,
          url: imageUrl,
          size: file.size,
          uploadDate: new Date().toISOString()
        };
        
        storedImages.push(newImage);
        localStorage.setItem(`images_${folder}`, JSON.stringify(storedImages));
      }
      
      await loadImages();
      alert(`${files.length} image(s) téléchargée(s) avec succès !`);
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      alert('Erreur lors du téléchargement des images');
    } finally {
      setUploading(false);
    }
  };

  const deleteImage = async (imageName) => {
    if (!confirm(`Supprimer l'image "${imageName}" ?`)) return;
    
    try {
      const storedImages = JSON.parse(localStorage.getItem(`images_${folder}`) || '[]');
      const filteredImages = storedImages.filter(img => img.name !== imageName);
      localStorage.setItem(`images_${folder}`, JSON.stringify(filteredImages));
      
      await loadImages();
      alert('Image supprimée avec succès !');
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression');
    }
  };

  return (
    <div style={{ 
      background: 'rgba(255,255,255,0.05)', 
      borderRadius: '10px', 
      padding: '1.5rem',
      marginBottom: '2rem'
    }}>
      <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <i className="fa-solid fa-images"></i>
        Gestionnaire d'Images - {folder}
      </h3>

      {/* Upload */}
      <div style={{ 
        border: '2px dashed rgba(255,255,255,0.3)', 
        borderRadius: '8px', 
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
          id={`upload-${folder}`}
        />
        <label 
          htmlFor={`upload-${folder}`}
          style={{
            cursor: uploading ? 'not-allowed' : 'pointer',
            display: 'inline-block'
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '1rem', opacity: uploading ? 0.5 : 1 }}>
            {uploading ? (
              <i className="fa-solid fa-spinner fa-spin"></i>
            ) : (
              <i className="fa-solid fa-cloud-upload-alt" style={{ color: 'var(--accent)' }}></i>
            )}
          </div>
          <p style={{ margin: 0, fontSize: '1.1rem' }}>
            {uploading ? 'Téléchargement en cours...' : 'Cliquez pour télécharger des images'}
          </p>
          <p style={{ margin: '0.5rem 0 0 0', opacity: 0.7, fontSize: '0.9rem' }}>
            Formats supportés: JPG, PNG, GIF, WebP
          </p>
        </label>
      </div>

      {/* Liste des images */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
        gap: '1rem' 
      }}>
        {images.map((image, index) => (
          <div 
            key={index}
            style={{
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '1rem',
              border: '1px solid rgba(255,255,255,0.2)',
              position: 'relative'
            }}
          >
            <div style={{ 
              width: '100%', 
              height: '120px', 
              background: `url(${image.url || `/news-images/${image.name}`}) center/cover`,
              borderRadius: '4px',
              marginBottom: '0.5rem',
              backgroundColor: 'rgba(255,255,255,0.1)'
            }}></div>
            
            <p style={{ 
              margin: '0 0 0.5rem 0', 
              fontSize: '0.9rem', 
              wordBreak: 'break-word',
              fontWeight: 'bold'
            }}>
              {image.name}
            </p>
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              {onImageSelect && (
                <button
                  onClick={() => onImageSelect(image.name)}
                  className="btn btn-ghost"
                  style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                >
                  <i className="fa-solid fa-check"></i> Sélectionner
                </button>
              )}
              
              <button
                onClick={() => deleteImage(image.name)}
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
                <i className="fa-solid fa-trash"></i>
              </button>
            </div>
          </div>
        ))}
      </div>

      {images.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '2rem', 
          opacity: 0.6,
          fontStyle: 'italic'
        }}>
          Aucune image dans ce dossier. Téléchargez vos premières images !
        </div>
      )}
    </div>
  );
};

export default ImageManager;