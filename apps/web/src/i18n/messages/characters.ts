const en = {
  "characters.title": "Characters",
  "characters.searchPlaceholder": "Search characters…",
  "characters.create": "New character",
  "characters.newName": "New character",
  "characters.copyName": "{name} copy",
  "characters.empty": "No characters yet",
  "characters.searchEmpty": "No characters match “{query}”",
  "characters.noSelection": "Select a character to edit",
  "characters.duplicate": "Duplicate",
  "characters.deleted": "Deleted “{name}”",

  "characters.name": "Name",
  "characters.namePlaceholder": "Character name",

  "characters.gender": "Subject",
  "characters.genderNone": "None",
  "characters.genderGirl": "Girl",
  "characters.genderBoy": "Boy",
  "characters.genderOther": "Other",
  "characters.genderHint":
    "Goes first in this character's caption. V4 reads each caption on its own, so without a subject word two characters tend to land on one body.",

  "characters.imageAdd": "Set a picture",
  "characters.imageChange": "Replace the picture",
  "characters.imageRemove": "Remove",
  "characters.imageError": "Could not save the picture",

  "characters.reference": "From",
  "characters.referenceAll": "All situations",
  "characters.fieldCount": "{count} fields",
  "characters.noSituations":
    "No situations yet. Once a situation asks for a tag, its field appears here.",
  "characters.noFields": "These situations ask for no tags.",
  "characters.valuePlaceholder": "Enter tags…",

  "characters.slots": "Append-only slots",
  "characters.slotsHint":
    "Every situation carries these. {additional} and {additional_negative} go to the scene, so only the first character’s values are used.",

  "characters.unused": "Not used by any situation",
  "characters.unusedHint":
    "These values reach no image until a situation mentions their key.",
  "characters.addVariable": "Add value",
  "characters.variableKeyPlaceholder": "key",

  "characters.ownPrompt": "This character on its own",
  "characters.ownPromptHint":
    "Only for the list and the preview below. Generation uses the situation’s templates, not these.",
  "characters.negativePrompt": "Negative prompt",
  "characters.negativePlaceholder": "Negative tags for this character",
  "characters.positiveTemplate": "Positive template",
  "characters.negativeTemplate": "Negative template",
  "characters.templateHint": "Reference values as {key}.",
  "characters.previewPositive": "Positive preview",
  "characters.previewNegative": "Negative preview",
  "characters.previewEmpty": "Nothing to preview yet",

  "characters.deleteTitle": "Delete this character?",
  "characters.deleteDescription":
    "“{name}” will be removed. This cannot be undone.",
  "characters.saveError": "Could not save the character",
  "characters.deleteError": "Could not delete the character",
} as const;

const ja: Record<keyof typeof en, string> = {
  "characters.title": "キャラクター",
  "characters.searchPlaceholder": "キャラクターを検索…",
  "characters.create": "新規キャラクター",
  "characters.newName": "新しいキャラクター",
  "characters.copyName": "{name} のコピー",
  "characters.empty": "キャラクターがありません",
  "characters.searchEmpty": "「{query}」に一致するキャラクターがありません",
  "characters.noSelection": "編集するキャラクターを選択してください",
  "characters.duplicate": "複製",
  "characters.deleted": "「{name}」を削除しました",

  "characters.name": "名前",
  "characters.namePlaceholder": "キャラクター名",

  "characters.gender": "主体",
  "characters.genderNone": "なし",
  "characters.genderGirl": "女",
  "characters.genderBoy": "男",
  "characters.genderOther": "その他",
  "characters.genderHint":
    "このキャラのプロンプト先頭に入ります。V4 はキャラごとの文面を別々に読むので、主体を表す語が無いと複数人が 1 人に混ざりやすくなります。",

  "characters.imageAdd": "画像を設定",
  "characters.imageChange": "画像を差し替える",
  "characters.imageRemove": "外す",
  "characters.imageError": "画像を保存できませんでした",

  "characters.reference": "参照",
  "characters.referenceAll": "すべて",
  "characters.fieldCount": "入力欄 {count}",
  "characters.noSituations":
    "シチュエーションがありません。シチュエーションがタグを求めると、その入力欄がここに並びます。",
  "characters.noFields": "このシチュエーションが求めるタグはありません。",
  "characters.valuePlaceholder": "タグを入力…",

  "characters.slots": "追加スロット",
  "characters.slotsHint":
    "どのシチュエーションにも必ずあります。{additional} と {additional_negative} はシーン側に入るので、先頭のキャラクターの値だけが使われます。",

  "characters.unused": "どのシチュエーションも使っていない値",
  "characters.unusedHint":
    "キーがシチュエーションに出てくるまで、これらの値は画像に届きません。",
  "characters.addVariable": "値を追加",
  "characters.variableKeyPlaceholder": "キー",

  "characters.ownPrompt": "このキャラ単体のプロンプト",
  "characters.ownPromptHint":
    "下のプレビューと一覧の表示にだけ使います。生成にはシチュエーションのテンプレートを使うので、ここは通りません。",
  "characters.negativePrompt": "ネガティブプロンプト",
  "characters.negativePlaceholder": "このキャラのネガティブタグ",
  "characters.positiveTemplate": "ポジティブテンプレート",
  "characters.negativeTemplate": "ネガティブテンプレート",
  "characters.templateHint": "値は {key} の形で参照します。",
  "characters.previewPositive": "ポジティブプレビュー",
  "characters.previewNegative": "ネガティブプレビュー",
  "characters.previewEmpty": "プレビューする内容がありません",

  "characters.deleteTitle": "このキャラクターを削除しますか？",
  "characters.deleteDescription":
    "「{name}」を削除します。この操作は取り消せません。",
  "characters.saveError": "キャラクターの保存に失敗しました",
  "characters.deleteError": "キャラクターの削除に失敗しました",
};

