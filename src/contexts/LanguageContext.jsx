import { createContext, useContext, useState, useEffect } from 'react';
import translations from '../config/translations.json';
import patchNotesData from '../config/patchnotes.json';
import patchNotesDataEN from '../config/patchnotes-en.json';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    // Récupérer la langue depuis localStorage ou utiliser le français par défaut
    const savedLanguage = localStorage.getItem('pokemon-new-world-language');
    // Forcer le français par défaut
    return savedLanguage === 'en' ? 'en' : 'fr';
  });

  useEffect(() => {
    // Sauvegarder la langue dans localStorage
    localStorage.setItem('pokemon-new-world-language', language);
  }, [language]);

  const t = (key, fallback = key) => {
    // Gestion spéciale pour les patch notes - selon la langue
    if (key.startsWith('patchNotes.')) {
      const patchKey = key.replace('patchNotes.', '');
      const currentPatchData = language === 'en' ? patchNotesDataEN : patchNotesData;
      
      // Vérification de sécurité - si pas de données, retourner le fallback
      if (!currentPatchData || !currentPatchData.versions || !currentPatchData.versions[0]) {
        console.warn(`Patch notes data not available for key: ${key}`);
        return fallback;
      }
      
      const latestVersion = currentPatchData.versions[0];
      
      // Gestion des différentes clés de patch notes
      switch (patchKey) {
        case 'version':
          return latestVersion.version || fallback;
        case 'date':
          return latestVersion.date || fallback;
        case 'title':
          return `Version ${latestVersion.version}` || fallback;
        case 'sections':
          return latestVersion.sections || [];
        default:
          return fallback;
      }
    }

    // Traitement normal pour les autres clés
    const keys = key.split('.');
    let value = translations[language];
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Si la traduction n'existe pas, essayer en français
        if (language !== 'fr') {
          let frValue = translations.fr;
          for (const k of keys) {
            if (frValue && typeof frValue === 'object' && k in frValue) {
              frValue = frValue[k];
            } else {
              return fallback;
            }
          }
          return frValue;
        }
        return fallback;
      }
    }
    
    return value || fallback;
  };

  const changeLanguage = (newLanguage) => {
    if (translations[newLanguage]) {
      setLanguage(newLanguage);
    }
  };

  const value = {
    language,
    changeLanguage,
    t,
    availableLanguages: Object.keys(translations)
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};