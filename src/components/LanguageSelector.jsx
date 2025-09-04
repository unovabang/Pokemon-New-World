import { useLanguage } from '../contexts/LanguageContext';

const LanguageSelector = ({ className = "" }) => {
  const { language, changeLanguage } = useLanguage();

  const flags = {
    fr: {
      src: 'https://images.emojiterra.com/twitter/v13.1/512px/1f1eb-1f1f7.png',
      alt: 'Français'
    },
    en: {
      src: 'https://www.drapeauxdespays.fr/data/flags/emoji/twitter/256x256/gb.png',
      alt: 'English'
    }
  };

  return (
    <div className={`language-selector ${className}`}>
      <div className="flag-selector">
        {Object.entries(flags).map(([lang, flag]) => (
          <button
            key={lang}
            onClick={() => changeLanguage(lang)}
            className={`flag-button ${language === lang ? 'active' : ''}`}
            title={flag.alt}
          >
            <img 
              src={flag.src} 
              alt={flag.alt}
              className="flag-image"
            />
          </button>
        ))}
      </div>
    </div>
  );
};

export default LanguageSelector;