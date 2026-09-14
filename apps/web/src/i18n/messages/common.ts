const en = {
  "app.name": "nai-desktop-studio",
  "app.description": "Generate images with NovelAI and review them locally.",

  "action.cancel": "Cancel",
  "action.delete": "Delete",
  "action.close": "Close",
  "action.retry": "Retry",

  // Characters, situations and styles are all filed the same way, so they say
  // it the same way too.
  "group.label": "Group",
  "group.none": "Ungrouped",
  "group.new": "New group…",
  "group.newPlaceholder": "Group name",

  "unit.images": "{count} images",
  "unit.anlas": "{count} Anlas",

  "error.generic": "Something went wrong",
  "error.clipboard": "Could not copy to the clipboard",
} as const;

const ja: Record<keyof typeof en, string> = {
  "app.name": "nai-desktop-studio",
  "app.description": "NovelAI で画像を生成し、手元で見返すためのアプリ",

  "action.cancel": "キャンセル",
  "action.delete": "削除",
  "action.close": "閉じる",
  "action.retry": "再試行",

  "group.label": "グループ",
  "group.none": "分類なし",
  "group.new": "新しいグループ…",
  "group.newPlaceholder": "グループ名",

  "unit.images": "{count} 枚",
  "unit.anlas": "{count} Anlas",

  "error.generic": "問題が発生しました",
  "error.clipboard": "クリップボードにコピーできませんでした",
};

const zh: Record<keyof typeof en, string> = {
  "app.name": "nai-desktop-studio",
  "app.description": "用 NovelAI 生成图像，并在本机回看。",

  "action.cancel": "取消",
  "action.delete": "删除",
  "action.close": "关闭",
  "action.retry": "重试",

  // Characters, situations and styles are all filed the same way, so they say
  // it the same way too.
  "group.label": "分组",
  "group.none": "未分组",
  "group.new": "新建分组…",
  "group.newPlaceholder": "分组名称",

  "unit.images": "{count} 张",
  "unit.anlas": "{count} Anlas",

  "error.generic": "出现了问题",
  "error.clipboard": "无法复制到剪贴板",
};

export const common = { en, ja, zh };
