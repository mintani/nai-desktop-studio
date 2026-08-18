import {
  MAX_CHARACTER_REFERENCES,
  MAX_VIBE_REFERENCES,
} from "@nai-desktop-studio/novelai/constants";

import { loadAssetAsBase64 } from "@/features/library/asset-image";
import { assetUrl } from "@/features/library/collections";
import type { Style } from "@/features/styles/types/style";

import type { AdhocReference, AdhocVibe } from "../types/reference";

/**
 * Turns a style's stored images into form entries. The style keeps paths, but a
 * generation sends bytes, so each image is fetched back here.
 *
 * A style cannot hold more than a request may carry, so nothing is normally
 * dropped here; the slice only guards a style saved before the limit was what
 * it is now. The caller reports anything that did not make it.
 */
export async function loadStyleReferenceImages(style: Style) {
  const vibes = [...style.vibes].sort((a, b) => a.sortOrder - b.sortOrder);
  const references = [...style.references].sort(
    (a, b) => a.sortOrder - b.sortOrder
  );

  const [loadedVibes, loadedReferences] = await Promise.all([
    Promise.all(
      vibes.slice(0, MAX_VIBE_REFERENCES).map(
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
      references.slice(0, MAX_CHARACTER_REFERENCES).map(
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
