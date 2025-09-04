import { useLanguage } from '../contexts/LanguageContext';

const LanguageSelector = ({ className = "" }) => {
  const { language, changeLanguage } = useLanguage();

  const languages = [
    { code: 'fr', flag: '🇫🇷' },
    { code: 'en', flag: '🇺🇸' }
  ];

  return (
    <div className={`language-selector ${className}`}>
      <select 
        value={language} 
        onChange={(e) => changeLanguage(e.target.value)}
        className="language-select"
        title="Changer la langue / Change language"
      >
        {languages.map(lang => (
          <option key={lang.code} value={lang.code}>
            {lang.flag}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LanguageSelector;