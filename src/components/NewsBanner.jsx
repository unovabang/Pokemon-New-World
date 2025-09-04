import { useEffect, useState } from "react";

// Cache pour éviter de recharger les images à chaque fois
let cachedImages = null;
let loadingPromise = null;

// Fonction pour charger automatiquement les images du dossier news-images
async function loadNewsImages() {
  // Si on a déjà un cache, on le retourne immédiatement
  if (cachedImages !== null) {
    return cachedImages;
  }

  // Si un chargement est en cours, on attend la promesse existante
  if (loadingPromise) {
    return await loadingPromise;
  }

  // Créer une nouvelle promesse de chargement
  loadingPromise = (async () => {
    try {
      // Liste des extensions d'images supportées
      const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
      const images = [];

      // On utilise Promise.allSettled pour charger en parallèle
      const promises = [];
      for (let i = 1; i <= 10; i++) { // Réduit de 50 à 10 pour être plus rapide
        for (const ext of imageExtensions) {
          const imagePath = `/news-images/banniere${i}${ext}`;
          promises.push(
            new Promise(async (resolve) => {
              try {
                // Créer un objet Image pour un chargement plus rapide
                const img = new Image();
                img.onload = () => resolve({ image: imagePath, index: i });
                img.onerror = () => resolve(null);
                img.src = imagePath;
              } catch (e) {
                resolve(null);
              }
            })
          );
        }
      }

      const results = await Promise.allSettled(promises);
      const foundImages = results
        .map(result => result.status === 'fulfilled' ? result.value : null)
        .filter(result => result !== null)
        .sort((a, b) => a.index - b.index) // Trier par index
        .map(result => ({ image: result.image }));

      // Supprimer les doublons (même index avec différentes extensions)
      const uniqueImages = [];
      const seenIndexes = new Set();

      for (const img of foundImages) {
        const index = img.image.match(/banniere(\d+)/)?.[1];
        if (index && !seenIndexes.has(index)) {
          seenIndexes.add(index);
          uniqueImages.push(img);
        }
      }

      cachedImages = uniqueImages;
      console.log(`Chargé ${cachedImages.length} images depuis /news-images/`);
      return cachedImages;
    } catch (error) {
      console.error('Erreur lors du chargement des images:', error);
      cachedImages = [];
      return [];
    } finally {
      loadingPromise = null;
    }
  })();

  return await loadingPromise;
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