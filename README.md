# nai-desktop-studio

NovelAI の画像生成をローカルで完結させるデスクトップ向けアプリ。生成した画像は自分の PC
のフォルダに保存され、履歴・ライトボックス・参照画像（i2i / バイブ転送 / 精密参照）を
1 画面から扱える。

現在は localhost で動く Web アプリとして開発している。デスクトップ化（Tauri での
パッケージング）は後段で行う予定。

> NovelAI とは無関係の非公式なクライアントです。動かすには自分の NovelAI
> アカウントと API トークンが必要で、生成にかかる Anlas はその契約で消費されます。

## できること

- **画像生成** — V4.5 / V4 / V3 系モデル、解像度プリセット、ステップ数・プロンプトの強さ・
  シード・サンプラーなどの調整
- **キャラクター指定** — V4 系の `characters[]` に対応。A1〜E5 のグリッドで配置を選ぶ
- **テンプレート生成** — シチュエーション（場面の雛形）・キャラクター・絵柄を保存しておき、
  組み合わせてプロンプトを組み立てる。通常モード（プロンプト直書き）と
  バッチモード（テンプレート）はパネル上部で切り替える。
  詳しくは [docs/templates.md](docs/templates.md)
- **参照画像** — i2i（元画像からの変形）、バイブ転送、精密参照（V4.5 系のみ）
- **タグ補完** — Danbooru / e621 のタグをキャレット位置でインライン補完
- **閲覧** — 1 枚ずつのカルーセルとグリッドの切り替え、ホイールズーム・ドラッグ移動・
  キーボード送りができるライトボックス、バッチ単位の履歴
- **ローカル保存** — 生成画像とメタデータ（プロンプト・シードなど）を出力フォルダへ保存。
  アプリを閉じても履歴は残る

## 構成

```
nai-desktop-studio/
├── apps/
│   ├── web/         # 画面 (Vite + TanStack Start / SPA)
│   └── server/      # ローカル API (Elysia / Bun)
├── packages/
│   ├── novelai/     # NovelAI API のスキーマ・ペイロード組み立て・クライアント
│   ├── ui/          # shadcn + base-ui のプリミティブ
│   ├── env/         # 環境変数の検証
│   └── config/      # 共通 tsconfig
└── docs/
    ├── api.md       # ローカル API の仕様
    └── templates.md # テンプレート生成のしくみ
```

単一ユーザーが自分の PC で使う前提なので、ユーザー認証もデータベースも持たない。
設定はユーザ設定ディレクトリの `settings.json`、画像は出力フォルダのファイルが保存先になる。

## セットアップ

```bash
bun install
bun run dev
```

- 画面: http://localhost:3001
- API: http://localhost:3000

初回起動時に NovelAI の API キーを聞かれる。NovelAI の設定 → Account →
Get Persistent API Token で取得したトークンを貼ると、疎通確認のうえ
`~/.config/nai-desktop-studio/settings.json`（パーミッション 600）に保存される。
キーがこの PC の外へ出ることはない。

環境変数は任意。`apps/server/.env.example` と `apps/web/.env.example` を参照。

## スクリプト

- `bun run dev` — web と server を同時に起動
- `bun run dev:web` / `bun run dev:server` — 片方だけ起動
- `bun run build` — 本番ビルド
- `bun run check-types` — 型チェック
- `bun run check` — oxlint + oxfmt

## 開発の進め方

`main` は常に動く状態を保つ。作業は `dev` から切ったブランチで行い、`dev` へ PR を出す。

```
main            リリース相当。dev からのみ入る
 └ dev          統合ブランチ。ここが開発の起点
    └ feat/12-… Issue 1 件につき 1 ブランチ
```

- **Issue を立ててから作業する。** ブランチ名に Issue 番号を入れる
  （`feat/12-batch-preview` / `fix/34-thumbnail-cache`）
- PR は `dev` 宛て。本文に `Closes #12` を書いて Issue と紐づける
- `main` への PR はリリースのときだけ
- コミットは Conventional Commits（スコープ付き）、件名 1 行・72 文字以内

## タグ補完について

タグ検索は `scripts/danbooru_e621_merged.csv` を起動後の初回検索時にメモリへ読み込んで使う。
中身は Danbooru と e621 の公開タグ一覧（タグ名・カテゴリ・件数・別名）を 1 本にまとめた
221,787 行で、リポジトリに同梱してあるので clone した直後から補完が効く。

以前は事前生成した 46MB の JSON も含めていたが、CSV から作れる中間生成物なので追跡をやめた。

## デスクトップ化（予定）

`apps/server` を Tauri の sidecar として同梱し、`apps/web` の静的ビルドを WebView から
読む構成を想定している。web は SPA 構成（`tanstackStart({ spa: { enabled: true } })`）で
ビルドすると `dist/client/` に静的ファイルが出るので、そのまま置ける。
実行環境（GUI）が用意でき次第、この手順を追加する。

ただし **`bun build --compile` の単一ファイルにはできない。** 履歴のサムネイル生成に
`sharp` を使っており、ネイティブアドオン（`.node`）はバイナリに埋め込まれないため、
出来上がった実行ファイルは起動時に落ちる（検証済み）。sidecar は実行ファイルと
`node_modules/@img/` を並べて配る形になる。

サムネイルが無くても画像自体は表示できる（`/images/:id/thumb` は原寸へフォールバックする）
ので、単一ファイルをどうしても優先したい場合は sharp を外す判断もありうる。
そのときは履歴が原寸を読み直すので、枚数が増えると重くなる。

## ライセンス

[Apache License 2.0](LICENSE)。

同梱しているタグ一覧（`scripts/danbooru_e621_merged.csv`）は Danbooru / e621 の公開データを
まとめたもので、このリポジトリのライセンスの対象ではありません。
