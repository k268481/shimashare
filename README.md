# シマシェア（ShimaShare）— ローカルWebアプリ版

離島コミュニティ向けの助け合いWebアプリ。平常時は物資シェア＋店舗取り寄せ、緊急時（台風）は助け合いインフラとして機能します。

> **2026-06 方針転換**: LINEミニアプリ（LIFF）前提から、**メールアドレス登録によるWebアプリ**へ変更しました。
> 各ユーザーがメール＋パスワードで登録・ログインして利用します。詳細は [SPEC.md §8](SPEC.md) を参照。

---

## 技術スタック（現行）

| 領域 | 採用 |
|------|------|
| フロント / サーバー | Next.js 14 (App Router) + TypeScript + React |
| スタイル | Tailwind CSS + 自前コンポーネント（[DESIGN.md](DESIGN.md) 準拠） |
| 認証 | メール＋パスワード（自前セッション：JWT署名付き httpOnly cookie / bcrypt） |
| データストア | **SQLite**（better-sqlite3、完全ローカル）。`data/shimashare.db` に保存 |
| データアクセス | `lib/repos.ts` に集約（将来の Supabase 移行を想定した抽象化） |

外部サービス（Docker・クラウド）不要で、ローカルだけで完結します。

---

## セットアップと起動

Node.js 20 以上が必要です（このリポジトリは nvm 前提）。

```bash
# 1) Node 20 を使う
nvm use 20   # または nvm install 20

# 2) 依存インストール
npm install

# 3) 環境変数（初回のみ）
#    .env.local は作成済み。新しく作る場合は以下を設定：
#      SESSION_SECRET=<openssl rand -hex 32 で生成した値>
#      DATABASE_PATH=./data/shimashare.db

# 4) 開発サーバ起動
npm run dev
```

ブラウザで http://localhost:3000 を開くと、未ログインの場合は自動的にログイン画面に遷移します。

初回アクセス時に SQLite データベース（`data/shimashare.db`）が自動作成され、地区・店舗・サンプル出品・体験用アカウントが投入されます。

---

## 体験用アカウント（シードデータ）

| メールアドレス | パスワード | 役割 |
|----------------|-----------|------|
| `shimachan@example.com` | `password123` | 一般ユーザー |
| `yamamoto@example.com` | `password123` | 一般ユーザー |
| `achan@example.com` | `password123` | モデレーター |
| `admin@example.com` | `password123` | スーパー管理者（緊急モード手動切替が可能） |

新規ユーザーは `/signup` からメールアドレスで登録できます。

---

## 主な画面とフロー

- **サインアップ / ログイン** … メール＋パスワード。サインアップ時にニックネーム・地区・同意を登録
- **ホーム** … 通常モード／台風モードで表示が切り替わる
- **出品** … 一覧（カテゴリ・検索）／詳細／投稿（写真添付・0円「ゆずります」対応）
- **チャット** … 出品の「連絡する」から開始。3秒ポーリングで新着反映、Enter送信、画像対応
- **取引完了・評価** … 双方が「取引しました」を押すと完了。相手を ◎○△ で評価（プロフィールに反映）
- **店舗取り寄せ** … 店舗一覧／詳細／取り寄せリクエスト（LINE対応店舗）。電話のみ店舗は `tel:` リンク
- **「これがない」掲示板** … 台風時の在庫情報共有（24時間で薄表示）
- **マイページ** … プロフィール編集、評価分布、自分の出品、ログアウト。管理者は緊急モード切替

緊急（台風）モードは、`admin@example.com` でログイン → マイページの「緊急モード（管理者）」から手動でON/OFFできます（全ユーザーに反映）。

---

## ディレクトリ構成（主要部）

```
shimashare/
├── app/
│   ├── (auth)/              # 未ログイン向け（login / signup）
│   ├── (app)/               # ログイン必須（home / listings / chat / shops / emergency / mypage）
│   ├── api/conversations/   # チャット用 Route Handlers（メッセージ・取引完了・評価）
│   ├── layout.tsx           # ルートレイアウト
│   └── page.tsx             # ログイン状態で /home or /login へ振り分け
├── components/              # UI・レイアウトコンポーネント
├── lib/
│   ├── db.ts                # SQLite 接続・スキーマ・シード
│   ├── repos.ts             # データアクセス層（クエリ関数）
│   ├── actions.ts           # Server Actions（出品・掲示板・取り寄せ・緊急モード）
│   └── auth/                # 認証（jwt / password / session / actions）
├── middleware.ts            # 認証ガード（未ログイン→/login）
├── data/                    # SQLite ファイル（gitignore 済み）
└── types/                   # ドメイン型定義
```

---

## 補足

- `supabase/migrations/` の PostgreSQL スキーマは、将来クラウド（Supabase）へ移行する際の参考として残しています。現行のローカル版では使用しません。
- 本番デプロイ時は `SESSION_SECRET` を必ず別の値に変更し、HTTPS 配信してください。
