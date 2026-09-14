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

const zh: Record<keyof typeof en, string> = {
  "viewer.empty": "输入提示词后点击“生成”",
  "viewer.emptyBatch": "选择场景后点击“生成”",

  // Lightbox / navigation
  "viewer.lightbox.aria": "图片预览",
  "viewer.nav.prev": "上一张图片",
  "viewer.nav.next": "下一张图片",

  // Metadata info panel
  "viewer.info.prompt": "提示词",
  "viewer.info.model": "模型",
  "viewer.info.size": "尺寸",
  "viewer.info.seed": "种子",
  "viewer.info.steps": "步数",
  "viewer.info.scale": "引导强度",
  "viewer.info.sampler": "采样器",
  "viewer.info.createdAt": "创建时间",

  // Image actions (shared by lightbox and single view)
  "viewer.action.download": "下载",
  "viewer.action.copyPrompt": "复制提示词",
  "viewer.action.copySeed": "复制种子",
  "viewer.action.info": "显示信息",

  // Single-image (carousel) view
  "viewer.single.clickToEnlarge": "点击放大",
  "viewer.single.showThisImage": "显示这张图片",

  // Grid
  "viewer.grid.tileHint": "单击选择，双击放大",

  // History strip
  "viewer.history.title": "历史记录",
  "viewer.history.expand": "显示历史记录",
  "viewer.history.collapse": "隐藏历史记录",
  "viewer.history.generating": "生成中",
  "viewer.history.generatingCount": "生成中 {current}/{total}",
  "viewer.history.clear": "清空历史记录",
  "viewer.history.empty": "暂无历史记录",
  "viewer.history.clearTitle": "要清空历史记录吗？",
  "viewer.history.clearDescription":
    "这会删除历史记录中的全部 {count} 张图片，且无法撤销。",

  // Library dialog
  "viewer.library.title": "图库",
  "viewer.library.empty": "还没有图片",
  "viewer.library.noPrompt": "没有提示词",
  "viewer.library.openImage": "打开 {time} 的图片",
};

export const viewer = { en, ja, zh };
