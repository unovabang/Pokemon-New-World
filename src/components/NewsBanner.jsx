
import { useEffect, useState } from "react";

export default function NewsBanner({ banners = [], interval = 5000 }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const total = banners.length;

  useEffect(() => {
    if (total <= 1) return;
    
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % total);
    }, interval);

    return () => clearInterval(timer);
  }, [total, interval]);

  if (total === 0) return null;

  const currentBanner = banners[currentIndex];

  return (
    <div className="news-banner-container">
      <div 
        className="news-banner"
        style={{
          background: currentBanner.gradient,
          color: currentBanner.textColor
        }}
      >
        <div className="news-banner-content">
          <div className="news-text">
            <h3 className="news-title">{currentBanner.title}</h3>
            <p className="news-subtitle">{currentBanner.subtitle}</p>
          </div>
          {currentBanner.image && (
            <div className="news-image">
              <img src={currentBanner.image} alt={currentBanner.title} />
            </div>
          )}
        </div>
        
        {total > 1 && (
          <div className="news-indicators">
            {banners.map((_, idx) => (
              <button
                key={idx}
                className={`news-dot ${idx === currentIndex ? "active" : ""}`}
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Aller à la bannière ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
