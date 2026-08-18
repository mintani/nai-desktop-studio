const en = {
  // list / manager
  "styles.title": "Styles",
  "styles.subtitle": "{count} styles",
  "styles.new": "New style",
  "styles.search": "Search by name or tag…",
  "styles.empty.title": "No styles yet",
  "styles.empty.hint": "Create a style to reuse a look across generations.",
  "styles.noResults": "No styles match “{query}”.",
  "styles.untitled": "Untitled",

  // card / row actions
  "styles.action.edit": "Edit",
  "styles.action.duplicate": "Duplicate",
  "styles.action.delete": "Delete",

  // delete confirm
  "styles.delete.title": "Delete this style?",
  "styles.delete.body":
    "“{name}” and its images will be removed. This can’t be undone.",
  "styles.delete.confirm": "Delete",

  // editor
  "styles.editor.new": "New style",
  "styles.editor.edit": "Edit style",
  "styles.editor.back": "Back",
  "styles.editor.save": "Save",
  "styles.editor.saving": "Saving…",
  "styles.field.name": "Name",
  "styles.field.namePlaceholder": "Anime cel shading",
  "styles.field.styleTag": "Style tag",
  "styles.field.styleTagPlaceholder": "anime, high quality",
  "styles.field.negativeTag": "Negative tag",
  "styles.field.negativeTagPlaceholder": "bad anatomy, lowres",
  "styles.field.promptPosition": "Style tag position",
  "styles.field.negativePosition": "Negative tag position",
  "styles.field.sample": "Sample image",
  "styles.sample.pick": "Choose an image",
  "styles.sample.change": "Change",
  "styles.error.nameRequired": "Enter a name",

  // prompt-tag positions (referenced by types/style.ts, so the style.* prefix stays)
  "style.position.start": "Before quality tags",
  "style.position.afterQuality": "After quality tags",
  "style.position.end": "At the end",

  // generation overrides
  "styles.params.title": "Generation overrides",
  "styles.params.hint":
    "Turn on a row to make this style apply that value when chosen.",
  "styles.params.model": "Model",
  "styles.params.steps": "Steps",
  "styles.params.scale": "Prompt guidance",
  "styles.params.cfgRescale": "CFG rescale",
  "styles.params.varietyBoost": "Variety boost",
  "styles.params.sampler": "Sampler",
  "styles.params.noiseSchedule": "Noise schedule",
  "styles.params.enable": "Override this value",

  // vibe transfer
  "styles.vibes.title": "Vibe transfer",
  "styles.vibes.hint":
    "Reference images that steer any generation using this style (up to {max}).",
  "styles.vibes.add": "Add a vibe image",
  "styles.vibes.blocked": "Can’t be combined with precise references.",
  "styles.vibes.encodeNote":
    "Changing “information extracted” forces a re-encode on the next run, which costs Anlas.",
  "styles.vibes.empty": "None yet.",

  // precise references
  "styles.references.title": "Precise reference",
  "styles.references.hint":
    "Precise references for this style (up to {max}, 5 Anlas each).",
  "styles.references.add": "Add a reference image",
  "styles.references.blocked": "Can’t be combined with vibe transfer.",
  "styles.references.empty": "None yet.",

  // shared row labels
  "styles.strength": "Strength",
  "styles.infoExtracted": "Information extracted",
  "styles.fidelity": "Fidelity",
  "styles.atMax": "Limit reached",
  "styles.refType.character": "Character",
  "styles.refType.style": "Style",
  "styles.refType.characterStyle": "Character + style",

  // image picking
  "styles.image.notImage": "Choose an image file",
  "styles.image.tooLarge": "Images must be 10 MB or smaller",

  // failures
  "styles.toast.saveFailed": "Could not save the style",
  "styles.toast.deleteFailed": "Could not delete the style",
  "styles.toast.duplicateFailed": "Could not duplicate the style",

  // duplicate naming
  "styles.copySuffix": "copy",
} as const;

