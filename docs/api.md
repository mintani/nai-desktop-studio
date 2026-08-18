# ローカル API 仕様

`apps/server`（Elysia / Bun, 既定 `http://localhost:3000`）が公開するエンドポイント。
デスクトップアプリとして 1 台のマシンで完結させる前提なので、認証は無く、待ち受けは localhost のみ。

## 設定

NovelAI の API キーと出力先は設定ファイルに保存する。保存先は
`$NAI_CONFIG_DIR` → `$XDG_CONFIG_HOME/nai-desktop-studio` → `~/.config/nai-desktop-studio` の順に解決し、
`settings.json` をパーミッション 600 で書く。キーはレスポンスに生のまま含めない。

| メソッド | パス | 説明 |
| --- | --- | --- |
| `GET` | `/settings` | `{ hasApiKey, apiKeyPreview, outputDir, defaultModel, plan, generationMode }` |
| `PUT` | `/settings` | body `{ apiKey?, outputDir?, defaultModel?, plan?, generationMode? }` → `GET` と同じ形 |
| `DELETE` | `/settings/api-key` | 保存済みキーを消す → `GET` と同じ形 |
| `POST` | `/settings/verify` | body `{ apiKey? }`（省略時は保存済みキー）。NovelAI に問い合わせて疎通確認 |

`apiKeyPreview` は `pst-****abcd` のように末尾 4 文字だけを残した文字列。

`plan` は `"opus" | "other"`。Anlas 見積りで Opus の軽量枠を適用するかだけに使う。
既定は `"other"` — Opus と誤って仮定すると見積りが実際より少なく出るため、
多めに出る側へ倒している。

`generationMode` は `"queue" | "alternate"`。複数枚生成の出し方を選ぶ。
`queue` は 1 枚ずつストリーミングで生成（`n_samples` は 1、Opus では無料）、
`alternate` は 1 回のリクエストで全枚数をまとめて生成（NovelAI が ZIP で返す。Anlas を消費）。
既定は `"queue"` — Opus で無料の側なので、意図しない課金を避けられる。

`/settings/verify` はキーが無いときだけ 428 を返す。それ以外は常に 200 で、
成功なら `{ ok: true, subscription }`、失敗なら `{ ok: false, error }` を返す
（無効なキーは通信エラーではなく検証結果として扱うため）。呼び出し側は `ok` を見る。

## NovelAI

| メソッド | パス | 説明 |
| --- | --- | --- |
| `GET` | `/novelai/subscription` | `{ tier, active, anlas, unlimitedGeneration }` |
| `POST` | `/novelai/anlas-estimate` | Anlas 見積り |
| `POST` | `/novelai/encode-vibe` | バイブのエンコード → `{ data: <base64> }` |
| `POST` | `/novelai/generate` | 画像を生成して保存 → `{ images: ImageResponse[] }` (JSON) |
| `POST` | `/novelai/generate-stream` | 画像 1 枚を生成して保存 + 途中経過を SSE で流す |

生成系は常に出力ディレクトリへ保存し、JSON のメタデータを返す。

`/novelai/generate` は `n_samples`（1..8、省略時 1）を受け取り、1 リクエストで指定枚数を生成する
（複数枚は NovelAI が ZIP で返す）。結果は 1 枚でも常に配列 `{ images: ImageResponse[] }`。
`index` は `index`（省略時 0）から連番で埋まり、各画像の `seed` は base seed + i になる。

`/novelai/generate-stream` は `n_samples` を 1 固定で使い、複数枚はクライアントが枚数分呼ぶ
（1 枚ごとに結果が返るのでスロットが順に埋まる）。

生成系の body は `packages/novelai` の `generateImageSchema` に加えて、保存メタデータ用の
2 つの任意フィールドを受け取る。同じ「生成」ボタンで作られた画像をまとめるためのもの。

- `batch_id?: string` — 省略時はサーバが 1 件分の ID を振る
- `index?: number` — バッチ内の連番（0 始まり）。省略時は 0

`/novelai/generate-stream` が流す SSE イベント:

```
event: preview   data: { "type": "preview", "image": "<base64>" }   # 途中経過（保存しない）
event: image     data: { "type": "image", "image": ImageResponse } # 確定・保存済み
event: done      data: { "type": "done" }
event: error     data: { "type": "error", "message": "..." }
```

