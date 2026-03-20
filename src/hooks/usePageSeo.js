import { useEffect } from "react";
import { applyPageSeo } from "../utils/pageSeo";

/**
 * Applique les métadonnées SEO au montage / quand les deps changent.
 */
export function usePageSeo(config) {
  useEffect(() => {
    if (!config) return;
    applyPageSeo(config);
  }, [config]);
}