const ja: Record<keyof typeof en, string> = {
  // list / manager
  "styles.title": "絵柄",
  "styles.subtitle": "{count} 件",
  "styles.new": "絵柄を追加",
  "styles.search": "名前・タグで検索…",
  "styles.empty.title": "絵柄がありません",
  "styles.empty.hint": "絵柄を作ると、生成をまたいで同じ画風を使い回せます。",
  "styles.noResults": "「{query}」に一致する絵柄がありません。",
  "styles.untitled": "無題",

  // card / row actions
  "styles.action.edit": "編集",
  "styles.action.duplicate": "複製",
  "styles.action.delete": "削除",

  // delete confirm
  "styles.delete.title": "この絵柄を削除しますか？",
  "styles.delete.body": "「{name}」と登録画像を削除します。取り消せません。",
  "styles.delete.confirm": "削除する",

  // editor
  "styles.editor.new": "絵柄を追加",
  "styles.editor.edit": "絵柄を編集",
  "styles.editor.back": "戻る",
  "styles.editor.save": "保存",
  "styles.editor.saving": "保存中…",
  "styles.field.name": "名前",
  "styles.field.namePlaceholder": "標準アニメ塗り",
  "styles.field.styleTag": "スタイルタグ",
  "styles.field.styleTagPlaceholder": "anime, high quality",
  "styles.field.negativeTag": "ネガティブタグ",
  "styles.field.negativeTagPlaceholder": "bad anatomy, lowres",
  "styles.field.promptPosition": "スタイルタグの位置",
  "styles.field.negativePosition": "ネガティブタグの位置",
  "styles.field.sample": "サンプル画像",
  "styles.sample.pick": "画像を選ぶ",
  "styles.sample.change": "変更",
  "styles.error.nameRequired": "名前を入力してください",

  // prompt-tag positions
  "style.position.start": "クオリティタグの前",
  "style.position.afterQuality": "クオリティタグの後",
  "style.position.end": "末尾",

  // generation overrides
  "styles.params.title": "生成パラメータの上書き",
  "styles.params.hint":
    "有効にした項目だけ、この絵柄を選んだときに反映されます。",
  "styles.params.model": "モデル",
  "styles.params.steps": "ステップ数",
  "styles.params.scale": "プロンプトの強さ",
  "styles.params.cfgRescale": "CFG リスケール",
  "styles.params.varietyBoost": "バリエーション強化",
  "styles.params.sampler": "サンプラー",
  "styles.params.noiseSchedule": "ノイズスケジュール",
  "styles.params.enable": "この値を上書きする",

  // vibe transfer
  "styles.vibes.title": "バイブトランスファー",
  "styles.vibes.hint":
    "この絵柄を使う生成を誘導する参照画像です（最大 {max} 枚）。",
  "styles.vibes.add": "バイブを追加",
  "styles.vibes.blocked": "精密参照とは併用できません。",
  "styles.vibes.encodeNote":
    "「情報抽出度」を変えると次回生成で再エンコードされ、Anlas を消費します。",
  "styles.vibes.empty": "まだありません。",

  // precise references
  "styles.references.title": "精密参照",
  "styles.references.hint":
    "この絵柄の精密参照です（最大 {max} 枚、1 枚あたり 5 Anlas）。",
  "styles.references.add": "精密参照を追加",
  "styles.references.blocked": "バイブトランスファーとは併用できません。",
  "styles.references.empty": "まだありません。",

  // shared row labels
  "styles.strength": "強度",
  "styles.infoExtracted": "情報抽出度",
  "styles.fidelity": "忠実度",
  "styles.atMax": "上限に達しました",
  "styles.refType.character": "キャラクター",
  "styles.refType.style": "画風",
  "styles.refType.characterStyle": "キャラ＋画風",

  // image picking
  "styles.image.notImage": "画像ファイルを選択してください",
  "styles.image.tooLarge": "画像サイズは 10MB 以内にしてください",

  // failures
  "styles.toast.saveFailed": "絵柄を保存できませんでした",
  "styles.toast.deleteFailed": "絵柄を削除できませんでした",
  "styles.toast.duplicateFailed": "絵柄を複製できませんでした",

  // duplicate naming
  "styles.copySuffix": "コピー",
};

export const styles = { en, ja };
