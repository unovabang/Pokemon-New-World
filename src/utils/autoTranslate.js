// Système de traduction automatique pour les patch notes
// Traduit automatiquement le contenu français vers l'anglais

const translationRules = {
  // Traductions des titres de sections
  sectionTitles: {
    'nouveautés': 'New features',
    'corrections': 'Bug fixes', 
    'équilibrage': 'Balance changes',
    'améliorations': 'Improvements',
    'ajouts': 'Additions',
    'suppressions': 'Removals'
  },
  
  // Traductions des termes techniques Pokémon
  pokemonTerms: {
    'pokémon': 'Pokémon',
    'méga-évolution': 'Mega Evolution',
    'méga évolution': 'Mega Evolution',
    'chromatique': 'Shiny',
    'pokédex': 'Pokédex',
    'talent': 'ability',
    'talents': 'abilities',
    'capacité': 'move',
    'capacités': 'moves',
    'évolution': 'evolution',
    'élevage': 'breeding',
    'combat': 'battle',
    'dresseur': 'trainer',
    'équipe': 'team',
    'logo': 'logo',
    'animation': 'animation',
    'crash': 'crash',
    'bug': 'bug',
    'nerf': 'nerf',
    'buff': 'buff'
  },
  
  // Traductions des actions communes
  commonActions: {
    'ajout': 'Added',
    'ajouts': 'Added',
    'correction': 'Fixed',
    'corrections': 'Fixed',
    'arrivée': 'arrival',
    'apparition': 'appearance',
    'permettant': 'allowing',
    'environ': 'about',
    'nombreux': 'many',
    'nouveau': 'new',
    'nouveaux': 'new',
    'nouvelle': 'new',
    'nouvelles': 'new',
    'propre': 'dedicated',
    'manquantes': 'missing',
    'suivants': 'following',
    'pendant': 'during',
    'numérotation': 'numbering'
  },
  
  // Traductions des phrases complètes courantes
  commonPhrases: {
    'de nombreux nouveaux pokémon font leur apparition': 'Many new Pokémon make their appearance',
    'lieu permettant de reset': 'location allowing to reset',
    'environ 5h de jeu': 'about 5 hours of gameplay'
  }
};

// Fonction pour traduire automatiquement un texte français vers l'anglais
function translateText(frenchText) {
  if (!frenchText || typeof frenchText !== 'string') return frenchText;
  
  let translated = frenchText.toLowerCase();
  
  // Appliquer les traductions de phrases complètes en premier
  Object.entries(translationRules.commonPhrases).forEach(([fr, en]) => {
    const regex = new RegExp(fr.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&'), 'gi');
    translated = translated.replace(regex, en);
  });
  
  // Appliquer les traductions de termes
  const allTerms = {
    ...translationRules.pokemonTerms,
    ...translationRules.commonActions
  };
  
  Object.entries(allTerms).forEach(([fr, en]) => {
    const regex = new RegExp(`\\\\b${fr.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\\\b`, 'gi');
    translated = translated.replace(regex, en);
  });
  
  // Capitaliser la première lettre
  translated = translated.charAt(0).toUpperCase() + translated.slice(1);
  
  return translated;
}

// Fonction pour traduire le titre d'une section
function translateSectionTitle(frenchTitle) {
  if (!frenchTitle || typeof frenchTitle !== 'string') return frenchTitle;
  
  // Garder les émojis au début
  const emojiMatch = frenchTitle.match(/^(🆕|🔧|⚖️|✨|➕|➖|📝)\\s*/);
  const emoji = emojiMatch ? emojiMatch[0] : '';
  const titleWithoutEmoji = frenchTitle.replace(/^(🆕|🔧|⚖️|✨|➕|➖|📝)\\s*/, '').toLowerCase();
  
  // Chercher une traduction directe
  for (const [fr, en] of Object.entries(translationRules.sectionTitles)) {
    if (titleWithoutEmoji.includes(fr)) {
      return emoji + en;
    }
  }
  
  // Sinon, traduction générale
  return emoji + translateText(titleWithoutEmoji);
}

// Fonction pour traduire automatiquement les patch notes complètes
export function autoTranslatePatchNotes(patchNotesData) {
  if (!patchNotesData) return null;
  
  const translated = {
    version: patchNotesData.version,
    date: translateDate(patchNotesData.date),
    title: `Patch notes ${patchNotesData.version}`,
    sections: []
  };
  
  if (patchNotesData.content && patchNotesData.content.sections) {
    translated.sections = patchNotesData.content.sections.map(section => ({
      title: translateSectionTitle(section.title),
      items: section.items.map(item => translateText(item))
    }));
  }
  
  return translated;
}

// Fonction pour traduire les dates
function translateDate(frenchDate) {
  if (!frenchDate) return frenchDate;
  
  const dateTranslations = {
    'janvier': 'January',
    'février': 'February', 
    'mars': 'March',
    'avril': 'April',
    'mai': 'May',
    'juin': 'June',
    'juillet': 'July',
    'août': 'August',
    'septembre': 'September',
    'octobre': 'October',
    'novembre': 'November',
    'décembre': 'December'
  };
  
  let translated = frenchDate;
  Object.entries(dateTranslations).forEach(([fr, en]) => {
    translated = translated.replace(new RegExp(fr, 'gi'), en);
  });
  
  return translated;
}