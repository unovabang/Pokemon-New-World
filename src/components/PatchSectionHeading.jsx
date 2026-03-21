import { getPatchSectionIconClass, getPatchSectionTitleText } from '../utils/patchSectionTitle';

/**
 * Titre de section patch : icône Font Awesome + texte (sans emoji en tête si présent en base).
 */
export default function PatchSectionHeading({ section, as: Tag = 'h3', className, innerClassName = 'patch-section-heading-inner' }) {
  const icon = getPatchSectionIconClass(section);
  const text = getPatchSectionTitleText(section);
  return (
    <Tag className={className}>
      <span className={innerClassName}>
        <i className={icon} aria-hidden />
        <span>{text}</span>
      </span>
    </Tag>
  );
}
