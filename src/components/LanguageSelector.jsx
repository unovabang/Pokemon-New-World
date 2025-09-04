import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const LanguageSelector = ({ className = "" }) => {
  const { language, changeLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const flags = {
    fr: {
      src: 'https://images.emojiterra.com/twitter/v13.1/512px/1f1eb-1f1f7.png',
      alt: 'Français',
      label: 'FR'
    },
    en: {
      src: 'https://www.drapeauxdespays.fr/data/flags/emoji/twitter/256x256/gb.png',
      alt: 'English',
      label: 'EN'
    }
  };

  const currentFlag = flags[language];

  const handleLanguageChange = (lang) => {
    changeLanguage(lang);
    setIsOpen(false);
  };

  return (
    <div className={`language-selector ${className}`}>
      <div className="language-dropdown">
        <button 
          className="language-trigger"
          onClick={() => setIsOpen(!isOpen)}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        >
          <img 
            src={currentFlag.src} 
            alt={currentFlag.alt}
            className="flag-image"
          />
          <span className="language-label">{currentFlag.label}</span>
          <i className={`fa-solid fa-chevron-down dropdown-arrow ${isOpen ? 'open' : ''}`}></i>
        </button>
        
        {isOpen && (
          <div className="language-menu">
            {Object.entries(flags).map(([lang, flag]) => (
              <button
                key={lang}
                onClick={() => handleLanguageChange(lang)}
                className={`language-option ${language === lang ? 'active' : ''}`}
              >
                <img 
                  src={flag.src} 
                  alt={flag.alt}
                  className="flag-image"
                />
                <span className="language-label">{flag.label}</span>
                <span className="language-name">{flag.alt}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LanguageSelector;