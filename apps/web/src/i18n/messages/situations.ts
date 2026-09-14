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

const zh: Record<keyof typeof en, string> = {
  "situations.title": "场景",
  "situations.subtitle": "可重复使用的场景模板，任何角色都能套用。",
  "situations.search.placeholder": "搜索场景…",
  "situations.new": "新建场景",
  "situations.untitled": "未命名场景",
  "situations.noPrompt": "没有场景提示词",
  "situations.copyName": "{name} 副本",

  "situations.empty.title": "还没有场景",
  "situations.empty.body": "新建一个即可开始搭建场景模板。",
  "situations.select.title": "未选择场景",
  "situations.select.body": "从列表中选择一个场景，或者新建一个。",

  "situations.name.label": "名称",
  "situations.name.placeholder": "场景名称",

  "situations.field.basePrompt": "场景提示词",
  "situations.field.baseNegative": "场景负面提示词",
  "situations.field.characterPrompt": "角色提示词",
  "situations.field.characterNegativePrompt": "角色负面提示词",
  "situations.field.placeholder": "这个场景的描述文字…",

  "situations.token.remove": "移除 {token}",
  "situations.token.restore": "恢复 {token}",
  "situations.token.internal": "始终包含",

  "situations.action.duplicate": "复制",
  "situations.action.save": "保存",
  "situations.status.unsaved": "有未保存的更改",

  "situations.toast.created": "已创建场景",
  "situations.toast.saved": "已保存场景",
  "situations.toast.duplicated": "已复制场景",
  "situations.toast.deleted": "已删除场景",
  "situations.toast.error": "出错了",

  "situations.delete.title": "要删除这个场景吗？",
  "situations.delete.body": "“{name}”将被删除。此操作无法撤销。",
};

export const situations = { en, ja, zh };
