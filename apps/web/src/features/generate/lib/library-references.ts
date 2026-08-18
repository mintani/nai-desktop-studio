import type { ReferenceEntry } from "@/features/reference-library/types/reference";

import type { FormState } from "../types/generate";

/**
 * The library entries this run actually carries.
 *
 * Two things can make a chosen id drop out: the entry was deleted from the
 * library, or it is of the other kind — a reference saved as a vibe cannot go
 * out in a precise-reference run. Both are silent, so anything that counts or
 * prices the run has to count what is left rather than the chosen ids.
 */
export function pickedLibraryReferences(
  form: Pick<FormState, "libraryReferenceIds" | "referenceMode">,
  library: ReferenceEntry[]
): ReferenceEntry[] {
  return form.libraryReferenceIds.flatMap((id) => {
    const found = library.find((entry) => entry.id === id);
    return found && found.kind === form.referenceMode ? [found] : [];
  });
}