## ライブラリ

| メソッド | パス | 説明 |
| --- | --- | --- |
| `GET` | `/images` | `{ images: ImageResponse[] }`（新しい順、`limit` クエリ可） |
| `GET` | `/images/:id/file` | 画像バイナリ（原寸） |
| `GET` | `/images/:id/thumb` | サムネイル（長辺 512 の WebP）。無ければ生成して以後キャッシュ |
| `DELETE` | `/images/:id` | 1 枚削除（ファイル・メタデータ・サムネイル） |
| `DELETE` | `/images` | 全削除 |

```ts
type ImageResponse = {
  id: string;
  createdAt: string; // ISO8601
  batchId: string;
  index: number;     // バッチ内の連番（0 始まり）
  path: string;      // "/images/<id>/file"
  thumbPath: string; // "/images/<id>/thumb"
  prompt: string;
  negativePrompt: string;
  model: string;
  width: number;
  height: number;
  steps: number;
  scale: number;
  sampler: string;
  seed: number;
};
```

ディスク上の `StoredImage`（サイドカー JSON）はこれに加えて `filePath`（絶対パス）を持つ。
API では返さない。web が使っておらず、履歴の全件に付けるとこのマシンのパスを
毎回送ることになるため。

`/file` と `/thumb` は `Cache-Control: immutable` を付ける。id は 1 ファイルにつき 1 回だけ
発行され、中身が書き換わることがないので、ブラウザは無期限に持っていてよい。

## タグ

| メソッド | パス | 説明 |
| --- | --- | --- |
| `GET` | `/tags/search?q=&limit=` | Danbooru / e621 タグの前方一致検索 |

## コレクション

キャラクター・シチュエーション・スタイルの 3 種をレコード配列として保存する。
保存先は設定と同じ configDir を辿り、`<configDir>/collections/<name>.json` に書く。
`<name>` は `characters` / `situations` / `styles` の 3 つだけで、それ以外は 404。

| メソッド | パス | 説明 |
| --- | --- | --- |
| `GET` | `/collections/:name` | `{ items: unknown[] }`（`updatedAt` があれば新しい順、無ければ登録順） |
| `PUT` | `/collections/:name/:id` | Upsert。body がレコード全体。パスの `:id` が body の `id` より優先。保存したレコードを返す |
| `DELETE` | `/collections/:name/:id` | `{ ok: true }`。無ければ 404 |

レコードはサーバにとって不透明で、`id` が非空文字列のオブジェクトであることだけ検証し、
他のフィールドはそのまま保存する。スキーマは web 側が持ち、読み出し時に整形する。
サーバに別のスキーマを置くと二重定義になって片方がずれていくので、定義は 1 つに絞っている。

書き込みは同じディレクトリの一時ファイルへ書いてから rename する。
途中でクラッシュしても既存ファイルを壊さない（同一ディレクトリ内の rename はアトミック）。

書き込みはコレクションごとに 1 本ずつ直列化する。1 回の書き込みは「全件読む →
1 件差し替える → 全件書き戻す」なので、エディターの自動保存のように重なると、
どちらも同じスナップショットから始めて後勝ちになり、先の 1 件が黙って消える。
数ミリ秒の順番待ちと引き換えにこの手の消失をなくしている。

## アセット

スタイル（vibe / precise-reference / sample）とキャラクターに紐づく画像を保存する。
保存先は `<configDir>/assets/<id>.<ext>`。`<ext>` は content-type から決める
（`image/png`→png、`image/webp`→webp、`image/jpeg`→jpg。それ以外は 415）。

| メソッド | パス | 説明 |
| --- | --- | --- |
| `POST` | `/assets` | body `{ imageBase64, contentType }` → `{ id, path }`（`path` は `/assets/<id>/file`） |
| `GET` | `/assets/:id/file` | 画像バイナリ。無ければ 404 |
| `DELETE` | `/assets/:id` | `{ ok: true }`。無ければ 404 |

`id` はサーバが採番し、ファイルパスに使うため `^[A-Za-z0-9_-]+$` で検証する。
デコード後のサイズは 10 MB までで、超えると 413 を返す。
