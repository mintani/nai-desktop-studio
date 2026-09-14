# ローカル API 仕様

`apps/server`（Hono / Bun, 既定 `http://localhost:3000`）が公開するエンドポイント。
デスクトップアプリとして 1 台のマシンで完結させる前提なので、認証は無く、待ち受けは localhost のみ。

失敗はどれも `{ "error": "<1 文>" }` で返し、種類は HTTP ステータスで表す。リクエストの検証に
落ちた場合も同じ形（400）で、最初の 1 件だけを載せる。呼び出し側はこのアプリ自身の画面しか
無いので、問題の一覧を出しても読む人がいない。

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

### V5 系モデルの扱い

公式 Web アプリがモデルごとに持つ能力テーブルに合わせている。

- バイブ転送・精密参照は送れない。V5 で `controlnet` / `character_references` を送ると 400。
  `/novelai/encode-vibe` も V5 のモデル名を受け付けない。エンコード結果はモデル固有なので、
  V5 向けに作っても使い道が無く、2 Anlas だけが消える
- `noise_schedule` と `variety_boost` は V5 では無視する。公式アプリもリクエストから落としている
- `tag_hint_transparent_background: true` のとき、プロンプトのタグ末尾（クオリティタグの前）に
  `transparent background` を足す。公式アプリが同じ位置に足していて、フラグ自体は「そのタグが
  入っている」というヒントでしかない。`straight_alpha` は出力 PNG のアルファをストレートで書く
  指定で、透過と一緒に送る

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

## 参照ライブラリ

バイブ転送・精密参照に使う画像を保存しておき、生成のたびに貼り直さずに使う。

**1 件が 1 ディレクトリ。** 画像・設定・エンコード結果が同じ場所に入る。

```
<configDir>/references/<id>/
├── reference.json   設定
├── image.png        元画像（png / webp / jpg。content-type から決まる）
└── encoded.txt      エンコード結果（バイブが 1 度エンコードされた後だけ）
```

| メソッド | パス | 説明 |
| --- | --- | --- |
| `GET` | `/references` | `{ items: Reference[] }`（`updatedAt` の新しい順） |
| `POST` | `/references` | body に設定 + `{ imageBase64, contentType }` → 作成した `Reference`（201） |
| `PUT` | `/references/:id` | 設定の更新。画像は変えられない。更新後の `Reference` |
| `DELETE` | `/references/:id` | ディレクトリごと消す。`{ ok: true }`。無ければ 404 |
| `GET` | `/references/:id/image` | 画像バイナリ。`Cache-Control: immutable` |
| `POST` | `/references/resolve` | body `{ ids }` → `{ items: ResolvedReference[] }` |
| `DELETE` | `/references/:id/encoded` | 保存済みエンコードを捨てる。`{ ok: true }` |

```ts
type Reference = {
  id: string;
  name: string;
  groupName: string | null;
  kind: "vibe" | "reference";
  strength: number;
  infoExtracted: number;   // バイブのみ
  referenceType: string;   // 精密参照のみ
  fidelity: number;        // 精密参照のみ
  encodedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type ResolvedReference = {
  id: string;
  kind: "vibe" | "reference";
  image: string;    // base64。精密参照のときだけ入る
  encoded: string;  // エンコード結果。バイブのときだけ入る
  referenceType: string;
  strength: number;
  fidelity: number;
};
```

画像のパスはレコードに持たない。常に `/references/<id>/image` なので、消えた画像を指したまま
残る文字列が存在しない。作成も削除も 1 リクエストで、途中で失敗しても片方だけが残ることがない。

**バイブのエンコードは 1 回だけ。** `/resolve` は、`encoded.txt` を持たないバイブだけを
その場でエンコードして保存する。2 回目以降はファイルを読むだけなので Anlas を消費しない。
同じ画像・同じ `information_extracted`・同じモデルなら結果は毎回同じなので、取っておけば足りる。

