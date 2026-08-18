import type { Locale } from "../locale";
import { characters } from "./characters";
import { common } from "./common";
import { generate } from "./generate";
import { settings } from "./settings";
import { situations } from "./situations";
import { styles } from "./styles";
import { viewer } from "./viewer";

/**
 * English is the source of truth. Each bundle types its Japanese side against
 * its English keys, so a missing translation is a type error, not a silent
 * fallback at runtime.
 */
export type MessageKey =
  | keyof (typeof characters)["en"]
  | keyof (typeof common)["en"]
  | keyof (typeof generate)["en"]
  | keyof (typeof settings)["en"]
  | keyof (typeof situations)["en"]
  | keyof (typeof styles)["en"]
  | keyof (typeof viewer)["en"];

const bundles = [
  characters,
  common,
  generate,
  settings,
  situations,
  styles,
  viewer,
];

export const messages: Record<Locale, Record<string, string>> = {
  en: Object.assign({}, ...bundles.map((bundle) => bundle.en)),
  ja: Object.assign({}, ...bundles.map((bundle) => bundle.ja)),
};
