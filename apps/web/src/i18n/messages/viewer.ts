const en = {
  "viewer.empty": "Enter a prompt and press Generate",
  "viewer.emptyBatch": "Choose the scenes and press Generate",

  // Lightbox / navigation
  "viewer.lightbox.aria": "Image preview",
  "viewer.nav.prev": "Previous image",
  "viewer.nav.next": "Next image",

  // Metadata info panel
  "viewer.info.prompt": "Prompt",
  "viewer.info.model": "Model",
  "viewer.info.size": "Size",
  "viewer.info.seed": "Seed",
  "viewer.info.steps": "Steps",
  "viewer.info.scale": "Scale",
  "viewer.info.sampler": "Sampler",
  "viewer.info.createdAt": "Created",

  // Image actions (shared by lightbox and single view)
  "viewer.action.download": "Download",
  "viewer.action.copyPrompt": "Copy prompt",
  "viewer.action.copySeed": "Copy seed",
  "viewer.action.info": "Show info",

  // Single-image (carousel) view
  "viewer.single.clickToEnlarge": "Click to enlarge",
  "viewer.single.showThisImage": "Show this image",

  // Grid
  "viewer.grid.tileHint": "Click to select, double-click to enlarge",

  // History strip
  "viewer.history.title": "History",
  "viewer.history.expand": "Show history",
  "viewer.history.collapse": "Hide history",
  "viewer.history.generating": "Generating",
  "viewer.history.generatingCount": "Generating {current}/{total}",
  "viewer.history.clear": "Clear history",
  "viewer.history.empty": "No history",
  "viewer.history.clearTitle": "Clear history?",
  "viewer.history.clearDescription":
    "This removes all {count} images from your history and can't be undone.",

  // Library dialog
  "viewer.library.title": "Library",
  "viewer.library.empty": "No images yet",
  "viewer.library.noPrompt": "No prompt",
  "viewer.library.openImage": "Open image from {time}",
} as const;

const ja: Record<keyof typeof en, string> = {
  "viewer.empty": "プロンプトを入力して「生成する」を押してください",
  "viewer.emptyBatch": "シチュエーションを選んで「生成する」を押してください",

  "viewer.lightbox.aria": "画像プレビュー",
  "viewer.nav.prev": "前の画像",
  "viewer.nav.next": "次の画像",

  "viewer.info.prompt": "プロンプト",
  "viewer.info.model": "モデル",
  "viewer.info.size": "サイズ",
  "viewer.info.seed": "シード",
  "viewer.info.steps": "ステップ",
  "viewer.info.scale": "スケール",
  "viewer.info.sampler": "サンプラー",
  "viewer.info.createdAt": "生成日時",

  "viewer.action.download": "ダウンロード",
  "viewer.action.copyPrompt": "プロンプトをコピー",
  "viewer.action.copySeed": "シードをコピー",
  "viewer.action.info": "情報を表示",

  "viewer.single.clickToEnlarge": "クリックで拡大",
  "viewer.single.showThisImage": "この画像を表示",

  "viewer.grid.tileHint": "クリックで選択、ダブルクリックで拡大",

  "viewer.history.title": "履歴",
  "viewer.history.expand": "履歴を開く",
  "viewer.history.collapse": "履歴を閉じる",
  "viewer.history.generating": "生成中",
  "viewer.history.generatingCount": "生成中 {current}/{total}",
  "viewer.history.clear": "履歴を削除",
  "viewer.history.empty": "履歴なし",
  "viewer.history.clearTitle": "履歴を削除しますか？",
  "viewer.history.clearDescription":
    "履歴にある画像 {count} 件をすべて削除します。この操作は取り消せません。",

  "viewer.library.title": "ライブラリ",
  "viewer.library.empty": "まだ画像がありません",
  "viewer.library.noPrompt": "プロンプトなし",
  "viewer.library.openImage": "{time} の画像を開く",
};

export const viewer = { en, ja };
