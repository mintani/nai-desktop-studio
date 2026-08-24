# nai-desktop-studio

NovelAI の画像生成をローカルで完結させるデスクトップ向けアプリ。生成した画像は自分の PC
のフォルダに保存され、履歴・ライトボックス・参照画像（i2i / バイブ転送 / 精密参照）を
1 画面から扱える。

ブラウザで開く Web アプリとしても、Tauri で固めたデスクトップアプリとしても動く。
後者の作り方は[デスクトップ版](#デスクトップ版)。

> NovelAI とは無関係の非公式なクライアントです。動かすには自分の NovelAI
> アカウントと API トークンが必要で、生成にかかる Anlas はその契約で消費されます。

## できること

- **画像生成** — V5 / V4.5 / V4 / V3 系モデル、解像度プリセット、ステップ数・プロンプトの強さ・
  シード・サンプラーなどの調整。V5 では背景の透過（アルファ付き出力）も指定できる
- **キャラクター指定** — V4 系以降の `characters[]` に対応。A1〜E5 のグリッドで配置を選ぶ
- **テンプレート生成** — シチュエーション（場面の雛形）・キャラクター・絵柄を保存しておき、
  組み合わせてプロンプトを組み立てる。通常モード（プロンプト直書き）と
  バッチモード（テンプレート）はパネル上部で切り替える。
  詳しくは [docs/templates.md](docs/templates.md)
- **参照画像** — i2i（元画像からの変形）、バイブ転送、精密参照（V4.5 系のみ）。
  V5 系はバイブ転送・精密参照に未対応（i2i は使える）
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
│   ├── server/      # ローカル API (Hono / Bun)
│   └── desktop/     # Tauri のシェル。web と server を 1 つのアプリにまとめる
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
- `bun run --cwd apps/desktop package` — デスクトップ版のインストーラを作る

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
- `main` への PR はリリースのときだけ。その PR で `package.json` の `version` を上げる
- コミットは Conventional Commits（スコープ付き）、件名 1 行・72 文字以内

### リリース

`main` の `version` が前回と変わると `.github/workflows/release.yml` が動き、Windows と
Apple Silicon の macOS 分のインストーラを作って `v<version>` の**下書きリリース**に添付する。
中身を確かめてから Releases タブで公開する。

version を上げなければ何も起きない。上げ忘れが黙ってリリース無しになるので、判断した結果は
どちらでも Actions のサマリに出る（「Version is still 0.1.0 — nothing to release.」）。

## タグ補完について

タグ検索は `scripts/danbooru_e621_merged.csv` を起動後の初回検索時にメモリへ読み込んで使う。
中身は Danbooru と e621 の公開タグ一覧（タグ名・カテゴリ・件数・別名）を 1 本にまとめた
221,787 行で、リポジトリに同梱してあるので clone した直後から補完が効く。

以前は事前生成した 46MB の JSON も含めていたが、CSV から作れる中間生成物なので追跡をやめた。

## デスクトップ版

`apps/desktop` が Tauri のシェル。WebView が `apps/web` の静的ビルドを読み、ローカル API は
sidecar として同じアプリの中で起動して、アプリを閉じると一緒に落ちる。

```bash
bun run --cwd apps/desktop payload       # 同梱するものを組み立てる
bun run --cwd apps/desktop tauri build   # インストーラを作る
```

Rust ツールチェインが要る（[Tauri の前提条件](https://v2.tauri.app/start/prerequisites/)）。
成果物は `apps/desktop/src-tauri/target/release/bundle/` に出る。配布する Windows と
Apple Silicon の macOS 分は `.github/workflows/desktop.yml` が CI で作る。

### sidecar が Bun ランタイムそのものである理由

**`bun build --compile` の単一ファイルにはできない。** サムネイル生成に使う `sharp` は
`createRequire(import.meta.url)` でネイティブアドオンを読むが、コンパイル済みバイナリの中では
それが Bun の仮想 FS を指すので解決に失敗し、起動時に落ちる。`--external sharp` にしても
同じ仮想 FS から探すので変わらない（どちらも実測）。実ファイルの隣に実物の `node_modules` を
置くのが、これが解決する唯一の形になる。

サイズの損はしていない。コンパイル済みバイナリの約 100MB は埋め込まれた Bun ランタイム
そのものなので、同じものを別の形で運んでいるだけ。

同梱するもの（Linux x64 で実測。他の OS でも内訳は変わらない）:

| 中身 | サイズ |
| --- | --- |
| Bun ランタイム（sidecar） | 98 MB |
| server のバンドル + sharp + タグ CSV | 26 MB |
| web の静的ビルド | 1.2 MB |

### ポート

起動のたびに OS から空きポートをもらう。3000 固定だと開発中のサーバとぶつかって
アプリが立ち上がらなくなるため。決まった値は WebView に `window.__NAI_SERVER_URL__` として
渡す。ブラウザで開いたときは誰も設定しないので、ビルド時の `VITE_SERVER_URL` がそのまま使われる
（`packages/env/src/web.ts`）。web 側が Tauri を知っているのはこの 1 か所だけで、
`@tauri-apps/api` には依存していない。

### 現状の制限

- **配布は Windows と Apple Silicon の macOS だけ。** sidecar はビルドしたマシンの Bun を
  そのまま同梱する作りなので、対応を増やすときは runner を足す（Intel Mac なら Intel の
  runner、Linux なら ubuntu + webkit2gtk などの依存）
- **署名していない。** macOS は Gatekeeper、Windows は SmartScreen の警告が出る
- 設定の保存先はどの OS でも `~/.config/nai-desktop-studio`

## ライセンス

[Apache License 2.0](LICENSE)。

同梱しているタグ一覧（`scripts/danbooru_e621_merged.csv`）は Danbooru / e621 の公開データを
まとめたもので、このリポジトリのライセンスの対象ではありません。
