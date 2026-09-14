const en = {
  "analysis.title": "Analyze image",
  "analysis.description":
    "Checks whose style this picture is close to, with a model on this machine.",
  "analysis.action": "Analyze",

  "analysis.section.artist": "Artist",

  // Models are fetched on demand, so a section can open on this row instead.
  "analysis.model.download": "Download",
  "analysis.model.retry": "Try again",
  "analysis.model.ready": "ready",
  "analysis.model.hint":
    "Fetched into the app's config folder once, then runs on this machine.",
  "analysis.model.size": "{size} MB",

  "analysis.analyzing": "Analyzing…",
  "analysis.artist.scope": "Which artists to list",
  "analysis.artist.scope.major": "{count}+ posts",
  "analysis.artist.scope.all": "All",
  "analysis.artist.scope.prompt": "In the prompt",
  "analysis.artist.nonePrompt": "The prompt names no artist the model knows.",
  "analysis.artist.noneMajor":
    "None of the top {total} has {count} or more posts.",
  "analysis.artist.lookupLabel": "Check a specific artist",
  "analysis.artist.lookupPlaceholder": "Danbooru artist tag",
  "analysis.artist.lookupResult": "#{rank} · {score}%",
  "analysis.artist.notInModel": "Not in the model's artist list",
  "analysis.artist.knows": "{count} artists",
  "analysis.artist.openDanbooru": "Open on Danbooru",
  "analysis.artist.caption":
    "The score is the model's probability across every artist it knows. A number to rank candidates by, not a verdict that the picture copies anyone.",
} as const;

const ja: Record<keyof typeof en, string> = {
  "analysis.title": "画像を解析",
  "analysis.description":
    "この画像が誰の絵柄に近いかを手元のモデルで調べます。",
  "analysis.action": "解析する",

  "analysis.section.artist": "作家",

  "analysis.model.download": "ダウンロード",
  "analysis.model.retry": "やり直す",
  "analysis.model.ready": "準備済み",
  "analysis.model.hint": "初回だけ設定フォルダに取得し、以後は手元で動きます。",
  "analysis.model.size": "{size} MB",

  "analysis.analyzing": "解析中…",
  "analysis.artist.scope": "並べる作家の範囲",
  "analysis.artist.scope.major": "投稿 {count} 件以上",
  "analysis.artist.scope.all": "すべて",
  "analysis.artist.scope.prompt": "プロンプトの作家",
  "analysis.artist.nonePrompt":
    "プロンプトに、モデルが知っている作家タグはありません。",
  "analysis.artist.noneMajor":
    "上位 {total} 件に投稿 {count} 件以上の作家はいません。",
  "analysis.artist.lookupLabel": "特定の作家を調べる",
  "analysis.artist.lookupPlaceholder": "Danbooru の作家タグ",
  "analysis.artist.lookupResult": "#{rank} · {score}%",
  "analysis.artist.notInModel": "この作家はモデルの一覧にありません",
  "analysis.artist.knows": "{count} 人の作家",
  "analysis.artist.openDanbooru": "Danbooru で開く",
  "analysis.artist.caption":
    "スコアは知っている作家全体に対するモデルの確率です。候補の順位を見るための数字で、似ているかの断定ではありません。",
};

export const analysis = { en, ja };
