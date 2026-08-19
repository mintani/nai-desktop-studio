/** Subscription plan. Only used to decide whether the Opus discount applies. */
export type Plan = "opus" | "other";

/**
 * How a multi-image run is sent. "queue" is one request per image; "alternate"
 * asks for the whole batch in a single request.
 */
export type GenerationMode = "queue" | "alternate";

/**
 * Shape returned by the server's `/settings`. The API key itself is not
 * included.
 */
export type AppSettings = {
  hasApiKey: boolean;
  /** Masked display string like `pst-****abcd`. null when unset. */
  apiKeyPreview: string | null;
  outputDir: string;
  defaultModel: string;
  /** Only affects the Anlas estimate, not what NovelAI charges. */
  plan: Plan;
  generationMode: GenerationMode;
  /** Ids of the generate-panel sections that start expanded. */
  openSections: string[];
};

export type SettingsPatch = {
  apiKey?: string;
  outputDir?: string;
  defaultModel?: string;
  plan?: Plan;
  generationMode?: GenerationMode;
  openSections?: string[];
};

/** NovelAI subscription info. Used for the Anlas balance shown in the header. */
export type Subscription = {
  tier: number;
  active: boolean;
  anlas: number;
  unlimitedGeneration: boolean;
};

export type VerifyResult = {
  ok: boolean;
  /** Failure reason, present only when ok is false. */
  error?: string;
  subscription: Subscription | null;
};
