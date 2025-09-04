import { useLanguage } from '../contexts/LanguageContext';

const LanguageSelector = ({ className = "" }) => {
  const { language, changeLanguage } = useLanguage();

  const languages = [
    { code: 'fr', flag: '🇫🇷', name: 'Français' },
    { code: 'en', flag: '🇺🇸', name: 'English' }
  ];

  return (
    <div className={`language-selector ${className}`}>
      <div className="language-buttons">
        {languages.map(lang => (
          <button
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className={`language-btn ${language === lang.code ? 'active' : ''}`}
            title={`Changer vers ${lang.name} / Switch to ${lang.name}`}
          >
            {lang.flag}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LanguageSelector;