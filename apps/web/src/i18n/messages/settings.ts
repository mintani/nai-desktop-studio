const en = {
  "settings.title": "Settings",

  "settings.onboarding.title": "Connect to NovelAI",
  "settings.onboarding.body":
    "You need a NovelAI API key to generate images. Set it up once to get started.",
  "settings.onboarding.submit": "Connect and start",

  "settings.apiKey.label": "NovelAI API key",
  "settings.apiKey.help":
    "Find it in NovelAI under Settings → Account → Get Persistent API Token. The key is stored only in this computer's user settings directory and is never sent anywhere else.",
  "settings.apiKey.reveal": "Show",
  "settings.apiKey.hide": "Hide",
  "settings.apiKey.save": "Save",
  "settings.apiKey.update": "Update key",
  "settings.apiKey.verifying": "Verifying…",
  "settings.apiKey.verified": "Connected — {count} Anlas remaining",
  "settings.apiKey.saved": "API key saved",
  "settings.apiKey.errorEmpty": "Enter your API key",
  "settings.apiKey.errorVerify": "Could not verify the API key",

  "settings.account.title": "Account",
  "settings.account.anlasRemaining": "{count} Anlas remaining",
  "settings.account.currentKey": "Current key: {key}",

  "settings.plan.label": "Plan",
  "settings.plan.opus": "Opus",
  "settings.plan.other": "Other / no subscription",
  "settings.plan.help":
    "Opus includes free small generations (up to 1024 x 1024 and 28 steps). This only changes the Anlas estimate shown on the generate button, not what NovelAI charges.",
  "settings.plan.detected": "Your account looks like tier {tier}",
  "settings.plan.saved": "Plan updated",

  "settings.mode.label": "Generation mode",
  "settings.mode.queue": "Queue — one at a time",
  "settings.mode.alternate": "Alternate — one batched request",
  "settings.mode.help":
    "Queue sends a separate request per image, so on Opus each small image stays free and results appear as they finish. Alternate asks NovelAI for all of them in one request: fewer round trips, but only the first image gets the Opus discount.",
  "settings.mode.saved": "Generation mode updated",

  "settings.output.label": "Output folder",
  "settings.output.change": "Change",
  "settings.output.help":
    "Generated images and their metadata (prompt, seed, and more) are saved to this folder.",
  "settings.output.errorEmpty": "Enter an output folder",
  "settings.output.saved": "Output folder updated",
  "settings.output.errorSave": "Could not save",

  "settings.model.label": "Default model",
  "settings.model.saved": "Default model updated",
  "settings.model.help":
    "The model already selected when the app opens. Each run can still switch models freely.",

  "settings.sections.label": "Sections open by default",
  "settings.sections.help":
    "Which parts of the generate panel are already expanded when the app opens.",
} as const;

const ja: Record<keyof typeof en, string> = {
  "settings.title": "設定",

  "settings.onboarding.title": "NovelAI に接続する",
  "settings.onboarding.body":
    "画像を生成するには NovelAI の API キーが必要です。最初に一度だけ設定してください。",
  "settings.onboarding.submit": "接続して始める",

  "settings.apiKey.label": "NovelAI API キー",
  "settings.apiKey.help":
    "NovelAI の Settings → Account → Get Persistent API Token で取得できます。キーはこの PC のユーザ設定ディレクトリにだけ保存され、外部には送信されません。",
  "settings.apiKey.reveal": "表示する",
  "settings.apiKey.hide": "隠す",
  "settings.apiKey.save": "保存する",
  "settings.apiKey.update": "キーを更新する",
  "settings.apiKey.verifying": "確認中…",
  "settings.apiKey.verified": "接続を確認しました（残り {count} Anlas）",
  "settings.apiKey.saved": "API キーを保存しました",
  "settings.apiKey.errorEmpty": "API キーを入力してください",
  "settings.apiKey.errorVerify": "API キーを確認できませんでした",

  "settings.account.title": "アカウント",
  "settings.account.anlasRemaining": "残り {count} Anlas",
  "settings.account.currentKey": "現在のキー: {key}",

  "settings.plan.label": "プラン",
  "settings.plan.opus": "Opus",
  "settings.plan.other": "その他 / 未加入",
  "settings.plan.help":
    "Opus は小さい生成（1024 x 1024 以下・28 ステップ以下）が無料枠になります。ここで変わるのは生成ボタンに出る Anlas 見積りだけで、実際の請求は変わりません。",
  "settings.plan.detected": "アカウントは tier {tier} に見えます",
  "settings.plan.saved": "プランを変更しました",

  "settings.mode.label": "生成モード",
  "settings.mode.queue": "キュー — 1 枚ずつ",
  "settings.mode.alternate": "オルタネート — まとめて 1 リクエスト",
  "settings.mode.help":
    "キューは 1 枚ごとにリクエストを分けます。Opus なら小さい画像は無料のままで、終わった順に表示されます。オルタネートは全部を 1 リクエストでまとめて頼みます。往復が減る代わりに、Opus の無料枠が効くのは 1 枚目だけです。",
  "settings.mode.saved": "生成モードを変更しました",

  "settings.output.label": "画像の保存先",
  "settings.output.change": "変更",
  "settings.output.help":
    "生成した画像とメタデータ（プロンプト・シードなど）がこのフォルダに保存されます。",
  "settings.output.errorEmpty": "保存先を入力してください",
  "settings.output.saved": "保存先を変更しました",
  "settings.output.errorSave": "保存に失敗しました",

  "settings.model.label": "デフォルトモデル",
  "settings.model.saved": "デフォルトモデルを変更しました",
  "settings.model.help":
    "起動した時点で選択されているモデルです。生成ごとの切り替えは今までどおりできます。",

  "settings.sections.label": "最初から開くセクション",
  "settings.sections.help":
    "生成パネルのどの部分を、起動した時点で開いておくかを選びます。",
};

export const settings = { en, ja };