エンコードのモデルは `nai-diffusion-4-5-full` に固定する。エンコード結果はモデル固有で、
生成時のモデルに合わせると切り替えるたびにキャッシュが無効になり、保存する意味が消える。

`infoExtracted` か `kind` を変えると、`PUT` が保存済みのエンコードを捨てる。中身が変わったのに
古い結果を送ると設定と食い違ったものが出る。捨てるのはサーバ側の仕事で、ファイルを持っているのが
サーバだから。

解決できなかった id は落として返す。壊れた 1 件で生成 1 回分を失わないため。

## 解析

生成した画像が誰の絵柄に近いかを、手元で動かすモデルで調べる。モデルは同梱せず、
`<configDir>/models/<id>/` へ初回にダウンロードする（Hugging Face のリビジョン固定 URL。
ファイルは期待どおりのサイズで揃って初めて「ある」と見なす）。推論は同じプロセスの
onnxruntime-node（CPU）で、前処理は sharp。

| メソッド | パス | 説明 |
| --- | --- | --- |
| `GET` | `/analysis/models` | `{ items: ModelStatus[] }` |
| `POST` | `/analysis/models/:id/download` | ダウンロードを始める（202）。進捗は `GET` で見る |
| `DELETE` | `/analysis/models/:id` | モデルのファイルを消す。`{ ok: true }` |
| `POST` | `/analysis/artists` | body `{ image, artist?, limit? }` → 作家の候補 |

```ts
type ImageRef = { imageId: string } | { imageBase64: string };

type ModelStatus = {
  id: string;            // "kaloscope-2.0"
  role: "artist";
  label: string;
  source: string;        // 配布元の URL
  bytes: number;         // 全ファイルの合計
  ready: boolean;        // 全ファイルが期待どおりのサイズで揃っている
  downloading: boolean;
  received: number;      // ダウンロード済みのバイト数
  error: string | null;  // 直前のダウンロードが失敗した理由
};

// POST /analysis/artists。作家モデル 1 つにつき 1 件（今は Kaloscope だけ）
type ArtistAnalysis = {
  results: {
    model: string;                       // "kaloscope-2.0"
    label: string;
    artists: number;                     // 分類できる作家数（39,261）
    candidates: { name: string; score: number; posts: number | null }[]; // 上位から。posts は Danbooru の投稿数
    lookup: ArtistPlace | null;          // artist を指定したときだけ
    mentioned: ArtistPlace[];            // 画像のプロンプトに書かれた作家タグ（imageId のときだけ）
  }[];
};

type ArtistPlace = {
  name: string;
  score: number;
  rank: number;                          // 全作家中の順位（1 始まり）
  posts: number | null;
};
```

- モデルが無いときは 409 `{ error, model }`。画面は先に `/analysis/models` を見てから呼ぶ
- `limit` は 500 まで。画面は 200 件受け取り、投稿数の少ない作家を除く表示をクライアント側で
  切り替える（`posts` は同梱のタグ一覧から引く。一覧に無い名前は `null`）
- `mentioned` はプロンプトをカンマで割り、`{}` / `[]` の強調と `1.2::tag::` の重み、`artist:`
  接頭辞を外してから作家一覧に照合する。Text: ブロックは見ない。`imageBase64` にはプロンプトが
  無いので空
- `artist` は Danbooru の作家タグ。`artist:` 接頭辞と大文字小文字は無視する。モデルの一覧に
  無ければ `lookup` は `null`
- `imageBase64` はデコード後 10 MB まで（413）。画像として読めなければ 400
- 前処理は正方形へそのままリサイズし、ImageNet の平均・分散で正規化して CHW に並べる。
  透過は白へ合成する（V5 の透過 PNG はアルファの下に任意の色が残るため）
- `score` は 39,261 クラスの softmax。候補を並べるための数字で、似ているかの断定には使わない

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
