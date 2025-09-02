
import site from './site.json';
import sections from './sections.json';
import footer from './footer.json';
import news from './news.json';
import downloads from './downloads.json';
import external from './external.json';
import patreon from './patreon.json';

export default {
  ...site,
  sections,
  footer,
  news,
  downloads,
  patreon,
  ...external
};
