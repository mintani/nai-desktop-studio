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

export const characters = { en, ja };
