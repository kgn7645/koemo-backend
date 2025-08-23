# Railway 代替デプロイ方法

## 問題
メインリポジトリが大きすぎてプッシュに時間がかかっています。

## 解決策1: 新しいバックエンド専用リポジトリを作成

### 1. GitHubで新しいリポジトリを作成
- リポジトリ名: `koemo-backend`
- パブリック設定
- README, .gitignore, License は未選択

### 2. バックエンドディレクトリから新しいリポジトリを初期化

```bash
cd /Users/sou/Documents/AI_Driven_Dev/KOEMO/backend

# 新しいGitリポジトリを初期化
git init
git branch -M main

# 必要なファイルのみを追加
git add package.json package-lock.json tsconfig.json .env.example
git add src/
git add .gitignore
git add *.md

# 最初のコミット
git commit -m "Initial KOEMO backend for Railway deployment"

# 新しいリモートリポジトリを追加 (URLは実際のものに変更)
git remote add origin https://github.com/[YOUR_USERNAME]/koemo-backend.git

# プッシュ
git push -u origin main
```

## 解決策2: Railway GitHub App を使わずデプロイ

### Railway CLI を使用

```bash
# Railway CLI をインストール
npm install -g @railway/cli

# Railway にログイン
railway login

# プロジェクトを初期化
cd /Users/sou/Documents/AI_Driven_Dev/KOEMO/backend
railway link

# デプロイ
railway up
```

## 解決策3: Dockerイメージでデプロイ

### Dockerfile を作成

```dockerfile
# /Users/sou/Documents/AI_Driven_Dev/KOEMO/backend/Dockerfile
FROM node:18-alpine

WORKDIR /app

# package.json と package-lock.json をコピー
COPY package*.json ./

# 依存関係をインストール
RUN npm ci --only=production

# ソースコードをコピー
COPY . .

# TypeScript をビルド
RUN npm run build

# ポートを公開
EXPOSE 3000

# 本番環境変数を設定
ENV NODE_ENV=production
ENV USE_MONGODB=false

# アプリケーションを起動
CMD ["npm", "start"]
```

### Railway でDockerデプロイ
1. Railway Dashboard
2. "New Project" → "Deploy from Docker Image"
3. Dockerfile をアップロード

## 推奨: 解決策1 (新しいリポジトリ)

最も簡単で確実な方法です。

### 手順
1. GitHub で `koemo-backend` リポジトリを作成
2. backend ディレクトリから新しい Git リポジトリを初期化
3. 必要なファイルのみをコミット&プッシュ
4. Railway で新しいリポジトリをデプロイ

### ファイルサイズ比較
```
現在のリポジトリ: ~2GB (KOEMO-expo含む)
バックエンドのみ: ~50MB (node_modules除く)
```

どの方法を試しますか？