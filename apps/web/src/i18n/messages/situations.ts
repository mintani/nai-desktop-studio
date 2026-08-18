const en = {
  "situations.title": "Situations",
  "situations.subtitle":
    "Reusable scene templates that any character can fill in.",
  "situations.search.placeholder": "Search situations…",
  "situations.new": "New situation",
  "situations.untitled": "Untitled situation",
  "situations.noPrompt": "No scene prompt",
  "situations.copyName": "{name} copy",

  "situations.empty.title": "No situations yet",
  "situations.empty.body": "Create one to start building scene templates.",
  "situations.select.title": "No situation selected",
  "situations.select.body":
    "Pick a situation from the list, or create a new one.",

  "situations.name.label": "Name",
  "situations.name.placeholder": "Situation name",

  "situations.field.basePrompt": "Scene prompt",
  "situations.field.baseNegative": "Scene negative",
  "situations.field.characterPrompt": "Character prompt",
  "situations.field.characterNegativePrompt": "Character negative",
  "situations.field.placeholder": "Wording for this scene…",

  "situations.token.remove": "Remove {token}",
  "situations.token.restore": "Put {token} back",
  "situations.token.internal": "Always included",

  "situations.action.duplicate": "Duplicate",
  "situations.action.save": "Save",
  "situations.status.unsaved": "Unsaved changes",

  "situations.toast.created": "Situation created",
  "situations.toast.saved": "Situation saved",
  "situations.toast.duplicated": "Situation duplicated",
  "situations.toast.deleted": "Situation deleted",
  "situations.toast.error": "Something went wrong",

  "situations.delete.title": "Delete this situation?",
  "situations.delete.body": '"{name}" will be removed. This can\'t be undone.',
} as const;

const ja: Record<keyof typeof en, string> = {
  "situations.title": "シチュエーション",
  "situations.subtitle":
    "どのキャラクターでも差し込める、使い回せるシーンテンプレートです。",
  "situations.search.placeholder": "シチュエーションを検索…",
  "situations.new": "新規シチュエーション",
  "situations.untitled": "無題のシチュエーション",
  "situations.noPrompt": "シーンプロンプトなし",
  "situations.copyName": "{name} のコピー",

  "situations.empty.title": "シチュエーションがありません",
  "situations.empty.body": "作成するとシーンテンプレートを組み立てられます。",
  "situations.select.title": "シチュエーション未選択",
  "situations.select.body": "一覧から選ぶか、新しく作成してください。",

  "situations.name.label": "名前",
  "situations.name.placeholder": "シチュエーション名",

  "situations.field.basePrompt": "シーン（ポジティブ）",
  "situations.field.baseNegative": "シーン（ネガティブ）",
  "situations.field.characterPrompt": "キャラクター（ポジティブ）",
  "situations.field.characterNegativePrompt": "キャラクター（ネガティブ）",
  "situations.field.placeholder": "この場面の文面…",

  "situations.token.remove": "{token} を削除",
  "situations.token.restore": "{token} を戻す",
  "situations.token.internal": "常に含まれます",

  "situations.action.duplicate": "複製",
  "situations.action.save": "保存",
  "situations.status.unsaved": "未保存の変更",

  "situations.toast.created": "シチュエーションを作成しました",
  "situations.toast.saved": "シチュエーションを保存しました",
  "situations.toast.duplicated": "シチュエーションを複製しました",
  "situations.toast.deleted": "シチュエーションを削除しました",
  "situations.toast.error": "問題が発生しました",

  "situations.delete.title": "このシチュエーションを削除しますか？",
  "situations.delete.body":
    "「{name}」を削除します。この操作は取り消せません。",
};

export const situations = { en, ja };
