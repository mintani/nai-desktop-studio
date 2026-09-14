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

const zh: Record<keyof typeof en, string> = {
  "analysis.title": "分析图像",
  "analysis.description": "用本机上的模型查看这张图接近谁的画风。",
  "analysis.action": "开始分析",

  "analysis.section.artist": "画师",

  // Models are fetched on demand, so a section can open on this row instead.
  "analysis.model.download": "下载",
  "analysis.model.retry": "重试",
  "analysis.model.ready": "已就绪",
  "analysis.model.hint": "只在首次下载到应用的配置文件夹，之后都在本机运行。",
  "analysis.model.size": "{size} MB",

  "analysis.analyzing": "分析中…",
  "analysis.artist.scope": "列出画师的范围",
  "analysis.artist.scope.major": "作品数 {count} 以上",
  "analysis.artist.scope.all": "全部",
  "analysis.artist.scope.prompt": "提示词中的画师",
  "analysis.artist.nonePrompt": "提示词中没有模型认识的画师标签。",
  "analysis.artist.noneMajor":
    "排名前 {total} 位中没有作品数达到 {count} 的画师。",
  "analysis.artist.lookupLabel": "查询指定画师",
  "analysis.artist.lookupPlaceholder": "Danbooru 画师标签",
  "analysis.artist.lookupResult": "#{rank} · {score}%",
  "analysis.artist.notInModel": "这位画师不在模型的列表中",
  "analysis.artist.knows": "{count} 位画师",
  "analysis.artist.openDanbooru": "在 Danbooru 中打开",
  "analysis.artist.caption":
    "得分是模型在所有已知画师中给出的概率。它是用来排列候选画师的数字，并不是断定这张图模仿了谁。",
};

export const analysis = { en, ja, zh };
