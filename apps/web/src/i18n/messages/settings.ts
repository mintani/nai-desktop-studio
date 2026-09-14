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

const zh: Record<keyof typeof en, string> = {
  "settings.title": "设置",

  "settings.onboarding.title": "连接到 NovelAI",
  "settings.onboarding.body":
    "生成图片需要 NovelAI 的 API 密钥。只需设置一次即可开始使用。",
  "settings.onboarding.submit": "连接并开始",

  "settings.apiKey.label": "NovelAI API 密钥",
  "settings.apiKey.help":
    "在 NovelAI 的 Settings → Account → Get Persistent API Token 中获取。密钥只保存在这台电脑的用户设置目录中，不会发送到任何其他地方。",
  "settings.apiKey.reveal": "显示",
  "settings.apiKey.hide": "隐藏",
  "settings.apiKey.save": "保存",
  "settings.apiKey.update": "更新密钥",
  "settings.apiKey.verifying": "正在验证…",
  "settings.apiKey.verified": "已连接 — 剩余 {count} Anlas",
  "settings.apiKey.saved": "已保存 API 密钥",
  "settings.apiKey.errorEmpty": "请输入 API 密钥",
  "settings.apiKey.errorVerify": "无法验证 API 密钥",

  "settings.account.title": "账户",
  "settings.account.anlasRemaining": "剩余 {count} Anlas",
  "settings.account.currentKey": "当前密钥：{key}",

  "settings.plan.label": "订阅方案",
  "settings.plan.opus": "Opus",
  "settings.plan.other": "其他 / 未订阅",
  "settings.plan.help":
    "Opus 可以免费生成小尺寸图片（1024 x 1024 及 28 步以内）。这里只会改变生成按钮上显示的 Anlas 估算值，不会改变 NovelAI 的实际扣费。",
  "settings.plan.detected": "你的账户看起来是 tier {tier}",
  "settings.plan.saved": "已更新订阅方案",

  "settings.mode.label": "生成模式",
  "settings.mode.queue": "队列 — 逐张生成",
  "settings.mode.alternate": "合并 — 一次请求生成全部",
  "settings.mode.help":
    "队列会为每张图片单独发送请求，所以在 Opus 下每张小图都保持免费，生成完的图片会陆续显示。合并模式会在一次请求里向 NovelAI 索取全部图片：往返次数更少，但只有第一张图片能享受 Opus 的免费额度。",
  "settings.mode.saved": "已更新生成模式",

  "settings.output.label": "输出文件夹",
  "settings.output.change": "更改",
  "settings.output.help":
    "生成的图片及其元数据（提示词、种子等）会保存到这个文件夹。",
  "settings.output.errorEmpty": "请输入输出文件夹",
  "settings.output.saved": "已更新输出文件夹",
  "settings.output.errorSave": "保存失败",

  "settings.model.label": "默认模型",
  "settings.model.saved": "已更新默认模型",
  "settings.model.help":
    "应用启动时默认选中的模型。每次生成仍然可以自由切换模型。",

  "settings.sections.label": "默认展开的板块",
  "settings.sections.help": "选择应用启动时生成面板中哪些部分已经展开。",
};

export const settings = { en, ja, zh };
