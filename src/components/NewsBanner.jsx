import { useEffect, useState } from "react";

// Fonction pour charger automatiquement les images du dossier news-images
async function loadNewsImages() {
  try {
    // Liste des extensions d'images supportées
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
    const images = [];
    
    // On essaie de charger les images avec des noms séquentiels (banniere1, banniere2, etc.)
    let consecutiveNotFound = 0;
    for (let i = 1; i <= 50; i++) {
      let found = false;
      
      for (const ext of imageExtensions) {
        const imagePath = `/news-images/banniere${i}${ext}`;
        try {
          const response = await fetch(imagePath, { method: 'HEAD' });
          if (response.ok) {
            images.push({ image: imagePath });
            found = true;
            consecutiveNotFound = 0; // Reset le compteur
            break;
          }
        } catch (e) {
          // Image n'existe pas, on continue
        }
      }
      
      if (!found) {
        consecutiveNotFound++;
        // Si on ne trouve pas 3 images consécutives, on s'arrête
        if (consecutiveNotFound >= 3) {
          break;
        }
      }
    }
    
    // On essaie aussi quelques noms génériques (limité)
    const genericNames = ['news', 'banner', 'actualite', 'nouveaute', 'update'];
    for (const name of genericNames) {
      for (let i = 1; i <= 3; i++) {
        for (const ext of imageExtensions) {
          const imagePath = `/news-images/${name}${i}${ext}`;
          try {
            const response = await fetch(imagePath, { method: 'HEAD' });
            if (response.ok && !images.find(img => img.image === imagePath)) {
              images.push({ image: imagePath });
              break;
            }
          } catch (e) {
            // Image n'existe pas, on continue
          }
        }
      }
    }
    
    console.log(`Chargé ${images.length} images depuis /news-images/`);
    return images;
  } catch (error) {
    console.warn('Erreur lors du chargement des images:', error);
    return [];
  }
}

export default function NewsBanner({ banners = [], interval = 5000, autoLoad = true }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadedImages, setLoadedImages] = useState([]);
  const [isLoading, setIsLoading] = useState(autoLoad);
  
  // Charger les images automatiquement si autoLoad est activé
  useEffect(() => {
    if (autoLoad) {
      loadNewsImages().then(images => {
        setLoadedImages(images);
        setIsLoading(false);
      });
    }
  }, [autoLoad]);
  
  // Utiliser les images chargées automatiquement ou celles passées en props
  const allBanners = autoLoad ? loadedImages : banners;
  const total = allBanners.length;

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % total);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  };

  useEffect(() => {
    if (total <= 1) return;
    
    const timer = setInterval(nextSlide, interval);

    return () => clearInterval(timer);
  }, [total, interval]);

  if (isLoading) {
    return (
      <div className="news-banner-container">
        <div className="news-banner" style={{minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <p style={{color: 'var(--muted)'}}>Chargement des actualités...</p>
        </div>
      </div>
    );
  }

  if (total === 0) return null;

  const currentBanner = allBanners[currentIndex];

  return (
    <div className="news-banner-container">
      <div className="news-banner">
        <img 
          src={currentBanner.image} 
          alt={currentBanner.title || "Bannière actualité"} 
          className="news-banner-image"
        />

        {total > 1 && (
          <>
            <button
              className="news-arrow news-prev"
              onClick={prevSlide}
              aria-label="Bannière précédente"
            >
              ‹
            </button>
            <button
              className="news-arrow news-next"
              onClick={nextSlide}
              aria-label="Bannière suivante"
            >
              ›
            </button>
            <div className="news-indicators">
              {allBanners.map((_, idx) => (
                <button
                  key={idx}
                  className={`news-dot ${idx === currentIndex ? "active" : ""}`}
                  onClick={() => setCurrentIndex(idx)}
                  aria-label={`Aller à la bannière ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}