const zh: Record<keyof typeof en, string> = {
  "characters.title": "角色",
  "characters.searchPlaceholder": "搜索角色…",
  "characters.create": "新建角色",
  "characters.newName": "新角色",
  "characters.copyName": "{name} 副本",
  "characters.empty": "还没有角色",
  "characters.searchEmpty": "没有与“{query}”匹配的角色",
  "characters.noSelection": "请选择要编辑的角色",
  "characters.duplicate": "复制",
  "characters.deleted": "已删除“{name}”",

  "characters.name": "名称",
  "characters.namePlaceholder": "角色名称",

  "characters.gender": "主体",
  "characters.genderNone": "无",
  "characters.genderGirl": "女孩",
  "characters.genderBoy": "男孩",
  "characters.genderOther": "其他",
  "characters.genderHint":
    "会放在这个角色提示词的开头。V4 会分别读取每个角色的提示词，因此没有表示主体的词时，两个角色容易混成一个人。",

  "characters.imageAdd": "设置图片",
  "characters.imageChange": "更换图片",
  "characters.imageRemove": "移除",
  "characters.imageError": "无法保存图片",

  "characters.reference": "来源",
  "characters.referenceAll": "全部场景",
  "characters.fieldCount": "{count} 个输入项",
  "characters.noSituations":
    "还没有场景。当某个场景需要标签时，对应的输入项会显示在这里。",
  "characters.noFields": "这些场景不需要任何标签。",
  "characters.valuePlaceholder": "输入标签…",

  "characters.slots": "追加槽位",
  "characters.slotsHint":
    "所有场景都会带上这些。{additional} 和 {additional_negative} 会进入场景，因此只会使用第一个角色的值。",

  "characters.unused": "没有被任何场景使用",
  "characters.unusedHint": "在某个场景引用它们的键之前，这些值不会进入图片。",
  "characters.addVariable": "添加值",
  "characters.variableKeyPlaceholder": "键",

  "characters.ownPrompt": "这个角色的单独提示词",
  "characters.ownPromptHint":
    "只用于列表和下方的预览。生成时使用场景的模板，不会用到这里的内容。",
  "characters.negativePrompt": "负面提示词",
  "characters.negativePlaceholder": "这个角色的负面标签",
  "characters.positiveTemplate": "正面模板",
  "characters.negativeTemplate": "负面模板",
  "characters.templateHint": "用 {key} 的形式引用值。",
  "characters.previewPositive": "正面预览",
  "characters.previewNegative": "负面预览",
  "characters.previewEmpty": "暂无可预览的内容",

  "characters.deleteTitle": "要删除这个角色吗？",
  "characters.deleteDescription": "将删除“{name}”。此操作无法撤销。",
  "characters.saveError": "无法保存角色",
  "characters.deleteError": "无法删除角色",
};

export const characters = { en, ja, zh };
