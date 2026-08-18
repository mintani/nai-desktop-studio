import { loadAssetAsBase64 } from "@/features/library/asset-image";
import { assetUrl } from "@/features/library/collections";
import type { Style } from "@/features/styles/types/style";

import { MAX_REFERENCES, MAX_VIBES } from "../types/reference";
import type { AdhocReference, AdhocVibe } from "../types/reference";

/**
 * Turns a style's stored images into form entries. The style keeps paths, but a
 * generation sends bytes, so each image is fetched back here.
 *
 * The panel holds fewer images than a style may, so the extras are dropped
 * rather than sent — the caller reports how many were kept.
 */
export async function loadStyleReferenceImages(style: Style) {
  const vibes = [...style.vibes].sort((a, b) => a.sortOrder - b.sortOrder);
  const references = [...style.references].sort(
    (a, b) => a.sortOrder - b.sortOrder
  );

  const [loadedVibes, loadedReferences] = await Promise.all([
    Promise.all(
      vibes.slice(0, MAX_VIBES).map(
        async (vibe): Promise<AdhocVibe> => ({
          id: vibe.id,
          previewUrl: assetUrl(vibe.imagePath),
          imageBase64: await loadAssetAsBase64(vibe.imagePath),
          strength: vibe.strength,
          infoExtracted: vibe.infoExtracted,
        })
      )
    ),
    Promise.all(
      references.slice(0, MAX_REFERENCES).map(
        async (reference): Promise<AdhocReference> => ({
          id: reference.id,
          previewUrl: assetUrl(reference.imagePath),
          imageBase64: await loadAssetAsBase64(reference.imagePath),
          referenceType: reference.referenceType,
          strength: reference.strength,
          fidelity: reference.fidelity,
        })
      )
    ),
  ]);

  return {
    vibes: loadedVibes,
    references: loadedReferences,
    droppedVibes: vibes.length - loadedVibes.length,
    droppedReferences: references.length - loadedReferences.length,
  };
}
