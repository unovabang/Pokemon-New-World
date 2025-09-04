import { createContext, useContext, useState, useEffect } from 'react';
import translations from '../config/translations.json';
import patchNotesData from '../config/patchnotes.json';

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
    // Gestion spéciale pour les patch notes qui viennent du JSON séparé
    if (key.startsWith('patchNotes.')) {
      const patchKey = key.replace('patchNotes.', '');
      
      if (language === 'en') {
        // Traductions anglaises pour les patch notes
        const englishPatchNotes = {
          version: patchNotesData.version,
          date: "January 2025", // Version anglaise de la date
          title: `Patch notes ${patchNotesData.version}`,
          sections: [
            {
              title: "🆕 New features",
              items: [
                "Added game continuation (about 5 hours of gameplay)",
                "Mega Evolution arrival",
                "Shiny Pokémon animation",
                "Dedicated logo for Shiny Pokémon in battle",
                "Added Fresco-Height Breeding (location allowing to reset Alternative Shiny Pokémon)",
                "Many new Pokémon make their appearance"
              ]
            },
            {
              title: "🔧 Bug fixes",
              items: [
                "Fixed crash related to Moon Ball",
                "Fixed crash related to Fmod (during evolution)",
                "Fixed the following abilities: Purifying Salt, Cruelty, Cursed Body, Illusion",
                "Fixed Baton Pass move",
                "Fixed Pokédex numbering",
                "Fixed some missing collisions"
              ]
            },
            {
              title: "⚖️ Balance changes",
              items: [
                "Nerfed Encornus",
                "Buffed Feraligatr"
              ]
            }
          ]
        };
        
        const keys = patchKey.split('.');
        let value = englishPatchNotes;
        for (const k of keys) {
          if (value && typeof value === 'object' && k in value) {
            value = value[k];
          } else {
            return fallback;
          }
        }
        return value;
      } else {
        // Version française (originale du JSON)
        const keys = patchKey.split('.');
        let value = patchNotesData;
        
        if (patchKey === 'title') {
          return patchNotesData.content.title;
        } else if (patchKey === 'sections') {
          return patchNotesData.content.sections;
        } else {
          for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
              value = value[k];
            } else {
              return fallback;
            }
          }
          return value;
        }
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