/** A character picked for the next generation, and where it stands. */
export type TemplateCharacterPick = {
  id: string;
  /** A1..E5, or null to let NovelAI choose. */
  position: string | null;
};

/**
 * What the batch panel has picked, held by id rather than by value. The
 * collections can be edited in their dialogs while the panel stays open, so the
 * selection has to survive a record changing underneath it.
 */
export type TemplateSelection = {
  /**
   * The scenes to run, in order. One situation is one scene, and the cast below
   * appears in every one of them — picking five situations is how a batch gets
   * to be a batch rather than five copies of the same picture.
   */
  situationIds: string[];
  styleId: string | null;
  /** Order matters: the first character supplies the scene's variables. */
  characters: TemplateCharacterPick[];
};

export const EMPTY_TEMPLATE_SELECTION: TemplateSelection = {
  situationIds: [],
  styleId: null,
  characters: [],
};
