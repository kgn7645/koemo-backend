# KOEMO Railway デプロイガイド

## 1. Railwayアカウント作成

1. [Railway.app](https://railway.app) にアクセス
2. GitHubアカウントでサインアップ
3. 無料枠: 月500時間、$5クレジット

## 2. デプロイ準備

### package.jsonの確認
```json
{
  "name": "koemo-backend",
  "scripts": {
    "start": "node dist/index.js",
    "build": "tsc",
    "dev": "nodemon src/index.ts"
  },
  "engines": {
    "node": ">=16"
  }
}
```

### 環境変数設定ファイル作成
```bash
# .env.example
NODE_ENV=production
USE_MONGODB=false
PORT=3000
JWT_SECRET=your-secret-key-here
CORS_ORIGIN=*
```

## 3. GitHubにプッシュ

```bash
cd /Users/sou/Documents/AI_Driven_Dev/KOEMO/backend

# Git初期化 (まだの場合)
git init
git add .
git commit -m "Initial backend setup for Railway"

# GitHubリポジトリ作成して
git remote add origin https://github.com/[YOUR_USERNAME]/koemo-backend.git
git push -u origin main
```

## 4. Railwayでデプロイ

### 新しいプロジェクト作成
1. Railway dashboard → "New Project"
2. "Deploy from GitHub repo" 選択
3. koemo-backend リポジトリ選択

### 環境変数設定
Railway dashboard で以下を設定:

```
NODE_ENV = production
USE_MONGODB = false  
PORT = 3000
JWT_SECRET = koemo-production-secret-2024
CORS_ORIGIN = *
```

### カスタムドメイン (オプション)
- Railway が自動で https://[app-name].railway.app を付与
- カスタムドメインも設定可能

## 5. デプロイされたURL確認

デプロイ完了後:
```
WebSocket URL: wss://[your-app].railway.app
Health Check: https://[your-app].railway.app/health
```

## 6. iOSアプリの設定変更

`WebSocketService.swift` を更新:

```swift
// 変更前
guard let url = URL(string: "ws://192.168.0.8:3000?token=\(token)") else {

// 変更後  
guard let url = URL(string: "wss://[your-app].railway.app?token=\(token)") else {
```

**注意:** `ws://` から `wss://` (SSL) に変更必要

## 7. テスト方法

### サーバーテスト
```bash
curl https://[your-app].railway.app/health
# 期待レスポンス: {"status":"OK",...}
```

### WebSocketテスト
ブラウザ開発者ツールで:
```javascript
const ws = new WebSocket('wss://[your-app].railway.app?token=test123');
ws.onopen = () => console.log('Connected');
ws.onmessage = (e) => console.log('Message:', e.data);
```

## 8. ログ確認

Railway dashboard でリアルタイムログ確認可能:
- 接続ログ
- エラーログ  
- WebSocket通信ログ

## 9. 料金について

### 無料枠
- 月500時間まで
- $5分のクレジット
- 1日約16時間使用可能

### 想定使用量
- 開発/テスト: 月200-300時間
- 小規模ユーザー: 月100-200時間

## 10. スケーリング

ユーザー増加時:
- Railway Pro: $20/月〜
- より多くのリソース
- カスタムドメイン
- 複数環境対応

## トラブルシューティング

### ビルドエラー
```bash
# TypeScript ビルドエラーの場合
npm run build
# エラーを確認して修正
```

### WebSocket接続エラー
- HTTPS/WSS必須確認
- CORS設定確認
- ファイアウォール設定確認

### メモリ不足
- Railway の無料枠は 512MB
- 重い処理は避ける
- 定期的なガベージコレクション